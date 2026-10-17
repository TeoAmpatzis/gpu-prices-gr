// Faceted counts: for every filter option, how many models the page would show if it were picked,
// given all the *other* active filters (the option's own group is left out, as shops usually do).
// One filter pass per group (not per option), then the options are counted on its result. The passes share
// the models' all-time lows (data.LowMemo). Since step 4 task 3 the page asks the facet worker for them
// (facets.worker.ts → createFacetHandler, through facetsClient.ts) after its first paint; the main thread runs
// the same passes in idle slices only when no worker can.

import type { BaseListing, Category, DailyLow, Imported, ListFile, SourceName } from '../types';
import type { CategoryRules, ExtraFilter } from './categoryRules';
import { rulesOf } from './categoryRules';
import { decodeList, defaultFilters, filterModels, type CategoryData, type Filters, type LowMemo, type Model, type Segment } from './data';
import { SOURCE_NAMES } from './sources';

export interface FacetCounts {
  groups: Record<string, number>;
  sources: Record<SourceName, number>;
  segment: Record<Segment, number>;
  sale: number;
  low: number;
  /** extra filter key → option value → count */
  extra: Record<string, Record<string, number>>;
}

/**
 * The counts as separate passes (one filter run each) that fill `counts`: run them all at once (facetCounts) or one
 * per idle task (the main-thread fallback). The order of the passes doesn't matter.
 */
export function facetPasses<L extends BaseListing>(
  all: L[],
  f: Filters,
  cfg: CategoryRules<L>,
  history: Record<string, DailyLow[]>,
  imported: Imported,
  /** Options of each extra filter (as shown in the sidebar). */
  options: Record<string, { value: string }[]>,
): { counts: FacetCounts; passes: (() => void)[] } {
  const d = defaultFilters(cfg.groups);
  const lows: LowMemo = new Map();
  const run = (without: Partial<Filters>) => filterModels(all, { ...f, ...without }, cfg, history, imported, lows);
  // A listing counts for an option only if it would also pass the max-price filter.
  const withinPrice = (l: L) => f.maxPrice == null || l.price <= f.maxPrice;
  const countModels = (models: Model<L>[], test: (l: L) => boolean) =>
    models.reduce((n, m) => n + (m.listings.some((l) => test(l) && withinPrice(l)) ? 1 : 0), 0);
  /** Per option, the models with a listing that matches it: by each listing's one value where the filter has one. */
  const countOptions = (models: Model<L>[], x: ExtraFilter<L>, opts: { value: string }[]) => {
    const value = x.matchValue;
    if (!value) return Object.fromEntries(opts.map((o) => [o.value, countModels(models, (l) => x.test(l, o.value))]));
    const out = new Map(opts.map((o) => [o.value, 0]));
    const seen = new Set<string>();
    for (const m of models) {
      seen.clear();
      for (const l of m.listings) {
        if (!withinPrice(l)) continue;
        const v = value(l);
        if (v != null && out.has(v)) seen.add(v);
      }
      for (const v of seen) out.set(v, out.get(v)! + 1);
    }
    return Object.fromEntries(out);
  };

  const counts: FacetCounts = { groups: {}, sources: {} as Record<SourceName, number>, segment: {}, sale: 0, low: 0, extra: {} };
  const passes = [
    () => {
      const models = run({ groups: d.groups });
      counts.groups = Object.fromEntries(cfg.groups.map((g) => [g, models.filter((m) => m.group === g).length]));
    },
    () => {
      const models = run({ sources: d.sources });
      counts.sources = Object.fromEntries(SOURCE_NAMES.map((s) => [s, countModels(models, (l) => l.source === s)])) as Record<SourceName, number>;
    },
    () => {
      const models = run({ segment: 'all' });
      const segment: Record<Segment, number> = { main: 0, pro: 0, all: models.length };
      for (const s of cfg.segments?.middle ?? []) segment[s.value] = 0;
      for (const m of models) segment[m.segment] = (segment[m.segment] ?? 0) + 1;
      counts.segment = segment;
    },
    () => {
      counts.sale = run({ saleOnly: false }).filter((m) => m.sale).length;
    },
    () => {
      counts.low = run({ lowOnly: false }).filter((m) => m.low).length;
    },
    ...cfg.extraFilters.map((x) => () => {
      const models = run({ extra: { ...f.extra, [x.key]: '' } });
      counts.extra[x.key] = countOptions(models, x, options[x.key] ?? []);
    }),
  ];
  return { counts, passes };
}

export function facetCounts<L extends BaseListing>(
  all: L[],
  f: Filters,
  cfg: CategoryRules<L>,
  history: Record<string, DailyLow[]>,
  imported: Imported,
  /** Options of each extra filter (as shown in the sidebar). */
  options: Record<string, { value: string }[]>,
): FacetCounts {
  const { counts, passes } = facetPasses(all, f, cfg, history, imported, options);
  for (const p of passes) p();
  return counts;
}

/** The extra filters' options, as the page computes them (on every listing of the category). */
export const optionsOf = <L extends BaseListing>(cfg: CategoryRules<L>, listings: L[]) =>
  Object.fromEntries(cfg.extraFilters.map((x) => [x.key, x.options(listings)]));

/** The listings the page counts: pick mode removes the ones "Only compatible" hides (by listing id). */
export function shownListings<L extends BaseListing>(all: L[], hidden: string[] | null): L[] {
  if (!hidden) return all;
  const out = new Set(hidden);
  return all.filter((l) => !out.has(l.id));
}

// ---- the worker's protocol ------------------------------------------------------------------------------------

export interface FacetRequest {
  /** Increasing per page session; an answer to an older request than the newest of its category is dropped. */
  id: number;
  cat: Category;
  /** The page's list file (`builtAt`): counts from another build would not match the page's rows. */
  version: string;
  filters: Filters;
  /** Pick mode: ids of the listings "Only compatible" hides (not counted); null = count every listing. */
  hidden: string[] | null;
}

export type FacetAnswer =
  | { id: number; ok: true; counts: FacetCounts }
  /** `mismatch`: the worker's list file is of another build than the page's (it re-fetches on the next request). */
  | { id: number; ok: false; error: string; mismatch?: true };

interface Loaded {
  data: CategoryData;
  options: Record<string, { value: string }[]>;
}

/**
 * The worker's handler (pure: `load` fetches the list file in the worker, reads a fixture in the tests). Each
 * category's list file is loaded and decoded once (decodeList, as the page does); a failed load is forgotten, so
 * the next request tries again. A file of another build than the request's is an error answer (`mismatch`; the page
 * counts) and is forgotten too, so the next request fetches it again (the HTTP cache may have had an older copy).
 * `current` (the worker: is it still its category's newest request?) skips requests replaced while the file loaded.
 */
export function createFacetHandler(
  load: (cat: Category) => Promise<ListFile>,
  current: (req: FacetRequest) => boolean = () => true,
): (req: FacetRequest) => Promise<FacetAnswer> {
  const cache = new Map<Category, Promise<Loaded>>();
  const loaded = (cat: Category) => {
    let p = cache.get(cat);
    if (!p) {
      p = load(cat).then((file) => {
        const data = decodeList(file);
        return { data, options: optionsOf(rulesOf(cat), data.latest.listings) };
      });
      p.catch(() => cache.delete(cat));
      cache.set(cat, p);
    }
    return p;
  };
  return async (req) => {
    try {
      const { data, options } = await loaded(req.cat);
      if (!current(req)) return { id: req.id, ok: false, error: 'superseded' };
      if (data.builtAt !== req.version) {
        cache.delete(req.cat);
        return { id: req.id, ok: false, error: `list file ${data.builtAt}, page ${req.version}`, mismatch: true };
      }
      const listings = shownListings(data.latest.listings, req.hidden);
      return { id: req.id, ok: true, counts: facetCounts(listings, req.filters, rulesOf(req.cat), data.history, data.imported, options) };
    } catch (e) {
      return { id: req.id, ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  };
}
