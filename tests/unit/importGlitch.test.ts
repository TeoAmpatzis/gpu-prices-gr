// Task 7b: Skroutz's history import gave the same all-time low to many unrelated models of a category (115.43 € to six
// graphics cards from a T400 to an Arc B570), and wrote the same value on the same day into many models' imported
// history. A low shared by 3+ models of a category is ignored; an imported point whose day and value 3+ models share,
// in a short run (≤ 3 days) at least 5% under its neighbours, is treated like a dip. A low that is an imported Skroutz
// day is said to be Skroutz's, with its day.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VALIDATION_MODE, validateLatest } from '../../src/data/validate';
import { allTimeLow, decodeList, historyLow } from '../../src/lib/data';
import { listFile, modelChunks, type CategoryInput } from '../../src/lib/derive';
import {
  SHARED_LOW_MODELS,
  importGlitches,
  sharedImportedDays,
  sharedImportedLows,
  untrustedPoints,
  withoutSharedLow,
} from '../../src/lib/dips';
import { lowSentence } from '../../src/lib/priceSummary';
import type { Category, HistoryPoint, History, Imported, Latest, ModelEntry } from '../../src/types';

const read = <T>(cat: string, f: string, fb: T): T => {
  try {
    return JSON.parse(readFileSync(`public/data/${cat}/${f}`, 'utf8')) as T;
  } catch {
    return fb;
  }
};
const BUILT = '2026-10-17T14:00:00.000Z';
const inputOf = (cat: Category): CategoryInput => ({
  latest: validateLatest(cat, read<Latest>(cat, 'latest.json', null as unknown as Latest), VALIDATION_MODE).latest,
  history: read<History>(cat, 'history.json', {}),
  imported: read<Imported>(cat, 'history_imported.json', {}),
});
const entryOf = (cat: Category, input: CategoryInput, key: string): ModelEntry => {
  for (const c of modelChunks(cat, input, BUILT)) for (const e of Object.values(c.models)) if (e.key === key) return e;
  throw new Error(`no model chunk entry for ${cat} ${key}`);
};
const lowOf = (imp: Imported[string] | null | undefined) => (imp && typeof imp === 'object' ? imp.low : undefined);

const day = (n: number) => new Date(Date.UTC(2025, 0, 1) + n * 864e5).toISOString().slice(0, 10);
const pts = (prices: number[], imported = true): HistoryPoint[] =>
  prices.map((min, i) => ({ d: day(i), min, source: 'skroutz', ...(imported ? { i: 1 as const } : {}) }));
const ddmmyyyy = (d: string) => d.split('-').reverse().join('/');

describe('sharedImportedLows (task 7b, part 1)', () => {
  it(`a low counts as shared from ${SHARED_LOW_MODELS} models; strings (old entries) and missing lows are skipped`, () => {
    const imp: Imported = {
      a: { d: 'x', low: 10 },
      b: { d: 'x', low: 10 },
      c: { d: 'x', low: 20 },
      d: { d: 'x', low: 20 },
      e: { d: 'x', low: 20 },
      f: '2026-01-01',
      g: { d: 'x' },
    };
    expect([...sharedImportedLows(imp)]).toEqual([20]);
  });

  it('withoutSharedLow drops only a shared low and keeps d and since', () => {
    const bad = new Set([20]);
    expect(withoutSharedLow({ d: 'x', low: 20, since: 's' }, bad)).toEqual({ d: 'x', low: undefined, since: 's' });
    expect(withoutSharedLow({ d: 'x', low: 21, since: 's' }, bad)).toEqual({ d: 'x', low: 21, since: 's' });
    expect(withoutSharedLow('2026-01-01', bad)).toBe('2026-01-01');
  });

  const GPU6 = ['RTX 3050 6GB', 'RTX 3050 8GB', 'Arc B570 10GB', 'GTX 1660 Ti 6GB', 'GTX 1660 Super 6GB', 'T400 4GB'];
  it('real data: the six graphics cards share 115.43 and lose it in the list file and the model chunks', () => {
    const input = inputOf('gpu');
    for (const k of GPU6) expect(lowOf(input.imported[k])).toBe(115.43);
    expect(sharedImportedLows(input.imported).has(115.43)).toBe(true);
    const list = listFile('gpu', input, BUILT);
    for (const k of GPU6) {
      expect(list.imported[k]).toBeDefined(); // the entry stays (its `since` dates the history)
      expect(lowOf(list.imported[k])).toBeUndefined();
      expect((list.imported[k] as { since?: string }).since).toBe((input.imported[k] as { since?: string }).since);
      const e = entryOf('gpu', input, k);
      expect(lowOf(e.imported)).toBeUndefined();
      // The product page's low is a day of the history now (with its date), not Skroutz's undated 115.43.
      const low = historyLow(e.history, e.imported ?? undefined);
      expect(low?.date).not.toBeNull();
      expect(low?.price).not.toBe(115.43); // T400's own 10/09/2025 point at 115.43 is a marked glitch (below)
    }
    // The category page reads the same: a price at our lowest point is the all-time low now (115.43 no longer under it).
    const page = decodeList(list);
    for (const k of GPU6) {
      const own = Math.min(...page.history[k].map((q) => q.min));
      expect(allTimeLow(page.history[k], input.imported[k], own)).toBeNull();
      expect(allTimeLow(page.history[k], page.imported[k], own)).not.toBeNull();
    }
  });

  // One model per category from the controller's findings (18/10).
  const ONE: [Category, string, number][] = [
    ['cpu', 'Core Ultra 9 285K', 369.59],
    ['mobo', 'asusrogstrixx870eegamingwifi', 369.59],
    ['ram', 'DDR5 32GB (2×16GB) 6400MHz Desktop', 47.55],
    ['storage', 'samsung870evo250gbssd', 24],
    ['psu', '500W Bronze ATX', 24],
    ['case', 'bequietpurebase600', 47.55],
    ['fan', 'noctuanfa205v200mm', 24],
    ['cooler', 'endorfynavisf240', 37.05],
  ];
  for (const [cat, key, value] of ONE) {
    it(`real data: ${cat} ${key} loses its shared ${value} low`, () => {
      const input = inputOf(cat);
      expect(lowOf(input.imported[key])).toBe(value);
      expect(lowOf(listFile(cat, input, BUILT).imported[key])).toBeUndefined();
      const e = entryOf(cat, input, key);
      expect(lowOf(e.imported)).toBeUndefined();
      const low = historyLow(e.history, e.imported ?? undefined);
      if (low) expect(low.date).not.toBeNull(); // a day of the history (ours or Skroutz's), not the undated shared low
    });
  }

  it('a low of only two models is kept', () => {
    const input = inputOf('gpu');
    const bad = sharedImportedLows(input.imported);
    const counts = new Map<number, number>();
    for (const v of Object.values(input.imported)) if (typeof v === 'object' && v.low != null) counts.set(v.low, (counts.get(v.low) ?? 0) + 1);
    const pair = [...counts].find(([, n]) => n === 2);
    if (pair) expect(bad.has(pair[0])).toBe(false);
    for (const [v, n] of counts) expect(bad.has(v)).toBe(n >= SHARED_LOW_MODELS);
  });
});

describe('importGlitches (task 7b, part 2: same value on the same day in 3+ models, short run, ≥ 5% under its neighbours)', () => {
  // `shared` as sharedImportedDays gives it: per date, the values that 3+ models of the category have as an imported point.
  const sharedAt = (p: HistoryPoint[], idx: number[]) => {
    const m = new Map<string, Set<number>>();
    for (const i of idx) m.set(p[i].d, new Set([...(m.get(p[i].d) ?? []), p[i].min]));
    return m;
  };

  it('sharedImportedDays: an imported value on one day in 3+ models; our own points do not count', () => {
    const at = (min: number, i = true): HistoryPoint[] => [{ d: day(5), min, source: 'skroutz', ...(i ? { i: 1 as const } : {}) }];
    const h: History = { a: at(97.99), b: at(97.99), c: at(97.99), d: at(50), e: at(50), f: at(50, false) };
    expect([...sharedImportedDays(h)].map(([d, v]) => [d, [...v]])).toEqual([[day(5), [97.99]]]);
  });

  it('a one-day drop (Ryzen 9 7950X shape, 10/09/2025)', () => {
    const p = pts([484.69, 369.59, 484.76]);
    expect([...importGlitches(p, sharedAt(p, [1]))]).toEqual([p[1]]);
  });

  it('a 2-day run (11 boards at 97.99 on 26-27/06/2026) and a 3-day run are glitches; a 4-day run is not', () => {
    const two = pts([130, 97.99, 97.99, 130]);
    expect(importGlitches(two, sharedAt(two, [1, 2])).size).toBe(2);
    const three = pts([130, 97.99, 97.99, 97.99, 130]);
    expect(importGlitches(three, sharedAt(three, [1, 2, 3])).size).toBe(3);
    // a run that qualifies is marked whole, even when only one of its days is shared (750W Gold SFX, 26-27/06/2026)
    const half = pts([130, 97.99, 97.99, 130]);
    expect([...importGlitches(half, sharedAt(half, [1]))]).toEqual([half[1], half[2]]);
    const four = pts([130, 97.99, 97.99, 97.99, 97.99, 130]);
    expect(importGlitches(four, sharedAt(four, [1, 2, 3, 4])).size).toBe(0);
  });

  it('the first point (EPYC 7443 starts at 369.59 on 10/09/2025) and the last point: only the one neighbour counts', () => {
    const first = pts([369.59, 744, 744]);
    expect([...importGlitches(first, sharedAt(first, [0]))]).toEqual([first[0]]);
    const last = pts([744, 744, 369.59]);
    expect([...importGlitches(last, sharedAt(last, [2]))]).toEqual([last[2]]);
    expect(importGlitches(pts([369.59]), new Map([[day(0), new Set([369.59])]])).size).toBe(0); // no neighbour: no evidence
  });

  it('a tiny drop is a real price (asrockb850mx 87.06 / 87 / 87.01), even when shared; so is anything under 5%', () => {
    const p = pts([87.06, 87, 87.01]);
    expect(importGlitches(p, sharedAt(p, [1])).size).toBe(0);
    const q = pts([100, 95.5, 100]); // 4.5% under
    expect(importGlitches(q, sharedAt(q, [1])).size).toBe(0);
    const r = pts([100, 95.2, 100]); // 5.04% higher around it
    expect(importGlitches(r, sharedAt(r, [1])).size).toBe(1);
  });

  it('a multi-week flat round price on many models (12.90 € for weeks) stays, though every day is shared', () => {
    const flat = pts([15.9, ...Array<number>(21).fill(12.9), 15.9]);
    expect(importGlitches(flat, sharedAt(flat, flat.map((_, i) => i))).size).toBe(0);
  });

  it('not a glitch: a day value fewer than 3 models share, our own point, a run with one of our own points in it', () => {
    const p = pts([484, 369.59, 484]);
    expect(importGlitches(p, new Map()).size).toBe(0);
    expect(importGlitches(pts([484, 369.59, 484], false), sharedAt(p, [1])).size).toBe(0);
    const mixed: HistoryPoint[] = [
      ...pts([130, 97.99]),
      { d: day(2), min: 97.99, source: 'bestprice' },
      { d: day(3), min: 130, source: 'skroutz', i: 1 },
    ];
    expect(importGlitches(mixed, sharedAt(mixed, [1, 2])).size).toBe(0);
  });

  it('works on unsorted points', () => {
    const p = pts([484.69, 369.59, 484.76]);
    expect([...importGlitches([...p].reverse(), sharedAt(p, [1]))].map((q) => q.d)).toEqual([day(1)]);
  });

  it('untrustedPoints = points marked g: 1 plus the C6 dips found without them', () => {
    const flat = (n: number, v: number) => Array<number>(n).fill(v);
    const p = pts([...flat(30, 100), 40, ...flat(30, 100)]);
    const marked = p.map((q, i) => (i === 10 ? { ...q, g: 1 as const } : q));
    const u = untrustedPoints(marked);
    expect(u.size).toBe(2);
    expect(u.has(marked[10])).toBe(true);
    expect(u.has(marked[30])).toBe(true); // the 40 dip
    expect(untrustedPoints(p).size).toBe(1);
  });

  it('real data: the boards whose low was 97.99 on 26/06/2026 have both days marked and a real low now', () => {
    const input = inputOf('mobo');
    const boards = Object.keys(input.history).filter((k) => {
      const before = historyLow(input.history[k], input.imported[k]);
      return before?.price === 97.99 && before.date === '2026-06-26';
    });
    expect(boards.length).toBeGreaterThanOrEqual(7);
    const page = decodeList(listFile('mobo', input, BUILT));
    for (const k of boards) {
      const e = entryOf('mobo', input, k);
      expect(e.history.filter((q) => q.g && q.min === 97.99).map((q) => q.d)).toEqual(['2026-06-26', '2026-06-27']);
      expect(historyLow(e.history, e.imported ?? undefined)!.price).toBeGreaterThan(97.99);
      expect(page.history[k].some((q) => q.min === 97.99)).toBe(false);
    }
  });

  it('real data: EPYC 7443 (first point 369.59 on 10/09/2025) and Core i7-12700T are marked; Core Ultra 9 285K has no such point', () => {
    const input = inputOf('cpu');
    const sorted = [...input.history['EPYC 7443']].sort((a, b) => (a.d < b.d ? -1 : 1));
    expect([sorted[0].d, sorted[0].min]).toEqual(['2025-09-10', 369.59]);
    for (const k of ['EPYC 7443', 'Core i7-12700T']) {
      const e = entryOf('cpu', input, k);
      expect(e.history.filter((q) => q.g).map((q) => [q.d, q.min])).toEqual([['2025-09-10', 369.59]]);
      expect(e.dips).toContain('2025-09-10');
      expect(historyLow(e.history, e.imported ?? undefined)!.price).not.toBe(369.59);
    }
    const e = entryOf('cpu', input, 'Core Ultra 9 285K');
    expect(e.history.some((q) => q.min === 369.59 || q.g)).toBe(false);
  });

  it('second signature: an imported short run at a shared imported low is a glitch even when no other model has that day', () => {
    const bad = new Set([115.43]);
    const p = pts([144.79, 115.43, 144.79]);
    expect([...importGlitches(p, new Map(), bad)]).toEqual([p[1]]);
    const edge = pts([115.43, 144.79]);
    expect([...importGlitches(edge, new Map(), bad)]).toEqual([edge[0]]);
    // the same run rules: not under 5%, not 4+ days, not our own point, not a flat round price
    expect(importGlitches(pts([118, 115.43, 118]), new Map(), bad).size).toBe(0);
    expect(importGlitches(pts([144.79, 115.43, 115.43, 115.43, 115.43, 144.79]), new Map(), bad).size).toBe(0);
    expect(importGlitches(pts([144.79, 115.43, 144.79], false), new Map(), bad).size).toBe(0);
    expect(importGlitches(pts([30, ...Array<number>(20).fill(24), 30]), new Map(), new Set([24])).size).toBe(0);
  });

  it("real data: T400 4GB's 115.43 on 10/09/2025 is marked, though it is the only graphics card with that imported day left", () => {
    const input = inputOf('gpu');
    const raw = input.history['T400 4GB'];
    expect(raw.find((q) => q.d === '2025-09-10')).toMatchObject({ min: 115.43, i: 1 });
    // the 365-point limit trimmed the other cards' 10/09/2025 points: the day signature alone can't see it
    const days = sharedImportedDays(input.history);
    expect(days.get('2025-09-10')?.has(115.43) ?? false).toBe(false);
    expect(importGlitches(raw, days).size).toBe(0);
    // the shared imported low (Part 1's set) does
    const bad = sharedImportedLows(input.imported);
    expect([...importGlitches(raw, days, bad)].map((q) => [q.d, q.min])).toEqual([['2025-09-10', 115.43]]);
    const e = entryOf('gpu', input, 'T400 4GB');
    expect(e.history.filter((q) => q.g).map((q) => q.d)).toEqual(['2025-09-10']);
    expect(e.dips).toContain('2025-09-10');
    const low = historyLow(e.history, e.imported ?? undefined)!;
    expect(low.price).toBeGreaterThan(115.43);
    expect(low.date).not.toBe('2025-09-10');
    expect(decodeList(listFile('gpu', input, BUILT)).history['T400 4GB'].some((q) => q.min === 115.43)).toBe(false);
  });
});

describe('historyLow source follows the winning point (owner, 18/10)', () => {
  const run = (n: number, v: number, imported: boolean, start = 0): HistoryPoint[] =>
    Array.from({ length: n }, (_, k) => ({ d: day(start + k), min: v, source: 'skroutz' as const, ...(imported ? { i: 1 as const } : {}) }));

  it('an imported Skroutz day as the low is Skroutz with its date; a scraped one is ours; a tie goes to ours', () => {
    const imp: HistoryPoint[] = [...run(40, 100, true), { d: day(40), min: 80, source: 'skroutz', i: 1 }, ...run(40, 100, false, 41)];
    expect(historyLow(imp, undefined)).toMatchObject({ price: 80, date: day(40), source: 'skroutz' });
    const own = imp.map((q): HistoryPoint => (q.min === 80 ? { d: q.d, min: 80, source: 'bestprice' } : q));
    expect(historyLow(own, undefined)).toMatchObject({ price: 80, date: day(40), source: 'own' });
    const tie: HistoryPoint[] = [...imp, { d: day(81), min: 80, source: 'bestprice' }];
    expect(historyLow(tie, undefined)).toMatchObject({ price: 80, date: day(81), source: 'own' });
  });

  it('real data: RTX 3050 6GB lowest is an imported day (159.83, 28/11/2025): "on Skroutz on <date>"', () => {
    const input = inputOf('gpu');
    const e = entryOf('gpu', input, 'RTX 3050 6GB');
    const low = historyLow(e.history, e.imported ?? undefined)!;
    const pt = e.history.find((q) => q.d === low.date)!;
    expect(pt.min).toBe(low.price);
    expect(pt.i).toBe(1);
    expect(low.source).toBe('skroutz');
    expect(lowSentence('en', low, false)).toBe(`Lowest price: €${low.price} on Skroutz on ${ddmmyyyy(low.date!)}`);
    expect(lowSentence('el', low, true)).toMatch(/στο Skroutz, στις \d\d\/\d\d\/\d{4} · πριν από αυτό το διάγραμμα$/);
  });
});
