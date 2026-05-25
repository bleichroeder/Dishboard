import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { menuSchema, TEMPLATES, getTemplate, type Menu } from '@dishboard/shared';
import * as db from '../db.js';
import { broadcastEvent } from '../events.js';
import { convertLegacyMenu, slugify, type LegacyMenu } from '../legacy.js';
import { requireAuth } from './auth.js';

function uniqueSlug(base: string): string {
  if (!base) base = 'menu';
  if (!db.getMenu(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}-${i}`;
    if (!db.getMenu(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

function randomHex(bytes: number): string {
  return randomBytes(bytes).toString('hex');
}

function regenerateMenuIds(menu: Menu): Menu {
  return {
    ...menu,
    id: `menu_${randomHex(8)}`,
    slots: menu.slots.map((s) => ({
      ...s,
      id: `slot_${randomHex(8)}`,
      variants: s.variants.map((v) => ({
        ...v,
        id: `variant_${randomHex(8)}`,
        items: v.items.map((i) => ({
          ...i,
          id: `item_${randomHex(8)}`,
          addons: i.addons.map((a) => ({ ...a, id: `addon_${randomHex(8)}` })),
        })),
      })),
    })),
  };
}

function validateTemplateAndRegions(menu: Menu): string | null {
  const template = getTemplate(menu.templateId);
  if (!template) return `unknown templateId: ${menu.templateId}`;
  const regionIds = new Set(template.regions.map((r) => r.id));
  for (const slot of menu.slots) {
    if (!regionIds.has(slot.regionId)) {
      return `slot ${slot.id} references unknown region '${slot.regionId}' in template '${menu.templateId}'`;
    }
  }
  return null;
}

export async function menuRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/templates', async () => ({ templates: TEMPLATES }));

  app.get('/api/menus', async () => ({ menus: db.listMenus() }));

  app.get<{ Params: { slug: string } }>('/api/menus/:slug', async (req, reply) => {
    const menu = db.getMenu(req.params.slug);
    if (!menu) return reply.code(404).send({ error: 'menu not found' });
    return menu;
  });

  app.post('/api/menus', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = menuSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid menu', issues: parsed.error.issues });
    }
    const xref = validateTemplateAndRegions(parsed.data);
    if (xref) return reply.code(400).send({ error: xref });
    if (db.getMenu(parsed.data.slug)) {
      return reply.code(409).send({ error: 'slug already exists' });
    }
    db.saveMenu(parsed.data);
    broadcastEvent('menu-updated', { slug: parsed.data.slug });
    return reply.code(201).send(parsed.data);
  });

  app.put<{ Params: { slug: string } }>(
    '/api/menus/:slug',
    { preHandler: requireAuth },
    async (req, reply) => {
      const parsed = menuSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid menu', issues: parsed.error.issues });
      }
      if (parsed.data.slug !== req.params.slug) {
        return reply.code(400).send({ error: 'slug in body does not match URL' });
      }
      const xref = validateTemplateAndRegions(parsed.data);
      if (xref) return reply.code(400).send({ error: xref });
      db.saveMenu(parsed.data);
      broadcastEvent('menu-updated', { slug: parsed.data.slug });
      return parsed.data;
    },
  );

  app.delete<{ Params: { slug: string } }>(
    '/api/menus/:slug',
    { preHandler: requireAuth },
    async (req, reply) => {
      const ok = db.deleteMenu(req.params.slug);
      if (!ok) return reply.code(404).send({ error: 'menu not found' });
      broadcastEvent('menu-deleted', { slug: req.params.slug });
      return { status: 'ok' };
    },
  );

  // Universal menu import. Accepts either:
  //   - a legacy Dishboard menu.json (menuTitle + sections[])
  //   - a current Menu shape (templateId + slots[])
  // Auto-detects the format, regenerates IDs to avoid collisions, and
  // resolves slug conflicts with a numeric suffix.
  app.post('/api/menus/import', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as Record<string, unknown> | null | undefined;
    if (!body || typeof body !== 'object') {
      return reply.code(400).send({ error: 'expected a JSON object' });
    }

    let menu: Menu;
    try {
      if (Array.isArray(body.slots) && typeof body.templateId === 'string') {
        // Current format — validate, regenerate IDs, dedupe slug.
        const parsed = menuSchema.safeParse(body);
        if (!parsed.success) {
          return reply.code(400).send({ error: 'invalid menu', issues: parsed.error.issues });
        }
        const baseSlug = parsed.data.slug || slugify(parsed.data.title) || 'imported-menu';
        menu = regenerateMenuIds({ ...parsed.data, slug: uniqueSlug(baseSlug) });
      } else if (Array.isArray(body.sections)) {
        // Legacy format — convert.
        const legacy = body as unknown as LegacyMenu;
        const baseSlug = slugify(legacy.menuTitle ?? 'imported-menu') || 'imported-menu';
        menu = convertLegacyMenu(legacy, { slug: uniqueSlug(baseSlug) });
      } else {
        return reply.code(400).send({
          error:
            'unrecognized JSON: expected current Menu (templateId + slots) or legacy menu.json (menuTitle + sections)',
        });
      }
    } catch (e) {
      return reply.code(400).send({ error: e instanceof Error ? e.message : 'import failed' });
    }

    db.saveMenu(menu);
    broadcastEvent('menu-updated', { slug: menu.slug });
    return reply.code(201).send(menu);
  });
}
