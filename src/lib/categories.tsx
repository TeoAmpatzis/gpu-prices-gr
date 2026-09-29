import type { ReactNode } from 'react';
import { CircuitBoard, Cpu, MemoryStick, type LucideIcon } from 'lucide-react';
import type { BaseListing, Category, CpuListing, GpuListing, RamListing } from '../types';
import { mostCommon, type Filters, type Model } from './data';

export interface Column<L extends BaseListing> {
  header: string;
  className?: string; // applied to both <th> and <td>, e.g. responsive hiding
  cell: (m: Model<L>) => ReactNode;
}

/** A select in the filter bar that only applies to one category. */
export interface ExtraFilter {
  key: 'minVram' | 'socket' | 'minCores' | 'minCapacity' | 'minSpeed';
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
  group: (l: L) => string;
  groupDot: Record<string, string>; // Tailwind bg class per group
  segments: { main: string; pro: string };
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

export const CATEGORIES = { gpu: GPU, cpu: CPU, ram: RAM } as const;
export const CATEGORY_IDS = Object.keys(CATEGORIES) as Category[];
