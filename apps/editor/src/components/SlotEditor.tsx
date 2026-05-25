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
    setActiveVariantIdx(slot.variants.length); // will become the new last index
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

  const rotationOn = !!slot.rotation;

  return (
    <div className="slot-editor">
      <div className="slot-editor__head">
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
          </div>
        )}
        {slot.variants.length <= 1 && rotationOn && (
          <div className="hint hint--warn">
            Rotation is on but the slot only has one variant — add another to see it rotate.
          </div>
        )}
      </div>

      <VariantEditor
        variant={variant}
        slotId={slot.id}
        update={update}
        canDelete={slot.variants.length > 1}
        onDelete={() => deleteVariant(variant.id)}
      />
    </div>
  );
}
