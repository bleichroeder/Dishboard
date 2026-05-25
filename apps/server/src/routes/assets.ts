import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { AssetRecord } from '@dishboard/shared';
import { config } from '../config.js';
import * as db from '../db.js';
import { requireAuth } from './auth.js';

const ASSETS_DIR = path.join(config.dataDir, 'assets');

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function extFromContentType(ct: string): string | null {
  const base = ct.split(';', 1)[0]!.trim().toLowerCase();
  return EXT_BY_MIME[base] ?? null;
}

function uid(): string {
  return `asset_${randomBytes(8).toString('hex')}`;
}

export function assetPath(id: string, ext: string): string {
  return path.join(ASSETS_DIR, `${id}.${ext}`);
}

async function ensureAssetsDir(): Promise<void> {
  if (!existsSync(ASSETS_DIR)) await mkdir(ASSETS_DIR, { recursive: true });
}

export async function assetRoutes(app: FastifyInstance): Promise<void> {
  await ensureAssetsDir();

  app.get('/api/assets', { preHandler: requireAuth }, async () => ({
    assets: db.listAssets(),
  }));

  app.post('/api/assets', { preHandler: requireAuth }, async (req, reply) => {
    const file = await req.file({ limits: { fileSize: MAX_SIZE_BYTES } });
    if (!file) return reply.code(400).send({ error: 'no file in upload' });

    const ext = extFromContentType(file.mimetype);
    if (!ext) {
      return reply.code(400).send({ error: `unsupported content-type: ${file.mimetype}` });
    }

    const id = uid();
    const target = assetPath(id, ext);
    let bytesWritten = 0;

    try {
      await ensureAssetsDir();
      await pipeline(file.file, createWriteStream(target));
      // file.file is a stream; we need to check whether multipart truncated
      if (file.file.truncated) {
        await unlink(target).catch(() => {});
        return reply.code(413).send({ error: 'file exceeds 10 MB limit' });
      }
      // Total bytes streamed
      bytesWritten = file.file.bytesRead;
    } catch (e) {
      req.log.error(e);
      await unlink(target).catch(() => {});
      return reply.code(500).send({ error: 'failed to save upload' });
    }

    const record: AssetRecord = {
      id,
      filename: file.filename ?? `${id}.${ext}`,
      contentType: file.mimetype,
      sizeBytes: bytesWritten,
      ext,
      createdAt: Math.floor(Date.now() / 1000),
    };
    db.insertAsset(record);
    return reply.code(201).send(record);
  });

  // Public — viewer needs to load these without a session. Served under
  // /media/ to avoid colliding with the vite-built asset bundle (which uses
  // /assets/ by convention).
  app.get<{ Params: { id: string } }>('/media/:id', async (req, reply) => {
    const id = req.params.id;
    const asset = db.getAsset(id);
    if (!asset) return reply.code(404).send({ error: 'asset not found' });
    const file = assetPath(asset.id, asset.ext);
    if (!existsSync(file)) {
      return reply.code(404).send({ error: 'asset file missing on disk' });
    }
    return reply
      .type(asset.contentType)
      .header('Cache-Control', 'public, max-age=31536000, immutable')
      .sendFile(`${asset.id}.${asset.ext}`, ASSETS_DIR);
  });

  app.delete<{ Params: { id: string } }>(
    '/api/assets/:id',
    { preHandler: requireAuth },
    async (req, reply) => {
      const id = req.params.id;
      const asset = db.getAsset(id);
      if (!asset) return reply.code(404).send({ error: 'asset not found' });
      await unlink(assetPath(asset.id, asset.ext)).catch(() => {});
      db.deleteAsset(id);
      return { status: 'ok' };
    },
  );
}
