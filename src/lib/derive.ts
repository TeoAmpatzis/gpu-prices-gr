// Smaller files for the site, derived at build time from the scraper's JSON (latest.json,
// history.json, history_imported.json stay exactly as the scraper writes them).
//
// - /data/<cat>/list.json   the category page: every listing (filters and counts need all of them)
//   as columns, without shop URLs and scrape times, plus a few daily lows per model;
// - /data/<cat>/detail.json listing id → shop URL, loaded when a product is opened (together with
//   the full history.json for the chart);
// - /data/builder.json      only the parts the PC builder can offer, grouped by the same code;
// - /data/manifest.json     counts, which the next build compares its data with (see checkData).
//
// Pure functions only: vite-plugin-data.ts does the file reading and writing.

import type {
  BaseListing,
  BuilderExtra,
  BuilderFile,
  BuilderSlotFile,
  CaseListing,
  Category,
  Columns,
  CoolerListing,
  DailyLow,
  GpuListing,
  History,
  HistoryPoint,
  Imported,
  Latest,
  ListFile,
  Manifest,
  MoboListing,
} from '../types';
import { CATEGORIES, CATEGORY_IDS, type CategoryConfig } from './categories';
import { fromColumns } from './columns';
import { groupModels, mostCommon, saleOf, type Model } from './data';
import { POP_SCALE, popularityRaw } from './ranking';
import type { SearchIndexFile } from './search';
import {
  LAZY_SLOTS,
  SLOTS,
  candidates,
  caseBoardStated,
  caseCoolerMax,
  caseFanMounts,
  caseFanSlots,
  caseFansIncluded,
  caseGpuMax,
  caseRadiatorSizes,
  caseRadiators,
  coolerHeight,
  coolerSockets,
  cpuHasIgpu,
  cpuSocket,
  gpuLength,
  moboForm,
  moboMemory,
  moboSocket,
  slotModels,
  type Slot,
  type SlotListing,
} from './builder';

/** Only needed when a product is opened (URL) or never shown (scrape time). */
const DETAIL_ONLY = new Set(['url', 'scrapedAt']);
/** Not in list.json either: only the builder reads them (builder.json keeps them). */
const LIST_SKIP = new Set([...DETAIL_ONLY, 'fanMounts', 'fansIncluded', 'radiators', 'airflowCfm', 'pressureMm']);

export function toColumns(listings: object[], skip: Set<string> = DETAIL_ONLY): Columns {
  const cols: string[] = [];
  const seen = new Set<string>();
  for (const l of listings) {
    for (const k of Object.keys(l)) {
      if (!seen.has(k) && !skip.has(k)) {
        seen.add(k);
        cols.push(k);
      }
    }
  }
  const rows = listings.map((l) => cols.map((c) => (l as Record<string, unknown>)[c] ?? null));
  return { cols, rows };
}

const shiftDay = (day: string, days: number) => new Date(Date.parse(`${day}T00:00:00Z`) + days * 864e5).toISOString().slice(0, 10);

/**
 * The daily lows the table needs from a model's history, chosen so that `allTimeLow` and the week
 * change (ModelRow) give exactly the same result as with the full history on the build day and the
 * day after (builds run every 6 hours): the first point (start of the history), the lowest point
 * before `day`, every point from `day` on, and the points the 7-day comparison can land on.
 */
export function reduceHistory(points: DailyLow[], day: string): [string, number][] {
  if (!points.length) return [];
  const sorted = [...points].sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  const keep = new Set<DailyLow>([sorted[0]]);
  const weekAgo = shiftDay(day, -7);
  const weekAgoTomorrow = shiftDay(day, -6);
  let lowest: DailyLow | null = null;
  let lastBeforeWeek: DailyLow | null = null;
  for (const p of sorted) {
    if (p.d < day && (!lowest || p.min < lowest.min)) lowest = p;
    if (p.d <= weekAgo) lastBeforeWeek = p;
    if ((p.d > weekAgo && p.d <= weekAgoTomorrow) || p.d >= day) keep.add(p);
  }
  if (lowest) keep.add(lowest);
  if (lastBeforeWeek) keep.add(lastBeforeWeek);
  return sorted.filter((p) => keep.has(p)).map((p) => [p.d, p.min]);
}

const cfgOf = (cat: Category) => CATEGORIES[cat] as unknown as CategoryConfig<BaseListing>;

export interface CategoryInput {
  latest: Latest;
  history: History;
  imported: Imported;
}

/** Stored photo of a model ("<cat>/<id>", from the images repo's index), if any. */
export type ImageLookup = (cat: Category, modelKey: string) => string | undefined;

export function listFile(cat: Category, input: CategoryInput, builtAt: string, image?: ImageLookup): ListFile {
  const day = builtAt.slice(0, 10);
  const cfg = cfgOf(cat);
  // Only models that are listed now (history.json also keeps a year of delisted ones).
  const keys = new Set(input.latest.listings.map((l) => cfg.modelKey(l)));
  const hist: ListFile['hist'] = {};
  for (const [k, pts] of Object.entries(input.history)) {
    if (keys.has(k)) hist[k] = reduceHistory(pts as HistoryPoint[], day);
  }
  const imported = Object.fromEntries(Object.entries(input.imported).filter(([k]) => keys.has(k)));
  const img: Record<string, string> = {};
  for (const k of keys) {
    const path = image?.(cat, k);
    if (path) img[k] = path;
  }
  return {
    v: 1,
    builtAt,
    updatedAt: input.latest.updatedAt,
    sources: input.latest.sources,
    ...toColumns(input.latest.listings, LIST_SKIP),
    hist,
    imported,
    img,
  };
}

export const detailFile = (latest: Latest): Record<string, string> =>
  Object.fromEntries(latest.listings.map((l) => [l.id, l.url]));

/** Fields the builder never reads. */
const BUILDER_SKIP = new Set(['scrapedAt', 'shopCount', 'shipping', 'total', 'merchant']);

/**
 * One row per offered model: its cheapest listing, with the values the rules take across all of the
 * model's listings (most common socket, board size, measurements…) written onto it, so the
 * builder's functions return the same thing for the one-row model as for the full one:
 * - `title`: the model's distinct shop titles, for the picker search (graphics cards are one
 *   listing each and show their title as their name, so theirs stays as it is);
 * - `drop`: the model's sale (`saleOf`, the picker's "−N%"), which may come from another listing.
 */
function builderRow<S extends Slot>(slot: S, m: Model<SlotListing[S]>): Record<string, unknown> {
  const most = <V>(get: (l: SlotListing[S]) => V | null | undefined) => mostCommon(m.listings.map(get));
  const sale = saleOf(m.listings, m.cheapest);
  // `pop`: the model's popularity (listings, shops, sites), the one input of the Recommended sort a
  // one-row model can't recompute (src/lib/ranking.ts popularityRaw), as a small integer.
  const row: Record<string, unknown> = { ...m.cheapest, drop: sale?.pct ?? null, pop: Math.round(POP_SCALE * popularityRaw(m)) };
  if (slot !== 'gpu') row.title = [...new Set(m.listings.map((l) => l.title))].join(' | ');
  const any = m as Model<never>;
  switch (slot) {
    case 'cpu':
      Object.assign(row, { socket: cpuSocket(any), igpu: cpuHasIgpu(any) });
      break;
    case 'mobo':
      Object.assign(row, {
        socket: moboSocket(any),
        memory: moboMemory(any),
        formFactor: moboForm(any),
        ramSlots: most((l) => (l as MoboListing).ramSlots),
      });
      break;
    case 'case':
      Object.assign(row, {
        // Only the stated size: the builder tells it apart from the guess by case size.
        maxBoard: caseBoardStated(any),
        gpuMaxMm: caseGpuMax(any),
        coolerMaxMm: caseCoolerMax(any),
        fanSlots: caseFanSlots(any),
        radiatorMounts: caseRadiators(any),
        fanMounts: caseFanMounts(any),
        fansIncluded: caseFansIncluded(any),
        hasFans: (any as Model<CaseListing>).listings.some((l) => l.hasFans) || null,
        radiators: caseRadiatorSizes(any),
      });
      break;
    case 'cooler':
      Object.assign(row, { sockets: most((l) => (l as CoolerListing).sockets), heightMm: coolerHeight(any) });
      break;
  }
  return row;
}

/** Share (%) of the parts whose measurements are known yet; the builder shows a notice under 90%. */
const share = <L extends BaseListing>(ms: Model<L>[], known: (m: Model<L>) => boolean) =>
  ms.length ? Math.round((100 * ms.filter(known).length) / ms.length) : 100;

/**
 * Per builder slot, one row per model it can offer (`candidates` with an empty build is exactly the
 * "enough known data" rule); grouping the rows again in the browser gives the same models.
 */
export function builderFile(
  all: Partial<Record<Category, Latest>>,
  builtAt: string,
  image?: ImageLookup,
): { file: BuilderFile; extra: BuilderExtra; lazy: Record<string, BuilderSlotFile> } {
  const slots: BuilderFile['slots'] = {};
  const extra: BuilderExtra = { urls: {}, titles: {} };
  const lazy: Record<string, BuilderSlotFile> = {};
  const models: Partial<Record<Slot, Model<BaseListing>[]>> = {};
  for (const slot of SLOTS) {
    const listings = (all[slot as Category]?.listings ?? []) as SlotListing[typeof slot][];
    const grouped = slotModels(slot, listings);
    models[slot] = grouped as Model<BaseListing>[];
    const rows = candidates(slot, grouped, {}).map((m) => builderRow(slot, m));
    for (const r of rows) r.img = image?.(slot as Category, cfgOf(slot as Category).modelKey(r as unknown as BaseListing)) ?? null;
    // A slot in its own file (/data/builder-<slot>.json, loaded when needed) keeps its links and titles.
    if (LAZY_SLOTS.includes(slot)) {
      lazy[slot] = { v: 1, builtAt, ...toColumns(rows, BUILDER_SKIP) };
      continue;
    }
    // Links and search titles are only needed after the builder has appeared: builder-extra.json.
    for (const r of rows) {
      const id = r.id as string;
      extra.urls[id] = r.url as string;
      r.url = null;
      if (slot !== 'gpu') {
        extra.titles[id] = r.title as string;
        r.title = '';
      }
    }
    slots[slot] = toColumns(rows, BUILDER_SKIP);
  }
  const coverage = {
    gpu: share((models.gpu ?? []).filter((m) => !m.pro) as Model<GpuListing>[], (m) => gpuLength(m) != null),
    case: share((models.case ?? []) as Model<CaseListing>[], (m) => caseGpuMax(m) != null),
    cooler: share((models.cooler ?? []) as Model<CoolerListing>[], (m) => coolerSockets(m).length > 0),
  };
  return { file: { v: 1, builtAt, slots, coverage }, extra, lazy };
}

export function manifest(
  all: Partial<Record<Category, Latest>>,
  builder: BuilderFile,
  builtAt: string,
  history: Partial<Record<Category, History>> = {},
  lazy: Record<string, Columns> = {},
): Manifest {
  const cats: Manifest['cats'] = {};
  for (const cat of CATEGORY_IDS) {
    const latest = all[cat];
    if (!latest) continue;
    cats[cat] = {
      models: groupModels(latest.listings, cfgOf(cat)).length,
      listings: latest.listings.length,
      historyPoints: Object.values(history[cat] ?? {}).reduce((n, pts) => n + pts.length, 0),
      updatedAt: latest.updatedAt,
      sources: Object.fromEntries(Object.entries(latest.sources).map(([s, m]) => [s, { updatedAt: m?.updatedAt ?? null, ok: !!m?.ok }])),
    };
  }
  const offered = Object.fromEntries(
    Object.entries({ ...builder.slots, ...lazy }).map(([slot, c]) => [
      slot,
      slotModels(slot as (typeof SLOTS)[number], fromColumns(c)).length,
    ]),
  );
  return { builtAt, cats, builder: offered };
}

// ---------- Publishing check ----------

/**
 * A new build may lose at most this share of a category's models or listings compared with the
 * site that is live now. A failing source keeps its previous listings in the scraper, so normal
 * runs move by a few percent; a bigger drop means broken data, and the build stops so Vercel keeps
 * the live version. History points count too (history must never shrink, scraper/merge_history.py).
 * For a planned drop (merging duplicate products, removing a source) tag the commit message with
 * [allow-data-drop] or set DATA_CHECK=off (vite-plugin-data.ts).
 */
export const MAX_DROP = 0.3;

/**
 * Minimum models per category when there is no live manifest to compare with (first deploy, or
 * the live site unreachable): about half of the 2026-10-01 counts.
 */
export const MIN_MODELS: Record<Category, number> = {
  gpu: 49, // of 98
  cpu: 208, // of 417
  mobo: 606, // of 1212
  ram: 244, // of 489
  psu: 93, // of 186
  case: 1365, // of 2730
  fan: 1003, // of 2006
  cooler: 1059, // of 2118
  storage: 1115, // of 2231 (first storage scrape 2026-10-03, re-normalized without OEM laptop M.2 drives)
};

/** Every problem found; an empty list means the data can be published. */
export function checkData(next: Manifest, live: Manifest | null): string[] {
  const problems: string[] = [];
  for (const cat of CATEGORY_IDS) {
    const n = next.cats[cat];
    if (!n || n.listings === 0 || n.models === 0) {
      problems.push(`${cat}: no listings`);
      continue;
    }
    const was = live?.cats[cat];
    if (was) {
      for (const field of ['models', 'listings', 'historyPoints'] as const) {
        const now = n[field] ?? 0;
        const before = was[field];
        if (before != null && now < before * (1 - MAX_DROP)) {
          problems.push(`${cat}: ${now} ${field}, live site has ${before} (more than ${MAX_DROP * 100}% fewer)`);
        }
      }
    } else if (n.models < MIN_MODELS[cat]) {
      problems.push(`${cat}: only ${n.models} models (minimum ${MIN_MODELS[cat]} without a live site to compare with)`);
    }
  }
  for (const slot of SLOTS) {
    if (!next.builder[slot]) problems.push(`builder: nothing to offer for ${slot}`);
  }
  return problems;
}

/**
 * The global search's index (src/lib/search.ts), loaded only when the search box is used: per category,
 * every model's shown name and exact cheapest price (the same price the lists show), most popular first,
 * and the makers (graphics cards: the card maker).
 */
export function searchFile(all: Partial<Record<Category, Latest>>, builtAt: string): SearchIndexFile {
  const cats: SearchIndexFile['cats'] = {};
  for (const cat of CATEGORY_IDS) {
    const latest = all[cat];
    if (!latest) continue;
    const models = groupModels(latest.listings, cfgOf(cat))
      .map((m) => ({ m, pop: popularityRaw(m) }))
      .sort((a, b) => b.pop - a.pop || a.m.chip.localeCompare(b.m.chip));
    const maker = (l: BaseListing) => (cat === 'gpu' ? (l as BaseListing & { partner?: string }).partner : l.brand);
    cats[cat] = {
      m: models.map(({ m }) => [m.chip, m.cheapest.price]),
      mk: [...new Set(latest.listings.map(maker).filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b)),
    };
  }
  return { builtAt, cats };
}
