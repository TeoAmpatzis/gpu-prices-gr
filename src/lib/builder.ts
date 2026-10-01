// PC builder: which parts can go together, from the specs the sites state.
//
// Rule of thumb: a part is only offered when the data needed to check it is known. A board without
// a known socket or memory type, a graphics card without a known length, a cooler without its
// sockets, or a case that doesn't state what it takes is left out rather than guessed.
// Most measurements come from Skroutz product pages (scraper/specs.py).

import type {
  BaseListing,
  BoardSize,
  CaseListing,
  Category,
  CoolerListing,
  CpuListing,
  FanListing,
  GpuListing,
  MoboListing,
  PsuListing,
  RamListing,
} from '../types';
import { CATEGORIES, caseMaxBoard, type CategoryConfig } from './categories';
import { groupModels, mostCommon, type Model } from './data';
import type { Text } from './i18n';

/** In the order the guide walks through them. */
export type Slot = 'cpu' | 'mobo' | 'ram' | 'gpu' | 'cooler' | 'case' | 'fan' | 'psu';
export const SLOTS: Slot[] = ['cpu', 'mobo', 'ram', 'gpu', 'cooler', 'case', 'fan', 'psu'];
/** Parts a build can be finished without (the GPU needs an iGPU, the cooler a boxed one; see notes). */
export const OPTIONAL: Slot[] = ['gpu', 'cooler', 'fan'];

export interface SlotListing {
  cpu: CpuListing;
  mobo: MoboListing;
  ram: RamListing;
  gpu: GpuListing;
  cooler: CoolerListing;
  case: CaseListing;
  fan: FanListing;
  psu: PsuListing;
}
export type Build = { [S in Slot]?: Model<SlotListing[S]> };
type Note = { level: 'error' | 'info'; text: Text };

/** Most common value of a field across a model's listings (sites sometimes disagree). */
const attr = <L extends BaseListing, V>(m: Model<L>, get: (l: L) => V | null | undefined): V | null =>
  mostCommon(m.listings.map(get));

// ---------- Power ----------

/**
 * Manufacturers' recommended PSU wattage for a whole system with that graphics card (NVIDIA, AMD,
 * Intel spec pages); used when the card's own product page doesn't state a minimum.
 */
const GPU_PSU: Record<string, number> = {
  'RTX 5090': 1000,
  'RTX 5080': 850,
  'RTX 5070 Ti': 750,
  'RTX 5070': 650,
  'RTX 5060 Ti': 600,
  'RTX 5060': 550,
  'RTX 5050': 550,
  'RTX 4090': 850,
  'RTX 4080 Super': 750,
  'RTX 4080': 750,
  'RTX 4070 Ti Super': 700,
  'RTX 4070 Ti': 700,
  'RTX 4070 Super': 650,
  'RTX 4070': 650,
  'RTX 4060 Ti': 550,
  'RTX 4060': 550,
  'RTX 3090 Ti': 850,
  'RTX 3090': 750,
  'RTX 3080 Ti': 750,
  'RTX 3080': 750,
  'RTX 3070 Ti': 750,
  'RTX 3070': 650,
  'RTX 3060 Ti': 600,
  'RTX 3060': 550,
  'RTX 3050': 550,
  'RTX 2060 Super': 550,
  'RTX 2060': 500,
  'GTX 1660 Ti': 450,
  'GTX 1660 Super': 450,
  'GTX 1660': 450,
  'GTX 1050 Ti': 300,
  'GTX 1050': 300,
  'GTX 745': 300,
  'GT 1030': 300,
  'GT 730': 300,
  'GT 710': 300,
  'GT 610': 300,
  'GT 240': 300,
  'GT 210': 300,
  'RX 9070 XT': 750,
  'RX 9070 GRE': 650,
  'RX 9070': 650,
  'RX 9060 XT': 500,
  'RX 9060': 500,
  'RX 7900 XTX': 800,
  'RX 7900 XT': 750,
  'RX 7900 GRE': 700,
  'RX 7800 XT': 700,
  'RX 7700 XT': 700,
  'RX 7600 XT': 600,
  'RX 7600': 550,
  'RX 6950 XT': 850,
  'RX 6900 XT': 850,
  'RX 6800 XT': 750,
  'RX 6800': 650,
  'RX 6750 XT': 650,
  'RX 6700 XT': 650,
  'RX 6650 XT': 500,
  'RX 6600 XT': 500,
  'RX 6600': 500,
  'RX 6500 XT': 400,
  'RX 6400': 350,
  'RX 5600 XT': 550,
  'RX 580': 500,
  'RX 560': 400,
  'RX 550': 400,
  'Arc B580': 600,
  'Arc B570': 500,
  'Arc A770': 650,
  'Arc A750': 600,
  'Arc A580': 600,
  'Arc A380': 300,
  'Arc A310': 300,
};
/** The card's own stated minimum (product page), else the chip maker's recommendation. */
export const gpuPsu = (g: GpuListing): number | null => g.minPsu ?? GPU_PSU[g.chip] ?? null;

/** Top-tier desktop CPUs draw well over their rated TDP under load; give them extra headroom. */
export const HIGH_END_CPU = /^(Ryzen 9|Core i9|Core Ultra 9)\b/;
const NO_GPU_PSU = 350;

/** Smallest PSU the build should have, or null until a CPU or GPU is chosen. */
export function requiredWatts(b: Build): number | null {
  if (!b.cpu && !b.gpu) return null;
  const base = b.gpu ? (gpuPsu(b.gpu.cheapest) ?? NO_GPU_PSU) : NO_GPU_PSU;
  return base + (b.cpu && HIGH_END_CPU.test(b.cpu.chip) ? 100 : 0);
}

// ---------- Part specs used by the rules ----------

const BOARD_RANK: BoardSize[] = ['Mini ITX', 'Micro ATX', 'ATX', 'E-ATX'];
const DESKTOP_SOCKET = /^(AM5|AM4|LGA(1851|1700|1200|1151))$/;
const boardFits = (board: string | null, caseMax: string | null) =>
  BOARD_RANK.indexOf(board as BoardSize) <= BOARD_RANK.indexOf(caseMax as BoardSize);

export const cpuSocket = (m: Model<CpuListing>) => attr(m, (l) => l.socket);
export const cpuHasIgpu = (m: Model<CpuListing>) => m.listings.some((l) => l.igpu);
/** True/false when stated (Skroutz "Περιλαμβάνει Ψύκτρα", or a Tray CPU), null when not. */
export const cpuCooler = (m: Model<CpuListing>) => m.cheapest.coolerIncluded ?? null;
export const moboSocket = (m: Model<MoboListing>) => attr(m, (l) => l.socket);
export const moboMemory = (m: Model<MoboListing>) => attr(m, (l) => l.memory);
export const moboForm = (m: Model<MoboListing>) => attr(m, (l) => l.formFactor);
/** Every board has at least 2 DIMM slots, so an unknown count still allows 1–2 stick kits. */
export const moboSlots = (m: Model<MoboListing>) => attr(m, (l) => l.ramSlots) ?? 2;
export const gpuLength = (m: Model<GpuListing>) => m.cheapest.lengthMm ?? null;
export const caseBoard = (m: Model<CaseListing>) => attr(m, caseMaxBoard);
export const caseGpuMax = (m: Model<CaseListing>) => attr(m, (l) => l.gpuMaxMm);
export const caseCoolerMax = (m: Model<CaseListing>) => attr(m, (l) => l.coolerMaxMm);
export const caseFanSlots = (m: Model<CaseListing>) => attr(m, (l) => l.fanSlots);
export const caseRadiators = (m: Model<CaseListing>) => attr(m, (l) => l.radiatorMounts);
export const coolerSockets = (m: Model<CoolerListing>) => (attr(m, (l) => l.sockets) ?? '').split(',').filter(Boolean);
export const coolerHeight = (m: Model<CoolerListing>) => attr(m, (l) => l.heightMm);
/** Only 120mm fans: every fan position takes them, while 140mm support isn't listed per case. */
const FAN_SIZE = 120;

// ---------- Rules ----------

/** Can this part be offered at all (enough known data, desktop part)? */
const usable: { [S in Slot]: (m: Model<SlotListing[S]>) => boolean } = {
  cpu: (m) => !m.pro && DESKTOP_SOCKET.test(cpuSocket(m) ?? ''),
  mobo: (m) => {
    const form = moboForm(m);
    return (
      !m.pro && DESKTOP_SOCKET.test(moboSocket(m) ?? '') && moboMemory(m) != null && form != null && form !== 'Άλλο'
    );
  },
  ram: (m) => m.cheapest.formFactor === 'Desktop' && (m.cheapest.type === 'DDR5' || m.cheapest.type === 'DDR4'),
  // Length decides the case; power decides the PSU.
  gpu: (m) => !m.pro && gpuLength(m) != null && gpuPsu(m.cheapest) != null,
  cooler: (m) => coolerSockets(m).length > 0,
  // A case of unknown size can't be matched to a board; small-form-factor cases need PSU size data we don't have.
  case: (m) => m.cheapest.size !== 'Άλλο' && m.cheapest.size !== 'SFF / Cube',
  fan: (m) => m.cheapest.size === FAN_SIZE,
  // SFX/TFX/Flex units need a case that takes them, which no site states.
  psu: (m) => m.cheapest.formFactor === 'ATX',
};

/** Does part `m` for `slot` fit with everything else already in the build? */
const fits: { [S in Slot]: (m: Model<SlotListing[S]>, b: Build) => boolean } = {
  cpu: (m, b) => {
    if (b.mobo && cpuSocket(m) !== moboSocket(b.mobo)) return false;
    if (b.cooler && !coolerSockets(b.cooler).includes(cpuSocket(m) ?? '')) return false;
    const watts = requiredWatts({ ...b, cpu: m });
    return !b.psu || watts == null || b.psu.cheapest.watts >= watts;
  },
  mobo: (m, b) =>
    (!b.cpu || moboSocket(m) === cpuSocket(b.cpu)) &&
    (!b.ram || (moboMemory(m) === b.ram.cheapest.type && b.ram.cheapest.modules <= moboSlots(m))) &&
    (!b.case || boardFits(moboForm(m), caseBoard(b.case))),
  ram: (m, b) => !b.mobo || (m.cheapest.type === moboMemory(b.mobo) && m.cheapest.modules <= moboSlots(b.mobo)),
  gpu: (m, b) => {
    const max = b.case ? caseGpuMax(b.case) : null;
    if (b.case && (max == null || gpuLength(m)! > max)) return false;
    const watts = requiredWatts({ ...b, gpu: m });
    return !b.psu || watts == null || b.psu.cheapest.watts >= watts;
  },
  cooler: (m, b) => {
    if (b.cpu && !coolerSockets(m).includes(cpuSocket(b.cpu) ?? '')) return false;
    if (!b.case) return true;
    if (m.cheapest.type === 'AIO') return caseRadiators(b.case) != null;
    const h = coolerHeight(m);
    const max = caseCoolerMax(b.case);
    return h != null && max != null && h <= max;
  },
  case: (m, b) => {
    if (b.mobo && !boardFits(moboForm(b.mobo), caseBoard(m))) return false;
    if (b.gpu) {
      const max = caseGpuMax(m);
      if (max == null || gpuLength(b.gpu)! > max) return false;
    }
    if (b.cooler) {
      if (b.cooler.cheapest.type === 'AIO') {
        if (caseRadiators(m) == null) return false;
      } else {
        const h = coolerHeight(b.cooler);
        const max = caseCoolerMax(m);
        if (h == null || max == null || h > max) return false;
      }
    }
    if (b.fan) {
      const slots = caseFanSlots(m);
      if (slots == null || b.fan.cheapest.pack > slots) return false;
    }
    return true;
  },
  fan: (m, b) => {
    if (!b.case) return true;
    const slots = caseFanSlots(b.case);
    return slots != null && m.cheapest.pack <= slots;
  },
  psu: (m, b) => {
    const watts = requiredWatts(b);
    return watts == null || m.cheapest.watts >= watts;
  },
};

/** Models for `slot` that can be offered and fit the rest of the build (the slot itself ignored). */
export function candidates<S extends Slot>(
  slot: S,
  models: Model<SlotListing[S]>[],
  build: Build,
): Model<SlotListing[S]>[] {
  return models.filter((m) => fitsBuild(slot, m, build));
}

/** Can `m` go in `slot` of this build (whatever the slot holds now is ignored)? */
export function fitsBuild<S extends Slot>(slot: S, m: Model<SlotListing[S]>, build: Build): boolean {
  return usable[slot](m) && fits[slot](m, { ...build, [slot]: undefined });
}

/**
 * Models per slot, grouped like the category pages except:
 * - graphics cards: every card is its own choice, since cards of one chip differ in length;
 * - processors: split by whether the box includes a cooler, so the price shown matches.
 */
export function slotModels<S extends Slot>(slot: S, listings: SlotListing[S][]): Model<SlotListing[S]>[] {
  const cfg = CATEGORIES[slot as Category] as unknown as CategoryConfig<SlotListing[S]>;
  const key: Partial<Record<Slot, (l: SlotListing[S]) => string>> = {
    gpu: (l) => l.id,
    cpu: (l) => `${l.chip}|${(l as CpuListing).coolerIncluded ?? '?'}`,
  };
  const models = groupModels(listings, key[slot] ? { ...cfg, modelKey: key[slot]! } : cfg);
  // A card's name is its full title ("Gigabyte GeForce RTX 5070 Eagle OC SFF 12GB"), not just the chip.
  return slot === 'gpu' ? models.map((m) => ({ ...m, chip: m.cheapest.title })) : models;
}

/** What is still missing, and what the builder can't check; shown next to the total. */
export function buildNotes(b: Build): Note[] {
  const notes: Note[] = [];
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
    const inBox = cpuCooler(b.cpu);
    notes.push(
      inBox
        ? {
            level: 'info',
            text: {
              el: 'Ο επεξεργαστής έχει ψύκτρα στο κουτί. Αρκεί για κανονική χρήση· για gaming/overclock μια καλύτερη βοηθά.',
              en: 'The CPU comes with a cooler. Fine for normal use; a better one helps for gaming/overclocking.',
            },
          }
        : {
            level: 'error',
            text:
              inBox === false
                ? { el: 'Ο επεξεργαστής δεν έχει ψύκτρα: διαλέξτε μία.', en: 'The CPU has no cooler: pick one.' }
                : {
                    el: 'Δεν αναφέρεται αν ο επεξεργαστής έχει ψύκτρα: διαλέξτε μία για σιγουριά.',
                    en: "It isn't stated whether the CPU includes a cooler: pick one to be safe.",
                  },
          },
    );
  }
  if (b.gpu && !b.case) {
    notes.push({
      level: 'info',
      text: {
        el: `Η κάρτα γραφικών έχει μήκος ${gpuLength(b.gpu)} mm: θα εμφανιστούν μόνο κουτιά που τη χωράνε.`,
        en: `The graphics card is ${gpuLength(b.gpu)} mm long: only cases that fit it will be shown.`,
      },
    });
  }
  if (b.case) {
    const slots = caseFanSlots(b.case);
    if (slots != null) {
      notes.push({
        level: 'info',
        text: {
          el: `Το κουτί έχει ${slots} θέσεις ανεμιστήρων (κάποιες μπορεί να έχουν ήδη ανεμιστήρα).`,
          en: `The case has ${slots} fan positions (some may already have fans).`,
        },
      });
    }
  }
  if (b.cooler?.cheapest.type === 'AIO' && b.case) {
    notes.push({
      level: 'info',
      text: {
        el: `Θέσεις ψυγείου στο κουτί: ${caseRadiators(b.case)}. Ελέγξτε ότι χωράει ψυγείο ${b.cooler.cheapest.radiator ?? ''} mm.`,
        en: `Radiator positions in the case: ${caseRadiators(b.case)}. Check that a ${b.cooler.cheapest.radiator ?? ''} mm radiator fits.`,
      },
    });
  }
  notes.push({
    level: 'info',
    text: {
      el: 'Μόνο ανεμιστήρες 120 mm προτείνονται: τους δέχεται κάθε θέση, ενώ η υποστήριξη 140 mm δεν αναφέρεται ανά κουτί.',
      en: '120 mm fans only: every position takes them, while 140 mm support is not listed per case.',
    },
  });
  return notes;
}

const MISSING: Record<Slot, Text> = {
  cpu: { el: 'Διαλέξτε επεξεργαστή.', en: 'Pick a processor.' },
  mobo: { el: 'Διαλέξτε μητρική.', en: 'Pick a motherboard.' },
  ram: { el: 'Διαλέξτε μνήμη RAM.', en: 'Pick memory (RAM).' },
  gpu: { el: 'Διαλέξτε κάρτα γραφικών.', en: 'Pick a graphics card.' },
  cooler: { el: 'Διαλέξτε ψύκτρα.', en: 'Pick a cooler.' },
  case: { el: 'Διαλέξτε κουτί.', en: 'Pick a case.' },
  fan: { el: 'Διαλέξτε ανεμιστήρες.', en: 'Pick fans.' },
  psu: { el: 'Διαλέξτε τροφοδοτικό.', en: 'Pick a power supply.' },
};
