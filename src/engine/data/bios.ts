// Official BIOS support per chipset x CPU generation (rule 13), read from the maker's own pages (amd.com / intel.com).
// A pair with no official statement has no row (rule 13 stays unknown); nothing here is derived from memory or from another row.
//   ok          the page lists the chipset as supporting that generation and says nothing about a BIOS update for it
//   update      the page says the chipset needs (or may need) a BIOS update for that generation (rule 13: warning)
//   may-update  only a page-wide caveat "support may require a BIOS upgrade" applies (AM4 tick cells) (rule 13: quiet note)
//   not-listed  the maker's table marks the pair as not supported, but says it is not exhaustive (AM4 X cells) (rule 13: warning)
//   NOTE: 'may-update' and 'not-listed' are AMD-only verdicts (rule 13's texts name AMD: "AMD notes ...", "AMD lists ..."); a future Intel row
//   must not use them unless rule 13 gets a vendor-neutral text for them.
//   unsupported reserved: an official list that says it is complete and omits the chipset (none found; AMD's AM4 table is not exhaustive)
import { cpuRow, type CpuGeneration } from './cpuMemory';
import type { BiosVerdict } from '../types';

export type { BiosVerdict };

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
// am5.html also says "(A BIOS update may be required for Ryzen 8000 and 9000 series processors on 600 series boards.)", but no amd.com page
// states which chipsets are the "600 series" (or the "800 series"), and series membership by name or by elimination is not used. So Ryzen
// 8000/8000G/9000 get no AM5 row at all (unknown). Searched 2026-10-12 (owner decision 2): am5.html, chipsets.html, the Ryzen 5 7600X and
// Ryzen 9 9950X product pages; the chipset product URLs under /chipsets/am5/ answer 404. None puts "600 series" next to the chipset names
// (am5.html only names "A620 / A620A / PRO 600" and X670E / X670; the CPU pages list "Supporting Chipsets" without a series word).
// Ryzen 7000 is not named in that caveat, and the sentence above says every AM5 board is compatible with every AM5 processor, so 'ok' is
// given for the chipsets the page itself names as AM5 chipsets.
const AM5_NAMED = ['A620', 'X670', 'X670E', 'B840', 'B850', 'X870', 'X870E'];
// B650 / B650E: named as AM5 chipsets only on the CPU product page ("Supporting Chipsets"), so that page is the source of their row; the
// generation-wide 'ok' also rests on am5.html's sentence that every AM5 board works with every AM5 processor (AM5_ALL), so both are quoted.
const AM5_7600X = 'https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-5-7600x.html';
const AM5_7600X_QUOTE =
  'AMD Ryzen™ 5 7600X Desktop Processor … CPU Socket AM5 Supporting Chipsets A620 , X670E , X670 , B650E , B650 , X870E , X870 , B840 , B850';

// ---- AM4: amd.com "AM4 chipsets" compatibility table (read cell by cell) ----------------------------------------
const AM4 = 'https://www.amd.com/en/products/processors/chipsets/am4.html';
const AM4_NOTE =
  'CHIPSET FEATURES: Note that not all processors are supported on every chipset, and support may require a BIOS upgrade. See your motherboard manufacturer’s website for compatibility.';
const H1000 = 'AMD Ryzen™ 1000 Series Processors';
const H3000G = 'AMD Ryzen™ 3000 Series Processors with Radeon™ Graphics';
const H3000 = 'AMD Ryzen™ 3000 Series Processors';
const H4000 = 'AMD Ryzen™ 4000 Series Processors';
const H5000 = 'AMD Ryzen™ 5000 Series Processors';
/** The page's column headers in order. */
const AM4_COLUMNS = [
  'AMD Athlon™ Processors with Radeon Graphics', H1000, 'AMD Ryzen™ 2000 Series Processors with Radeon™ Graphics',
  'AMD Ryzen™ 2000 Series Processors', H3000G, H3000, H4000, H5000,
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
/** Generation -> the page columns (by header) it is read from. A generation that spans two columns gets a row only when neither cell is an X. */
const AM4_GENERATIONS: [CpuGeneration, string[]][] = [
  ['ryzen-1000', [H1000]], ['ryzen-3000', [H3000G, H3000]], ['ryzen-4000', [H4000]], ['ryzen-4000g', [H4000]],
  ['ryzen-5000', [H5000]], ['ryzen-5000g', [H5000]],
];

const AM4_NOT_EXHAUSTIVE = 'Additional hardware combinations may be available through system suppliers. Check with your manufacturer for details.';
// A tick -> 'may-update' (rule 13: a quiet note): the page's own note above its table (AM4_NOTE) says support "may require a BIOS
// upgrade", which is all it says about a tick. "Selective Beta BIOS update needed" -> 'update' (a warning: the cell says needed).
// An X -> 'not-listed' (a warning, not 'unsupported'): the sentence right under the table (AM4_NOT_EXHAUSTIVE) says the table is not an
// exhaustive list. A generation that spans two columns gets a row only when the cells agree on X or neither is an X; with a mix of an X and
// another cell no row is made (the two columns disagree). SB in either column -> 'update'.
function am4Rows(): BiosRow[] {
  const rows: BiosRow[] = [];
  for (const [chipset, cells] of Object.entries(AM4_TABLE)) {
    const rowText = `${chipset} ${cells.join(' ')}`;
    for (const [generation, headers] of AM4_GENERATIONS) {
      const cols = headers.map((h) => AM4_COLUMNS.indexOf(h));
      if (cols.some((c) => c < 0)) throw new Error(`bios: unknown AM4 column for ${generation}`);
      const picked = cols.map((c) => cells[c]);
      const xs = picked.filter((c) => c === 'X').length;
      if (xs > 0 && xs < picked.length) continue;
      const verdict: BiosVerdict = xs > 0 ? 'not-listed' : picked.includes(SB) ? 'update' : 'may-update';
      rows.push({
        chipsets: [chipset], generation, verdict, source: AM4, checked: CHECKED,
        quote: [...headers, rowText, verdict === 'not-listed' ? AM4_NOT_EXHAUSTIVE : AM4_NOTE].join(' … '),
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
  { chipsets: AM5_NAMED, generation: 'ryzen-7000', verdict: 'ok', source: AM5, quote: AM5_ALL, checked: CHECKED },
  { chipsets: ['B650', 'B650E'], generation: 'ryzen-7000', verdict: 'ok', source: AM5_7600X, quote: `${AM5_ALL} … ${AM5_7600X_QUOTE}`, checked: CHECKED },
  ...am4Rows(),
  // LGA1700: Intel's article names 13th and 14th gen only (12th gen has no statement of its own: "may require ... between 12th, 13th, or 14th gen").
  ...(['intel-13', 'intel-14'] as const).map((generation): BiosRow => ({
    chipsets: LGA1700, generation, verdict: 'update', source: INTEL_600_700, quote: INTEL_13_14, checked: CHECKED,
  })),
  { chipsets: LGA1851, generation: 'core-ultra-200s', verdict: 'ok', source: INTEL_800, quote: INTEL_ULTRA, checked: CHECKED },
];

/** CPUs whose cpuMemory generation is only the "closest value" for memory, so the generation's BIOS statement does not apply:
 *  Processor 300 is ARK's "Intel® Processor for Desktop", not a 13th/14th gen Core.
 *  The three "Plus" models are 2026 refresh CPUs, not covered by Intel's 800-series statement (which names the Series 2 launch CPUs). */
const NOT_THAT_GENERATION = new Set(['PROCESSOR 300', 'CORE ULTRA 5 250K PLUS', 'CORE ULTRA 5 250KF PLUS', 'CORE ULTRA 7 270K PLUS']);

const norm = (s: string) => s.toUpperCase().replace(/\s+/g, ' ').trim();

/** Same shape as the engine's BiosLookup: generation from cpuRow(cpuName); undefined when the CPU, its generation or the pair isn't in the tables. */
export function biosSupport(chipset: string, cpuName: string): BiosVerdict | undefined {
  if (NOT_THAT_GENERATION.has(norm(cpuName))) return undefined;
  const generation = cpuRow(cpuName)?.generation;
  if (!generation) return undefined;
  const c = norm(chipset);
  return BIOS.find((r) => r.generation === generation && r.chipsets.some((x) => norm(x) === c))?.verdict;
}
