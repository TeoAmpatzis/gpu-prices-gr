// Official BIOS support per chipset x CPU generation (rule 13), read from the maker's own pages (amd.com / intel.com).
// A pair with no official statement has no row (rule 13 stays unknown); nothing here is derived from memory or from another row.
//   ok          the page lists the chipset as supporting that generation and says nothing about a BIOS update for it
//   update      the page says the chipset needs (or may need) a BIOS update for that generation
//   unsupported the page's table marks the chipset as not compatible with that generation
import { cpuRow, type CpuGeneration } from './cpuMemory';

export type BiosVerdict = 'ok' | 'update' | 'unsupported';

export interface BiosRow {
  /** Chipset names exactly as in the mobo data (`chipset`). */
  chipsets: string[];
  generation: CpuGeneration;
  verdict: BiosVerdict;
  /** Exact official URL fetched. */
  source: string;
  /** The text on that page the verdict comes from. */
  quote: string;
  /** 'YYYY-MM-DD' */
  checked: string;
}

const CHECKED = '2026-10-12';

// ---- AM5: amd.com "AM5 chipsets" page --------------------------------------------------------------------------
const AM5 = 'https://www.amd.com/en/products/processors/chipsets/am5.html';
const AM5_ALL =
  'With the AMD Ryzen 600 and 800 series chipsets, all AMD Socket AM5 motherboards are compatible with all AMD Socket AM5 processors. ' +
  'That means you can choose any Socket AM5 board for AMD Ryzen 7000, 8000, and 9000 compatibility.';
const AM5_BIOS = '(A BIOS update may be required for Ryzen 8000 and 9000 series processors on 600 series boards.)';
const AM5_600 = ['A620', 'B650', 'B650E', 'X670', 'X670E'];
const AM5_800 = ['B840', 'B850', 'X870', 'X870E'];

// ---- AM4: amd.com "AM4 chipsets" compatibility table (read cell by cell) ----------------------------------------
const AM4 = 'https://www.amd.com/en/products/processors/chipsets/am4.html';
const AM4_COLUMNS = [
  'AMD Athlon™ Processors with Radeon Graphics', 'AMD Ryzen™ 1000 Series Processors', 'AMD Ryzen™ 2000 Series Processors with Radeon™ Graphics',
  'AMD Ryzen™ 2000 Series Processors', 'AMD Ryzen™ 3000 Series Processors with Radeon™ Graphics', 'AMD Ryzen™ 3000 Series Processors',
  'AMD Ryzen™ 4000 Series Processors', 'AMD Ryzen™ 5000 Series Processors',
];
const SB = 'Selective Beta BIOS update needed';
type Cell = '✓' | 'X' | typeof SB;
/** Each chipset's row of the table, in the page's column order (AM4_COLUMNS). */
const AM4_TABLE: Record<string, Cell[]> = {
  X570: ['X', 'X', 'X', '✓', '✓', '✓', '✓', '✓'],
  B550: ['X', 'X', 'X', 'X', 'X', '✓', '✓', '✓'],
  A520: ['X', 'X', 'X', 'X', 'X', '✓', '✓', '✓'],
  X470: ['✓', '✓', '✓', '✓', '✓', '✓', '✓', '✓'],
  B450: ['X', 'X', 'X', '✓', '✓', '✓', '✓', '✓'],
  X370: ['X', '✓', '✓', '✓', '✓', SB, SB, SB],
  B350: ['X', '✓', '✓', '✓', '✓', SB, SB, SB],
  A320: ['✓', '✓', '✓', '✓', '✓', 'X', SB, SB],
};
/** Generation -> the page columns it is read from. A generation that spans two columns gets a verdict only when both cells agree. */
const AM4_GENERATIONS: [CpuGeneration, number[]][] = [
  ['ryzen-1000', [1]], ['ryzen-3000', [4, 5]], ['ryzen-4000', [6]], ['ryzen-4000g', [6]], ['ryzen-5000', [7]], ['ryzen-5000g', [7]],
];
const VERDICT_OF: Record<Cell, BiosVerdict> = { '✓': 'ok', X: 'unsupported', [SB]: 'update' };

function am4Rows(): BiosRow[] {
  const rows: BiosRow[] = [];
  for (const [chipset, cells] of Object.entries(AM4_TABLE)) {
    const rowText = `${chipset} ${cells.join(' ')}`;
    for (const [generation, cols] of AM4_GENERATIONS) {
      const verdicts = new Set(cols.map((c) => VERDICT_OF[cells[c]!]));
      if (verdicts.size !== 1) continue;
      rows.push({
        chipsets: [chipset], generation, verdict: [...verdicts][0]!, source: AM4, checked: CHECKED,
        quote: `Column "${cols.map((c) => AM4_COLUMNS[c]).join('" and "')}", row: "${rowText}"`,
      });
    }
  }
  return rows;
}

// ---- Intel ----------------------------------------------------------------------------------------------------
// Chipset membership: intel.com ARK series pages "Intel® 600 Series Desktop Chipsets" (B660 H610 H670 Q670 Q670E W680 Z690),
// "Intel® 700 Series Desktop Chipsets" (B760 H770 Z790) and "Intel® 800 Series Desktop Chipsets" (B860 H810 Q870 W880 W890 Z890).
const INTEL_600_700 = 'https://www.intel.com/content/www/us/en/support/articles/000092294/processors.html';
const INTEL_800 = 'https://www.intel.com/content/www/us/en/support/articles/000099723/processors.html';
const LGA1700 = ['H610', 'B660', 'H670', 'Q670', 'Q670E', 'W680', 'Z690', 'B760', 'H770', 'Z790'];
const LGA1851 = ['B860', 'H810', 'Q870', 'W880', 'W890', 'Z890'];
const INTEL_13_14 =
  'Intel® 600 Series and Intel® 700 Series chipset-based motherboards require a BIOS update to boot the Intel® Core™ desktop processors (13th and 14th gen).';
const INTEL_ULTRA =
  'the Intel® Core™ Ultra Desktop Processors (Series 2) are paired with new Intel® 800 Series Desktop Chipsets and are not compatible with older chipsets, such as the Intel® 700 and Intel® 600 Series Desktop Chipsets.';

export const BIOS: BiosRow[] = [
  // AM5, 600 series: compatible with Ryzen 7000; the page's BIOS note names Ryzen 8000 and 9000 on 600 series boards
  // (8000G is part of the Ryzen 8000 series on amd.com).
  { chipsets: AM5_600, generation: 'ryzen-7000', verdict: 'ok', source: AM5, quote: AM5_ALL, checked: CHECKED },
  ...(['ryzen-8000', 'ryzen-8000g', 'ryzen-9000'] as const).map((generation): BiosRow => ({
    chipsets: AM5_600, generation, verdict: 'update', source: AM5, quote: `${AM5_ALL} ${AM5_BIOS}`, checked: CHECKED,
  })),
  // AM5, 800 series: the same sentence, and no BIOS note for them.
  ...(['ryzen-7000', 'ryzen-8000', 'ryzen-8000g', 'ryzen-9000'] as const).map((generation): BiosRow => ({
    chipsets: AM5_800, generation, verdict: 'ok', source: AM5, quote: AM5_ALL, checked: CHECKED,
  })),
  ...am4Rows(),
  // LGA1700: Intel's article names 13th and 14th gen only (12th gen has no statement of its own: "may require ... between 12th, 13th, or 14th gen").
  ...(['intel-13', 'intel-14'] as const).map((generation): BiosRow => ({
    chipsets: LGA1700, generation, verdict: 'update', source: INTEL_600_700, quote: INTEL_13_14, checked: CHECKED,
  })),
  { chipsets: LGA1851, generation: 'core-ultra-200s', verdict: 'ok', source: INTEL_800, quote: INTEL_ULTRA, checked: CHECKED },
];

const norm = (s: string) => s.toUpperCase().replace(/\s+/g, ' ').trim();

/** Same shape as the engine's BiosLookup: generation from cpuRow(cpuName); undefined when the CPU, its generation or the pair isn't in the tables. */
export function biosSupport(chipset: string, cpuName: string): BiosVerdict | undefined {
  const generation = cpuRow(cpuName)?.generation;
  if (!generation) return undefined;
  const c = norm(chipset);
  return BIOS.find((r) => r.generation === generation && r.chipsets.some((x) => norm(x) === c))?.verdict;
}
