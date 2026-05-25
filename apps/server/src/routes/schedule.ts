import type { FastifyInstance } from 'fastify';
import { scheduleSchema, type Weekday } from '@dishboard/shared';
import * as db from '../db.js';
import { requireAuth } from './auth.js';

const WEEKDAY_BY_INDEX: readonly Weekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

function todayWeekday(now: Date): Weekday {
  return WEEKDAY_BY_INDEX[now.getDay()]!;
}

function hhmm(now: Date): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export async function scheduleRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/schedule', async () => db.getSchedule() ?? { rules: [] });

  app.put('/api/schedule', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid schedule', issues: parsed.error.issues });
    }
    db.saveSchedule(parsed.data);
    return parsed.data;
  });

  app.get('/api/schedule/current', async (_req, reply) => {
    const schedule = db.getSchedule();
    if (!schedule) return reply.code(404).send({ error: 'no schedule configured' });
    const now = new Date();
    const day = todayWeekday(now);
    const time = hhmm(now);
    const active = schedule.rules.find(
      (r) => r.days.includes(day) && r.startTime <= time && time < r.endTime,
    );
    const menuId = active?.menuId ?? schedule.defaultMenuId;
    if (!menuId) return reply.code(404).send({ error: 'no active or default menu' });
    return { menuId, day, time, ruleId: active?.id ?? null };
  });
}
