// The automatic build of a budget from /data/builder/auto.json (step 5 task 10, written at build time by autoBuild.ts).
// Apart from recommend.ts so the start screen reads it without the Recommended order's code (rule 11).

import type { AutoFile } from '../types';
import type { Slot } from './slots';
import type { UseKey } from './useMinimums';

/** An automatic build as the builder reads it from auto.json. */
export interface AutoChoice {
  parts: Partial<Record<Slot, string>>;
  prices: Partial<Record<Slot, number>>;
  fanQty: number;
  total: number;
}

/** The automatic build of a budget: the grid point at or below it; `under` the use's minimum; `above` the range. */
export function autoFor(file: AutoFile, use: UseKey, budget: number): { kind: 'build'; build: AutoChoice } | { kind: 'under' } | { kind: 'above' } {
  const { from, to, step } = file.grid;
  if (budget > to) return { kind: 'above' };
  const i = Math.floor((budget - from) / step);
  let b = i < 0 ? undefined : file.builds[file.uses[use]?.[i] ?? -1];
  // Between the minimum and the next grid point: the minimum build, never "under" (review I2).
  const low = file.builds[file.min?.[use] ?? -1];
  if (!b && low && budget >= total(low, file.slots.length)) b = low;
  if (!b) return { kind: 'under' };
  const n = file.slots.length;
  const parts: AutoChoice['parts'] = {};
  const prices: AutoChoice['prices'] = {};
  file.slots.forEach((s, j) => {
    if (b[1 + j] < 0) return;
    parts[s] = file.keys[b[1 + j]];
    prices[s] = b[1 + n + j];
  });
  return { kind: 'build', build: { parts, prices, fanQty: b[0], total: total(b, n) } };
}

/** An auto.json build's total: the sum of its prices (to the cent). */
const total = (b: number[], n: number) => Math.round(b.slice(1 + n).reduce((x, v) => x + v, 0) * 100) / 100;

let auto: Promise<AutoFile> | null = null;
/** /data/builder/auto.json, fetched once a budget is set (memoised; a failure is forgotten so the next call retries). */
export function loadAuto(builtAt: string): Promise<AutoFile> {
  auto ??= fetch(`/data/builder/auto.json?v=${builtAt}`)
    .then((r) => {
      if (!r.ok) throw new Error(`auto.json: HTTP ${r.status}`);
      return r.json() as Promise<AutoFile>;
    })
    .catch((e: unknown) => {
      auto = null;
      throw e;
    });
  return auto;
}
