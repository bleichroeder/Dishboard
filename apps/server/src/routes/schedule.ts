import type { FastifyInstance } from 'fastify';
import { scheduleSchema, type Schedule, type Weekday } from '@dishboard/shared';
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

function weekdayFor(now: Date): Weekday {
  return WEEKDAY_BY_INDEX[now.getDay()]!;
}

function hhmm(now: Date): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function timeAt(now: Date, dayOffset: number, hhmmStr: string): Date {
  const [h, m] = hhmmStr.split(':').map(Number) as [number, number];
  const d = new Date(now);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
}

function nextChangeAfter(now: Date, schedule: Schedule): Date | null {
  const candidates: Date[] = [];
  for (const offset of [0, 1, 2, 3, 4, 5, 6, 7]) {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    const day = weekdayFor(d);
    for (const rule of schedule.rules) {
      if (!rule.days.includes(day)) continue;
      candidates.push(timeAt(now, offset, rule.startTime));
      candidates.push(timeAt(now, offset, rule.endTime));
    }
  }
  const future = candidates.filter((d) => d > now).sort((a, b) => a.getTime() - b.getTime());
  return future[0] ?? null;
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
    const day = weekdayFor(now);
    const time = hhmm(now);
    const active = schedule.rules.find(
      (r) => r.days.includes(day) && r.startTime <= time && time < r.endTime,
    );
    const menuId = active?.menuId ?? schedule.defaultMenuId;
    if (!menuId) return reply.code(404).send({ error: 'no active or default menu' });
    const nextChange = nextChangeAfter(now, schedule);
    const menuSlug = db.getMenuSlugById(menuId);
    return {
      menuId,
      menuSlug,
      day,
      time,
      ruleId: active?.id ?? null,
      nextChange: nextChange?.toISOString() ?? null,
    };
  });
}
