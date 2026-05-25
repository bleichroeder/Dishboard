import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_TEMPLATE_ID, TEMPLATES, type Menu } from '@dishboard/shared';
import { api, type MenuListItem } from '../api.js';
import { slugify, uid } from '../lib/ids.js';

export function MenuListPage() {
  const [menus, setMenus] = useState<MenuListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

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

  return (
    <div className="page">
      <header className="page-header">
        <h1>Menus</h1>
        {!showCreate && (
          <button type="button" className="btn btn--primary" onClick={() => setShowCreate(true)}>
            New menu
          </button>
        )}
      </header>

      {error && <div className="banner banner--error">{error}</div>}

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
            <li key={m.id} className="card menu-card">
              <div className="card__main">
                <h3 className="card__title">{m.title}</h3>
                <div className="card__meta">
                  <code>/{m.slug}</code>
                </div>
              </div>
              <div className="card__actions">
                <Link to={`/menus/${m.slug}`} className="btn btn--secondary">
                  Edit
                </Link>
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => onDelete(m.slug, m.title)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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
