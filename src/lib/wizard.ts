// The guided builder's steps (task 11: the start screen took the use and budget; fans are a section of the case
// step), what's left of the budget, and the three sorts (Recommended, Price, Value).

import type { BaseListing, Category } from '../types';
import { CATEGORIES, type CategoryConfig } from './categories';
import type { Model } from './data';
import type { Build, Slot } from './builderData';
import type { Rating } from './fitLabel';
import type { Prefs } from './builderState';
import type { Text } from './i18n';
import { recommendedScores } from './ranking';

/** A step, or a slot shown inside one (fans: in the case step). */
export type StepId = Slot | 'review';
export const STEPS: StepId[] = ['cpu', 'mobo', 'ram', 'gpu', 'cooler', 'storage', 'case', 'psu', 'review'];
/** The step a slot is chosen in (an old  address opens the case step). */
export const stepOf = (s: string | null): StepId | null => (s === 'fan' ? 'case' : STEPS.includes(s as StepId) ? (s as StepId) : null);

export const STEP_NAME: Record<StepId, Text> = {
  cpu: { el: 'Επεξεργαστής', en: 'Processor' },
  mobo: { el: 'Μητρική', en: 'Motherboard' },
  ram: { el: 'Μνήμη RAM', en: 'Memory (RAM)' },
  gpu: { el: 'Κάρτα γραφικών', en: 'Graphics card' },
  cooler: { el: 'Ψύκτρα επεξεργαστή', en: 'CPU cooler' },
  storage: { el: 'Αποθήκευση', en: 'Storage' },
  case: { el: 'Κουτί', en: 'Case' },
  psu: { el: 'Τροφοδοτικό', en: 'Power supply' },
  fan: { el: 'Ανεμιστήρες κουτιού', en: 'Case fans' },
  review: { el: 'Σύνοψη', en: 'Review' },
};
/** Short names for the progress bar. */
export const STEP_SHORT: Record<StepId, Text> = {
  cpu: 'CPU',
  mobo: { el: 'Μητρική', en: 'Board' },
  ram: 'RAM',
  gpu: 'GPU',
  cooler: { el: 'Ψύκτρα', en: 'Cooler' },
  storage: { el: 'Δίσκος', en: 'Storage' },
  case: { el: 'Κουτί', en: 'Case' },
  psu: { el: 'Τροφοδοτικό', en: 'PSU' },
  fan: { el: 'Ανεμιστήρες', en: 'Fans' },
  review: { el: 'Σύνοψη', en: 'Review' },
};
/** The buying guide's text for each step (BuildGuide GUIDE_STEPS index). */
export const GUIDE_INDEX: Partial<Record<StepId, number>> = {
  cpu: 1, mobo: 1, ram: 2, gpu: 3, cooler: 4, storage: 5, case: 6, fan: 7, psu: 8,
};

export const isDone = (step: StepId, b: Build): boolean => step !== 'review' && b[step] != null;

// ---------- Budget ----------

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
