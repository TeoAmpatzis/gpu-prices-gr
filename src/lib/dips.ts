import type { DailyLow, History, HistoryPoint, Imported } from '../types';

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

// Task 7b: Skroutz's history import gave the very same all-time low to many unrelated models of a category
// (115.43 € to six graphics cards from a T400 to an Arc B570; 369.59 € to CPUs, boards and drives), and wrote the same
// value on the same day into the imported history of many models (10/09/2025: 369.59 € for 9 CPUs, between ~485 € days
// of a Ryzen 9 7950X; 26-27/06/2026: 97.99 € for 11 boards). Not prices. The build decides (src/lib/derive.ts, over the
// whole category's history_imported.json and history.json): such a low is left out of `imported`, such a point is left
// out of the list file's history and marked `g: 1` in the model chunks; the browser only reads the marks
// (untrustedPoints).

/** An imported low (or an imported day's value) that this many or more models of one category share is suspect. */
export const SHARED_LOW_MODELS = 3;
/** A glitch lasts at most this many days at its value... */
export const GLITCH_MAX_DAYS = 3;
/** ...and the days around it are at least this much higher (5%). */
export const GLITCH_RISE = 1.05;

/** The imported lows (history_imported.json `low`) that SHARED_LOW_MODELS or more of the category's models share. */
export function sharedImportedLows(imported: Imported): Set<number> {
  const count = new Map<number, number>();
  for (const v of Object.values(imported)) if (typeof v === 'object' && v.low != null) count.set(v.low, (count.get(v.low) ?? 0) + 1);
  return new Set([...count].filter(([, n]) => n >= SHARED_LOW_MODELS).map(([low]) => low));
}

/** The imported entry without a shared (glitch) low; `d` and `since` stay (since dates the history). */
export function withoutSharedLow(imp: Imported[string], bad: ReadonlySet<number>): Imported[string] {
  return typeof imp === 'object' && imp.low != null && bad.has(imp.low) ? { ...imp, low: undefined } : imp;
}

/** Per date, the values that SHARED_LOW_MODELS or more of the category's models have as an imported point that day. */
export type SharedDays = ReadonlyMap<string, ReadonlySet<number>>;

const isSharedDay = (shared: SharedDays, p: HistoryPoint) => p.i === 1 && shared.get(p.d)?.has(p.min) === true;

/** The imported ("i": 1) day values that SHARED_LOW_MODELS or more of the category's models share (whole history.json). */
export function sharedImportedDays(history: History): Map<string, Set<number>> {
  const count = new Map<string, Map<number, number>>();
  for (const pts of Object.values(history)) {
    for (const p of pts) {
      if (p.i !== 1) continue;
      let byValue = count.get(p.d);
      if (!byValue) count.set(p.d, (byValue = new Map()));
      byValue.set(p.min, (byValue.get(p.min) ?? 0) + 1);
    }
  }
  const out = new Map<string, Set<number>>();
  for (const [d, byValue] of count) {
    const values = [...byValue].filter(([, n]) => n >= SHARED_LOW_MODELS).map(([v]) => v);
    if (values.length) out.set(d, new Set(values));
  }
  return out;
}

const dayNo = (d: string) => Date.parse(`${d}T00:00:00Z`) / 864e5;

/**
 * The import glitches of one model: imported ("i": 1) points whose date and value 3+ of the category's models share
 * (`shared` = sharedImportedDays), or whose value is one of the category's shared imported lows (`badLows` =
 * sharedImportedLows: the same glitch on a day the other models' 365-point histories no longer reach, e.g. T400 4GB at
 * 115.43 on 10/09/2025), inside a run of at most GLITCH_MAX_DAYS days at that value (every point of the run
 * imported) whose neighbours are at least GLITCH_RISE higher (only the one there is for a run at the start or end of
 * the history): then every point of that run is a glitch, not only the suspect ones. A long flat run at a round price
 * (24 €, 12.90 €… on many models at once) stays: a real price. Works on any order; returns the input objects.
 */
export function importGlitches<T extends HistoryPoint>(
  points: readonly T[],
  shared: SharedDays,
  badLows: ReadonlySet<number> = new Set(),
): Set<T> {
  const out = new Set<T>();
  const suspect = (p: T) => isSharedDay(shared, p) || (p.i === 1 && badLows.has(p.min));
  if ((!shared.size && !badLows.size) || points.length < 2 || !points.some(suspect)) return out;
  let sorted = points;
  for (let i = 1; i < points.length; i++) {
    if (points[i - 1].d > points[i].d) {
      sorted = [...points].sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
      break;
    }
  }
  for (let s = 0; s < sorted.length; ) {
    const value = sorted[s].min;
    let e = s;
    while (e + 1 < sorted.length && sorted[e + 1].min === value) e++;
    let candidate = false;
    let imported = true;
    for (let j = s; j <= e; j++) {
      if (sorted[j].i !== 1) imported = false;
      if (suspect(sorted[j])) candidate = true;
    }
    const before = sorted[s - 1];
    const after = sorted[e + 1];
    const higher = (q: T | undefined) => !q || q.min >= value * GLITCH_RISE;
    if (
      candidate &&
      imported &&
      (before || after) &&
      higher(before) &&
      higher(after) &&
      dayNo(sorted[e].d) - dayNo(sorted[s].d) + 1 <= GLITCH_MAX_DAYS
    ) {
      for (let j = s; j <= e; j++) out.add(sorted[j]); // the whole run: one glitch, never half of it
    }
    s = e + 1;
  }
  return out;
}

/**
 * The points left out of the line, the low, the median and the week change: the ones the build marked as import
 * glitches (`g: 1`), plus the C6 dips found among the rest. Without marks (list files, the scraper's raw history)
 * this is implausibleDips.
 */
export function untrustedPoints<T extends DailyLow & { g?: 1 }>(points: readonly T[]): Set<T> {
  const marked = points.filter((p) => p.g === 1);
  if (!marked.length) return implausibleDips(points);
  const out = implausibleDips(points.filter((p) => p.g !== 1));
  for (const p of marked) out.add(p);
  return out;
}

/**
 * The points the chart draws its line (and range) from: all but the dips, or every point when fewer
 * than two would be left (a line needs two), so the chart never crashes on a mostly flagged history.
 */
export function chartLine<T extends DailyLow>(data: readonly T[], dips: ReadonlySet<T>): T[] {
  const line = data.filter((q) => !dips.has(q));
  return line.length >= 2 ? line : [...data];
}
