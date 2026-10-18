// The builder's nine slots and which other slots each slot's compatibility rules read. Plain data with no imports
// (moved out of builder.ts and pick.ts, which re-export them), so the build store and the product page's first paint
// can use them without downloading the builder's code (byte rule 11).

export type Slot = 'cpu' | 'mobo' | 'ram' | 'gpu' | 'cooler' | 'storage' | 'case' | 'fan' | 'psu';
export const SLOTS: Slot[] = ['cpu', 'mobo', 'ram', 'gpu', 'cooler', 'storage', 'case', 'fan', 'psu'];

/**
 * Which other slots' parts the rules of each category page need (step2-plan section 2, "Ποιες θέσεις αφορούν οι
 * κανόνες"): the page loads these from the build. Differs from step2-plan section 2 on
 * purpose: rule 14's formula (`powerEstimate`) also reads ram, storage, fan and cooler, so the pages whose rules
 * include 14 (cpu, gpu, psu) list them too (controller ruling 2026-10-12; extra chunks about 2.5 KB at most).
 * Asserted against the slots the rule files (and the helpers they call) read together.
 */
export const CATEGORY_RULE_SLOTS: Record<Slot, Slot[]> = {
  cpu: ['mobo', 'ram', 'gpu', 'cooler', 'psu', 'storage', 'fan'],
  mobo: ['cpu', 'ram', 'storage', 'case', 'fan'],
  ram: ['cpu', 'mobo', 'cooler'],
  gpu: ['case', 'psu', 'cpu', 'ram', 'storage', 'fan', 'cooler'],
  cooler: ['cpu', 'case', 'ram'],
  storage: ['mobo', 'case'],
  case: ['mobo', 'gpu', 'cooler', 'fan', 'psu', 'storage'],
  fan: ['case', 'mobo'],
  psu: ['gpu', 'cpu', 'case', 'ram', 'storage', 'fan', 'cooler'],
};

/**
 * The builder's key of a listing (builder.slotModels, which groups by it): a graphics card is its own listing, a CPU is
 * its chip plus whether the box has a cooler ("Ryzen 7 7700|true", Box and Tray apart), any other part is its model.
 * Here without the builder's code, for the product page's first paint (tests/unit/buildFit.test.ts: same keys).
 */
export function candidateKey(slot: Slot, l: { id: string; chip: string; coolerIncluded?: boolean | null }, modelKey: string): string {
  if (slot === 'gpu') return l.id;
  if (slot === 'cpu') return `${l.chip}|${l.coolerIncluded ?? '?'}`;
  return modelKey;
}

/** "Box" (cooler in the box), "Tray" or unknown, from a CPU candidate key `<chip>|<coolerIncluded>`. */
export const cpuVersion = (key: string): 'box' | 'tray' | null => {
  const v = key.slice(key.lastIndexOf('|') + 1);
  return v === 'true' ? 'box' : v === 'false' ? 'tray' : null;
};
