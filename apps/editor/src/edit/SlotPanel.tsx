import type { Draft } from 'immer';
import {
  getTemplate,
  type Menu,
  type SectionStyle,
  type SectionVariant,
  type Slot,
} from '@dishboard/shared';
import { uid } from '../lib/ids.js';
import { useEditor } from './EditorContext.js';
import { ItemDetailPanel } from './ItemDetailPanel.js';

export function SlotPanel() {
  const { menu, selection, update, select, activeVariantIdxBySlot, setActiveVariant } = useEditor();

  // Find the selected slot — whether we selected the slot directly or
  // selected an item inside it.
  const slotId =
    selection.kind === 'slot'
      ? selection.slotId
      : selection.kind === 'item'
        ? selection.slotId
        : null;
  if (!slotId) return null;

  const slot = menu.slots.find((s) => s.id === slotId);
  if (!slot) return null;

  const template = getTemplate(menu.templateId);
  const activeIdx = Math.min(activeVariantIdxBySlot[slot.id] ?? 0, slot.variants.length - 1);
  const variant = slot.variants[activeIdx]!;

  function withSlot(fn: (s: Draft<Slot>) => void) {
    update((d) => {
      const s = d.slots.find((x) => x.id === slot!.id);
      if (s) fn(s);
    });
  }

  function withVariant(fn: (v: Draft<SectionVariant>) => void) {
    update((d) => {
      const s = d.slots.find((x) => x.id === slot!.id);
      const v = s?.variants.find((x) => x.id === variant!.id);
      if (v) fn(v);
    });
  }

  function deleteSlot() {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this section and all its content?')) return;
    update((d) => {
      d.slots = d.slots.filter((s) => s.id !== slot!.id);
    });
    select({ kind: 'none' });
  }

  function addVariant() {
    const newId = uid('variant');
    withSlot((s) => {
      s.variants.push({
        id: newId,
        title: `Variant ${s.variants.length + 1}`,
        style: 'cards',
        items: [],
      });
    });
    setActiveVariant(slot!.id, slot!.variants.length); // new last index
  }

  function deleteVariant() {
    if (slot!.variants.length <= 1) {
      // eslint-disable-next-line no-alert
      window.alert('A section must have at least one variant. Delete the whole section instead.');
      return;
    }
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this variant?')) return;
    withSlot((s) => {
      s.variants = s.variants.filter((v) => v.id !== variant!.id);
    });
    setActiveVariant(slot!.id, 0);
  }

  const showRotation = slot.variants.length > 1;
  const rotationOn = !!slot.rotation;

  return (
    <div className="panel-section">
      <h3 className="panel-section__title">Section</h3>

      {/* Region */}
      <label className="field">
        <span className="field__label">Region</span>
        <select
          className="field__input"
          value={slot.regionId}
          onChange={(e) =>
            withSlot((s) => {
              s.regionId = e.target.value;
            })
          }
        >
          {template?.regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          )) ?? <option value={slot.regionId}>{slot.regionId}</option>}
        </select>
      </label>

      {/* Variant selector */}
      <div className="panel-subsection">
        <div className="panel-subsection__head">
          <h4 className="panel-subsection__title">
            Variants {slot.variants.length > 1 && `(${slot.variants.length})`}
          </h4>
          <button type="button" className="btn btn--ghost btn--small" onClick={addVariant}>
            + Variant
          </button>
        </div>
        {slot.variants.length > 1 && (
          <div className="variant-strip">
            {slot.variants.map((v, i) => (
              <button
                key={v.id}
                type="button"
                className={`variant-tab${i === activeIdx ? ' variant-tab--active' : ''}`}
                onClick={() => setActiveVariant(slot.id, i)}
                title={v.title || `Variant ${i + 1}`}
              >
                {v.title || `Variant ${i + 1}`}
              </button>
            ))}
          </div>
        )}
        <label className="field">
          <span className="field__label">Style</span>
          <select
            className="field__input"
            value={variant.style}
            onChange={(e) =>
              withVariant((v) => {
                v.style = e.target.value as SectionStyle;
              })
            }
          >
            <option value="cards">Cards (default)</option>
            <option value="list">List (denser)</option>
            <option value="compact">Compact (densest)</option>
          </select>
        </label>
        {slot.variants.length > 1 && (
          <button type="button" className="btn btn--ghost btn--small" onClick={deleteVariant}>
            Delete this variant
          </button>
        )}
      </div>

      {/* Rotation */}
      {showRotation && (
        <div className="panel-subsection">
          <h4 className="panel-subsection__title">Rotation</h4>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={rotationOn}
              onChange={(e) =>
                withSlot((s) => {
                  if (e.target.checked) {
                    s.rotation = { intervalSec: 30, cycle: 'sequential' };
                  } else {
                    s.rotation = undefined;
                  }
                })
              }
            />
            <span>Rotate variants on a timer</span>
          </label>
          {slot.rotation && (
            <>
              <label className="field field--inline">
                <span className="field__label">Every</span>
                <input
                  className="field__input field__input--narrow"
                  type="number"
                  min={5}
                  value={slot.rotation.intervalSec}
                  onChange={(e) =>
                    withSlot((s) => {
                      if (s.rotation) s.rotation.intervalSec = Math.max(5, Number(e.target.value));
                    })
                  }
                />
                <span className="field__suffix">sec</span>
              </label>
              <label className="field field--inline">
                <span className="field__label">Order</span>
                <select
                  className="field__input"
                  value={slot.rotation.cycle}
                  onChange={(e) =>
                    withSlot((s) => {
                      if (s.rotation) s.rotation.cycle = e.target.value as 'sequential' | 'random';
                    })
                  }
                >
                  <option value="sequential">Sequential</option>
                  <option value="random">Random</option>
                </select>
              </label>
            </>
          )}
        </div>
      )}

      {!showRotation && (
        <div className="panel-subsection">
          <p className="muted">
            Add a second variant above to enable timed rotation on this section.
          </p>
        </div>
      )}

      {/* Selected-item detail (folds into the slot panel rather than a popover) */}
      {selection.kind === 'item' && (
        <div className="panel-subsection">
          <h4 className="panel-subsection__title">Selected item</h4>
          <ItemDetailPanel slotId={slot.id} variantId={variant.id} itemId={selection.itemId} />
        </div>
      )}

      <div className="panel-actions">
        <button type="button" className="btn btn--danger btn--small" onClick={deleteSlot}>
          Delete section
        </button>
      </div>
    </div>
  );
}
