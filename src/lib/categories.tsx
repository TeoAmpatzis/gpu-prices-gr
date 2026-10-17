import type { ReactNode } from 'react';
import { Box, CircuitBoard, Cpu, Fan, HardDrive, MemoryStick, Microchip, Plug, Snowflake, type LucideIcon } from 'lucide-react';
import type {
  BaseListing,
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
import { formatPrice, mostCommon, type Model } from './data';
import { T, tr, type Lang, type Text } from './i18n';
import {
  AIR,
  caseMaxBoard,
  CASE_RULES,
  COOLER_RULES,
  CPU_RULES,
  FAN_RULES,
  GPU_RULES,
  GROUP_NAMES,
  MEMORY,
  MOBO_RULES,
  NO_RATING,
  OTHER,
  PSU_RULES,
  RAM_RULES,
  SIZE,
  storageType,
  STORAGE_RULES,
  VENDOR,
  type CategoryRules,
} from './categoryRules';
import { fanValue, gpuValue, psuValue, ramValue, storageValue } from './value';
import { CAT_PAGE } from '../shell/texts';

export interface Column<L extends BaseListing> {
  header: Text;
  className?: string; // applied to both <th> and <td>, e.g. responsive hiding
  numeric?: boolean; // right-aligned (numbers are tabular everywhere in the table)
  cell: (m: Model<L>, lang: Lang) => ReactNode;
  /** Set on the maker column of categories whose model spans several makers: the maker of one listing. */
  maker?: (l: L) => string | null;
  /** Phone cards have no headers: this label goes before the value. */
  cardLabel?: Text;
}

export type { CategoryRules, ExtraFilter } from './categoryRules';
export { BOARD_BY_CASE_SIZE, caseMaxBoard, storageType } from './categoryRules';

/** Everything that differs between the category pages (filtering and grouping: `CategoryRules`). */
export interface CategoryConfig<L extends BaseListing> extends CategoryRules<L> {
  tab: Text;
  title: Text;
  subtitle: Text;
  icon: LucideIcon;
  empty: Text;
  searchPlaceholder: Text;
  groupLabel: Text; // heading above the pills
  /** URL parameter for the pills (e.g. "type" → #ram?type=ddr5,ddr4). */
  groupParam: string;
  groupDot: Record<string, string>; // Tailwind bg class per group: neutral on purpose (green/red mean "fits / price down" and "error / price up")
  /** Default true: the "Recommended" sort goes group by group before `tierScore`. */
  sortByGroup?: boolean;
  /** Capacity in TB (storage): adds the "€/TB" sort. */
  capacityTb?: (l: L) => number | null;
  /** Higher = listed first when sorting by model (categories without a `value` score). */
  tierScore: (m: Model<L>) => number;
  /** Value for money (higher = more for the money); drives the "Recommended" sort when set. */
  value?: (m: Model<L>) => number | null;
  /** Columns between the model name and the price, and after the price. */
  before: Column<L>[];
  after: Column<L>[];
}

/** Display name of a group key (pill, dot tooltip, table cell). */
export const groupName = (g: string, lang: Lang) => tr(lang, GROUP_NAMES[g] ?? g);

/** The segmented control's options in display order: main, the middle ones, pro, All. */
export function segmentOptions<L extends BaseListing>(cfg: CategoryConfig<L>): { value: string; label: Text }[] {
  if (!cfg.segments) return [];
  return [
    { value: 'main', label: cfg.segments.main },
    ...(cfg.segments.middle ?? []),
    { value: 'pro', label: cfg.segments.pro },
    { value: 'all', label: T.all },
  ];
}

const CHEAPEST_FROM: Text = { el: 'Φθηνότερο από', en: 'Cheapest from' };
const TYPE: Text = { el: 'Τύπος', en: 'Type' };
// Short enough to fit the 17rem sidebar and the builder picker (longer ones end in "…").
const search = (examples: string): Text => ({ el: `π.χ. ${examples}`, en: `e.g. ${examples}` });
const noResults = (el: string, en: string): Text => ({
  el: `Δεν βρέθηκαν ${el} με αυτά τα φίλτρα.`,
  en: `No ${en} match these filters.`,
});
// ---------- GPU ----------

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

const gpuVram = (m: Model<GpuListing>) => m.cheapest.vram;

export const GPU: CategoryConfig<GpuListing> = {
  ...GPU_RULES,
  tab: { el: 'Κάρτες Γραφικών', en: 'Graphics Cards' },
  title: CAT_PAGE.gpu.title,
  subtitle: CAT_PAGE.gpu.subtitle,
  icon: CircuitBoard,
  empty: noResults('κάρτες', 'graphics cards'),
  searchPlaceholder: search('5070 Ti, Sapphire'),
  groupLabel: VENDOR,
  groupParam: 'brand',
  groupDot: { NVIDIA: 'bg-idle', AMD: 'bg-idle', Intel: 'bg-idle' },
  tierScore: (m) => gpuChipScore(m.cheapest.chip) * 100 + gpuVram(m),
  value: gpuValue,
  before: [
    { header: 'VRAM', numeric: true, cell: (m) => `${gpuVram(m)}GB` },
    { header: MEMORY, className: 'hidden md:table-cell', cell: (m) => mostCommon(m.listings.map((l) => l.memType)) ?? '—' },
  ],
  after: [{ header: CHEAPEST_FROM, cardLabel: CHEAPEST_FROM, maker: (l) => l.partner, className: 'hidden sm:table-cell', cell: (m) => m.cheapest.partner }],
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

export const CPU: CategoryConfig<CpuListing> = {
  ...CPU_RULES,
  tab: { el: 'Επεξεργαστές', en: 'Processors' },
  title: CAT_PAGE.cpu.title,
  subtitle: CAT_PAGE.cpu.subtitle,
  icon: Cpu,
  empty: noResults('επεξεργαστές', 'processors'),
  searchPlaceholder: search('9800X3D, 14600K'),
  groupLabel: VENDOR,
  groupParam: 'brand',
  groupDot: { AMD: 'bg-idle', Intel: 'bg-idle' },
  tierScore: (m) => cpuTierScore(m.chip),
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
export const MOBO: CategoryConfig<MoboListing> = {
  ...MOBO_RULES,
  tab: { el: 'Μητρικές', en: 'Motherboards' },
  title: CAT_PAGE.mobo.title,
  subtitle: CAT_PAGE.mobo.subtitle,
  icon: Microchip,
  empty: noResults('μητρικές', 'motherboards'),
  searchPlaceholder: search('B850, Tomahawk'),
  groupLabel: 'Socket',
  groupParam: 'sock',
  groupDot: {
    AM5: 'bg-idle', AM4: 'bg-idle', LGA1851: 'bg-idle', LGA1700: 'bg-idle', [OTHER]: 'bg-idle',
  },
  // Most-offered boards first rather than socket by socket.
  sortByGroup: false,
  tierScore: (m) => m.listings.length,
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
  ...RAM_RULES,
  tab: { el: 'Μνήμες RAM', en: 'Memory (RAM)' },
  title: CAT_PAGE.ram.title,
  subtitle: CAT_PAGE.ram.subtitle,
  icon: MemoryStick,
  empty: noResults('μνήμες', 'memory kits'),
  searchPlaceholder: search('2x16GB 6000, Fury'),
  groupLabel: { el: 'Τύπος μνήμης', en: 'Memory type' },
  groupParam: 'type',
  groupDot: { DDR5: 'bg-idle', DDR4: 'bg-idle', DDR3: 'bg-idle', DDR2: 'bg-idle' },
  // Most-offered kits first (DDR5 32GB 6000 over a lone 384GB kit), then bigger, then faster.
  tierScore: (m) => m.listings.length * 1e7 + m.cheapest.capacity * 1e4 + (m.cheapest.speed ?? 0) / 10,
  value: ramValue,
  before: [{ header: TYPE, className: 'hidden sm:table-cell', cell: (m) => FORM_LABEL[m.cheapest.formFactor] }],
  after: [
    { header: 'CL', className: 'hidden md:table-cell', numeric: true, cell: (m) => m.cheapest.cas ?? '—' },
    { header: CHEAPEST_FROM, cardLabel: CHEAPEST_FROM, maker: (l) => l.brand, className: 'hidden sm:table-cell', cell: (m) => m.cheapest.brand },
  ],
};

// ---------- PSU ----------
// Models are specs across vendors ("850W Gold"), split by form factor like RAM.

export const PSU: CategoryConfig<PsuListing> = {
  ...PSU_RULES,
  tab: { el: 'Τροφοδοτικά', en: 'Power Supplies' },
  title: CAT_PAGE.psu.title,
  subtitle: CAT_PAGE.psu.subtitle,
  icon: Plug,
  empty: noResults('τροφοδοτικά', 'power supplies'),
  searchPlaceholder: search('850W, RM850x'),
  groupLabel: { el: 'Πιστοποίηση', en: 'Efficiency' },
  groupParam: 'eff',
  groupDot: {
    Diamond: 'bg-idle', Titanium: 'bg-idle', Platinum: 'bg-idle', Gold: 'bg-idle',
    Silver: 'bg-idle', Bronze: 'bg-idle', Standard: 'bg-idle', [NO_RATING]: 'bg-idle',
  },
  // Most-offered specs first (850W Gold, 650W Bronze…) rather than rare Titanium units.
  sortByGroup: false,
  tierScore: (m) => m.listings.length * 1e5 + m.cheapest.watts,
  value: psuValue,
  before: [{ header: TYPE, className: 'hidden sm:table-cell', cell: (m) => m.cheapest.formFactor }],
  after: [{ header: CHEAPEST_FROM, cardLabel: CHEAPEST_FROM, maker: (l) => l.brand, className: 'hidden sm:table-cell', cell: (m) => m.cheapest.brand }],
};

// ---------- Cases, fans, coolers ----------
// The product is its own model: listings are grouped by vendor + model name, colours merged.

export const CASE: CategoryConfig<CaseListing> = {
  ...CASE_RULES,
  tab: { el: 'Κουτιά', en: 'Cases' },
  title: CAT_PAGE.case.title,
  subtitle: CAT_PAGE.case.subtitle,
  icon: Box,
  empty: noResults('κουτιά', 'cases'),
  searchPlaceholder: search('Lancool 216, H5'),
  groupLabel: SIZE,
  groupParam: 'size',
  groupDot: {
    'Full Tower': 'bg-idle', 'Midi Tower': 'bg-idle', 'Mini Tower': 'bg-idle',
    'SFF / Cube': 'bg-idle', [OTHER]: 'bg-idle',
  },
  // Most-offered cases first (on both sites, several colours) rather than by size.
  sortByGroup: false,
  tierScore: (m) => m.listings.length,
  before: [{ header: SIZE, className: 'hidden sm:table-cell', cell: (m, lang) => groupName(m.cheapest.size, lang) }],
  after: [
    {
      header: { el: 'Έως μητρική', en: 'Max board' },
      className: 'hidden md:table-cell',
      cell: (m) => mostCommon(m.listings.map(caseMaxBoard)),
    },
  ],
};

export const FAN: CategoryConfig<FanListing> = {
  ...FAN_RULES,
  tab: { el: 'Ανεμιστήρες', en: 'Case Fans' },
  title: CAT_PAGE.fan.title,
  subtitle: CAT_PAGE.fan.subtitle,
  icon: Fan,
  empty: noResults('ανεμιστήρες', 'fans'),
  searchPlaceholder: search('P12 Pro, Uni Fan'),
  groupLabel: SIZE,
  groupParam: 'size',
  groupDot: {
    '120mm': 'bg-idle', '140mm': 'bg-idle', '80–92mm': 'bg-idle', '180mm+': 'bg-idle',
    [OTHER]: 'bg-idle',
  },
  // Most-offered fans first; a pack is its own model ("… 120mm ×3") so it never competes with singles.
  sortByGroup: false,
  tierScore: (m) => m.listings.length,
  value: fanValue,
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

export const COOLER: CategoryConfig<CoolerListing> = {
  ...COOLER_RULES,
  tab: { el: 'Ψύκτρες CPU', en: 'CPU Coolers' },
  title: CAT_PAGE.cooler.title,
  subtitle: CAT_PAGE.cooler.subtitle,
  icon: Snowflake,
  empty: noResults('ψύκτρες', 'coolers'),
  searchPlaceholder: search('Peerless Assassin'),
  groupLabel: TYPE,
  groupParam: 'type',
  groupDot: { [AIR]: 'bg-idle', 'AIO 120–140': 'bg-idle', 'AIO 240–280': 'bg-idle', 'AIO 360–420': 'bg-idle' },
  sortByGroup: false,
  tierScore: (m) => m.listings.length,
  before: [
    {
      header: TYPE,
      className: 'hidden sm:table-cell',
      cell: (m, lang) => (m.cheapest.type === 'Air' ? groupName(AIR, lang) : `AIO ${m.cheapest.radiator}mm`),
    },
  ],
  after: [],
};

// ---------- Storage ----------
// A model is one drive at one capacity ("Samsung 990 Pro 1TB"), like cases; the tier (consumer /
// NAS / server) comes from the scraper (scraper/normalize_storage.py, owner's rules).

/** "500GB", "1TB", "1.92TB". */
export const capacityLabel = (gb: number) => (gb < 1000 ? `${gb}GB` : `${+(gb / 1000).toFixed(2)}TB`);

/** "NVMe Gen4 · M.2 2280", "SATA · 2.5″", "HDD · 3.5″ · 7200 rpm". */
export function storageTypeLine(l: StorageListing): string {
  const kind = storageType(l);
  const head = kind === 'NVMe' ? `NVMe${l.pcie ? ` Gen${l.pcie}` : ''}` : kind === 'SATA SSD' ? 'SATA' : kind === 'SAS SSD' ? 'SAS' : 'HDD';
  return [head, l.formFactor, l.media === 'HDD' && l.rpm ? `${l.rpm} rpm` : null].filter(Boolean).join(' · ');
}

/** "7.450 MB/s · DRAM · 600 TBW" (SSD) / "256MB cache" (HDD); '' when nothing is stated. */
function storageSpecs(m: Model<StorageListing>, lang: Lang): string {
  const l = m.cheapest;
  const parts =
    l.media === 'HDD'
      ? [l.cacheMB ? `${l.cacheMB}MB cache` : null]
      : [
          l.readMBs ? `${l.readMBs.toLocaleString(lang === 'el' ? 'el-GR' : 'en-US')} MB/s` : null,
          l.dram === true ? 'DRAM' : l.dram === false ? tr(lang, { el: 'χωρίς DRAM', en: 'DRAM-less' }) : null,
          l.tbw ? `${l.tbw} TBW` : null,
        ];
  return parts.filter(Boolean).join(' · ');
}

export const STORAGE: CategoryConfig<StorageListing> = {
  ...STORAGE_RULES,
  // "Δίσκοι" (not "Αποθήκευση"): with nine tabs + the builder, the Greek tab bar must fit 1248px.
  tab: { el: 'Δίσκοι', en: 'Storage' },
  title: CAT_PAGE.storage.title,
  subtitle: CAT_PAGE.storage.subtitle,
  icon: HardDrive,
  empty: noResults('δίσκοι', 'drives'),
  searchPlaceholder: search('990 Pro, IronWolf'),
  groupLabel: TYPE,
  groupParam: 'type',
  groupDot: { NVMe: 'bg-idle', 'SATA SSD': 'bg-idle', 'SAS SSD': 'bg-idle', HDD: 'bg-idle' },
  // Most-offered drives first rather than type by type.
  sortByGroup: false,
  capacityTb: (l) => (l.capacity ? l.capacity / 1000 : null),
  tierScore: (m) => m.listings.length,
  value: storageValue,
  // The capacity is in every name ("… 2TB"), so it has no column. The table (from 1024px) shows the
  // specs under the type; cards (below 1024px) list the columns in one line, specs included.
  before: [
    {
      header: TYPE,
      className: 'hidden sm:table-cell',
      cell: (m, lang) => {
        const specs = storageSpecs(m, lang);
        return (
          <>
            <span>{storageTypeLine({ ...m.cheapest, rpm: m.cheapest.rpm ?? mostCommon(m.listings.map((l) => l.rpm)) })}</span>
            {specs && <span className="hidden text-xs text-faint lg:block">{specs}</span>}
          </>
        );
      },
    },
  ],
  after: [
    {
      header: '€/TB',
      className: 'hidden sm:table-cell',
      numeric: true,
      cell: (m, lang) => (m.cheapest.capacity ? `${formatPrice(m.cheapest.price / (m.cheapest.capacity / 1000), lang)}/TB` : '—'),
    },
    // Cards only (the table shows these under the type).
    { header: { el: 'Χαρακτηριστικά', en: 'Specs' }, className: 'hidden', cell: (m, lang) => storageSpecs(m, lang) || '—' },
  ],
};

export const CATEGORIES = {
  gpu: GPU, cpu: CPU, mobo: MOBO, ram: RAM, storage: STORAGE, psu: PSU, case: CASE, fan: FAN, cooler: COOLER,
} as const;
export const CATEGORY_IDS = Object.keys(CATEGORIES) as Category[];
