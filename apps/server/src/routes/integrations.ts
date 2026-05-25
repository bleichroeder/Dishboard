import type { FastifyInstance } from 'fastify';
import { squareIntegrationSchema, type IntegrationsStatus } from '@dishboard/shared';
import * as db from '../db.js';
import { searchCatalogItems } from '../square.js';
import { runSyncOnce } from '../sync.js';
import { requireAuth } from './auth.js';

function statusOf(): IntegrationsStatus {
  const ints = db.getIntegrations();
  return {
    square: {
      configured: !!ints.square,
      environment: ints.square?.environment ?? null,
    },
  };
}

export async function integrationRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/integrations', async () => statusOf());

  app.put('/api/integrations/square', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = squareIntegrationSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'invalid Square integration', issues: parsed.error.issues });
    }
    const ints = db.getIntegrations();
    ints.square = parsed.data;
    db.saveIntegrations(ints);
    return statusOf();
  });

  app.delete('/api/integrations/square', { preHandler: requireAuth }, async () => {
    const ints = db.getIntegrations();
    ints.square = null;
    db.saveIntegrations(ints);
    return statusOf();
  });

  app.get<{ Querystring: { q?: string } }>(
    '/api/square/search',
    { preHandler: requireAuth },
    async (req, reply) => {
      const q = (req.query.q ?? '').trim();
      if (!q) return { items: [] };
      const ints = db.getIntegrations();
      if (!ints.square) {
        return reply.code(400).send({ error: 'Square integration not configured' });
      }
      try {
        const items = await searchCatalogItems(ints.square, q);
        return { items };
      } catch (e) {
        req.log.error(e);
        return reply.code(502).send({ error: e instanceof Error ? e.message : 'Square error' });
      }
    },
  );

  app.post('/api/square/sync', { preHandler: requireAuth }, async (_req, reply) => {
    const ints = db.getIntegrations();
    if (!ints.square) {
      return reply.code(400).send({ error: 'Square integration not configured' });
    }
    const result = await runSyncOnce(ints.square);
    return result;
  });
}
