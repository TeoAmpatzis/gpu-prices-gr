// Task 7: the product page's price-history summary: the 90-day median sentence and the all-time low it marks.
import { describe, expect, it } from 'vitest';
import { allTimeLow, historyLow } from '../../src/lib/data';
import { MEDIAN_DAYS, MEDIAN_MIN_POINTS, lowSentence, medianSummary, rangeStart } from '../../src/lib/priceSummary';

const DAY = 864e5;
const day = (end: string, back: number) => new Date(Date.parse(`${end}T00:00:00Z`) - back * DAY).toISOString().slice(0, 10);
/** One point per day, oldest first, the last on `end`; prices[0] is the oldest. */
const series = (prices: number[], end = '2026-10-17') => prices.map((min, i) => ({ d: day(end, prices.length - 1 - i), min, source: 'skroutz' as const }));

describe('medianSummary', () => {
  it('uses the last 90 days: today 8% under the median', () => {
    // 59 days at 100, 30 days at 100, today 92: median 100 -> 8% below
    const pts = series([...Array(89).fill(100), 92]);
    expect(medianSummary(pts)).toEqual({ kind: 'ok', dir: 'below', pct: 8, median: 100, price: 92 });
  });

  it('above, and rounded to an integer', () => {
    const pts = series([...Array(89).fill(100), 112.6]);
    expect(medianSummary(pts)).toMatchObject({ kind: 'ok', dir: 'above', pct: 13 });
  });

  it('a rounded 0% is "equal"', () => {
    const pts = series([...Array(89).fill(100), 100.4]);
    expect(medianSummary(pts)).toMatchObject({ kind: 'ok', dir: 'equal', pct: 0 });
  });

  it('median of an even count is the middle pair mean; days older than 90 are ignored', () => {
    const old = series(Array(40).fill(1000), day('2026-10-17', 100));
    const recent = series([...Array.from({ length: 29 }, (_, i) => (i % 2 ? 100 : 120)), 55]); // 30 points
    const s = medianSummary([...old, ...recent]);
    expect(s).toMatchObject({ kind: 'ok', price: 55 });
    if (s.kind === 'ok') expect(s.median).toBe(110);
  });

  it('dips are left out of the median and are never "today"', () => {
    // 60 steady days at 100 with a 4-day dip at 50 in the middle, today at 100
    const prices = Array(60).fill(100);
    for (let i = 28; i < 32; i++) prices[i] = 50;
    const pts = series(prices);
    const s = medianSummary(pts);
    expect(s).toMatchObject({ kind: 'ok', median: 100, dir: 'equal' });
  });

  it('exactly the minimum number of daily points in the 90 days still gives a sentence; one fewer does not', () => {
    expect(MEDIAN_DAYS).toBe(90);
    expect(medianSummary(series(Array(MEDIAN_MIN_POINTS).fill(100)))).toMatchObject({ kind: 'ok' });
    expect(medianSummary(series(Array(MEDIAN_MIN_POINTS - 1).fill(100)))).toEqual({ kind: 'few' });
  });

  it('points older than 90 days do not count toward the minimum', () => {
    const pts = [...series(Array(60).fill(100), day('2026-10-17', 120)), ...series(Array(10).fill(100))];
    expect(medianSummary(pts)).toEqual({ kind: 'few' });
  });

  it('no points: few', () => {
    expect(medianSummary([])).toEqual({ kind: 'few' });
  });
});

describe('rangeStart', () => {
  it('counts back from the last point; All starts at the first', () => {
    const pts = series(Array(200).fill(100));
    // 30 / 90 days = that many daily points, last day included: the same window as the 90-day median
    expect(rangeStart(pts, '30')).toBe(day('2026-10-17', 29));
    expect(rangeStart(pts, '90')).toBe(day('2026-10-17', 89));
    expect(pts.filter((p) => p.d >= rangeStart(pts, '90'))).toHaveLength(MEDIAN_DAYS);
    expect(rangeStart(pts, '365')).toBe(pts[0].d);
    expect(rangeStart(pts, 'all')).toBe(pts[0].d);
  });
});

describe('historyLow (the marked all-time low; same rule as allTimeLow)', () => {
  const longDays = Array(80).fill(100);
  it('lowest daily low, today included', () => {
    const pts = series([...longDays.slice(0, 40), 80, ...longDays.slice(0, 39)]);
    expect(historyLow(pts, undefined)).toMatchObject({ price: 80 });
  });
  it('the imported Skroutz low counts', () => {
    const pts = series(longDays);
    expect(historyLow(pts, { d: '2026-01-01', low: 70, since: '2025-01-01' })).toMatchObject({ price: 70, since: '2025-01-01' });
  });
  it('says whether the low is ours (with its day) or only on Skroutz (no day)', () => {
    const own = series([...longDays.slice(0, 40), 80, ...longDays.slice(0, 39)]);
    expect(historyLow(own, undefined)).toMatchObject({ price: 80, source: 'own', date: own[40].d });
    expect(historyLow(own, { d: '2026-10-01', low: 80, since: '2025-01-01' })).toMatchObject({ source: 'own' }); // a tie is ours
    expect(historyLow(series(longDays), { d: '2026-10-01', low: 70, since: '2025-01-01' })).toMatchObject({ source: 'skroutz', date: null });
  });
  it('needs 60 days of history', () => {
    expect(historyLow(series(Array(30).fill(100)), undefined)).toBeNull();
  });
  it('a dip is ignored', () => {
    const prices = Array(80).fill(100);
    for (let i = 40; i < 43; i++) prices[i] = 40;
    expect(historyLow(series(prices), undefined)).toMatchObject({ price: 100 });
  });
  it('agrees with allTimeLow: a price at the low is the low, a higher one is not', () => {
    const pts = series(longDays);
    const lowAt = historyLow(pts, undefined)!.price;
    expect(allTimeLow(pts, undefined, lowAt)).not.toBeNull();
    expect(allTimeLow(pts, undefined, lowAt + 1)).toBeNull();
  });
});

describe('lowSentence', () => {
  const own = { price: 423.22, since: '2025-04-22', date: '2025-12-12', source: 'own' as const };
  it('own low: day, 5 shops, tracking start', () => {
    expect(lowSentence('en', own, false)).toBe("Lowest price we've recorded: €423.22 (12/12/2025) · from our 5 shops since 22/04/2025");
    expect(lowSentence('el', own, false)).toContain('(12/12/2025) · από τις 5 πηγές μας, από 22/04/2025');
  });
  it('own low older than the drawn range says so', () => {
    expect(lowSentence('en', own, true)).toMatch(/ · before this chart$/);
    expect(lowSentence('el', own, true)).toMatch(/ · πριν από αυτό το διάγραμμα$/);
  });
  it('Skroutz low: says where it comes from, no day', () => {
    const sk = { price: 115.43, since: '2024-10-02', date: null, source: 'skroutz' as const };
    expect(lowSentence('en', sk, false)).toBe('Lowest price: €115.43 on Skroutz, before our own tracking began');
    expect(lowSentence('el', sk, false)).toContain('στο Skroutz, πριν ξεκινήσουμε την καταγραφή');
  });
});
