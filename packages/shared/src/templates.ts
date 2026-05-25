import type { Template } from './schema.js';

export const TEMPLATES: readonly Template[] = [
  {
    id: 'classic-3col',
    name: 'Classic 3-Column',
    description:
      'Three columns over two rows — six regions arranged left-to-right, top-to-bottom. Mirrors the legacy Dishboard layout. Collapses to two columns on tablet and a single stack on phone.',
    regions: [
      { id: 'r1', label: 'Top Left' },
      { id: 'r2', label: 'Top Center' },
      { id: 'r3', label: 'Top Right' },
      { id: 'r4', label: 'Bottom Left' },
      { id: 'r5', label: 'Bottom Center' },
      { id: 'r6', label: 'Bottom Right' },
    ],
    breakpoints: {
      kiosk: {
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
        gridTemplateRows: 'minmax(0, 1fr) minmax(0, 1fr)',
        gridTemplateAreas: '"r1 r2 r3" "r4 r5 r6"',
      },
      tablet: {
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: 'auto auto auto',
        gridTemplateAreas: '"r1 r2" "r3 r4" "r5 r6"',
      },
      phone: {
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(6, auto)',
        gridTemplateAreas: '"r1" "r2" "r3" "r4" "r5" "r6"',
      },
    },
  },
  {
    id: 'featured-strip',
    name: 'Featured Strip',
    description:
      'Full-width featured region on top — perfect for daily specials or a rotating promo slot — with three columns of categories underneath.',
    regions: [
      { id: 'featured', label: 'Featured (full width)' },
      { id: 'r1', label: 'Column 1' },
      { id: 'r2', label: 'Column 2' },
      { id: 'r3', label: 'Column 3' },
    ],
    breakpoints: {
      kiosk: {
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
        gridTemplateRows: 'auto minmax(0, 1fr)',
        gridTemplateAreas: '"featured featured featured" "r1 r2 r3"',
      },
      tablet: {
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: 'auto auto auto',
        gridTemplateAreas: '"featured featured" "r1 r2" "r3 r3"',
      },
      phone: {
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'auto auto auto auto',
        gridTemplateAreas: '"featured" "r1" "r2" "r3"',
      },
    },
  },
  {
    id: 'dense-single',
    name: 'Dense Single Column',
    description:
      'One tall scroll-friendly column. Pair with the `list` or `compact` section style to maximize item density — this is the layout to pick when you have lots of small items and not much wall space.',
    regions: [
      { id: 'r1', label: 'Section 1' },
      { id: 'r2', label: 'Section 2' },
      { id: 'r3', label: 'Section 3' },
      { id: 'r4', label: 'Section 4' },
      { id: 'r5', label: 'Section 5' },
      { id: 'r6', label: 'Section 6' },
    ],
    breakpoints: {
      kiosk: {
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(6, auto)',
        gridTemplateAreas: '"r1" "r2" "r3" "r4" "r5" "r6"',
      },
      tablet: {
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(6, auto)',
        gridTemplateAreas: '"r1" "r2" "r3" "r4" "r5" "r6"',
      },
      phone: {
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(6, auto)',
        gridTemplateAreas: '"r1" "r2" "r3" "r4" "r5" "r6"',
      },
    },
  },
  {
    id: 'quad',
    name: 'Quad',
    description:
      'Four large equal regions in a 2×2 grid. Good for high-impact visual menus or restaurants built around a few signature categories.',
    regions: [
      { id: 'tl', label: 'Top Left' },
      { id: 'tr', label: 'Top Right' },
      { id: 'bl', label: 'Bottom Left' },
      { id: 'br', label: 'Bottom Right' },
    ],
    breakpoints: {
      kiosk: {
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gridTemplateRows: 'minmax(0, 1fr) minmax(0, 1fr)',
        gridTemplateAreas: '"tl tr" "bl br"',
      },
      tablet: {
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gridTemplateAreas: '"tl tr" "bl br"',
      },
      phone: {
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'auto auto auto auto',
        gridTemplateAreas: '"tl" "tr" "bl" "br"',
      },
    },
  },
] as const;

export const TEMPLATES_BY_ID: Record<string, Template> = Object.fromEntries(
  TEMPLATES.map((t) => [t.id, t]),
);

export const DEFAULT_TEMPLATE_ID = 'classic-3col';

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES_BY_ID[id];
}

export function isValidRegion(templateId: string, regionId: string): boolean {
  const t = TEMPLATES_BY_ID[templateId];
  if (!t) return false;
  return t.regions.some((r) => r.id === regionId);
}
