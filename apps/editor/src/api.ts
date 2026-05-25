import type {
  AssetRecord,
  IntegrationsStatus,
  Menu,
  Schedule,
  SquareCatalogItem,
  SquareIntegration,
} from '@dishboard/shared';

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
    /** Universal import — accepts current Menu or legacy menu.json shape. */
    importJson: (json: unknown) => request<Menu>('POST', '/api/menus/import', json),
  },
  schedule: {
    get: () => request<Schedule>('GET', '/api/schedule'),
    update: (schedule: Schedule) => request<Schedule>('PUT', '/api/schedule', schedule),
  },
  integrations: {
    get: () => request<IntegrationsStatus>('GET', '/api/integrations'),
    saveSquare: (integration: SquareIntegration) =>
      request<IntegrationsStatus>('PUT', '/api/integrations/square', integration),
    removeSquare: () => request<IntegrationsStatus>('DELETE', '/api/integrations/square'),
  },
  assets: {
    list: () => request<{ assets: AssetRecord[] }>('GET', '/api/assets').then((d) => d.assets),
    upload: async (file: File): Promise<AssetRecord> => {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/assets', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin',
      });
      const text = await r.text();
      const payload: unknown = text ? JSON.parse(text) : null;
      if (!r.ok) {
        const msg =
          payload &&
          typeof payload === 'object' &&
          'error' in payload &&
          typeof payload.error === 'string'
            ? payload.error
            : `upload failed: HTTP ${r.status}`;
        throw new ApiError(r.status, msg, payload);
      }
      return payload as AssetRecord;
    },
    remove: (id: string) =>
      request<{ status: string }>('DELETE', `/api/assets/${encodeURIComponent(id)}`),
  },
  square: {
    search: (q: string) =>
      request<{ items: SquareCatalogItem[] }>(
        'GET',
        `/api/square/search?q=${encodeURIComponent(q)}`,
      ).then((d) => d.items),
    syncNow: () =>
      request<{
        startedAt: string;
        finishedAt: string;
        scannedRefs: number;
        uniqueLookups: number;
        menusUpdated: number;
        errors: string[];
      }>('POST', '/api/square/sync'),
  },
};
