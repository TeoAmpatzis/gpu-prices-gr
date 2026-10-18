// "Pick" mode of the category pages (v2 step 3): the compatibility engine's parts built from a category
// page's own models, with the same field values the builder rows carry (derive.ts `slotFields`).
import type { Part } from '../engine';
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
 * Documentation + test of which engine-read fields have NO value today in v2's validated listings (any listing of
 * the category with a non-null value counts as "has data"). `PART_FIELDS` is what `toPart` copies, and still copies
 * these, so their values flow as soon as the data has them; this list only says which have none now (those checks
 * answer "unknown"). The guard test (tests/unit/pick.test.ts) scans every engine rule (and the helpers they call)
 * for the fields read and fails if a read field is in neither list, if a listed field gains values (move it out of
 * this list), or if a read field with no values is missing here.
 */
export const NOT_IN_DATA: Record<Slot, string[]> = {
  cpu: [],
  // fanHeaders, usbCHeader: not on any spec page we read. m2Gen: main's scraper reads it since 2026-10-10, no value
  // yet (data of 2026-10-17: m2Slots 92, sataPorts 79, maxMemoryGB 2393, biosFlashback 60 of 2938 listings).
  mobo: ['fanHeaders', 'usbCHeader', 'm2Gen'],
  ram: [],
  gpu: ['powerConnector', 'slots'],
  cooler: [],
  storage: [],
  case: ['expansionSlots', 'psuFormFactors', 'usbCFront', 'bays35'],
  fan: [],
  psu: ['native12v2x6', 'atx3'],
};

// The hide rules live in pickHide.ts (no engine code); the check itself (checkAll, hidingErrors) in pickCheck.ts,
// which only the pick worker and the main-thread fallback load.
export { hides, HIDE_RULES, NEVER_HIDE_WHEN_MISSING } from './pickHide';
export type { Verdict } from './pickProtocol';

// Which other slots' parts each page's rules read: slots.ts (no code imports, so the product page's first paint can
// use it without the builder).
export { CATEGORY_RULE_SLOTS } from './slots';
