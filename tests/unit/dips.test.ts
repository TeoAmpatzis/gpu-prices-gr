import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chartLine, implausibleDips, isDipPrice, withoutDips } from '../../src/lib/dips';
import { allTimeLow } from '../../src/lib/data';
import { listFile, reduceHistory } from '../../src/lib/derive';
import { decodeHist } from '../../src/lib/columns';
import { CATEGORIES } from '../../src/lib/categories';
import type { BaseListing, DailyLow, History, Latest } from '../../src/types';

const day = (n: number) => new Date(Date.UTC(2026, 0, 1) + n * 864e5).toISOString().slice(0, 10);
const series = (prices: number[], start = 0): DailyLow[] => prices.map((min, i) => ({ d: day(start + i), min }));
const flat = (n: number, v: number) => Array<number>(n).fill(v);

describe('implausibleDips (C6)', () => {
  it('RTX 5060 shape: the 4-day 200/210 dip between ~345 euro stretches is excluded', () => {
    const pts = series([...flat(30, 349.5), 200, 210, 200, 200, ...flat(30, 345)]);
    const dips = implausibleDips(pts);
    expect([...dips].map((p) => p.min).sort()).toEqual([200, 200, 200, 210]);
  });

  it('keeps a real 20% drop', () => {
    const pts = series([...flat(30, 100), ...flat(3, 80), ...flat(30, 100)]);
    expect(implausibleDips(pts).size).toBe(0);
  });

  it('keeps a lasting drop (GT 240 shape: stays low for weeks)', () => {
    const pts = series([...flat(40, 100), ...flat(40, 58)]);
    expect(implausibleDips(pts).size).toBe(0);
  });

  it('never flags a dip with fewer than 7 points after it (recent days)', () => {
    const pts = series([...flat(40, 100), 50, 50, 100, 100, 100, 100]);
    expect(implausibleDips(pts).size).toBe(0);
    // the same dip with 7 days after it is flagged
    expect(implausibleDips(series([...flat(40, 100), 50, 50, ...flat(7, 100)])).size).toBe(2);
  });

  it('needs 7 points before as well', () => {
    expect(implausibleDips(series([...flat(5, 100), 50, ...flat(30, 100)])).size).toBe(0);
  });

  it('withoutDips drops them and keeps order', () => {
    const pts = series([...flat(10, 100), 40, ...flat(10, 100)]);
    expect(withoutDips(pts)).toHaveLength(20);
  });

  it('runs fast on a long history', () => {
    const pts = series(Array.from({ length: 20000 }, (_, i) => 100 + (i % 7)));
    const t = Date.now();
    implausibleDips(pts);
    expect(Date.now() - t).toBeLessThan(1000);
  });
});

describe('dip run length and window edge (C6)', () => {
  it('a 15-day run that snaps back is flagged; a drop that lasts 30+ days is not', () => {
    expect(implausibleDips(series([...flat(30, 100), ...flat(15, 40), ...flat(30, 100)])).size).toBe(15);
    expect(implausibleDips(series([...flat(40, 100), ...flat(40, 40)])).size).toBe(0);
    expect(implausibleDips(series([...flat(30, 100), ...flat(45, 40)])).size).toBe(0);
  });

  it('chartLine falls back to all points when fewer than two would remain', () => {
    const pts = series([100, 40, 40]);
    expect(chartLine(pts, new Set([pts[1], pts[2]]))).toHaveLength(3);
    expect(chartLine(pts, new Set([pts[2]]))).toHaveLength(2);
    expect(chartLine([], new Set())).toEqual([]);
  });

  it('window edge: a point exactly 30 days away counts, 31 does not', () => {
    // 7 points needed before: put exactly 7 at distances 24..30 days (counted) / 25..31 (last one outside)
    const mk = (offsets: number[]) => [
      ...offsets.map((o) => ({ d: day(100 - o), min: 100 })),
      { d: day(100), min: 40 },
      ...series(flat(7, 100), 101),
    ];
    expect(implausibleDips(mk([30, 29, 28, 27, 26, 25, 24])).size).toBe(1);
    expect(implausibleDips(mk([31, 29, 28, 27, 26, 25, 24])).size).toBe(0);
  });
});

describe('build-time path (listFile)', () => {
  it('strips dips from hist and the imported low, keeps since', () => {
    const cfg = CATEGORIES.gpu as unknown as { modelKey: (l: BaseListing) => string };
    const latest = JSON.parse(readFileSync('public/data/gpu/latest.json', 'utf8')) as Latest;
    const listing = latest.listings[0];
    const key = cfg.modelKey(listing);
    const today = new Date().toISOString().slice(0, 10);
    const base = Date.parse(`${today}T00:00:00Z`);
    const dd = (n: number) => new Date(base - n * 864e5).toISOString().slice(0, 10);
    const hist = [
      ...Array.from({ length: 60 }, (_, i) => ({ d: dd(100 - i), min: 100, source: 'skroutz' as const })),
      ...[40, 39].map((n) => ({ d: dd(n), min: 40, source: 'skroutz' as const })),
      ...Array.from({ length: 30 }, (_, i) => ({ d: dd(38 - i), min: 100, source: 'skroutz' as const })),
    ];
    const f = listFile(
      'gpu',
      { latest: { ...latest, listings: [listing] }, history: { [key]: hist }, imported: { [key]: { d: dd(5), low: 40.2, since: dd(100) } } },
      `${today}T06:00:00Z`,
    );
    expect((decodeHist(f)[key] ?? []).some((p) => p.min === 40)).toBe(false);
    const imp = f.imported[key] as { low?: number; since?: string };
    expect(imp.low).toBeUndefined();
    expect(imp.since).toBe(dd(100));
  });
});

describe('allTimeLow ignores dips (C6)', () => {
  const old = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
  const build = (prices: number[]): DailyLow[] => prices.map((min, i) => ({ d: old(prices.length - i), min }));

  it('a price above an excluded dip is the all-time low; an imported low equal to the dip is ignored', () => {
    const pts = build([...flat(40, 120), 60, 60, ...flat(40, 120)]);
    expect(allTimeLow(pts, { d: '2026-01-01', low: 60.4, since: old(200) }, 118)).not.toBeNull();
  });

  it('a genuine imported low is kept', () => {
    const pts = build(flat(80, 120));
    expect(allTimeLow(pts, { d: '2026-01-01', low: 100, since: old(200) }, 118)).toBeNull();
  });

  it('reduceHistory of the filtered series keeps the week-change comparison off the dip', () => {
    const pts = build([...flat(40, 120), 60, ...flat(20, 120)]);
    const reduced = reduceHistory(withoutDips(pts), new Date().toISOString().slice(0, 10));
    expect(reduced.every(([, v]) => v === 120)).toBe(true);
  });

  it('isDipPrice matches within 1%', () => {
    expect(isDipPrice(200.9, [{ d: 'x', min: 200 }])).toBe(true);
    expect(isDipPrice(203, [{ d: 'x', min: 200 }])).toBe(false);
  });
});

describe('real data: RTX 5060 8GB', () => {
  const hist = JSON.parse(readFileSync('public/data/gpu/history.json', 'utf8')) as History;
  const imported = JSON.parse(readFileSync('public/data/gpu/history_imported.json', 'utf8'));
  const pts = hist['RTX 5060 8GB'];

  it('all four March dip days are excluded', () => {
    const d = [...implausibleDips(pts)].map((p) => p.d).sort();
    expect(d).toEqual(['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04']);
  });

  it('its all-time low is not the 200/210 dip: the lowest plausible point (238 euro) decides', () => {
    const imp = imported['RTX 5060 8GB'];
    expect(allTimeLow(pts, imp, 339.4)).toBeNull();
    expect(allTimeLow(pts, imp, 238)).not.toBeNull(); // 238 is the lowest plausible point
    expect(allTimeLow(pts, imp, 239)).toBeNull();
  });
});
