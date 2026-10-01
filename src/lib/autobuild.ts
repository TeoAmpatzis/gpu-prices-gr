// Automatic build for a budget: the best-performing compatible build that fits the amount, from
// today's prices and the same compatibility rules as picking by hand (builder.ts).
//
// How it chooses:
// - performance comes from the processor and the graphics card only (gaming estimates from
//   published reviews: GPU_PERF in value.ts, CPU_PERF below). Gaming score = a soft minimum of the
//   card and of what the processor can feed (`gamingScore`), so a fast card is not paired with a slow
//   processor; office score = the processor, counting nothing above OFFICE_ENOUGH;
// - every other part is the cheapest one that fits and meets a few sensible minimums (dual-channel
//   RAM of a size set by the budget, a PSU with a stated 80 PLUS rating, a fuller board and a tower
//   cooler for the most power-hungry processors);
// - best value: among builds within 3% of the best score, the cheapest one wins;
// - processors and cards without a performance estimate (old or rare ones) are not proposed, and a
//   gaming build without room for a card falls back to a processor with integrated graphics.
// Tune the tables and the constants here; nothing else needs to change.

import type { CpuListing } from '../types';
import {
  HIGH_END_CPU,
  SLOTS,
  coolerHeight,
  cpuCooler,
  cpuHasIgpu,
  fitsBuild,
  moboSlots,
  type Build,
  type Slot,
  type SlotListing,
} from './builder';
import type { Model } from './data';
import { gpuPerf } from './value';

export type SlotModels = { [S in Slot]: Model<SlotListing[S]>[] };
export type Use = 'gaming' | 'office';

/**
 * Approximate relative gaming performance per processor (Ryzen 5 7600 = 100), rounded from widely
 * published review averages with a fast graphics card. Current and previous platforms only; low-power
 * "T" models are left out. Good enough to rank builds; not a benchmark.
 */
// prettier-ignore
const CPU_PERF: Record<string, number> = {
  'Ryzen 7 9850X3D': 142, 'Ryzen 7 9800X3D': 140, 'Ryzen 9 9950X3D': 138, 'Ryzen 9 9900X3D': 126,
  'Ryzen 7 7800X3D': 128, 'Ryzen 9 7950X3D': 128, 'Ryzen 9 7900X3D': 118, 'Ryzen 5 7600X3D': 116,
  'Ryzen 7 7700X3D': 120, 'Ryzen 5 7500X3D': 112, 'Ryzen 9 9950X': 115, 'Ryzen 9 9900X': 113, 'Ryzen 7 9700X': 112,
  'Ryzen 5 9600X': 108, 'Ryzen 5 9600': 106, 'Ryzen 5 9500F': 102, 'Ryzen 9 7950X': 108, 'Ryzen 9 7900X': 106,
  'Ryzen 9 7900': 103, 'Ryzen 7 7700X': 106, 'Ryzen 7 7700': 104, 'Ryzen 5 7600X': 102, 'Ryzen 5 7600': 100,
  'Ryzen 5 7500F': 98, 'Ryzen 5 7400': 95, 'Ryzen 5 7400F': 95, 'Ryzen 7 8700F': 90, 'Ryzen 7 8700G': 90,
  'Ryzen 5 8600G': 85, 'Ryzen 5 8500G': 76, 'Ryzen 5 8400F': 80, 'Ryzen 7 5800X3D': 105, 'Ryzen 7 5700X3D': 100,
  'Ryzen 9 5950X': 85, 'Ryzen 9 5900XT': 85, 'Ryzen 9 5900X': 84, 'Ryzen 7 5800XT': 84, 'Ryzen 7 5800X': 83,
  'Ryzen 7 5700X': 80, 'Ryzen 7 5700': 74, 'Ryzen 5 5600X': 78, 'Ryzen 5 5600XT': 78, 'Ryzen 5 5600': 76,
  'Ryzen 5 5600T': 76, 'Ryzen 5 5500': 70, 'Ryzen 5 5500F': 70, 'Ryzen 7 5700G': 72, 'Ryzen 5 5600G': 68,
  'Ryzen 5 5600GT': 70, 'Ryzen 5 5500GT': 66, 'Ryzen 5 4500': 60, 'Ryzen 5 4600G': 58, 'Ryzen 3 4100': 52,
  'Core Ultra 9 285K': 118, 'Core Ultra 7 270K Plus': 116, 'Core Ultra 7 265K': 112, 'Core Ultra 7 265KF': 112,
  'Core Ultra 5 250K Plus': 110, 'Core Ultra 5 250KF Plus': 110, 'Core Ultra 7 265': 105, 'Core Ultra 7 265F': 105,
  'Core Ultra 5 245K': 105, 'Core Ultra 5 245KF': 105, 'Core Ultra 5 245': 98, 'Core Ultra 5 235': 94,
  'Core Ultra 5 225': 90, 'Core Ultra 5 225F': 90, 'Core i9-14900K': 125, 'Core i9-14900KF': 125,
  'Core i9-14900': 118, 'Core i9-14900F': 118, 'Core i9-13900K': 122, 'Core i9-13900KF': 122, 'Core i9-13900': 115,
  'Core i9-13900F': 115, 'Core i9-12900K': 110, 'Core i9-12900KF': 110, 'Core i9-12900': 105, 'Core i9-12900F': 105,
  'Core i7-14700K': 120, 'Core i7-14700KF': 120, 'Core i7-14700': 112, 'Core i7-14700F': 112, 'Core i7-13700K': 115,
  'Core i7-13700KF': 115, 'Core i7-13700': 108, 'Core i7-13700F': 108, 'Core i7-12700K': 104, 'Core i7-12700KF': 104,
  'Core i7-12700': 100, 'Core i7-12700F': 100, 'Core i5-14600K': 112, 'Core i5-14600KF': 112, 'Core i5-13600K': 110,
  'Core i5-13600KF': 110, 'Core i5-14600': 102, 'Core i5-12600K': 98, 'Core i5-12600KF': 98, 'Core i5-14500': 100,
  'Core i5-13500': 98, 'Core i5-12600': 92, 'Core i5-12500': 89, 'Core i5-14400': 94, 'Core i5-14400F': 94,
  'Core i5-13400': 90, 'Core i5-13400F': 90, 'Core i5-12400': 88, 'Core i5-12400F': 88, 'Core i3-14100': 75,
  'Core i3-14100F': 75, 'Core i3-13100': 72, 'Core i3-13100F': 72, 'Core i3-12100': 70, 'Core i3-12100F': 70,
};

/** Integrated graphics on the GPU_PERF scale; any other iGPU counts as IGPU_OTHER (desktop use only). */
// prettier-ignore
const IGPU_PERF: Record<string, number> = {
  'Ryzen 7 8700G': 30, 'Ryzen 5 8600G': 25, 'Ryzen 5 8500G': 15, 'Ryzen 7 5700G': 15, 'Ryzen 5 5600G': 13,
  'Ryzen 5 5600GT': 13, 'Ryzen 5 5500GT': 12,
};
const IGPU_OTHER = 5;

/** How fast a card (GPU_PERF scale) a processor keeps busy in games: CPU_PERF × this (Ryzen 5 7600 ≈ RTX 4080). */
const CPU_FEEDS = 2;
/** Softness of the minimum: higher = closer to a hard min(card, processor). */
const BOTTLENECK = 4;
const gamingScore = (gpu: number, cpu: number) =>
  (gpu ** -BOTTLENECK + (cpu * CPU_FEEDS) ** -BOTTLENECK) ** (-1 / BOTTLENECK);
/** Office and study: a faster processor than this (CPU_PERF) adds nothing worth paying for. */
const OFFICE_ENOUGH = 90;

/** Among builds within this share of the best score, the cheapest wins. */
const VALUE_MARGIN = 0.97;
/** Cards kept per graphics chip (cheapest first): cards of one chip differ in length, so in which cases fit. */
const CARDS_PER_CHIP = 3;
/** RAM: 32GB from this budget up for gaming, else 16GB; always a 2-stick kit where the board allows. */
const RAM_32GB_FROM = 1200;
const RAM_MIN_SPEED = { DDR5: 5600, DDR4: 3200 } as const;
/** PSU: a stated 80 PLUS rating, Gold or better from this budget up. */
const PSU_GOLD_FROM = 1000;
const RATED = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Titanium', 'Diamond'];
const GOLD = ['Gold', 'Platinum', 'Titanium', 'Diamond'];
/** Entry chipsets: weak power delivery for the most power-hungry processors. */
const ENTRY_CHIPSET = /^(A320|A520|A620|H410|H510|H610)$/;
/** A tower cooler (at least this tall) for those processors instead of a boxed or low-profile one. */
const TOWER_MM = 150;

export interface AutoBuildResult {
  build: Build;
  total: number;
  /** Gaming was asked for, but no graphics card fits the budget: integrated graphics instead. */
  noCard: boolean;
}
/** The best build, or the price of the cheapest complete one when nothing fits (null: none at all). */
export type AutoBuildOutcome = { ok: true; result: AutoBuildResult } | { ok: false; minimum: number | null };

const price = (m: { cheapest: { price: number } } | undefined) => m?.cheapest.price ?? 0;
const byPrice = <M extends { cheapest: { price: number } }>(ms: M[]) => [...ms].sort((a, b) => price(a) - price(b));
const cpuPerf = (m: Model<CpuListing>) => CPU_PERF[m.cheapest.chip] ?? null;
const igpuPerf = (m: Model<CpuListing>) => (cpuHasIgpu(m) ? (IGPU_PERF[m.cheapest.chip] ?? IGPU_OTHER) : 0);
/** Draws well over the usual 65–105W: needs a fuller board and a tower cooler. */
const demanding = (m: Model<CpuListing>) => HIGH_END_CPU.test(m.cheapest.chip) || (m.cheapest.tdp ?? 0) > 105;

/** First (cheapest) model in `sorted` that fits the build and passes the extra conditions, tried in order. */
function cheapest<S extends Slot>(
  slot: S,
  sorted: Model<SlotListing[S]>[],
  build: Build,
  ...wishes: ((m: Model<SlotListing[S]>) => boolean)[]
): Model<SlotListing[S]> | undefined {
  for (const wish of wishes.length ? wishes : [() => true]) {
    const found = sorted.find((m) => wish(m) && fitsBuild(slot, m, build));
    if (found) return found;
  }
  return undefined;
}

const cost = (b: Build) => SLOTS.reduce((sum, s) => sum + price(b[s]), 0);

export function autoBuild(models: SlotModels, budget: number, use: Use): AutoBuildOutcome {
  const sorted = Object.fromEntries(
    SLOTS.map((s) => [s, byPrice(models[s] as Model<never>[])]),
  ) as unknown as SlotModels;
  const memo = new Map<string, Build | null>();
  const remember = (key: string, make: () => Build | null) => {
    if (!memo.has(key)) memo.set(key, make());
    return memo.get(key)!;
  };
  const ramTarget = use === 'gaming' && budget >= RAM_32GB_FROM ? 32 : 16;
  const psuOk = (efficiency: string | null) => (budget >= PSU_GOLD_FROM ? GOLD : RATED).includes(efficiency ?? '');

  // Processor + board + memory + cooler: depends on the processor only.
  const platform = (cpu: Model<CpuListing>): Build | null =>
    remember(`cpu|${cpu.key}`, () => {
      const hot = demanding(cpu);
      const b: Build = { cpu };
      b.mobo = cheapest('mobo', sorted.mobo, b, (m) => !hot || !ENTRY_CHIPSET.test(m.cheapest.chipset ?? ''));
      if (!b.mobo) return null;
      const sticks = Math.min(2, moboSlots(b.mobo));
      const kit = (m: Model<SlotListing['ram']>) => m.cheapest.capacity >= ramTarget && m.cheapest.modules === sticks;
      b.ram = cheapest(
        'ram',
        sorted.ram,
        b,
        (m) => kit(m) && (m.cheapest.speed ?? 0) >= RAM_MIN_SPEED[m.cheapest.type as 'DDR4' | 'DDR5'],
        kit,
        (m) => m.cheapest.capacity >= ramTarget,
      );
      if (!b.ram) return null;
      if (hot || cpuCooler(cpu) !== true) {
        // Air only: an AIO's radiator size can't be checked against the case (see builder.ts).
        b.cooler = cheapest('cooler', sorted.cooler, b, (m) => {
          const h = coolerHeight(m);
          return m.cheapest.type === 'Air' && h != null && (!hot || h >= TOWER_MM);
        });
        if (!b.cooler) return null;
      }
      return b;
    });

  // Adds the graphics card (if any), then the case and the power supply that fit it all.
  const complete = (base: Build, gpu: Model<SlotListing['gpu']> | undefined): Build | null =>
    remember(`full|${base.cpu!.key}|${gpu?.key ?? '-'}`, () => {
      const b: Build = { ...base, gpu };
      if (gpu && !fitsBuild('gpu', gpu, b)) return null;
      b.case = cheapest('case', sorted.case, b);
      if (!b.case) return null;
      b.psu = cheapest(
        'psu',
        sorted.psu,
        b,
        (m) => psuOk(m.cheapest.efficiency),
        () => true,
      );
      if (!b.psu) return null;
      // Every part checked against all the others, as the picker would.
      return SLOTS.every((s) => !b[s] || fitsBuild(s, b[s] as never, b)) ? b : null;
    });

  // Processors worth trying: with an estimate, and only those that are faster than every cheaper
  // platform (processor + board + RAM + cooler) — a slower one costing more is never the best choice.
  const cpus = sorted.cpu.filter((m) => cpuPerf(m) != null && fitsBuild('cpu', m, {}));
  const platforms = cpus
    .map((cpu) => ({ cpu, base: platform(cpu) }))
    .filter((p): p is { cpu: Model<CpuListing>; base: Build } => p.base != null)
    .sort((a, b) => cost(a.base) - cost(b.base));
  const frontier = <T>(items: T[], perf: (x: T) => number) => {
    let best = -1;
    return items.filter((x) => {
      if (perf(x) <= best) return false;
      best = perf(x);
      return true;
    });
  };

  type Option = { build: Build; score: number; total: number; noCard: boolean };
  const options: Option[] = [];
  const add = (build: Build | null, score: number, noCard: boolean) => {
    if (build) options.push({ build, score, total: cost(build), noCard });
  };

  // Without a graphics card: office builds, and the gaming fallback.
  const igpuPlatforms = platforms.filter((p) => cpuHasIgpu(p.cpu));
  const noCardScore = (cpu: Model<CpuListing>) =>
    use === 'office' ? Math.min(cpuPerf(cpu)!, OFFICE_ENOUGH) : gamingScore(igpuPerf(cpu), cpuPerf(cpu)!);
  for (const p of frontier(igpuPlatforms, (x) => noCardScore(x.cpu))) {
    add(complete(p.base, undefined), noCardScore(p.cpu), true);
  }
  if (use === 'gaming') {
    // Cards: chips faster than every cheaper chip, a few cards of each (they differ in length).
    const cards = sorted.gpu.filter((m) => gpuPerf(m.cheapest.chip) != null && fitsBuild('gpu', m, {}));
    const chips = frontier([...new Set(cards.map((m) => m.cheapest.chip))], (chip) => gpuPerf(chip)!);
    const gpus = chips.flatMap((chip) => cards.filter((m) => m.cheapest.chip === chip).slice(0, CARDS_PER_CHIP));
    for (const p of frontier(platforms, (x) => cpuPerf(x.cpu)!)) {
      for (const gpu of gpus) {
        add(complete(p.base, gpu), gamingScore(gpuPerf(gpu.cheapest.chip)!, cpuPerf(p.cpu)!), false);
      }
    }
  }

  const fitting = options.filter((o) => o.total <= budget);
  if (!fitting.length) {
    return {
      ok: false,
      minimum: options.length ? Math.min(...options.map((o) => o.total)) : null,
    };
  }
  // A card always beats no card for gaming when one fits.
  const pool = use === 'gaming' && fitting.some((o) => !o.noCard) ? fitting.filter((o) => !o.noCard) : fitting;
  const top = Math.max(...pool.map((o) => o.score));
  const pick = pool.filter((o) => o.score >= top * VALUE_MARGIN).sort((a, b) => a.total - b.total)[0];
  return {
    ok: true,
    result: {
      build: pick.build,
      total: pick.total,
      noCard: use === 'gaming' && pick.noCard,
    },
  };
}
