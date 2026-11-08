// Deals from price history (design 2026-11-08 WS2): a deal is a price at least 7% under the median of the daily lows
// of the 30 days before today, with enough history and at least two shops; "lowest" is strictly under every earlier
// low and at least 3% under that reference. A shop's own claim, a flat price, a one-day spike never make one.
import { describe, expect, it } from 'vitest';
import { DEAL_THRESHOLD, LOWEST_MARGIN, MIN_POINTS, MIN_SHOPS, REFERENCE_DAYS, dealOf, lowestOf } from '../../src/lib/deals';

const TODAY = '2026-11-08';
const day = (back: number) => new Date(Date.parse(TODAY) - back * 864e5).toISOString().slice(0, 10);
/** One daily low per day for the `days` days before today, oldest first; `price(i)` gets the age in days. */
const series = (days: number, price: (age: number) => number) => Array.from({ length: days }, (_, i) => ({ d: day(days - i), min: price(days - i) }));

describe('dealOf', () => {
  it('keeps the numbers of the design', () => {
    expect([DEAL_THRESHOLD, LOWEST_MARGIN, REFERENCE_DAYS, MIN_POINTS, MIN_SHOPS]).toEqual([0.07, 0.03, 30, 10, 2]);
  });

  it('a price flat for 30 days is no deal, whatever a shop claims', () => {
    expect(dealOf(series(30, () => 100), 100, 3, TODAY)).toBeNull();
  });

  it('10% under the 30-day median is a deal with its reference', () => {
    expect(dealOf(series(30, () => 100), 90, 3, TODAY)).toEqual({ pct: 10, reference: 100, days: 30 });
  });

  it('7% is the threshold: 94 is no deal, 93 is', () => {
    const points = series(30, () => 100);
    expect(dealOf(points, 94, 3, TODAY)).toBeNull();
    expect(dealOf(points, 93, 3, TODAY)?.pct).toBe(7);
  });

  it('needs at least 10 history points, and at least 2 shops', () => {
    expect(dealOf(series(9, () => 100), 80, 3, TODAY)).toBeNull();
    expect(dealOf(series(10, () => 100), 80, 3, TODAY)?.pct).toBe(20);
    expect(dealOf(undefined, 80, 3, TODAY)).toBeNull();
    expect(dealOf([], 80, 3, TODAY)).toBeNull();
    expect(dealOf(series(30, () => 100), 80, 1, TODAY)).toBeNull();
  });

  it('a one-day spike does not move the median, so going back to normal is no deal', () => {
    const points = series(30, (age) => (age === 12 ? 150 : 100));
    expect(dealOf(points, 100, 3, TODAY)).toBeNull();
  });

  it('only the 30 days before today count: older points and today are ignored', () => {
    const old = series(60, (age) => (age > 30 ? 200 : 100));
    expect(dealOf(old, 90, 3, TODAY)).toEqual({ pct: 10, reference: 100, days: 30 });
    expect(dealOf([...series(30, () => 100), { d: TODAY, min: 50 }], 90, 3, TODAY)?.reference).toBe(100);
  });
});

describe('lowestOf', () => {
  const long = series(90, () => 100);

  it('strictly under every earlier low and at least 3% under the reference', () => {
    expect(lowestOf(long, undefined, 96, TODAY)).toEqual({ since: day(90) });
  });

  it('a tie with the previous minimum, or under 3%, is not a lowest', () => {
    expect(lowestOf(long, undefined, 100, TODAY)).toBeNull();
    expect(lowestOf(long, undefined, 99, TODAY)).toBeNull();
    expect(lowestOf(long, undefined, 97, TODAY)).toEqual({ since: day(90) });
  });

  it('needs 60 days of history', () => {
    expect(lowestOf(series(59, () => 100), undefined, 90, TODAY)).toBeNull();
    expect(lowestOf(series(61, () => 100), undefined, 90, TODAY)).not.toBeNull();
  });

  it('is not the lowest when an earlier point was lower, or Skroutz imported a lower all-time low', () => {
    const dip = series(90, (age) => (age === 50 ? 80 : 100));
    expect(lowestOf(dip, undefined, 90, TODAY)).toBeNull();
    expect(lowestOf(long, { d: TODAY, low: 85, since: day(400) }, 90, TODAY)).toBeNull();
    expect(lowestOf(long, { d: TODAY, low: 85, since: day(400) }, 84, TODAY)).toEqual({ since: day(400) });
  });

  it('undefined or short history gives null', () => {
    expect(lowestOf(undefined, undefined, 10, TODAY)).toBeNull();
    expect(lowestOf([], undefined, 10, TODAY)).toBeNull();
  });
});
