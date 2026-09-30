import type { BaseListing, Category, History, Latest, SourceName } from '../types';
import type { Lang } from './i18n';
import { SOURCE_NAMES } from './sources';
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
  group: string; // brand (GPU/CPU) or memory type (RAM); drives the pill filter and dot colour
  pro: boolean; // workstation GPU / server-HEDT CPU / laptop-server RAM
  listings: L[]; // sorted by price ascending
  cheapest: L;
  maxPrice: number;
  /** Listing with the lowest known price + shipping, if any has one. */
  bestTotal: L | null;
}

/**
 * Listing with the lowest known price + shipping, or null when a listing whose shipping isn't known
 * yet is cheaper than that total before shipping (it could well be the real best deal).
 */
function bestTotal<L extends BaseListing>(ls: L[]): L | null {
  const best = ls.reduce<L | null>((b, l) => (l.total != null && (b == null || l.total < b.total!) ? l : b), null);
  return best && !ls.some((l) => l.total == null && l.price < best.total!) ? best : null;
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
      group: cfg.group(first),
      pro: cfg.isPro(first),
      listings: ls,
      cheapest: first,
      maxPrice: ls[ls.length - 1].price,
      bestTotal: bestTotal(ls),
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
  groups: string[];
  sources: SourceName[];
  segment: Segment;
  maxPrice: number | null;
  sort: SortKey;
  /** Category-specific filters (`CategoryConfig.extraFilters`) by key; '' or missing = any. */
  extra: Record<string, string>;
}

export function defaultFilters(groups: string[]): Filters {
  return {
    query: '',
    groups,
    sources: [...SOURCE_NAMES],
    segment: 'main',
    maxPrice: null,
    sort: 'model',
    extra: {},
  };
}

export function applyFilters<L extends BaseListing>(all: L[], f: Filters, cfg: CategoryConfig<L>): Model<L>[] {
  const q = f.query.trim().toLowerCase();
  const listings = all.filter(
    (l) =>
      f.groups.includes(cfg.group(l)) &&
      f.sources.includes(l.source) &&
      (!q || cfg.searchText(l).toLowerCase().includes(q)) &&
      // Per listing, so a model's price is that of a listing that matches (e.g. the CL30 kit).
      cfg.extraFilters.every((x) => !f.extra[x.key] || x.test(l, f.extra[x.key])),
  );
  const models = groupModels(listings, cfg).filter(
    (m) =>
      (!cfg.segments || f.segment === 'all' || (f.segment === 'pro') === m.pro) &&
      (f.maxPrice == null || m.cheapest.price <= f.maxPrice),
  );
  const cmp: Record<SortKey, (a: Model<L>, b: Model<L>) => number> = {
    'price-asc': (a, b) => a.cheapest.price - b.cheapest.price,
    'price-desc': (a, b) => b.cheapest.price - a.cheapest.price,
    offers: (a, b) => b.listings.length - a.listings.length,
    model: (a, b) =>
      (cfg.sortByGroup === false ? 0 : cfg.groups.indexOf(a.group) - cfg.groups.indexOf(b.group)) ||
      cfg.tierScore(b) - cfg.tierScore(a) ||
      a.key.localeCompare(b.key),
  };
  return models.sort(cmp[f.sort]);
}

// "1.209,62 €" in Greek, "€1,209.62" in English.
const EUR: Record<Lang, Intl.NumberFormat> = {
  el: new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' }),
  en: new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }),
};
export const formatPrice = (n: number, lang: Lang) => EUR[lang].format(n);

const RELATIVE: Record<Lang, Intl.RelativeTimeFormat> = {
  el: new Intl.RelativeTimeFormat('el', { numeric: 'auto' }),
  en: new Intl.RelativeTimeFormat('en', { numeric: 'auto' }),
};

export function timeAgo(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '—';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  const rtf = RELATIVE[lang];
  if (mins < 60) return rtf.format(-mins, 'minute');
  const h = Math.round(mins / 60);
  if (h < 48) return rtf.format(-h, 'hour');
  return rtf.format(-Math.round(h / 24), 'day');
}
