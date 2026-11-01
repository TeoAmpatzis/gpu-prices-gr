// Smaller files for the site, derived at build time from the scraper's JSON (latest.json,
// history.json, history_imported.json stay exactly as the scraper writes them).
//
// - /data/<cat>/list.v2.json   the category page: every listing (filters and counts need all of them)
//   as columns, without shop URLs and scrape times, plus a few daily lows per model;
// - /data/<cat>/detail.json listing id → shop URL, loaded when a product is opened (together with
//   the full history.json for the chart);
// - /data/builder/index.json, /data/builder/<slot>.json, /data/builder/<slot>-extra.json  the PC builder: the first
//   screen's small index, one file per step with the parts it can offer (grouped by the same code), their links;
// - /data/<cat>/model/<nnn>.json  the product pages: 256 files per category, each model (listings with links,
//   full history, variants, alternatives…) in the file of its address slug (src/lib/modelData.ts);
// - /data/manifest.json     counts, which the next build compares its data with (see checkData).
//
// Pure functions only: vite-plugin-data.ts does the file reading and writing.

import type {
  AutoFile,
  BaseListing,
  BuilderExtraFile,
  BuilderIndex,
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
import { autoFiles, type AutoModels } from './autoBuild';
import { CATEGORIES, CATEGORY_IDS, type CategoryConfig } from './categories';
import { psuBaseKey, psuRowKey } from './psuProduct';
import { OTHER, storageType } from './categoryRules';
import { boxCooler } from '../engine/data/cpuBox';
import { casePsu } from '../engine/data/casePsu';
import { fromColumns, modelKeys } from './columns';
import {
  importGlitches,
  isDipPrice,
  sharedImportedDays,
  sharedImportedLows,
  untrustedPoints,
  withoutSharedLow,
  type SharedDays,
} from './dips';
import { allTimeLow, groupModels, mostCommon, saleOf, type Model } from './data';
import { MODEL_CHUNKS, modelChunkOf } from './modelData';
import { SLOT_OF, toPart } from './pick';
import { modelSlug, nameSlug, slugLookup } from './slug';
import { POP_SCALE, popularityRaw, recommendedScores } from './ranking';
import type { SearchIndexFile, SearchModel } from './search';
import {
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
  fitContext,
  gpuLength,
  gpuTwinKey,
  twinsAgree,
  psuForm,
  rowListing,
  gpuWaterCooled,
  moboForm,
  moboMemory,
  moboSocket,
  slotModels,
  type Slot,
  type SlotListing,
} from './builderData';

/** Only needed when a product is opened (URL) or never shown (scrape time). */
const DETAIL_ONLY = new Set(['url', 'scrapedAt']);
/** Not in list.v2.json either: only the builder reads them (its step files keep them). */
// Fields for v2's rules (Phase 2): collected now, not shown or checked by v1.
const V2_ONLY = [
  'm2Slots', 'm2Gen', 'sataPorts', 'maxMemoryGB', 'biosFlashback', 'atx3', 'bays35', 'bays25', 'usbCFront', 'socketsTitle',
  // Build-time engine fields from the makers' tables (task 5a): the boxed cooler's name, the case's PSU sizes and own power.
  'boxCooler', 'psuFormFactors', 'psuIncluded',
];
// 'formConflict' stays in list.v2.json on purpose: the pick view runs `usable` on those listings (a few dozen boards).
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
  /** The scraper's specs.json (listing id -> product page fields): read at build time for validate/conflicts, never shipped. */
  specs?: Record<string, Record<string, unknown>>;
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
  // C6 dips and task 7b import glitches (src/lib/dips.ts; decided once, in trustedHistory) are left out before
  // reducing, so the browser's all-time low and week change (whose comparison points skip them too) never see
  // them; a shared (glitch) imported low, or one that is one of those dips, is dropped from `imported` too.
  const bad = sharedImportedLows(input.imported);
  const days = sharedDaysOf(input.history);
  const imported = Object.fromEntries(
    Object.entries(input.imported)
      .filter(([k]) => keys.has(k))
      .map(([k, imp]) => [k, withoutSharedLow(imp, bad)]),
  );
  for (const [k, pts] of Object.entries(input.history)) {
    if (!keys.has(k)) continue;
    const t = trustedHistory(pts as HistoryPoint[], imported[k], bad, days);
    reduced[k] = reduceHistory(t.untrusted.size ? t.points.filter((p) => !t.untrusted.has(p)) : t.points, day);
    if (t.imported !== undefined) imported[k] = t.imported;
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

/** dips.sharedImportedDays of a category's history, once per build (listFile and modelChunks both need it). */
const sharedDaysMemo = new WeakMap<History, SharedDays>();
function sharedDaysOf(history: History): SharedDays {
  let days = sharedDaysMemo.get(history);
  if (!days) sharedDaysMemo.set(history, (days = sharedImportedDays(history)));
  return days;
}

/**
 * The one place that decides which of a model's points and which imported low the site trusts (list files and model
 * chunks alike). `bad` = dips.sharedImportedLows over the whole category's history_imported.json, `days` =
 * dips.sharedImportedDays over its whole history.json. `points`: the history with its import glitches (task 7b,
 * dips.importGlitches) marked `g: 1`; `untrusted`: those plus the C6 dips; `imported`: the entry without a shared low
 * or a dip low.
 */
function trustedHistory(
  raw: HistoryPoint[],
  imp: Imported[string] | undefined,
  bad: ReadonlySet<number>,
  days: SharedDays,
) {
  const glitches = importGlitches(raw, days, bad);
  const points = glitches.size ? raw.map((p) => (glitches.has(p) ? { ...p, g: 1 as const } : p)) : raw;
  const untrusted = untrustedPoints(points);
  const imported = imp === undefined ? undefined : importedWithoutDip(withoutSharedLow(imp, bad), untrusted);
  return { points, untrusted, imported };
}

/**
 * Box CPU listings whose shops do not say whether a cooler is in the box get the maker's own answer
 * (src/engine/data/cpuBox.ts), and `boxCooler` = the cooler the page names when it says one is included (rule 11
 * names it). Tray, unknown packaging, chips without a row and a value a shop stated stay as they are.
 */
export function withBoxCoolers(latest: Latest): Latest {
  return {
    ...latest,
    listings: latest.listings.map((l) => {
      const c = l as unknown as { chip: string; packaging?: string | null; coolerIncluded?: boolean | null };
      if (c.packaging !== 'Box' || (c.coolerIncluded ?? null) !== null) return l;
      const b = boxCooler(c.chip);
      if (!b) return l;
      return b.included && b.cooler ? { ...l, coolerIncluded: true, boxCooler: b.cooler } : { ...l, coolerIncluded: b.included };
    }),
  } as Latest;
}

/**
 * Case listings of a model with a row in src/engine/data/casePsu.ts get the maker's PSU statement: `psuFormFactors`
 * (the sizes the case takes) and, when the case brings its own power, `psuIncluded` ('external' or the unit).
 * Rule 16 reads them as stated. Other cases stay as they are.
 */
export function withCasePsu(latest: Latest): Latest {
  const key = cfgOf('case').modelKey;
  return {
    ...latest,
    listings: latest.listings.map((l) => {
      const row = casePsu(key(l));
      if (!row) return l;
      return { ...l, psuFormFactors: [...row.forms], ...(row.included ? { psuIncluded: row.included } : {}) };
    }),
  } as Latest;
}

/** The makers' tables applied at build time, per category (after validation and conflicts). */
export function withMakerTables(cat: Category, latest: Latest): Latest {
  if (cat === 'cpu') return withBoxCoolers(latest);
  if (cat === 'case') return withCasePsu(latest);
  if (cat === 'psu') return withPsuProducts(latest);
  return latest;
}

/**
 * Power supply products (step 5 task 7, review I1): a product is a series at one efficiency. A listing that states
 * none gets `productEfficiency` = the one efficiency its series' listings (same maker, series, watts, form
 * factor) state; with none stated, or several (review R1), it stays a product of unknown efficiency. Never mutates its input; the
 * category page's spec groups (`efficiency`) are untouched.
 */
export function withPsuProducts(latest: Latest): Latest {
  const listings = latest.listings as PsuListing[];
  const stated = new Map<string, Map<string, number>>();
  for (const l of listings) {
    if (!l.efficiency) continue;
    const base = psuBaseKey(l);
    if (base.startsWith('id:')) continue;
    const counts = stated.get(base) ?? new Map<string, number>();
    counts.set(l.efficiency, (counts.get(l.efficiency) ?? 0) + 1);
    stated.set(base, counts);
  }
  const attach = (base: string): PsuListing['efficiency'] => {
    const counts = [...(stated.get(base) ?? new Map<string, number>())].sort((a, b) => b[1] - a[1]);
    return counts.length === 1 ? (counts[0][0] as PsuListing['efficiency']) : null;
  };
  return {
    ...latest,
    listings: listings.map((l) => {
      if (l.efficiency) return l;
      const eff = attach(psuBaseKey(l));
      return eff ? { ...l, productEfficiency: eff } : l;
    }) as Latest['listings'],
  };
}

export const detailFile = (latest: Latest): Record<string, string> =>
  Object.fromEntries(latest.listings.map((l) => [l.id, l.url]));

/** Fields the builder never reads. */
// `total` stays: the "incl. shipping" note shows the stored total of the row's own offer (task 7, review M2).
const BUILDER_SKIP = new Set(['scrapedAt', 'shopCount', 'shipping', 'merchant']);

/**
 * One row per offered model: its cheapest listing by price + shipping where known (`rowListing`, owner answer 11;
 * `ship` = its shipping, null = not known), with the values the rules take across all of the
 * model's listings (most common socket, board size, measurements…) written onto it, so the
 * builder's functions return the same thing for the one-row model as for the full one:
 * - `title`: the model's distinct shop titles, the row's own first, for the picker search (graphics cards are one
 *   listing each and show their title as their name, so theirs stays as it is);
 * - `drop`: the model's sale (`saleOf`, the picker's "−N%"), which may come from another listing.
 */
function builderRow<S extends Slot>(slot: S, m: Model<SlotListing[S]>): Record<string, unknown> {
  const { listing, ship } = rowListing(m.listings);
  const sale = saleOf(m.listings, listing);
  // `pop`: the model's popularity (listings, shops, sites), the one input of the Recommended sort a
  // one-row model can't recompute (src/lib/ranking.ts popularityRaw), as a small integer.
  const row: Record<string, unknown> = { ...listing, ship, drop: sale?.pct ?? null, pop: Math.round(POP_SCALE * popularityRaw(m)) };
  if (slot !== 'gpu') {
    // The row listing's own title first: Review and Copy list name that variant (copyList.ownTitle).
    row.title = [...new Set([listing.title, ...m.listings.map((l) => l.title)])].join(' | ');
    // The model's name, whichever listing the row is (a power supply's is its product name; a card's chip is a rule input).
    row.chip = m.chip;
  }
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
    case 'gpu':
      // A merged card (twins on several sites, task 7) keeps a length any of them states (twinsAgree: at most one;
      // the longer if not, as specs.SAFER) and the largest stated minimum PSU (review I2).
      return {
        lengthMm: maxOf(m.listings.map((l) => (l as GpuListing).lengthMm)),
        minPsu: maxOf(m.listings.map((l) => (l as GpuListing).minPsu)),
      };
    case 'psu':
      // SFX-L when a title says so (task 7): rule 16 tells it from SFX.
      return { formFactor: psuForm(any as Model<PsuListing>) };
    default:
      return {};
  }
}

/**
 * Graphics card twins (task 7, owner answer 9): the offered cards of one `gpuTwinKey` become one model (the same card
 * on several sites; its row is the cheapest by `rowListing`, the others its offers) when they agree (`twinsAgree`).
 * Order: each group's first card.
 */
export function mergeTwins(cards: Model<GpuListing>[]): Model<GpuListing>[] {
  const groups = new Map<string, Model<GpuListing>[]>();
  for (const m of cards) {
    const k = gpuTwinKey(m.cheapest);
    groups.set(k, [...(groups.get(k) ?? []), m]);
  }
  return [...groups.values()].flatMap((ms) => {
    if (ms.length === 1 || !twinsAgree(ms.map((m) => m.cheapest))) return ms;
    const listings = ms.flatMap((m) => m.listings).sort((a, b) => a.price - b.price);
    const own = rowListing(listings).listing;
    const lead = ms.find((m) => m.listings.some((l) => l.id === own.id))!;
    return { ...lead, listings, maxPrice: listings[listings.length - 1].price };
  });
}

/** The largest stated value, null when none is. */
function maxOf(vs: (number | null | undefined)[]): number | null {
  const known = vs.filter((v): v is number => v != null);
  return known.length ? Math.max(...known) : null;
}

/** Share (%) of the parts whose measurements are known yet; the builder shows a notice under 90%. */
const share = <L extends BaseListing>(ms: Model<L>[], known: (m: Model<L>) => boolean) =>
  ms.length ? Math.round((100 * ms.filter(known).length) / ms.length) : 100;

/** The builder's files (src/types.ts BuilderIndex, BuilderSlotFile, BuilderExtraFile), by slot. */
export interface BuilderFiles {
  index: BuilderIndex;
  slots: Record<Slot, BuilderSlotFile>;
  extras: Record<Slot, BuilderExtraFile>;
  /** /data/builder/auto.json (step 5 task 10). */
  auto: AutoFile;
}

/**
 * Per builder slot, one row per model it can offer (`candidates` with an empty build is exactly the
 * "enough known data" rule), in its own file; grouping the rows again in the browser gives the same models.
 * The rows carry the listing's fields (the engine's `pick.PART_FIELDS` among them) plus `pop`, `img`, `drop`;
 * shop links and search titles go to the slot's extra file (graphics cards keep their title: it is their name).
 */
export function builderFiles(all: Partial<Record<Category, Latest>>, builtAt: string, image?: ImageLookup): BuilderFiles {
  const slots = {} as Record<Slot, BuilderSlotFile>;
  const extras = {} as Record<Slot, BuilderExtraFile>;
  const counts = {} as BuilderIndex['slots'];
  const models: Partial<Record<Slot, Model<BaseListing>[]>> = {};
  let offeredGpus: Model<GpuListing>[] = [];
  for (const slot of SLOTS) {
    const listings = (all[slot as Category]?.listings ?? []) as SlotListing[typeof slot][];
    const grouped = slotModels(slot, listings);
    models[slot] = grouped as Model<BaseListing>[];
    let offered = candidates(slot, grouped) as Model<BaseListing>[];
    if (slot === 'gpu') {
      offeredGpus = offered as unknown as Model<GpuListing>[];
      offered = mergeTwins(offeredGpus) as unknown as Model<BaseListing>[];
    }
    const extra: BuilderExtraFile = { v: 2, builtAt, urls: {}, titles: {} };
    const rows = offered.map((m) => {
      const r = builderRow(slot, m as Model<SlotListing[typeof slot]>);
      // The photo by the category page's model of the row's own listing (a PSU row's form factor may read SFX-L).
      r.img = image?.(slot as Category, cfgOf(slot as Category).modelKey(rowListing(m.listings).listing)) ?? null;
      // Regrouped in the browser from its name (its title goes to the extra file); the key itself only where that differs.
      if (slot === 'psu' && psuRowKey(r as unknown as PsuListing) !== m.key) r.product = m.key;
      if (slot === 'gpu') r.twins = m.listings.length > 1 ? m.listings.filter((l) => l.id !== r.id).map((l) => l.id).join(',') : null;
      return r;
    });
    for (const r of rows) {
      const id = r.id as string;
      extra.urls[id] = r.url as string;
      r.url = null;
      if (slot !== 'gpu') {
        extra.titles[id] = r.title as string;
        r.title = '';
      }
    }
    slots[slot] = { v: 2, builtAt, ...toColumns(rows, BUILDER_SKIP) };
    extras[slot] = extra;
    counts[slot] = { rows: rows.length, bytes: new TextEncoder().encode(JSON.stringify(slots[slot])).length };
  }
  const coverage = {
    gpu: share((models.gpu ?? []).filter((m) => !m.pro) as Model<GpuListing>[], (m) => gpuLength(m) != null),
    case: share((models.case ?? []) as Model<CaseListing>[], (m) => caseGpuMax(m) != null),
    cooler: share((models.cooler ?? []) as Model<CoolerListing>[], (m) => coolerSockets(m).length > 0),
  };
  // Rule 6 estimates: fitContext over the offered cards (the gpu step file's rows; the browser reads them from the index).
  const chipLengths = Object.fromEntries(fitContext(offeredGpus).chips);
  // The automatic builds and each use's cheapest build (task 10), from the step files' rows grouped as the browser does.
  const rowModels = Object.fromEntries(SLOTS.map((s) => [s, slotModels(s, fromColumns(slots[s]) as never[])])) as unknown as AutoModels;
  const { file: auto, minimum } = autoFiles(rowModels, builtAt, { chipLengths });
  return { index: { v: 2, builtAt, slots: counts, chipLengths, minimum, coverage }, slots, extras, auto };
}

export function manifest(
  all: Partial<Record<Category, Latest>>,
  builder: Partial<Record<Slot, Columns>>,
  builtAt: string,
  history: Partial<Record<Category, History>> = {},
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
  // Models offered per slot, from the slot files' rows grouped again (as the browser does). Graphics cards count every
  // offered card, its twins included (task 7 merges a card's twins into one row; the check compares data, not rows).
  const offered = Object.fromEntries(
    Object.entries(builder).map(([slot, c]) => {
      const rows = fromColumns<BaseListing & { twins?: string | null }>(c);
      const twins = slot === 'gpu' ? rows.reduce((n, r) => n + (r.twins ? r.twins.split(',').length : 0), 0) : 0;
      return [slot, slotModels(slot as Slot, rows as never[]).length + twins];
    }),
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
 *   none states one = "Άλλο" = no list, and never an alternative (owner 17/10: size unknown, so "same kind" can't be checked);
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
  case: (m) => mostCommon(m.listings.map((l) => (l as CaseListing).size).filter((s) => s !== OTHER)),
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
 * The product pages' data of a category (plan step 4, task 4): every current model in the chunk of its slug's lookup
 * form (slug.slugLookup, modelData.modelChunkOf; the slug is the canonical one, from all its listings: task 13),
 * with all its listings (links included), its full history (the chart; the implausible dips' dates so it can mark
 * them), the imported Skroutz entry, its engine parts (fit with the saved build), variants and alternatives.
 * 256 chunks, empty ones included, so every address has a file.
 */
export function modelChunks(cat: Category, input: CategoryInput, builtAt: string, image?: ImageLookup): ModelChunk[] {
  const cfg = cfgOf(cat);
  const family = FAMILY[cat];
  const kind = SAME_KIND[cat];
  const cheaperKind = CHEAPER_KIND[cat];
  const slot = (SLOT_OF as Partial<Record<Category, Slot>>)[cat];
  const day = builtAt.slice(0, 10);
  // As the category page has them for its Recommended sort (data.filterModels): the site's sale and the all-time low,
  // the low from what the page gets (listFile: the reduced history without the dips and import glitches, `imported`
  // without a shared or dip low; both from trustedHistory).
  const bad = sharedImportedLows(input.imported);
  const days = sharedDaysOf(input.history);
  const models = groupModels(input.latest.listings, cfg).map((m) => {
    const t = trustedHistory((input.history[m.key] ?? []) as HistoryPoint[], input.imported[m.key], bad, days);
    const { points: history, untrusted: dips } = t;
    const imported = t.imported ?? null;
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
  // Graphics cards: the builder's chip length range (builder.fitContext, its ESTIMATE rule, over the same rows as
  // the builder's gpu step file: candidates()) for a card with no measured
  // length of its own; none for a water-cooled card (its length is not the chip's).
  const chipLengths = cat === 'gpu' ? fitContext(candidates('gpu', slotModels('gpu', input.latest.listings as GpuListing[]))).chips : null;
  const lengthRange = (m: Model<BaseListing>): { min: number; max: number } | null => {
    const c = chipLengths?.get(m.cheapest.chip);
    if (!c || m.listings.some((l) => (l as GpuListing).lengthMm != null) || gpuWaterCooled(m.cheapest as GpuListing)) return null;
    return { min: c.min, max: c.max };
  };
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
      variantLabel: it.fam?.label ?? null,
      variantOrder: it.fam?.order ?? null,
      variants: it.fam
        ? families
            .get(it.fam.id)!
            .filter((o) => o !== it)
            .map((o) => ({ key: o.m.key, slug: o.slug, label: o.fam!.label, order: o.fam!.order, price: o.price }))
        : [],
      ...(lengthRange(m) ? { lengthEstimate: lengthRange(m)! } : {}),
      alternatives: [...cheaper.map((o) => alternative('cheaper', o)), ...better.map((o) => alternative('value', o))],
    };
    const k = slugLookup(cat, it.slug); // every spelling of the model finds it (modelData.loadModel)
    chunks[modelChunkOf(k)].models[k] = entry;
  }
  return chunks;
}

/**
 * Publishing check of the model chunks: all 256 files, each entry filed under the lookup form of its slug and in that
 * form's file, and every current model (the manifest's count, grouped by the same code) exactly once (two models
 * sharing a lookup form would leave one out: fewer models than the manifest's).
 */
function modelChunkProblems(cat: Category, models: number, chunks: ModelChunk[] | undefined): string[] {
  if (!chunks || chunks.length !== MODEL_CHUNKS) return [`${cat}: ${chunks?.length ?? 0} model chunk files, expected ${MODEL_CHUNKS}`];
  const seen = new Map<string, number>();
  let misplaced = 0;
  chunks.forEach((c, n) => {
    for (const [k, e] of Object.entries(c.models)) {
      if (modelChunkOf(k) !== n || slugLookup(cat, e.slug) !== k) misplaced++;
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
    const now = next.builder[slot];
    if (!now) {
      problems.push(`builder: nothing to offer for ${slot}`);
      continue;
    }
    // A step's file with far fewer models than the live site's (a slot the live manifest doesn't count: no comparison).
    const before = live?.builder?.[slot];
    if (before != null && now < before * (1 - MAX_DROP)) {
      problems.push(`builder: ${slot} offers ${now} models, live site has ${before} (more than ${MAX_DROP * 100}% fewer)`);
    }
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
      // The slug only where it differs from the name's own (graphics cards, processors, memory, power supplies,
      // drives): the search opens the model's page, /<category>/<slug>.
      m: models.map(({ m }): SearchModel => {
        const slug = modelSlug(cat, m);
        return slug === nameSlug(m.chip) ? [m.chip, m.cheapest.price] : [m.chip, m.cheapest.price, slug];
      }),
      mk: [...new Set(latest.listings.map(maker).filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b)),
    };
  }
  return { builtAt, cats };
}
