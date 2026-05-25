import { useState } from 'react';
import type { Draft } from 'immer';
import type { Menu, SectionVariant, Slot as SlotT, Template } from '@dishboard/shared';
import { uid } from '../lib/ids.js';
import { VariantEditor } from './VariantEditor.js';

type UpdateFn = (fn: (draft: Draft<Menu>) => void) => void;

export function SlotEditor({
  slot,
  template,
  update,
}: {
  slot: SlotT;
  template: Template;
  update: UpdateFn;
}) {
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const safeIdx = Math.min(activeVariantIdx, slot.variants.length - 1);
  const variant = slot.variants[safeIdx]!;

  function withSlot(fn: (s: Draft<SlotT>) => void) {
    update((d) => {
      const s = d.slots.find((x) => x.id === slot.id);
      if (s) fn(s);
    });
  }

  function deleteSlot() {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this slot and all its variants?')) return;
    update((d) => {
      d.slots = d.slots.filter((s) => s.id !== slot.id);
    });
  }

  function addVariant() {
    const newId = uid('variant');
    withSlot((s) => {
      const v: SectionVariant = {
        id: newId,
        title: `Variant ${s.variants.length + 1}`,
        style: 'cards',
        items: [],
      };
      s.variants.push(v);
    });
    setActiveVariantIdx(slot.variants.length);
    setExpanded(true);
  }

  function deleteVariant(variantId: string) {
    if (slot.variants.length <= 1) {
      // eslint-disable-next-line no-alert
      window.alert('A slot must have at least one variant. Delete the slot instead.');
      return;
    }
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this variant?')) return;
    withSlot((s) => {
      s.variants = s.variants.filter((v) => v.id !== variantId);
    });
    setActiveVariantIdx(0);
  }

  const totalItems = slot.variants.reduce((n, v) => n + v.items.length, 0);
  const rotationOn = !!slot.rotation;
  const showRotation = slot.variants.length > 1;
  const titleForSummary = variant.title || 'Untitled section';

  return (
    <div className="slot-card">
      <button
        type="button"
        className="slot-card__head"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="slot-card__chevron" aria-hidden>
          {expanded ? '▾' : '▸'}
        </span>
        <span className="slot-card__title">{titleForSummary}</span>
        <span className="slot-card__meta">
          {slot.variants.length === 1
            ? `${totalItems} item${totalItems === 1 ? '' : 's'}`
            : `${slot.variants.length} variants · ${totalItems} item${totalItems === 1 ? '' : 's'}`}
        </span>
        {rotationOn && slot.variants.length > 1 && slot.rotation && (
          <span className="pill pill--info">rotates {slot.rotation.intervalSec}s</span>
        )}
      </button>

      {expanded && (
        <div className="slot-card__body">
          <div className="slot-editor__head">
            {slot.variants.length > 1 && (
              <div className="slot-editor__variant-tabs" role="tablist">
                {slot.variants.map((v, i) => (
                  <button
                    key={v.id}
                    type="button"
                    role="tab"
                    aria-selected={i === safeIdx}
                    className={`variant-tab${i === safeIdx ? ' variant-tab--active' : ''}`}
                    onClick={() => setActiveVariantIdx(i)}
                    title={v.title}
                  >
                    {v.title || `Variant ${i + 1}`}
                  </button>
                ))}
                <button
                  type="button"
                  className="variant-tab variant-tab--add"
                  onClick={addVariant}
                  title="Add variant"
                >
                  +
                </button>
              </div>
            )}
            {slot.variants.length === 1 && (
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={addVariant}
                title="Add a second variant to enable rotation"
              >
                + Variant for rotation
              </button>
            )}
            <div className="slot-editor__head-actions">
              <select
                className="region-select"
                value={slot.regionId}
                onChange={(e) =>
                  withSlot((s) => {
                    s.regionId = e.target.value;
                  })
                }
                aria-label="Region"
                title="Move to region"
              >
                {template.regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    → {r.label}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn--danger btn--small" onClick={deleteSlot}>
                Delete slot
              </button>
            </div>
          </div>

          {showRotation && (
            <div className="slot-editor__rotation">
              <label className="rotation-toggle">
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
                <div className="rotation-config">
                  <label className="field field--inline">
                    <span className="field__label">Every</span>
                    <input
                      className="field__input field__input--narrow"
                      type="number"
                      min={5}
                      value={slot.rotation.intervalSec}
                      onChange={(e) =>
                        withSlot((s) => {
                          if (s.rotation)
                            s.rotation.intervalSec = Math.max(5, Number(e.target.value));
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
                          if (s.rotation)
                            s.rotation.cycle = e.target.value as 'sequential' | 'random';
                        })
                      }
                    >
                      <option value="sequential">Sequential</option>
                      <option value="random">Random</option>
                    </select>
                  </label>
                </div>
              )}
            </div>
          )}

          <VariantEditor
            variant={variant}
            slotId={slot.id}
            update={update}
            canDelete={slot.variants.length > 1}
            onDelete={() => deleteVariant(variant.id)}
          />
        </div>
      )}
    </div>
  );
}
