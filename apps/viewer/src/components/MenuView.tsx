import { useId, type CSSProperties } from 'react';
import type { Menu, Slot as SlotType, Theme } from '@dishboard/shared';
import { getTemplate } from '@dishboard/shared';
import { Decorations } from './Decorations.js';
import { Slot } from './Slot.js';
import { TemplateStyles } from './TemplateStyles.js';

export function MenuView({ menu }: { menu: Menu }) {
  const template = getTemplate(menu.templateId);
  const reactId = useId().replace(/[^a-z0-9]/gi, '');
  const gridClass = `menu-grid-${reactId}`;

  if (!template) {
    return (
      <div className="viewer-error">
        Unknown template: <code>{menu.templateId}</code>
      </div>
    );
  }

  const slotsByRegion = new Map<string, SlotType[]>();
  for (const slot of menu.slots) {
    const list = slotsByRegion.get(slot.regionId) ?? [];
    list.push(slot);
    slotsByRegion.set(slot.regionId, list);
  }
  for (const list of slotsByRegion.values()) list.sort((a, b) => a.order - b.order);

  const themeStyle = buildThemeStyle(menu.theme);

  return (
    <div className="menu-page" style={themeStyle}>
      <BackgroundLayer theme={menu.theme} />
      <Decorations decorations={menu.decorations} />
      <TemplateStyles template={template} selector={`.${gridClass}`} />
      <header className="menu-header">
        <h1>{menu.title}</h1>
      </header>
      <div className={`menu-grid ${gridClass}`}>
        {template.regions.map((region) => {
          const slots = slotsByRegion.get(region.id) ?? [];
          if (slots.length === 0) {
            return (
              <div
                key={region.id}
                className="menu-region menu-region--empty"
                style={{ gridArea: region.id }}
              />
            );
          }
          return (
            <div key={region.id} className="menu-region" style={{ gridArea: region.id }}>
              {slots.map((slot) => (
                <Slot key={slot.id} slot={slot} />
              ))}
            </div>
          );
        })}
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

function BackgroundLayer({ theme }: { theme: Theme | undefined }) {
  const bg = theme?.background;
  if (!bg || bg.type === 'none') return null;
  if (bg.type === 'color') {
    return <div className="menu-bg menu-bg--color" style={{ background: bg.color }} />;
  }
  // image
  const fit = bg.fit ?? 'cover';
  const overlay = bg.overlayOpacity ?? 0;
  return (
    <>
      <div
        className={`menu-bg menu-bg--image menu-bg--${fit}`}
        style={{ backgroundImage: `url('/media/${bg.assetId}')` }}
      />
      {overlay > 0 && (
        <div
          className="menu-bg menu-bg--overlay"
          style={{ background: `rgba(0, 0, 0, ${overlay})` }}
        />
      )}
    </>
  );
}
