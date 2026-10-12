// "Pick" mode of the category pages (v2 step 3): the compatibility engine's parts built from a category
// page's own models, with the same field values the builder rows carry (derive.ts `slotFields`).
import { candidateErrors, evaluate, type Build, type Context, type Finding, type Part, type PartCategory, type RuleId } from '../engine';
import type { Category } from '../types';
import { usable as builderUsable, type Slot, type SlotListing } from './builder';
import type { Model } from './data';
import { slotFields } from './derive';

/** Category id → builder slot (the nine are identical). */
export const SLOT_OF: Record<Category, Slot> = {
  gpu: 'gpu', cpu: 'cpu', mobo: 'mobo', ram: 'ram', storage: 'storage', psu: 'psu', case: 'case', fan: 'fan', cooler: 'cooler',
};

/**
 * Per slot, the fields the compatibility rules read (src/engine/rules) that the listing data has:
 * the model-wide values come from `slotFields`, the others from the model's cheapest listing, exactly
 * as in a builder.json row. A field the data doesn't carry (yet) is simply null.
 */
export const PART_FIELDS: Record<Slot, string[]> = {
  cpu: ['chip', 'socket', 'igpu', 'coolerIncluded'],
  mobo: [
    'chip', 'chipset', 'socket', 'formFactor', 'memory', 'ramSlots', 'maxMemoryGB', 'sataPorts', 'm2Slots', 'm2Gen',
    'biosFlashback', 'fanHeaders', 'usbCHeader',
  ],
  ram: ['type', 'speed', 'modules', 'capacity', 'formFactor'],
  gpu: ['chip', 'lengthMm', 'minPsu', 'powerConnector', 'slots'],
  cooler: ['type', 'radiator', 'sockets', 'heightMm'],
  storage: ['iface', 'pcie', 'formFactor'],
  case: [
    'size', 'maxBoard', 'gpuMaxMm', 'coolerMaxMm', 'fanSlots', 'radiatorMounts', 'fanMounts', 'fansIncluded', 'hasFans',
    'radiators', 'expansionSlots', 'psuFormFactors', 'usbCFront',
  ],
  fan: ['size', 'pack'],
  psu: ['watts', 'formFactor'],
};

/**
 * The model as an engine part. `key` is the builder's (`slotModels`: a card per listing id, a CPU per
 * `chip|coolerIncluded`), `name` the model's name (a card's full title).
 */
export function toPart<S extends Slot>(slot: S, m: Model<SlotListing[S]>): Part {
  const own = m.cheapest as unknown as Record<string, unknown>;
  const shared = slotFields(slot, m);
  const fields: Record<string, unknown> = {};
  for (const f of PART_FIELDS[slot]) fields[f] = f in shared ? shared[f] : (own[f] ?? null);
  return { category: slot, key: m.key, name: m.chip, quantity: 1, fields };
}

/** Can the builder offer this model at all (desktop part)? Same function as the builder's. */
export function usable<S extends Slot>(slot: S, m: Model<SlotListing[S]>): boolean {
  return builderUsable[slot](m);
}

/**
 * Rule fields the compatibility rules read that the listing data does not carry (yet), per slot: a part has them
 * as null, so those checks answer "unknown". The guard test (tests/unit/pick.test.ts) scans src/engine/rules for every
 * field read and fails if one is neither in `PART_FIELDS` nor listed here, and fails if a listed one gains data.
 */
export const NOT_IN_DATA: Record<Slot, string[]> = {
  cpu: [],
  mobo: ['fanHeaders', 'usbCHeader'], // m2Gen, m2Slots, sataPorts, maxMemoryGB, biosFlashback ARE in the data (board spec pages)
  ram: [],
  gpu: ['powerConnector', 'slots'],
  cooler: [],
  storage: [],
  case: ['expansionSlots', 'psuFormFactors', 'usbCFront', 'bays35'],
  fan: [],
  psu: ['native12v2x6', 'atx3'],
};

/**
 * "Only compatible" hides a candidate only for an error of these rules (step2-plan section 4): 1 CPU socket, 2 RAM
 * type, 3 RAM sticks, 5 board in case, 6 card in case, 8 air cooler height, 10 cooler sockets, 16 PSU in case,
 * and 14 (PSU wattage) only when its basis is `stated`. Everything else is shown on the row, never hides.
 */
export const HIDE_RULES: ReadonlySet<RuleId> = new Set<RuleId>([1, 2, 3, 5, 6, 8, 10, 14, 16]);

/** Rules 11 (CPU needs a cooler) and 12 (CPU needs a card): never hide while this other part is not in the build. */
export const NEVER_HIDE_WHEN_MISSING: Readonly<Record<11 | 12, PartCategory>> = { 11: 'cooler', 12: 'gpu' };

/** The own-clash filter of `candidateErrors`, from two evaluations (so `checkAll` evaluates the base build once). */
function ownErrors(beforeErrors: Finding[], after: Finding[], key: string): Finding[] {
  return after.filter((f) => f.status === 'error' && f.parts.includes(key)).filter((f) => {
    const others = f.parts.filter((k) => k !== key);
    return !beforeErrors.some((e) => e.rule === f.rule && others.every((k) => e.parts.includes(k)));
  });
}

function hides(f: Finding, build: Build): boolean {
  if (f.status !== 'error') return false;
  if (f.rule === 11 || f.rule === 12) return build.some((p) => p.category === NEVER_HIDE_WHEN_MISSING[f.rule as 11 | 12]);
  if (!HIDE_RULES.has(f.rule)) return false;
  return f.rule !== 14 || f.basis === 'stated';
}

/** The errors that hide `candidate` in this build (`build` = without the part it would replace). */
export function hidingErrors(build: Part[], candidate: Part, ctx: Context): Finding[] {
  return candidateErrors(build, candidate, ctx).filter((f) => hides(f, build));
}

/**
 * Check a whole page's candidates for one slot: `build` minus that slot's part(s), then each candidate added.
 * `findings` = everything the engine says about the candidate (errors, warnings, notes, unknowns: for the row),
 * `hide` = at least one of its own errors is a hiding one.
 */
export function checkAll(build: Part[], slot: Slot, candidates: Part[], ctx: Context): Map<string, { hide: boolean; findings: Finding[] }> {
  const base = build.filter((p) => p.category !== slot);
  const before = evaluate(base, ctx).filter((f) => f.status === 'error');
  const out = new Map<string, { hide: boolean; findings: Finding[] }>();
  for (const c of candidates) {
    const after = evaluate([...base, c], ctx);
    const own = after.filter((f) => f.parts.includes(c.key));
    out.set(c.key, { hide: ownErrors(before, after, c.key).some((f) => hides(f, base)), findings: own });
  }
  return out;
}

/**
 * Which other slots' parts the rules of each category page need (step2-plan section 2, "Ποιες θέσεις αφορούν οι
 * κανόνες"): the page loads these from the build. Asserted against the pairs of slots the rule files read together.
 */
export const CATEGORY_RULE_SLOTS: Record<Slot, Slot[]> = {
  cpu: ['mobo', 'ram', 'gpu', 'cooler', 'psu'],
  mobo: ['cpu', 'ram', 'storage', 'case', 'fan'],
  ram: ['cpu', 'mobo', 'cooler'],
  gpu: ['case', 'psu', 'cpu'],
  cooler: ['cpu', 'case', 'ram'],
  storage: ['mobo', 'case'],
  case: ['mobo', 'gpu', 'cooler', 'fan', 'psu', 'storage'],
  fan: ['case', 'mobo'],
  psu: ['gpu', 'cpu', 'case'],
};