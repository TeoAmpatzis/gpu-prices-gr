// PC builder: which parts can go together, from the specs the sites and makers state.
//
// Every check between two chosen parts gives one of four results (owner's rule, 2026-10-01):
//   fits        both measurements are known and they fit
//   likely      fits by an estimate with a safe margin (graphics chip lengths, board size by case size,
//               fan positions counted without their sizes, a 120 mm radiator where only positions are known)
//   unverified  a measurement is missing: shown, labelled "Fit not verified"
//   no          definitely doesn't fit: the only case where a part is hidden
// A part's label is its worst check against the parts already chosen. Parts the builder can't place
// at all (server/workstation parts, laptop RAM, non-ATX power supplies) are still left out.
// Measurements come from Skroutz/BestPrice product pages (scraper/specs.py) and makers' pages.

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
import { BOARD_BY_CASE_SIZE, CATEGORIES, type CategoryConfig } from './categories';
import { groupModels, mostCommon, type Model } from './data';
import { tr, type Text } from './i18n';

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

// ---------- Fit results ----------

export type Fit = 'fits' | 'likely' | 'unverified' | 'no';
const FIT_RANK: Record<Fit, number> = { fits: 0, likely: 1, unverified: 2, no: 3 };
const worse = (a: Fit, b: Fit): Fit => (FIT_RANK[b] > FIT_RANK[a] ? b : a);

/** One check between two parts; `why` explains anything short of "fits". */
interface Check {
  slots: [Slot, Slot];
  fit: Fit;
  why?: Text;
}
/** A part's standing against the parts already chosen; `fit` is null when nothing was checked. */
export interface Rating {
  fit: Fit | null;
  reasons: Text[];
}

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
const HIGH_END_CPU = /^(Ryzen 9|Core i9|Core Ultra 9)\b/;
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
/** RAM slots as stated, null when not. */
export const moboSlotsStated = (m: Model<MoboListing>) => attr(m, (l) => l.ramSlots);
/** Every board has at least 2 DIMM slots, so an unknown count still allows 1–2 stick kits. */
export const moboSlots = (m: Model<MoboListing>) => moboSlotsStated(m) ?? 2;
export const gpuLength = (m: Model<GpuListing>) => m.cheapest.lengthMm ?? null;
/** Largest board size as stated by a site, null when not. */
export const caseBoardStated = (m: Model<CaseListing>) => attr(m, (l) => l.maxBoard);
/** Largest board size: as stated, else the usual one for the case's size (a guess). */
export const caseBoard = (m: Model<CaseListing>) => caseBoardStated(m) ?? BOARD_BY_CASE_SIZE[m.cheapest.size];
export const caseGpuMax = (m: Model<CaseListing>) => attr(m, (l) => l.gpuMaxMm);
export const caseCoolerMax = (m: Model<CaseListing>) => attr(m, (l) => l.coolerMaxMm);
export const caseFanSlots = (m: Model<CaseListing>) => attr(m, (l) => l.fanSlots);
export const caseRadiators = (m: Model<CaseListing>) => attr(m, (l) => l.radiatorMounts);
/** Makers' per-position details (lists, so the first listing that has them). */
const firstOf = <L extends BaseListing, V>(m: Model<L>, get: (l: L) => V | null | undefined): V | null =>
  m.listings.map(get).find((v) => v != null) ?? null;
export const caseFanMounts = (m: Model<CaseListing>) => firstOf(m, (l) => l.fanMounts);
export const caseFansIncluded = (m: Model<CaseListing>) => firstOf(m, (l) => l.fansIncluded);
export const caseRadiatorSizes = (m: Model<CaseListing>) => firstOf(m, (l) => l.radiators);
export const coolerSockets = (m: Model<CoolerListing>) => (attr(m, (l) => l.sockets) ?? '').split(',').filter(Boolean);
export const coolerHeight = (m: Model<CoolerListing>) => attr(m, (l) => l.heightMm);
/** Fan sizes the builder offers: what case fan positions take (others are for coolers/radiators). */
const FAN_SIZES = [120, 140];

// ---------- Graphics card length estimates per chip ----------

/**
 * Water-cooled cards: a block for a custom loop or a built-in AIO (Waterforce, Frostbite, Liquid…).
 * They are much shorter than the chip's air-cooled cards, so they are left out of the chip's length
 * range (owner's rule), and their own fit is never estimated.
 */
const WATER_COOLED = /water\s*block|waterforce|frostbite|\bwb\b|hydro\s*x|liquid|sea\s*hawk|neptune|\baio\b|hybrid/i;
export const gpuWaterCooled = (g: GpuListing) => WATER_COOLED.test(g.title);
/** "Likely fits" needs this many measured cards of the chip, from this many makers, and this margin. */
export const ESTIMATE = { cards: 8, makers: 3, marginMm: 10 };

export interface ChipLengths {
  cards: number; // distinct measured air-cooled cards
  makers: number;
  min: number;
  max: number;
}
/** What the rules need beyond the parts themselves: the measured length range per graphics chip. */
export interface FitContext {
  chips: Map<string, ChipLengths>;
}
export const NO_CONTEXT: FitContext = { chips: new Map() };

/**
 * Length range per chip from the measured, air-cooled, non-workstation cards; only chips with enough
 * cards from enough makers. A card sold on several sites is one builder row per site: cards are
 * counted once per maker + length, which can only undercount.
 */
export function fitContext(gpus: Model<GpuListing>[]): FitContext {
  const seen = new Map<string, { cards: Set<string>; makers: Set<string>; lengths: number[] }>();
  for (const m of gpus) {
    const len = gpuLength(m);
    if (m.pro || len == null || gpuWaterCooled(m.cheapest)) continue;
    const e = seen.get(m.cheapest.chip) ?? { cards: new Set(), makers: new Set(), lengths: [] };
    e.cards.add(`${m.cheapest.partner}|${len}`);
    e.makers.add(m.cheapest.partner);
    e.lengths.push(len);
    seen.set(m.cheapest.chip, e);
  }
  const chips = new Map<string, ChipLengths>();
  for (const [chip, e] of seen) {
    if (e.cards.size >= ESTIMATE.cards && e.makers.size >= ESTIMATE.makers) {
      chips.set(chip, { cards: e.cards.size, makers: e.makers.size, min: Math.min(...e.lengths), max: Math.max(...e.lengths) });
    }
  }
  return { chips };
}

// ---------- Checks between two parts ----------

const W = {
  coolerSockets: { el: 'Δεν αναφέρονται τα socket της ψύκτρας.', en: "The cooler's sockets are not stated." },
  ramSlots: { el: 'Δεν αναφέρεται πόσες υποδοχές RAM έχει η μητρική.', en: "The board's number of RAM slots is not stated." },
  boardGuess: {
    el: 'Το μέγιστο μέγεθος μητρικής του κουτιού εκτιμάται από το μέγεθός του.',
    en: "The case's largest board size is estimated from the case size.",
  },
  boardUnknown: { el: 'Δεν αναφέρεται ποιες μητρικές χωράει το κουτί.', en: 'The board sizes the case takes are not stated.' },
  gpuMaxUnknown: {
    el: 'Δεν αναφέρεται το μέγιστο μήκος κάρτας γραφικών του κουτιού.',
    en: "The case's maximum graphics card length is not stated.",
  },
  gpuLengthUnknown: { el: 'Δεν αναφέρεται το μήκος της κάρτας γραφικών.', en: "The graphics card's length is not stated." },
  coolerHeightUnknown: {
    el: 'Δεν αναφέρεται το ύψος της ψύκτρας ή το μέγιστο ύψος ψύκτρας του κουτιού.',
    en: "The cooler's height or the case's maximum cooler height is not stated.",
  },
  radiatorUnknown: { el: 'Δεν αναφέρονται θέσεις ψυγείου στο κουτί.', en: 'The case states no radiator positions.' },
  fanSlotsUnknown: { el: 'Δεν αναφέρονται οι θέσεις ανεμιστήρων του κουτιού.', en: "The case's fan positions are not stated." },
  fanSizesUnknown: {
    el: 'Αναφέρεται μόνο ο αριθμός θέσεων ανεμιστήρων, όχι τα μεγέθη τους.',
    en: 'Only the number of fan positions is stated, not their sizes.',
  },
  fansTaken: {
    el: 'Κάποιες από αυτές τις θέσεις έχουν ήδη ανεμιστήρες του κουτιού.',
    en: 'Some of those positions already hold the case’s own fans.',
  },
  sffPsu: {
    el: 'Μικρά κουτιά (SFF) συχνά θέλουν τροφοδοτικό SFX· δεν αναφέρεται.',
    en: 'Small (SFF) cases often need an SFX power supply; not stated.',
  },
} satisfies Record<string, Text>;

const gpuEstimate = (chip: string, max: number, ctx: FitContext): Text | null => {
  const c = ctx.chips.get(chip);
  if (!c || max < c.max + ESTIMATE.marginMm) return null;
  return {
    el: `Εκτίμηση: οι ${c.cards} μετρημένες κάρτες ${chip} έχουν μήκος ${c.min}–${c.max} mm και το κουτί χωράει έως ${max} mm.`,
    en: `Estimate: the ${c.cards} measured ${chip} cards are ${c.min}–${c.max} mm long and the case takes up to ${max} mm.`,
  };
};

/** Every check between the parts of a complete or partial build. */
function checks(b: Build, ctx: FitContext): Check[] {
  const out: Check[] = [];
  const add = (slots: [Slot, Slot], fit: Fit, why?: Text) => out.push({ slots, fit, why });

  if (b.cpu && b.mobo) add(['cpu', 'mobo'], cpuSocket(b.cpu) === moboSocket(b.mobo) ? 'fits' : 'no');
  if (b.cpu && b.cooler) {
    const sockets = coolerSockets(b.cooler);
    if (!sockets.length) add(['cpu', 'cooler'], 'unverified', W.coolerSockets);
    else add(['cpu', 'cooler'], sockets.includes(cpuSocket(b.cpu) ?? '') ? 'fits' : 'no');
  }
  if (b.mobo && b.ram) {
    const sticks = b.ram.cheapest.modules;
    const slots = moboSlotsStated(b.mobo);
    if (moboMemory(b.mobo) !== b.ram.cheapest.type) add(['mobo', 'ram'], 'no');
    else if (slots != null) add(['mobo', 'ram'], sticks <= slots ? 'fits' : 'no');
    else add(['mobo', 'ram'], sticks <= 2 ? 'fits' : 'unverified', W.ramSlots);
  }
  if (b.mobo && b.case) {
    const stated = caseBoardStated(b.case);
    const form = moboForm(b.mobo);
    if (stated) add(['mobo', 'case'], boardFits(form, stated) ? 'fits' : 'no');
    else if (b.case.cheapest.size !== 'Άλλο' && boardFits(form, BOARD_BY_CASE_SIZE[b.case.cheapest.size]))
      add(['mobo', 'case'], 'likely', W.boardGuess);
    else add(['mobo', 'case'], 'unverified', W.boardUnknown);
  }
  if (b.gpu && b.case) {
    const max = caseGpuMax(b.case);
    const len = gpuLength(b.gpu);
    if (max == null) add(['gpu', 'case'], 'unverified', W.gpuMaxUnknown);
    else if (len != null) add(['gpu', 'case'], len <= max ? 'fits' : 'no');
    else {
      const est = gpuWaterCooled(b.gpu.cheapest) ? null : gpuEstimate(b.gpu.cheapest.chip, max, ctx);
      add(['gpu', 'case'], est ? 'likely' : 'unverified', est ?? W.gpuLengthUnknown);
    }
  }
  if (b.cooler && b.case) {
    if (b.cooler.cheapest.type === 'AIO') {
      const size = b.cooler.cheapest.radiator;
      const sizes = caseRadiatorSizes(b.case);
      const mounts = caseRadiators(b.case);
      if (sizes && size != null) add(['cooler', 'case'], sizes.some((r) => r.sizes.includes(size)) ? 'fits' : 'no');
      else if (mounts && size === 120)
        add(['cooler', 'case'], 'likely', {
          el: `Το κουτί έχει θέσεις ψυγείου (${mounts}) και κάθε θέση δέχεται 120 mm· τα μεγέθη δεν αναφέρονται.`,
          en: `The case has radiator positions (${mounts}) and any position takes 120 mm; sizes are not stated.`,
        });
      else if (mounts)
        add(['cooler', 'case'], 'unverified', {
          el: `Θέσεις ψυγείου: ${mounts}· δεν αναφέρεται αν χωράει ψυγείο ${size ?? ''} mm.`,
          en: `Radiator positions: ${mounts}; whether a ${size ?? ''} mm radiator fits is not stated.`,
        });
      else add(['cooler', 'case'], 'unverified', W.radiatorUnknown);
    } else {
      const h = coolerHeight(b.cooler);
      const max = caseCoolerMax(b.case);
      if (h == null || max == null) add(['cooler', 'case'], 'unverified', W.coolerHeightUnknown);
      else add(['cooler', 'case'], h <= max ? 'fits' : 'no');
    }
  }
  if (b.fan && b.case) {
    const { size, pack } = b.fan.cheapest;
    const mounts = caseFanMounts(b.case);
    const slots = caseFanSlots(b.case);
    if (mounts) {
      const total = mounts.filter((f) => f.size === size).reduce((n, f) => n + f.n, 0);
      const taken = (caseFansIncluded(b.case) ?? []).filter((f) => f.size === size).reduce((n, f) => n + f.n, 0);
      if (pack <= total - taken) add(['fan', 'case'], 'fits');
      else if (pack <= total) add(['fan', 'case'], 'likely', W.fansTaken);
      else add(['fan', 'case'], 'no');
    } else if (slots == null) add(['fan', 'case'], 'unverified', W.fanSlotsUnknown);
    else if (pack > slots) add(['fan', 'case'], 'no');
    else add(['fan', 'case'], size === 120 ? 'likely' : 'unverified', W.fanSizesUnknown);
  }
  if (b.psu) {
    const watts = requiredWatts(b);
    if (watts != null) {
      const fit: Fit = b.psu.cheapest.watts >= watts ? 'fits' : 'no';
      if (b.gpu) add(['psu', 'gpu'], fit);
      if (b.cpu) add(['psu', 'cpu'], fit);
    }
    if (b.case?.cheapest.size === 'SFF / Cube') add(['psu', 'case'], 'unverified', W.sffPsu);
  }
  return out;
}

const worst = (cs: Check[]): Fit | null => (cs.length ? cs.reduce<Fit>((f, c) => worse(f, c.fit), 'fits') : null);
const reasonsOf = (cs: Check[]) => cs.filter((c) => c.fit !== 'fits' && c.why).map((c) => c.why!);

/** How part `m` for `slot` stands against the rest of the build (the slot's current part ignored). */
export function rate<S extends Slot>(slot: S, m: Model<SlotListing[S]>, build: Build, ctx: FitContext = NO_CONTEXT): Rating {
  const mine = checks({ ...build, [slot]: m }, ctx).filter((c) => c.slots.includes(slot));
  return { fit: worst(mine), reasons: reasonsOf(mine) };
}

// ---------- Rules ----------

/** Can this part be offered at all (a desktop part the builder can place)? */
const usable: { [S in Slot]: (m: Model<SlotListing[S]>) => boolean } = {
  cpu: (m) => !m.pro && DESKTOP_SOCKET.test(cpuSocket(m) ?? ''),
  mobo: (m) => {
    const form = moboForm(m);
    return (
      !m.pro && DESKTOP_SOCKET.test(moboSocket(m) ?? '') && moboMemory(m) != null && form != null && form !== 'Άλλο'
    );
  },
  ram: (m) => m.cheapest.formFactor === 'Desktop' && (m.cheapest.type === 'DDR5' || m.cheapest.type === 'DDR4'),
  // Power decides the PSU; a missing length is "Fit not verified" once a case is chosen.
  gpu: (m) => !m.pro && gpuPsu(m.cheapest) != null,
  cooler: () => true,
  case: () => true,
  fan: (m) => FAN_SIZES.includes(m.cheapest.size),
  // SFX/TFX/Flex units need a case that takes them, which no site states.
  psu: (m) => m.cheapest.formFactor === 'ATX',
};

/** Models for `slot` that can be offered and don't definitely clash with the rest of the build. */
export function candidates<S extends Slot>(
  slot: S,
  models: Model<SlotListing[S]>[],
  build: Build,
  ctx: FitContext = NO_CONTEXT,
): Model<SlotListing[S]>[] {
  const rest: Build = { ...build, [slot]: undefined };
  return models.filter((m) => usable[slot](m) && rate(slot, m, rest, ctx).fit !== 'no');
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

/** What is still missing, what doesn't fit, and what the builder couldn't verify; shown next to the total. */
export function buildNotes(b: Build, ctx: FitContext = NO_CONTEXT): Note[] {
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
  // Checks between the chosen parts: a clash (a saved build whose data changed) is an error; an
  // estimate or a missing measurement is explained.
  for (const c of checks(b, ctx)) {
    if (c.fit === 'no') {
      notes.push({ level: 'error', text: clash(c.slots) });
    } else if (c.fit !== 'fits' && c.why) {
      const label = FIT_LABEL[c.fit];
      notes.push({
        level: 'info',
        text: { el: `${tr('el', label)}: ${tr('el', c.why)}`, en: `${tr('en', label)}: ${tr('en', c.why)}` },
      });
    }
  }
  if (b.gpu && !b.case && gpuLength(b.gpu) != null) {
    notes.push({
      level: 'info',
      text: {
        el: `Η κάρτα γραφικών έχει μήκος ${gpuLength(b.gpu)} mm: κουτιά που σίγουρα δεν τη χωράνε δεν εμφανίζονται.`,
        en: `The graphics card is ${gpuLength(b.gpu)} mm long: cases that certainly can't fit it are hidden.`,
      },
    });
  }
  if (b.case && !caseFanMounts(b.case)) {
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
  return notes;
}

/** Labels shown on parts (picker, chosen parts) and in the notes. */
export const FIT_LABEL: Record<Exclude<Fit, 'no'>, Text> = {
  fits: { el: 'Χωράει', en: 'Fits' },
  likely: { el: 'Πιθανότατα χωράει', en: 'Likely fits' },
  unverified: { el: 'Χωρίς επιβεβαίωση', en: 'Fit not verified' },
};

const SLOT_NAME: Record<Slot, { el: string; en: string }> = {
  cpu: { el: 'επεξεργαστής', en: 'CPU' },
  mobo: { el: 'μητρική', en: 'motherboard' },
  ram: { el: 'μνήμη', en: 'memory' },
  gpu: { el: 'κάρτα γραφικών', en: 'graphics card' },
  cooler: { el: 'ψύκτρα', en: 'cooler' },
  case: { el: 'κουτί', en: 'case' },
  fan: { el: 'ανεμιστήρες', en: 'fans' },
  psu: { el: 'τροφοδοτικό', en: 'power supply' },
};
const clash = ([a, b]: [Slot, Slot]): Text => ({
  el: `Ασυμβατότητα: ${SLOT_NAME[a].el} και ${SLOT_NAME[b].el} δεν ταιριάζουν· αλλάξτε ένα από τα δύο.`,
  en: `Incompatible: the ${SLOT_NAME[a].en} and the ${SLOT_NAME[b].en} don't go together; change one of them.`,
});

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
