import type { DailyLow } from '../types';

// C6: Skroutz's imported history (and rarely our own scrape) holds a few days at a price far below
// what the model costs before and after, e.g. RTX 5060 8GB at 200 € for 4 days in March while it sold
// for ~345 € either side. Those are not deals: the chart draws them hollow and the all-time-low badge
// ignores them. A lasting drop (the price stays low) is not a dip: it must be low against BOTH sides.

/** A daily low is implausible when it is below this share of the median of the days around it. */
export const DIP_RATIO = 0.65;
/** How far before and after the point the median looks. */
export const DIP_WINDOW_DAYS = 30;
/** Points each side needs; fewer on the "after" side (recent days) means the point is never flagged. */
export const DIP_MIN_POINTS = 7;

const dayNumber = (d: string) => Math.floor(Date.parse(`${d}T00:00:00Z`) / 864e5);

function median(values: number[]): number {
  values.sort((a, b) => a - b);
  const mid = values.length >> 1;
  return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
}

/**
 * The points that are implausible dips (see the constants above). Works on any order; O(n * window)
 * with two moving window edges over the date-sorted points. The returned set holds the input objects.
 */
export function implausibleDips<T extends DailyLow>(points: readonly T[]): Set<T> {
  const out = new Set<T>();
  if (points.length < 2 * DIP_MIN_POINTS + 1) return out;
  const sorted = [...points].sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  const days = sorted.map((p) => dayNumber(p.d));
  let lo = 0; // first point within the 30 days before i
  let hi = 0; // first point after the 30 days after i
  for (let i = 0; i < sorted.length; i++) {
    const limit = sorted[i].min / DIP_RATIO; // the median must exceed this for a dip
    while (days[lo] < days[i] - DIP_WINDOW_DAYS) lo++;
    if (hi < i + 1) hi = i + 1;
    while (hi < sorted.length && days[hi] <= days[i] + DIP_WINDOW_DAYS) hi++;
    const before = i - lo;
    const after = hi - i - 1;
    if (before < DIP_MIN_POINTS || after < DIP_MIN_POINTS) continue;
    // Cheap rejection: the median cannot exceed the maximum.
    let max = 0;
    for (let j = lo; j < i; j++) if (sorted[j].min > max) max = sorted[j].min;
    if (max <= limit) continue;
    const bm = median(sorted.slice(lo, i).map((p) => p.min));
    if (!(bm > limit)) continue;
    max = 0;
    for (let j = i + 1; j < hi; j++) if (sorted[j].min > max) max = sorted[j].min;
    if (max <= limit) continue;
    const am = median(sorted.slice(i + 1, hi).map((p) => p.min));
    if (am > limit) out.add(sorted[i]);
  }
  return out;
}

/** The points without the implausible dips (same order as given). */
export function withoutDips<T extends DailyLow>(points: readonly T[]): T[] {
  const dips = implausibleDips(points);
  return dips.size ? points.filter((p) => !dips.has(p)) : [...points];
}

/** An imported all-time low that is (within 1%) the price of one of the model's dips is the same dip. */
export function isDipPrice(price: number, dips: Iterable<DailyLow>): boolean {
  for (const p of dips) if (Math.abs(p.min - price) <= p.min * 0.01) return true;
  return false;
}
