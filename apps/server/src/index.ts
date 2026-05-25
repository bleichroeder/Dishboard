import Fastify from 'fastify';
import { menuSchema } from '@dishboard/shared';

const app = Fastify({ logger: true });

app.get('/health', async () => ({
  status: 'ok',
  sharedSchemaLoaded: typeof menuSchema.parse === 'function',
  timestamp: new Date().toISOString(),
}));

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

app.listen({ port, host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
