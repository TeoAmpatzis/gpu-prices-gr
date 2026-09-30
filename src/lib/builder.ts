// PC builder: which parts can go together, from the specs the sites state.
//
// Rule of thumb: a part is only offered when the data needed to check it is known. A board without
// a known socket or memory type, a GPU without a known power recommendation, or a case whose size
// is unknown is left out rather than guessed. Checks no site gives data for (GPU length vs. case,
// cooler height and socket support) are not made; the page tells the user to check them.

import type {
  BaseListing,
  BoardSize,
  CaseListing,
  Category,
  CoolerListing,
  CpuListing,
  GpuListing,
  MoboListing,
  PsuListing,
  RamListing,
} from '../types';
import { CATEGORIES, caseMaxBoard, type CategoryConfig } from './categories';
import { groupModels, mostCommon, type Model } from './data';
import type { Text } from './i18n';

export type Slot = 'cpu' | 'mobo' | 'ram' | 'gpu' | 'psu' | 'case' | 'cooler';
export const SLOTS: Slot[] = ['cpu', 'mobo', 'ram', 'gpu', 'psu', 'case', 'cooler'];
/** Parts a build can be finished without: the GPU if the CPU has integrated graphics, the cooler. */
export const OPTIONAL: Slot[] = ['gpu', 'cooler'];

export interface SlotListing {
  cpu: CpuListing;
  mobo: MoboListing;
  ram: RamListing;
  gpu: GpuListing;
  psu: PsuListing;
  case: CaseListing;
  cooler: CoolerListing;
}
export type Build = { [S in Slot]?: Model<SlotListing[S]> };

/** Most common value of a field across a model's listings (sites sometimes disagree). */
const attr = <L extends BaseListing, V>(m: Model<L>, get: (l: L) => V | null | undefined): V | null =>
  mostCommon(m.listings.map(get));

// ---------- Power ----------

/**
 * Manufacturers' recommended PSU wattage for a whole system with that graphics card (NVIDIA, AMD,
 * Intel spec pages). The sites don't list power draw, so a GPU not in this table is not offered.
 */
const GPU_PSU: Record<string, number> = {
  'RTX 5090': 1000, 'RTX 5080': 850, 'RTX 5070 Ti': 750, 'RTX 5070': 650, 'RTX 5060 Ti': 600, 'RTX 5060': 550,
  'RTX 5050': 550, 'RTX 4090': 850, 'RTX 4080 Super': 750, 'RTX 4080': 750, 'RTX 4070 Ti Super': 700,
  'RTX 4070 Ti': 700, 'RTX 4070 Super': 650, 'RTX 4070': 650, 'RTX 4060 Ti': 550, 'RTX 4060': 550,
  'RTX 3090 Ti': 850, 'RTX 3090': 750, 'RTX 3080 Ti': 750, 'RTX 3080': 750, 'RTX 3070 Ti': 750, 'RTX 3070': 650,
  'RTX 3060 Ti': 600, 'RTX 3060': 550, 'RTX 3050': 550, 'RTX 2060 Super': 550, 'RTX 2060': 500,
  'GTX 1660 Ti': 450, 'GTX 1660 Super': 450, 'GTX 1660': 450, 'GTX 1050 Ti': 300, 'GTX 1050': 300,
  'GTX 745': 300, 'GT 1030': 300, 'GT 730': 300, 'GT 710': 300, 'GT 610': 300, 'GT 240': 300, 'GT 210': 300,
  'RX 9070 XT': 750, 'RX 9070 GRE': 650, 'RX 9070': 650, 'RX 9060 XT': 500, 'RX 9060': 500,
  'RX 7900 XTX': 800, 'RX 7900 XT': 750, 'RX 7900 GRE': 700, 'RX 7800 XT': 700, 'RX 7700 XT': 700,
  'RX 7600 XT': 600, 'RX 7600': 550, 'RX 6950 XT': 850, 'RX 6900 XT': 850, 'RX 6800 XT': 750, 'RX 6800': 650,
  'RX 6750 XT': 650, 'RX 6700 XT': 650, 'RX 6650 XT': 500, 'RX 6600 XT': 500, 'RX 6600': 500, 'RX 6500 XT': 400,
  'RX 6400': 350, 'RX 5600 XT': 550, 'RX 580': 500, 'RX 560': 400, 'RX 550': 400,
  'Arc B580': 600, 'Arc B570': 500, 'Arc A770': 650, 'Arc A750': 600, 'Arc A580': 600, 'Arc A380': 300,
  'Arc A310': 300,
};
export const gpuPsu = (chip: string): number | null => GPU_PSU[chip] ?? null;

/** Top-tier desktop CPUs draw well over their rated TDP under load; give them extra headroom. */
const HIGH_END_CPU = /^(Ryzen 9|Core i9|Core Ultra 9)\b/;
const NO_GPU_PSU = 350;

/** Smallest PSU the build should have, or null until a CPU or GPU is chosen. */
export function requiredWatts(b: Build): number | null {
  if (!b.cpu && !b.gpu) return null;
  const base = b.gpu ? gpuPsu(b.gpu.chip) ?? NO_GPU_PSU : NO_GPU_PSU;
  return base + (b.cpu && HIGH_END_CPU.test(b.cpu.chip) ? 100 : 0);
}

// ---------- Part specs used by the rules ----------

const BOARD_RANK: BoardSize[] = ['Mini ITX', 'Micro ATX', 'ATX', 'E-ATX'];
const DESKTOP_SOCKET = /^(AM5|AM4|LGA(1851|1700|1200|1151))$/;

export const cpuSocket = (m: Model<CpuListing>) => attr(m, (l) => l.socket);
export const cpuHasIgpu = (m: Model<CpuListing>) => m.listings.some((l) => l.igpu);
export const moboSocket = (m: Model<MoboListing>) => attr(m, (l) => l.socket);
export const moboMemory = (m: Model<MoboListing>) => attr(m, (l) => l.memory);
export const moboForm = (m: Model<MoboListing>) => attr(m, (l) => l.formFactor);
/** Every board has at least 2 DIMM slots, so an unknown count still allows 1–2 stick kits. */
export const moboSlots = (m: Model<MoboListing>) => attr(m, (l) => l.ramSlots) ?? 2;
export const caseBoard = (m: Model<CaseListing>) => attr(m, caseMaxBoard);

// ---------- Rules ----------

/** Can this part be offered at all (enough known data, desktop part)? */
const usable: { [S in Slot]: (m: Model<SlotListing[S]>) => boolean } = {
  cpu: (m) => !m.pro && DESKTOP_SOCKET.test(cpuSocket(m) ?? ''),
  mobo: (m) => {
    const form = moboForm(m);
    return !m.pro && DESKTOP_SOCKET.test(moboSocket(m) ?? '') && moboMemory(m) != null && form != null && form !== 'Άλλο';
  },
  ram: (m) => m.cheapest.formFactor === 'Desktop' && (m.cheapest.type === 'DDR5' || m.cheapest.type === 'DDR4'),
  gpu: (m) => !m.pro && gpuPsu(m.chip) != null,
  // SFX/TFX/Flex units need a case that takes them, which no site states.
  psu: (m) => m.cheapest.formFactor === 'ATX',
  // A case of unknown size can't be matched to a board; small-form-factor cases need PSU/GPU size data we don't have.
  case: (m) => m.cheapest.size !== 'Άλλο' && m.cheapest.size !== 'SFF / Cube',
  cooler: () => true,
};

/** Does part `m` for `slot` fit with everything else already in the build? */
const fits: { [S in Slot]: (m: Model<SlotListing[S]>, b: Build) => boolean } = {
  cpu: (m, b) => {
    if (b.mobo && cpuSocket(m) !== moboSocket(b.mobo)) return false;
    const watts = requiredWatts({ ...b, cpu: m });
    return !b.psu || watts == null || b.psu.cheapest.watts >= watts;
  },
  mobo: (m, b) =>
    (!b.cpu || moboSocket(m) === cpuSocket(b.cpu)) &&
    (!b.ram || (moboMemory(m) === b.ram.cheapest.type && b.ram.cheapest.modules <= moboSlots(m))) &&
    (!b.case || BOARD_RANK.indexOf(moboForm(m) as BoardSize) <= BOARD_RANK.indexOf(caseBoard(b.case) as BoardSize)),
  ram: (m, b) => !b.mobo || (m.cheapest.type === moboMemory(b.mobo) && m.cheapest.modules <= moboSlots(b.mobo)),
  gpu: (m, b) => {
    const watts = requiredWatts({ ...b, gpu: m });
    return !b.psu || watts == null || b.psu.cheapest.watts >= watts;
  },
  psu: (m, b) => {
    const watts = requiredWatts(b);
    return watts == null || m.cheapest.watts >= watts;
  },
  case: (m, b) =>
    !b.mobo || BOARD_RANK.indexOf(moboForm(b.mobo) as BoardSize) <= BOARD_RANK.indexOf(caseBoard(m) as BoardSize),
  cooler: () => true,
};

/** Models for `slot` that can be offered and fit the rest of the build (the slot itself ignored). */
export function candidates<S extends Slot>(slot: S, models: Model<SlotListing[S]>[], build: Build): Model<SlotListing[S]>[] {
  const rest: Build = { ...build, [slot]: undefined };
  return models.filter((m) => usable[slot](m) && fits[slot](m, rest));
}

/** Models per slot from the loaded listings, grouped exactly like the category pages. */
export function slotModels<S extends Slot>(slot: S, listings: SlotListing[S][]): Model<SlotListing[S]>[] {
  const cfg = CATEGORIES[slot as Category] as unknown as CategoryConfig<SlotListing[S]>;
  return groupModels(listings, cfg);
}

/** What is still missing or unchecked; shown next to the total. */
export function buildNotes(b: Build): { level: 'error' | 'info'; text: Text }[] {
  const notes: { level: 'error' | 'info'; text: Text }[] = [];
  for (const s of SLOTS) {
    if (b[s] || OPTIONAL.includes(s)) continue;
    notes.push({ level: 'error', text: MISSING[s] });
  }
  if (b.cpu && !b.gpu && !cpuHasIgpu(b.cpu)) {
    notes.push({
      level: 'error',
      text: {
        el: 'Ο επεξεργαστής δεν έχει ενσωματωμένα γραφικά: χρειάζεται κάρτα γραφικών.',
        en: 'The CPU has no integrated graphics: a graphics card is needed.',
      },
    });
  }
  if (b.cpu && !b.cooler) {
    notes.push({
      level: 'info',
      text: {
        el: 'Χωρίς ψύκτρα: μόνο λίγοι επεξεργαστές σε κουτί (Box) έχουν δική τους. Ελέγξτε το προϊόν.',
        en: 'No cooler: only some boxed CPUs include one. Check the product.',
      },
    });
  }
  notes.push({
    level: 'info',
    text: {
      el: 'Δεν ελέγχονται (τα καταστήματα δεν τα αναφέρουν): μήκος κάρτας γραφικών και ύψος/socket ψύκτρας σε σχέση με το κουτί και τη μητρική.',
      en: "Not checked (the shops don't list them): graphics card length and cooler height/socket support against the case and board.",
    },
  });
  return notes;
}

const MISSING: Record<Slot, Text> = {
  cpu: { el: 'Διαλέξτε επεξεργαστή.', en: 'Pick a processor.' },
  mobo: { el: 'Διαλέξτε μητρική.', en: 'Pick a motherboard.' },
  ram: { el: 'Διαλέξτε μνήμη RAM.', en: 'Pick memory (RAM).' },
  gpu: { el: 'Διαλέξτε κάρτα γραφικών.', en: 'Pick a graphics card.' },
  psu: { el: 'Διαλέξτε τροφοδοτικό.', en: 'Pick a power supply.' },
  case: { el: 'Διαλέξτε κουτί.', en: 'Pick a case.' },
  cooler: { el: 'Διαλέξτε ψύκτρα.', en: 'Pick a cooler.' },
};
