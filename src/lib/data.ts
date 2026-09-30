import type { BaseListing, Category, History, HistoryPoint, Imported, Latest, SourceName } from '../types';
import type { Lang } from './i18n';
import { SOURCE_NAMES } from './sources';
import type { CategoryConfig } from './categories';

export interface CategoryData<L extends BaseListing = BaseListing> {
  latest: Latest<L>;
  history: History;
  imported: Imported; // Skroutz history import: all-time lows
}

const cache = new Map<Category, Promise<CategoryData>>();

/** JSON file that may be missing (history, imports): an empty object then. */
const optional = <T>(url: string): Promise<T> =>
  fetch(url, { cache: 'no-cache' })
    .then((r) => (r.ok ? (r.json() as Promise<T>) : ({} as T)))
    .catch(() => ({}) as T);

export function loadData<L extends BaseListing>(cat: Category): Promise<CategoryData<L>> {
  let p = cache.get(cat);
  if (!p) {
    p = Promise.all([
      fetch(`/data/${cat}/latest.json`, { cache: 'no-cache' }).then((r) => {
        if (!r.ok) throw new Error(`${cat}/latest.json: HTTP ${r.status}`);
        return r.json() as Promise<Latest>;
      }),
      optional<History>(`/data/${cat}/history.json`),
      optional<Imported>(`/data/${cat}/history_imported.json`),
    ]).then(([latest, history, imported]) => ({ latest, history, imported }));
    p.catch(() => cache.delete(cat)); // allow a retry after a failed load
    cache.set(cat, p);
  }
  return p as Promise<CategoryData<L>>;
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
  /** On sale according to the site selling it (set by applyFilters). */
  sale?: Sale | null;
  /** At its lowest price in all the history we have (set by applyFilters). */
  low?: AllTimeLow | null;
}

/** A discount the site itself announces: Skroutz/BestPrice price-drop badge, Shopflix "Προσφορά", e-shop RRP. */
export interface Sale {
  pct: number; // e.g. 12 for −12%
  source: SourceName;
}

/** The model's own offers at (about) its lowest price that the site marks as a price drop. */
export function saleOf<L extends BaseListing>(ls: L[], cheapest: L): Sale | null {
  let best: Sale | null = null;
  for (const l of ls) {
    // Only offers within 2% of the cheapest count: a discounted offer that is still dearer isn't a deal.
    if (l.drop != null && l.drop >= 5 && l.price <= cheapest.price * 1.02 && (!best || l.drop > best.pct)) {
      best = { pct: l.drop, source: l.source };
    }
  }
  return best;
}

export interface AllTimeLow {
  since: string; // first day of the history it is compared with (YYYY-MM-DD)
}

/** Needs this much history before "lowest ever" means something. */
const LOW_MIN_DAYS = 60;

/**
 * Today's price is at (or under) every earlier daily low: our own history plus the lowest price in
 * Skroutz's whole history for that model (`imported[key].low`, ~2 years).
 */
export function allTimeLow(points: HistoryPoint[] | undefined, imp: Imported[string] | undefined, price: number): AllTimeLow | null {
  const today = new Date().toISOString().slice(0, 10);
  const past = (points ?? []).filter((p) => p.d < today);
  const importedLow = typeof imp === 'object' ? imp : undefined;
  const firstDays = [past[0]?.d, importedLow?.since].filter((d): d is string => !!d).sort();
  const since = firstDays[0];
  if (!since || Date.now() - new Date(since).getTime() < LOW_MIN_DAYS * 864e5) return null;
  const lows = past.map((p) => p.min);
  if (importedLow?.low != null) lows.push(importedLow.low);
  return lows.length && price <= Math.min(...lows) + 0.005 ? { since } : null;
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

export type SortKey = 'price-asc' | 'price-desc' | 'model' | 'offers' | 'discount';
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
  saleOnly: boolean;
  lowOnly: boolean;
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
    saleOnly: false,
    lowOnly: false,
  };
}

export function applyFilters<L extends BaseListing>(
  all: L[],
  f: Filters,
  cfg: CategoryConfig<L>,
  history: History = {},
  imported: Imported = {},
): Model<L>[] {
  const q = f.query.trim().toLowerCase();
  const listings = all.filter(
    (l) =>
      f.groups.includes(cfg.group(l)) &&
      f.sources.includes(l.source) &&
      (!q || cfg.searchText(l).toLowerCase().includes(q)) &&
      // Per listing, so a model's price is that of a listing that matches (e.g. the CL30 kit).
      cfg.extraFilters.every((x) => !f.extra[x.key] || x.test(l, f.extra[x.key])),
  );
  const grouped = groupModels(listings, cfg).map((m) => ({
    ...m,
    sale: saleOf(m.listings, m.cheapest),
    low: allTimeLow(history[m.key], imported[m.key], m.cheapest.price),
  }));
  const models = grouped.filter(
    (m) =>
      (!cfg.segments || f.segment === 'all' || (f.segment === 'pro') === m.pro) &&
      (f.maxPrice == null || m.cheapest.price <= f.maxPrice) &&
      (!f.saleOnly || m.sale != null) &&
      (!f.lowOnly || m.low != null),
  );
  // "Recommended": best value for money first where the category has a value score (performance
  // or capacity per euro); a part on sale gets an extra boost. Elsewhere, parts on sale come first.
  const SALE_BOOST = 1.15;
  const recommended = (m: Model<L>) => {
    const v = cfg.value?.(m);
    return v == null ? null : v * (m.sale || m.low ? SALE_BOOST : 1);
  };
  const cmp: Record<SortKey, (a: Model<L>, b: Model<L>) => number> = {
    'price-asc': (a, b) => a.cheapest.price - b.cheapest.price,
    'price-desc': (a, b) => b.cheapest.price - a.cheapest.price,
    offers: (a, b) => b.listings.length - a.listings.length,
    discount: (a, b) => (b.sale?.pct ?? 0) - (a.sale?.pct ?? 0) || a.cheapest.price - b.cheapest.price,
    model: (a, b) => {
      const va = recommended(a);
      const vb = recommended(b);
      if (va != null || vb != null) return (vb ?? -1) - (va ?? -1) || a.cheapest.price - b.cheapest.price;
      return (
        (b.sale || b.low ? 1 : 0) - (a.sale || a.low ? 1 : 0) ||
        (cfg.sortByGroup === false ? 0 : cfg.groups.indexOf(a.group) - cfg.groups.indexOf(b.group)) ||
        cfg.tierScore(b) - cfg.tierScore(a) ||
        a.key.localeCompare(b.key)
      );
    },
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

/** Compact age for tight spots: "39′", "2 ώρ." / "2 h", "3 ημ." / "3 d". */
export function shortAgo(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '—';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}′`;
  const h = Math.round(mins / 60);
  if (h < 48) return lang === 'el' ? `${h} ώρ.` : `${h} h`;
  const d = Math.round(h / 24);
  return lang === 'el' ? `${d} ημ.` : `${d} d`;
}

export function timeAgo(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '—';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  const rtf = RELATIVE[lang];
  if (mins < 60) return rtf.format(-mins, 'minute');
  const h = Math.round(mins / 60);
  if (h < 48) return rtf.format(-h, 'hour');
  return rtf.format(-Math.round(h / 24), 'day');
}
