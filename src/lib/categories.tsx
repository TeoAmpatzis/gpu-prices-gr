import type { ReactNode } from 'react';
import { CircuitBoard, Cpu, type LucideIcon } from 'lucide-react';
import type { BaseListing, Brand, Category, CpuListing, GpuListing } from '../types';
import { mostCommon, type Filters, type Model } from './data';

export interface Column<L extends BaseListing> {
  header: string;
  className?: string; // applied to both <th> and <td>, e.g. responsive hiding
  cell: (m: Model<L>) => ReactNode;
}

/** A select in the filter bar that only applies to one category. */
export interface ExtraFilter {
  key: 'minVram' | 'socket' | 'minCores';
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
  brands: Brand[];
  segments: { main: string; pro: string };
  /** Same key as `model_key` in scraper/categories.py. */
  modelKey: (l: L) => string;
  isPro: (chip: string) => boolean;
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
  brands: ['NVIDIA', 'AMD', 'Intel'],
  segments: { main: 'Gaming', pro: 'Workstation' },
  modelKey: (l) => `${l.chip} ${l.vram}GB`,
  isPro: (chip) => GPU_WORKSTATION.test(chip),
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
  brands: ['AMD', 'Intel'],
  segments: { main: 'Desktop', pro: 'Server / HEDT' },
  modelKey: (l) => l.chip,
  isPro: (chip) => /^(EPYC|Threadripper|Xeon)/.test(chip),
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

export const CATEGORIES = { gpu: GPU, cpu: CPU } as const;
export const CATEGORY_IDS = Object.keys(CATEGORIES) as Category[];
