import { useEffect, useRef, useState } from 'react';
import type { Menu } from '@dishboard/shared';
import { api, type CurrentMenuInfo } from './api.js';

const RETRY_MS = 30_000;
const MIN_POLL_MS = 5_000;
const MAX_POLL_MS = 5 * 60_000;

function delayUntilNextChange(nextChange: string | null): number {
  if (!nextChange) return 60_000;
  const ms = new Date(nextChange).getTime() - Date.now();
  return Math.max(MIN_POLL_MS, Math.min(ms + 500, MAX_POLL_MS));
}

export type ScheduledMenuState = {
  menu: Menu | null;
  info: CurrentMenuInfo | null;
  error: string | null;
};

export function useScheduledMenu(): ScheduledMenuState {
  const [state, setState] = useState<ScheduledMenuState>({
    menu: null,
    info: null,
    error: null,
  });
  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick(): Promise<void> {
      try {
        const info = await api.currentMenu();
        if (!alive) return;
        if (!info.menuSlug) throw new Error(`current menu has no slug (id=${info.menuId})`);
        const menu = await api.getMenu(info.menuSlug);
        if (!alive) return;
        setState({ menu, info, error: null });
        timer = setTimeout(() => void tick(), delayUntilNextChange(info.nextChange));
      } catch (e) {
        if (!alive) return;
        setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) }));
        timer = setTimeout(() => void tick(), RETRY_MS);
      }
    }

    refreshRef.current = () => {
      if (timer) clearTimeout(timer);
      void tick();
    };

    void tick();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  useLiveRefresh(() => refreshRef.current());

  return state;
}

export type PinnedMenuState = { menu: Menu | null; error: string | null };

export function usePinnedMenu(slug: string): PinnedMenuState {
  const [state, setState] = useState<PinnedMenuState>({ menu: null, error: null });
  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    let alive = true;
    setState({ menu: null, error: null });

    function load(): void {
      api
        .getMenu(slug)
        .then((menu) => {
          if (alive) setState({ menu, error: null });
        })
        .catch((e: unknown) => {
          if (alive) setState({ menu: null, error: e instanceof Error ? e.message : String(e) });
        });
    }

    refreshRef.current = load;
    load();
    return () => {
      alive = false;
    };
  }, [slug]);

  useLiveRefresh(() => refreshRef.current());

  return state;
}

/**
 * Subscribe to the server's SSE event stream and call `onRefresh` whenever
 * the connection (re)opens, a menu/schedule changes, or the tab becomes
 * visible again. The callback is held by ref so the stream isn't torn down
 * on every render.
 */
function useLiveRefresh(onRefresh: () => void): void {
  const cbRef = useRef(onRefresh);
  cbRef.current = onRefresh;

  useEffect(() => {
    const trigger = () => cbRef.current();
    const es = new EventSource('/api/events');

    // EventSource fires 'open' on first connect AND every reconnect — so we
    // automatically resync after server restarts or network blips.
    es.addEventListener('open', trigger);
    es.addEventListener('menu-updated', trigger);
    es.addEventListener('menu-deleted', trigger);
    es.addEventListener('schedule-updated', trigger);
    // The 'hello' event from the server is informational — 'open' already fires
    // when the connection is up, so we don't bind 'hello' to avoid double-refresh.

    const onVisibility = () => {
      if (document.visibilityState === 'visible') trigger();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      es.close();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
}
