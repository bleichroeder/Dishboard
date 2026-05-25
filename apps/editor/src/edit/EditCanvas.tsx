import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { Draft } from 'immer';
import {
  getTemplate,
  type Item,
  type Menu,
  type SectionVariant,
  type Slot,
  type Theme,
} from '@dishboard/shared';
import { uid } from '../lib/ids.js';
import { EditableText } from './EditableText.js';
import { useEditor } from './EditorContext.js';
import { TemplateStyles } from './TemplateStyles.js';

const DESIGN_WIDTH = 1920;
const FIT_MARGIN = 0.96;

export function EditCanvas() {
  const { menu, update } = useEditor();
  const template = getTemplate(menu.templateId);
  if (!template) {
    return (
      <div className="edit-canvas-area">
        <div className="banner banner--error" style={{ margin: '2rem' }}>
          Unknown template: <code>{menu.templateId}</code>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-canvas-area">
      <FitToContainer>
        <div
          className="menu-render"
          style={{
            ...buildThemeStyle(menu.theme),
            ...buildBackgroundStyle(menu.theme),
          }}
        >
          <BackgroundOverlay theme={menu.theme} />
          <TemplateStyles template={template} selector=".menu-render__grid" />
          <header className="menu-render__header">
            <EditableText
              tag="h1"
              ariaLabel="Menu title"
              value={menu.title}
              onChange={(next) =>
                update((d) => {
                  d.title = next;
                })
              }
            />
          </header>
          <RegionGrid menu={menu} template={template} />
        </div>
      </FitToContainer>
    </div>
  );
}

/**
 * Mirrors the viewer's ScalableMenu: width is fixed at the design
 * canvas size (1920px) and height is content-driven. We compute the
 * largest uniform scale that fits both axes inside the container so
 * the editor canvas renders exactly what the viewer would show.
 */
function FitToContainer({ children }: { children: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const scalerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const scaler = scalerRef.current;
    if (!wrap || !scaler) return;
    function compute() {
      if (!wrap || !scaler) return;
      const containerW = wrap.clientWidth;
      const containerH = wrap.clientHeight;
      const naturalW = scaler.offsetWidth;
      const naturalH = scaler.offsetHeight;
      if (containerW <= 0 || containerH <= 0 || naturalW <= 0 || naturalH <= 0) return;
      const next = Math.min(containerW / naturalW, containerH / naturalH) * FIT_MARGIN;
      setScale(next);
    }
    compute();
    const obs = new ResizeObserver(compute);
    obs.observe(wrap);
    obs.observe(scaler);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="edit-canvas-fit">
      <div
        ref={scalerRef}
        className="edit-canvas-scaler"
        style={{
          width: DESIGN_WIDTH,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function buildThemeStyle(theme: Theme | undefined): CSSProperties {
  if (!theme) return {};
  const style: Record<string, string> = {};
  if (theme.fonts?.display) style['--theme-font-display'] = `'${theme.fonts.display}'`;
  if (theme.fonts?.body) style['--theme-font-body'] = `'${theme.fonts.body}'`;
  if (theme.fonts?.price) style['--theme-font-price'] = `'${theme.fonts.price}'`;
  if (theme.colors?.pageText) style['--theme-page-text'] = theme.colors.pageText;
  if (theme.colors?.sectionTitle) style['--theme-section-title'] = theme.colors.sectionTitle;
  if (theme.colors?.accent) style['--theme-accent'] = theme.colors.accent;
  if (theme.colors?.price) style['--theme-price'] = theme.colors.price;
  if (theme.colors?.sectionBg) style['--theme-section-bg'] = theme.colors.sectionBg;
  if (theme.sizes?.titleScale) style['--theme-title-scale'] = String(theme.sizes.titleScale);
  if (theme.sizes?.sectionTitleScale)
    style['--theme-section-title-scale'] = String(theme.sizes.sectionTitleScale);
  if (theme.sizes?.itemScale) style['--theme-item-scale'] = String(theme.sizes.itemScale);
  if (theme.sizes?.priceScale) style['--theme-price-scale'] = String(theme.sizes.priceScale);
  return style as CSSProperties;
}

/**
 * Apply the menu's background as an actual CSS background on the
 * .menu-render element so it sits below the fallback bg color rather
 * than fighting it via z-index. Returns the style props to merge.
 */
function buildBackgroundStyle(theme: Theme | undefined): CSSProperties {
  const bg = theme?.background;
  if (!bg || bg.type === 'none') return {};
  if (bg.type === 'color') {
    return { background: bg.color };
  }
  // image
  const fit = bg.fit ?? 'cover';
  return {
    backgroundImage: `url('/media/${bg.assetId}')`,
    backgroundPosition: 'center',
    backgroundRepeat: fit === 'repeat' ? 'repeat' : 'no-repeat',
    backgroundSize: fit === 'cover' ? 'cover' : fit === 'contain' ? 'contain' : 'auto',
    backgroundColor: '#1a1612',
  };
}

/**
 * Optional darkening layer painted over the background image so item
 * text stays readable. The menu content renders above it via DOM order
 * plus position:relative on the children that need it.
 */
function BackgroundOverlay({ theme }: { theme: Theme | undefined }) {
  const bg = theme?.background;
  if (!bg || bg.type !== 'image') return null;
  const overlay = bg.overlayOpacity ?? 0;
  if (overlay <= 0) return null;
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        background: `rgba(0, 0, 0, ${overlay})`,
        pointerEvents: 'none',
      }}
    />
  );
}

function RegionGrid({
  menu,
  template,
}: {
  menu: Menu;
  template: NonNullable<ReturnType<typeof getTemplate>>;
}) {
  const { update, select } = useEditor();
  const slotsByRegion = new Map<string, Slot[]>();
  for (const slot of menu.slots) {
    const list = slotsByRegion.get(slot.regionId) ?? [];
    list.push(slot);
    slotsByRegion.set(slot.regionId, list);
  }
  for (const list of slotsByRegion.values()) list.sort((a, b) => a.order - b.order);

  function addSlotToRegion(regionId: string) {
    const variantId = uid('variant');
    const slotId = uid('slot');
    update((d) => {
      const existing = d.slots.filter((s) => s.regionId === regionId);
      const nextOrder = existing.length > 0 ? Math.max(...existing.map((s) => s.order)) + 1 : 0;
      d.slots.push({
        id: slotId,
        regionId,
        order: nextOrder,
        variants: [
          {
            id: variantId,
            title: 'New section',
            style: 'cards',
            items: [],
          },
        ],
      });
    });
    select({ kind: 'slot', slotId });
  }

  return (
    <div className="menu-render__grid">
      {template.regions.map((region) => {
        const slots = slotsByRegion.get(region.id) ?? [];
        return (
          <div key={region.id} className="menu-render__region" style={{ gridArea: region.id }}>
            {slots.length === 0 ? (
              <button
                type="button"
                className="menu-render__region--empty"
                onClick={() => addSlotToRegion(region.id)}
              >
                + Add section to {region.label}
              </button>
            ) : (
              slots.map((slot) => (
                <EditableSlot key={slot.id} slot={slot} regionLabel={region.label} />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}

function EditableSlot({ slot, regionLabel }: { slot: Slot; regionLabel: string }) {
  const { update, selection, select, activeVariantIdxBySlot, setActiveVariant } = useEditor();
  const isSelected = selection.kind === 'slot' && selection.slotId === slot.id;
  const activeIdx = Math.min(activeVariantIdxBySlot[slot.id] ?? 0, slot.variants.length - 1);
  const variant = slot.variants[activeIdx]!;

  function withVariant(fn: (v: Draft<SectionVariant>) => void) {
    update((d) => {
      const s = d.slots.find((x) => x.id === slot.id);
      const v = s?.variants.find((x) => x.id === variant.id);
      if (v) fn(v);
    });
  }

  function addItem() {
    const itemId = uid('item');
    withVariant((v) => {
      v.items.push({
        id: itemId,
        name: 'New item',
        ingredients: [],
        addons: [],
        hidden: false,
        soldOut: false,
      } as Item);
    });
  }

  const rotating = slot.variants.length > 1 && !!slot.rotation;

  return (
    <article
      className={`menu-render__section${isSelected ? ' menu-render__section--selected' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        select({ kind: 'slot', slotId: slot.id });
      }}
      aria-label={`Section in ${regionLabel}`}
    >
      {rotating && slot.rotation && (
        <span className="menu-render__rotation-pill">rotates {slot.rotation.intervalSec}s</span>
      )}

      {slot.variants.length > 1 && (
        <div className="menu-render__variant-strip" role="tablist">
          {slot.variants.map((v, i) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={i === activeIdx}
              className={`menu-render__variant-tab${i === activeIdx ? ' menu-render__variant-tab--active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveVariant(slot.id, i);
                select({ kind: 'slot', slotId: slot.id });
              }}
              title={v.title || `Variant ${i + 1}`}
            >
              {v.title || `Variant ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      <header className="menu-render__section-header">
        <EditableText
          tag="h2"
          className="menu-render__section-title"
          ariaLabel="Section title"
          value={variant.title}
          onChange={(next) =>
            withVariant((v) => {
              v.title = next;
            })
          }
          onSelect={() => select({ kind: 'slot', slotId: slot.id })}
        />
        <EditableText
          tag="p"
          className="menu-render__section-description"
          ariaLabel="Section description"
          multiline
          value={variant.description ?? ''}
          onChange={(next) =>
            withVariant((v) => {
              v.description = next || undefined;
            })
          }
          onSelect={() => select({ kind: 'slot', slotId: slot.id })}
        />
      </header>

      <ul className={`menu-render__items menu-render__items--${variant.style}`}>
        {variant.items
          .filter((it) => true)
          .map((item) => (
            <EditableItem key={item.id} item={item} slotId={slot.id} variantId={variant.id} />
          ))}
      </ul>

      <div className="menu-render__add-item-row">
        <button
          type="button"
          className="menu-render__add-button"
          onClick={(e) => {
            e.stopPropagation();
            addItem();
          }}
        >
          + Add item
        </button>
      </div>
    </article>
  );
}

function EditableItem({
  item,
  slotId,
  variantId,
}: {
  item: Item;
  slotId: string;
  variantId: string;
}) {
  const { update, selection, select } = useEditor();
  const isSelected =
    selection.kind === 'item' &&
    selection.itemId === item.id &&
    selection.slotId === slotId &&
    selection.variantId === variantId;

  function withItem(fn: (i: Draft<Item>) => void) {
    update((d) => {
      const s = d.slots.find((x) => x.id === slotId);
      const v = s?.variants.find((x) => x.id === variantId);
      const i = v?.items.find((x) => x.id === item.id);
      if (i) fn(i);
    });
  }

  function setIngredients(value: string) {
    withItem((i) => {
      i.ingredients = value
        .split(/,/)
        .map((s) => s.trim())
        .filter(Boolean);
    });
  }

  return (
    <li
      className={`menu-render__item menu-render__items--${item.soldOut ? 'sold-out' : ''}${
        isSelected ? ' menu-render__item--selected' : ''
      }${item.soldOut ? ' menu-render__item--sold-out' : ''}${item.hidden ? ' menu-render__item--hidden' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        select({ kind: 'item', slotId, variantId, itemId: item.id });
      }}
    >
      <div className="menu-render__item-head">
        <EditableText
          className="menu-render__item-name"
          ariaLabel="Item name"
          value={item.name}
          onChange={(next) =>
            withItem((i) => {
              i.name = next;
            })
          }
          onSelect={() => select({ kind: 'item', slotId, variantId, itemId: item.id })}
        />
        <EditableText
          className="menu-render__item-price"
          ariaLabel="Price"
          value={item.price ?? ''}
          onChange={(next) =>
            withItem((i) => {
              i.price = next || undefined;
            })
          }
          onSelect={() => select({ kind: 'item', slotId, variantId, itemId: item.id })}
        />
      </div>
      <EditableText
        tag="p"
        className="menu-render__item-description"
        ariaLabel="Item description"
        multiline
        value={item.description ?? ''}
        onChange={(next) =>
          withItem((i) => {
            i.description = next || undefined;
          })
        }
      />
      <EditableText
        tag="p"
        className="menu-render__item-ingredients"
        ariaLabel="Ingredients"
        value={item.ingredients.join(', ')}
        onChange={setIngredients}
      />
      {(item.soldOut || item.hidden || item.squareRef) && (
        <div className="menu-render__item-badges">
          {item.soldOut && <span className="menu-render__item-badge">sold out</span>}
          {item.hidden && (
            <span className="menu-render__item-badge menu-render__item-badge--muted">hidden</span>
          )}
          {item.squareRef && (
            <span className="menu-render__item-badge menu-render__item-badge--info">Square</span>
          )}
        </div>
      )}
    </li>
  );
}
