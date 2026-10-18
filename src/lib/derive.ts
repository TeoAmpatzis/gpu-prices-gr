// Smaller files for the site, derived at build time from the scraper's JSON (latest.json,
// history.json, history_imported.json stay exactly as the scraper writes them).
//
// - /data/<cat>/list.v2.json   the category page: every listing (filters and counts need all of them)
//   as columns, without shop URLs and scrape times, plus a few daily lows per model;
// - /data/<cat>/detail.json listing id → shop URL, loaded when a product is opened (together with
//   the full history.json for the chart);
// - /data/builder.json      only the parts the PC builder can offer, grouped by the same code;
// - /data/<cat>/model/<nnn>.json  the product pages: 256 files per category, each model (listings with links,
//   full history, variants, alternatives…) in the file of its address slug (src/lib/modelData.ts);
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
  FanListing,
  GpuListing,
  History,
  HistoryPoint,
  Imported,
  Latest,
  ListFile,
  Manifest,
  MoboListing,
  ModelChunk,
  ModelEntry,
  PsuListing,
  RamListing,
  StorageListing,
} from '../types';
import { CATEGORIES, CATEGORY_IDS, type CategoryConfig } from './categories';
import { OTHER, storageType } from './categoryRules';
import { fromColumns, modelKeys } from './columns';
import { implausibleDips, isDipPrice } from './dips';
import { allTimeLow, groupModels, mostCommon, saleOf, type Model } from './data';
import { MODEL_CHUNKS, modelChunkOf } from './modelData';
import { SLOT_OF, toPart } from './pick';
import { modelSlug } from './slug';
import { POP_SCALE, popularityRaw, recommendedScores } from './ranking';
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
// Board fields for v2's rules (Phase 2): collected now, not shown or checked by v1.
const V2_ONLY = ['m2Slots', 'm2Gen', 'sataPorts', 'maxMemoryGB', 'biosFlashback'];
const LIST_SKIP = new Set([...DETAIL_ONLY, 'fanMounts', 'fansIncluded', 'radiators', 'airflowCfm', 'pressureMm', ...V2_ONLY]);

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

/**
 * `hist` in its compact form (decoded by columns.decodeHist): per model a flat list of numbers, [days from
 * `histBase` of the first point, price in cents, then days since the previous point, price in cents, …].
 */
export function encodeHist(reduced: Record<string, [string, number][]>): Pick<ListFile, 'hist' | 'histBase'> {
  const days = (d: string) => Math.round(Date.parse(`${d}T00:00:00Z`) / 864e5);
  let first = Infinity;
  for (const pts of Object.values(reduced)) for (const [d] of pts) first = Math.min(first, days(d));
  const hist: ListFile['hist'] = {};
  for (const [k, pts] of Object.entries(reduced)) {
    const v: number[] = [];
    let prev = first;
    for (const [d, min] of pts) {
      v.push(days(d) - prev, Math.round(min * 100));
      prev = days(d);
    }
    hist[k] = v;
  }
  return { hist, histBase: new Date((Number.isFinite(first) ? first : 0) * 864e5).toISOString().slice(0, 10) };
}

/** Bit i of the base64 bitset (byte i>>3, bit i&7) = the i-th model key, sorted, has a photo. */
function encodePhotos(keys: string[], has: Set<string>): string {
  const bytes = new Uint8Array((keys.length + 7) >> 3);
  keys.forEach((k, i) => {
    if (has.has(k)) bytes[i >> 3] |= 1 << (i & 7);
  });
  return btoa(String.fromCharCode(...bytes));
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
  const reduced: Record<string, [string, number][]> = {};
  // Every current model gets an entry (maybe empty): the photo bitset is over these keys.
  for (const k of keys) reduced[k] = [];
  // C6: implausible short dips (src/lib/dips.ts) are left out before reducing, so the browser's all-time
  // low and week change (whose comparison points skip them too) never see them; an imported low that is
  // one of those dips is dropped from `imported` for the same reason.
  const imported = Object.fromEntries(Object.entries(input.imported).filter(([k]) => keys.has(k)));
  for (const [k, pts] of Object.entries(input.history)) {
    if (!keys.has(k)) continue;
    const dips = implausibleDips(pts as HistoryPoint[]);
    reduced[k] = reduceHistory(dips.size ? (pts as HistoryPoint[]).filter((p) => !dips.has(p)) : (pts as HistoryPoint[]), day);
    if (imported[k] !== undefined) imported[k] = importedWithoutDip(imported[k], dips);
  }
  const withPhoto = new Set([...keys].filter((k) => image?.(cat, k)));
  const { hist, histBase } = encodeHist(reduced);
  return {
    v: 2,
    builtAt,
    updatedAt: input.latest.updatedAt,
    sources: input.latest.sources,
    ...toColumns(input.latest.listings, LIST_SKIP),
    hist,
    histBase,
    imported,
    photos: encodePhotos(modelKeys({ hist }), withPhoto),
  };
}

/** C6: an imported all-time low that is one of the model's dips is left out (list files and model chunks alike). */
function importedWithoutDip(imp: Imported[string], dips: Set<DailyLow>): Imported[string] {
  return dips.size && typeof imp === 'object' && imp.low != null && isDipPrice(imp.low, dips) ? { ...imp, low: undefined } : imp;
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
  const sale = saleOf(m.listings, m.cheapest);
  // `pop`: the model's popularity (listings, shops, sites), the one input of the Recommended sort a
  // one-row model can't recompute (src/lib/ranking.ts popularityRaw), as a small integer.
  const row: Record<string, unknown> = { ...m.cheapest, drop: sale?.pct ?? null, pop: Math.round(POP_SCALE * popularityRaw(m)) };
  if (slot !== 'gpu') row.title = [...new Set(m.listings.map((l) => l.title))].join(' | ');
  return Object.assign(row, slotFields(slot, m));
}

/**
 * The values the rules take across all of a model's listings (most common socket, board size,
 * measurements…), per slot: written onto the builder's one-row model, and onto the engine part of
 * the category pages' "pick" mode, so both see the same numbers.
 */
export function slotFields<S extends Slot>(slot: S, m: Model<SlotListing[S]>): Record<string, unknown> {
  const most = <V>(get: (l: SlotListing[S]) => V | null | undefined) => mostCommon(m.listings.map(get));
  const any = m as Model<never>;
  switch (slot) {
    case 'cpu':
      return { socket: cpuSocket(any), igpu: cpuHasIgpu(any) };
    case 'mobo':
      return {
        socket: moboSocket(any),
        memory: moboMemory(any),
        formFactor: moboForm(any),
        ramSlots: most((l) => (l as MoboListing).ramSlots),
      };
    case 'case':
      return {
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
      };
    case 'cooler':
      return { sockets: most((l) => (l as CoolerListing).sockets), heightMm: coolerHeight(any) };
    default:
      return {};
  }
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

// ---------- Product pages: model chunks ----------

/**
 * A model's family for its variants ("same product, other sizes") and the label of its size in it. Only these
 * four categories have variants; a model whose family can't be told (RAM without a stated speed, PSU without a
 * stated efficiency, a drive name without its capacity) has none.
 */
interface Family {
  id: string;
  label: string;
  order: number; // variants are listed smallest first
}

/** Capacity in a drive's name ("Samsung 990 Pro 2TB", "Micron 7600 Pro 7.68TB"): the last one. */
const CAPACITY_IN_NAME = /(?<![\w.])\d+(?:\.\d+)?\s?[GT]B(?!\w)/gi;

const FAMILY: Partial<Record<Category, (l: BaseListing) => Family | null>> = {
  // Same chip, other VRAM.
  gpu: (l) => {
    const g = l as GpuListing;
    return { id: g.chip, label: `${g.vram}GB`, order: g.vram };
  },
  // Same vendor + series (the name without its capacity) and media, other capacity.
  storage: (l) => {
    const d = l as StorageListing;
    const caps = [...d.chip.matchAll(CAPACITY_IN_NAME)];
    const cap = caps[caps.length - 1];
    if (!cap || cap.index == null) return null;
    const series = `${d.chip.slice(0, cap.index)} ${d.chip.slice(cap.index + cap[0].length)}`.toLowerCase().replace(/[^a-z0-9]/g, '');
    return { id: `${series} ${d.media}`, label: cap[0].replace(/\s/g, ''), order: d.capacity };
  },
  // Same type + speed + form factor, other kit.
  ram: (l) => {
    const r = l as RamListing;
    if (r.speed == null) return null;
    const kit = /\d+GB \(\d+×\d+GB\)/.exec(r.chip)?.[0] ?? `${r.capacity}GB`;
    return { id: `${r.type} ${r.speed} ${r.formFactor}`, label: kit, order: r.capacity * 1000 + r.modules };
  },
  // Same efficiency (and form factor: an SFX unit is not an ATX one in another size), other wattage.
  psu: (l) => {
    const p = l as PsuListing;
    if (p.efficiency == null) return null;
    return { id: `${p.efficiency} ${p.formFactor}`, label: `${p.watts}W`, order: p.watts };
  },
};

/**
 * "Better value" alternatives must be able to replace the model: besides the same segment (consumer / NAS /
 * server…), the same memory type and form factor, fan size, drive type, PSU form factor. Graphics cards of any
 * maker or brand replace each other.
 */
const SAME_KIND: Partial<Record<Category, (l: BaseListing) => string>> = {
  ram: (l) => `${(l as RamListing).type} ${(l as RamListing).formFactor}`,
  fan: (l) => String((l as FanListing).size),
  storage: (l) => storageType(l as StorageListing),
  psu: (l) => (l as PsuListing).formFactor,
};

/**
 * The "kind" a "same, cheaper" alternative must share with the model (owner's definition, Task 4 fix round 1);
 * null = the model has no such list (socket or size unknown, a server CPU…):
 * - CPU: same socket, desktop only (the category's pro split, server / HEDT, is left out on both sides);
 * - board: same socket and board size;
 * - case: same size group (the category's pill group, e.g. Midi Tower): the size most of its listings state, so one
 *   shop's "Άλλο" doesn't move a Full Tower into "Άλλο" (the model's own `group` is its cheapest listing's);
 * - cooler: same type (air; AIO with the same radiator size);
 * - fan: same size.
 * Graphics cards, RAM, drives and PSUs have none: their variants cover the other sizes (and a chip's cheaper cards
 * are its offers).
 */
const CHEAPER_KIND: Partial<Record<Category, (m: Model<BaseListing>) => string | null>> = {
  cpu: (m) => (m.pro ? null : cpuSocket(m as Model<never>)),
  mobo: (m) => {
    const socket = moboSocket(m as Model<never>);
    const form = moboForm(m as Model<never>);
    return socket && form ? `${socket} ${form}` : null;
  },
  case: (m) => mostCommon(m.listings.map((l) => (l as CaseListing).size).filter((s) => s !== OTHER)) ?? OTHER,
  cooler: (m) => {
    const c = m.cheapest as CoolerListing;
    return c.type === 'Air' ? 'Air' : c.radiator ? `AIO ${c.radiator}` : null;
  },
  fan: (m) => String((m.cheapest as FanListing).size),
};

/** Whether `b` can be a "same, cheaper" alternative of `a` by kind (CHEAPER_KIND above; price not checked here). */
export function sameKind(cat: Category, a: Model<BaseListing>, b: Model<BaseListing>): boolean {
  const kind = CHEAPER_KIND[cat];
  const k = kind?.(a) ?? null;
  return k != null && k === kind!(b);
}

/** At most this many alternatives of each kind. */
export const ALTERNATIVES = 3;
/** "Same, cheaper" alternatives cost at least this share less than the model now. */
export const CHEAPER_BY = 0.05;
/** "Better value" alternatives cost within this share of the model's price. */
export const VALUE_BAND = 0.1;

/**
 * The product pages' data of a category (plan step 4, task 4): every current model in the chunk of its slug
 * (modelData.modelChunkOf), with all its listings (links included), its full history (the chart; the implausible
 * dips' dates so it can mark them), the imported Skroutz entry, its engine parts (fit with the saved build),
 * variants and alternatives. 256 chunks, empty ones included, so every address has a file.
 */
export function modelChunks(cat: Category, input: CategoryInput, builtAt: string, image?: ImageLookup): ModelChunk[] {
  const cfg = cfgOf(cat);
  const family = FAMILY[cat];
  const kind = SAME_KIND[cat];
  const cheaperKind = CHEAPER_KIND[cat];
  const slot = (SLOT_OF as Partial<Record<Category, Slot>>)[cat];
  const day = builtAt.slice(0, 10);
  // As the category page has them for its Recommended sort (data.filterModels): the site's sale and the all-time low,
  // the low from what the page gets (listFile: the reduced history without the dips, `imported` without a dip low).
  const models = groupModels(input.latest.listings, cfg).map((m) => {
    const history = (input.history[m.key] ?? []) as HistoryPoint[];
    const dips = implausibleDips(history);
    const imp = input.imported[m.key];
    const imported = imp === undefined ? null : importedWithoutDip(imp, dips);
    const reduced = reduceHistory(dips.size ? history.filter((p) => !dips.has(p)) : history, day).map(([d, min]) => ({ d, min }));
    return {
      ...m,
      sale: saleOf(m.listings, m.cheapest),
      low: allTimeLow(reduced, imported ?? undefined, m.cheapest.price),
      history,
      dips,
      imported,
    };
  });
  // The Recommended score (src/lib/ranking.ts), over all of the category's models (the page scores the models it
  // shows, so its numbers differ by filter; the order among models of one kind is what matters here).
  const recommended = recommendedScores(models, cat, cfg.value);
  const items = models.map((m) => {
    const fam = family?.(m.cheapest) ?? null;
    const same = cheaperKind?.(m) ?? null;
    return {
      m,
      slug: modelSlug(cat, m),
      fam,
      price: m.cheapest.price,
      value: cfg.value?.(m) ?? null,
      rec: recommended.get(m.key) ?? 0,
      cheaperBucket: same, // models in one bucket are the same kind (sameKind)
      valueBucket: `${m.segment}\0${kind?.(m.cheapest) ?? ''}`,
    };
  });
  type Item = (typeof items)[number];
  const bucketsOf = (key: (it: Item) => string | null) => {
    const out = new Map<string, Item[]>();
    for (const it of items) {
      const k = key(it);
      if (k == null) continue;
      const arr = out.get(k);
      if (arr) arr.push(it);
      else out.set(k, [it]);
    }
    return out;
  };
  const byKey = (a: Item, b: Item) => (a.m.key < b.m.key ? -1 : a.m.key > b.m.key ? 1 : 0);
  const families = bucketsOf((it) => it.fam?.id ?? null);
  for (const arr of families.values()) arr.sort((a, b) => a.fam!.order - b.fam!.order || a.price - b.price || byKey(a, b));
  const cheaperBuckets = bucketsOf((it) => it.cheaperBucket);
  for (const arr of cheaperBuckets.values()) arr.sort((a, b) => b.rec - a.rec || a.price - b.price || byKey(a, b));
  const valueBuckets = bucketsOf((it) => (it.value == null ? null : it.valueBucket));
  for (const arr of valueBuckets.values()) arr.sort((a, b) => b.value! - a.value! || a.price - b.price || byKey(a, b));

  const alternative = (kind: 'cheaper' | 'value', o: Item): ModelEntry['alternatives'][number] => ({
    kind,
    key: o.m.key,
    slug: o.slug,
    chip: o.m.chip,
    price: o.price,
    img: image?.(cat, o.m.key) != null,
  });

  const chunks: ModelChunk[] = Array.from({ length: MODEL_CHUNKS }, () => ({ v: 1, builtAt, sources: input.latest.sources, models: {} }));
  for (const it of items) {
    const { m } = it;
    // The best Recommended ones of the same kind that cost at least 5% less (the bucket is sorted by that score).
    const cheaper =
      it.cheaperBucket == null
        ? []
        : cheaperBuckets
            .get(it.cheaperBucket)!
            .filter((o) => o.price <= it.price * (1 - CHEAPER_BY))
            .slice(0, ALTERNATIVES);
    const better =
      it.value == null
        ? []
        : (valueBuckets.get(it.valueBucket) ?? [])
            .filter((o) => o !== it && o.value! > it.value! && Math.abs(o.price - it.price) <= it.price * VALUE_BAND)
            .slice(0, ALTERNATIVES);
    const entry: ModelEntry = {
      key: m.key,
      chip: m.chip,
      slug: it.slug,
      photo: !!image?.(cat, m.key), // as listFile's photo bitset
      listings: m.listings,
      history: m.history,
      dips: [...m.dips].map((p) => p.d).sort(),
      imported: m.imported,
      // By the builder's key (builder.slotModels): a graphics card per listing, a CPU per chip + cooler in the box,
      // other parts the model itself; each with its own engine fields.
      parts: slot
        ? Object.fromEntries(slotModels(slot, m.listings as never[]).map((p) => [p.key, toPart(slot, p as never).fields]))
        : null,
      variants: it.fam
        ? families
            .get(it.fam.id)!
            .filter((o) => o !== it)
            .map((o) => ({ key: o.m.key, slug: o.slug, label: o.fam!.label, price: o.price }))
        : [],
      alternatives: [...cheaper.map((o) => alternative('cheaper', o)), ...better.map((o) => alternative('value', o))],
    };
    chunks[modelChunkOf(it.slug)].models[it.slug] = entry;
  }
  return chunks;
}

/**
 * Publishing check of the model chunks: all 256 files, each entry in the file of its slug, and every current
 * model (the manifest's count, grouped by the same code) exactly once.
 */
function modelChunkProblems(cat: Category, models: number, chunks: ModelChunk[] | undefined): string[] {
  if (!chunks || chunks.length !== MODEL_CHUNKS) return [`${cat}: ${chunks?.length ?? 0} model chunk files, expected ${MODEL_CHUNKS}`];
  const seen = new Map<string, number>();
  let misplaced = 0;
  chunks.forEach((c, n) => {
    for (const [slug, e] of Object.entries(c.models)) {
      if (modelChunkOf(slug) !== n || e.slug !== slug) misplaced++;
      seen.set(e.key, (seen.get(e.key) ?? 0) + 1);
    }
  });
  const problems: string[] = [];
  if (misplaced) problems.push(`${cat}: ${misplaced} model chunk entries not in the file of their slug`);
  const twice = [...seen.values()].filter((n) => n > 1).length;
  if (twice) problems.push(`${cat}: ${twice} models in more than one model chunk entry`);
  if (seen.size !== models) problems.push(`${cat}: ${seen.size} models in the model chunks, ${models} current models`);
  return problems;
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

/**
 * Every problem found; an empty list means the data can be published. With `models` (the build's model chunks),
 * also every current model of each category must be in exactly one chunk entry, in the file of its slug.
 */
export function checkData(next: Manifest, live: Manifest | null, models?: Partial<Record<Category, ModelChunk[]>>): string[] {
  const problems: string[] = [];
  for (const cat of CATEGORY_IDS) {
    const n = next.cats[cat];
    if (!n || n.listings === 0 || n.models === 0) {
      problems.push(`${cat}: no listings`);
      continue;
    }
    if (models) problems.push(...modelChunkProblems(cat, n.models, models[cat]));
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
