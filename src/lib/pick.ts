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
