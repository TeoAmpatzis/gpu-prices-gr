// "Recommended" sort: one score per model from four parts, each 0–1, weighted per category below.
//
//   popularity  how many listings and shops sell it (percentile within the category)
//   modern      current platform / generation (tables below: DDR5 > DDR4 > DDR3, AM5/LGA1851 first…)
//   price       how well the price sits inside the category's usual range (not the cheapest junk,
//               not the most expensive halo parts): 1 between the `priceBand` percentiles, less outside
//   value       value for money where the category has a measure (src/lib/value.ts), as a percentile
//
// score = Σ weight × part / Σ weight, × `saleBoost` when a shop marks it on sale or it is at an
// all-time low. Workstation/server models always come after the rest (also under "All").
// Tune the weights and tables here; nothing else needs to change.

import type {
  BaseListing,
  CaseListing,
  Category,
  CoolerListing,
  CpuListing,
  FanListing,
  GpuListing,
  MoboListing,
  PsuListing,
  RamListing,
} from '../types';
import type { Model } from './data';

export interface RankConfig {
  weights: { popularity: number; modern: number; price: number; value: number };
  /** Percentiles of the category's prices that count as a sensible price (score 1 in between). */
  priceBand: [number, number];
  saleBoost: number;
}

export const RANKING: Record<Category, RankConfig> = {
  gpu: { weights: { popularity: 0.3, modern: 0.3, price: 0.15, value: 0.25 }, priceBand: [0.25, 0.8], saleBoost: 1.1 },
  cpu: { weights: { popularity: 0.4, modern: 0.35, price: 0.25, value: 0 }, priceBand: [0.2, 0.8], saleBoost: 1.1 },
  mobo: { weights: { popularity: 0.4, modern: 0.35, price: 0.25, value: 0 }, priceBand: [0.2, 0.8], saleBoost: 1.1 },
  ram: { weights: { popularity: 0.3, modern: 0.4, price: 0.15, value: 0.15 }, priceBand: [0.25, 0.8], saleBoost: 1.1 },
  psu: {
    weights: { popularity: 0.35, modern: 0.35, price: 0.15, value: 0.15 },
    priceBand: [0.25, 0.8],
    saleBoost: 1.1,
  },
  // Cases and fans: smaller sale boost — some Shopflix sellers mark whole ranges as "Προσφορά".
  case: { weights: { popularity: 0.6, modern: 0.1, price: 0.3, value: 0 }, priceBand: [0.2, 0.8], saleBoost: 1.02 },
  fan: { weights: { popularity: 0.45, modern: 0.3, price: 0.15, value: 0.1 }, priceBand: [0.2, 0.8], saleBoost: 1.03 },
  cooler: { weights: { popularity: 0.55, modern: 0.15, price: 0.3, value: 0 }, priceBand: [0.2, 0.8], saleBoost: 1.1 },
};

// ---------- "modern" tables (0–1) ----------

const SOCKET: Record<string, number> = {
  AM5: 1,
  LGA1851: 1,
  LGA1700: 0.65,
  AM4: 0.45,
  LGA1200: 0.15,
  LGA1151: 0.05,
};
const socketScore = (s: string | null | undefined) => (s ? (SOCKET[s] ?? 0.05) : 0.2);

/** RTX 50 / RX 9000 / Arc B = current; RTX 40 / RX 7000 / Arc A = previous; then older. */
function gpuGeneration(chip: string): number {
  if (/^RTX 50|^RX 9\d{3}|^Arc B/.test(chip)) return 1;
  if (/^RTX 40|^RX 7\d{3}|^Arc A/.test(chip)) return 0.6;
  if (/^RTX 30|^RX 6\d{3}/.test(chip)) return 0.3;
  if (/^RTX 20|^GTX 16|^RX 5\d{3}/.test(chip)) return 0.1;
  return 0;
}

const RAM_TYPE: Record<string, number> = { DDR5: 1, DDR4: 0.45, DDR3: 0.05, DDR2: 0 };
const EFFICIENCY: Record<string, number> = {
  Titanium: 1,
  Platinum: 1,
  Diamond: 1,
  Gold: 0.9,
  Silver: 0.6,
  Bronze: 0.6,
  Standard: 0.3,
};
const CASE_SIZE: Record<string, number> = { 'Midi Tower': 1, 'Full Tower': 0.8, 'Mini Tower': 0.7, 'SFF / Cube': 0.7 };

const MODERN: { [C in Category]: (m: Model<never>) => number } = {
  gpu: (m) => gpuGeneration((m as Model<GpuListing>).cheapest.chip),
  cpu: (m) => socketScore((m as Model<CpuListing>).cheapest.socket),
  mobo: (m) => {
    const l = (m as Model<MoboListing>).cheapest;
    return 0.8 * socketScore(l.socket) + 0.2 * (l.memory === 'DDR5' ? 1 : 0.3);
  },
  ram: (m) => {
    const l = (m as Model<RamListing>).cheapest;
    const capacity = l.capacity >= 16 && l.capacity <= 64 ? 1 : l.capacity === 8 ? 0.5 : l.capacity > 64 ? 0.6 : 0.1;
    const kit = l.modules === 2 ? 1 : l.modules === 1 ? 0.7 : 0.6; // dual channel
    return 0.65 * (RAM_TYPE[l.type] ?? 0) + 0.25 * capacity + 0.1 * kit;
  },
  psu: (m) => {
    const l = (m as Model<PsuListing>).cheapest;
    const watts = l.watts >= 550 && l.watts <= 1000 ? 1 : l.watts >= 450 && l.watts <= 1300 ? 0.6 : 0.2;
    return 0.6 * (EFFICIENCY[l.efficiency ?? ''] ?? 0.15) + 0.4 * watts;
  },
  case: (m) => CASE_SIZE[(m as Model<CaseListing>).cheapest.size] ?? 0.3,
  fan: (m) => {
    const l = (m as Model<FanListing>).cheapest;
    const size = l.size === 120 || l.size === 140 ? 1 : l.size === 80 || l.size === 92 ? 0.35 : 0.15;
    return 0.75 * size + 0.25 * (l.pwm ? 1 : 0.4);
  },
  cooler: (m) => {
    const sockets = (m as Model<CoolerListing>).cheapest.sockets;
    if (!sockets) return 0.6; // not known yet
    return /AM5|LGA1851/.test(sockets) ? 1 : 0.3;
  },
};

// ---------- scoring ----------

/** Percentile (0–1) of each value among all values; ties share the average rank. */
function percentiles(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const n = values.length;
  return values.map((v) => {
    if (n < 2) return 1;
    let lo = 0;
    let hi = n - 1;
    while (lo < n && sorted[lo] < v) lo++;
    while (hi >= 0 && sorted[hi] > v) hi--;
    return (lo + hi) / 2 / (n - 1);
  });
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))));
  return sorted[i];
}

/** 1 inside [lo, hi]; outside, falls with the distance in price ratio (half at 2× or ½ of the edge). */
function priceFit(price: number, lo: number, hi: number): number {
  if (price >= lo && price <= hi) return 1;
  const edge = price < lo ? lo : hi;
  return Math.max(0, 1 - Math.abs(Math.log2(price / edge)) * 0.5);
}

/** builder.json rows carry popularityRaw × POP_SCALE, rounded (`pop`): 2 costs 7 KB gzipped. */
export const POP_SCALE = 2;

/** How much a model is on offer: its listings, its shops, the sites listing it (log-scaled). A builder
 * row (one listing per model there) carries the full model's value as `pop`. */
export function popularityRaw(m: Model<BaseListing>): number {
  if (m.cheapest.pop != null) return m.cheapest.pop / POP_SCALE;
  const shops = Math.max(0, ...m.listings.map((l) => l.shopCount ?? 0));
  const sources = new Set(m.listings.map((l) => l.source)).size;
  return Math.log1p(m.listings.length) + 0.5 * Math.log1p(shops) + 0.3 * sources;
}

/**
 * Recommended score per model key, relative to the models being shown (so filters change the scale).
 * `value` is the category's value-for-money function, if it has one.
 */
export function recommendedScores<L extends BaseListing>(
  models: Model<L>[],
  category: Category,
  value?: (m: Model<L>) => number | null,
): Map<string, number> {
  const rc = RANKING[category];
  const w = rc.weights;
  const total = w.popularity + w.modern + w.price + w.value || 1;

  const popularity = percentiles(models.map(popularityRaw));
  const valueRaw = models.map((m) => value?.(m) ?? null);
  const knownValues = valueRaw.filter((v): v is number => v != null);
  const valuePct = percentiles(knownValues);
  const valueOf = new Map(knownValues.map((v, i) => [v, valuePct[i]]));

  const prices = models.map((m) => m.cheapest.price).sort((a, b) => a - b);
  const [lo, hi] = [quantile(prices, rc.priceBand[0]), quantile(prices, rc.priceBand[1])];

  const scores = new Map<string, number>();
  models.forEach((m, i) => {
    const v = valueRaw[i];
    const parts =
      w.popularity * popularity[i] +
      w.modern * MODERN[category](m as Model<never>) +
      w.price * priceFit(m.cheapest.price, lo, hi) +
      w.value * (v == null ? 0 : (valueOf.get(v) ?? 0));
    scores.set(m.key, (parts / total) * (m.sale || m.low ? rc.saleBoost : 1));
  });
  return scores;
}
