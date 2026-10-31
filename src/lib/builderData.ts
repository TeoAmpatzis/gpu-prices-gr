// The builder's data shaping (step 5 task 7; moved out of builder.ts, whose v1 rules go in task 9): which parts the
// builder can offer at all (`usable`), how listings group into the builder's choices (`slotModels`), the graphics
// chips' measured length ranges (`fitContext`) and the part values the rules read across a model's listings.
// Builder-only groupings beyond the category pages' (task 7):
// - power supplies are products (maker + series + watts, src/lib/psuProduct.ts), not the page's spec groups;
//   `psuGroupFallback` maps a build saved with a spec group ("650W Gold ATX") to that group's cheapest product;
// - graphics cards stay one choice per listing, but the builder's step file merges a card's twins (same maker,
//   chip, VRAM and short title on several sites, `gpuTwinKey`) into one row; `gpuTwinFallback` finds a saved twin;
// - a processor's versions (Box with its cooler, Box, Tray) stay separate choices, shown as one card (`cpuCards`);
// - cooler "models" that are accessories (adapters, brackets, mounting kits) are not offered (`junkCooler`).

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
  StorageListing,
} from '../types';
import { BOARD_BY_CASE_SIZE, CATEGORIES, storageType, type CategoryConfig } from './categories';
import { groupModels, mostCommon, ownTotal, type Model } from './data';
import { isSfxL, psuProductKey, psuProductName, psuRowKey } from './psuProduct';
import type { Slot } from './slots';
import { titleKey, titleOptions } from './titles';

export { storageType } from './categories';
export { psuProductKey } from './psuProduct';

export interface SlotListing {
  cpu: CpuListing;
  mobo: MoboListing;
  ram: RamListing;
  gpu: GpuListing;
  cooler: CoolerListing;
  storage: StorageListing;
  case: CaseListing;
  fan: FanListing;
  psu: PsuListing;
}

/** Most common value of a field across a model's listings (sites sometimes disagree). */
export const attr = <L extends BaseListing, V>(m: Model<L>, get: (l: L) => V | null | undefined): V | null =>
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
/**
 * The larger of the card's own stated minimum (product page) and the chip maker's recommendation:
 * some shop pages give the card's board power in the "minimum PSU" field (130–300 W).
 */
export const gpuPsu = (g: GpuListing): number | null => Math.max(g.minPsu ?? 0, GPU_PSU[g.chip] ?? 0) || null;

// ---------- Part specs used by the rules ----------

export const BOARD_RANK: BoardSize[] = ['Mini ITX', 'Micro ATX', 'ATX', 'E-ATX'];
const DESKTOP_SOCKET = /^(AM5|AM4|LGA(1851|1700|1200|1151))$/;
export const boardFits = (board: string | null, caseMax: string | null) =>
  BOARD_RANK.indexOf(board as BoardSize) <= BOARD_RANK.indexOf(caseMax as BoardSize);

export const cpuSocket = (m: Model<CpuListing>) => attr(m, (l) => l.socket);
export const cpuHasIgpu = (m: Model<CpuListing>) => m.listings.some((l) => l.igpu);
/** True/false when stated (Skroutz "Περιλαμβάνει Ψύκτρα", or a Tray CPU), null when not. */
export const cpuCooler = (m: Model<CpuListing>) => m.cheapest.coolerIncluded ?? null;
export const moboSocket = (m: Model<MoboListing>) => attr(m, (l) => l.socket);
/**
 * Unknown when the board's listings disagree (DDR4 and DDR5 versions sold under one name, or a wrong
 * value): such a board is then left out of the builder (`usable`) rather than checked with a guess.
 */
export const moboMemory = (m: Model<MoboListing>) =>
  new Set(m.listings.map((l) => l.memory).filter((v) => v != null)).size > 1 ? null : attr(m, (l) => l.memory);
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
export const firstOf = <L extends BaseListing, V>(m: Model<L>, get: (l: L) => V | null | undefined): V | null =>
  m.listings.map(get).find((v) => v != null) ?? null;
export const caseFanMounts = (m: Model<CaseListing>) => firstOf(m, (l) => l.fanMounts);
export const caseFansIncluded = (m: Model<CaseListing>) => firstOf(m, (l) => l.fansIncluded);
export const caseRadiatorSizes = (m: Model<CaseListing>) => firstOf(m, (l) => l.radiators);
export const coolerSockets = (m: Model<CoolerListing>) => (attr(m, (l) => l.sockets) ?? '').split(',').filter(Boolean);
/** Under 30 mm is a fan's thickness read as the tower's height (some shop pages): treated as unknown. */
const MIN_AIR_COOLER_MM = 30;
export const coolerHeight = (m: Model<CoolerListing>) => {
  const h = attr(m, (l) => l.heightMm);
  return h != null && h < MIN_AIR_COOLER_MM ? null : h;
};
/** Fan sizes the builder offers: what case fan positions take (others are for coolers/radiators). */
export const FAN_SIZES = [120, 140];

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

/** Can this part be offered at all (a desktop part the builder can place)? */
export const usable: { [S in Slot]: (m: Model<SlotListing[S]>) => boolean } = {
  cpu: (m) => !m.pro && DESKTOP_SOCKET.test(cpuSocket(m) ?? ''),
  mobo: (m) => {
    const form = moboForm(m);
    return (
      !m.pro &&
      DESKTOP_SOCKET.test(moboSocket(m) ?? '') &&
      moboMemory(m) != null &&
      form != null &&
      // 'Άλλο' from the scraper is not a desktop size; one the shops disagree on (formConflict) is only unknown
      (form !== 'Άλλο' || m.listings.some((l) => l.formConflict))
    );
  },
  ram: (m) => m.cheapest.formFactor === 'Desktop' && (m.cheapest.type === 'DDR5' || m.cheapest.type === 'DDR4'),
  // Power decides the PSU; a missing length is "Fit not verified" once a case is chosen.
  gpu: (m) => !m.pro && gpuPsu(m.cheapest) != null,
  cooler: (m) => !junkCooler(m),
  // Desktop drives only: no server ones, and the shapes every desktop takes (M.2 2280, 2.5", 3.5").
  storage: (m) =>
    m.cheapest.tier !== 'Server' &&
    ['NVMe', 'SATA SSD', 'HDD'].includes(storageType(m.cheapest)) &&
    ['M.2 2280', '2.5"', '3.5"'].includes(m.cheapest.formFactor ?? ''),
  case: () => true,
  fan: (m) => FAN_SIZES.includes(m.cheapest.size),
  // ATX, SFX and SFX-L (owner answer 8; rule 16 checks the case). TFX/Flex stay out: no case data says which takes them.
  psu: (m) => PSU_FORMS.includes(psuForm(m)),
};

/**
 * Models per slot, grouped like the category pages except:
 * - graphics cards: every card is its own choice, since cards of one chip differ in length;
 * - processors: split by whether the box includes a cooler, so the price shown matches;
 * - power supplies: one choice per product (`psuProductKey`), named "Corsair RM850e 850W". A builder step file's row
 *   is named (`chip`) and keyed from that name (`psuRowKey`, or its `product` field), since its title is in the extra file.
 */
export function slotModels<S extends Slot>(slot: S, listings: SlotListing[S][]): Model<SlotListing[S]>[] {
  const cfg = CATEGORIES[slot as Category] as unknown as CategoryConfig<SlotListing[S]>;
  const key: Partial<Record<Slot, (l: SlotListing[S]) => string>> = {
    gpu: (l) => l.id,
    cpu: (l) => `${l.chip}|${(l as CpuListing).coolerIncluded ?? '?'}`,
    psu: (l) => psuKey(l as PsuListing),
  };
  const models = groupModels(listings, key[slot] ? { ...cfg, modelKey: key[slot]! } : cfg);
  // A card's name is its full title ("Gigabyte GeForce RTX 5070 Eagle OC SFF 12GB"), not just the chip.
  if (slot === 'gpu') return models.map((m) => ({ ...m, chip: m.cheapest.title }));
  if (slot === 'psu') return models.map((m) => ({ ...m, chip: psuName(m as unknown as Model<PsuListing>) }));
  return models;
}
// ---------- Power supplies as products (task 7) ----------

/** The form factors the builder offers. */
export const PSU_FORMS: PsuListing['formFactor'][] = ['ATX', 'SFX', 'SFX-L'];

/** A product's form factor: SFX-L when an SFX product's title says so on any site (`psuProduct.isSfxL`). */
export function psuForm(m: Model<PsuListing>): PsuListing['formFactor'] {
  if (m.listings.some((l) => l.formFactor === 'SFX-L' || isSfxL(l))) return 'SFX-L';
  return m.cheapest.formFactor;
}

/**
 * The name: a builder row's own (its title is in the extra file), else from the first title not written in
 * capitals (e-shop.gr's are), else the cheapest's.
 */
function psuName(m: Model<PsuListing>): string {
  if (isRow(m.cheapest)) return m.cheapest.chip;
  const l = m.listings.find((x) => x.title !== x.title.toUpperCase()) ?? m.cheapest;
  return psuProductName(l);
}

/** A builder step file row (it carries `pop`, which listings never have): named, its title in the extra file. */
const isRow = (l: BaseListing) => (l as { pop?: unknown }).pop != null;
/** A power supply's product key: a row's own (`product`, else from its name), else from the listing's title. */
const psuKey = (l: PsuListing) => l.product ?? (isRow(l) ? psuRowKey(l) : psuProductKey(l));

/** The category page's spec group of a listing ("650W Gold ATX", categoryRules PSU_RULES.modelKey), from its fields. */
export const psuGroupKey = (l: Pick<PsuListing, 'watts' | 'efficiency' | 'formFactor'>): string =>
  `${l.watts}W${l.efficiency ? ` ${l.efficiency}` : ''} ${l.formFactor === 'SFX-L' ? 'SFX' : l.formFactor}`;

/**
 * A build saved before power supplies were products holds a spec group ("650W Gold ATX"); it becomes that group's
 * cheapest offered product today, or null (no such group, or the key is not one).
 */
export function psuGroupFallback(key: string, models: Model<PsuListing>[]): string | null {
  let best: Model<PsuListing> | null = null;
  for (const m of models) {
    if (psuGroupKey(m.cheapest) !== key || !usable.psu(m)) continue;
    if (!best || m.cheapest.price < best.cheapest.price) best = m;
  }
  return best?.key ?? null;
}

// ---------- Graphics card twins (task 7) ----------

/**
 * Listings of one card on several sites: same maker, chip and VRAM, and the same short title once the model's and
 * the spec words are cut (`titles.titleKey`: "Gigabyte GeForce RTX 5070 12GB GDDR7 Eagle OC SFF" and "… RTX 5070
 * Eagle OC SFF 12GB" both read "gigabyte eagle oc sff"). The scraper's own card key (B7 `card` field) would be the
 * real fix (question 9, not built).
 */
export const gpuTwinKey = (l: Pick<GpuListing, 'partner' | 'chip' | 'vram' | 'title'>): string =>
  `${l.partner}|${l.chip}|${l.vram}|${titleKey(l.title, `${l.chip} ${l.vram}GB`, titleOptions('gpu'))}`;

/**
 * Whether listings of one twin key may be merged: not when the short title is only the maker ("PNY GeForce RTX 5070
 * Ti 16GB": PNY sells several such cards), nor when two of them state another memory type ("GT 710 2GB GDDR5 Evo" /
 * "GDDR3 Evo") or another length: then they stay one card each.
 */
export function twinsAgree(ls: Pick<GpuListing, 'partner' | 'chip' | 'vram' | 'title' | 'memType' | 'lengthMm'>[]): boolean {
  if (ls.length < 2) return true;
  const short = gpuTwinKey(ls[0]).split('|')[3];
  if (!short.includes(' ')) return false;
  const stated = <V>(vs: (V | null | undefined)[]) => new Set(vs.filter((v) => v != null)).size <= 1;
  const mem = (l: Pick<GpuListing, 'title' | 'memType'>) => l.memType ?? /\b(G?DDR\d+X?)\b/i.exec(l.title)?.[1]?.toUpperCase() ?? null;
  return stated(ls.map(mem)) && stated(ls.map((l) => l.lengthMm));
}

/** The builder row (graphics card) a saved card's listing id was merged into, or null. */
export function gpuTwinFallback(id: string, models: Model<GpuListing>[]): string | null {
  return models.find((m) => m.listings.some((l) => l.twins?.split(',').includes(id)))?.key ?? null;
}

/** A saved key the step's models don't have: the product or card it became (old saved builds, v1 share links). */
export function slotFallback(slot: Slot, key: string, models: Model<BaseListing>[]): string | null {
  if (slot === 'psu') return psuGroupFallback(key, models as unknown as Model<PsuListing>[]);
  if (slot === 'gpu') return gpuTwinFallback(key, models as unknown as Model<GpuListing>[]);
  return null;
}

// ---------- Processor cards (task 7, finding #15) ----------

export interface CpuCard<M extends Model<CpuListing>> {
  chip: string;
  /** The chip's versions, each its own choice with its own price: Box with its cooler, Box / Tray without, unknown. */
  versions: M[];
}
const VERSION_ORDER: Record<string, number> = { true: 0, false: 1, '?': 2 };

/** One card per chip (candidate keys `chip|coolerIncluded` stay the choices), in the order of each chip's first version. */
export function cpuCards<M extends Model<CpuListing>>(models: M[]): CpuCard<M>[] {
  const cards = new Map<string, M[]>();
  for (const m of models) {
    const chip = m.key.slice(0, m.key.lastIndexOf('|'));
    cards.set(chip, [...(cards.get(chip) ?? []), m]);
  }
  const v = (m: M) => VERSION_ORDER[m.key.slice(m.key.lastIndexOf('|') + 1)] ?? 3;
  return [...cards].map(([chip, versions]) => ({ chip, versions: versions.sort((a, b) => v(a) - v(b)) }));
}

// ---------- Junk among coolers (task 7, finding #21) ----------

/** Accessories the shops list as coolers: socket adapters ("μετατροπέας"), brackets, mounting kits, stands ("βάση"). */
const ACCESSORY = /μετατροπ[εέ]ας|adapter|bracket|mounting\s*kit|β[αά]ση/iu;
export const junkCooler = (m: Model<CoolerListing>): boolean => ACCESSORY.test(m.chip);

// ---------- The listing a builder row shows (task 7, owner answer 11) ----------

/**
 * The listing a builder row is: the cheapest by price + shipping where that total is known (`data.ownTotal` keeps a
 * total only when it belongs to the listing's own offer), else by price; `ship` is its shipping (0 = free), null
 * when not known. A listing whose shipping is unknown competes with its price alone.
 */
export function rowListing<L extends BaseListing>(listings: L[]): { listing: L; ship: number | null } {
  let best: L | null = null;
  let cost = Infinity;
  for (const raw of listings) {
    const l = ownTotal(raw);
    const c = l.total ?? l.price;
    if (c < cost) [best, cost] = [l, c];
  }
  const l = best!;
  // The fee of the offer behind the total (its price may differ from the listing's by up to 2%: never below 0).
  const ship = l.total == null ? null : (l.shipping ?? Math.max(0, Math.round((l.total - l.price) * 100) / 100));
  return { listing: l, ship };
}
