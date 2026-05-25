import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import type { Menu, Schedule } from '@dishboard/shared';

mkdirSync(path.dirname(config.dbPath), { recursive: true });

export const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS menus (
    id         TEXT PRIMARY KEY,
    slug       TEXT NOT NULL UNIQUE,
    title      TEXT NOT NULL,
    data       TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

const stmts = {
  listMenus: db.prepare(
    'SELECT id, slug, title, updated_at AS updatedAt FROM menus ORDER BY title',
  ),
  getMenuBySlug: db.prepare('SELECT data FROM menus WHERE slug = ?'),
  upsertMenu: db.prepare(`
    INSERT INTO menus (id, slug, title, data, created_at, updated_at)
    VALUES (@id, @slug, @title, @data, unixepoch(), unixepoch())
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      title = excluded.title,
      data = excluded.data,
      updated_at = unixepoch()
  `),
  deleteMenu: db.prepare('DELETE FROM menus WHERE slug = ?'),
  getSetting: db.prepare('SELECT value FROM settings WHERE key = ?'),
  upsertSetting: db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (@key, @value, unixepoch())
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = unixepoch()
  `),
};

export type MenuListItem = {
  id: string;
  slug: string;
  title: string;
  updatedAt: number;
};

export function listMenus(): MenuListItem[] {
  return stmts.listMenus.all() as MenuListItem[];
}

export function getMenu(slug: string): Menu | null {
  const row = stmts.getMenuBySlug.get(slug) as { data: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.data) as Menu;
}

export function saveMenu(menu: Menu): void {
  stmts.upsertMenu.run({
    id: menu.id,
    slug: menu.slug,
    title: menu.title,
    data: JSON.stringify(menu),
  });
}

export function deleteMenu(slug: string): boolean {
  const info = stmts.deleteMenu.run(slug);
  return info.changes > 0;
}

const SCHEDULE_KEY = 'schedule';

export function getSchedule(): Schedule | null {
  const row = stmts.getSetting.get(SCHEDULE_KEY) as { value: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.value) as Schedule;
}

export function saveSchedule(schedule: Schedule): void {
  stmts.upsertSetting.run({
    key: SCHEDULE_KEY,
    value: JSON.stringify(schedule),
  });
}
