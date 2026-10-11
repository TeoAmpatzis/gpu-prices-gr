// Official memory support per CPU, read from the maker's own product page (amd.com / intel.com).
// A value the page does not show is left out (unknown); nothing here is derived from another value.
export type CpuGeneration =
  | 'ryzen-3000' | 'ryzen-4000g' | 'ryzen-5000' | 'ryzen-5000g' | 'ryzen-7000' | 'ryzen-8000g' | 'ryzen-9000'
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
