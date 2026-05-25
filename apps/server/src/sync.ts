import type { Menu, SquareIntegration } from '@dishboard/shared';
import { menuSchema } from '@dishboard/shared';
import * as db from './db.js';
import { lookupObject, type SquareLookupResult } from './square.js';

export type SyncReport = {
  startedAt: string;
  finishedAt: string;
  scannedRefs: number;
  uniqueLookups: number;
  menusUpdated: number;
  errors: string[];
};

function collectUniqueRefs(menus: Menu[]): { uniqueIds: Set<string>; totalRefs: number } {
  const uniqueIds = new Set<string>();
  let totalRefs = 0;
  for (const menu of menus) {
    for (const slot of menu.slots) {
      for (const variant of slot.variants) {
        for (const item of variant.items) {
          if (item.squareRef) {
            totalRefs += 1;
            uniqueIds.add(item.squareRef.itemId);
          }
          for (const addon of item.addons) {
            if (addon.squareRef) {
              totalRefs += 1;
              uniqueIds.add(addon.squareRef.itemId);
            }
          }
        }
      }
    }
  }
  return { uniqueIds, totalRefs };
}

function applyLookupsToMenu(menu: Menu, lookups: Map<string, SquareLookupResult | null>): boolean {
  let changed = false;
  for (const slot of menu.slots) {
    for (const variant of slot.variants) {
      for (const item of variant.items) {
        if (item.squareRef) {
          const result = lookups.get(item.squareRef.itemId);
          if (result) {
            if (item.squareRef.trackPrice && result.price && item.price !== result.price) {
              item.price = result.price;
              changed = true;
            }
            if (item.squareRef.trackAvailability && item.soldOut !== result.soldOut) {
              item.soldOut = result.soldOut;
              changed = true;
            }
          }
        }
        for (const addon of item.addons) {
          if (addon.squareRef) {
            const result = lookups.get(addon.squareRef.itemId);
            if (result) {
              if (addon.squareRef.trackPrice && result.price && addon.price !== result.price) {
                addon.price = result.price;
                changed = true;
              }
            }
          }
        }
      }
    }
  }
  return changed;
}

export async function runSyncOnce(integration: SquareIntegration): Promise<SyncReport> {
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  let menusUpdated = 0;

  const records = db.listMenuRecords();
  const menus: Menu[] = [];
  for (const rec of records) {
    try {
      menus.push(menuSchema.parse(JSON.parse(rec.data)));
    } catch (e) {
      errors.push(`menu '${rec.slug}' failed to parse: ${(e as Error).message}`);
    }
  }

  const { uniqueIds, totalRefs } = collectUniqueRefs(menus);

  const lookups = new Map<string, SquareLookupResult | null>();
  for (const objectId of uniqueIds) {
    try {
      lookups.set(objectId, await lookupObject(integration, objectId));
    } catch (e) {
      errors.push(`lookup ${objectId}: ${(e as Error).message}`);
      lookups.set(objectId, null);
    }
  }

  for (const menu of menus) {
    if (applyLookupsToMenu(menu, lookups)) {
      try {
        db.saveMenu(menu);
        menusUpdated += 1;
      } catch (e) {
        errors.push(`save '${menu.slug}': ${(e as Error).message}`);
      }
    }
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    scannedRefs: totalRefs,
    uniqueLookups: uniqueIds.size,
    menusUpdated,
    errors,
  };
}

let syncTimer: ReturnType<typeof setInterval> | null = null;
let running = false;

export function startSquareSyncLoop(
  intervalMs: number,
  log: { info: (msg: string) => void; error: (e: unknown) => void },
): void {
  if (syncTimer) return;
  const tick = async () => {
    if (running) return;
    const ints = db.getIntegrations();
    if (!ints.square) return;
    running = true;
    try {
      const report = await runSyncOnce(ints.square);
      log.info(
        `[square-sync] refs=${report.scannedRefs} unique=${report.uniqueLookups} updated=${report.menusUpdated} errors=${report.errors.length}`,
      );
      for (const e of report.errors.slice(0, 5)) log.info(`[square-sync] ${e}`);
    } catch (e) {
      log.error(e);
    } finally {
      running = false;
    }
  };
  setTimeout(() => void tick(), 5_000);
  syncTimer = setInterval(() => void tick(), intervalMs);
  syncTimer.unref?.();
}
