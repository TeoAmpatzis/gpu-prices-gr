// Writes docs/phase2/psu-before-after.md: for every graphics card the builder offers, what v1 recommended for the
// power supply and what the engine's rule 14 uses now (the card maker's figure, and the plan's whole-build formula
// for two reference builds). The owner reads this before the builder uses the formula.
// Run: npm run psu:before-after
// The file has no "generated at" time, so the same data gives the same file.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Category, CpuListing, Latest } from '../../src/types';
import { validateLatest } from '../../src/data/validate';
import { builderFile } from '../../src/lib/derive';
import { fromColumns } from '../../src/lib/columns';
import { powerEstimate, v1RecommendedPsu, type Part } from '../../src/engine';
import { cpuPowerRow } from '../../src/engine/data/cpuPower';
import { POWER } from '../../src/engine/tables';

const OUT = join(process.cwd(), 'docs', 'phase2', 'psu-before-after.md');
const BUILT_AT = '2026-01-01T00:00:00.000Z'; // any fixed value: it is not compared
const TOP = 20;

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const w = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `${n}`);
const signed = (n: number | null) => (n === null ? '—' : n > 0 ? `+${n}` : `${n}`);

// Validated data, the same as the site uses (enforce mode).
const all: Partial<Record<Category, Latest>> = {};
const updated: string[] = [];
for (const cat of ['gpu', 'cpu'] as const) {
  const latest = JSON.parse(readFileSync(join(process.cwd(), 'public', 'data', cat, 'latest.json'), 'utf8')) as Latest;
  all[cat] = validateLatest(cat, latest, 'enforce').latest;
  updated.push(`${cat}: ${latest.updatedAt}`);
}
const { file } = builderFile(all, BUILT_AT);
interface CardRow { id: string; chip: string; title: string; minPsu: number | null }
const cards = fromColumns<Record<string, unknown>>(file.slots.gpu as never).map((r): CardRow => ({
  id: String(r['id']),
  chip: String(r['chip']),
  title: String(r['title']),
  minPsu: typeof r['minPsu'] === 'number' ? r['minPsu'] : null,
}));

// Reference CPU: the most-listed desktop Intel CPU (LGA1700 / LGA1851) that has a power-limit row.
const DESKTOP_INTEL = new Set(['LGA1700', 'LGA1851']);
const counts = new Map<string, number>();
for (const l of all.cpu!.listings as CpuListing[]) {
  if (l.brand !== 'Intel' || !l.socket || !DESKTOP_INTEL.has(l.socket) || !cpuPowerRow(l.chip)) continue;
  counts.set(l.chip, (counts.get(l.chip) ?? 0) + 1);
}
const intelRef = [...counts].sort((a, b) => b[1] - a[1] || cmp(a[0], b[0]))[0];
if (!intelRef) throw new Error('no Intel desktop CPU with a power-limit row in the data');
const intelRow = cpuPowerRow(intelRef[0])!;

let n = 0;
const part = (category: Part['category'], name: string, fields: Record<string, unknown>, quantity = 1): Part =>
  ({ category, key: `${category}-${++n}`, name, quantity, fields });
const rest = (cpuName: string | null): Part[] => [
  ...(cpuName ? [part('cpu', cpuName, {})] : []),
  part('ram', 'DDR5 kit', { modules: 2 }),
  part('storage', 'NVMe drive', { iface: 'NVMe' }),
  part('fan', 'Case fans', { pack: 3 }),
  part('cooler', 'Air cooler', { type: 'Air' }),
];

interface Out {
  chip: string; title: string; card: number | null; chipW: number | null; v1: number | null;
  maker: number | null; formula: number | null; rec: number | null; change: number | null;
  makerChange: number | null;
}
const rows: Out[] = cards.map((c) => {
  const gpu = part('gpu', c.title, { chip: c.chip, minPsu: c.minPsu });
  const v1 = v1RecommendedPsu(gpu, undefined)?.watts ?? null;
  const intel = powerEstimate([gpu, ...rest(intelRef[0])]);
  const maker = intel.makerW; // the same for any CPU
  const formula = intel.formulaW;
  const rec = maker === null && formula === null ? null : Math.max(maker ?? 0, formula ?? 0);
  return {
    chip: c.chip, title: c.title, card: c.minPsu,
    chipW: powerEstimate([part('gpu', c.title, { chip: c.chip })]).makerW,
    v1, maker, formula, rec,
    change: rec !== null && v1 !== null ? rec - v1 : null,
    makerChange: maker !== null && v1 !== null ? maker - v1 : null,
  };
}).sort((a, b) => cmp(a.chip, b.chip) || cmp(a.title, b.title));

const tally = (pick: (r: Out) => number | null) => {
  const t = { rises: 0, falls: 0, stays: 0, none: 0 };
  for (const r of rows) {
    const d = pick(r);
    if (d === null) t.none++; else if (d > 0) t.rises++; else if (d < 0) t.falls++; else t.stays++;
  }
  return t;
};
const tI = tally((r) => r.change), tM = tally((r) => r.makerChange);
const withMaker = rows.filter((r) => r.maker !== null).length;
const withFormula = rows.filter((r) => r.formula !== null).length;
const withV1 = rows.filter((r) => r.v1 !== null).length;

const base = rest(intelRef[0]);
const noCard = powerEstimate(base).totalW!;

const L: string[] = [];
L.push('# PSU recommendation: v1 before, engine after', '');
L.push(
  'For every graphics card the builder offers: what v1 recommended for the power supply, and what rule 14 of the v2 engine uses now. ' +
    'Nothing in the builder uses the new figures yet; the owner reads this first.', '',
);
L.push('Data times (`latest.updatedAt`):', '');
for (const u of updated) L.push(`- ${u}`);
L.push('', '## How each figure is made', '');
L.push(
  '- **v1 figure**: the larger of the card\'s own stated minimum PSU and v1\'s chip table (no source), for the card alone (the +100 W v1 added for a Ryzen 9 / Core i9 / Core Ultra 9 is not included here).',
  '- **Card minPsu**: the minimum PSU the shop or card page states for that card. **Chip maker W**: NVIDIA "Required System Power" / AMD "Minimum PSU Recommendation" for the chip, from `src/engine/data/gpuPower.ts`.',
  '- **Maker W** (the card maker\'s figure) = the larger of those two. Rule 14 gives an error below it.',
  `- **Formula W** = ⌈(card board power + CPU power limit + ${POWER.boardW} W board + ${POWER.perStickW} W per RAM stick + ${POWER.perDriveW} W per drive + ${POWER.perFanW} W per fan + ${POWER.pumpW} W AIO pump) × ${POWER.headroom} / ${POWER.roundToW}⌉ × ${POWER.roundToW}. Empty when the board power of the card or the power limit of the CPU has no official page in our tables.`,
  '- **Recommended** = the larger of Maker W and Formula W. By the owner\'s rule a PSU at or above Maker W but below Formula W is a warning, not an error.', '',
);
L.push('## Reference builds', '');
L.push(
  `- **Intel reference**: ${intelRef[0]} (${intelRow.kind} ${intelRow.watts} W; the most-listed desktop Intel CPU on LGA1700 / LGA1851 with a power-limit row, ${intelRef[1]} listings), ` +
    `2 RAM sticks, 1 NVMe drive, 3 fans, an air cooler. Without the card its parts draw ${noCard} W; the card's board power is added on top.`,
  '- **AMD reference**: none. No official AMD page states PPT for any model (see `src/engine/data/cpuPower.ts`), so for an AMD CPU the formula is unknown and rule 14 decides on the maker figure alone. The AMD columns below therefore show the maker figure only.',
  '',
);
L.push('## Summary', '');
L.push(
  `${rows.length} cards. Maker W exists for ${withMaker}, Formula W (Intel reference) for ${withFormula}, a v1 figure for ${withV1}. "Not comparable" = either side has no figure.`, '',
);
L.push('| Reference | Compared figure | Rises vs v1 | Falls vs v1 | Same as v1 | Not comparable |', '| --- | --- | ---: | ---: | ---: | ---: |');
L.push(`| Intel (${intelRef[0]}) | Recommended (max of maker and formula) | ${tI.rises} | ${tI.falls} | ${tI.stays} | ${tI.none} |`);
L.push(`| AMD (no formula) | Maker W alone | ${tM.rises} | ${tM.falls} | ${tM.stays} | ${tM.none} |`, '');

const big = rows.filter((r) => r.change !== null).sort((a, b) => Math.abs(b.change!) - Math.abs(a.change!) || cmp(a.chip, b.chip) || cmp(a.title, b.title)).slice(0, TOP);
const header = ['| Chip | Card | Card minPsu | Chip maker W | v1 W | Maker W | Formula W (Intel ref.) | Recommended (Intel ref.) | Change vs v1 |', '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'];
const line = (r: Out) => `| ${cell(r.chip)} | ${cell(cut(r.title, 70))} | ${w(r.card)} | ${w(r.chipW)} | ${w(r.v1)} | ${w(r.maker)} | ${w(r.formula)} | ${w(r.rec)} | ${signed(r.change)} |`;
L.push(`## The ${TOP} largest changes (Intel reference)`, '', ...header, ...big.map(line), '');
L.push('## All cards', '', 'Sorted by chip, then card name.', '', ...header, ...rows.map(line), '');

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, L.join('\n'));
console.log(`wrote ${OUT}: ${rows.length} cards, Intel reference ${intelRef[0]}`);
