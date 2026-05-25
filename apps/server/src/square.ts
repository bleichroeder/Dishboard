import type { SquareCatalogItem, SquareIntegration } from '@dishboard/shared';

const SQUARE_VERSION = '2024-10-17';

function baseUrl(env: SquareIntegration['environment']): string {
  return env === 'sandbox'
    ? 'https://connect.squareupsandbox.com/v2'
    : 'https://connect.squareup.com/v2';
}

async function squareRequest<T>(
  integration: SquareIntegration,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<T> {
  const r = await fetch(`${baseUrl(integration.environment)}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${integration.accessToken}`,
      'Square-Version': SQUARE_VERSION,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Square ${method} ${path} → HTTP ${r.status}: ${text.slice(0, 300)}`);
  }
  return (await r.json()) as T;
}

type Money = { amount: number; currency: string };

type RawVariation = {
  id: string;
  type: string;
  item_variation_data?: {
    name?: string;
    price_money?: Money;
    location_overrides?: Array<{ sold_out?: boolean }>;
  };
};

type RawCatalogItem = {
  id: string;
  type: string;
  item_data?: {
    name?: string;
    variations?: RawVariation[];
  };
};

function formatPrice(money: Money | undefined): string | null {
  if (!money) return null;
  // Square reports cents for USD-like currencies. Format as $X.XX for USD; otherwise raw + currency.
  if (money.currency === 'USD') {
    return `$${(money.amount / 100).toFixed(2)}`;
  }
  return `${(money.amount / 100).toFixed(2)} ${money.currency}`;
}

function toItem(raw: RawCatalogItem): SquareCatalogItem {
  return {
    itemId: raw.id,
    name: raw.item_data?.name ?? '(untitled item)',
    variations: (raw.item_data?.variations ?? []).map((v) => ({
      variationId: v.id,
      name: v.item_variation_data?.name ?? '',
      price: formatPrice(v.item_variation_data?.price_money),
      soldOut: v.item_variation_data?.location_overrides?.some((o) => o.sold_out === true) ?? false,
    })),
  };
}

export async function searchCatalogItems(
  integration: SquareIntegration,
  query: string,
): Promise<SquareCatalogItem[]> {
  const q = query.trim();
  if (!q) return [];
  type SearchResponse = { items?: RawCatalogItem[] };
  const data = await squareRequest<SearchResponse>(
    integration,
    'POST',
    '/catalog/search-catalog-items',
    {
      text_filter: q,
      product_types: ['REGULAR'],
      limit: 50,
    },
  );
  return (data.items ?? []).map(toItem);
}

export type SquareLookupResult = {
  itemId: string; // the linked object's ID
  price: string | null;
  soldOut: boolean;
};

export async function lookupObject(
  integration: SquareIntegration,
  objectId: string,
): Promise<SquareLookupResult | null> {
  type GetResponse = { object?: RawCatalogItem | RawVariation };
  let data: GetResponse;
  try {
    data = await squareRequest<GetResponse>(
      integration,
      'GET',
      `/catalog/object/${encodeURIComponent(objectId)}?include_related_objects=false`,
    );
  } catch (e) {
    // 404 or auth errors — treat as "not found" rather than crashing the sync.
    if (e instanceof Error && /HTTP 4/.test(e.message)) return null;
    throw e;
  }
  const obj = data.object;
  if (!obj) return null;

  if (obj.type === 'ITEM_VARIATION') {
    const v = obj as RawVariation;
    return {
      itemId: v.id,
      price: formatPrice(v.item_variation_data?.price_money),
      soldOut: v.item_variation_data?.location_overrides?.some((o) => o.sold_out === true) ?? false,
    };
  }
  if (obj.type === 'ITEM') {
    const i = obj as RawCatalogItem;
    const first = i.item_data?.variations?.[0];
    return {
      itemId: i.id,
      price: formatPrice(first?.item_variation_data?.price_money),
      soldOut:
        first?.item_variation_data?.location_overrides?.some((o) => o.sold_out === true) ?? false,
    };
  }
  return null;
}
