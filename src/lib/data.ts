import type {
  BaseListing,
  Category,
  DailyLow,
  DetailFile,
  Imported,
  Latest,
  ListFile,
  SourceName,
} from '../types';
import { SOURCE_NAMES } from './sources';
import type { CategoryConfig } from './categories';
import type { CategoryRules } from './categoryRules';
import { recommendedScores } from './ranking';
import { isDipPrice, untrustedPoints } from './dips';
import { assertListFormat, decodeHist, decodePhotos, fromColumns, listUrl } from './columns';

// The site reads files derived at build time (src/lib/derive.ts); browsers cache them for a few
// minutes (vercel.json), so switching tabs back and forth or reopening the site doesn't refetch.

export interface CategoryData<L extends BaseListing = BaseListing> {
  latest: Latest<L>;
  /** The few daily lows per model that the badges and the week change need (see derive.reduceHistory). */
  history: Record<string, DailyLow[]>;
  imported: Imported; // Skroutz history import: all-time lows
  builtAt: string;
  /** Keys of the models that have a stored photo; see src/lib/images.ts productImage. */
  photos: Set<string>;
}

/** Shop links, loaded when a product is first opened (the chart's history comes from the model chunks). */
export interface CategoryDetails {
  urls: DetailFile;
}

const getJson = <T>(url: string): Promise<T> =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
    return r.json() as Promise<T>;
  });

/** A promise per key that is forgotten if it fails, so the next call retries. */
function memo<K, V>(load: (k: K) => Promise<V>): (k: K) => Promise<V> {
  const cache = new Map<K, Promise<V>>();
  return (k) => {
    let p = cache.get(k);
    if (!p) {
      p = load(k);
      p.catch(() => cache.delete(k));
      cache.set(k, p);
    }
    return p;
  };
}

/**
 * The cached best total (scraper/shipping.py) is the cheapest offer with stated shipping on the product
 * page, which can be another offer than the one whose price the listing shows. Keep it only when that
 * offer's own price is within 2% of the listing's price; otherwise the total is unknown.
 */
const SAME_OFFER = 0.02;
export function ownTotal<L extends BaseListing>(l: L): L {
  if (l.total == null || Math.abs(l.total - (l.shipping ?? 0) - l.price) <= SAME_OFFER * l.price) return l;
  return { ...l, shipping: null, total: null, merchant: null };
}

/** A list file as the page uses it; the facet worker decodes its own copy with this too (no second decoder). */
export function decodeList(f: ListFile): CategoryData {
  assertListFormat(f);
  return {
    latest: { updatedAt: f.updatedAt, sources: f.sources, listings: fromColumns<BaseListing>(f).map(ownTotal) },
    history: decodeHist(f),
    imported: f.imported,
    builtAt: f.builtAt,
    photos: decodePhotos(f),
  };
}

const loadList = memo((cat: Category): Promise<CategoryData> => getJson<ListFile>(listUrl(cat)).then(decodeList));

export const loadData = <L extends BaseListing>(cat: Category) => loadList(cat) as Promise<CategoryData<L>>;

/** Same build as the list (`?v=`), so a deploy in between can't mix files of two scrapes. */
export const loadDetails = memo(
  (cat: Category): Promise<CategoryDetails> =>
    loadList(cat).then(({ builtAt }) =>
      getJson<DetailFile>(`/data/${cat}/detail.json?v=${builtAt}`).then((urls) => ({ urls })),
    ),
);

/**
 * Start loading a category page's data before it is opened (tab hover/focus/touch), so the switch is instant. The
 * builder's own files: src/lib/builderFiles.ts (App.prefetchPath).
 */
export function prefetch(page: string) {
  if (/^(gpu|cpu|mobo|ram|storage|psu|case|fan|cooler)$/.test(page)) void loadList(page as Category).catch(() => {});
}

export interface Model<L extends BaseListing> {
  key: string;
  chip: string;
  group: string; // brand (GPU/CPU) or memory type (RAM); drives the pill filter and dot colour
  pro: boolean; // workstation GPU / server-HEDT CPU / laptop-server RAM / server drive
  segment: Segment; // 'main' | 'pro', or a category's own middle option (storage: 'nas')
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
export function allTimeLow(
  points: DailyLow[] | undefined,
  imp: Imported[string] | undefined,
  price: number,
): AllTimeLow | null {
  const base = lowBase(points, imp, false);
  return base && price <= base.price + 0.005 ? { since: base.since } : null;
}

/**
 * The lowest price in all the history we have, for marking on the product page's chart: the same sources and
 * rules as `allTimeLow` (dips ignored, the imported Skroutz low included, 60 days needed), but today's own point
 * counts too: the page marks where the low is, the category page asks whether today is at it.
 */
export function historyLow(points: LowPoint[] | undefined, imp: Imported[string] | undefined): HistoryLow | null {
  return lowBase(points, imp, true);
}

/**
 * `date`: the day of the low when it is one of the daily points (null when it is Skroutz's imported all-time low: the
 * import stores no date for it). `source`: 'own' (a point we scraped, the 5 shops) or 'skroutz' (only Skroutz's own
 * history: its imported all-time low, strictly lower than every point, or an imported "i": 1 daily point, with its day).
 * On a tie between points, a scraped one wins.
 */
export interface HistoryLow {
  price: number;
  since: string;
  date: string | null;
  source: 'own' | 'skroutz';
}

/** A daily low, with the history.json marks when it has them (`i`: imported from Skroutz; `g`: import glitch). */
type LowPoint = DailyLow & { i?: 1; g?: 1 };

function lowBase(
  points: LowPoint[] | undefined,
  imp: Imported[string] | undefined,
  includeToday: boolean,
): HistoryLow | null {
  const today = new Date().toISOString().slice(0, 10);
  // C6: the build already removed dips from the reduced history; this re-check is conservative (sparse
  // points mean fewer than 7 neighbours, so nothing is flagged), not exactly idempotent. Full history: exact.
  // Task 7b: import glitches are gone from the reduced history and marked g: 1 in a model chunk's full history.
  const dips = untrustedPoints(points ?? []);
  const past = (points ?? []).filter((p) => (includeToday || p.d < today) && !dips.has(p));
  let importedLow = typeof imp === 'object' ? imp : undefined;
  if (importedLow?.low != null && isDipPrice(importedLow.low, dips)) importedLow = { ...importedLow, low: undefined };
  const firstDays = [past[0]?.d, importedLow?.since].filter((d): d is string => !!d).sort();
  const since = firstDays[0];
  if (!since || Date.now() - new Date(since).getTime() < LOW_MIN_DAYS * 864e5) return null;
  const ownLow = past.reduce<LowPoint | null>((m, p) => (!m || p.min < m.min || (p.min === m.min && m.i === 1 && p.i !== 1) ? p : m), null);
  const impLow = importedLow?.low;
  if (impLow != null && (!ownLow || impLow < ownLow.min)) return { price: impLow, since, date: null, source: 'skroutz' };
  // The owner (18/10): a low that is an imported Skroutz day is said to be Skroutz's, not "from our 5 shops".
  return ownLow ? { price: ownLow.min, since, date: ownLow.d, source: ownLow.i === 1 ? 'skroutz' : 'own' } : null;
}

/**
 * Listing with the lowest known price + shipping, or null when a listing whose shipping isn't known
 * yet is cheaper than that total before shipping (it could well be the real best deal).
 */
function bestTotal<L extends BaseListing>(ls: L[]): L | null {
  const best = ls.reduce<L | null>((b, l) => (l.total != null && (b == null || l.total < b.total!) ? l : b), null);
  return best && !ls.some((l) => l.total == null && l.price < best.total!) ? best : null;
}

/**
 * `listings` are grouped into models; `all` (the unfiltered list) decides which names need their
 * variant (GPU: VRAM) so "RX 9060 XT 8GB" and "RX 9060 XT 16GB" read differently whatever the filters.
 */
export function groupModels<L extends BaseListing>(listings: L[], cfg: CategoryRules<L>, all: L[] = listings): Model<L>[] {
  const several = new Set<string>();
  if (cfg.variant) {
    const seen = new Map<string, string>();
    for (const l of all) {
      const v = cfg.variant(l);
      const prev = seen.get(l.chip);
      if (prev === undefined) seen.set(l.chip, v);
      else if (prev !== v) several.add(l.chip);
    }
  }
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
    const pro = cfg.isPro(first);
    return {
      key,
      chip: several.has(first.chip) ? `${first.chip} ${cfg.variant!(first)}` : first.chip,
      group: cfg.group(first),
      pro,
      segment: cfg.segmentOf?.(first) ?? (pro ? 'pro' : 'main'),
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

/** 'per-tb': price per terabyte, for categories with `capacityTb` (storage). */
export type SortKey = 'price-asc' | 'price-desc' | 'model' | 'offers' | 'discount' | 'per-tb';
/** 'main' (the default view), 'pro', 'all', or a value from `CategoryConfig.segments.middle`. */
export type Segment = string;

/** Price per TB of a model's cheapest listing, when its category has a capacity. */
export function perTb<L extends BaseListing>(m: Model<L>, cfg: CategoryConfig<L>): number | null {
  const tb = cfg.capacityTb?.(m.cheapest);
  return tb ? m.cheapest.price / tb : null;
}

export interface Filters {
  query: string;
  groups: string[];
  sources: SourceName[];
  segment: Segment;
  maxPrice: number | null;
  minPrice?: number | null;
  numericMin?: number | null;
  numericMax?: number | null;
  includeUnknown?: boolean;
  sort: SortKey;
  /** Category-specific filters (`CategoryConfig.extraFilters`) by key; '' or missing = any. */
  extra: Record<string, string>;
  saleOnly: boolean;
  lowOnly: boolean;
  /** Pagination (not a filter: not counted, not a chip); any filter change goes back to page 1. */
  page: number;
  per: number;
  /** Pick mode (`?pick=1`, v2 step 3): the page picks a part for the build. UI state, not a filter. */
  pick: boolean;
  /** "Only compatible" in pick mode (`compat=0` = off); always true outside it. */
  compat: boolean;
}

/** Results per page offered (Modrinth-style); 50 is the default. */
export const PER_PAGE = [20, 50, 100] as const;
export const DEFAULT_PER = 50;

/** The defaults; in pick mode the sort is "Price ↑" (step2-plan section 2) and stays in pick mode. */
export function defaultFilters(groups: string[], pick = false): Filters {
  return {
    query: '',
    groups,
    sources: [...SOURCE_NAMES],
    segment: 'main',
    maxPrice: null,
    sort: pick ? 'price-asc' : 'model',
    extra: {},
    saleOnly: false,
    lowOnly: false,
    page: 1,
    per: DEFAULT_PER,
    pick,
    compat: true,
  };
}

/**
 * Every filter back to its default ("Clear filters", "Clear all", the empty state): the results per page,
 * pick mode and "Only compatible" stay (a mode, not a filter: it has no chip), and the sort with `keepSort`.
 */
export function clearedFilters(f: Filters, groups: string[], keepSort: boolean): Filters {
  return { ...defaultFilters(groups, f.pick), per: f.per, compat: f.compat, ...(keepSort && { sort: f.sort }) };
}

/** How many filters differ from the defaults (shown on the phone/tablet "Filters" button). */
export function activeFilterCount(f: Filters, groups: string[]): number {
  const d = defaultFilters(groups);
  return (
    (f.query.trim() ? 1 : 0) +
    (f.groups.length !== d.groups.length ? 1 : 0) +
    (f.sources.length !== d.sources.length ? 1 : 0) +
    (f.segment !== d.segment ? 1 : 0) +
    (f.maxPrice != null ? 1 : 0) +
    (f.minPrice != null ? 1 : 0) +
    (f.numericMin != null || f.numericMax != null ? 1 : 0) +
    Object.values(f.extra).filter(Boolean).length +
    (f.saleOnly ? 1 : 0) +
    (f.lowOnly ? 1 : 0)
  );
}

/**
 * All-time lows already worked out by an earlier pass of the same facet count (facets.ts), by model key and
 * cheapest price: `allTimeLow` depends on nothing else (and today's date), so the passes share them.
 */
export type LowMemo = Map<string, AllTimeLow | null>;

/** The models the filters let through, unsorted (what the page sorts, and what the facet counts count). */
export function filterModels<L extends BaseListing>(
  all: L[],
  f: Filters,
  cfg: CategoryRules<L>,
  history: Record<string, DailyLow[]> = {},
  imported: Imported = {},
  lows?: LowMemo,
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
  const lowOf = (m: Model<L>) => {
    if (!lows) return allTimeLow(history[m.key], imported[m.key], m.cheapest.price);
    const k = `${m.key}\n${m.cheapest.price}`;
    let low = lows.get(k);
    if (low === undefined) lows.set(k, (low = allTimeLow(history[m.key], imported[m.key], m.cheapest.price)));
    return low;
  };
  const grouped = groupModels(listings, cfg, all).map((m) => ({
    ...m,
    sale: saleOf(m.listings, m.cheapest),
    low: lowOf(m),
  }));
  return grouped.filter(
    (m) =>
      (!cfg.segments || f.segment === 'all' || f.segment === m.segment) &&
      (f.maxPrice == null || m.cheapest.price <= f.maxPrice) &&
      (!f.saleOnly || m.sale != null) &&
      (!f.lowOnly || m.low != null),
  );
}

export function applyFilters<L extends BaseListing>(
  all: L[],
  f: Filters,
  cfg: CategoryConfig<L>,
  history: Record<string, DailyLow[]> = {},
  imported: Imported = {},
  /** Without sorting: only the matching models, not their order. */
  opts: { sort?: boolean } = {},
): Model<L>[] {
  const models = filterModels(all, f, cfg, history, imported);
  // "Recommended": popularity, modern platform, sensible price and value for money, weighted per
  // category in src/lib/ranking.ts. Workstation/server models always come after the rest.
  if (opts.sort === false) return models;
  const score = f.sort === 'model' ? recommendedScores(models, cfg.id, cfg.value) : new Map<string, number>();
  const cmp: Record<SortKey, (a: Model<L>, b: Model<L>) => number> = {
    'price-asc': (a, b) => a.cheapest.price - b.cheapest.price,
    'price-desc': (a, b) => b.cheapest.price - a.cheapest.price,
    offers: (a, b) => b.listings.length - a.listings.length,
    discount: (a, b) => (b.sale?.pct ?? 0) - (a.sale?.pct ?? 0) || a.cheapest.price - b.cheapest.price,
    // Models without a capacity last; equal €/TB: the cheaper drive first.
    'per-tb': (a, b) => (perTb(a, cfg) ?? Infinity) - (perTb(b, cfg) ?? Infinity) || a.cheapest.price - b.cheapest.price,
    model: (a, b) =>
      Number(a.pro) - Number(b.pro) ||
      (score.get(b.key) ?? 0) - (score.get(a.key) ?? 0) ||
      cfg.tierScore(b) - cfg.tierScore(a) ||
      a.key.localeCompare(b.key),
  };
  return models.sort(cmp[f.sort]);
}

// Prices and ages are formatted in format.ts (small, so the site shell can use it without this module).
export { formatPrice } from './format';
