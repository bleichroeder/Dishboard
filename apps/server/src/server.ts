import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import { config } from './config.js';
import { authRoutes } from './routes/auth.js';
import { menuRoutes } from './routes/menus.js';
import { scheduleRoutes } from './routes/schedule.js';
import { integrationRoutes } from './routes/integrations.js';
import { startSquareSyncLoop } from './sync.js';

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  await app.register(cookie, { secret: config.cookieSecret });

  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  await app.register(authRoutes);
  await app.register(menuRoutes);
  await app.register(scheduleRoutes);
  await app.register(integrationRoutes);

  startSquareSyncLoop(config.squareSyncIntervalMs, {
    info: (msg) => app.log.info(msg),
    error: (e) => app.log.error(e),
  });

  return app;
}
