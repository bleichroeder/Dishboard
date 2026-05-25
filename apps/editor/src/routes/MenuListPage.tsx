import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_TEMPLATE_ID, TEMPLATES, type Menu } from '@dishboard/shared';
import { api, type MenuListItem } from '../api.js';
import { KebabMenu } from '../components/KebabMenu.js';
import { PreviewModal } from '../components/PreviewModal.js';
import { slugify, uid } from '../lib/ids.js';

export function MenuListPage() {
  const navigate = useNavigate();
  const [menus, setMenus] = useState<MenuListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    api.menus
      .list()
      .then(setMenus)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  };

  useEffect(refresh, []);

  async function onDelete(slug: string, title: string) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete menu "${title}"? This cannot be undone.`)) return;
    try {
      await api.menus.remove(slug);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  async function onClone(slug: string) {
    setError(null);
    try {
      const source = await api.menus.get(slug);
      // Regenerate ids so React keys + DB ids don't collide. Server will reject
      // duplicate slugs, so derive a fresh one client-side.
      const cloned: Menu = {
        ...source,
        id: uid('menu'),
        slug: nextCopySlug(source.slug, menus ?? []),
        title: `${source.title} (copy)`,
        slots: source.slots.map((s) => ({
          ...s,
          id: uid('slot'),
          variants: s.variants.map((v) => ({
            ...v,
            id: uid('variant'),
            items: v.items.map((i) => ({
              ...i,
              id: uid('item'),
              addons: i.addons.map((a) => ({ ...a, id: uid('addon') })),
            })),
          })),
        })),
      };
      const saved = await api.menus.create(cloned);
      refresh();
      navigate(`/menus/${saved.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Clone failed');
    }
  }

  function onImportClick() {
    importInputRef.current?.click();
  }

  async function onImportChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setInfo(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text) as unknown;
      const saved = await api.menus.importJson(json);
      setInfo(`Imported "${saved.title}" as /${saved.slug}.`);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Menus</h1>
        <div className="page-header__actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onImportClick}
            title="Accepts legacy menu.json or current Menu JSON"
          >
            Import JSON
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={onImportChange}
          />
          {!showCreate && (
            <button type="button" className="btn btn--primary" onClick={() => setShowCreate(true)}>
              New menu
            </button>
          )}
        </div>
      </header>

      {error && <div className="banner banner--error">{error}</div>}
      {info && <div className="banner banner--info">{info}</div>}

      {showCreate && (
        <CreateMenuForm
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            refresh();
            setShowCreate(false);
          }}
        />
      )}

      {!menus && <div className="muted">Loading…</div>}

      {menus && menus.length === 0 && !showCreate && (
        <div className="empty">No menus yet. Click “New menu” to create one.</div>
      )}

      {menus && menus.length > 0 && (
        <ul className="card-list">
          {menus.map((m) => (
            <li
              key={m.id}
              className="card menu-card menu-card--clickable"
              onClick={() => navigate(`/menus/${m.slug}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/menus/${m.slug}`);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="card__main">
                <h3 className="card__title">{m.title}</h3>
                <div className="card__meta">
                  <code>/{m.slug}</code>
                </div>
              </div>
              <KebabMenu
                ariaLabel={`Actions for ${m.title}`}
                actions={[
                  { label: 'Edit', onSelect: () => navigate(`/menus/${m.slug}`) },
                  { label: 'Preview', onSelect: () => setPreviewSlug(m.slug) },
                  { label: 'Clone', onSelect: () => void onClone(m.slug) },
                  {
                    label: 'Delete',
                    destructive: true,
                    onSelect: () => void onDelete(m.slug, m.title),
                  },
                ]}
              />
            </li>
          ))}
        </ul>
      )}

      {previewSlug && <PreviewModal slug={previewSlug} onClose={() => setPreviewSlug(null)} />}
    </div>
  );
}

function nextCopySlug(base: string, existing: MenuListItem[]): string {
  const taken = new Set(existing.map((m) => m.slug));
  if (!taken.has(`${base}-copy`)) return `${base}-copy`;
  for (let i = 2; i < 999; i++) {
    const candidate = `${base}-copy-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-copy-${Date.now()}`;
}

function CreateMenuForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [templateId, setTemplateId] = useState<string>(DEFAULT_TEMPLATE_ID);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const finalSlug = slug || slugify(title);
      if (!/^[a-z0-9-]+$/.test(finalSlug)) {
        throw new Error('Slug must be lowercase letters, numbers, and dashes');
      }
      const menu: Menu = {
        id: uid('menu'),
        title: title.trim(),
        slug: finalSlug,
        templateId,
        slots: [],
      };
      await api.menus.create(menu);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create menu');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card create-form" onSubmit={onSubmit}>
      <h2 className="card__title">Create menu</h2>
      <label className="field">
        <span className="field__label">Title</span>
        <input
          className="field__input"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          required
          autoFocus
        />
      </label>
      <label className="field">
        <span className="field__label">URL slug</span>
        <input
          className="field__input"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
          required
        />
        <span className="field__hint">
          Will be served at <code>/{slug || 'your-slug'}</code>
        </span>
      </label>
      <label className="field">
        <span className="field__label">Template</span>
        <select
          className="field__input"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
        >
          {TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <span className="field__hint">
          {TEMPLATES.find((t) => t.id === templateId)?.description}
        </span>
      </label>
      {error && <div className="field-error">{error}</div>}
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Creating…' : 'Create'}
        </button>
      </div>
    </form>
  );
}
