import { randomBytes } from 'node:crypto';
import {
  DEFAULT_TEMPLATE_ID,
  getTemplate,
  menuSchema,
  type Addon,
  type Item,
  type Menu,
  type SectionVariant,
  type Slot,
} from '@dishboard/shared';

// Pure-JS conversion from the legacy menu.json shape to the new Menu
// schema. Used by both the on-disk migrate-legacy script (which adds
// asset imports on top) and the /api/menus/import-legacy endpoint
// (which doesn't touch the filesystem).

type LegacySquare = {
  item_id?: string;
  track_price?: boolean;
  track_availability?: boolean;
};
type LegacyAddon = { name?: string; title?: string; price?: string; square?: LegacySquare };
type LegacyItem = {
  name?: string;
  desc?: string;
  ingredients?: string[];
  price?: string;
  addons?: LegacyAddon[];
  hidden?: boolean;
  soldOut?: boolean;
  square?: LegacySquare;
};
type LegacySection = {
  title?: string;
  description?: string;
  gridPosition?: number;
  items?: LegacyItem[];
};
export type LegacyMenu = { menuTitle?: string; sections?: LegacySection[] };

export type ConvertOptions = {
  templateId?: string;
  /** Override the slug; otherwise derived from the legacy menuTitle. */
  slug?: string;
  /** Override the title; otherwise the legacy menuTitle is used. */
  title?: string;
};

function uid(prefix: string): string {
  return `${prefix}_${randomBytes(4).toString('hex')}`;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function convertSquare(sq: LegacySquare | undefined) {
  if (!sq?.item_id) return undefined;
  return {
    itemId: sq.item_id,
    trackPrice: sq.track_price ?? false,
    trackAvailability: sq.track_availability ?? false,
  };
}

function convertAddon(a: LegacyAddon): Addon {
  const sq = convertSquare(a.square);
  // Legacy used either `name` or `title` for the addon label.
  const label = a.name ?? a.title ?? 'Untitled add-on';
  return {
    id: uid('addon'),
    name: label,
    ...(a.price !== undefined ? { price: a.price } : {}),
    ...(sq ? { squareRef: sq } : {}),
  };
}

function convertItem(it: LegacyItem): Item {
  const sq = convertSquare(it.square);
  return {
    id: uid('item'),
    name: it.name ?? 'Untitled item',
    ...(it.desc ? { description: it.desc } : {}),
    ingredients: it.ingredients ?? [],
    ...(it.price !== undefined ? { price: it.price } : {}),
    addons: (it.addons ?? []).map(convertAddon),
    hidden: it.hidden ?? false,
    soldOut: it.soldOut ?? false,
    ...(sq ? { squareRef: sq } : {}),
  };
}

function convertSection(s: LegacySection, fallbackIdx: number, regionIds: string[]): Slot {
  // gridPosition is 1-based; map to region by index, capping at the
  // template's region count.
  const oneBased = s.gridPosition ?? fallbackIdx + 1;
  const regionIdx = Math.min(Math.max(oneBased - 1, 0), regionIds.length - 1);
  const regionId = regionIds[regionIdx]!;
  const variant: SectionVariant = {
    id: uid('variant'),
    title: s.title ?? 'Untitled',
    ...(s.description ? { description: s.description } : {}),
    style: 'cards',
    items: (s.items ?? []).map(convertItem),
  };
  return {
    id: uid('slot'),
    regionId,
    order: 0,
    variants: [variant],
  };
}

export function convertLegacyMenu(legacy: LegacyMenu, opts: ConvertOptions = {}): Menu {
  const templateId = opts.templateId ?? DEFAULT_TEMPLATE_ID;
  const template = getTemplate(templateId);
  if (!template) throw new Error(`unknown templateId '${templateId}'`);
  const regionIds = template.regions.map((r) => r.id);

  const title = opts.title ?? legacy.menuTitle ?? 'Untitled menu';
  const slug = opts.slug ?? slugify(title);

  const slots = (legacy.sections ?? []).map((s, i) => convertSection(s, i, regionIds));

  const candidate: Menu = {
    id: uid('menu'),
    slug,
    title,
    templateId,
    slots,
  };
  return menuSchema.parse(candidate);
}
