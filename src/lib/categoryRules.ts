// The pure part of each category's config (step 4 task 3): what filtering, grouping and the facet counts read
// (pill groups, model key, segment, search text, spec filters), with no React, icons or table cells, so the facet
// worker (facets.worker.ts) can bundle it. categories.tsx spreads these into the full `CategoryConfig`.
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
  MonitorListing,
  PsuListing,
  RamListing,
  StorageListing,
} from '../types';
import { slug } from './slug';
import { NO, YES, type Text } from './text';

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
  /**
   * Exact-match filters (`oneOf`): the one option value a listing matches (`test(l, v)` ⇔ `matchValue(l) === v`),
   * so the facet counts bucket a model's listings once instead of testing every option (163 makers × 2,600 cases).
   */
  matchValue?: (l: L) => string | null;
}

/** What filtering and counting read of a category (the rest of `CategoryConfig` is display and sorting). */
export interface CategoryRules<L extends BaseListing> {
  id: Category;
  /** Added to a model's name when its chip comes in several variants (GPU: "16GB"). */
  variant?: (l: L) => string;
  /** Pill filter values (data keys), in display/sort order: brands for GPU/CPU, memory type for RAM… */
  groups: string[];
  group: (l: L) => string;
  /**
   * Split shown as a segmented control (main is the default view, then "All"); omitted when a
   * category has none (cases). `middle`: options between main and pro (storage: NAS), with
   * `segmentOf` saying which one a listing belongs to.
   */
  segments?: { main: Text; pro: Text; middle?: { value: string; label: Text }[] };
  segmentOf?: (l: L) => string;
  /** Same key as `model_key` in scraper/categories.py. */
  modelKey: (l: L) => string;
  isPro: (l: L) => boolean;
  searchText: (l: L) => string;
  extraFilters: ExtraFilter<L>[];
}

// Group keys that come from the data in Greek (see the scrapers) and need an English label.
export const OTHER = 'Άλλο';
export const NO_RATING = 'Χωρίς ένδειξη';
export const AIR = 'Αέρα';
export const GROUP_NAMES: Record<string, Text> = {
  [OTHER]: { el: 'Άλλο', en: 'Other' },
  [NO_RATING]: { el: 'Χωρίς ένδειξη', en: 'Not stated' },
  [AIR]: { el: 'Αέρα', en: 'Air' },
};

export const VENDOR: Text = { el: 'Κατασκευαστής', en: 'Manufacturer' };
export const SIZE: Text = { el: 'Μέγεθος', en: 'Size' };
const SERIES: Text = { el: 'Σειρά', en: 'Series' };
export const MEMORY: Text = { el: 'Μνήμη', en: 'Memory' };

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
  const matchValue = (l: L) => {
    const x = get(l);
    return x != null ? slug(String(x)) : null;
  };
  return {
    key,
    label,
    options: (ls) => {
      const values = (o.fixed ?? distinct(ls, get, o.order ?? 'count', o.minCount)).map(String);
      if (o.rank) values.sort((a, b) => o.rank!(a) - o.rank!(b));
      return values.map((v) => ({ value: slug(v), label: o.fmt ? o.fmt(v) : v }));
    },
    test: (l, v) => matchValue(l) === v,
    matchValue,
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
      { value: 'yes', label: YES },
      { value: 'no', label: NO },
    ],
    test: (l, v) => (v === 'yes') === !!get(l),
  };
}

const vendorFilter = <L extends BaseListing>(): ExtraFilter<L> => oneOf<L>('brand', VENDOR, (l) => l.brand);
const atLeastLabel = (label: Text): Text =>
  typeof label === 'string' ? label : { el: `${label.el} (τουλάχιστον)`, en: `${label.en} (at least)` };

// ---------- GPU ----------

export const GPU_WORKSTATION = /^(RTX PRO |RTX A\d|T\d|RTX \d{4} (Ada|\(Pro\)))/;

/** "RTX 50", "GTX 16", "RX 9000", "Arc B". */
function gpuSeries(chip: string): string {
  let m;
  if (GPU_WORKSTATION.test(chip)) return 'Workstation';
  if ((m = chip.match(/^(RTX|GTX) (\d{2})\d{2}/))) return `${m[1]} ${m[2]}`;
  if ((m = chip.match(/^RX (\d)\d{3}/))) return `RX ${m[1]}000`;
  if ((m = chip.match(/^Arc ([AB])/))) return `Arc ${m[1]}`;
  return OTHER;
}

export const GPU_RULES: CategoryRules<GpuListing> = {
  id: 'gpu',
  groups: ['NVIDIA', 'AMD', 'Intel'],
  group: (l) => l.brand,
  segments: { main: 'Gaming', pro: 'Workstation' },
  modelKey: (l) => `${l.chip} ${l.vram}GB`,
  variant: (l) => `${l.vram}GB`,
  isPro: (l) => GPU_WORKSTATION.test(l.chip),
  searchText: (l) => `${l.chip} ${l.title} ${l.partner}`,
  extraFilters: [
    threshold('vram', atLeastLabel('VRAM'), (l) => l.vram, (v) => `≥ ${v}GB`),
    oneOf('memType', { el: 'Τύπος μνήμης', en: 'Memory type' }, (l) => l.memType),
    oneOf('series', SERIES, (l) => gpuSeries(l.chip), { fmt: (v) => GROUP_NAMES[v] ?? v }),
    oneOf('partner', { el: 'Κατασκευαστής κάρτας', en: 'Card maker' }, (l) => l.partner),
  ],
};

// ---------- CPU ----------

/** "Ryzen 7", "Core Ultra 5", "Core i5", "Xeon Gold", "Threadripper PRO". */
function cpuSeries(chip: string): string {
  const xeon = chip.match(/^Xeon (Platinum|Gold|Silver|Bronze|w\d)/);
  if (xeon) return `Xeon ${xeon[1]}`;
  return chip.match(/^(Threadripper PRO|Threadripper|EPYC|Ryzen \d|Core Ultra \d|Core i\d|Core \d|Xeon|Athlon|Pentium|Celeron)/)?.[1] ?? OTHER;
}

const socketRank = (s: string) => (/^(AM5|LGA1851|LGA1700|AM4)$/.test(s) ? 0 : 1);

export const CPU_RULES: CategoryRules<CpuListing> = {
  id: 'cpu',
  groups: ['AMD', 'Intel'],
  group: (l) => l.brand,
  segments: { main: 'Desktop', pro: 'Server / HEDT' },
  modelKey: (l) => l.chip,
  isPro: (l) => /^(EPYC|Threadripper|Xeon)/.test(l.chip),
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
};

// ---------- Motherboards ----------
// Like cases, a board is its own model (vendor + board name); pills are the CPU socket.

const moboPlatform = (socket: string | null) =>
  !socket ? null : /^LGA/.test(socket) ? 'Intel' : /^(AM|s?TR|SP|sWRX)/i.test(socket) ? 'AMD' : null;
const DESKTOP_SOCKETS = /^(AM5|AM4|AM3\+?|LGA(1851|1700|1200|1151|1150|1155))$/;
export const MOBO_SOCKETS = ['AM5', 'AM4', 'LGA1851', 'LGA1700'];
const BOARD_SIZES: BoardSize[] = ['ATX', 'Micro ATX', 'Mini ITX', 'E-ATX'];

/** Same as `model_key` in scraper/names.py: letters and digits only. */
const productKey = (chip: string) => chip.toLowerCase().replace(/[^a-z0-9]/g, '');

export const MOBO_RULES: CategoryRules<MoboListing> = {
  id: 'mobo',
  groups: [...MOBO_SOCKETS, OTHER],
  group: (l) => (l.socket && MOBO_SOCKETS.includes(l.socket) ? l.socket : OTHER),
  segments: { main: 'Desktop', pro: 'Server / Workstation' },
  modelKey: (l) => productKey(l.chip),
  // Server/HEDT sockets, workstation chipsets (W790, C266…) and server boards without a chipset name.
  isPro: (l) => !DESKTOP_SOCKETS.test(l.socket ?? '') || !l.chipset || /^[WC]/.test(l.chipset),
  searchText: (l) => `${l.chip} ${l.title} ${l.chipset ?? ''} ${l.socket ?? ''} ${l.formFactor}`,
  extraFilters: [
    oneOf('platform', { el: 'Πλατφόρμα', en: 'Platform' }, (l) => moboPlatform(l.socket), { fixed: ['AMD', 'Intel'] }),
    oneOf('socket', { el: 'Όλα τα socket', en: 'All sockets' }, (l) => l.socket, { rank: socketRank }),
    oneOf('chipset', 'Chipset', (l) => l.chipset),
    oneOf('formFactor', SIZE, (l) => l.formFactor, { fixed: BOARD_SIZES }),
    oneOf('memory', MEMORY, (l) => l.memory, { fixed: ['DDR5', 'DDR4'] }),
    oneOf('ramSlots', { el: 'Υποδοχές RAM', en: 'RAM slots' }, (l) => l.ramSlots, { order: 'asc' }),
    yesNo('wifi', 'WiFi', (l) => l.wifi),
    vendorFilter(),
  ],
};

// ---------- RAM ----------
// Models are kits by spec across vendors ("DDR5 32GB (2×16GB) 6000MHz"), split by form factor.

export const RAM_RULES: CategoryRules<RamListing> = {
  id: 'ram',
  groups: ['DDR5', 'DDR4', 'DDR3', 'DDR2'],
  group: (l) => l.type,
  segments: { main: { el: 'Επιτραπέζιοι', en: 'Desktop' }, pro: { el: 'Φορητοί / Διακομιστές', en: 'Laptop / Server' } },
  modelKey: (l) => `${l.chip} ${l.formFactor}`,
  isPro: (l) => l.formFactor !== 'Desktop',
  searchText: (l) => `${l.chip} ${l.modules}x${l.capacity / l.modules}GB ${l.title} ${l.brand}`,
  extraFilters: [
    threshold('capacity', atLeastLabel({ el: 'Χωρητικότητα', en: 'Capacity' }), (l) => l.capacity, (v) => `≥ ${v}GB`, {
      fixed: [4, 8, 16, 32, 48, 64, 96, 128, 192, 256],
    }),
    // Speeds seen on at least 10 listings, so odd one-offs don't flood the list.
    threshold('speed', atLeastLabel({ el: 'Ταχύτητα', en: 'Speed' }), (l) => l.speed, (v) => `≥ ${v}MHz`, { minCount: 10 }),
    oneOf('modules', { el: 'Τεμάχια στο σετ', en: 'Sticks in kit' }, (l) => l.modules, {
      order: 'asc',
      fmt: (v) => ({ el: `${v} ${Number(v) === 1 ? 'τεμάχιο' : 'τεμάχια'}`, en: `${v} × stick` }),
    }),
    threshold('cas', { el: 'Καθυστέρηση CL (το πολύ)', en: 'Latency (at most)' }, (l) => l.cas, (v) => `≤ CL${v}`, {
      max: true,
      minCount: 5,
    }),
    vendorFilter(),
  ],
};

// ---------- PSU ----------
// Models are specs across vendors ("850W Gold"), split by form factor like RAM.

const MODULAR_LABEL: Record<string, Text> = {
  Full: { el: 'Πλήρως αρθρωτό', en: 'Fully modular' },
  Semi: { el: 'Ημι-αρθρωτό', en: 'Semi-modular' },
  Non: { el: 'Μη αρθρωτό', en: 'Non-modular' },
};

export const PSU_RULES: CategoryRules<PsuListing> = {
  id: 'psu',
  groups: ['Diamond', 'Titanium', 'Platinum', 'Gold', 'Silver', 'Bronze', 'Standard', NO_RATING],
  group: (l) => l.efficiency ?? NO_RATING,
  segments: { main: 'ATX', pro: 'SFX / TFX / Flex' },
  modelKey: (l) => `${l.chip} ${l.formFactor}`,
  isPro: (l) => l.formFactor !== 'ATX',
  searchText: (l) => `${l.chip} ${l.title} ${l.brand} ${l.formFactor}`,
  extraFilters: [
    threshold('watts', atLeastLabel({ el: 'Ισχύς', en: 'Wattage' }), (l) => l.watts, (v) => `≥ ${v}W`, {
      fixed: [300, 400, 450, 500, 550, 600, 650, 700, 750, 850, 1000, 1200, 1300, 1500, 1600],
    }),
    oneOf('modular', { el: 'Αρθρωτά καλώδια', en: 'Modular' }, (l) => l.modular, { fixed: ['Full', 'Semi', 'Non'], fmt: (v) => MODULAR_LABEL[v] }),
    vendorFilter(),
  ],
};

// ---------- Cases, fans, coolers ----------
// The product is its own model: listings are grouped by vendor + model name, colours merged.

const BOARD_RANK: BoardSize[] = ['Mini ITX', 'Micro ATX', 'ATX', 'E-ATX'];
/** The usual largest board for a case size, when the case doesn't state it (a guess). */
export const BOARD_BY_CASE_SIZE: Record<CaseListing['size'], BoardSize> = {
  'Full Tower': 'E-ATX', 'Midi Tower': 'ATX', 'Mini Tower': 'Micro ATX', 'SFF / Cube': 'Mini ITX', [OTHER]: 'ATX',
};
/** Largest board a case takes: as stated (Skroutz), else the usual one for its size. */
export const caseMaxBoard = (l: CaseListing): BoardSize => l.maxBoard ?? BOARD_BY_CASE_SIZE[l.size];

export const CASE_RULES: CategoryRules<CaseListing> = {
  id: 'case',
  groups: ['Full Tower', 'Midi Tower', 'Mini Tower', 'SFF / Cube', OTHER],
  group: (l) => l.size,
  modelKey: (l) => productKey(l.chip),
  isPro: () => false,
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
};

const fanGroup = (size: number) =>
  size === 120 ? '120mm' : size === 140 ? '140mm' : size === 80 || size === 92 ? '80–92mm' : size >= 180 ? '180mm+' : OTHER;

export const FAN_RULES: CategoryRules<FanListing> = {
  id: 'fan',
  groups: ['120mm', '140mm', '80–92mm', '180mm+', OTHER],
  group: (l) => fanGroup(l.size),
  modelKey: (l) => productKey(l.chip),
  isPro: () => false,
  searchText: (l) => `${l.chip} ${l.title}`,
  extraFilters: [
    oneOf('pack', { el: 'Τεμάχια στη συσκευασία', en: 'Fans in pack' }, (l) => l.pack, { order: 'asc', minCount: 3 }),
    yesNo('rgb', 'RGB', (l) => l.rgb),
    yesNo('pwm', { el: 'PWM (έλεγχος στροφών)', en: 'PWM (speed control)' }, (l) => l.pwm),
    vendorFilter(),
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

export const COOLER_RULES: CategoryRules<CoolerListing> = {
  id: 'cooler',
  groups: [AIR, 'AIO 120–140', 'AIO 240–280', 'AIO 360–420'],
  group: coolerGroup,
  modelKey: (l) => productKey(l.chip),
  isPro: () => false,
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
};

// ---------- Storage ----------
// A model is one drive at one capacity ("Samsung 990 Pro 1TB"), like cases; the tier (consumer /
// NAS / server) comes from the scraper (scraper/normalize_storage.py, owner's rules).

/** Type pill: NVMe, SATA SSD, SAS SSD or HDD (an M.2 drive whose interface isn't stated counts as NVMe). */
export function storageType(l: StorageListing): string {
  if (l.media === 'HDD') return 'HDD';
  if (l.iface === 'SAS') return 'SAS SSD';
  if (l.iface === 'NVMe' || (l.iface == null && /^M\.2/.test(l.formFactor ?? ''))) return 'NVMe';
  return 'SATA SSD';
}

const STORAGE_TIER_SEGMENT: Record<StorageListing['tier'], string> = { Consumer: 'main', NAS: 'nas', Server: 'pro' };

// Capacity choices (owner, 2026-10-03): sizes in between share a range ("2–3TB").
const CAPACITY_BUCKETS: { value: string; label: string; min: number; max: number }[] = [
  { value: '120gb', label: '120GB', min: 0, max: 200 },
  { value: '250gb', label: '250GB', min: 200, max: 400 },
  { value: '500gb', label: '500GB', min: 400, max: 800 },
  { value: '1tb', label: '1TB', min: 800, max: 1500 },
  { value: '2-3tb', label: '2–3TB', min: 1500, max: 3500 },
  { value: '4-6tb', label: '4–6TB', min: 3500, max: 7000 },
  { value: '8-14tb', label: '8–14TB', min: 7000, max: 15000 },
  { value: '16tb', label: '16TB+', min: 15000, max: Infinity },
];

const CAPACITY: Text = { el: 'Χωρητικότητα', en: 'Capacity' };

export const STORAGE_RULES: CategoryRules<StorageListing> = {
  id: 'storage',
  groups: ['NVMe', 'SATA SSD', 'SAS SSD', 'HDD'],
  group: storageType,
  segments: { main: { el: 'Οικιακοί', en: 'Consumer' }, middle: [{ value: 'nas', label: 'NAS' }], pro: 'Server' },
  segmentOf: (l) => STORAGE_TIER_SEGMENT[l.tier] ?? 'main',
  // Same as model_key in scraper/categories.py: the type is in the key (WD Blue is an SSD and an HDD).
  modelKey: (l) => productKey(`${l.chip} ${l.media}`),
  isPro: (l) => l.tier === 'Server',
  searchText: (l) => `${l.chip} ${l.title} ${l.formFactor ?? ''} ${l.iface ?? ''}`,
  extraFilters: [
    {
      key: 'capacity',
      label: CAPACITY,
      options: () => CAPACITY_BUCKETS.map((b) => ({ value: b.value, label: b.label })),
      test: (l, v) => {
        const b = CAPACITY_BUCKETS.find((x) => x.value === v);
        return !!b && l.capacity >= b.min && l.capacity < b.max;
      },
    },
    oneOf('pcie', { el: 'Γενιά PCIe (NVMe)', en: 'PCIe generation (NVMe)' }, (l) => l.pcie, {
      fixed: [5, 4, 3],
      fmt: (v) => `PCIe ${v}.0`,
    }),
    oneOf('formFactor', { el: 'Μορφή', en: 'Form factor' }, (l) => l.formFactor, { minCount: 3 }),
    {
      key: 'dram',
      label: { el: 'Cache DRAM (SSD)', en: 'DRAM cache (SSD)' },
      options: () => [
        { value: 'yes', label: YES },
        { value: 'no', label: NO },
      ],
      // Only what is stated: an SSD whose DRAM isn't known matches neither.
      test: (l, v) => (v === 'yes' ? l.dram === true : l.dram === false),
    },
    vendorFilter(),
  ],
};

// Monitors (hidden until Phase 3 designs the real filters): pills by diagonal, a model is the scraper's `chip`
// (scraper/normalize_monitor.py settle names it "<brand> <code>", plus size/panel/refresh when a code has several).
const monitorGroup = (l: MonitorListing) =>
  l.size == null ? OTHER : l.size <= 24.5 ? '≤24"' : l.size <= 27.5 ? '25–27"' : l.size <= 32.5 ? '28–32"' : '34"+';

export const MONITOR_RULES: CategoryRules<MonitorListing> = {
  id: 'monitor',
  groups: ['≤24"', '25–27"', '28–32"', '34"+', OTHER],
  group: monitorGroup,
  modelKey: (l) => l.chip,
  isPro: () => false,
  searchText: (l) => `${l.chip} ${l.title}`,
  extraFilters: [vendorFilter()],
};

export const RULES = {
  gpu: GPU_RULES, cpu: CPU_RULES, mobo: MOBO_RULES, ram: RAM_RULES, storage: STORAGE_RULES, psu: PSU_RULES,
  case: CASE_RULES, fan: FAN_RULES, cooler: COOLER_RULES, monitor: MONITOR_RULES,
} as const;

/** A category's rules for code that handles every category alike (the facet worker and its fallback). */
export const rulesOf = (cat: Category) => RULES[cat] as unknown as CategoryRules<BaseListing>;
