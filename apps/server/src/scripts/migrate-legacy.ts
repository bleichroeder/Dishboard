import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import {
  menuSchema,
  scheduleSchema,
  DEFAULT_TEMPLATE_ID,
  getTemplate,
  type Menu,
  type Slot,
  type SectionVariant,
  type Item,
  type Addon,
  type Schedule,
  type ScheduleRule,
  type Weekday,
} from '@dishboard/shared';
import * as db from '../db.js';

const LEGACY_ROOT = process.argv[2] ?? path.resolve('C:\\Users\\David\\Desktop\\Dishboard');
const LEGACY_MENUS = path.join(LEGACY_ROOT, 'Menus');
const LEGACY_SCHEDULE = path.join(LEGACY_ROOT, 'schedule.json');

const TEMPLATE_ID = DEFAULT_TEMPLATE_ID;
const TEMPLATE = getTemplate(TEMPLATE_ID);
if (!TEMPLATE) throw new Error(`default template '${TEMPLATE_ID}' not found`);
const REGION_IDS = TEMPLATE.regions.map((r) => r.id);

function uid(prefix: string): string {
  return `${prefix}_${randomBytes(4).toString('hex')}`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type LegacySquare = { item_id?: string; track_price?: boolean; track_availability?: boolean };
type LegacyAddon = { name?: string; price?: string; square?: LegacySquare };
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
type LegacyMenu = {
  menuTitle?: string;
  sections?: LegacySection[];
};

function convertSquare(sq: LegacySquare | undefined) {
  if (!sq?.item_id) return undefined;
  return {
    itemId: sq.item_id,
    trackPrice: sq.track_price ?? false,
    trackAvailability: sq.track_availability ?? false,
  };
}

function convertAddon(a: LegacyAddon): Addon {
  return {
    id: uid('addon'),
    name: a.name ?? 'Untitled add-on',
    ...(a.price !== undefined ? { price: a.price } : {}),
    ...(convertSquare(a.square) ? { squareRef: convertSquare(a.square)! } : {}),
  };
}

function convertItem(it: LegacyItem): Item {
  return {
    id: uid('item'),
    name: it.name ?? 'Untitled item',
    ...(it.desc ? { description: it.desc } : {}),
    ingredients: it.ingredients ?? [],
    ...(it.price !== undefined ? { price: it.price } : {}),
    addons: (it.addons ?? []).map(convertAddon),
    hidden: it.hidden ?? false,
    soldOut: it.soldOut ?? false,
    ...(convertSquare(it.square) ? { squareRef: convertSquare(it.square)! } : {}),
  };
}

function convertSection(s: LegacySection, fallbackIdx: number): Slot {
  // gridPosition is 1-based in legacy. Map to region by index, capping at the
  // template's region count. Sections beyond that get assigned to later regions
  // (which classic-3col doesn't have, so they get dropped into the last region).
  const oneBased = s.gridPosition ?? fallbackIdx + 1;
  const regionIdx = Math.min(Math.max(oneBased - 1, 0), REGION_IDS.length - 1);
  const regionId = REGION_IDS[regionIdx]!;
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

function buildMenu(folderName: string, legacy: LegacyMenu): Menu {
  const slots = (legacy.sections ?? []).map((s, i) => convertSection(s, i));
  const candidate: Menu = {
    id: uid('menu'),
    slug: slugify(folderName),
    title: legacy.menuTitle ?? folderName,
    templateId: TEMPLATE_ID,
    slots,
  };
  return menuSchema.parse(candidate);
}

function readJSON<T>(p: string): T {
  return JSON.parse(readFileSync(p, 'utf8')) as T;
}

function migrateMenus(): Map<string, string> {
  const slugToId = new Map<string, string>();
  if (!existsSync(LEGACY_MENUS)) {
    console.warn(`[migrate] legacy menus dir not found: ${LEGACY_MENUS}`);
    return slugToId;
  }
  const entries = readdirSync(LEGACY_MENUS).filter((e) => {
    const p = path.join(LEGACY_MENUS, e);
    return statSync(p).isDirectory() && existsSync(path.join(p, 'menu.json'));
  });
  for (const folder of entries) {
    const jsonPath = path.join(LEGACY_MENUS, folder, 'menu.json');
    let legacy: LegacyMenu;
    try {
      legacy = readJSON<LegacyMenu>(jsonPath);
    } catch (e) {
      console.warn(`[migrate] skipping ${folder}: ${(e as Error).message}`);
      continue;
    }
    try {
      const menu = buildMenu(folder, legacy);
      db.saveMenu(menu);
      slugToId.set(menu.slug, menu.id);
      console.log(
        `[migrate] menu '${menu.title}' (slug=${menu.slug}, template=${menu.templateId}, slots=${menu.slots.length})`,
      );
    } catch (e) {
      console.warn(`[migrate] failed to migrate ${folder}: ${(e as Error).message}`);
    }
  }
  return slugToId;
}

function migrateSchedule(slugToId: Map<string, string>): void {
  if (!existsSync(LEGACY_SCHEDULE)) {
    console.log('[migrate] no legacy schedule.json found, skipping schedule migration');
    return;
  }
  type LegacySchedule = {
    default_menu?: string;
    schedules?: Array<{
      name?: string;
      menu?: string;
      start_time?: string;
      end_time?: string;
      days?: string[];
    }>;
  };
  const legacy = readJSON<LegacySchedule>(LEGACY_SCHEDULE);
  const rules: ScheduleRule[] = (legacy.schedules ?? []).flatMap((r) => {
    if (!r.menu || !r.start_time || !r.end_time || !r.days?.length) return [];
    // legacy menu path looks like "Menus/Breakfast/menu.json" — extract folder.
    const parts = r.menu.split(/[\\/]/);
    const folder = parts[parts.length - 2] ?? '';
    const slug = slugify(folder);
    const menuId = slugToId.get(slug);
    if (!menuId) {
      console.warn(`[migrate] schedule rule references unknown menu '${r.menu}', skipping`);
      return [];
    }
    return [
      {
        id: uid('rule'),
        menuId,
        startTime: r.start_time,
        endTime: r.end_time,
        days: r.days.map((d) => d.toLowerCase()) as Weekday[],
      },
    ];
  });
  const defaultMenuId = legacy.default_menu
    ? slugToId.get(slugify(legacy.default_menu))
    : undefined;
  const schedule: Schedule = scheduleSchema.parse({
    ...(defaultMenuId ? { defaultMenuId } : {}),
    rules,
  });
  db.saveSchedule(schedule);
  console.log(
    `[migrate] schedule: ${rules.length} rules${defaultMenuId ? ` (default=${defaultMenuId})` : ''}`,
  );
}

function main(): void {
  console.log(`[migrate] reading from: ${LEGACY_ROOT}`);
  console.log(`[migrate] writing to:   ${db.db.name}`);
  const slugToId = migrateMenus();
  migrateSchedule(slugToId);
  console.log('[migrate] done.');
}

main();
