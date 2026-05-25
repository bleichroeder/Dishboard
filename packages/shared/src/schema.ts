import { z } from 'zod';

export const squareRefSchema = z.object({
  itemId: z.string().min(1),
  trackPrice: z.boolean().default(false),
  trackAvailability: z.boolean().default(false),
});
export type SquareRef = z.infer<typeof squareRefSchema>;

export const addonSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.string().optional(),
  squareRef: squareRefSchema.optional(),
});
export type Addon = z.infer<typeof addonSchema>;

export const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  ingredients: z.array(z.string()).default([]),
  price: z.string().optional(),
  addons: z.array(addonSchema).default([]),
  hidden: z.boolean().default(false),
  soldOut: z.boolean().default(false),
  squareRef: squareRefSchema.optional(),
});
export type Item = z.infer<typeof itemSchema>;

export const sectionStyleSchema = z.enum(['cards', 'list', 'compact']);
export type SectionStyle = z.infer<typeof sectionStyleSchema>;

export const sectionVariantSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  style: sectionStyleSchema.default('cards'),
  items: z.array(itemSchema).default([]),
});
export type SectionVariant = z.infer<typeof sectionVariantSchema>;

export const rotationSchema = z.object({
  intervalSec: z.number().int().positive(),
  cycle: z.enum(['sequential', 'random']).default('sequential'),
});
export type Rotation = z.infer<typeof rotationSchema>;

export const breakpointLayoutSchema = z.object({
  gridTemplateColumns: z.string(),
  gridTemplateRows: z.string(),
  gridTemplateAreas: z.string(),
});
export type BreakpointLayout = z.infer<typeof breakpointLayoutSchema>;

export const regionSchema = z.object({
  id: z.string(),
  label: z.string(),
});
export type Region = z.infer<typeof regionSchema>;

export const breakpointSchema = z.enum(['kiosk', 'tablet', 'phone']);
export type Breakpoint = z.infer<typeof breakpointSchema>;

export const templateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  regions: z.array(regionSchema).min(1),
  breakpoints: z.object({
    kiosk: breakpointLayoutSchema,
    tablet: breakpointLayoutSchema,
    phone: breakpointLayoutSchema,
  }),
});
export type Template = z.infer<typeof templateSchema>;

export const slotSchema = z.object({
  id: z.string(),
  regionId: z.string(),
  order: z.number().int().nonnegative().default(0),
  rotation: rotationSchema.optional(),
  variants: z.array(sectionVariantSchema).min(1),
});
export type Slot = z.infer<typeof slotSchema>;

// Six fonts curated to cover common restaurant menu looks. Keep the list
// closed so the viewer can pre-link them in <head> — dynamic font loading
// is a Phase-N+ concern.
export const FONT_OPTIONS = [
  'Montserrat',
  'Lilita One',
  'Permanent Marker',
  'Playfair Display',
  'Bebas Neue',
  'Caveat',
  'Oswald',
  'Georgia',
] as const;
export type FontOption = (typeof FONT_OPTIONS)[number];
export const fontOptionSchema = z.enum(FONT_OPTIONS);

export const backgroundSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('none') }),
  z.object({ type: z.literal('color'), color: z.string() }),
  z.object({
    type: z.literal('image'),
    assetId: z.string(),
    fit: z.enum(['cover', 'contain', 'repeat']).default('cover'),
    overlayOpacity: z.number().min(0).max(1).default(0),
  }),
]);
export type Background = z.infer<typeof backgroundSchema>;

export const themeSchema = z.object({
  background: backgroundSchema.optional(),
  fonts: z
    .object({
      display: fontOptionSchema.optional(),
      body: fontOptionSchema.optional(),
      price: fontOptionSchema.optional(),
    })
    .optional(),
  colors: z
    .object({
      pageText: z.string().optional(),
      sectionTitle: z.string().optional(),
      accent: z.string().optional(),
      price: z.string().optional(),
      sectionBg: z.string().optional(),
    })
    .optional(),
  sizes: z
    .object({
      titleScale: z.number().min(0.5).max(3).optional(),
      sectionTitleScale: z.number().min(0.5).max(3).optional(),
      itemScale: z.number().min(0.5).max(3).optional(),
      priceScale: z.number().min(0.5).max(3).optional(),
    })
    .optional(),
});
export type Theme = z.infer<typeof themeSchema>;

export const chefPopSchema = z.object({
  enabled: z.boolean().default(false),
  assetIds: z.array(z.string()).default([]),
  intervalSec: z.number().int().min(5).max(3600).default(25),
});
export type ChefPopConfig = z.infer<typeof chefPopSchema>;

export const foodDropSchema = z.object({
  enabled: z.boolean().default(false),
  assetIds: z.array(z.string()).default([]),
  intervalSec: z.number().int().min(5).max(3600).default(60),
});
export type FoodDropConfig = z.infer<typeof foodDropSchema>;

export const decorationsSchema = z.object({
  chefPop: chefPopSchema.optional(),
  foodDrop: foodDropSchema.optional(),
});
export type Decorations = z.infer<typeof decorationsSchema>;

export const menuSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be lowercase letters, numbers, and dashes'),
  templateId: z.string(),
  theme: themeSchema.optional(),
  decorations: decorationsSchema.optional(),
  slots: z.array(slotSchema).default([]),
});
export type Menu = z.infer<typeof menuSchema>;

export type AssetRecord = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  ext: string;
  createdAt: number;
};

export const weekdaySchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);
export type Weekday = z.infer<typeof weekdaySchema>;

export const scheduleRuleSchema = z.object({
  id: z.string(),
  menuId: z.string(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  days: z.array(weekdaySchema).min(1),
});
export type ScheduleRule = z.infer<typeof scheduleRuleSchema>;

export const scheduleSchema = z.object({
  defaultMenuId: z.string().optional(),
  rules: z.array(scheduleRuleSchema).default([]),
});
export type Schedule = z.infer<typeof scheduleSchema>;

export const squareIntegrationSchema = z.object({
  accessToken: z.string().min(1),
  environment: z.enum(['production', 'sandbox']).default('production'),
});
export type SquareIntegration = z.infer<typeof squareIntegrationSchema>;

export const integrationsSchema = z.object({
  square: squareIntegrationSchema.nullable().default(null),
});
export type Integrations = z.infer<typeof integrationsSchema>;

export type IntegrationsStatus = {
  square: { configured: boolean; environment: 'production' | 'sandbox' | null };
};

export type SquareCatalogItem = {
  itemId: string;
  name: string;
  variations: Array<{
    variationId: string;
    name: string;
    price: string | null;
    soldOut: boolean;
  }>;
};
