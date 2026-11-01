import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SLOTS, slotModels } from '../../src/lib/builderData';
import { CHUNKS, chunkOf, loadCompat } from '../../src/lib/compatChunks';
import { compatFiles } from '../../src/lib/compatBuild';
import { toPart, usable } from '../../src/lib/pick';
import { VALIDATION_MODE, validateLatest } from '../../src/data/validate';
import { CATEGORY_IDS } from '../../src/lib/categories';
import type { Category, Latest } from '../../src/types';

const validated: Partial<Record<Category, Latest>> = {};
for (const cat of CATEGORY_IDS) {
  const raw = JSON.parse(readFileSync(`public/data/${cat}/latest.json`, 'utf8')) as Latest;
  validated[cat] = validateLatest(cat, raw, VALIDATION_MODE).latest;
}
const files = compatFiles(validated, '2026-10-12T00:00:00Z');
const name = (slot: string, n: number) => `data/compat/${slot}-${String(n).padStart(2, '0')}.json`;

describe('chunkOf', () => {
  it('is stable (golden FNV-1a values)', () => {
    expect(CHUNKS).toBe(64);
    expect(chunkOf('')).toBe(2166136261 % 64);
    expect(chunkOf('a')).toBe(0xe40c292c % 64);
    expect(chunkOf('foobar')).toBe(0xbf9cf968 % 64);
    expect(chunkOf('skroutz:123456')).toBe(GOLDEN['skroutz:123456']);
    expect(chunkOf('Ryzen 7 9800X3D|false')).toBe(GOLDEN['Ryzen 7 9800X3D|false']);
    expect(chunkOf('Ελληνικά')).toBe(GOLDEN['Ελληνικά']);
  });
});
const GOLDEN: Record<string, number> = { 'skroutz:123456': 34, 'Ryzen 7 9800X3D|false': 39, 'Ελληνικά': 17 };

describe('compat files', () => {
  it('writes 64 files per slot', () => {
    expect(Object.keys(files).length).toBe(SLOTS.length * CHUNKS);
    for (const s of SLOTS) for (let n = 0; n < CHUNKS; n++) expect(files[name(s, n)]).toBeTruthy();
  });

  for (const slot of SLOTS) {
    it(`${slot}: every usable key is in exactly its chunk, with toPart's fields`, () => {
      const models = slotModels(slot, (validated[slot as Category]?.listings ?? []) as never[]).filter((m) => usable(slot, m as never));
      expect(models.length).toBeGreaterThan(0);
      const seen = new Map<string, number>();
      for (let n = 0; n < CHUNKS; n++) {
        const f = files[name(slot, n)];
        expect(f.v).toBe(1);
        expect(f.builtAt).toBe('2026-10-12T00:00:00Z');
        for (const k of Object.keys(f.rows)) {
          seen.set(k, (seen.get(k) ?? 0) + 1);
          expect(chunkOf(k)).toBe(n);
        }
      }
      expect(seen.size).toBe(models.length);
      expect([...seen.values()].every((c) => c === 1)).toBe(true);
      for (const m of models) expect(files[name(slot, chunkOf(m.key))].rows[m.key]).toBeDefined();
      const step = Math.max(1, Math.floor(models.length / 20));
      for (const m of models.filter((_, i) => i % step === 0).slice(0, 20)) {
        expect(files[name(slot, chunkOf(m.key))].rows[m.key]).toEqual(toPart(slot, m as never).fields);
      }
    });
  }
});

describe('loadCompat', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('requests only the chunks of the given keys, once, with ?v=', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      calls.push(url);
      const n = Number(/gpu-(\d+)\.json/.exec(url)![1]);
      return { ok: true, json: async () => ({ v: 1, builtAt: 'B1', rows: Object.fromEntries(KEYS.filter((k) => chunkOf(k) === n).map((k) => [k, { x: k }])) }) };
    });
    const KEYS = ['a1', 'b2', 'c3', 'd4'];
    const out = await loadCompat('gpu', [...KEYS, 'gone'], 'B1');
    expect(Object.keys(out).sort()).toEqual(KEYS);
    expect(out.a1).toEqual({ fields: { x: 'a1' } });
    const wanted = new Set([...KEYS, 'gone'].map(chunkOf));
    expect(calls.length).toBe(wanted.size);
    expect(calls.every((u) => u.endsWith('?v=B1'))).toBe(true);
    await loadCompat('gpu', KEYS, 'B1');
    expect(calls.length).toBe(wanted.size);
  });
});