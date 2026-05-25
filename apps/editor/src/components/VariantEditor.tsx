import type { Draft } from 'immer';
import type { Item, Menu, SectionStyle, SectionVariant } from '@dishboard/shared';
import { uid } from '../lib/ids.js';
import { ItemEditor } from './ItemEditor.js';

type UpdateFn = (fn: (draft: Draft<Menu>) => void) => void;

export function VariantEditor({
  variant,
  slotId,
  update,
  canDelete,
  onDelete,
}: {
  variant: SectionVariant;
  slotId: string;
  update: UpdateFn;
  canDelete: boolean;
  onDelete: () => void;
}) {
  function withVariant(fn: (v: Draft<SectionVariant>) => void) {
    update((d) => {
      const s = d.slots.find((x) => x.id === slotId);
      const v = s?.variants.find((x) => x.id === variant.id);
      if (v) fn(v);
    });
  }

  function addItem() {
    withVariant((v) => {
      const item: Item = {
        id: uid('item'),
        name: 'New item',
        ingredients: [],
        addons: [],
        hidden: false,
        soldOut: false,
      };
      v.items.push(item);
    });
  }

  return (
    <div className="variant-editor">
      <div className="variant-editor__head">
        <label className="field field--grow">
          <span className="field__label">Section title</span>
          <input
            className="field__input"
            value={variant.title}
            onChange={(e) =>
              withVariant((v) => {
                v.title = e.target.value;
              })
            }
          />
        </label>
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
            <option value="cards">Cards</option>
            <option value="list">List</option>
            <option value="compact">Compact</option>
          </select>
        </label>
        {canDelete && (
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={onDelete}
            title="Delete this variant"
          >
            Delete variant
          </button>
        )}
      </div>
      <label className="field">
        <span className="field__label">Description (optional)</span>
        <textarea
          className="field__input"
          rows={2}
          value={variant.description ?? ''}
          onChange={(e) =>
            withVariant((v) => {
              v.description = e.target.value || undefined;
            })
          }
        />
      </label>

      <div className="items-editor">
        {variant.items.length === 0 ? (
          <div className="muted">No items yet.</div>
        ) : (
          variant.items.map((item) => (
            <ItemEditor
              key={item.id}
              item={item}
              slotId={slotId}
              variantId={variant.id}
              update={update}
            />
          ))
        )}
        <button type="button" className="btn btn--secondary btn--block" onClick={addItem}>
          + Add item
        </button>
      </div>
    </div>
  );
}
