import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';

const here = path.dirname(fileURLToPath(import.meta.url));
// here resolves to apps/server/src in dev or apps/server/dist in prod.
// Go up twice to reach the apps/ directory in either case.
const appsRoot = path.resolve(here, '../..');
const viewerDist = path.resolve(appsRoot, 'viewer/dist');
const editorDist = path.resolve(appsRoot, 'editor/dist');

type AppLog = FastifyInstance['log'];

function hasIndex(dir: string): boolean {
  return existsSync(dir) && existsSync(path.join(dir, 'index.html'));
}

function isApiPath(url: string): boolean {
  // Strip query string before comparing.
  const path = url.split('?', 1)[0]!;
  return path.startsWith('/api/') || path === '/api' || path === '/health';
}

export async function registerStatic(app: FastifyInstance): Promise<void> {
  const viewerOk = hasIndex(viewerDist);
  const editorOk = hasIndex(editorDist);

  if (!viewerOk && !editorOk) {
    app.log.info('[static] no built frontends found, serving API only');
    return;
  }

  if (editorOk) {
    await app.register(fastifyStatic, {
      root: editorDist,
      prefix: '/editor/',
      decorateReply: false,
    });
    app.log.info(`[static] editor served from ${editorDist}`);
  } else {
    app.log.info('[static] editor dist not built, skipping');
  }

  if (viewerOk) {
    // Register the viewer last with the default decorateReply so reply.sendFile
    // resolves against the viewer dist by default. The editor 404 fallback uses
    // an explicit root, so the default doesn't matter to it.
    await app.register(fastifyStatic, {
      root: viewerDist,
      prefix: '/',
    });
    app.log.info(`[static] viewer served from ${viewerDist}`);
  } else {
    app.log.info('[static] viewer dist not built, skipping');
  }

  app.setNotFoundHandler((req, reply) => {
    if (isApiPath(req.url)) {
      void reply.code(404).send({ error: 'not found' });
      return;
    }
    const wantsEditor = req.url === '/editor' || req.url.startsWith('/editor/');
    if (wantsEditor && editorOk) {
      void reply.sendFile('index.html', editorDist);
      return;
    }
    if (viewerOk) {
      void reply.sendFile('index.html', viewerDist);
      return;
    }
    void reply.code(404).send({ error: 'not found' });
  });

  logStaticStatus(app.log, viewerOk, editorOk);
}

function logStaticStatus(log: AppLog, viewer: boolean, editor: boolean): void {
  log.info(
    `[static] viewer=${viewer ? 'yes' : 'no'} editor=${editor ? 'yes' : 'no'} (SPA fallback enabled for ${viewer || editor ? 'present' : 'none'})`,
  );
}
