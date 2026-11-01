// The automatic build per budget and the Recommended order on today's real data (step 5 task 10). Run `npm run build`
// first (it reads dist/data/builder/*.json), then from the repo root: npx tsx scripts/checks/auto-build.test.mts
// Checks every grid point of every use: within the budget, no engine error or warning, gaming ≥ the use's cores,
// PSU ≥ the recommended (rule 14's two figures), rule 27's band holds, under the minimum = no build, above the
// range = the message; no part is an unusual offer (H7); Recommended's CPU on top differs between everyday 500 € and
// gaming 1440p 3,500 €, and everyday's top card is the cheapest. Prints the samples of the task report.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { biosSupport, evaluate, powerEstimate } from '../../src/engine';
import { partOf } from '../../src/lib/builderEngine';
import { slotModels } from '../../src/lib/builderData';
import { CATEGORIES, type CategoryConfig } from '../../src/lib/categories';
import { fromColumns } from '../../src/lib/columns';
import { groupModels, type Model } from '../../src/lib/data';
import { isUnusual } from '../../src/lib/offers';
import { autoCandidates } from '../../src/lib/autoBuild';
import { autoFor, recommend, stepTarget, type AutoChoice } from '../../src/lib/recommend';
import { SLOTS, type Slot } from '../../src/lib/slots';
import { USE_KEYS, USE_MINIMUMS, engineUseOf, type UseKey } from '../../src/lib/useMinimums';
import type { AutoFile, BaseListing, BuilderIndex, Category, Latest } from '../../src/types';

const read = <T,>(f: string): T => JSON.parse(readFileSync(f, 'utf8').trimStart()) as T;
const index = read<BuilderIndex>('dist/data/builder/index.json');
const file = read<AutoFile>('dist/data/builder/auto.json');
type AnyModel = Model<BaseListing>;
const models = Object.fromEntries(SLOTS.map((s) => [s, slotModels(s, fromColumns(read(`dist/data/builder/${s}.json`)) as never[])])) as unknown as Record<Slot, AnyModel[]>;
const byKey = Object.fromEntries(SLOTS.map((s) => [s, new Map(models[s].map((m) => [m.key, m]))])) as Record<Slot, Map<string, AnyModel>>;

let bad = 0;
const fail = (msg: string) => {
  bad++;
  if (bad <= 30) console.log(`FAIL ${msg}`);
};
const eur = (n: number) => `${n.toFixed(2)} €`;
const name = (s: Slot, k: string) => byKey[s].get(k)?.chip ?? `? ${k}`;

// The full models (all listings) of each slot, to check that no chosen row is an unusual offer.
const full = Object.fromEntries(SLOTS.map((s) => {
  const latest = read<Latest>(`public/data/${s}/latest.json`);
  return [s, new Map(slotModels(s, latest.listings as never[]).map((m) => [m.key, m as AnyModel]))];
})) as Record<Slot, Map<string, AnyModel>>;
let unusualChecked = 0;
const topCards: string[] = [];

const ctxOf = (use: UseKey) => ({ bios: biosSupport, chipLengths: index.chipLengths, use: engineUseOf(use === 'unsure' ? 'gaming-1080p' : use) });
const partsOf = (b: AutoChoice) => SLOTS.filter((s) => b.parts[s]).map((s) => partOf(s, byKey[s].get(b.parts[s]!)!, s === 'fan' ? b.fanQty : 1));

for (const use of USE_KEYS) {
  const min = index.minimum[use];
  for (let budget = file.grid.from; budget <= file.grid.to; budget += file.grid.step) {
    const r = autoFor(file, use, budget);
    if (r.kind !== 'build') {
      if (min && budget >= min.total) fail(`${use} ${budget}: no build although the minimum is ${min.total}`);
      continue;
    }
    const b = r.build;
    if (min && b.total < min.total - 0.005) fail(`${use} ${budget}: total ${b.total} under the minimum ${min.total}`);
    if (b.total > budget) fail(`${use} ${budget}: total ${b.total} over the budget`);
    for (const s of SLOTS) if (b.parts[s] && !byKey[s].has(b.parts[s]!)) fail(`${use} ${budget}: ${s} ${b.parts[s]} not in the step file`);
    const parts = partsOf(b);
    const f = evaluate(parts, ctxOf(use));
    for (const x of f) if (x.status === 'error' || x.status === 'warning') fail(`${use} ${budget}: rule ${x.rule} ${x.status}: ${x.message.en}`);
    const cpu = byKey.cpu.get(b.parts.cpu!)!.cheapest as unknown as { cores: number | null };
    if ((cpu.cores ?? 0) < USE_MINIMUMS[use].cores) fail(`${use} ${budget}: ${cpu.cores} cores`);
    const e = powerEstimate(parts);
    const watts = (byKey.psu.get(b.parts.psu!)!.cheapest as unknown as { watts: number }).watts;
    if (watts < Math.max(e.makerW ?? 0, e.formulaW ?? 0)) fail(`${use} ${budget}: PSU ${watts} W under ${e.makerW}/${e.formulaW}`);
    if (use.startsWith('gaming') || use === 'unsure') {
      if (!b.parts.gpu) fail(`${use} ${budget}: no card`);
      else if (!f.some((x) => x.rule === 27 && x.status === 'pass')) fail(`${use} ${budget}: rule 27 band not shown as met`);
    }
    for (const s of SLOTS) {
      const k = b.parts[s];
      const m = k ? full[s].get(k) : undefined;
      if (!m) continue;
      const row = byKey[s].get(k!)!.cheapest;
      const l = m.listings.find((x) => x.id === row.id);
      if (l && isUnusual(m, l)) fail(`${use} ${budget}: ${s} ${k} is an unusual offer`);
      unusualChecked++;
    }
  }
  if (autoFor(file, use, file.grid.to + 1).kind !== 'above') fail(`${use}: above the range is not "above"`);
  if (min && autoFor(file, use, min.total - 1).kind !== 'under') fail(`${use}: 1 € under the minimum is not "under"`);
}
// The top budget reaches the best card tier any single candidate reaches within it (review I1: a case that can't take
// the fan plan must not drop a combo). The candidates are recomputed here from the same step files.
for (const use of USE_KEYS.filter((u) => u !== 'unsure')) {
  const cands = autoCandidates(models as never, use, { chipLengths: index.chipLengths }).filter((p) => p.total <= file.grid.to);
  const best = Math.max(0, ...cands.map((p) => p.gpuTier));
  const r = autoFor(file, use, file.grid.to);
  const got = r.kind === 'build' ? cands.find((p) => p.parts.gpu === r.build.parts.gpu && p.parts.cpu === r.build.parts.cpu)?.gpuTier : undefined;
  if (got !== best) fail(`${use}: the ${file.grid.to} € build has card tier ${got}, a candidate reaches ${best}`);
  const top = r.kind === 'build' && r.build.parts.gpu ? name('gpu', r.build.parts.gpu) : 'no card';
  topCards.push(`${use} ${file.grid.to} €: ${top} (tier ${got ?? '-'}, best reachable ${best})`);
}
const r4k = autoFor(file, 'gaming-4k', 9000);
if (models.gpu.some((m) => /RTX 5090/.test(m.chip)) && !(r4k.kind === 'build' && /RTX 5090/.test(name('gpu', r4k.build.parts.gpu!)))) {
  fail(`gaming-4k 9,000 €: no RTX 5090 (${r4k.kind === 'build' ? name('gpu', r4k.build.parts.gpu!) : r4k.kind})`);
}
if (file.grid.to < 10_000) fail(`the grid ends at ${file.grid.to} (owner: at least 10,000 €)`);

// ---------- Recommended: everyday 500 € vs gaming 1440p 3,500 € ----------
function topOf(slot: Slot, use: UseKey, budget: number, n = 3) {
  const r = autoFor(file, use, budget);
  const auto = r.kind === 'build' ? r.build : null;
  const psuWatts = auto && slot === 'psu' ? (() => {
    const e = powerEstimate(partsOf({ ...auto, parts: { ...auto.parts, psu: undefined } }));
    return Math.max(e.makerW ?? 0, e.formulaW ?? 0) || null;
  })() : null;
  const target = stepTarget(slot, auto, {}, budget);
  const ms = [...models[slot]].sort(recommend(slot, models[slot], { use, target, psuWatts }));
  return { target, psuWatts, top: ms.slice(0, n).map((m) => `${m.chip} (${eur(m.cheapest.price)})`) };
}
const samples: string[] = [];
for (const [use, budget] of [['everyday', 500], ['gaming-1440p', 3500]] as const) {
  for (const s of ['cpu', 'gpu', 'psu'] as Slot[]) {
    const t = topOf(s, use, budget);
    samples.push(`${use} ${budget} € ${s} (target ${t.target}${t.psuWatts ? `, need ${t.psuWatts} W` : ''}): ${t.top.join(' · ')}`);
  }
}
const cpuEveryday = topOf('cpu', 'everyday', 500, 1).top[0];
const cpuGaming = topOf('cpu', 'gaming-1440p', 3500, 1).top[0];
if (cpuEveryday === cpuGaming) fail(`Recommended CPU on top is the same for everyday 500 € and gaming 1440p 3,500 €: ${cpuEveryday}`);
const cheapestCard = [...models.gpu].sort((a, b) => a.cheapest.price - b.cheapest.price)[0];
if (!topOf('gpu', 'everyday', 500, 1).top[0].startsWith(cheapestCard.chip)) fail('everyday: the top card is not the cheapest');

// ---------- Report ----------
console.log('\nauto.json:', JSON.stringify(file).length, 'bytes,', gzipSync(JSON.stringify(file), { level: 9 }).length, 'gzip;', file.builds.length, 'distinct builds,', file.keys.length, 'keys; grid', JSON.stringify(file.grid));
console.log('index.json:', JSON.stringify(index).length, 'bytes,', gzipSync(JSON.stringify(index), { level: 9 }).length, 'gzip');
console.log('\nMinimum per use:');
for (const use of USE_KEYS) console.log(`  ${use}: ${index.minimum[use] ? eur(index.minimum[use]!.total) : 'none'}`);
console.log('\nSample automatic builds:');
for (const use of USE_KEYS) {
  for (const budget of [700, 1200, 2500, 6000]) {
    const r = autoFor(file, use, budget);
    if (r.kind !== 'build') {
      console.log(`  ${use} ${budget} €: ${r.kind}`);
      continue;
    }
    const b = r.build;
    console.log(`  ${use} ${budget} €: ${eur(b.total)} = ${SLOTS.filter((s) => b.parts[s]).map((s) => `${s} ${name(s, b.parts[s]!)}${s === 'fan' ? ` ×${b.fanQty}` : ''} ${eur(b.prices[s]!)}`).join('; ')}`);
  }
}
console.log('\nTop budget card per use:');
for (const t of topCards) console.log(`  ${t}`);
console.log('\nRecommended top 3:');
for (const s of samples) console.log(`  ${s}`);
// Unusual offers today (H7), per category page model (all listings).
let unusual = 0, offers = 0;
for (const cat of SLOTS as Category[]) {
  const latest = read<Latest>(`public/data/${cat}/latest.json`);
  for (const m of groupModels(latest.listings, CATEGORIES[cat] as unknown as CategoryConfig<BaseListing>)) {
    for (const l of m.listings) {
      offers++;
      if (isUnusual(m, l)) unusual++;
    }
  }
}
console.log(`\nUnusual offers today: ${unusual} of ${offers} listings (category page models); parts checked in auto builds: ${unusualChecked}`);
console.log(bad ? `\n${bad} FAILED` : '\nALL PASSED');
process.exit(bad ? 1 : 0);
