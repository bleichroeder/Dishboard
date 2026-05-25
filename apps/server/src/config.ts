import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
// here resolves to apps/server/src in dev (tsx) or apps/server/dist in prod build.
// In both cases, the repo root is three directories up.
const repoRoot = path.resolve(here, '../../..');

const dataDir = process.env.DATA_DIR ?? path.join(repoRoot, 'data');

export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  dataDir,
  dbPath: process.env.DB_PATH ?? path.join(dataDir, 'dishboard.db'),
  adminUsername: process.env.ADMIN_USERNAME ?? 'admin',
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH ?? '',
  cookieSecret: process.env.COOKIE_SECRET ?? randomBytes(32).toString('hex'),
  sessionTimeoutSec: Number(process.env.SESSION_TIMEOUT_SEC ?? 8 * 60 * 60),
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  squareSyncIntervalMs: Number(process.env.SQUARE_SYNC_INTERVAL_MS ?? 5 * 60_000),
} as const;

if (!config.adminPasswordHash) {
  // eslint-disable-next-line no-console
  console.warn('[config] ADMIN_PASSWORD_HASH not set — admin endpoints will reject all logins.');
}

if (!process.env.COOKIE_SECRET) {
  // eslint-disable-next-line no-console
  console.warn('[config] COOKIE_SECRET not set — sessions will be invalidated on server restart.');
}
