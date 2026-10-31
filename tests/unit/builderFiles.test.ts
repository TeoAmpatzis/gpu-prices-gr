// Task 6 (step 5): the builder's data in one file per step (/data/builder/<slot>.json), its links and search titles
// in /data/builder/<slot>-extra.json, and /data/builder/index.json for the first screen.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fromColumns } from '../../src/lib/columns';
import { builderFiles, checkData, manifest, mergeTwins } from '../../src/lib/derive';
import { SLOTS, candidates, fitContext, rowListing, slotModels, type Slot } from '../../src/lib/builder';
import { PART_FIELDS } from '../../src/lib/pick';
import { loadExtra, loadIndex, loadSlot, prefetchSlot } from '../../src/lib/builderFiles';
import { VALIDATION_MODE, validateLatest } from '../../src/data/validate';
import { CATEGORY_IDS } from '../../src/lib/categories';
import type { BaseListing, BuilderSlotFile, Category, Latest, Manifest } from '../../src/types';

const BUILT = '2026-10-31T00:00:00Z';
const validated: Partial<Record<Category, Latest>> = {};
for (const cat of CATEGORY_IDS) {
  const raw = JSON.parse(readFileSync(`public/data/${cat}/latest.json`, 'utf8')) as Latest;
  validated[cat] = validateLatest(cat, raw, VALIDATION_MODE).latest;
}
const built = builderFiles(validated, BUILT);
const offered = (slot: Slot) => candidates(slot, slotModels(slot, (validated[slot as Category]?.listings ?? []) as never[]), {});
// Task 7: a graphics card's twins on other sites are one row (derive.mergeTwins).
const full = (slot: Slot) => (slot === 'gpu' ? mergeTwins(offered(slot) as never) : offered(slot));

describe('builder files (one per step)', () => {
  for (const slot of SLOTS) {
    it(`${slot}: the slot file's rows regroup to the same models as the full data (links and titles from the extra file)`, () => {
      const file = built.slots[slot];
      const extra = built.extras[slot];
      expect(file.v).toBe(2);
      expect(file.builtAt).toBe(BUILT);
      const rows = fromColumns<BaseListing>(file);
      for (const r of rows) {
        // Links and search titles are only in the extra file (graphics cards keep their title: it is their name).
        expect(r.url ?? null).toBeNull();
        if (slot !== 'gpu') expect(r.title).toBe('');
        r.url = extra.urls[r.id];
        if (!r.title) r.title = extra.titles[r.id] ?? '';
      }
      const want = full(slot);
      const got = candidates(slot, slotModels(slot, rows as never[]), {});
      expect(got.map((m) => m.key)).toEqual(want.map((m) => m.key));
      want.forEach((m, i) => {
        const n = got[i];
        // The row is the cheapest listing incl. shipping where known (task 7, builderData.rowListing).
        const own = rowListing(m.listings as BaseListing[]);
        expect([m.key, m.chip, n.cheapest.id, n.cheapest.price, n.cheapest.url, n.cheapest.ship]).toEqual([m.key, n.chip, own.listing.id, own.listing.price, own.listing.url, own.ship]);
        expect(n.chip).toBe(m.chip);
        expect(n.cheapest.title).toBe(slot === 'gpu' ? m.cheapest.title : [...new Set(m.listings.map((l) => l.title))].join(' | '));
      });
      // Every engine field the data has is a column (pick.PART_FIELDS: one source of truth with pick mode).
      const listings = (validated[slot as Category]?.listings ?? []) as unknown as Record<string, unknown>[];
      for (const f of PART_FIELDS[slot]) {
        if (listings.some((l) => l[f] != null)) expect([slot, f, file.cols.includes(f)]).toEqual([slot, f, true]);
      }
      for (const f of ['pop', 'img', 'drop', 'price', 'chip', 'ship']) expect([slot, f, file.cols.includes(f)]).toEqual([slot, f, true]);
    });
  }

  it('index.json: build date, rows and bytes per slot, chip lengths, at most 8 KiB gzip', () => {
    const { index } = built;
    expect(index.v).toBe(2);
    expect(index.builtAt).toBe(BUILT);
    for (const slot of SLOTS) {
      expect(index.slots[slot].rows).toBe(built.slots[slot].rows.length);
      expect(index.slots[slot].bytes).toBe(Buffer.byteLength(JSON.stringify(built.slots[slot])));
    }
    const ctx = fitContext(offered('gpu') as never); // every offered card, twins included
    expect(Object.keys(index.chipLengths).sort()).toEqual([...ctx.chips.keys()].sort());
    for (const [chip, c] of ctx.chips) expect(index.chipLengths[chip]).toEqual(c);
    expect(Object.keys(index.chipLengths).length).toBeGreaterThan(0);
    expect(index.minimum).toEqual({});
    expect(gzipSync(JSON.stringify(index)).length).toBeLessThanOrEqual(8 * 1024);
  });

  it('manifest: models offered per slot, counted from the slot files', () => {
    const m = manifest(validated, built.slots, BUILT);
    // Graphics cards: every offered card, twins included (the rows are fewer: task 7 merges twins).
    for (const slot of SLOTS) expect([slot, m.builder[slot]]).toEqual([slot, (slot === 'gpu' ? offered : full)(slot).length]);
  });

  it('checkData: a slot with no rows fails; a slot file more than 30% below the live count fails', () => {
    const live: Manifest = manifest(validated, built.slots, BUILT);
    const clone = (): Manifest => JSON.parse(JSON.stringify(live)) as Manifest;
    const builderProblems = (n: Manifest) => checkData(n, live).filter((p) => p.startsWith('builder'));
    expect(builderProblems(clone())).toEqual([]);
    let n = clone();
    n.builder.case = 0;
    expect(builderProblems(n)).toEqual(['builder: nothing to offer for case']);
    n = clone();
    n.builder.case = Math.round(live.builder.case * 0.75);
    expect(builderProblems(n)).toEqual([]);
    n = clone();
    n.builder.case = Math.round(live.builder.case * 0.65);
    expect(builderProblems(n)).toEqual([expect.stringMatching(/^builder: case .* fewer/)]);
    // A slot the live manifest doesn't count yet: no comparison.
    const old = clone();
    delete (old.builder as Partial<Record<Slot, number>>).fan;
    expect(checkData(clone(), old).filter((p) => p.startsWith('builder'))).toEqual([]);
  });
});

describe('builder file loaders', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  const slotFile = (rows: unknown[][]): BuilderSlotFile => ({ v: 2, builtAt: 'b', cols: ['id', 'chip', 'brand', 'title', 'price', 'source', 'socket'], rows });
  const ok = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  const fail = () => Promise.resolve(new Response('', { status: 503 }));
  const psuRow = ['skroutz:1', '850W Gold', 'Corsair', 'Corsair RM850e 850W', 99, 'skroutz', null];

  it('loadIndex reads /data/builder/index.json', async () => {
    const fetch = vi.fn(() => ok({ v: 2, builtAt: 'x', slots: {}, chipLengths: {}, minimum: {} }));
    vi.stubGlobal('fetch', fetch);
    expect((await loadIndex()).builtAt).toBe('x');
    expect(fetch.mock.calls[0]).toEqual(['/data/builder/index.json']);
  });

  it('loadSlot: one retry inside; a failed load rejects once, is not kept, and the next call succeeds', async () => {
    const fetch = vi.fn().mockImplementationOnce(fail).mockImplementationOnce(fail).mockImplementation(() => ok(slotFile([psuRow])));
    vi.stubGlobal('fetch', fetch);
    await expect(loadSlot('psu', 'b1')).rejects.toThrow(/503/);
    expect(fetch).toHaveBeenCalledTimes(2); // the request and its one retry
    expect(fetch.mock.calls[0]).toEqual(['/data/builder/psu.json?v=b1']);
    const models = await loadSlot('psu', 'b1');
    expect(models.map((m) => m.cheapest.id)).toEqual(['skroutz:1']);
    expect(fetch).toHaveBeenCalledTimes(3);
    await loadSlot('psu', 'b1'); // memoised
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('loadSlot: a single failure is retried at once and resolves', async () => {
    const fetch = vi.fn().mockImplementationOnce(fail).mockImplementation(() => ok(slotFile([psuRow])));
    vi.stubGlobal('fetch', fetch);
    expect((await loadSlot('psu', 'b2')).length).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('loadExtra reads /data/builder/<slot>-extra.json of the same build', async () => {
    const fetch = vi.fn(() => ok({ v: 2, builtAt: 'b3', urls: { a: 'https://x' }, titles: {} }));
    vi.stubGlobal('fetch', fetch);
    expect((await loadExtra('case', 'b3')).urls.a).toBe('https://x');
    expect(fetch.mock.calls[0]).toEqual(['/data/builder/case-extra.json?v=b3']);
  });

  it('prefetchSlot waits for idle time and never throws on a failure', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(fail);
    vi.stubGlobal('fetch', fetch);
    prefetchSlot('fan', 'b4');
    expect(fetch).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    expect(fetch.mock.calls[0]).toEqual(['/data/builder/fan.json?v=b4']);
  });
});
