// Official memory support per CPU, read from the maker's own product page (amd.com / intel.com).
// A value the page does not show is left out (unknown); nothing here is derived from another value.
export type CpuGeneration =
  | 'ryzen-1000' | 'ryzen-3000' | 'ryzen-4000' | 'ryzen-4000g' | 'ryzen-5000' | 'ryzen-5000g' | 'ryzen-7000' | 'ryzen-8000' | 'ryzen-8000g' | 'ryzen-9000'
  | 'intel-10' | 'intel-11' | 'intel-12' | 'intel-13' | 'intel-14' | 'core-ultra-200s';

/** MT/s as the page states it (our data calls it MHz). */
export interface MemorySpeed { sticks2?: number; sticks4?: number }

export interface CpuMemoryRow {
  /** Chip names exactly as in the data. */
  models: string[];
  /** Our classification from the page's series name (used by the BIOS rule). */
  generation: CpuGeneration;
  memory: { DDR4?: MemorySpeed; DDR5?: MemorySpeed };
  /** Exact official URL fetched. */
  source: string;
  /** 'YYYY-MM-DD' */
  checked: string;
}

export const OFFICIAL_DOMAINS: string[] = ['amd.com', 'intel.com'];

const AMD_7000 = 'https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/';

export const CPU_MEMORY: CpuMemoryRow[] = [
  // Every page below was fetched and states "Max Memory Speed 2x1R DDR5-5200 2x2R DDR5-5200 4x1R DDR5-3600 4x2R DDR5-3600".
  // Single- and dual-rank are equal here, so the lower-of-the-two rule changes nothing.
  {
    models: [
      'Ryzen 5 7400', 'Ryzen 5 7500', 'Ryzen 5 7500F', 'Ryzen 5 7500X3D', 'Ryzen 5 7600', 'Ryzen 5 7600X',
      'Ryzen 7 7700', 'Ryzen 7 7700X', 'Ryzen 7 7700X3D', 'Ryzen 7 7800X3D',
      'Ryzen 9 7900', 'Ryzen 9 7900X', 'Ryzen 9 7900X3D', 'Ryzen 9 7950X', 'Ryzen 9 7950X3D',
    ],
    generation: 'ryzen-7000',
    memory: { DDR5: { sticks2: 5200, sticks4: 3600 } },
    source: `${AMD_7000}amd-ryzen-5-7600.html`,
    checked: '2026-10-11',
  },
  // Each page states "Max Memory Speed 2x1R DDR4-3200 2x2R DDR4-3200 4x1R DDR4-2933 4x2R DDR4-2667"; 4 sticks take the lower (2667).
  {
    models: [
      'Ryzen 5 5500F', 'Ryzen 5 5600T', 'Ryzen 5 5600XT', 'Ryzen 7 5800X3D', 'Ryzen 7 5800XT', 'Ryzen 9 5900XT',
    ],
    generation: 'ryzen-5000',
    memory: { DDR4: { sticks2: 3200, sticks4: 2667 } },
    source: 'https://www.amd.com/en/products/processors/desktops/ryzen/5000-series/amd-ryzen-5-5500f.html',
    checked: '2026-10-11',
  },
  // Each page states only "System Memory Type DDR4 / System Memory Specification Up to 3200 MT/s" (no 4-stick figure).
  {
    models: [
      'Ryzen 5 5600X', 'Ryzen 7 5800X', 'Ryzen 9 5950X',
    ],
    generation: 'ryzen-5000',
    memory: { DDR4: { sticks2: 3200 } },
    source: 'https://www.amd.com/en/products/processors/desktops/ryzen/5000-series/amd-ryzen-5-5600x.html',
    checked: '2026-10-11',
  },
  // Each page states "Max Memory Speed 2x1R DDR5-5200 2x2R DDR5-5200 4x1R DDR5-3600 4x2R DDR5-3600".
  {
    models: [
      'Ryzen 5 8400F', 'Ryzen 7 8700F',
    ],
    generation: 'ryzen-8000',
    memory: { DDR5: { sticks2: 5200, sticks4: 3600 } },
    source: 'https://www.amd.com/en/products/processors/desktops/ryzen/8000-series/amd-ryzen-5-8400f.html',
    checked: '2026-10-11',
  },
  // Each page states "Max Memory Speed 2x1R DDR5-5200 2x2R DDR5-5200 4x1R DDR5-3600 4x2R DDR5-3600".
  {
    models: [
      'Ryzen 5 8500G', 'Ryzen 5 8600G', 'Ryzen 7 8700G',
    ],
    generation: 'ryzen-8000g',
    memory: { DDR5: { sticks2: 5200, sticks4: 3600 } },
    source: 'https://www.amd.com/en/products/processors/desktops/ryzen/8000-series/amd-ryzen-5-8500g.html',
    checked: '2026-10-11',
  },
  // Each page states "Max Memory Speed 2x1R DDR5-5600 2x2R DDR5-5600 4x1R DDR5-3600 4x2R DDR5-3600".
  {
    models: [
      'Ryzen 5 9500F', 'Ryzen 5 9600', 'Ryzen 5 9600X', 'Ryzen 7 9700X', 'Ryzen 7 9800X3D', 'Ryzen 7 9850X3D',
      'Ryzen 9 9900X', 'Ryzen 9 9900X3D', 'Ryzen 9 9950X', 'Ryzen 9 9950X3D',
    ],
    generation: 'ryzen-9000',
    memory: { DDR5: { sticks2: 5600, sticks4: 3600 } },
    source: 'https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-5-9600x.html',
    checked: '2026-10-11',
  },
  // AMD specifications table row: System Memory Type DDR4, System Memory Specification 3200 (MT/s), no per-stick figure.
  {
    models: [
      'Ryzen 5 5500', 'Ryzen 5 5600', 'Ryzen 7 5700', 'Ryzen 7 5700X',
    ],
    generation: 'ryzen-5000',
    memory: { DDR4: { sticks2: 3200 } },
    source: 'https://www.amd.com/en/products/specifications/processors.html',
    checked: '2026-10-11',
  },
  // AMD specifications table row: System Memory Type DDR4, System Memory Specification 3200 (MT/s), no per-stick figure.
  // 'Ryzen 3 5300G' is AMD's record "AMD Ryzen™ 3 5300G (OEM Only)".
  {
    models: [
      'Ryzen 5 5600G', 'Ryzen 5 5600GT', 'Ryzen 7 5700G', 'Ryzen 5 PRO 5650G', 'Ryzen 3 5300G',
    ],
    generation: 'ryzen-5000g',
    memory: { DDR4: { sticks2: 3200 } },
    source: 'https://www.amd.com/en/products/specifications/processors.html',
    checked: '2026-10-11',
  },
  // AMD specifications table row: System Memory Type DDR4, System Memory Specification 3200 (MT/s), no per-stick figure.
  {
    models: [
      'Ryzen 5 3600', 'Ryzen 5 3600X', 'Ryzen 7 PRO 3700',
    ],
    generation: 'ryzen-3000',
    memory: { DDR4: { sticks2: 3200 } },
    source: 'https://www.amd.com/en/products/specifications/processors.html',
    checked: '2026-10-11',
  },
  // AMD specifications table row: System Memory Type DDR4, System Memory Specification 2933 (MT/s), no per-stick figure.
  // 'Ryzen 3 3200G' is AMD's record "AMD Ryzen™ 3 3200G with Radeon™ Vega 8 Graphics".
  {
    models: ['Ryzen 3 3200G'],
    generation: 'ryzen-3000',
    memory: { DDR4: { sticks2: 2933 } },
    source: 'https://www.amd.com/en/products/specifications/processors.html',
    checked: '2026-10-11',
  },
  // AMD specifications table row: System Memory Type DDR4, System Memory Specification 3200 (MT/s), no per-stick figure.
  {
    models: [
      'Ryzen 3 4100', 'Ryzen 5 4500',
    ],
    generation: 'ryzen-4000',
    memory: { DDR4: { sticks2: 3200 } },
    source: 'https://www.amd.com/en/products/specifications/processors.html',
    checked: '2026-10-11',
  },
  // AMD specifications table row: System Memory Type DDR4, System Memory Specification 3200 (MT/s), no per-stick figure.
  // 'Ryzen 3 4300G' / 'Ryzen 3 4300GE' are AMD's records "AMD Ryzen™ 3 4300G (OEM Only)" / "AMD Ryzen™ 3 4300GE (OEM Only)".
  {
    models: [
      'Ryzen 3 4300G', 'Ryzen 3 4300GE', 'Ryzen 5 4600G', 'Ryzen 5 PRO 4655G',
    ],
    generation: 'ryzen-4000g',
    memory: { DDR4: { sticks2: 3200 } },
    source: 'https://www.amd.com/en/products/specifications/processors.html',
    checked: '2026-10-11',
  },
  // AMD specifications table row: System Memory Type DDR4, System Memory Specification 2667.
  {
    models: [
      'Ryzen 3 1200',
    ],
    generation: 'ryzen-1000',
    memory: { DDR4: { sticks2: 2667 } },
    source: 'https://www.amd.com/en/products/specifications/processors.html',
    checked: '2026-10-11',
  },
  // Each page lists Memory Types "Up to DDR5 4800 MT/s / Up to DDR4 3200 MT/s" (one figure per type, no 4-stick figure).
  {
    models: [
      'Celeron G6900', 'Core i3-12100', 'Core i3-12100F', 'Core i5-12400', 'Core i5-12400F', 'Core i5-12400T',
      'Core i5-12500', 'Core i5-12600', 'Core i5-12600K', 'Core i5-12600KF', 'Core i7-12700', 'Core i7-12700F',
      'Core i7-12700K', 'Core i7-12700KF', 'Core i7-12700T', 'Core i9-12900', 'Core i9-12900F', 'Core i9-12900K',
      'Core i9-12900KF', 'Pentium G7400',
    ],
    generation: 'intel-12',
    memory: { DDR4: { sticks2: 3200 }, DDR5: { sticks2: 4800 } },
    source: 'https://www.intel.com/content/www/us/en/products/sku/96163/intel-celeron-processor-g6900-4m-cache-3-40-ghz/specifications.html',
    checked: '2026-10-11',
  },
  // Each page lists Memory Types "Up to DDR5 6400 MT/s" (one figure per type, no 4-stick figure).
  {
    models: [
      'Core Ultra 5 225', 'Core Ultra 5 225F', 'Core Ultra 5 225T', 'Core Ultra 5 235', 'Core Ultra 5 235T',
      'Core Ultra 5 245', 'Core Ultra 5 245K', 'Core Ultra 5 245KF', 'Core Ultra 5 245T', 'Core Ultra 7 265',
      'Core Ultra 7 265F', 'Core Ultra 7 265K', 'Core Ultra 7 265KF', 'Core Ultra 7 265T', 'Core Ultra 9 285',
      'Core Ultra 9 285K', 'Core Ultra 9 285T',
    ],
    generation: 'core-ultra-200s',
    memory: { DDR5: { sticks2: 6400 } },
    source: 'https://www.intel.com/content/www/us/en/products/sku/241070/intel-core-ultra-5-processor-225-20m-cache-up-to-4-90-ghz/specifications.html',
    checked: '2026-10-11',
  },
  // Each page lists Memory Types "Up to DDR5 7200 MT/s" (one figure per type, no 4-stick figure).
  {
    models: [
      'Core Ultra 5 250K Plus', 'Core Ultra 5 250KF Plus', 'Core Ultra 7 270K Plus',
    ],
    generation: 'core-ultra-200s',
    memory: { DDR5: { sticks2: 7200 } },
    source: 'https://www.intel.com/content/www/us/en/products/sku/245694/intel-core-ultra-5-processor-250k-plus-30m-cache-up-to-5-30-ghz/specifications.html',
    checked: '2026-10-11',
  },
  // Each page lists Memory Types "Up to DDR5 4800 MT/s / Up to DDR4 3200 MT/s" (one figure per type, no 4-stick figure).
  {
    models: [
      'Core i3-13100', 'Core i3-13100F', 'Core i5-13400', 'Core i5-13400F', 'Core i5-13500', 'Core i5-13500T',
    ],
    generation: 'intel-13',
    memory: { DDR4: { sticks2: 3200 }, DDR5: { sticks2: 4800 } },
    source: 'https://www.intel.com/content/www/us/en/products/sku/230575/intel-core-i313100-processor-12m-cache-up-to-4-50-ghz/specifications.html',
    checked: '2026-10-11',
  },
  // Each page lists Memory Types "Up to DDR5 4800 MT/s / Up to DDR4 3200 MT/s" (one figure per type, no 4-stick figure).
  {
    models: [
      'Core i3-14100', 'Core i3-14100F', 'Core i3-14100T', 'Core i5-14400', 'Core i5-14400F', 'Core i5-14400T',
      'Core i5-14500', 'Core i5-14500T',
    ],
    generation: 'intel-14',
    memory: { DDR4: { sticks2: 3200 }, DDR5: { sticks2: 4800 } },
    source: 'https://www.intel.com/content/www/us/en/products/sku/236774/intel-core-i3-processor-14100-12m-cache-up-to-4-70-ghz/specifications.html',
    checked: '2026-10-11',
  },
  // Each page lists Memory Types "Up to DDR5 5600 MT/s / Up to DDR4 3200 MT/s" (one figure per type, no 4-stick figure).
  {
    models: [
      'Core i5-13600KF', 'Core i7-13700', 'Core i7-13700F', 'Core i7-13700K', 'Core i7-13700KF', 'Core i9-13900',
      'Core i9-13900F', 'Core i9-13900K', 'Core i9-13900KF', 'Core i9-13900KS',
    ],
    generation: 'intel-13',
    memory: { DDR4: { sticks2: 3200 }, DDR5: { sticks2: 5600 } },
    source: 'https://www.intel.com/content/www/us/en/products/sku/230494/intel-core-i513600kf-processor-24m-cache-up-to-5-10-ghz/specifications.html',
    checked: '2026-10-11',
  },
  // Each page lists Memory Types "Up to DDR5 5600 MT/s / Up to DDR4 3200 MT/s" (one figure per type, no 4-stick figure).
  {
    models: [
      'Core i5-14600', 'Core i5-14600K', 'Core i5-14600KF', 'Core i5-14600T', 'Core i7-14700', 'Core i7-14700F',
      'Core i7-14700K', 'Core i7-14700KF', 'Core i9-14900', 'Core i9-14900F', 'Core i9-14900K',
      'Core i9-14900KF', 'Core i9-14900KS', 'Core i9-14900T',
    ],
    generation: 'intel-14',
    memory: { DDR4: { sticks2: 3200 }, DDR5: { sticks2: 5600 } },
    source: 'https://www.intel.com/content/www/us/en/products/sku/236845/intel-core-i5-processor-14600-24m-cache-up-to-5-20-ghz/specifications.html',
    checked: '2026-10-11',
  },
  // The page states "Max Memory Speed 2x1R DDR5-5600 2x2R DDR5-5600 4x1R DDR5-3600 4x2R DDR5-3600". The page name is "AMD Ryzen 9 9950X3D2 Dual Edition"; the data calls the same chip 'Ryzen 9 9950X3D2'.
  {
    models: ['Ryzen 9 9950X3D2'],
    generation: 'ryzen-9000',
    memory: { DDR5: { sticks2: 5600, sticks4: 3600 } },
    source: 'https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-9-9950x3d2-dual-edition.html',
    checked: '2026-10-11',
  },
  // Each ryzen-pro page states "Max Memory Speed 2x1R DDR5-5200 2x2R DDR5-5200 4x1R DDR5-3600 4x2R DDR5-3600".
  {
    models: ['Ryzen 3 PRO 8300G', 'Ryzen 5 PRO 8500G', 'Ryzen 5 PRO 8500GE', 'Ryzen 5 PRO 8600G', 'Ryzen 7 PRO 8700G'],
    generation: 'ryzen-8000g',
    memory: { DDR5: { sticks2: 5200, sticks4: 3600 } },
    source: 'https://www.amd.com/en/products/processors/desktops/ryzen-pro/8000-series/amd-ryzen-5-pro-8500g.html',
    checked: '2026-10-11',
  },
  // Each ryzen-pro page states "Max Memory Speed 2x1R DDR5-5600 2x2R DDR5-5600 4x1R DDR5-3600 4x2R DDR5-3600".
  {
    models: ['Ryzen 5 PRO 9645', 'Ryzen 7 PRO 9745', 'Ryzen 9 PRO 9945'],
    generation: 'ryzen-9000',
    memory: { DDR5: { sticks2: 5600, sticks4: 3600 } },
    source: 'https://www.amd.com/en/products/processors/desktops/ryzen-pro/9000-series/amd-ryzen-5-pro-9645.html',
    checked: '2026-10-11',
  },
  // Intel lists "Processor 300" as "Intel® Processor for Desktop" in the product collection, "Products formerly Raptor Lake", not as a 14th gen Core.
  // 'intel-14' is the closest value (same Raptor Lake LGA1700 platform); the BIOS rule reads generation.
  // Page: Memory Types "Up to DDR5 4800 MT/s / Up to DDR4 3200 MT/s".
  {
    models: ['Processor 300'],
    generation: 'intel-14',
    memory: { DDR4: { sticks2: 3200 }, DDR5: { sticks2: 4800 } },
    source: 'https://www.intel.com/content/www/us/en/products/sku/236846/intel-processor-300-6m-cache-up-to-3-90-ghz/specifications.html',
    checked: '2026-10-11',
  },
];

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

export function cpuRow(name: string): CpuMemoryRow | undefined {
  const n = norm(name);
  return CPU_MEMORY.find((r) => r.models.some((m) => norm(m) === n));
}

/** sticks ≤ 2 → the 2-stick figure; more → the 4-stick figure; a missing value → null. */
export function officialSpeed(name: string, type: 'DDR4' | 'DDR5', sticks: number): { mhz: number; sticks: 2 | 4; source: string } | null {
  const row = cpuRow(name), speed = row?.memory[type];
  if (!row || !speed) return null;
  const n: 2 | 4 = sticks <= 2 ? 2 : 4, mhz = n === 2 ? speed.sticks2 : speed.sticks4;
  return mhz === undefined ? null : { mhz, sticks: n, source: row.source };
}
