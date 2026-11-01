// The builder's Recommended order by use and budget left (step 5 task 10, owner's answer 5, finding #5), the step's
// target price from the automatic build (/data/builder/auto.json, autoBuild.ts) and the lines over the plan (#6).
// Loaded lazily by the builder (byte rule 11: not in /builder's first paint).
//
// Order of a step: (A) meets the use's minimum and costs ≤ 115% of the step's target; (B) meets it but costs more;
// (C) below the minimum; a PSU with no stated efficiency or an unknown maker last of all (answer 8: never first).
// Within a group the verified parts first ("Fit not verified" after them), then: CPU / card by tier at the
// resolution, then price (a use with no card: cards cheapest first); RAM by capacity, then €/GB; drives NVMe first
// (the first drive), then €/TB; PSU ≥ the build's need first, then efficiency, then price; others by the category
// pages' Recommended score (ranking.ts). No budget (no target): groups by the minimum only.
import { tierOf } from '../engine/data/tiers';
import type { AutoFile, BaseListing, Category, CpuListing, GpuListing, PsuListing, RamListing, StorageListing } from '../types';
import { CATEGORIES, type CategoryConfig } from './categories';
import { storageType } from './categoryRules';
import type { Model } from './data';
import { psuEfficiency } from './psuProduct';
import { recommendedScores } from './ranking';
import { SLOTS, type Slot } from './slots';
import { USE_MINIMUMS, type UseKey } from './useMinimums';
import { autoFor, type AutoChoice } from './autoPick';

export { autoFor, loadAuto, type AutoChoice } from './autoPick';

type AnyModel = Model<BaseListing>;

export interface RecommendContext {
  use: UseKey | null;
  /** The step's target price (stepTarget); null = no budget or no automatic build. */
  target: number | null;
  /** The build's recommended PSU (W), null while unknown. */
  psuWatts: number | null;
}

/** A group with this share of the target still counts as "within" it. */
const OVER = 1.15;
/** Efficiency, best first (the PSU category's groups, categoryRules.PSU_RULES). */
const EFFICIENCY = ['Diamond', 'Titanium', 'Platinum', 'Gold', 'Silver', 'Bronze', 'Standard'];

const cheapRow = (m: AnyModel) => m.cheapest;

/** The part meets the use's minimum (a PSU: the build's recommended watts). Without a use everything meets it. */
export function meetsMinimum(slot: Slot, m: AnyModel, use: UseKey | null, psuWatts: number | null): boolean {
  if (slot === 'psu') return psuWatts == null || (cheapRow(m) as PsuListing).watts >= psuWatts;
  if (!use) return true;
  const min = USE_MINIMUMS[use];
  switch (slot) {
    case 'cpu': {
      const l = cheapRow(m) as CpuListing;
      return (l.cores ?? 0) >= min.cores && (!min.igpu || !!l.igpu);
    }
    case 'gpu':
      return min.vramGb == null || (cheapRow(m) as GpuListing).vram >= min.vramGb;
    case 'ram':
      return (cheapRow(m) as RamListing).capacity >= min.ramGb;
    case 'storage': {
      const l = cheapRow(m) as StorageListing;
      return storageType(l) === 'NVMe' && l.capacity >= min.storageGb;
    }
    default:
      return true;
  }
}

const badPsu = (m: AnyModel) => {
  const l = cheapRow(m) as PsuListing;
  return !l.brand || l.brand === 'Other' || psuEfficiency(l) == null;
};

/** 0 = A, 1 = B, 2 = C, 3 = a PSU that is never first. */
export function groupOf(slot: Slot, m: AnyModel, ctx: RecommendContext): number {
  if (slot === 'psu' && badPsu(m)) return 3;
  if (!meetsMinimum(slot, m, ctx.use, ctx.psuWatts)) return 2;
  return ctx.target != null && m.cheapest.price > OVER * ctx.target ? 1 : 0;
}

/** The comparator of the Recommended order (see the header); `unverified`: the part's fit is not verified. */
export function recommend(
  slot: Slot,
  models: AnyModel[],
  ctx: RecommendContext,
  unverified: (m: AnyModel) => boolean = () => false,
): (a: AnyModel, b: AnyModel) => number {
  const res = ctx.use ? USE_MINIMUMS[ctx.use].res : '1080p';
  const noCard = ctx.use != null && USE_MINIMUMS[ctx.use].card === 'no';
  const price = (m: AnyModel) => m.cheapest.price;
  const tier = (m: AnyModel) => {
    const l = cheapRow(m) as GpuListing;
    return (slot === 'gpu' ? tierOf('gpu', l.chip, res, l.vram) : tierOf('cpu', l.chip, res))?.tier ?? -1;
  };
  let within: (a: AnyModel, b: AnyModel) => number;
  if (slot === 'cpu' || (slot === 'gpu' && !noCard)) within = (a, b) => tier(b) - tier(a) || price(a) - price(b);
  else if (slot === 'gpu') within = (a, b) => price(a) - price(b);
  else if (slot === 'ram') {
    const cap = (m: AnyModel) => (cheapRow(m) as RamListing).capacity;
    within = (a, b) => cap(b) - cap(a) || price(a) / cap(a) - price(b) / cap(b);
  } else if (slot === 'storage') {
    const l = (m: AnyModel) => cheapRow(m) as StorageListing;
    const nvme = (m: AnyModel) => (storageType(l(m)) === 'NVMe' ? 0 : 1);
    within = (a, b) => nvme(a) - nvme(b) || price(a) / l(a).capacity - price(b) / l(b).capacity;
  } else if (slot === 'psu') {
    const l = (m: AnyModel) => cheapRow(m) as PsuListing;
    const enough = (m: AnyModel) => (ctx.psuWatts == null || l(m).watts >= ctx.psuWatts ? 0 : 1);
    const eff = (m: AnyModel) => {
      const i = EFFICIENCY.indexOf(psuEfficiency(l(m)) ?? '');
      return i < 0 ? EFFICIENCY.length : i;
    };
    within = (a, b) => enough(a) - enough(b) || eff(a) - eff(b) || price(a) - price(b);
  } else {
    const cfg = CATEGORIES[slot as Category] as unknown as CategoryConfig<BaseListing>;
    const score = recommendedScores(models, slot as Category, cfg.value);
    within = (a, b) => (score.get(b.key) ?? 0) - (score.get(a.key) ?? 0);
  }
  const group = new Map(models.map((m) => [m.key, groupOf(slot, m, ctx)]));
  const g = (m: AnyModel) => group.get(m.key) ?? groupOf(slot, m, ctx);
  return (a, b) => g(a) - g(b) || Number(unverified(a)) - Number(unverified(b)) || within(a, b);
}

/**
 * The current picker's Recommended order (task 10 wires it into the existing Guided step; tasks 11–12 replace that
 * picker): the step's target from the automatic build of the use and budget, the chosen parts' prices taken off.
 */
export function pickerOrder<R extends { m: AnyModel; rating: { fit: string | null } }>(
  slot: Slot,
  rated: R[],
  o: { auto: AutoFile | null; use: UseKey | null; budget: number | null; build: Partial<Record<Slot, AnyModel>>; psuWatts: number | null },
): (a: R, b: R) => number {
  const pick = o.auto && o.use && o.budget != null ? autoFor(o.auto, o.use, o.budget) : null;
  const chosen = Object.fromEntries(SLOTS.filter((s) => s !== slot && o.build[s]).map((s) => [s, o.build[s]!.cheapest.price]));
  const target = stepTarget(slot, pick?.kind === 'build' ? pick.build : null, chosen, o.budget);
  const unverified = new Set(rated.filter((r) => r.rating.fit === 'unverified').map((r) => r.m.key));
  const cmp = recommend(slot, rated.map((r) => r.m), { use: o.use, target, psuWatts: o.psuWatts }, (m) => unverified.has(m.key));
  return (a, b) => cmp(a.m, b.m);
}

/**
 * The step's target price: the automatic build's line, scaled to what is left after the chosen parts (`chosen`: the
 * price of each chosen line other than this step). Null without a budget or an automatic build; 0 when the plan has
 * no such line (e.g. no card for everyday use).
 */
export function stepTarget(slot: Slot, auto: AutoChoice | null, chosen: Partial<Record<Slot, number>>, budget: number | null): number | null {
  if (!auto || budget == null) return null;
  const left = budget - SLOTS.filter((s) => s !== slot).reduce((n, s) => n + (chosen[s] ?? 0), 0);
  const plan = SLOTS.filter((s) => s === slot || chosen[s] == null).reduce((n, s) => n + (auto.prices[s] ?? 0), 0);
  if (plan <= 0) return 0;
  return Math.max(0, Math.round(((auto.prices[slot] ?? 0) * left) / plan));
}

/**
 * "+N € over the plan for this part" (finding #6): when the lines' total is over the budget, each line that costs
 * more than its share of the budget in the automatic build (its plan price × budget ÷ the plan's total).
 */
export function overPlan(lines: Partial<Record<Slot, number>>, auto: AutoChoice, budget: number): Partial<Record<Slot, number>> {
  const total = Object.values(lines).reduce<number>((n, v) => n + (v ?? 0), 0);
  const out: Partial<Record<Slot, number>> = {};
  if (total <= budget || auto.total <= 0) return out;
  for (const s of SLOTS) {
    const over = Math.round((lines[s] ?? 0) - ((auto.prices[s] ?? 0) * budget) / auto.total);
    if (lines[s] != null && over > 0) out[s] = over;
  }
  return out;
}
