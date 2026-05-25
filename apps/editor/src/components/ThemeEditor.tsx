import { useState } from 'react';
import type { Draft } from 'immer';
import {
  FONT_OPTIONS,
  type AssetRecord,
  type Background,
  type FontOption,
  type Menu,
  type Theme,
} from '@dishboard/shared';
import { AssetPicker } from './AssetPicker.js';

type UpdateFn = (fn: (draft: Draft<Menu>) => void) => void;

const DEFAULT_FILL_DISPLAY: FontOption = 'Lilita One';
const DEFAULT_FILL_BODY: FontOption = 'Montserrat';
const DEFAULT_FILL_PRICE: FontOption = 'Permanent Marker';

export function ThemeEditor({ menu, update }: { menu: Menu; update: UpdateFn }) {
  const [expanded, setExpanded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const theme = menu.theme ?? {};

  function withTheme(fn: (t: Draft<Theme>) => void) {
    update((d) => {
      if (!d.theme) d.theme = {};
      fn(d.theme as Draft<Theme>);
    });
  }

  function setBackground(bg: Background | undefined) {
    update((d) => {
      if (!d.theme) d.theme = {};
      d.theme.background = bg;
    });
  }

  const bg = theme.background ?? { type: 'none' as const };
  const bgType = bg.type;

  function onBgTypeChange(type: 'none' | 'color' | 'image') {
    if (type === 'none') setBackground({ type: 'none' });
    else if (type === 'color') setBackground({ type: 'color', color: '#1a1612' });
    else setPickerOpen(true);
  }

  function onPickAsset(asset: AssetRecord) {
    setBackground({ type: 'image', assetId: asset.id, fit: 'cover', overlayOpacity: 0 });
    setPickerOpen(false);
  }

  return (
    <section className="editor-card theme-editor">
      <button
        type="button"
        className="theme-editor__head"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="theme-editor__title">Theme</span>
        <span className="theme-editor__chevron" aria-hidden>
          {expanded ? '▾' : '▸'}
        </span>
      </button>

      {expanded && (
        <div className="theme-editor__body">
          {/* Background */}
          <fieldset className="theme-fieldset">
            <legend>Background</legend>
            <div className="theme-row">
              <label className="radio">
                <input
                  type="radio"
                  name="bg-type"
                  checked={bgType === 'none'}
                  onChange={() => onBgTypeChange('none')}
                />
                <span>None (use default)</span>
              </label>
              <label className="radio">
                <input
                  type="radio"
                  name="bg-type"
                  checked={bgType === 'color'}
                  onChange={() => onBgTypeChange('color')}
                />
                <span>Color</span>
              </label>
              <label className="radio">
                <input
                  type="radio"
                  name="bg-type"
                  checked={bgType === 'image'}
                  onChange={() => onBgTypeChange('image')}
                />
                <span>Image</span>
              </label>
            </div>

            {bg.type === 'color' && (
              <label className="field field--inline">
                <span className="field__label">Color</span>
                <input
                  type="color"
                  className="color-input"
                  value={bg.color}
                  onChange={(e) => setBackground({ type: 'color', color: e.target.value })}
                />
                <input
                  className="field__input field__input--narrow"
                  value={bg.color}
                  onChange={(e) => setBackground({ type: 'color', color: e.target.value })}
                />
              </label>
            )}

            {bg.type === 'image' && (
              <div className="bg-image-config">
                <div className="bg-image-preview">
                  <img src={`/media/${bg.assetId}`} alt="Background preview" />
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => setPickerOpen(true)}
                  >
                    Change image
                  </button>
                </div>
                <div className="theme-row">
                  <label className="field field--inline">
                    <span className="field__label">Fit</span>
                    <select
                      className="field__input"
                      value={bg.fit ?? 'cover'}
                      onChange={(e) =>
                        setBackground({
                          ...bg,
                          fit: e.target.value as 'cover' | 'contain' | 'repeat',
                        })
                      }
                    >
                      <option value="cover">Cover</option>
                      <option value="contain">Contain</option>
                      <option value="repeat">Repeat</option>
                    </select>
                  </label>
                  <label className="field field--inline">
                    <span className="field__label">Darken</span>
                    <input
                      type="range"
                      min="0"
                      max="0.85"
                      step="0.05"
                      value={bg.overlayOpacity ?? 0}
                      onChange={(e) =>
                        setBackground({ ...bg, overlayOpacity: Number(e.target.value) })
                      }
                    />
                    <span className="field__suffix">
                      {Math.round((bg.overlayOpacity ?? 0) * 100)}%
                    </span>
                  </label>
                </div>
              </div>
            )}
          </fieldset>

          {/* Fonts */}
          <fieldset className="theme-fieldset">
            <legend>Fonts</legend>
            <div className="theme-row">
              <FontField
                label="Section titles"
                value={theme.fonts?.display}
                placeholder={DEFAULT_FILL_DISPLAY}
                onChange={(v) =>
                  withTheme((t) => {
                    t.fonts = { ...t.fonts, display: v };
                  })
                }
              />
              <FontField
                label="Item body"
                value={theme.fonts?.body}
                placeholder={DEFAULT_FILL_BODY}
                onChange={(v) =>
                  withTheme((t) => {
                    t.fonts = { ...t.fonts, body: v };
                  })
                }
              />
              <FontField
                label="Prices"
                value={theme.fonts?.price}
                placeholder={DEFAULT_FILL_PRICE}
                onChange={(v) =>
                  withTheme((t) => {
                    t.fonts = { ...t.fonts, price: v };
                  })
                }
              />
            </div>
          </fieldset>

          {/* Colors */}
          <fieldset className="theme-fieldset">
            <legend>Colors</legend>
            <div className="theme-row">
              <ColorField
                label="Section title"
                value={theme.colors?.sectionTitle}
                onChange={(v) =>
                  withTheme((t) => {
                    t.colors = { ...t.colors, sectionTitle: v };
                  })
                }
              />
              <ColorField
                label="Accent (header)"
                value={theme.colors?.accent}
                onChange={(v) =>
                  withTheme((t) => {
                    t.colors = { ...t.colors, accent: v };
                  })
                }
              />
              <ColorField
                label="Price"
                value={theme.colors?.price}
                onChange={(v) =>
                  withTheme((t) => {
                    t.colors = { ...t.colors, price: v };
                  })
                }
              />
              <ColorField
                label="Item text"
                value={theme.colors?.pageText}
                onChange={(v) =>
                  withTheme((t) => {
                    t.colors = { ...t.colors, pageText: v };
                  })
                }
              />
              <ColorField
                label="Section card"
                value={theme.colors?.sectionBg}
                onChange={(v) =>
                  withTheme((t) => {
                    t.colors = { ...t.colors, sectionBg: v };
                  })
                }
              />
            </div>
          </fieldset>

          {/* Sizes */}
          <fieldset className="theme-fieldset">
            <legend>Size scales (1.0 = default)</legend>
            <div className="theme-row">
              <ScaleField
                label="Menu title"
                value={theme.sizes?.titleScale}
                onChange={(v) =>
                  withTheme((t) => {
                    t.sizes = { ...t.sizes, titleScale: v };
                  })
                }
              />
              <ScaleField
                label="Section titles"
                value={theme.sizes?.sectionTitleScale}
                onChange={(v) =>
                  withTheme((t) => {
                    t.sizes = { ...t.sizes, sectionTitleScale: v };
                  })
                }
              />
              <ScaleField
                label="Items"
                value={theme.sizes?.itemScale}
                onChange={(v) =>
                  withTheme((t) => {
                    t.sizes = { ...t.sizes, itemScale: v };
                  })
                }
              />
              <ScaleField
                label="Prices"
                value={theme.sizes?.priceScale}
                onChange={(v) =>
                  withTheme((t) => {
                    t.sizes = { ...t.sizes, priceScale: v };
                  })
                }
              />
            </div>
          </fieldset>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() =>
                update((d) => {
                  d.theme = undefined;
                })
              }
            >
              Reset theme to defaults
            </button>
          </div>
        </div>
      )}

      {pickerOpen && <AssetPicker onPick={onPickAsset} onClose={() => setPickerOpen(false)} />}
    </section>
  );
}

function FontField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: FontOption | undefined;
  placeholder: string;
  onChange: (v: FontOption | undefined) => void;
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <select
        className="field__input"
        value={value ?? ''}
        onChange={(e) => onChange((e.target.value || undefined) as FontOption | undefined)}
      >
        <option value="">Default ({placeholder})</option>
        {FONT_OPTIONS.map((f) => (
          <option key={f} value={f} style={{ fontFamily: `'${f}', sans-serif` }}>
            {f}
          </option>
        ))}
      </select>
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  const cur = value ?? '';
  return (
    <label className="field field--color">
      <span className="field__label">{label}</span>
      <div className="color-row">
        <input
          type="color"
          className="color-input"
          value={cur || '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          className="field__input field__input--narrow"
          placeholder="default"
          value={cur}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
        {value && (
          <button
            type="button"
            className="link-button"
            onClick={() => onChange(undefined)}
            aria-label="Reset"
          >
            ✕
          </button>
        )}
      </div>
    </label>
  );
}

function ScaleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const cur = value ?? 1;
  return (
    <label className="field field--inline">
      <span className="field__label">{label}</span>
      <input
        type="range"
        min="0.5"
        max="2"
        step="0.05"
        value={cur}
        onChange={(e) => {
          const v = Number(e.target.value);
          onChange(Math.abs(v - 1) < 0.001 ? undefined : v);
        }}
      />
      <span className="field__suffix">{cur.toFixed(2)}×</span>
    </label>
  );
}
