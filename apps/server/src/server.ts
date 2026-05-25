import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { config } from './config.js';
import { authRoutes } from './routes/auth.js';
import { menuRoutes } from './routes/menus.js';
import { scheduleRoutes } from './routes/schedule.js';
import { integrationRoutes } from './routes/integrations.js';
import { assetRoutes } from './routes/assets.js';
import { eventsRoute } from './events.js';
import { registerStatic } from './static.js';
import { startSquareSyncLoop } from './sync.js';

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  await app.register(cookie, { secret: config.cookieSecret });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  await app.register(authRoutes);
  await app.register(menuRoutes);
  await app.register(scheduleRoutes);
  await app.register(integrationRoutes);
  await app.register(assetRoutes);
  await app.register(eventsRoute);

  // Register static serving AFTER the API routes so they take precedence.
  await registerStatic(app);

  startSquareSyncLoop(config.squareSyncIntervalMs, {
    info: (msg) => app.log.info(msg),
    error: (e) => app.log.error(e),
  });

  return app;
}
