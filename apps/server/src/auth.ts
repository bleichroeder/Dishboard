import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { config } from './config.js';

type Session = { username: string; expiresAt: number };
const sessions = new Map<string, Session>();

export async function verifyPassword(username: string, password: string): Promise<boolean> {
  if (username !== config.adminUsername) return false;
  if (!config.adminPasswordHash) return false;
  return bcrypt.compare(password, config.adminPasswordHash);
}

export function createSession(username: string): string {
  const id = randomBytes(32).toString('hex');
  sessions.set(id, {
    username,
    expiresAt: Date.now() + config.sessionTimeoutSec * 1000,
  });
  return id;
}

export function getSession(id: string | undefined | null): Session | null {
  if (!id) return null;
  const s = sessions.get(id);
  if (!s) return null;
  if (s.expiresAt <= Date.now()) {
    sessions.delete(id);
    return null;
  }
  return s;
}

export function destroySession(id: string | undefined | null): void {
  if (id) sessions.delete(id);
}

setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (s.expiresAt <= now) sessions.delete(id);
  }
}, 60_000).unref();
