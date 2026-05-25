import { useState } from 'react';
import type { Draft } from 'immer';
import type { Addon, Item, Menu } from '@dishboard/shared';
import { uid } from '../lib/ids.js';

type UpdateFn = (fn: (draft: Draft<Menu>) => void) => void;

export function ItemEditor({
  item,
  slotId,
  variantId,
  update,
}: {
  item: Item;
  slotId: string;
  variantId: string;
  update: UpdateFn;
}) {
  const [expanded, setExpanded] = useState(false);

  function withItem(fn: (i: Draft<Item>) => void) {
    update((d) => {
      const s = d.slots.find((x) => x.id === slotId);
      const v = s?.variants.find((x) => x.id === variantId);
      const i = v?.items.find((x) => x.id === item.id);
      if (i) fn(i);
    });
  }

  function deleteItem() {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete item "${item.name}"?`)) return;
    update((d) => {
      const s = d.slots.find((x) => x.id === slotId);
      const v = s?.variants.find((x) => x.id === variantId);
      if (v) v.items = v.items.filter((i) => i.id !== item.id);
    });
  }

  function addAddon() {
    withItem((i) => {
      const a: Addon = { id: uid('addon'), name: 'New add-on' };
      i.addons.push(a);
    });
    setExpanded(true);
  }

  function removeAddon(addonId: string) {
    withItem((i) => {
      i.addons = i.addons.filter((a) => a.id !== addonId);
    });
  }

  function setIngredients(value: string) {
    withItem((i) => {
      i.ingredients = value
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    });
  }

  return (
    <div
      className={`item-editor${item.soldOut ? ' item-editor--sold-out' : ''}${item.hidden ? ' item-editor--hidden' : ''}`}
    >
      <div
        className="item-editor__head"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
      >
        <div className="item-editor__title">
          <span className="item-editor__name">{item.name || '(untitled)'}</span>
          {item.price && <span className="item-editor__price">{item.price}</span>}
          {item.soldOut && <span className="pill pill--warn">sold out</span>}
          {item.hidden && <span className="pill pill--muted">hidden</span>}
        </div>
        <span className="item-editor__chevron" aria-hidden>
          {expanded ? '▾' : '▸'}
        </span>
      </div>

      {expanded && (
        <div className="item-editor__body">
          <div className="item-editor__row">
            <label className="field field--grow">
              <span className="field__label">Name</span>
              <input
                className="field__input"
                value={item.name}
                onChange={(e) =>
                  withItem((i) => {
                    i.name = e.target.value;
                  })
                }
              />
            </label>
            <label className="field">
              <span className="field__label">Price</span>
              <input
                className="field__input field__input--narrow"
                value={item.price ?? ''}
                onChange={(e) =>
                  withItem((i) => {
                    i.price = e.target.value || undefined;
                  })
                }
                placeholder="$0.00"
              />
            </label>
          </div>

          <label className="field">
            <span className="field__label">Description (optional)</span>
            <textarea
              className="field__input"
              rows={2}
              value={item.description ?? ''}
              onChange={(e) =>
                withItem((i) => {
                  i.description = e.target.value || undefined;
                })
              }
            />
          </label>

          <label className="field">
            <span className="field__label">Ingredients (one per line)</span>
            <textarea
              className="field__input"
              rows={4}
              value={item.ingredients.join('\n')}
              onChange={(e) => setIngredients(e.target.value)}
            />
          </label>

          <div className="item-editor__row">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={item.soldOut}
                onChange={(e) =>
                  withItem((i) => {
                    i.soldOut = e.target.checked;
                  })
                }
              />
              <span>Sold out</span>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={item.hidden}
                onChange={(e) =>
                  withItem((i) => {
                    i.hidden = e.target.checked;
                  })
                }
              />
              <span>Hidden</span>
            </label>
            {item.squareRef && (
              <span className="pill pill--info" title={item.squareRef.itemId}>
                Square linked
              </span>
            )}
          </div>

          <div className="addons-section">
            <div className="addons-section__head">
              <span className="field__label">Add-ons</span>
              <button type="button" className="btn btn--ghost btn--small" onClick={addAddon}>
                + Add-on
              </button>
            </div>
            {item.addons.length === 0 && <div className="muted">None.</div>}
            {item.addons.map((addon) => (
              <AddonRow
                key={addon.id}
                addon={addon}
                onChange={(patch) =>
                  withItem((i) => {
                    const a = i.addons.find((x) => x.id === addon.id);
                    if (a) Object.assign(a, patch);
                  })
                }
                onRemove={() => removeAddon(addon.id)}
              />
            ))}
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn--danger btn--small" onClick={deleteItem}>
              Delete item
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddonRow({
  addon,
  onChange,
  onRemove,
}: {
  addon: Addon;
  onChange: (patch: Partial<Addon>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="addon-row">
      <input
        className="field__input"
        placeholder="Name"
        value={addon.name}
        onChange={(e) => onChange({ name: e.target.value })}
      />
      <input
        className="field__input field__input--narrow"
        placeholder="$"
        value={addon.price ?? ''}
        onChange={(e) => onChange({ price: e.target.value || undefined })}
      />
      <button
        type="button"
        className="btn btn--ghost btn--small"
        onClick={onRemove}
        aria-label="Remove"
      >
        ✕
      </button>
    </div>
  );
}
