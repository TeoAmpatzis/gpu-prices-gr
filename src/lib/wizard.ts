// The guided builder's steps and rules: order, which steps can be skipped (and why), budget shares
// per use, and the three sorts (Recommended, Price, Value).

import type { BaseListing, Category } from '../types';
import { CATEGORIES, type CategoryConfig } from './categories';
import type { Model } from './data';
import { cpuCooler, cpuHasIgpu, type Build, type Rating, type Slot } from './builder';
import type { Prefs, Use } from './builderState';
import type { Text } from './i18n';
import { recommendedScores } from './ranking';

export type StepId = 'use' | Slot | 'review';
/** Storage comes between the cooler and the case once that category exists. */
export const STEPS: StepId[] = ['use', 'cpu', 'mobo', 'ram', 'gpu', 'cooler', 'case', 'psu', 'fan', 'review'];

export const STEP_NAME: Record<StepId, Text> = {
  use: { el: 'Χρήση και προϋπολογισμός', en: 'Use and budget' },
  cpu: { el: 'Επεξεργαστής', en: 'Processor' },
  mobo: { el: 'Μητρική', en: 'Motherboard' },
  ram: { el: 'Μνήμη RAM', en: 'Memory (RAM)' },
  gpu: { el: 'Κάρτα γραφικών', en: 'Graphics card' },
  cooler: { el: 'Ψύκτρα επεξεργαστή', en: 'CPU cooler' },
  case: { el: 'Κουτί', en: 'Case' },
  psu: { el: 'Τροφοδοτικό', en: 'Power supply' },
  fan: { el: 'Ανεμιστήρες κουτιού', en: 'Case fans' },
  review: { el: 'Σύνοψη', en: 'Review' },
};
/** Short names for the progress bar. */
export const STEP_SHORT: Record<StepId, Text> = {
  use: { el: 'Χρήση', en: 'Use' },
  cpu: 'CPU',
  mobo: { el: 'Μητρική', en: 'Board' },
  ram: 'RAM',
  gpu: 'GPU',
  cooler: { el: 'Ψύκτρα', en: 'Cooler' },
  case: { el: 'Κουτί', en: 'Case' },
  psu: { el: 'Τροφοδοτικό', en: 'PSU' },
  fan: { el: 'Ανεμιστήρες', en: 'Fans' },
  review: { el: 'Σύνοψη', en: 'Review' },
};
/** The buying guide's text for each step (BuildGuide GUIDE_STEPS index). */
export const GUIDE_INDEX: Partial<Record<StepId, number>> = {
  use: 0, cpu: 1, mobo: 1, ram: 2, gpu: 3, cooler: 4, case: 5, fan: 6, psu: 7,
};

/** Can the step be skipped, and why (or why not). */
export function optional(step: StepId, b: Build): { optional: boolean; why?: Text } {
  if (step === 'use' || step === 'fan') return { optional: true };
  if (step === 'gpu') {
    if (b.cpu && !cpuHasIgpu(b.cpu))
      return {
        optional: false,
        why: { el: 'Ο επεξεργαστής δεν έχει ενσωματωμένα γραφικά: χρειάζεται κάρτα γραφικών.', en: 'The CPU has no integrated graphics: a graphics card is needed.' },
      };
    return {
      optional: true,
      why: b.cpu
        ? { el: 'Ο επεξεργαστής έχει ενσωματωμένα γραφικά: η κάρτα είναι προαιρετική.', en: 'The CPU has integrated graphics: a card is optional.' }
        : undefined,
    };
  }
  if (step === 'cooler') {
    const inBox = b.cpu ? cpuCooler(b.cpu) : null;
    if (inBox)
      return {
        optional: true,
        why: { el: 'Ο επεξεργαστής έχει ψύκτρα στο κουτί: μια καλύτερη είναι προαιρετική.', en: 'The CPU comes with a cooler: a better one is optional.' },
      };
    return {
      optional: false,
      why: b.cpu
        ? inBox === false
          ? { el: 'Ο επεξεργαστής δεν έχει ψύκτρα στο κουτί.', en: 'The CPU has no cooler in the box.' }
          : { el: 'Δεν αναφέρεται αν ο επεξεργαστής έχει ψύκτρα στο κουτί.', en: "It isn't stated whether the CPU has a cooler in the box." }
        : undefined,
    };
  }
  return { optional: false };
}

export const isDone = (step: StepId, b: Build, p: Prefs): boolean =>
  step === 'use' ? p.use != null || p.budget != null : step === 'review' ? false : b[step] != null;

// ---------- Budget ----------

/** Usual share of the whole budget per part, by use ([min, max] %). */
const SHARES: Record<Use, Partial<Record<Slot, [number, number]>>> = {
  gaming: { cpu: [15, 20], mobo: [10, 12], ram: [6, 8], gpu: [35, 45], cooler: [3, 5], case: [5, 7], psu: [7, 9], fan: [1, 3] },
  everyday: { cpu: [25, 30], mobo: [15, 20], ram: [12, 15], gpu: [0, 10], cooler: [0, 5], case: [10, 15], psu: [10, 12], fan: [0, 3] },
  creating: { cpu: [25, 30], mobo: [12, 15], ram: [12, 15], gpu: [25, 30], cooler: [4, 6], case: [6, 8], psu: [8, 10], fan: [1, 3] },
  unsure: { cpu: [18, 22], mobo: [11, 13], ram: [8, 10], gpu: [25, 35], cooler: [3, 5], case: [6, 8], psu: [8, 10], fan: [1, 3] },
};
export const shareOf = (use: Use | null, slot: Slot): [number, number] | null => SHARES[use ?? 'unsure'][slot] ?? null;

/** What's left of the budget for `slot`, after the other chosen parts. */
export function remaining(b: Build, p: Prefs, slot: Slot): number | null {
  if (p.budget == null) return null;
  const others = (Object.keys(b) as Slot[]).filter((s) => s !== slot && b[s]).reduce((sum, s) => sum + b[s]!.cheapest.price, 0);
  return p.budget - others;
}

// ---------- Sorting ----------

export type SortBy = 'recommended' | 'price' | 'value';
export const SORTS: { id: SortBy; label: Text }[] = [
  { id: 'recommended', label: { el: 'Προτεινόμενα', en: 'Recommended' } },
  { id: 'price', label: { el: 'Τιμή (φθηνότερα πρώτα)', en: 'Price (lowest first)' } },
  { id: 'value', label: { el: 'Αξία για τα λεφτά', en: 'Value for money' } },
];

type Rated = { m: Model<BaseListing>; rating: Rating };

/**
 * `recommended`: the category pages' score (src/lib/ranking.ts) over every part the step offers.
 * `value`: the category's value-for-money (graphics cards performance/€, RAM GB/€, PSU W/€, fans
 * per €); CPUs, boards, cases and coolers (no such measure): the recommended score per € (owner's
 * decision 2026-10-02).
 */
export function sorter(slot: Slot, all: Model<BaseListing>[], by: SortBy): (a: Rated, b: Rated) => number {
  if (by === 'price') return (a, b) => a.m.cheapest.price - b.m.cheapest.price;
  const cfg = CATEGORIES[slot as Category] as unknown as CategoryConfig<BaseListing>;
  const score = recommendedScores(all, slot as Category, cfg.value);
  if (by === 'recommended') return (a, b) => (score.get(b.m.key) ?? 0) - (score.get(a.m.key) ?? 0);
  const value = (m: Model<BaseListing>) => cfg.value?.(m) ?? (score.get(m.key) ?? 0) / m.cheapest.price;
  const cache = new Map<string, number>();
  const v = (m: Model<BaseListing>) => cache.get(m.key) ?? cache.set(m.key, value(m)).get(m.key)!;
  return (a, b) => v(b.m) - v(a.m);
}
