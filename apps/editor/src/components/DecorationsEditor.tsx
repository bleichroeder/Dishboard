import { useState } from 'react';
import type { Draft } from 'immer';
import type {
  AssetRecord,
  ChefPopConfig,
  Decorations,
  FoodDropConfig,
  Menu,
} from '@dishboard/shared';
import { AssetPicker } from './AssetPicker.js';

type UpdateFn = (fn: (draft: Draft<Menu>) => void) => void;

const DEFAULT_CHEF_INTERVAL = 25;
const DEFAULT_DROP_INTERVAL = 60;

export function DecorationsEditor({ menu, update }: { menu: Menu; update: UpdateFn }) {
  const [expanded, setExpanded] = useState(false);

  function withDecorations(fn: (d: Draft<Decorations>) => void) {
    update((draft) => {
      if (!draft.decorations) draft.decorations = {};
      fn(draft.decorations as Draft<Decorations>);
    });
  }

  const chef = menu.decorations?.chefPop;
  const drop = menu.decorations?.foodDrop;

  return (
    <section className="editor-card theme-editor">
      <button
        type="button"
        className="theme-editor__head"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="theme-editor__title">Decorations</span>
        <span className="theme-editor__chevron" aria-hidden>
          {expanded ? '▾' : '▸'}
        </span>
      </button>

      {expanded && (
        <div className="theme-editor__body">
          <DecorationSubsection
            title="Chef pop-out"
            description="A character image slides in from a random edge every interval. Add one or more images — a random one fires each cycle."
            config={chef}
            defaultInterval={DEFAULT_CHEF_INTERVAL}
            onChange={(cfg) =>
              withDecorations((d) => {
                d.chefPop = cfg;
              })
            }
          />

          <DecorationSubsection
            title="Food drop"
            description="An image drops from the top, spinning as it falls. Best for small props like food icons."
            config={drop}
            defaultInterval={DEFAULT_DROP_INTERVAL}
            onChange={(cfg) =>
              withDecorations((d) => {
                d.foodDrop = cfg;
              })
            }
          />
        </div>
      )}
    </section>
  );
}

function DecorationSubsection({
  title,
  description,
  config,
  defaultInterval,
  onChange,
}: {
  title: string;
  description: string;
  config: ChefPopConfig | FoodDropConfig | undefined;
  defaultInterval: number;
  onChange: (cfg: ChefPopConfig | FoodDropConfig | undefined) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const enabled = config?.enabled ?? false;
  const assetIds = config?.assetIds ?? [];
  const intervalSec = config?.intervalSec ?? defaultInterval;

  function patch(p: Partial<ChefPopConfig>) {
    onChange({ enabled, assetIds, intervalSec, ...p });
  }

  function onPickAsset(asset: AssetRecord) {
    if (assetIds.includes(asset.id)) {
      setPickerOpen(false);
      return;
    }
    patch({ assetIds: [...assetIds, asset.id] });
    setPickerOpen(false);
  }

  function removeAsset(id: string) {
    patch({ assetIds: assetIds.filter((a) => a !== id) });
  }

  return (
    <fieldset className="theme-fieldset decoration-sub">
      <legend>{title}</legend>
      <p className="muted decoration-sub__desc">{description}</p>

      <label className="checkbox">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => patch({ enabled: e.target.checked })}
          disabled={assetIds.length === 0}
          title={assetIds.length === 0 ? 'Add at least one image to enable' : undefined}
        />
        <span>Enabled on the viewer</span>
      </label>

      <div className="decoration-sub__assets">
        {assetIds.length === 0 && <div className="muted">No images yet.</div>}
        {assetIds.length > 0 && (
          <ul className="decoration-thumbs">
            {assetIds.map((id) => (
              <li key={id} className="decoration-thumb">
                <img src={`/media/${id}`} alt="" />
                <button
                  type="button"
                  className="decoration-thumb__remove"
                  aria-label="Remove"
                  onClick={() => removeAsset(id)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={() => setPickerOpen(true)}
        >
          + Add image
        </button>
      </div>

      <label className="field field--inline decoration-sub__interval">
        <span className="field__label">Every</span>
        <input
          className="field__input field__input--narrow"
          type="number"
          min={5}
          max={3600}
          value={intervalSec}
          onChange={(e) =>
            patch({
              intervalSec: Math.max(5, Math.min(3600, Number(e.target.value) || defaultInterval)),
            })
          }
        />
        <span className="field__suffix">sec</span>
      </label>

      {pickerOpen && <AssetPicker onPick={onPickAsset} onClose={() => setPickerOpen(false)} />}
    </fieldset>
  );
}
