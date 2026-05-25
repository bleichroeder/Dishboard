import type { Menu, Schedule } from '@dishboard/shared';

export type MenuListItem = {
  id: string;
  slug: string;
  title: string;
  updatedAt: number;
};

export type AuthState = {
  authenticated: boolean;
  username: string | null;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public payload?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  const text = await r.text();
  const payload: unknown = text ? safeParse(text) : null;
  if (!r.ok) {
    const msg =
      payload &&
      typeof payload === 'object' &&
      'error' in payload &&
      typeof payload.error === 'string'
        ? payload.error
        : `${method} ${path} → HTTP ${r.status}`;
    throw new ApiError(r.status, msg, payload);
  }
  return payload as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  auth: {
    me: () => request<AuthState>('GET', '/api/auth/me'),
    login: (username: string, password: string) =>
      request<{ status: string; username: string }>('POST', '/api/auth/login', {
        username,
        password,
      }),
    logout: () => request<{ status: string }>('POST', '/api/auth/logout'),
  },
  menus: {
    list: () => request<{ menus: MenuListItem[] }>('GET', '/api/menus').then((d) => d.menus),
    get: (slug: string) => request<Menu>('GET', `/api/menus/${slug}`),
    create: (menu: Menu) => request<Menu>('POST', '/api/menus', menu),
    update: (slug: string, menu: Menu) => request<Menu>('PUT', `/api/menus/${slug}`, menu),
    remove: (slug: string) => request<{ status: string }>('DELETE', `/api/menus/${slug}`),
  },
  schedule: {
    get: () => request<Schedule>('GET', '/api/schedule'),
    update: (schedule: Schedule) => request<Schedule>('PUT', '/api/schedule', schedule),
  },
};
