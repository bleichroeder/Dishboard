import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { produce, type Draft } from 'immer';
import {
  getTemplate,
  TEMPLATES,
  type Menu,
  type SectionStyle,
  type Slot as SlotT,
} from '@dishboard/shared';
import { api } from '../api.js';
import { uid } from '../lib/ids.js';
import { SlotEditor } from '../components/SlotEditor.js';

export function MenuEditorPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let alive = true;
    setMenu(null);
    setError(null);
    api.menus
      .get(slug)
      .then((m) => {
        if (alive) {
          setMenu(m);
          setDirty(false);
        }
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  const update = useCallback((fn: (draft: Draft<Menu>) => void) => {
    setMenu((m) => (m ? produce(m, fn) : m));
    setDirty(true);
    setSavingState('idle');
  }, []);

  const template = useMemo(() => (menu ? getTemplate(menu.templateId) : undefined), [menu]);

  async function onSave() {
    if (!menu) return;
    setSavingState('saving');
    setError(null);
    try {
      const saved = await api.menus.update(menu.slug, menu);
      setMenu(saved);
      setDirty(false);
      setSavingState('saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setSavingState('idle');
    }
  }

  if (error && !menu) {
    return (
      <div className="page">
        <div className="banner banner--error">{error}</div>
        <Link to="/" className="btn btn--ghost">
          ← Back to menus
        </Link>
      </div>
    );
  }
  if (!menu || !template) {
    return (
      <div className="page">
        <div className="muted">Loading…</div>
      </div>
    );
  }

  const slotsByRegion = new Map<string, SlotT[]>();
  for (const slot of menu.slots) {
    const list = slotsByRegion.get(slot.regionId) ?? [];
    list.push(slot);
    slotsByRegion.set(slot.regionId, list);
  }
  for (const list of slotsByRegion.values()) list.sort((a, b) => a.order - b.order);

  function addSlot(regionId: string) {
    update((d) => {
      const existing = d.slots.filter((s) => s.regionId === regionId);
      const nextOrder = existing.length > 0 ? Math.max(...existing.map((s) => s.order)) + 1 : 0;
      d.slots.push({
        id: uid('slot'),
        regionId,
        order: nextOrder,
        variants: [
          {
            id: uid('variant'),
            title: 'New section',
            style: 'cards' as SectionStyle,
            items: [],
          },
        ],
      });
    });
  }

  return (
    <div className="page editor-page">
      <div className="editor-toolbar">
        <Link to="/" className="link-button">
          ← Menus
        </Link>
        <div className="editor-toolbar__title">
          <input
            className="editor-toolbar__title-input"
            value={menu.title}
            onChange={(e) => update((d) => void (d.title = e.target.value))}
          />
        </div>
        <div className="editor-toolbar__actions">
          {savingState === 'saved' && !dirty && <span className="saved-pill">Saved</span>}
          <button
            type="button"
            className="btn btn--primary"
            onClick={onSave}
            disabled={!dirty || savingState === 'saving'}
          >
            {savingState === 'saving' ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && <div className="banner banner--error">{error}</div>}

      <section className="editor-card">
        <label className="field">
          <span className="field__label">Template</span>
          <select
            className="field__input"
            value={menu.templateId}
            onChange={(e) =>
              update((d) => {
                d.templateId = e.target.value;
              })
            }
          >
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <span className="field__hint">{template.description}</span>
        </label>
        {orphanWarnings(menu, template).map((msg, i) => (
          <div key={i} className="banner banner--warn">
            {msg}
          </div>
        ))}
      </section>

      <div className="region-grid">
        {template.regions.map((region) => {
          const slots = slotsByRegion.get(region.id) ?? [];
          return (
            <section key={region.id} className="region-panel">
              <header className="region-panel__head">
                <h2 className="region-panel__title">{region.label}</h2>
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={() => addSlot(region.id)}
                >
                  + Add slot
                </button>
              </header>
              {slots.length === 0 ? (
                <div className="region-panel__empty">Empty region</div>
              ) : (
                slots.map((slot) => (
                  <SlotEditor key={slot.id} slot={slot} template={template} update={update} />
                ))
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function orphanWarnings(menu: Menu, template: ReturnType<typeof getTemplate>): string[] {
  if (!template) return [];
  const valid = new Set(template.regions.map((r) => r.id));
  const orphans = menu.slots.filter((s) => !valid.has(s.regionId));
  if (orphans.length === 0) return [];
  return [
    `${orphans.length} slot${orphans.length === 1 ? '' : 's'} reference regions that don't exist in this template. Reassign them or switch templates before saving.`,
  ];
}
