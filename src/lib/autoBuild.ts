// The automatic build per budget (step 5 task 10, owner's answers 5–6), computed at build time from today's prices
// (derive.ts writes /data/builder/auto.json and index.json `minimum`; never in the browser's code).
//
// Per platform (AM5 + DDR5, AM4 + DDR4, LGA1851 + DDR5, LGA1700 + DDR5 / DDR4): the cheapest board, RAM and NVMe drive
// that meet the use's minimums (useMinimums.ts) and pass the engine with the CPU; then every CPU with a tier, and for
// gaming every card with a tier at the resolution, with the cheapest cooler (when the CPU has none in the box), case,
// fans (the fan plan, when the case doesn't bring them) and PSU (≥ the larger of the card maker's figure and the
// whole-build formula, known maker, stated efficiency). A build is kept only with no engine error or warning (notes and
// "not verified" are said in the builder, not blocking; rule 27's band is a warning, so it holds). For a budget the
// best card tier wins, then the CPU tier, then the lower price. The parts are the builder's rows (their offer is never
// an unusual one: builderData.rowListing skips those).
import { biosSupport, evaluate, powerEstimate, tierOf, type Context, type Finding, type Part, type RuleId } from '../engine';
import type { AutoFile, BaseListing, BuilderIndex, CaseListing, CoolerListing, CpuListing, FanListing, GpuListing, MoboListing, PsuListing, RamListing, StorageListing } from '../types';
import { cpuSocket, moboMemory, moboSocket, type Build } from './builderData';
import { partOf } from './builderEngine';
import { storageType } from './categoryRules';
import type { Model } from './data';
import { fanPlan } from './fanPlan';
import { psuEfficiency } from './psuProduct';
import { SLOTS, type Slot } from './slots';
import { USE_KEYS, USE_MINIMUMS, engineUseOf, type UseKey } from './useMinimums';

type AnyModel = Model<BaseListing>;
export type AutoModels = { [S in Slot]: AnyModel[] };

export const PLATFORMS: { socket: string; memory: 'DDR4' | 'DDR5' }[] = [
  { socket: 'AM5', memory: 'DDR5' },
  { socket: 'AM4', memory: 'DDR4' },
  { socket: 'LGA1851', memory: 'DDR5' },
  { socket: 'LGA1700', memory: 'DDR5' },
  { socket: 'LGA1700', memory: 'DDR4' },
];

/** Budgets of auto.json: 400 € up to 10,000 € (owner 25/10), every 50 €; above the top there is no automatic build. */
export const AUTO_GRID = { from: 400, to: 10_000, step: 50 };

/** Physical fits (board size, card length, cooler height and socket, PSU size): the parts are first sought among those these rules don't leave "not verified". */
const FIT_RULES = new Set<RuleId>([5, 6, 9, 10, 16]);
const NONE = new Set<RuleId>();
/** Checks settled by a later step, left out until then: 11 the cooler (chosen after the card), 12 the card, 22 the case's fans. */
const LATER = { base: new Set<RuleId>([11, 12, 22]), gpu: new Set<RuleId>([11, 22]), cooler: new Set<RuleId>([22]) };
/** Per tier, the cheapest CPUs and cards tried (enough for the price order; every tier is kept). */
const PER_TIER = 2;

export interface AutoPick {
  parts: Partial<Record<Slot, string>>;
  /** Price per line (fans: the pack price × `fanQty`). */
  prices: Partial<Record<Slot, number>>;
  fanQty: number;
  total: number;
  cpuTier: number;
  /** 0 = no graphics card. */
  gpuTier: number;
}

const price = (m: AnyModel) => m.cheapest.price;
const byPrice = <M extends AnyModel>(ms: M[]) => [...ms].sort((a, b) => price(a) - price(b));
const cents = (n: number) => Math.round(n * 100) / 100;

/** No error or warning anywhere; with `strict` also no "not verified" physical fit about `key`. */
const passes = (fs: Finding[], key: string, strict: boolean, skip: ReadonlySet<RuleId> = NONE) =>
  !fs.some((f) => !skip.has(f.rule) && (f.status === 'error' || f.status === 'warning')) &&
  (!strict || !fs.some((f) => f.status === 'unknown' && FIT_RULES.has(f.rule) && f.parts.includes(key)));

type Picked = { m: AnyModel; part: Part } | null;
/** A step's choice depends only on the parts its rules read: the same parts give the same choice. */
function memo<T>(cache: Map<string, unknown>, key: string, pick: () => T): T {
  if (!cache.has(key)) cache.set(key, pick());
  return cache.get(key) as T;
}
const keyOf = (b: Build, slots: Slot[]) => slots.map((s) => b[s]?.key ?? '-').join('|');

/** The cheapest model of `list` (price order) that passes with `parts`: physical fits verified first, else any. */
function cheapest(slot: Slot, list: AnyModel[], parts: Part[], ctx: Context, skip?: ReadonlySet<RuleId>, stated?: (m: AnyModel) => boolean): Picked {
  for (const strict of [true, false]) {
    // `stated`: only models that state what the fit rules need can pass the strict round (it saves engine calls).
    for (const m of strict && stated ? list.filter(stated) : list) {
      const part = partOf(slot, m);
      if (passes(evaluate([...parts, part], ctx), part.key, strict, skip)) return { m, part };
    }
  }
  return null;
}

/** The cheapest models per tier (best tier first in no particular price order). */
function perTier<M extends AnyModel>(ms: M[], tier: (m: M) => number | undefined): { m: M; tier: number }[] {
  const seen = new Map<number, number>();
  const out: { m: M; tier: number }[] = [];
  for (const m of byPrice(ms)) {
    const t = tier(m);
    if (t === undefined || (seen.get(t) ?? 0) >= PER_TIER) continue;
    seen.set(t, (seen.get(t) ?? 0) + 1);
    out.push({ m, tier: t });
  }
  return out;
}

const knownMaker = (l: PsuListing) => !!l.brand && l.brand !== 'Other';

/**
 * Every candidate build for a use (independent of the budget): per platform, CPU and card the cheapest complete build
 * that passes. `ctx`: the engine context without the use (chip lengths); the BIOS table is added here.
 */
export function autoCandidates(models: AutoModels, use: UseKey, ctx: Context = {}): AutoPick[] {
  const min = USE_MINIMUMS[use];
  const c: Context = { bios: biosSupport, ...ctx, use: engineUseOf(use) };
  const cpuTier = (m: AnyModel) => tierOf('cpu', m.cheapest.chip, min.res)?.tier;
  const gpuTier = (m: AnyModel) => {
    const g = m.cheapest as GpuListing;
    return tierOf('gpu', g.chip, min.res, g.vram)?.tier;
  };
  const gpus: ({ m: AnyModel; tier: number } | null)[] =
    min.card === 'no' ? [null] : [
      ...(min.card === 'optional' ? [null] : []),
      ...perTier(models.gpu.filter((m) => min.vramGb == null || (m.cheapest as GpuListing).vram >= min.vramGb), gpuTier),
    ];
  const ram = byPrice(models.ram.filter((m) => (m.cheapest as RamListing).capacity >= min.ramGb));
  const drives = byPrice(models.storage.filter((m) => storageType(m.cheapest as StorageListing) === 'NVMe' && (m.cheapest as StorageListing).capacity >= min.storageGb));
  const coolers = byPrice(models.cooler);
  const cases = byPrice(models.case);
  const fans = models.fan;
  const psus = byPrice(models.psu.filter((m) => knownMaker(m.cheapest as PsuListing) && psuEfficiency(m.cheapest as PsuListing) != null));
  const out: AutoPick[] = [];
  const cache = new Map<string, unknown>();
  for (const p of PLATFORMS) {
    const boards = byPrice(models.mobo.filter((m) => moboSocket(m as Model<MoboListing>) === p.socket && moboMemory(m as Model<MoboListing>) === p.memory));
    const sticks = ram.filter((m) => (m.cheapest as RamListing).type === p.memory);
    const cpus = perTier(
      models.cpu.filter((m) => {
        const l = m.cheapest as CpuListing;
        return cpuSocket(m as Model<CpuListing>) === p.socket && (l.cores ?? 0) >= min.cores && (!min.igpu || !!l.igpu);
      }),
      cpuTier,
    );
    for (const cpu of cpus) {
      const cpuPart = partOf('cpu', cpu.m);
      const board = cheapest('mobo', boards, [cpuPart], c, LATER.base);
      const kit = board && cheapest('ram', sticks, [cpuPart, board.part], c, LATER.base);
      const drive = kit && cheapest('storage', drives, [cpuPart, board.part, kit.part], c, LATER.base);
      if (!board || !kit || !drive) continue;
      const base: Build = { cpu: cpu.m, mobo: board.m, ram: kit.m, storage: drive.m } as Build;
      const baseParts = [cpuPart, board.part, kit.part, drive.part];
      for (const g of gpus) {
        const pick = complete(base, baseParts, g?.m ?? null, { coolers, cases, fans, psus, memo: cache }, c);
        if (pick) out.push({ ...pick, cpuTier: cpu.tier, gpuTier: g?.tier ?? 0 });
      }
    }
  }
  return out;
}

/** The rest of a build around CPU, board, RAM and drive: card, cooler, case, fans, PSU; null when nothing passes. */
function complete(
  base: Build,
  baseParts: Part[],
  gpu: AnyModel | null,
  lists: { coolers: AnyModel[]; cases: AnyModel[]; fans: AnyModel[]; psus: AnyModel[]; memo: Map<string, unknown> },
  c: Context,
): Omit<AutoPick, 'cpuTier' | 'gpuTier'> | null {
  const b: Build = { ...base };
  const parts = [...baseParts];
  if (gpu) {
    parts.push(partOf('gpu', gpu));
    b.gpu = gpu as Build['gpu'];
  }
  // Rule 27's band, rule 12 (no card: the CPU's own graphics)… before the steps whose choices are memoised.
  if (!passes(evaluate(parts, c), '', false, LATER.gpu)) return null;
  // A cooler only when the CPU has none in the box (rule 11 then passes without one).
  if ((base.cpu!.cheapest as CpuListing).coolerIncluded !== true) {
    // The card is left out of the key: no cooler rule reads the card (add it if one ever does).
    const cooler = memo(lists.memo, `cooler|${keyOf(base, ['cpu', 'mobo', 'ram'])}`, () => cheapest('cooler', lists.coolers, parts, c, LATER.cooler));
    if (!cooler) return null;
    parts.push(cooler.part);
    b.cooler = cooler.m as Build['cooler'];
  }
  const watts = (ps: Part[]) => {
    const e = powerEstimate(ps);
    return Math.max(e.makerW ?? 0, e.formulaW ?? 0) || null;
  };
  // Case and fans together (review I1): the first passing case in price order (stated fits first) whose fan step
  // passes too, so a case with too few fan positions never drops the combo. The fan plan reads the CPU's power, so the
  // CPU is in the memo key.
  const both = memo(lists.memo, `case|${keyOf(b, ['cpu', 'mobo', 'gpu', 'cooler', 'storage'])}`, () => {
    const air = (b.cooler?.cheapest as CoolerListing | undefined)?.type === 'Air';
    // Rules 6 and 9 can only verify a fit against a stated card length / cooler height limit.
    const stated = (m: AnyModel) => {
      const l = m.cheapest as CaseListing;
      return (!b.gpu || l.gpuMaxMm != null) && (!air || l.coolerMaxMm != null);
    };
    for (const strict of [true, false]) {
      for (const m of strict ? lists.cases.filter(stated) : lists.cases) {
        const part = partOf('case', m);
        const ps = [...parts, part];
        if (!passes(evaluate(ps, c), part.key, strict, LATER.cooler)) continue;
        const fan = fansFor({ ...b, case: m as Build['case'] }, ps, watts(ps), lists.fans, c);
        if (fan) return { kase: { m, part }, fan: fan === 'none' ? null : fan };
      }
    }
    return null;
  });
  if (!both) return null;
  parts.push(both.kase.part);
  b.case = both.kase.m as Build['case'];
  const fanQty = both.fan?.qty ?? 0;
  if (both.fan) {
    parts.push(partOf('fan', both.fan.m, fanQty));
    b.fan = both.fan.m as Build['fan'];
  }
  const need = watts(parts) ?? 0;
  // The last part: its check is the whole build's (rule 22 included).
  const psu = cheapest('psu', lists.psus.filter((m) => (m.cheapest as PsuListing).watts >= need), parts, c);
  if (!psu) return null;
  b.psu = psu.m as Build['psu'];
  const prices: AutoPick['prices'] = {};
  const keys: AutoPick['parts'] = {};
  for (const s of SLOTS) {
    const m = b[s];
    if (!m) continue;
    keys[s] = m.key;
    prices[s] = cents(m.cheapest.price * (s === 'fan' ? fanQty : 1));
  }
  const total = cents(Object.values(prices).reduce((n, v) => n + v, 0));
  return { parts: keys, prices, fanQty, total };
}

/**
 * The fans of the fan plan for a build with its case: one fan product (the builder has one fan line) of the plan's
 * size when it names one, else 120 mm (every position takes it), the cheapest by pack price × packs that passes;
 * 'none' when the plan adds no fans, null when no fan product passes. A fan count the case's positions refused
 * (rule 21) is not tried again with another product.
 */
function fansFor(b: Build, parts: Part[], watts: number | null, fans: AnyModel[], c: Context): { m: AnyModel; qty: number } | 'none' | null {
  const plan = fanPlan(b, watts);
  if (plan.total <= 0) return 'none';
  const sizes = [...new Set(plan.add.map((a) => a.size))];
  const size = sizes.length === 1 ? sizes[0] : 120;
  const qty = (m: AnyModel) => Math.ceil(plan.total / Math.max(1, (m.cheapest as FanListing).pack));
  const list = fans.filter((m) => (m.cheapest as FanListing).size === size).sort((x, y) => price(x) * qty(x) - price(y) * qty(y));
  const refused = new Set<number>();
  for (const m of list) {
    const n = qty(m) * (m.cheapest as FanListing).pack;
    if (refused.has(n)) continue;
    const fs = evaluate([...parts, partOf('fan', m, qty(m))], c);
    if (passes(fs, m.key, false)) return { m, qty: qty(m) };
    if (fs.some((f) => f.rule === 21 && (f.status === 'error' || f.status === 'warning'))) refused.add(n);
  }
  return null;
}

/** The build for a budget: the best card tier, then CPU tier, then the lower price; null when none fits the budget. */
export function bestFor(cands: AutoPick[], budget: number): AutoPick | null {
  let best: AutoPick | null = null;
  for (const p of cands) {
    if (p.total > budget) continue;
    if (!best || p.gpuTier > best.gpuTier || (p.gpuTier === best.gpuTier && (p.cpuTier > best.cpuTier || (p.cpuTier === best.cpuTier && p.total < best.total)))) best = p;
  }
  return best;
}

/** The cheapest candidate: what the use costs at least today. */
export const cheapestPick = (cands: AutoPick[]): AutoPick | null =>
  cands.reduce<AutoPick | null>((a, p) => (!a || p.total < a.total ? p : a), null);

/** auto.json and index.json's `minimum` from the builder's rows (grouped as the browser groups them). */
export function autoFiles(models: AutoModels, builtAt: string, ctx: Context = {}): { file: AutoFile; minimum: BuilderIndex['minimum'] } {
  const keys: string[] = [];
  const keyIndex = new Map<string, number>();
  const builds: number[][] = [];
  const buildIndex = new Map<AutoPick, number>();
  const uses = {} as AutoFile['uses'];
  const min = {} as AutoFile['min'];
  const minimum: BuilderIndex['minimum'] = {};
  const cache = new Map<string, AutoPick[]>();
  const keyOf = (k: string) => keyIndex.get(k) ?? (keys.push(k), keyIndex.set(k, keys.length - 1), keys.length - 1);
  const encode = (p: AutoPick) => [p.fanQty, ...SLOTS.map((s) => (p.parts[s] ? keyOf(p.parts[s]!) : -1)), ...SLOTS.map((s) => p.prices[s] ?? 0)];
  for (const use of USE_KEYS) {
    // "Not sure" has gaming 1080p's minimums: the same candidates.
    const same = use === 'unsure' ? 'gaming-1080p' : use;
    const cands = cache.get(same) ?? autoCandidates(models, same, ctx);
    cache.set(same, cands);
    const low = cheapestPick(cands);
    minimum[use] = low ? { total: low.total, parts: low.parts } : null;
    if (low && !buildIndex.has(low)) buildIndex.set(low, builds.push(encode(low)) - 1);
    min[use] = low ? buildIndex.get(low)! : -1;
    uses[use] = [];
    for (let budget = AUTO_GRID.from; budget <= AUTO_GRID.to; budget += AUTO_GRID.step) {
      const p = bestFor(cands, budget);
      if (!p) {
        uses[use].push(-1);
        continue;
      }
      if (!buildIndex.has(p)) buildIndex.set(p, builds.push(encode(p)) - 1);
      uses[use].push(buildIndex.get(p)!);
    }
  }
  return { file: { v: 1, builtAt, grid: AUTO_GRID, slots: SLOTS, keys, builds, uses, min }, minimum };
}
