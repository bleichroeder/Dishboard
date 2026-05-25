import { useEffect, useState } from 'react';
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

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let currentSlug: string | null = null;

    async function tick() {
      try {
        const info = await api.currentMenu();
        if (!alive) return;
        if (!info.menuSlug) throw new Error(`current menu has no slug (id=${info.menuId})`);
        if (info.menuSlug !== currentSlug) {
          const menu = await api.getMenu(info.menuSlug);
          if (!alive) return;
          currentSlug = info.menuSlug;
          setState({ menu, info, error: null });
        } else {
          setState((s) => ({ ...s, info, error: null }));
        }
        timer = setTimeout(tick, delayUntilNextChange(info.nextChange));
      } catch (e) {
        if (!alive) return;
        setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) }));
        timer = setTimeout(tick, RETRY_MS);
      }
    }

    void tick();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return state;
}

export type PinnedMenuState = { menu: Menu | null; error: string | null };

export function usePinnedMenu(slug: string): PinnedMenuState {
  const [state, setState] = useState<PinnedMenuState>({ menu: null, error: null });

  useEffect(() => {
    let alive = true;
    setState({ menu: null, error: null });
    api
      .getMenu(slug)
      .then((menu) => {
        if (alive) setState({ menu, error: null });
      })
      .catch((e: unknown) => {
        if (alive) setState({ menu: null, error: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  return state;
}
