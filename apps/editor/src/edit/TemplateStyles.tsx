import type { Template } from '@dishboard/shared';

/**
 * Editor-only TemplateStyles: emits the kiosk breakpoint's grid layout
 * for the menu-render canvas. No media queries — the editor always
 * shows the kiosk layout, since the design canvas is fixed-width.
 */
export function TemplateStyles({ template, selector }: { template: Template; selector: string }) {
  const layout = template.breakpoints.kiosk;
  const css = `${selector} { grid-template-columns: ${layout.gridTemplateColumns}; grid-template-rows: ${layout.gridTemplateRows}; grid-template-areas: ${layout.gridTemplateAreas}; }`;
  return <style>{css}</style>;
}
