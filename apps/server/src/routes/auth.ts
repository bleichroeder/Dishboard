import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config.js';
import { createSession, destroySession, getSession, verifyPassword } from '../auth.js';

export const SESSION_COOKIE = 'dishboard_session';

function readSessionId(req: FastifyRequest): string | null {
  const raw = req.cookies[SESSION_COOKIE];
  if (!raw) return null;
  const unsigned = req.unsignCookie(raw);
  return unsigned.valid ? unsigned.value : null;
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const sess = getSession(readSessionId(req));
  if (!sess) {
    void reply.code(401).send({ error: 'authentication required' });
  }
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { username?: string; password?: string } }>(
    '/api/auth/login',
    async (req, reply) => {
      const { username, password } = req.body ?? {};
      if (!username || !password) {
        return reply.code(400).send({ error: 'username and password required' });
      }
      const ok = await verifyPassword(username, password);
      if (!ok) {
        return reply.code(401).send({ error: 'invalid credentials' });
      }
      const sid = createSession(username);
      void reply.setCookie(SESSION_COOKIE, sid, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: config.cookieSecure,
        maxAge: config.sessionTimeoutSec,
        signed: true,
      });
      return { status: 'ok', username };
    },
  );

  app.post('/api/auth/logout', async (req, reply) => {
    destroySession(readSessionId(req));
    void reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { status: 'ok' };
  });

  app.get('/api/auth/me', async (req) => {
    const sess = getSession(readSessionId(req));
    return { authenticated: !!sess, username: sess?.username ?? null };
  });
}
