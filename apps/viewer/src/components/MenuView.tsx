import { useId } from 'react';
import type { Menu, Slot as SlotType } from '@dishboard/shared';
import { getTemplate } from '@dishboard/shared';
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

  return (
    <>
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
    </>
  );
}
