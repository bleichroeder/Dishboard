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

export const gridPositionSchema = z.object({
  column: z.number().int().positive(),
  row: z.number().int().positive(),
  columnSpan: z.number().int().positive().default(1),
  rowSpan: z.number().int().positive().default(1),
});
export type GridPosition = z.infer<typeof gridPositionSchema>;

export const slotSchema = z.object({
  id: z.string(),
  position: gridPositionSchema,
  rotation: rotationSchema.optional(),
  variants: z.array(sectionVariantSchema).min(1),
});
export type Slot = z.infer<typeof slotSchema>;

export const gridLayoutSchema = z.object({
  columns: z.number().int().positive(),
  rows: z.number().int().positive(),
});
export type GridLayout = z.infer<typeof gridLayoutSchema>;

export const menuSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be lowercase letters, numbers, and dashes'),
  layout: gridLayoutSchema,
  slots: z.array(slotSchema).default([]),
});
export type Menu = z.infer<typeof menuSchema>;

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
