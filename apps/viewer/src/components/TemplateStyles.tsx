import type { Template } from '@dishboard/shared';

const MEDIA = {
  phone: '@media (max-width: 767px)',
  tablet: '@media (min-width: 768px) and (max-width: 1199px)',
  kiosk: '@media (min-width: 1200px)',
} as const;

export function TemplateStyles({ template, selector }: { template: Template; selector: string }) {
  const css = (['phone', 'tablet', 'kiosk'] as const)
    .map((bp) => {
      const layout = template.breakpoints[bp];
      return `${MEDIA[bp]} { ${selector} { grid-template-columns: ${layout.gridTemplateColumns}; grid-template-rows: ${layout.gridTemplateRows}; grid-template-areas: ${layout.gridTemplateAreas}; } }`;
    })
    .join('\n');
  return <style>{css}</style>;
}
