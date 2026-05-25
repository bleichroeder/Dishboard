import type { Menu } from '@dishboard/shared';

export type MenuListItem = {
  id: string;
  slug: string;
  title: string;
  updatedAt: number;
};

export type CurrentMenuInfo = {
  menuId: string;
  menuSlug: string | null;
  day: string;
  time: string;
  ruleId: string | null;
  nextChange: string | null;
};

async function getJSON<T>(path: string): Promise<T> {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

export const api = {
  listMenus: () => getJSON<{ menus: MenuListItem[] }>('/api/menus').then((d) => d.menus),
  getMenu: (slug: string) => getJSON<Menu>(`/api/menus/${slug}`),
  currentMenu: () => getJSON<CurrentMenuInfo>('/api/schedule/current'),
};
