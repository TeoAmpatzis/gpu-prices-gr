// PC builder data coverage: per slot and field, how many of the builder's models have the value.
// Reads the scraper's public/data/<cat>/latest.json and groups models exactly like the builder.
//
//   npx tsx scripts/checks/builder-coverage.mts                      print the table
//   npx tsx scripts/checks/builder-coverage.mts --save before.json   also keep the numbers
//   npx tsx scripts/checks/builder-coverage.mts --compare before.json   print before -> now per field
//
// "popular" = the most-listed quarter of the models (graphics cards: cards of the most-listed quarter of
// chip + VRAM models), to see that the products people look at are measured first.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const B = await import(pathToFileURL(join(ROOT, 'src/lib/builder.ts')).href);

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const read = (cat: string) => JSON.parse(readFileSync(join(ROOT, 'public/data', cat, 'latest.json'), 'utf8'));

const gpuCtx = B.fitContext(B.slotModels('gpu', read('gpu').listings));
type Get = (m: any) => unknown;
const any = (f: (l: any) => unknown): Get => (m) => m.listings.map(f).find((v: unknown) => known(v)) ?? null;
const known = (v: unknown) => v != null && v !== '' && v !== false && !(Array.isArray(v) && v.length === 0);

// Every field a builder check uses, plus the case/fan details collected for it.
const FIELDS: Record<string, [string, Get, ((m: any) => boolean)?][]> = {
  cpu: [
    ['socket', (m) => B.cpuSocket(m)],
    ['cooler in the box (stated)', (m) => (B.cpuCooler(m) == null ? null : 1)],
    ['TDP', any((l) => l.tdp)],
  ],
  mobo: [
    ['socket', (m) => B.moboSocket(m)],
    ['memory type', (m) => B.moboMemory(m)],
    ['form factor', (m) => (B.moboForm(m) === 'Άλλο' ? null : B.moboForm(m))],
    ['RAM slots (stated)', any((l) => l.ramSlots)],
  ],
  ram: [
    ['type', (m) => m.cheapest.type],
    ['form factor', (m) => m.cheapest.formFactor],
    ['sticks', (m) => m.cheapest.modules],
  ],
  gpu: [
    ['length (measured)', (m) => B.gpuLength(m)],
    // "Likely fits" possible: no length, but the chip has a measured range (B.fitContext) and isn't water-cooled.
    ['length measured or chip estimate', (m) => B.gpuLength(m) ?? (!B.gpuWaterCooled(m.cheapest) && gpuCtx.chips.get(m.cheapest.chip)) ?? null],
    ['minimum PSU (stated)', (m) => m.cheapest.minPsu],
    ['PSU wattage (stated or chip table)', (m) => B.gpuPsu(m.cheapest)],
  ],
  cooler: [
    ['sockets', (m) => (B.coolerSockets(m).length ? 1 : null)],
    ['height (air coolers)', (m) => B.coolerHeight(m), (m) => m.cheapest.type === 'Air'],
    ['radiator size (AIO)', (m) => m.cheapest.radiator, (m) => m.cheapest.type === 'AIO'],
  ],
  case: [
    ['max graphics card length', (m) => B.caseGpuMax(m)],
    ['max cooler height', (m) => B.caseCoolerMax(m)],
    ['board size (stated)', any((l) => l.maxBoard)],
    ['board size (stated or by case size)', (m) => B.caseBoard(m)],
    ['fan positions (total)', (m) => B.caseFanSlots(m)],
    ['fan positions per size', any((l) => l.fanMounts)],
    ['140 mm fan support', any((l) => l.fanMounts?.some((f: any) => f.size === 140) || null)],
    ['included fans', any((l) => l.fansIncluded)],
    ['radiator positions', (m) => B.caseRadiators(m)],
    ['radiator sizes per position', any((l) => l.radiators)],
  ],
  fan: [
    ['size', (m) => m.cheapest.size],
    ['pack', (m) => m.cheapest.pack],
    ['connector (3-pin / 4-pin PWM)', any((l) => l.connector)],
    ['airflow (CFM)', any((l) => l.airflowCfm)],
    ['static pressure (mmH2O)', any((l) => l.pressureMm)],
    ['airflow / pressure type (brand)', any((l) => l.fanType)],
  ],
  psu: [
    ['wattage', (m) => m.cheapest.watts],
    ['form factor', (m) => m.cheapest.formFactor],
  ],
};

const pct = (n: number, d: number) => (d ? Math.round((1000 * n) / d) / 10 : 0);
const out: Record<string, Record<string, number>> = {};
const before = arg('--compare') ? JSON.parse(readFileSync(arg('--compare')!, 'utf8')) : null;

for (const slot of B.SLOTS as string[]) {
  const models = (B.slotModels(slot, read(slot).listings) as any[]).filter((m) => !m.pro);
  const listed = (m: any) => m.listings.length;
  let popular: Set<any>;
  if (slot === 'gpu') {
    const perChip = new Map<string, number>();
    for (const m of models) perChip.set(`${m.cheapest.chip} ${m.cheapest.vram}`, (perChip.get(`${m.cheapest.chip} ${m.cheapest.vram}`) ?? 0) + 1);
    const top = new Set([...perChip.entries()].sort((a, b) => b[1] - a[1]).slice(0, Math.ceil(perChip.size / 4)).map((e) => e[0]));
    popular = new Set(models.filter((m) => top.has(`${m.cheapest.chip} ${m.cheapest.vram}`)));
  } else {
    popular = new Set([...models].sort((a, b) => listed(b) - listed(a)).slice(0, Math.ceil(models.length / 4)));
  }
  const offered = B.candidates(slot, B.slotModels(slot, read(slot).listings), {}).length;
  out[slot] = { offered: pct(offered, models.length) };
  console.log(`\n${slot}: ${models.length} models, offered with an empty build ${offered} (${pct(offered, models.length)}%)`);
  console.log(`  ${'field'.padEnd(38)} ${'all'.padStart(14)} ${'popular'.padStart(8)}${before ? '   before -> now' : ''}`);
  for (const [label, get, only] of FIELDS[slot]) {
    const pool = only ? models.filter(only) : models;
    const n = pool.filter((m) => known(get(m))).length;
    const pop = pool.filter((m) => popular.has(m));
    const np = pop.filter((m) => known(get(m))).length;
    const p = pct(n, pool.length);
    out[slot][label] = p;
    const was = before?.[slot]?.[label];
    const diff = was == null ? '' : `   ${String(was).padStart(5)}% -> ${String(p).padStart(5)}%${p !== was ? ` (${p > was ? '+' : ''}${Math.round((p - was) * 10) / 10})` : ''}`;
    console.log(`  ${label.padEnd(38)} ${`${n}/${pool.length}`.padStart(10)} ${`${p}%`.padStart(6)} ${`${pct(np, pop.length)}%`.padStart(7)}${diff}`);
  }
}
if (arg('--save')) {
  writeFileSync(arg('--save')!, JSON.stringify(out, null, 1) + '\n');
  console.log(`\nsaved ${arg('--save')}`);
}
