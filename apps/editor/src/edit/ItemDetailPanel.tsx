import type { Draft } from 'immer';
import type { Addon, Item } from '@dishboard/shared';
import { uid } from '../lib/ids.js';
import { SquareLink } from '../components/SquareLink.js';
import { useEditor } from './EditorContext.js';

/**
 * Item details that don't have an inline-editable affordance: addons,
 * Square linking, hidden/sold-out toggles. The text fields (name,
 * price, description, ingredients) are edited inline on the canvas.
 * This panel is shown inside the Slot panel when an item is selected.
 */
export function ItemDetailPanel({
  slotId,
  variantId,
  itemId,
}: {
  slotId: string;
  variantId: string;
  itemId: string;
}) {
  const { menu, update, select } = useEditor();
  const slot = menu.slots.find((s) => s.id === slotId);
  const variant = slot?.variants.find((v) => v.id === variantId);
  const item = variant?.items.find((i) => i.id === itemId);

  if (!item) return <div className="muted">Item not found.</div>;

  function withItem(fn: (i: Draft<Item>) => void) {
    update((d) => {
      const s = d.slots.find((x) => x.id === slotId);
      const v = s?.variants.find((x) => x.id === variantId);
      const i = v?.items.find((x) => x.id === itemId);
      if (i) fn(i);
    });
  }

  function addAddon() {
    withItem((i) => {
      const a: Addon = { id: uid('addon'), name: 'New add-on' };
      i.addons.push(a);
    });
  }

  function removeAddon(addonId: string) {
    withItem((i) => {
      i.addons = i.addons.filter((a) => a.id !== addonId);
    });
  }

  function deleteItem() {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete item "${item!.name}"?`)) return;
    update((d) => {
      const s = d.slots.find((x) => x.id === slotId);
      const v = s?.variants.find((x) => x.id === variantId);
      if (v) v.items = v.items.filter((i) => i.id !== itemId);
    });
    select({ kind: 'slot', slotId });
  }

  return (
    <div className="item-detail">
      <div className="item-detail__row">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={item.soldOut}
            onChange={(e) =>
              withItem((i) => {
                i.soldOut = e.target.checked;
              })
            }
            disabled={!!item.squareRef?.trackAvailability}
            title={item.squareRef?.trackAvailability ? 'Synced from Square' : undefined}
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
      </div>

      <SquareLink
        squareRef={item.squareRef}
        onLink={(pick) =>
          withItem((i) => {
            i.squareRef = {
              itemId: pick.objectId,
              trackPrice: true,
              trackAvailability: true,
            };
            if (!i.price && pick.price) i.price = pick.price;
          })
        }
        onUnlink={() =>
          withItem((i) => {
            i.squareRef = undefined;
          })
        }
        onChangeTrackPrice={(on) =>
          withItem((i) => {
            if (i.squareRef) i.squareRef.trackPrice = on;
          })
        }
        onChangeTrackAvailability={(on) =>
          withItem((i) => {
            if (i.squareRef) i.squareRef.trackAvailability = on;
          })
        }
      />

      <div className="addons-section">
        <div className="addons-section__head">
          <span className="field__label">Add-ons</span>
          <button type="button" className="btn btn--ghost btn--small" onClick={addAddon}>
            + Add-on
          </button>
        </div>
        {item.addons.length === 0 && <div className="muted">None.</div>}
        {item.addons.map((addon) => (
          <div key={addon.id} className="addon-row">
            <input
              className="field__input"
              placeholder="Name"
              value={addon.name}
              onChange={(e) =>
                withItem((i) => {
                  const a = i.addons.find((x) => x.id === addon.id);
                  if (a) a.name = e.target.value;
                })
              }
            />
            <input
              className="field__input field__input--narrow"
              placeholder="$"
              value={addon.price ?? ''}
              onChange={(e) =>
                withItem((i) => {
                  const a = i.addons.find((x) => x.id === addon.id);
                  if (a) a.price = e.target.value || undefined;
                })
              }
            />
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => removeAddon(addon.id)}
              aria-label="Remove"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="panel-actions">
        <button type="button" className="btn btn--danger btn--small" onClick={deleteItem}>
          Delete item
        </button>
      </div>
    </div>
  );
}
