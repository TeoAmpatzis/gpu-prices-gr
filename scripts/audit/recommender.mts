// Phase 0 (v2 audit, B6 items 4–6): replay v1's guided-builder recommendations for every budget from
// 500 € to 4000 € (step 100) and every v1 use, with the functions the v1 UI uses — rateAll (the
// step's list and its fit labels), sorter (the "Recommended" order), shareOf (the "Suggested for this
// part: X–Y €" line), remaining (the "Within budget" chip), optional (skippable steps) and fanPlan (the
// fans step's size chips) — on the same builder.json / builder-storage.json the browser downloads.
//
// v1 has no automatic build: it recommends through the Recommended order, the suggested amount per
// part and the Within-budget chip. Three ways of following that advice are replayed (each step keeps
// "Only compatible" on, as by default):
//   first      the first card of the default view (Recommended order)
//   within     "Within budget" on: the first card that costs no more than what is left of the budget
//   suggested  the first card whose price is inside the step's suggested range (else the first under
//              its top, else the cheapest)
//   value      the step's "Value for money" sort (Αξία για τα λεφτά), first card, on every step
//   valueCpu   "Value for money" on the CPU step only, the default view elsewhere (the sort control
//              resets to Recommended on every step: PartStep's useState)
// Optional steps: GPU skipped when the CPU has integrated graphics and the use is "everyday"; cooler
// skipped when the box has one; fans always chosen (the step pre-selects the plan's sizes).
//
//   npx tsx scripts/audit/recommender.mts <dataDir> <outFile>

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  SLOTS,
  buildNotes,
  buildStatus,
  cpuCooler,
  cpuHasIgpu,
  fitContext,
  rateAll,
  requiredWatts,
  slotModels,
  type Build,
  type FitContext,
  type Slot,
  type SlotListing,
} from '../../src/lib/builder';
import { fromColumns } from '../../src/lib/columns';
import type { Model } from '../../src/lib/data';
import { fanPlan } from '../../src/lib/fans';
import { tr } from '../../src/lib/i18n';
import { optional, remaining, shareOf, sorter } from '../../src/lib/wizard';
import type { BaseListing, BuilderFile, FanListing } from '../../src/types';

type Use = 'gaming' | 'everyday' | 'creating' | 'unsure';
type Strategy = 'first' | 'within' | 'suggested' | 'value' | 'valueCpu';
const USES: Use[] = ['gaming', 'everyday', 'creating', 'unsure'];
const STRATEGIES: Strategy[] = ['first', 'within', 'suggested', 'value', 'valueCpu'];
const ORDER: Slot[] = ['cpu', 'mobo', 'ram', 'gpu', 'cooler', 'storage', 'case', 'psu', 'fan'];

const [dataDir, outFile] = process.argv.slice(2);
const file = JSON.parse(readFileSync(join(dataDir, 'builder.json'), 'utf8')) as BuilderFile;
const storage = JSON.parse(readFileSync(join(dataDir, 'builder-storage.json'), 'utf8'));
type AnyModel = Model<BaseListing>;
const models = Object.fromEntries(
  SLOTS.map((s) => [s, slotModels(s, fromColumns<SlotListing[typeof s]>((s === 'storage' ? storage : file.slots[s]) ?? { cols: [], rows: [] }))]),
) as unknown as Record<Slot, AnyModel[]>;
const ctx: FitContext = fitContext(models.gpu as never);

function pick(slot: Slot, build: Build, use: Use, budget: number, strategy: Strategy): AnyModel | null {
  const prefs = { use, budget };
  let list = rateAll(slot, models[slot] as never, build, ctx).filter((r) => r.rating.fit !== 'no');
  if (slot === 'fan' && build.case) {
    const sizes = [...new Set(fanPlan(build).add.map((a) => a.size))];
    if (sizes.length) list = list.filter((r) => sizes.includes((r.m as Model<FanListing>).cheapest.size));
  }
  const byValue = strategy === 'value' || (strategy === 'valueCpu' && slot === 'cpu');
  const order = sorter(slot, rateAll(slot, models[slot] as never, build, ctx).map((r) => r.m as AnyModel), byValue ? 'value' : 'recommended');
  list = [...list].sort((a, b) => order(a as never, b as never));
  if (!list.length) return null;
  const price = (r: (typeof list)[number]) => (r.m as AnyModel).cheapest.price;
  if (strategy === 'first' || strategy === 'value' || strategy === 'valueCpu') return list[0].m as AnyModel;
  if (strategy === 'within') {
    const left = remaining(build, prefs, slot)!;
    return (list.find((r) => price(r) <= left)?.m as AnyModel) ?? null;
  }
  const share = shareOf(use, slot);
  if (!share) return list[0].m as AnyModel;
  const [lo, hi] = share.map((p) => Math.round((budget * p) / 100 / 5) * 5);
  const inRange = list.find((r) => price(r) >= lo && price(r) <= hi) ?? list.find((r) => price(r) <= hi);
  return (inRange?.m as AnyModel) ?? [...list].sort((a, b) => price(a) - price(b))[0].m as AnyModel;
}

const results = [];
for (const strategy of STRATEGIES) {
  for (const use of USES) {
    for (let budget = 500; budget <= 4000; budget += 100) {
      const build: Build = {};
      const skipped: Slot[] = [];
      for (const slot of ORDER) {
        if (slot === 'gpu' && use === 'everyday' && build.cpu && cpuHasIgpu(build.cpu as never)) { skipped.push(slot); continue; }
        if (slot === 'cooler' && optional('cooler', build).optional) { skipped.push(slot); continue; }
        const m = pick(slot, build, use, budget, strategy);
        if (m) (build as Record<Slot, AnyModel>)[slot] = m;
      }
      const parts = Object.fromEntries(
        ORDER.filter((s) => build[s]).map((s) => {
          const m = build[s] as AnyModel;
          const l = m.cheapest as unknown as Record<string, unknown>;
          return [s, { key: m.key, chip: l.chip, title: l.title || null, price: l.price, cores: l.cores, socket: l.socket, igpu: l.igpu, coolerIncluded: l.coolerIncluded, vram: l.vram, capacity: l.capacity, modules: l.modules, type: l.type, media: l.media, iface: l.iface, watts: l.watts, size: l.size, pack: l.pack }];
        }),
      );
      const total = Math.round(ORDER.reduce((t, s) => t + ((build[s] as AnyModel | undefined)?.cheapest.price ?? 0), 0) * 100) / 100;
      results.push({
        strategy, use, budget, total, parts, skipped,
        missing: ORDER.filter((s) => !build[s] && !skipped.includes(s) && s !== 'fan'),
        status: buildStatus(build, ctx),
        requiredWatts: requiredWatts(build),
        boxCooler: build.cpu ? cpuCooler(build.cpu as never) : null,
        notes: buildNotes(build, ctx).map((n) => `${n.level}: ${tr('en', n.text)}`),
      });
    }
  }
}
// The first ten CPUs and graphics cards of each order on an empty build (explains the picks).
const orders: Record<string, string[]> = {};
for (const slot of ['cpu', 'gpu'] as Slot[]) {
  for (const by of ['recommended', 'value'] as const) {
    const rated = rateAll(slot, models[slot] as never, {}, ctx);
    const order = sorter(slot, rated.map((r) => r.m as AnyModel), by);
    orders[`${slot}/${by}`] = [...rated].sort((a, b) => order(a as never, b as never)).slice(0, 10).map((r) => {
      const l = (r.m as AnyModel).cheapest as unknown as Record<string, unknown>;
      return `${l.chip}${slot === 'cpu' ? ` (${l.cores} cores)` : ` ${l.vram}GB`} ${l.price} €`;
    });
  }
}
writeFileSync(outFile, `${JSON.stringify({ orders, builds: results }, null, 1)}\n`);
console.log(`${results.length} builds → ${outFile}`);
