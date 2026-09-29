import type { BaseListing, Brand, Category, History, Latest, SourceName } from '../types';
import type { CategoryConfig } from './categories';

const cache = new Map<Category, Promise<{ latest: Latest; history: History }>>();

export function loadData<L extends BaseListing>(cat: Category): Promise<{ latest: Latest<L>; history: History }> {
  let p = cache.get(cat);
  if (!p) {
    p = Promise.all([
      fetch(`/data/${cat}/latest.json`, { cache: 'no-cache' }).then((r) => {
        if (!r.ok) throw new Error(`${cat}/latest.json: HTTP ${r.status}`);
        return r.json() as Promise<Latest>;
      }),
      fetch(`/data/${cat}/history.json`, { cache: 'no-cache' })
        .then((r) => (r.ok ? (r.json() as Promise<History>) : {}))
        .catch(() => ({})),
    ]).then(([latest, history]) => ({ latest, history }));
    p.catch(() => cache.delete(cat)); // allow a retry after a failed load
    cache.set(cat, p);
  }
  return p as Promise<{ latest: Latest<L>; history: History }>;
}

export interface Model<L extends BaseListing> {
  key: string;
  chip: string;
  brand: Brand;
  pro: boolean; // workstation GPU / server-HEDT CPU
  listings: L[]; // sorted by price ascending
  cheapest: L;
  maxPrice: number;
}

export function groupModels<L extends BaseListing>(listings: L[], cfg: CategoryConfig<L>): Model<L>[] {
  const map = new Map<string, L[]>();
  for (const l of listings) {
    const k = cfg.modelKey(l);
    const arr = map.get(k);
    if (arr) arr.push(l);
    else map.set(k, [l]);
  }
  return [...map.entries()].map(([key, ls]) => {
    ls.sort((a, b) => a.price - b.price);
    const first = ls[0];
    return {
      key,
      chip: first.chip,
      brand: first.brand,
      pro: cfg.isPro(first.chip),
      listings: ls,
      cheapest: first,
      maxPrice: ls[ls.length - 1].price,
    };
  });
}

/** Most frequent non-null value, e.g. a CPU model's socket across its listings. */
export function mostCommon<T>(values: (T | null | undefined)[]): T | null {
  const counts = new Map<T, number>();
  for (const v of values) if (v != null) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T | null = null;
  let n = 0;
  for (const [v, c] of counts) if (c > n) [best, n] = [v, c];
  return best;
}

export type SortKey = 'price-asc' | 'price-desc' | 'model' | 'offers';
export type Segment = 'main' | 'pro' | 'all';

export interface Filters {
  query: string;
  brands: Brand[];
  sources: SourceName[];
  segment: Segment;
  maxPrice: number | null;
  sort: SortKey;
  // Category-specific; ignored by categories that don't use them.
  minVram: number;
  socket: string; // '' = any
  minCores: number;
}

export function defaultFilters(brands: Brand[]): Filters {
  return {
    query: '',
    brands,
    sources: ['skroutz', 'bestprice'],
    segment: 'main',
    maxPrice: null,
    sort: 'model',
    minVram: 0,
    socket: '',
    minCores: 0,
  };
}

export function applyFilters<L extends BaseListing>(all: L[], f: Filters, cfg: CategoryConfig<L>): Model<L>[] {
  const q = f.query.trim().toLowerCase();
  const listings = all.filter(
    (l) =>
      f.brands.includes(l.brand) &&
      f.sources.includes(l.source) &&
      (!q || cfg.searchText(l).toLowerCase().includes(q)),
  );
  const models = groupModels(listings, cfg).filter(
    (m) =>
      (f.segment === 'all' || (f.segment === 'pro') === m.pro) &&
      (f.maxPrice == null || m.cheapest.price <= f.maxPrice) &&
      cfg.matchesModel(m, f),
  );
  const cmp: Record<SortKey, (a: Model<L>, b: Model<L>) => number> = {
    'price-asc': (a, b) => a.cheapest.price - b.cheapest.price,
    'price-desc': (a, b) => b.cheapest.price - a.cheapest.price,
    offers: (a, b) => b.listings.length - a.listings.length,
    model: (a, b) =>
      cfg.brands.indexOf(a.brand) - cfg.brands.indexOf(b.brand) ||
      cfg.tierScore(b) - cfg.tierScore(a) ||
      a.key.localeCompare(b.key),
  };
  return models.sort(cmp[f.sort]);
}

const eur = new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' });
export const formatPrice = (n: number) => eur.format(n);

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'μόλις τώρα';
  if (mins < 60) return `πριν ${mins} λεπτά`;
  const h = Math.round(mins / 60);
  if (h < 48) return `πριν ${h} ${h === 1 ? 'ώρα' : 'ώρες'}`;
  return `πριν ${Math.round(h / 24)} μέρες`;
}
