// Deals from price history (design 2026-11-08 WS2). The site used to copy the shops' own discount badges, which were
// right about a third of the time (a price flat for 30 days with a "-37%" badge, a wrong price counted as a sale).
// A deal is decided from our own daily lows instead, the way PriceSpy and Keepa do (a reference from history, not a label):
//   deal    price is at least DEAL_THRESHOLD under the median of the daily lows of the REFERENCE_DAYS days before today
//   lowest  price is strictly under every earlier low (our own and Skroutz's imported one) and at least LOWEST_MARGIN under that reference
// Pure functions: `today` is a parameter, so build and tests agree.

import type { DailyLow, Imported } from '../types';
import { isDipPrice, untrustedPoints } from './dips';

export const DEAL_THRESHOLD = 0.07;
export const LOWEST_MARGIN = 0.03;
export const REFERENCE_DAYS = 30;
/** Daily lows needed in the window before a reference means anything. */
export const MIN_POINTS = 10;
/** Distinct shops that must list the model today (1: the history audit shows a single shop's deals are as reliable). */
export const MIN_SHOPS = 1;
/** History needed before "lowest" means something (as before: src/lib/data.ts LOW_MIN_DAYS). */
const LOWEST_MIN_DAYS = 60;

export interface Deal {
  /** Whole percent under the reference, e.g. 10. */
  pct: number;
  /** The median of the daily lows over the reference window. */
  reference: number;
  days: number;
}

export interface Lowest {
  /** First day of the history it is compared with (YYYY-MM-DD). */
  since: string;
}

type Point = DailyLow & { g?: 1 };

const DAY = 864e5;
const median = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** Median of the trusted daily lows in [today - REFERENCE_DAYS, today), or null with fewer than MIN_POINTS. */
function reference(points: Point[] | undefined, today: string): number | null {
  if (!points?.length) return null;
  const bad = untrustedPoints(points);
  const from = new Date(Date.parse(today) - REFERENCE_DAYS * DAY).toISOString().slice(0, 10);
  const inWindow = points.filter((p) => p.d >= from && p.d < today && !bad.has(p)).map((p) => p.min);
  return inWindow.length >= MIN_POINTS ? median(inWindow) : null;
}

export function dealOf(points: Point[] | undefined, price: number, shops: number, today: string): Deal | null {
  if (shops < MIN_SHOPS) return null;
  const ref = reference(points, today);
  if (ref == null || ref <= 0 || price > ref * (1 - DEAL_THRESHOLD)) return null;
  return { pct: Math.round((1 - price / ref) * 100), reference: ref, days: REFERENCE_DAYS };
}

export function lowestOf(points: Point[] | undefined, imp: Imported[string] | undefined, price: number, today: string): Lowest | null {
  const ref = reference(points, today);
  if (ref == null || price > ref * (1 - LOWEST_MARGIN)) return null;
  const bad = untrustedPoints(points ?? []);
  const past = (points ?? []).filter((p) => p.d < today && !bad.has(p));
  let importedLow = typeof imp === 'object' ? imp : undefined;
  if (importedLow?.low != null && isDipPrice(importedLow.low, bad)) importedLow = { ...importedLow, low: undefined };
  const since = [past[0]?.d, importedLow?.since].filter((d): d is string => !!d).sort()[0];
  if (!since || Date.parse(today) - Date.parse(since) < LOWEST_MIN_DAYS * DAY) return null;
  const earlier = Math.min(...past.map((p) => p.min), importedLow?.low ?? Infinity);
  return price < earlier - 0.005 ? { since } : null;
}

/** What a listing carries about its model's deal (build time, `withDeals`); absent when there is none. */
export interface DealFields {
  dealPct?: number;
  dealRef?: number;
  lowestSince?: string;
}

/**
 * Every listing of a model gets the model's deal and lowest (the model's cheapest price against its history), so the
 * list file's columns, the model pages and the builder rows all read the same answer. `modelKey` is the category's.
 */
export function withDeals<L extends { source: string; price: number }>(
  listings: L[],
  modelKey: (l: L) => string,
  history: Record<string, Point[]>,
  imported: Imported,
  today: string,
): (L & DealFields)[] {
  const byModel = new Map<string, L[]>();
  for (const l of listings) {
    const k = modelKey(l);
    const g = byModel.get(k);
    if (g) g.push(l);
    else byModel.set(k, [l]);
  }
  const fields = new Map<string, DealFields>();
  for (const [key, group] of byModel) {
    const price = Math.min(...group.map((l) => l.price));
    const shops = new Set(group.map((l) => l.source)).size;
    const deal = dealOf(history[key], price, shops, today);
    const lowest = lowestOf(history[key], imported[key], price, today);
    if (deal || lowest) fields.set(key, { ...(deal && { dealPct: deal.pct, dealRef: deal.reference }), ...(lowest && { lowestSince: lowest.since }) });
  }
  return listings.map((l) => {
    const f = fields.get(modelKey(l));
    return f ? { ...l, ...f } : l;
  });
}
