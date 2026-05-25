import type { FastifyInstance } from 'fastify';
import { menuSchema, TEMPLATES, getTemplate, type Menu } from '@dishboard/shared';
import * as db from '../db.js';
import { requireAuth } from './auth.js';

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
      return parsed.data;
    },
  );

  app.delete<{ Params: { slug: string } }>(
    '/api/menus/:slug',
    { preHandler: requireAuth },
    async (req, reply) => {
      const ok = db.deleteMenu(req.params.slug);
      if (!ok) return reply.code(404).send({ error: 'menu not found' });
      return { status: 'ok' };
    },
  );
}
