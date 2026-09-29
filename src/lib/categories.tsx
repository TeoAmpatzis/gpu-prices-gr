import type { ReactNode } from 'react';
import { Box, CircuitBoard, Cpu, Fan, MemoryStick, Plug, Snowflake, type LucideIcon } from 'lucide-react';
import type {
  BaseListing,
  CaseListing,
  Category,
  CoolerListing,
  CpuListing,
  FanListing,
  GpuListing,
  PsuListing,
  RamListing,
} from '../types';
import { formatPrice, mostCommon, type Filters, type Model } from './data';

export interface Column<L extends BaseListing> {
  header: string;
  className?: string; // applied to both <th> and <td>, e.g. responsive hiding
  cell: (m: Model<L>) => ReactNode;
}

/** A select in the filter bar that only applies to one category. */
export interface ExtraFilter {
  key: 'minVram' | 'socket' | 'minCores' | 'minCapacity' | 'minSpeed' | 'minWatts' | 'window' | 'rgb' | 'pack';
  options: (listings: BaseListing[]) => { value: string | number; label: string }[];
}

/** Everything that differs between the GPU and CPU pages. */
export interface CategoryConfig<L extends BaseListing> {
  id: Category;
  tab: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  empty: string;
  searchPlaceholder: string;
  /** Pill filter values, in display/sort order: brands for GPU/CPU, memory type for RAM. */
  groups: string[];
  groupLabel: string; // heading above the pills
  group: (l: L) => string;
  groupDot: Record<string, string>; // Tailwind bg class per group
  /** Default true: "Μοντέλο" sort goes group by group before `tierScore`. */
  sortByGroup?: boolean;
  /** Two-way split shown as a segmented control; omitted when a category has none (cases). */
  segments?: { main: string; pro: string };
  /** Same key as `model_key` in scraper/categories.py. */
  modelKey: (l: L) => string;
  isPro: (l: L) => boolean;
  /** Higher = listed first when sorting by model. */
  tierScore: (m: Model<L>) => number;
  searchText: (l: L) => string;
  matchesModel: (m: Model<L>, f: Filters) => boolean;
  extraFilters: ExtraFilter[];
  /** Columns between the model name and the price, and after the price. */
  before: Column<L>[];
  after: Column<L>[];
}

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

const gpuVram = (m: Model<GpuListing>) => m.cheapest.vram;

export const GPU: CategoryConfig<GpuListing> = {
  id: 'gpu',
  tab: 'Κάρτες Γραφικών',
  title: 'Τιμές Καρτών Γραφικών',
  subtitle: 'Οι χαμηλότερες τιμές GPU στην Ελλάδα από Skroutz και BestPrice.',
  icon: CircuitBoard,
  empty: 'Δεν βρέθηκαν κάρτες με αυτά τα φίλτρα.',
  searchPlaceholder: 'Αναζήτηση (π.χ. 5070 Ti, Sapphire)',
  groups: ['NVIDIA', 'AMD', 'Intel'],
  groupLabel: 'Κατασκευαστής',
  group: (l) => l.brand,
  groupDot: { NVIDIA: 'bg-green-500', AMD: 'bg-red-500', Intel: 'bg-sky-500' },
  segments: { main: 'Gaming', pro: 'Workstation' },
  modelKey: (l) => `${l.chip} ${l.vram}GB`,
  isPro: (l) => GPU_WORKSTATION.test(l.chip),
  tierScore: (m) => gpuChipScore(m.chip) * 100 + gpuVram(m),
  searchText: (l) => `${l.chip} ${l.title} ${l.partner}`,
  matchesModel: (m, f) => gpuVram(m) >= f.minVram,
  extraFilters: [
    {
      key: 'minVram',
      options: () => [0, 8, 12, 16, 24].map((v) => ({ value: v, label: v === 0 ? 'Όλα τα VRAM' : `VRAM ≥ ${v}GB` })),
    },
  ],
  before: [{ header: 'VRAM', cell: (m) => `${gpuVram(m)}GB` }],
  after: [{ header: 'Κατασκευαστής', className: 'hidden sm:table-cell', cell: (m) => m.cheapest.partner }],
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

const socketRank = (s: string) => (/^(AM5|LGA1851|LGA1700|AM4)$/.test(s) ? 0 : 1);

export const CPU: CategoryConfig<CpuListing> = {
  id: 'cpu',
  tab: 'Επεξεργαστές',
  title: 'Τιμές Επεξεργαστών',
  subtitle: 'Οι χαμηλότερες τιμές CPU στην Ελλάδα από Skroutz και BestPrice.',
  icon: Cpu,
  empty: 'Δεν βρέθηκαν επεξεργαστές με αυτά τα φίλτρα.',
  searchPlaceholder: 'Αναζήτηση (π.χ. 9800X3D, 14600K, AM5)',
  groups: ['AMD', 'Intel'],
  groupLabel: 'Κατασκευαστής',
  group: (l) => l.brand,
  groupDot: { AMD: 'bg-red-500', Intel: 'bg-sky-500' },
  segments: { main: 'Desktop', pro: 'Server / HEDT' },
  modelKey: (l) => l.chip,
  isPro: (l) => /^(EPYC|Threadripper|Xeon)/.test(l.chip),
  tierScore: (m) => cpuTierScore(m.chip),
  searchText: (l) => `${l.chip} ${l.title} ${l.socket ?? ''}`,
  matchesModel: (m, f) => (!f.socket || cpuSocket(m) === f.socket) && (cpuCores(m) ?? 0) >= f.minCores,
  extraFilters: [
    {
      key: 'socket',
      options: (listings) => {
        const counts = new Map<string, number>();
        for (const l of listings as CpuListing[]) if (l.socket) counts.set(l.socket, (counts.get(l.socket) ?? 0) + 1);
        const sockets = [...counts.keys()].sort(
          (a, b) => socketRank(a) - socketRank(b) || counts.get(b)! - counts.get(a)!,
        );
        return [{ value: '', label: 'Όλα τα socket' }, ...sockets.map((s) => ({ value: s, label: s }))];
      },
    },
    {
      key: 'minCores',
      options: () => [0, 6, 8, 12, 16, 24].map((v) => ({ value: v, label: v === 0 ? 'Όλοι οι πυρήνες' : `≥ ${v} πυρήνες` })),
    },
  ],
  before: [
    { header: 'Πυρήνες', cell: (m) => cpuCores(m) ?? '—' },
    { header: 'Socket', className: 'hidden sm:table-cell', cell: (m) => cpuSocket(m) ?? '—' },
  ],
  after: [],
};

// ---------- RAM ----------
// Models are kits by spec across vendors ("DDR5 32GB (2×16GB) 6000MHz"), split by form factor.

const FORM_LABEL: Record<RamListing['formFactor'], string> = { Desktop: 'Desktop', Laptop: 'Laptop (SO-DIMM)', Server: 'Server' };

export const RAM: CategoryConfig<RamListing> = {
  id: 'ram',
  tab: 'Μνήμες RAM',
  title: 'Τιμές Μνημών RAM',
  subtitle: 'Οι χαμηλότερες τιμές RAM στην Ελλάδα ανά χωρητικότητα και ταχύτητα, από Skroutz και BestPrice.',
  icon: MemoryStick,
  empty: 'Δεν βρέθηκαν μνήμες με αυτά τα φίλτρα.',
  searchPlaceholder: 'Αναζήτηση (π.χ. 2x16GB 6000, Kingston Fury)',
  groups: ['DDR5', 'DDR4', 'DDR3', 'DDR2'],
  groupLabel: 'Τύπος μνήμης',
  group: (l) => l.type,
  groupDot: { DDR5: 'bg-violet-500', DDR4: 'bg-sky-500', DDR3: 'bg-amber-500', DDR2: 'bg-zinc-400' },
  segments: { main: 'Desktop', pro: 'Laptop / Server' },
  modelKey: (l) => `${l.chip} ${l.formFactor}`,
  isPro: (l) => l.formFactor !== 'Desktop',
  // Most-offered kits first (DDR5 32GB 6000 over a lone 384GB kit), then bigger, then faster.
  tierScore: (m) => m.listings.length * 1e7 + m.cheapest.capacity * 1e4 + (m.cheapest.speed ?? 0) / 10,
  searchText: (l) => `${l.chip} ${l.modules}x${l.capacity / l.modules}GB ${l.title} ${l.brand}`,
  matchesModel: (m, f) => m.cheapest.capacity >= f.minCapacity && (m.cheapest.speed ?? 0) >= f.minSpeed,
  extraFilters: [
    {
      key: 'minCapacity',
      options: () =>
        [0, 8, 16, 32, 64, 128].map((v) => ({ value: v, label: v === 0 ? 'Όλες οι χωρητικότητες' : `≥ ${v}GB` })),
    },
    {
      key: 'minSpeed',
      options: () =>
        [0, 3200, 3600, 5600, 6000, 6400, 8000].map((v) => ({ value: v, label: v === 0 ? 'Όλες οι ταχύτητες' : `≥ ${v}MHz` })),
    },
  ],
  before: [
    { header: 'Τύπος', className: 'hidden sm:table-cell', cell: (m) => FORM_LABEL[m.cheapest.formFactor] },
  ],
  after: [{ header: 'Κατασκευαστής', className: 'hidden sm:table-cell', cell: (m) => m.cheapest.brand }],
};

// ---------- PSU ----------
// Models are specs across vendors ("850W Gold"), split by form factor like RAM.

const NO_RATING = 'Χωρίς ένδειξη';

export const PSU: CategoryConfig<PsuListing> = {
  id: 'psu',
  tab: 'Τροφοδοτικά',
  title: 'Τιμές Τροφοδοτικών',
  subtitle: 'Οι χαμηλότερες τιμές τροφοδοτικών PC στην Ελλάδα ανά ισχύ και πιστοποίηση, από Skroutz και BestPrice.',
  icon: Plug,
  empty: 'Δεν βρέθηκαν τροφοδοτικά με αυτά τα φίλτρα.',
  searchPlaceholder: 'Αναζήτηση (π.χ. 850W, RM850x, Seasonic)',
  groups: ['Diamond', 'Titanium', 'Platinum', 'Gold', 'Silver', 'Bronze', 'Standard', NO_RATING],
  groupLabel: 'Πιστοποίηση',
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
  searchText: (l) => `${l.chip} ${l.title} ${l.brand} ${l.formFactor}`,
  matchesModel: (m, f) => m.cheapest.watts >= f.minWatts,
  extraFilters: [
    {
      key: 'minWatts',
      options: () =>
        [0, 450, 550, 650, 750, 850, 1000, 1200].map((v) => ({ value: v, label: v === 0 ? 'Όλες οι ισχύεις' : `≥ ${v}W` })),
    },
  ],
  before: [{ header: 'Τύπος', className: 'hidden sm:table-cell', cell: (m) => m.cheapest.formFactor }],
  after: [{ header: 'Κατασκευαστής', className: 'hidden sm:table-cell', cell: (m) => m.cheapest.brand }],
};

// ---------- Cases, fans, coolers ----------
// The product is its own model: listings are grouped by vendor + model name, colours merged.

/** Same as `model_key` in scraper/names.py: letters and digits only. */
const productKey = (chip: string) => chip.toLowerCase().replace(/[^a-z0-9]/g, '');
const yesNo = (all: string, yes: string, no: string) => () => [
  { value: '', label: all },
  { value: 'yes', label: yes },
  { value: 'no', label: no },
];
const matchYesNo = (want: string, has: boolean) => !want || (want === 'yes') === has;

export const CASE: CategoryConfig<CaseListing> = {
  id: 'case',
  tab: 'Κουτιά',
  title: 'Τιμές Κουτιών PC',
  subtitle: 'Οι χαμηλότερες τιμές για κάθε κουτί υπολογιστή στην Ελλάδα, από Skroutz και BestPrice.',
  icon: Box,
  empty: 'Δεν βρέθηκαν κουτιά με αυτά τα φίλτρα.',
  searchPlaceholder: 'Αναζήτηση (π.χ. Lancool 216, NZXT H5, O11)',
  groups: ['Full Tower', 'Midi Tower', 'Mini Tower', 'SFF / Cube', 'Άλλο'],
  groupLabel: 'Μέγεθος',
  group: (l) => l.size,
  groupDot: {
    'Full Tower': 'bg-violet-500', 'Midi Tower': 'bg-sky-500', 'Mini Tower': 'bg-teal-500',
    'SFF / Cube': 'bg-amber-500', Άλλο: 'bg-zinc-400',
  },
  // Most-offered cases first (on both sites, several colours) rather than by size.
  sortByGroup: false,
  modelKey: (l) => productKey(l.chip),
  isPro: () => false,
  tierScore: (m) => m.listings.length,
  searchText: (l) => `${l.chip} ${l.title} ${l.size}`,
  matchesModel: (m, f) =>
    matchYesNo(f.window, m.listings.some((l) => l.window)) && matchYesNo(f.rgb, m.listings.some((l) => l.rgb)),
  extraFilters: [
    { key: 'window', options: yesNo('Παράθυρο: όλα', 'Με πλαϊνό παράθυρο', 'Χωρίς παράθυρο') },
    { key: 'rgb', options: yesNo('RGB: όλα', 'Με RGB', 'Χωρίς RGB') },
  ],
  before: [{ header: 'Μέγεθος', className: 'hidden sm:table-cell', cell: (m) => m.cheapest.size }],
  after: [],
};

const rgbFilter: ExtraFilter = { key: 'rgb', options: yesNo('RGB: όλα', 'Με RGB', 'Χωρίς RGB') };
const anyRgb = (m: { listings: { rgb: boolean }[] }) => m.listings.some((l) => l.rgb);

const fanGroup = (size: number) =>
  size === 120 ? '120mm' : size === 140 ? '140mm' : size === 80 || size === 92 ? '80–92mm' : size >= 180 ? '180mm+' : 'Άλλο';

export const FAN: CategoryConfig<FanListing> = {
  id: 'fan',
  tab: 'Ανεμιστήρες',
  title: 'Τιμές Ανεμιστήρων',
  subtitle: 'Οι χαμηλότερες τιμές ανεμιστήρων κουτιού στην Ελλάδα, ανά μοντέλο και συσκευασία, από Skroutz και BestPrice.',
  icon: Fan,
  empty: 'Δεν βρέθηκαν ανεμιστήρες με αυτά τα φίλτρα.',
  searchPlaceholder: 'Αναζήτηση (π.χ. P12 Pro, Uni Fan, Noctua)',
  groups: ['120mm', '140mm', '80–92mm', '180mm+', 'Άλλο'],
  groupLabel: 'Μέγεθος',
  group: (l) => fanGroup(l.size),
  groupDot: {
    '120mm': 'bg-sky-500', '140mm': 'bg-violet-500', '80–92mm': 'bg-teal-500', '180mm+': 'bg-amber-500',
    Άλλο: 'bg-zinc-400',
  },
  // Most-offered fans first; a pack is its own model ("… 120mm ×3") so it never competes with singles.
  sortByGroup: false,
  modelKey: (l) => productKey(l.chip),
  isPro: () => false,
  tierScore: (m) => m.listings.length,
  searchText: (l) => `${l.chip} ${l.title}`,
  matchesModel: (m, f) => matchYesNo(f.rgb, anyRgb(m)) && (!f.pack || (f.pack === 'multi') === m.cheapest.pack > 1),
  extraFilters: [
    {
      key: 'pack',
      options: () => [
        { value: '', label: 'Συσκευασία: όλες' },
        { value: 'single', label: 'Μονός' },
        { value: 'multi', label: 'Πακέτο (2+)' },
      ],
    },
    rgbFilter,
  ],
  before: [{ header: 'Τεμάχια', className: 'hidden sm:table-cell', cell: (m) => m.cheapest.pack }],
  after: [
    {
      header: 'Ανά τεμάχιο',
      className: 'hidden sm:table-cell tabular-nums',
      cell: (m) => (m.cheapest.pack > 1 ? formatPrice(m.cheapest.price / m.cheapest.pack) : '—'),
    },
  ],
};

const coolerGroup = (l: CoolerListing) =>
  l.type === 'Air'
    ? 'Αέρα'
    : (l.radiator ?? 0) <= 140
      ? 'AIO 120–140'
      : (l.radiator ?? 0) <= 280
        ? 'AIO 240–280'
        : 'AIO 360–420';

export const COOLER: CategoryConfig<CoolerListing> = {
  id: 'cooler',
  tab: 'Ψύκτρες CPU',
  title: 'Τιμές Ψυκτρών CPU',
  subtitle: 'Οι χαμηλότερες τιμές για ψύκτρες αέρα και υδροψύξεις AIO στην Ελλάδα, από Skroutz και BestPrice.',
  icon: Snowflake,
  empty: 'Δεν βρέθηκαν ψύκτρες με αυτά τα φίλτρα.',
  searchPlaceholder: 'Αναζήτηση (π.χ. Peerless Assassin, Liquid Freezer, NH-D15)',
  groups: ['Αέρα', 'AIO 120–140', 'AIO 240–280', 'AIO 360–420'],
  groupLabel: 'Τύπος',
  group: coolerGroup,
  groupDot: { Αέρα: 'bg-sky-500', 'AIO 120–140': 'bg-teal-500', 'AIO 240–280': 'bg-violet-500', 'AIO 360–420': 'bg-fuchsia-500' },
  sortByGroup: false,
  modelKey: (l) => productKey(l.chip),
  isPro: () => false,
  tierScore: (m) => m.listings.length,
  searchText: (l) => `${l.chip} ${l.title}`,
  matchesModel: (m, f) => matchYesNo(f.rgb, anyRgb(m)),
  extraFilters: [rgbFilter],
  before: [
    {
      header: 'Τύπος',
      className: 'hidden sm:table-cell',
      cell: (m) => (m.cheapest.type === 'Air' ? 'Αέρα' : `AIO ${m.cheapest.radiator}mm`),
    },
  ],
  after: [],
};

export const CATEGORIES = { gpu: GPU, cpu: CPU, ram: RAM, psu: PSU, case: CASE, fan: FAN, cooler: COOLER } as const;
export const CATEGORY_IDS = Object.keys(CATEGORIES) as Category[];
