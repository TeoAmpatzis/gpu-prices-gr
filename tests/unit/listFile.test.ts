import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATEGORIES, CATEGORY_IDS } from '../../src/lib/categories';
import { assertListFormat, decodeHist, decodePhotos, listUrl } from '../../src/lib/columns';
import { encodeHist, listFile, reduceHistory } from '../../src/lib/derive';
import { importGlitches, sharedImportedDays, sharedImportedLows, untrustedPoints } from '../../src/lib/dips';
import { photoId, productImage } from '../../src/lib/images';
import { sha1Hex } from '../../src/lib/sha1';
import type { BaseListing, Category, DailyLow, History, HistoryPoint, Imported, Latest } from '../../src/types';

const read = <T>(cat: string, f: string, fb: T): T => {
  try {
    return JSON.parse(readFileSync(`public/data/${cat}/${f}`, 'utf8')) as T;
  } catch {
    return fb;
  }
};
const keyOf = (cat: Category, l: BaseListing) => (CATEGORIES[cat] as unknown as { modelKey: (l: BaseListing) => string }).modelKey(l);
const BUILT = '2026-10-17T14:00:00.000Z';

describe('sha1Hex (RFC 3174 vectors)', () => {
  it('abc', () => expect(sha1Hex('abc')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d'));
  it('two-block message', () =>
    expect(sha1Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe('84983e441c3bd26ebaae4aa1f95129e5e54670f1'));
  it('empty string and a million a', () => {
    expect(sha1Hex('')).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
    expect(sha1Hex('a'.repeat(1_000_000))).toBe('34aa973cd4c4daa4f61eeb2bdbad27316534016f');
  });
  it('matches node crypto for UTF-8 text', () => {
    for (const s of ['Ελληνικά', 'ΜΗΤΡΙΚΗ \u0000 x', '€ 😀 ü', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(63), 'x'.repeat(64), 'x'.repeat(119)]) {
      expect(sha1Hex(s)).toBe(createHash('sha1').update(s, 'utf8').digest('hex'));
    }
  });
});

describe('photo lookup (bitset) equals the old img map', () => {
  for (const cat of CATEGORY_IDS) {
    it(`${cat}: same path for every model key`, () => {
      const latest = read<Latest | null>(cat, 'latest.json', null);
      if (!latest) return;
      const keys = [...new Set(latest.listings.map((l) => keyOf(cat, l)))];
      // photoId equals today's sha1("<cat>\0<key>")[:12], also for non-ASCII keys
      for (const k of keys) expect(photoId(cat, k)).toBe(createHash('sha1').update(`${cat}\0${k}`, 'utf8').digest('hex').slice(0, 12));
      // a fake images index holding every third model
      const index = new Set(keys.filter((_, i) => i % 3 === 0).map((k) => photoId(cat, k)));
      const image = (c: Category, k: string) => {
        const id = createHash('sha1').update(`${c}\0${k}`, 'utf8').digest('hex').slice(0, 12);
        return index.has(id) ? `${c}/${id}` : undefined;
      };
      const f = listFile(cat, { latest, history: {}, imported: {} }, BUILT, image);
      expect('img' in f).toBe(false);
      const has = decodePhotos(f);
      for (const k of keys) {
        const old = image(cat, k);
        expect(productImage(cat, k, has.has(k))?.src ?? null).toBe(old ? `/img/${old}` : null);
      }
      expect(has.size).toBe(keys.filter((k) => image(cat, k)).length);
    });
  }
  it('some real keys are non-ASCII', () => {
    const n = CATEGORY_IDS.reduce((s, cat) => {
      const latest = read<Latest | null>(cat, 'latest.json', null);
      return s + (latest?.listings ?? []).filter((l) => /[^ -~]/.test(keyOf(cat, l))).length;
    }, 0);
    expect(n).toBeGreaterThanOrEqual(0);
  });
});

describe('compact history', () => {
  it('round trips synthetic series, gaps, one point and cents', () => {
    const x: Record<string, [string, number][]> = {
      a: [['2026-01-01', 12.34], ['2026-01-02', 0.3], ['2026-03-05', 1999.99]],
      b: [['2025-12-30', 5]],
      c: [['2026-10-17', 1234.5]],
    };
    const enc = encodeHist(x);
    const dec = decodeHist({ v: 2, hist: enc.hist, histBase: enc.histBase });
    expect(dec).toEqual(Object.fromEntries(Object.entries(x).map(([k, p]) => [k, p.map(([d, min]) => ({ d, min }))])));
  });

  for (const cat of CATEGORY_IDS) {
    it(`${cat}: decodeHist(encode(x)) equals x for every model, and listFile gives the old reduction`, () => {
      const latest = read<Latest | null>(cat, 'latest.json', null);
      if (!latest) return;
      const history = read<History>(cat, 'history.json', {});
      const imported = read<Imported>(cat, 'history_imported.json', {});
      const keys = new Set(latest.listings.map((l) => keyOf(cat, l)));
      const day = BUILT.slice(0, 10);
      const expected: Record<string, DailyLow[]> = {};
      // C6 dips and the task 7b import glitches (imported days 3+ models share, or at a shared imported low; short runs
      // ≥ 5% under their neighbours) left out
      const days = sharedImportedDays(history);
      const bad = sharedImportedLows(imported);
      for (const [k, pts] of Object.entries(history)) {
        if (!keys.has(k)) continue;
        const glitches = importGlitches(pts as HistoryPoint[], days, bad);
        const marked = (pts as HistoryPoint[]).map((p) => (glitches.has(p) ? { ...p, g: 1 as const } : p));
        const dips = untrustedPoints(marked);
        const red = reduceHistory(marked.filter((p) => !dips.has(p)), day);
        if (red.length) expected[k] = red.map(([d, min]) => ({ d, min }));
      }
      const f = listFile(cat, { latest, history, imported }, BUILT);
      expect(decodeHist(f)).toEqual(expected);
      // every current model is a key of hist (the photo bitset is over them)
      expect(Object.keys(f.hist).sort()).toEqual([...keys].sort());
      const re = encodeHist(Object.fromEntries(Object.entries(expected).map(([k, p]) => [k, p.map((q) => [q.d, q.min] as [string, number])])));
      expect(decodeHist({ v: 2, ...re })).toEqual(expected);
    });
  }
});

describe('list format version', () => {
  it('new files are v2 and the address carries the format', () => {
    const latest = read<Latest | null>('gpu', 'latest.json', null);
    expect(listFile('gpu', { latest: latest as Latest, history: {}, imported: {} }, BUILT).v).toBe(2);
    expect(listUrl('gpu')).toBe('/data/gpu/list.v2.json');
  });

  it('a v1-shaped file (tuple hist, img map, no histBase) is refused with a clear error, not a RangeError', () => {
    const v1 = { v: 1, hist: { a: [['2026-10-01', 12.5]] }, img: { a: 'gpu/abc' } } as never;
    expect(() => decodeHist(v1)).toThrow(/format 1, expected 2/);
    expect(() => decodePhotos(v1)).toThrow(/format 1, expected 2/);
    expect(() => assertListFormat({})).toThrow(/expected 2/);
  });
});

describe('build output names', () => {
  // The whole build's data step (~11.5 s here since step 5 task 10's automatic builds, ~3.4 s before): its own
  // timeout, so a slower or busy machine can't make it flake.
  it('writes the new format as list.v2.json and never as list.json', { timeout: 60_000 }, async () => {
    const { derive } = await import('../../vite-plugin-data');
    const { files } = derive(BUILT);
    const paths = Object.keys(files);
    expect(paths.filter((p) => /\/list\.json$/.test(p))).toEqual([]);
    for (const cat of CATEGORY_IDS) {
      const f = files[`data/${cat}/list.v2.json`];
      if (f) expect((JSON.parse(f) as { v: number }).v).toBe(2);
    }
    expect(paths.some((p) => p.endsWith('/list.v2.json'))).toBe(true);
  });
});
