import type { ReactNode } from 'react';
import { Box, CircuitBoard, Cpu, Fan, MemoryStick, Microchip, Plug, Snowflake, type LucideIcon } from 'lucide-react';
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
import { formatPrice, mostCommon, type Model } from './data';
import { slug } from './slug';
import { T, tr, type Lang, type Text } from './i18n';
import { fanValue, gpuValue, psuValue, ramValue } from './value';

export interface Column<L extends BaseListing> {
  header: Text;
  className?: string; // applied to both <th> and <td>, e.g. responsive hiding
  numeric?: boolean; // right-aligned (numbers are tabular everywhere in the table)
  cell: (m: Model<L>, lang: Lang) => ReactNode;
}

/**
 * A category-specific select in the filter sidebar. It is applied per listing, before listings are
 * grouped into models, so a model shows the price of a listing that actually matches.
 */
export interface ExtraFilter<L extends BaseListing> {
  key: string; // key in Filters.extra
  label: Text;
  /** Choices besides "any", in display order. */
  options: (listings: L[]) => { value: string; label: Text }[];
  test: (l: L, value: string) => boolean;
}

/** Everything that differs between the category pages. */
export interface CategoryConfig<L extends BaseListing> {
  id: Category;
  tab: Text;
  title: Text;
  subtitle: Text;
  icon: LucideIcon;
  empty: Text;
  searchPlaceholder: Text;
  /** Added to a model's name when its chip comes in several variants (GPU: "16GB"). */
  variant?: (l: L) => string;
  /** Pill filter values (data keys), in display/sort order: brands for GPU/CPU, memory type for RAM… */
  groups: string[];
  groupLabel: Text; // heading above the pills
  /** URL parameter for the pills (e.g. "type" → #ram?type=ddr5,ddr4). */
  groupParam: string;
  group: (l: L) => string;
  groupDot: Record<string, string>; // Tailwind bg class per group
  /** Default true: the "Recommended" sort goes group by group before `tierScore`. */
  sortByGroup?: boolean;
  /** Two-way split shown as a segmented control; omitted when a category has none (cases). */
  segments?: { main: Text; pro: Text };
  /** Same key as `model_key` in scraper/categories.py. */
  modelKey: (l: L) => string;
  isPro: (l: L) => boolean;
  /** Higher = listed first when sorting by model (categories without a `value` score). */
  tierScore: (m: Model<L>) => number;
  /** Value for money (higher = more for the money); drives the "Recommended" sort when set. */
  value?: (m: Model<L>) => number | null;
  searchText: (l: L) => string;
  extraFilters: ExtraFilter<L>[];
  /** Columns between the model name and the price, and after the price. */
  before: Column<L>[];
  after: Column<L>[];
}

// Group keys that come from the data in Greek (see the scrapers) and need an English label.
const OTHER = 'Άλλο';
const NO_RATING = 'Χωρίς ένδειξη';
const AIR = 'Αέρα';
const GROUP_NAMES: Record<string, Text> = {
  [OTHER]: { el: 'Άλλο', en: 'Other' },
  [NO_RATING]: { el: 'Χωρίς ένδειξη', en: 'Not stated' },
  [AIR]: { el: 'Αέρα', en: 'Air' },
};
/** Display name of a group key (pill, dot tooltip, table cell). */
export const groupName = (g: string, lang: Lang) => tr(lang, GROUP_NAMES[g] ?? g);

const VENDOR: Text = { el: 'Κατασκευαστής', en: 'Manufacturer' };
const TYPE: Text = { el: 'Τύπος', en: 'Type' };
const SIZE: Text = { el: 'Μέγεθος', en: 'Size' };
const SERIES: Text = { el: 'Σειρά', en: 'Series' };
const MEMORY: Text = { el: 'Μνήμη', en: 'Memory' };
// Short enough to fit the 17rem sidebar and the builder picker (longer ones end in "…").
const search = (examples: string): Text => ({ el: `π.χ. ${examples}`, en: `e.g. ${examples}` });
const noResults = (el: string, en: string): Text => ({
  el: `Δεν βρέθηκαν ${el} με αυτά τα φίλτρα.`,
  en: `No ${en} match these filters.`,
});
const subtitle = (el: string, en: string): Text => ({
  el: `Οι χαμηλότερες τιμές ${el} στην Ελλάδα, από Skroutz, BestPrice, Shopflix, Snif και e-shop.gr.`,
  en: `The lowest ${en} prices in Greece, from Skroutz, BestPrice, Shopflix, Snif and e-shop.gr.`,
});

// ---------- Filter builders ----------

type Value = string | number | null | undefined;

/** Distinct values of `get` seen at least `minCount` times: most common first, or ascending. */
function distinct<L>(listings: L[], get: (l: L) => Value, order: 'count' | 'asc', minCount = 1): (string | number)[] {
  const counts = new Map<string | number, number>();
  for (const l of listings) {
    const v = get(l);
    if (v != null && v !== '') counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const values = [...counts.keys()].filter((v) => counts.get(v)! >= minCount);
  return order === 'asc'
    ? values.sort((a, b) => Number(a) - Number(b))
    : values.sort((a, b) => counts.get(b)! - counts.get(a)!);
}

interface OneOfOptions {
  order?: 'count' | 'asc';
  minCount?: number;
  /** Fixed choices instead of the values found in the data. */
  fixed?: (string | number)[];
  /** Stable re-sort after `order` (e.g. current sockets first). */
  rank?: (v: string) => number;
  fmt?: (v: string) => Text;
}

/** Exact match on one value ("Chipset: B850"). Option values are URL slugs ("micro-atx"). */
function oneOf<L extends BaseListing>(key: string, label: Text, get: (l: L) => Value, o: OneOfOptions = {}): ExtraFilter<L> {
  return {
    key,
    label,
    options: (ls) => {
      const values = (o.fixed ?? distinct(ls, get, o.order ?? 'count', o.minCount)).map(String);
      if (o.rank) values.sort((a, b) => o.rank!(a) - o.rank!(b));
      return values.map((v) => ({ value: slug(v), label: o.fmt ? o.fmt(v) : v }));
    },
    test: (l, v) => {
      const x = get(l);
      return x != null && slug(String(x)) === v;
    },
  };
}

/** Numeric threshold: "≥ 16GB", or "≤ CL30" with `max`. */
function threshold<L extends BaseListing>(
  key: string,
  label: Text,
  get: (l: L) => number | null | undefined,
  fmt: (v: number) => Text,
  o: { fixed?: number[]; max?: boolean; minCount?: number } = {},
): ExtraFilter<L> {
  return {
    key,
    label,
    options: (ls) =>
      (o.fixed ?? (distinct(ls, get, 'asc', o.minCount) as number[])).map((v) => ({ value: String(v), label: fmt(v) })),
    test: (l, v) => {
      const x = get(l);
      return x != null && (o.max ? x <= Number(v) : x >= Number(v));
    },
  };
}

function yesNo<L extends BaseListing>(key: string, label: Text, get: (l: L) => boolean | undefined): ExtraFilter<L> {
  return {
    key,
    label,
    options: () => [
      { value: 'yes', label: T.yes },
      { value: 'no', label: T.no },
    ],
    test: (l, v) => (v === 'yes') === !!get(l),
  };
}

const vendorFilter = <L extends BaseListing>(): ExtraFilter<L> => oneOf<L>('brand', VENDOR, (l) => l.brand);
const atLeastLabel = (label: Text): Text =>
  typeof label === 'string' ? label : { el: `${label.el} (τουλάχιστον)`, en: `${label.en} (at least)` };

// ---------- GPU ----------

const GPU_WORKSTATION = /^(RTX PRO |RTX A\d|T\d|RTX \d{4} (Ada|\(Pro\)))/;

/** Rough "newer/higher tier first" ordering from the model number. */
function gpuChipScore(chip: string): number {
  const n = Number(chip.match(/\d{3,4}/)?.[0] ?? 0);
  let score = n;
  if (/\bArc B/.test(chip)) score += 10000;
  if (/Ti Super|XTX/.test(chip)) score += 7;
  else if (/\bTi\b|XT\b/.test(chip)) score += 5;
  else if (/Super|GRE/.test(chip)) score += 3;
  return score;
}

/** "RTX 50", "GTX 16", "RX 9000", "Arc B". */
function gpuSeries(chip: string): string {
  let m;
  if (GPU_WORKSTATION.test(chip)) return 'Workstation';
  if ((m = chip.match(/^(RTX|GTX) (\d{2})\d{2}/))) return `${m[1]} ${m[2]}`;
  if ((m = chip.match(/^RX (\d)\d{3}/))) return `RX ${m[1]}000`;
  if ((m = chip.match(/^Arc ([AB])/))) return `Arc ${m[1]}`;
  return OTHER;
}

const gpuVram = (m: Model<GpuListing>) => m.cheapest.vram;

export const GPU: CategoryConfig<GpuListing> = {
  id: 'gpu',
  tab: { el: 'Κάρτες Γραφικών', en: 'Graphics Cards' },
  title: { el: 'Τιμές Καρτών Γραφικών', en: 'Graphics Card Prices' },
  subtitle: subtitle('GPU', 'GPU'),
  icon: CircuitBoard,
  empty: noResults('κάρτες', 'graphics cards'),
  searchPlaceholder: search('5070 Ti, Sapphire'),
  groups: ['NVIDIA', 'AMD', 'Intel'],
  groupLabel: VENDOR,
  groupParam: 'brand',
  group: (l) => l.brand,
  groupDot: { NVIDIA: 'bg-green-500', AMD: 'bg-red-500', Intel: 'bg-sky-500' },
  segments: { main: 'Gaming', pro: 'Workstation' },
  modelKey: (l) => `${l.chip} ${l.vram}GB`,
  variant: (l) => `${l.vram}GB`,
  isPro: (l) => GPU_WORKSTATION.test(l.chip),
  tierScore: (m) => gpuChipScore(m.cheapest.chip) * 100 + gpuVram(m),
  value: gpuValue,
  searchText: (l) => `${l.chip} ${l.title} ${l.partner}`,
  extraFilters: [
    threshold('vram', atLeastLabel('VRAM'), (l) => l.vram, (v) => `≥ ${v}GB`),
    oneOf('memType', { el: 'Τύπος μνήμης', en: 'Memory type' }, (l) => l.memType),
    oneOf('series', SERIES, (l) => gpuSeries(l.chip), { fmt: (v) => GROUP_NAMES[v] ?? v }),
    oneOf('partner', { el: 'Κατασκευαστής κάρτας', en: 'Card maker' }, (l) => l.partner),
  ],
  before: [
    { header: 'VRAM', numeric: true, cell: (m) => `${gpuVram(m)}GB` },
    { header: MEMORY, className: 'hidden md:table-cell', cell: (m) => mostCommon(m.listings.map((l) => l.memType)) ?? '—' },
  ],
  after: [{ header: VENDOR, className: 'hidden sm:table-cell', cell: (m) => m.cheapest.partner }],
};

// ---------- CPU ----------

const cpuSocket = (m: Model<CpuListing>) => mostCommon(m.listings.map((l) => l.socket));
const cpuCores = (m: Model<CpuListing>) => mostCommon(m.listings.map((l) => l.cores));

// Earlier = higher rank. Desktop and server lines never share a list unless "all" is picked.
const CPU_FAMILIES = [
  /^Threadripper PRO/, /^Threadripper/, /^EPYC/, /^Ryzen/, /^Athlon/,
  /^Xeon Platinum/, /^Xeon Gold/, /^Xeon w/, /^Xeon Silver/, /^Xeon Bronze/, /^Xeon/,
  /^Core Ultra/, /^Core i/, /^Core \d/, /^Pentium/, /^Celeron/, /^Processor/,
];

function cpuTierScore(chip: string): number {
  const family = CPU_FAMILIES.findIndex((re) => re.test(chip));
  const tier = Number(chip.match(/^(?:Ryzen |Core Ultra |Core i|Core |Xeon w)(\d)/)?.[1] ?? 0);
  const num = Number(chip.match(/\d{3,5}(?=[A-Z0-9]*(?: Plus| v\d)?$)/)?.[0] ?? 0);
  let bonus = 0;
  if (/X3D/.test(chip)) bonus = 4;
  else if (/KS\b|Plus/.test(chip)) bonus = 3;
  else if (/\d(K|X|XT)\b|KF\b/.test(chip)) bonus = 2;
  return (CPU_FAMILIES.length - (family < 0 ? CPU_FAMILIES.length : family)) * 1e7 + tier * 1e6 + num * 10 + bonus;
}

/** "Ryzen 7", "Core Ultra 5", "Core i5", "Xeon Gold", "Threadripper PRO". */
function cpuSeries(chip: string): string {
  const xeon = chip.match(/^Xeon (Platinum|Gold|Silver|Bronze|w\d)/);
  if (xeon) return `Xeon ${xeon[1]}`;
  return chip.match(/^(Threadripper PRO|Threadripper|EPYC|Ryzen \d|Core Ultra \d|Core i\d|Core \d|Xeon|Athlon|Pentium|Celeron)/)?.[1] ?? OTHER;
}

const socketRank = (s: string) => (/^(AM5|LGA1851|LGA1700|AM4)$/.test(s) ? 0 : 1);

export const CPU: CategoryConfig<CpuListing> = {
  id: 'cpu',
  tab: { el: 'Επεξεργαστές', en: 'Processors' },
  title: { el: 'Τιμές Επεξεργαστών', en: 'Processor Prices' },
  subtitle: subtitle('CPU', 'CPU'),
  icon: Cpu,
  empty: noResults('επεξεργαστές', 'processors'),
  searchPlaceholder: search('9800X3D, 14600K'),
  groups: ['AMD', 'Intel'],
  groupLabel: VENDOR,
  groupParam: 'brand',
  group: (l) => l.brand,
  groupDot: { AMD: 'bg-red-500', Intel: 'bg-sky-500' },
  segments: { main: 'Desktop', pro: 'Server / HEDT' },
  modelKey: (l) => l.chip,
  isPro: (l) => /^(EPYC|Threadripper|Xeon)/.test(l.chip),
  tierScore: (m) => cpuTierScore(m.chip),
  searchText: (l) => `${l.chip} ${l.title} ${l.socket ?? ''}`,
  extraFilters: [
    oneOf('socket', 'Socket', (l) => l.socket, { rank: socketRank }),
    threshold('cores', atLeastLabel({ el: 'Πυρήνες', en: 'Cores' }), (l) => l.cores, (v) => ({
      el: `≥ ${v} πυρήνες`,
      en: `≥ ${v} cores`,
    })),
    oneOf('series', SERIES, (l) => cpuSeries(l.chip), { fmt: (v) => GROUP_NAMES[v] ?? v }),
    yesNo('igpu', { el: 'Ενσωματωμένα γραφικά', en: 'Integrated graphics' }, (l) => l.igpu),
    oneOf('packaging', { el: 'Συσκευασία', en: 'Packaging' }, (l) => l.packaging, {
      fixed: ['Box', 'Tray'],
      fmt: (v) => (v === 'Box' ? { el: 'Box (σε κουτί)', en: 'Box (retail)' } : { el: 'Tray (χωρίς κουτί)', en: 'Tray (OEM)' }),
    }),
  ],
  before: [
    { header: { el: 'Πυρήνες', en: 'Cores' }, numeric: true, cell: (m) => cpuCores(m) ?? '—' },
    { header: 'Socket', className: 'hidden sm:table-cell', cell: (m) => cpuSocket(m) ?? '—' },
  ],
  after: [],
};

// ---------- Motherboards ----------
// Like cases, a board is its own model (vendor + board name); pills are the CPU socket.

const moboSocket = (m: Model<MoboListing>) => mostCommon(m.listings.map((l) => l.socket));
const moboChipset = (m: Model<MoboListing>) => mostCommon(m.listings.map((l) => l.chipset));
const moboForm = (m: Model<MoboListing>) => mostCommon(m.listings.map((l) => l.formFactor)) ?? m.cheapest.formFactor;
const moboMemory = (m: Model<MoboListing>) => mostCommon(m.listings.map((l) => l.memory));
const moboSlots = (m: Model<MoboListing>) => mostCommon(m.listings.map((l) => l.ramSlots));
const moboPlatform = (socket: string | null) =>
  !socket ? null : /^LGA/.test(socket) ? 'Intel' : /^(AM|s?TR|SP|sWRX)/i.test(socket) ? 'AMD' : null;
const DESKTOP_SOCKETS = /^(AM5|AM4|AM3\+?|LGA(1851|1700|1200|1151|1150|1155))$/;
const MOBO_SOCKETS = ['AM5', 'AM4', 'LGA1851', 'LGA1700'];
const BOARD_SIZES: BoardSize[] = ['ATX', 'Micro ATX', 'Mini ITX', 'E-ATX'];

export const MOBO: CategoryConfig<MoboListing> = {
  id: 'mobo',
  tab: { el: 'Μητρικές', en: 'Motherboards' },
  title: { el: 'Τιμές Μητρικών', en: 'Motherboard Prices' },
  subtitle: {
    el: 'Οι χαμηλότερες τιμές για κάθε μητρική στην Ελλάδα, από Skroutz, BestPrice, Shopflix, Snif και e-shop.gr.',
    en: 'The lowest price for every motherboard in Greece, from Skroutz, BestPrice, Shopflix, Snif and e-shop.gr.',
  },
  icon: Microchip,
  empty: noResults('μητρικές', 'motherboards'),
  searchPlaceholder: search('B850, Tomahawk'),
  groups: [...MOBO_SOCKETS, OTHER],
  groupLabel: 'Socket',
  groupParam: 'sock',
  group: (l) => (l.socket && MOBO_SOCKETS.includes(l.socket) ? l.socket : OTHER),
  groupDot: {
    AM5: 'bg-red-500', AM4: 'bg-orange-400', LGA1851: 'bg-sky-500', LGA1700: 'bg-indigo-400', [OTHER]: 'bg-zinc-400',
  },
  // Most-offered boards first rather than socket by socket.
  sortByGroup: false,
  segments: { main: 'Desktop', pro: 'Server / Workstation' },
  modelKey: (l) => productKey(l.chip),
  // Server/HEDT sockets, workstation chipsets (W790, C266…) and server boards without a chipset name.
  isPro: (l) => !DESKTOP_SOCKETS.test(l.socket ?? '') || !l.chipset || /^[WC]/.test(l.chipset),
  tierScore: (m) => m.listings.length,
  searchText: (l) => `${l.chip} ${l.title} ${l.chipset ?? ''} ${l.socket ?? ''} ${l.formFactor}`,
  extraFilters: [
    oneOf('platform', { el: 'Πλατφόρμα', en: 'Platform' }, (l) => moboPlatform(l.socket), { fixed: ['AMD', 'Intel'] }),
    oneOf('socket', 'Socket', (l) => l.socket, { rank: socketRank }),
    oneOf('chipset', 'Chipset', (l) => l.chipset),
    oneOf('formFactor', SIZE, (l) => l.formFactor, { fixed: BOARD_SIZES }),
    oneOf('memory', MEMORY, (l) => l.memory, { fixed: ['DDR5', 'DDR4'] }),
    oneOf('ramSlots', { el: 'Υποδοχές RAM', en: 'RAM slots' }, (l) => l.ramSlots, { order: 'asc' }),
    yesNo('wifi', 'WiFi', (l) => l.wifi),
    vendorFilter(),
  ],
  before: [
    { header: 'Chipset', cell: (m) => moboChipset(m) ?? '—' },
    // From xl only: at 1024–1279px eight columns don't fit (the chipset already tells the platform).
    { header: 'Socket', className: 'hidden xl:table-cell', cell: (m) => moboSocket(m) ?? '—' },
    { header: SIZE, className: 'hidden sm:table-cell', cell: (m, lang) => groupName(moboForm(m), lang) },
  ],
  after: [
    {
      header: MEMORY,
      className: 'hidden sm:table-cell',
      cell: (m, lang) => {
        const slots = moboSlots(m);
        const mem = moboMemory(m);
        const parts = [mem, slots != null ? `${slots} ${tr(lang, { el: 'υποδ.', en: 'slots' })}` : null];
        return parts.filter(Boolean).join(' · ') || '—';
      },
    },
  ],
};

// ---------- RAM ----------
// Models are kits by spec across vendors ("DDR5 32GB (2×16GB) 6000MHz"), split by form factor.

const FORM_LABEL: Record<RamListing['formFactor'], string> = { Desktop: 'Desktop', Laptop: 'Laptop (SO-DIMM)', Server: 'Server' };

export const RAM: CategoryConfig<RamListing> = {
  id: 'ram',
  tab: { el: 'Μνήμες RAM', en: 'Memory (RAM)' },
  title: { el: 'Τιμές Μνημών RAM', en: 'Memory (RAM) Prices' },
  subtitle: {
    el: 'Οι χαμηλότερες τιμές RAM στην Ελλάδα ανά χωρητικότητα και ταχύτητα, από Skroutz, BestPrice, Shopflix, Snif και e-shop.gr.',
    en: 'The lowest RAM prices in Greece by capacity and speed, from Skroutz, BestPrice, Shopflix, Snif and e-shop.gr.',
  },
  icon: MemoryStick,
  empty: noResults('μνήμες', 'memory kits'),
  searchPlaceholder: search('2x16GB 6000, Fury'),
  groups: ['DDR5', 'DDR4', 'DDR3', 'DDR2'],
  groupLabel: { el: 'Τύπος μνήμης', en: 'Memory type' },
  groupParam: 'type',
  group: (l) => l.type,
  groupDot: { DDR5: 'bg-violet-500', DDR4: 'bg-sky-500', DDR3: 'bg-amber-500', DDR2: 'bg-zinc-400' },
  segments: { main: 'Desktop', pro: 'Laptop / Server' },
  modelKey: (l) => `${l.chip} ${l.formFactor}`,
  isPro: (l) => l.formFactor !== 'Desktop',
  // Most-offered kits first (DDR5 32GB 6000 over a lone 384GB kit), then bigger, then faster.
  tierScore: (m) => m.listings.length * 1e7 + m.cheapest.capacity * 1e4 + (m.cheapest.speed ?? 0) / 10,
  value: ramValue,
  searchText: (l) => `${l.chip} ${l.modules}x${l.capacity / l.modules}GB ${l.title} ${l.brand}`,
  extraFilters: [
    threshold('capacity', atLeastLabel({ el: 'Χωρητικότητα', en: 'Capacity' }), (l) => l.capacity, (v) => `≥ ${v}GB`, {
      fixed: [4, 8, 16, 32, 48, 64, 96, 128, 192, 256],
    }),
    // Speeds seen on at least 10 listings, so odd one-offs don't flood the list.
    threshold('speed', atLeastLabel({ el: 'Ταχύτητα', en: 'Speed' }), (l) => l.speed, (v) => `≥ ${v}MHz`, { minCount: 10 }),
    oneOf('modules', { el: 'Τεμάχια στο kit', en: 'Sticks in kit' }, (l) => l.modules, {
      order: 'asc',
      fmt: (v) => ({ el: `${v} × module`, en: `${v} × stick` }),
    }),
    threshold('cas', { el: 'Latency (το πολύ)', en: 'Latency (at most)' }, (l) => l.cas, (v) => `≤ CL${v}`, {
      max: true,
      minCount: 5,
    }),
    vendorFilter(),
  ],
  before: [{ header: TYPE, className: 'hidden sm:table-cell', cell: (m) => FORM_LABEL[m.cheapest.formFactor] }],
  after: [
    { header: 'CL', className: 'hidden md:table-cell', numeric: true, cell: (m) => m.cheapest.cas ?? '—' },
    { header: VENDOR, className: 'hidden sm:table-cell', cell: (m) => m.cheapest.brand },
  ],
};

// ---------- PSU ----------
// Models are specs across vendors ("850W Gold"), split by form factor like RAM.

const MODULAR_LABEL: Record<string, Text> = {
  Full: { el: 'Πλήρως modular', en: 'Fully modular' },
  Semi: 'Semi-modular',
  Non: { el: 'Μη modular', en: 'Non-modular' },
};

export const PSU: CategoryConfig<PsuListing> = {
  id: 'psu',
  tab: { el: 'Τροφοδοτικά', en: 'Power Supplies' },
  title: { el: 'Τιμές Τροφοδοτικών', en: 'Power Supply Prices' },
  subtitle: {
    el: 'Οι χαμηλότερες τιμές τροφοδοτικών PC στην Ελλάδα ανά ισχύ και πιστοποίηση, από Skroutz, BestPrice, Shopflix, Snif και e-shop.gr.',
    en: 'The lowest PC power supply prices in Greece by wattage and efficiency rating, from Skroutz, BestPrice, Shopflix, Snif and e-shop.gr.',
  },
  icon: Plug,
  empty: noResults('τροφοδοτικά', 'power supplies'),
  searchPlaceholder: search('850W, RM850x'),
  groups: ['Diamond', 'Titanium', 'Platinum', 'Gold', 'Silver', 'Bronze', 'Standard', NO_RATING],
  groupLabel: { el: 'Πιστοποίηση', en: 'Efficiency' },
  groupParam: 'eff',
  group: (l) => l.efficiency ?? NO_RATING,
  groupDot: {
    Diamond: 'bg-cyan-400', Titanium: 'bg-slate-300', Platinum: 'bg-indigo-300', Gold: 'bg-yellow-500',
    Silver: 'bg-zinc-400', Bronze: 'bg-amber-700', Standard: 'bg-zinc-500', [NO_RATING]: 'bg-zinc-600',
  },
  // Most-offered specs first (850W Gold, 650W Bronze…) rather than rare Titanium units.
  sortByGroup: false,
  segments: { main: 'ATX', pro: 'SFX / TFX / Flex' },
  modelKey: (l) => `${l.chip} ${l.formFactor}`,
  isPro: (l) => l.formFactor !== 'ATX',
  tierScore: (m) => m.listings.length * 1e5 + m.cheapest.watts,
  value: psuValue,
  searchText: (l) => `${l.chip} ${l.title} ${l.brand} ${l.formFactor}`,
  extraFilters: [
    threshold('watts', atLeastLabel({ el: 'Ισχύς', en: 'Wattage' }), (l) => l.watts, (v) => `≥ ${v}W`, {
      fixed: [300, 400, 450, 500, 550, 600, 650, 700, 750, 850, 1000, 1200, 1300, 1500, 1600],
    }),
    oneOf('modular', 'Modular', (l) => l.modular, { fixed: ['Full', 'Semi', 'Non'], fmt: (v) => MODULAR_LABEL[v] }),
    vendorFilter(),
  ],
  before: [{ header: TYPE, className: 'hidden sm:table-cell', cell: (m) => m.cheapest.formFactor }],
  after: [{ header: VENDOR, className: 'hidden sm:table-cell', cell: (m) => m.cheapest.brand }],
};

// ---------- Cases, fans, coolers ----------
// The product is its own model: listings are grouped by vendor + model name, colours merged.

/** Same as `model_key` in scraper/names.py: letters and digits only. */
const productKey = (chip: string) => chip.toLowerCase().replace(/[^a-z0-9]/g, '');

const BOARD_RANK: BoardSize[] = ['Mini ITX', 'Micro ATX', 'ATX', 'E-ATX'];
const BOARD_BY_CASE_SIZE: Record<CaseListing['size'], BoardSize> = {
  'Full Tower': 'E-ATX', 'Midi Tower': 'ATX', 'Mini Tower': 'Micro ATX', 'SFF / Cube': 'Mini ITX', [OTHER]: 'ATX',
};
/** Largest board a case takes: as stated (Skroutz), else the usual one for its size. */
export const caseMaxBoard = (l: CaseListing): BoardSize => l.maxBoard ?? BOARD_BY_CASE_SIZE[l.size];

export const CASE: CategoryConfig<CaseListing> = {
  id: 'case',
  tab: { el: 'Κουτιά', en: 'Cases' },
  title: { el: 'Τιμές Κουτιών PC', en: 'PC Case Prices' },
  subtitle: {
    el: 'Οι χαμηλότερες τιμές για κάθε κουτί υπολογιστή στην Ελλάδα, από Skroutz, BestPrice, Shopflix, Snif και e-shop.gr.',
    en: 'The lowest price for every PC case in Greece, from Skroutz, BestPrice, Shopflix, Snif and e-shop.gr.',
  },
  icon: Box,
  empty: noResults('κουτιά', 'cases'),
  searchPlaceholder: search('Lancool 216, H5'),
  groups: ['Full Tower', 'Midi Tower', 'Mini Tower', 'SFF / Cube', OTHER],
  groupLabel: SIZE,
  groupParam: 'size',
  group: (l) => l.size,
  groupDot: {
    'Full Tower': 'bg-violet-500', 'Midi Tower': 'bg-sky-500', 'Mini Tower': 'bg-teal-500',
    'SFF / Cube': 'bg-amber-500', [OTHER]: 'bg-zinc-400',
  },
  // Most-offered cases first (on both sites, several colours) rather than by size.
  sortByGroup: false,
  modelKey: (l) => productKey(l.chip),
  isPro: () => false,
  tierScore: (m) => m.listings.length,
  searchText: (l) => `${l.chip} ${l.title} ${l.size}`,
  extraFilters: [
    {
      key: 'fits',
      label: { el: 'Χωράει μητρική', en: 'Fits motherboard' },
      options: () => BOARD_RANK.map((b) => ({ value: slug(b), label: b })),
      test: (l, v) => BOARD_RANK.indexOf(caseMaxBoard(l)) >= BOARD_RANK.findIndex((b) => slug(b) === v),
    },
    yesNo('window', { el: 'Πλαϊνό παράθυρο', en: 'Side window' }, (l) => l.window),
    yesNo('rgb', 'RGB', (l) => l.rgb),
    vendorFilter(),
  ],
  before: [{ header: SIZE, className: 'hidden sm:table-cell', cell: (m, lang) => groupName(m.cheapest.size, lang) }],
  after: [
    {
      header: { el: 'Έως μητρική', en: 'Max board' },
      className: 'hidden md:table-cell',
      cell: (m) => mostCommon(m.listings.map(caseMaxBoard)),
    },
  ],
};

const fanGroup = (size: number) =>
  size === 120 ? '120mm' : size === 140 ? '140mm' : size === 80 || size === 92 ? '80–92mm' : size >= 180 ? '180mm+' : OTHER;

export const FAN: CategoryConfig<FanListing> = {
  id: 'fan',
  tab: { el: 'Ανεμιστήρες', en: 'Case Fans' },
  title: { el: 'Τιμές Ανεμιστήρων', en: 'Case Fan Prices' },
  subtitle: {
    el: 'Οι χαμηλότερες τιμές ανεμιστήρων κουτιού στην Ελλάδα, ανά μοντέλο και συσκευασία, από Skroutz, BestPrice, Shopflix, Snif και e-shop.gr.',
    en: 'The lowest case fan prices in Greece, by model and pack size, from Skroutz, BestPrice, Shopflix, Snif and e-shop.gr.',
  },
  icon: Fan,
  empty: noResults('ανεμιστήρες', 'fans'),
  searchPlaceholder: search('P12 Pro, Uni Fan'),
  groups: ['120mm', '140mm', '80–92mm', '180mm+', OTHER],
  groupLabel: SIZE,
  groupParam: 'size',
  group: (l) => fanGroup(l.size),
  groupDot: {
    '120mm': 'bg-sky-500', '140mm': 'bg-violet-500', '80–92mm': 'bg-teal-500', '180mm+': 'bg-amber-500',
    [OTHER]: 'bg-zinc-400',
  },
  // Most-offered fans first; a pack is its own model ("… 120mm ×3") so it never competes with singles.
  sortByGroup: false,
  modelKey: (l) => productKey(l.chip),
  isPro: () => false,
  tierScore: (m) => m.listings.length,
  value: fanValue,
  searchText: (l) => `${l.chip} ${l.title}`,
  extraFilters: [
    oneOf('pack', { el: 'Τεμάχια στη συσκευασία', en: 'Fans in pack' }, (l) => l.pack, { order: 'asc', minCount: 3 }),
    yesNo('rgb', 'RGB', (l) => l.rgb),
    yesNo('pwm', { el: 'PWM (έλεγχος στροφών)', en: 'PWM (speed control)' }, (l) => l.pwm),
    vendorFilter(),
  ],
  before: [{ header: { el: 'Τεμάχια', en: 'Pack' }, className: 'hidden sm:table-cell', numeric: true, cell: (m) => m.cheapest.pack }],
  after: [
    {
      header: { el: 'Ανά τεμάχιο', en: 'Per fan' },
      className: 'hidden sm:table-cell',
      numeric: true,
      cell: (m, lang) => (m.cheapest.pack > 1 ? formatPrice(m.cheapest.price / m.cheapest.pack, lang) : '—'),
    },
  ],
};

const coolerGroup = (l: CoolerListing) =>
  l.type === 'Air'
    ? AIR
    : (l.radiator ?? 0) <= 140
      ? 'AIO 120–140'
      : (l.radiator ?? 0) <= 280
        ? 'AIO 240–280'
        : 'AIO 360–420';

export const COOLER: CategoryConfig<CoolerListing> = {
  id: 'cooler',
  tab: { el: 'Ψύκτρες CPU', en: 'CPU Coolers' },
  title: { el: 'Τιμές Ψυκτρών CPU', en: 'CPU Cooler Prices' },
  subtitle: {
    el: 'Οι χαμηλότερες τιμές για ψύκτρες αέρα και υδροψύξεις AIO στην Ελλάδα, από Skroutz, BestPrice, Shopflix, Snif και e-shop.gr.',
    en: 'The lowest prices for air coolers and AIO liquid coolers in Greece, from Skroutz, BestPrice, Shopflix, Snif and e-shop.gr.',
  },
  icon: Snowflake,
  empty: noResults('ψύκτρες', 'coolers'),
  searchPlaceholder: search('Peerless Assassin'),
  groups: [AIR, 'AIO 120–140', 'AIO 240–280', 'AIO 360–420'],
  groupLabel: TYPE,
  groupParam: 'type',
  group: coolerGroup,
  groupDot: { [AIR]: 'bg-sky-500', 'AIO 120–140': 'bg-teal-500', 'AIO 240–280': 'bg-violet-500', 'AIO 360–420': 'bg-fuchsia-500' },
  sortByGroup: false,
  modelKey: (l) => productKey(l.chip),
  isPro: () => false,
  tierScore: (m) => m.listings.length,
  searchText: (l) => `${l.chip} ${l.title}`,
  extraFilters: [
    oneOf('radiator', { el: 'Ψυγείο AIO', en: 'AIO radiator' }, (l) => l.radiator, {
      order: 'asc',
      minCount: 3,
      fmt: (v) => `${v}mm`,
    }),
    yesNo('rgb', 'RGB', (l) => l.rgb),
    vendorFilter(),
  ],
  before: [
    {
      header: TYPE,
      className: 'hidden sm:table-cell',
      cell: (m, lang) => (m.cheapest.type === 'Air' ? groupName(AIR, lang) : `AIO ${m.cheapest.radiator}mm`),
    },
  ],
  after: [],
};

export const CATEGORIES = {
  gpu: GPU, cpu: CPU, mobo: MOBO, ram: RAM, psu: PSU, case: CASE, fan: FAN, cooler: COOLER,
} as const;
export const CATEGORY_IDS = Object.keys(CATEGORIES) as Category[];
