// Step 4 task 3: facet counts in a worker after the first paint. The worker's pure handler (facets.ts
// createFacetHandler: list file → decodeList → facetCounts with the category's pure rules) gives the same counts
// as the page's facetCounts with the full category config, for 20 random filter states per category on the real
// data; facetCounts (memoised all-time lows, one pass per option group) equals the pre-worker implementation,
// kept verbatim below as the reference; and the client (facetsClient.ts) drops superseded requests and falls back
// to the main thread in idle slices when there is no worker, it fails or doesn't answer.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATEGORIES, CATEGORY_IDS, segmentOptions, type CategoryConfig } from '../../src/lib/categories';
import { decodeList, defaultFilters, type CategoryData, type Filters, type Segment } from '../../src/lib/data';
import { listFile } from '../../src/lib/derive';
import { createFacetHandler, facetCounts, type FacetAnswer, type FacetCounts, type FacetRequest } from '../../src/lib/facets';
import { createFacetsClient, type FacetWorkerLike } from '../../src/lib/facetsClient';
import type { Schedule } from '../../src/lib/pickBuild';
import { filterCatalogue } from '../../src/lib/catalogueFilters';
import { encodeOfferChoice } from '../../src/lib/productSelection';
import { SOURCE_NAMES } from '../../src/lib/sources';
import type { BaseListing, Category, DailyLow, History, Imported, Latest, ListFile, SourceName } from '../../src/types';

const read = <T>(cat: string, f: string, fb: T): T => {
  try {
    return JSON.parse(readFileSync(`public/data/${cat}/${f}`, 'utf8')) as T;
  } catch {
    return fb;
  }
};
/** Built today, as the site's files are (allTimeLow compares with today's date). */
const BUILT = new Date().toISOString();
const files = new Map<Category, ListFile | null>();
/** The category's list file as the build writes it, through JSON (what the browser and the worker read). */
function fileOf(cat: Category): ListFile | null {
  if (!files.has(cat)) {
    const latest = read<Latest | null>(cat, 'latest.json', null);
    files.set(
      cat,
      latest &&
        (JSON.parse(
          JSON.stringify(
            listFile(
              cat,
              {
                latest,
                history: read<History>(cat, 'history.json', {}),
                imported: read<Imported>(cat, 'history_imported.json', {}),
              },
              BUILT,
            ),
          ),
        ) as ListFile),
    );
  }
  return files.get(cat)!;
}
const cfgOf = (cat: Category) => CATEGORIES[cat] as unknown as CategoryConfig<BaseListing>;
const optionsOf = (cfg: CategoryConfig<BaseListing>, ls: BaseListing[]) => Object.fromEntries(cfg.extraFilters.map((x) => [x.key, x.options(ls)]));

/** Listing-count reference: straightforward per-option counts also verify worker/client parity. */
function referenceCounts<L extends BaseListing>(
  all: L[],
  f: Filters,
  cfg: CategoryConfig<L>,
  history: Record<string, DailyLow[]>,
  imported: Imported,
  options: Record<string, { value: string }[]>,
): FacetCounts {
  const d = defaultFilters(cfg.groups);
  const run = (without: Partial<Filters>) => filterCatalogue(all, { ...f, ...without }, cfg, history, imported);
  const count = (products: ReturnType<typeof run>, test: (l: L) => boolean) => products.filter((p) => test(p.listing)).length;
  const groupProducts = run({ groups: d.groups });
  const groups = Object.fromEntries(cfg.groups.map((g) => [g, count(groupProducts, (l) => cfg.group(l) === g)]));
  const sourceProducts = run({ sources: d.sources });
  const sources = Object.fromEntries(SOURCE_NAMES.map((source) => [source, count(sourceProducts, (l) => l.source === source)])) as Record<SourceName, number>;
  const segmentProducts = run({ segment: 'all' });
  const segment: Record<Segment, number> = {
    main: 0,
    pro: 0,
    all: segmentProducts.length,
  };
  for (const s of cfg.segments?.middle ?? []) segment[s.value] = 0;
  for (const p of segmentProducts) segment[p.family.segment] = (segment[p.family.segment] ?? 0) + 1;
  const sale = run({ saleOnly: true }).length;
  const low = run({ lowOnly: true }).length;
  const extra: FacetCounts['extra'] = {};
  for (const x of cfg.extraFilters) {
    const products = run({ extra: { ...f.extra, [x.key]: '' } });
    extra[x.key] = Object.fromEntries((options[x.key] ?? []).map((o) => [o.value, count(products, (l) => x.test(l, o.value))]));
  }
  return { groups, sources, segment, sale, low, extra };
}

/** Seeded PRNG (mulberry32): the same 20 states every run. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random filter state: some groups and sources, a segment, a search word, a price cap, spec filters, sale/low. */
function randomFilters(r: () => number, cfg: CategoryConfig<BaseListing>, all: BaseListing[], options: Record<string, { value: string }[]>): Filters {
  const f = defaultFilters(cfg.groups);
  const some = <T>(xs: T[]) => (r() < 0.5 ? xs : xs.filter(() => r() < 0.6));
  const pickOne = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  f.groups = some(cfg.groups);
  f.sources = some([...SOURCE_NAMES]);
  if (cfg.segments) f.segment = pickOne(segmentOptions(cfg).map((s) => s.value));
  if (r() < 0.3) {
    // a word of a listing's name, so searches find something
    const words = pickOne(all)
      .chip.split(/\s+/)
      .filter((w) => w.length > 1);
    if (words.length) f.query = pickOne(words).toLowerCase();
  }
  if (r() < 0.3) f.maxPrice = Math.round(pickOne(all).price * (0.5 + r()));
  for (const x of cfg.extraFilters) if (r() < 0.25 && options[x.key]?.length) f.extra[x.key] = pickOne(options[x.key]).value;
  f.saleOnly = r() < 0.15;
  f.lowOnly = r() < 0.15;
  return f;
}

const STATES = 20;

describe('worker handler = facetCounts = the pre-worker counts (20 random filter states, real data)', () => {
  for (const cat of CATEGORY_IDS) {
    it(
      cat,
      async () => {
        const file = fileOf(cat);
        if (!file) return;
        const data = decodeList(file);
        const cfg = cfgOf(cat);
        const all = data.latest.listings;
        const options = optionsOf(cfg, all);
        let loads = 0;
        const handle = createFacetHandler(async (c) => {
          expect(c).toBe(cat);
          loads++;
          return structuredClone(file);
        });
        const r = rng(cat.length * 7919 + 17);
        for (let i = 0; i < STATES; i++) {
          const f = randomFilters(r, cfg, all, options);
          const ref = referenceCounts(all, f, cfg, data.history, data.imported, options);
          expect(facetCounts(all, f, cfg, data.history, data.imported, options)).toEqual(ref);
          const req: FacetRequest = structuredClone({
            id: i + 1,
            cat,
            version: file.builtAt,
            filters: f,
            hidden: null,
          });
          const a = structuredClone(await handle(req));
          expect(a).toEqual({ id: i + 1, ok: true, counts: ref });
        }
        // Pick mode: the page counts without the hidden listings; the worker gets their ids.
        const hidden = all.filter((_, i) => i % 7 === 0).map(encodeOfferChoice);
        const shown = all.filter((_, i) => i % 7 !== 0);
        const f = randomFilters(r, cfg, all, options);
        const a = await handle({
          id: 99,
          cat,
          version: file.builtAt,
          filters: f,
          hidden,
        });
        expect(a).toEqual({
          id: 99,
          ok: true,
          counts: referenceCounts(shown, f, cfg, data.history, data.imported, options),
        });
        expect(loads).toBe(1); // the list file is read once
      },
      120_000,
    );
  }

  it('a list file of another build than the page is an error answer (the page falls back), not wrong counts', async () => {
    const file = fileOf('gpu')!;
    const handle = createFacetHandler(async () => structuredClone(file));
    const a = await handle({
      id: 1,
      cat: 'gpu',
      version: 'another build',
      filters: defaultFilters(CATEGORIES.gpu.groups),
      hidden: null,
    });
    expect(a).toMatchObject({ id: 1, ok: false, mismatch: true });
  });

  it('after a build mismatch the list file is fetched again (not kept for the session)', async () => {
    const file = fileOf('gpu')!;
    // The HTTP cache first hands the worker an older build, then the page's.
    const old = { ...structuredClone(file), builtAt: 'older build' };
    let loads = 0;
    const handle = createFacetHandler(async () => (loads++ === 0 ? structuredClone(old) : structuredClone(file)));
    const f = defaultFilters(CATEGORIES.gpu.groups);
    expect(
      await handle({
        id: 1,
        cat: 'gpu',
        version: file.builtAt,
        filters: f,
        hidden: null,
      }),
    ).toMatchObject({ ok: false, mismatch: true });
    expect(loads).toBe(1);
    const a = await handle({
      id: 2,
      cat: 'gpu',
      version: file.builtAt,
      filters: f,
      hidden: null,
    });
    expect(loads).toBe(2);
    expect(a.ok).toBe(true);
    // A matching file stays cached.
    await handle({
      id: 3,
      cat: 'gpu',
      version: file.builtAt,
      filters: f,
      hidden: null,
    });
    expect(loads).toBe(2);
  });

  it('a list file that fails to load is an error answer, and the next request loads it again', async () => {
    const file = fileOf('gpu')!;
    let n = 0;
    const handle = createFacetHandler(async () => {
      if (n++ === 0) throw new Error('HTTP 503');
      return structuredClone(file);
    });
    const f = defaultFilters(CATEGORIES.gpu.groups);
    expect(
      (
        await handle({
          id: 1,
          cat: 'gpu',
          version: file.builtAt,
          filters: f,
          hidden: null,
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await handle({
          id: 2,
          cat: 'gpu',
          version: file.builtAt,
          filters: f,
          hidden: null,
        })
      ).ok,
    ).toBe(true);
  });
});

// ---- the client: worker, supersession, fallback ----------------------------------------------------------------

const now: Schedule = (fn) => {
  fn();
  return () => {};
};
const gpuData = (): CategoryData => decodeList(fileOf('gpu')!);
const gpuFilters = () => defaultFilters(CATEGORIES.gpu.groups);
const gpuCounts = (f: Filters, hidden: string[] | null = null) => {
  const d = gpuData();
  const cfg = cfgOf('gpu');
  const all = hidden ? d.latest.listings.filter((l) => !hidden.includes(encodeOfferChoice(l))) : d.latest.listings;
  return referenceCounts(all, f, cfg, d.history, d.imported, optionsOf(cfg, d.latest.listings));
};

/** A worker that answers like facets.worker.ts (structured clone both ways), when `release` is called or at once. */
function fakeWorker(reply: (r: FacetRequest) => Promise<FacetAnswer | 'crash' | 'silent'>, manual = false) {
  const queue: (() => void)[] = [];
  const w: FacetWorkerLike & {
    posted: FacetRequest[];
    terminated: boolean;
    release: () => Promise<void>;
  } = {
    posted: [],
    terminated: false,
    onmessage: null,
    onerror: null,
    onmessageerror: null,
    postMessage(m) {
      const msg = structuredClone(m);
      w.posted.push(msg);
      const go = () =>
        void reply(msg).then((a) => {
          if (a === 'crash') w.onerror?.(new Error('worker crashed'));
          else if (a !== 'silent') w.onmessage?.({ data: structuredClone(a) });
        });
      if (manual) queue.push(go);
      else queueMicrotask(go);
    },
    terminate() {
      w.terminated = true;
    },
    async release() {
      for (const go of queue.splice(0)) go();
      await new Promise((r) => setTimeout(r, 0));
    },
  };
  return w;
}
const handler = () => createFacetHandler(async () => structuredClone(fileOf('gpu')!));
const loadMain = async () => gpuData();

describe('facetsClient', () => {
  it('answers from the worker; the list file version and pick mode hidden ids reach it', async () => {
    const h = handler();
    const w = fakeWorker(h);
    const client = createFacetsClient({
      makeWorker: () => w,
      loadMain,
      schedule: now,
    });
    const f = gpuFilters();
    const v = fileOf('gpu')!.builtAt;
    expect(await client.request('gpu', f, v)).toEqual(gpuCounts(f));
    const hidden = gpuData().latest.listings.slice(0, 50).map(encodeOfferChoice);
    expect(await client.request('gpu', f, v, hidden)).toEqual(gpuCounts(f, hidden));
    expect(w.posted.map((p) => [p.version, p.hidden?.length ?? null])).toEqual([
      [v, null],
      [v, 50],
    ]);
  });

  it('a superseded request returns null; only the newest answer is used', async () => {
    const h = handler();
    const w = fakeWorker(h, true);
    const client = createFacetsClient({
      makeWorker: () => w,
      loadMain,
      schedule: now,
    });
    const v = fileOf('gpu')!.builtAt;
    const f1 = gpuFilters();
    const f2 = { ...gpuFilters(), saleOnly: true };
    const first = client.request('gpu', f1, v);
    const second = client.request('gpu', f2, v);
    expect(await first).toBeNull(); // superseded at once, before the worker answers
    await w.release();
    expect(await second).toEqual(gpuCounts(f2));
  });

  it('requests of two categories do not supersede each other', async () => {
    const file = fileOf('gpu')!;
    const cpuFile = fileOf('cpu')!;
    const h = createFacetHandler(async (c) => structuredClone(c === 'gpu' ? file : cpuFile));
    const w = fakeWorker(h);
    const client = createFacetsClient({
      makeWorker: () => w,
      loadMain,
      schedule: now,
    });
    const [a, b] = await Promise.all([
      client.request('gpu', gpuFilters(), file.builtAt),
      client.request('cpu', defaultFilters(CATEGORIES.cpu.groups), cpuFile.builtAt),
    ]);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
  });

  it('no Worker: the main thread counts in idle slices, same counts', async () => {
    const slices: number[] = [];
    let n = 0;
    const counting: Schedule = (fn) => {
      slices.push(++n);
      return now(fn);
    };
    const client = createFacetsClient({
      makeWorker: null,
      loadMain,
      schedule: counting,
    });
    const f = gpuFilters();
    expect(await client.request('gpu', f, fileOf('gpu')!.builtAt)).toEqual(gpuCounts(f));
    expect(slices.length).toBeGreaterThan(1); // one pass per option group, each in its own task
  });

  it('the main-thread fallback counts pick mode without the hidden listings', async () => {
    const client = createFacetsClient({
      makeWorker: null,
      loadMain,
      schedule: now,
    });
    const f = gpuFilters();
    const hidden = gpuData()
      .latest.listings.filter((_, i) => i % 3 === 0)
      .map(encodeOfferChoice);
    expect(await client.request('gpu', f, fileOf('gpu')!.builtAt, hidden)).toEqual(gpuCounts(f, hidden));
  });

  it('a crashed worker: the main thread counts, and later requests skip the worker', async () => {
    const w = fakeWorker(async () => 'crash');
    let made = 0;
    const client = createFacetsClient({
      makeWorker: () => (made++, w),
      loadMain,
      schedule: now,
    });
    const f = gpuFilters();
    const v = fileOf('gpu')!.builtAt;
    expect(await client.request('gpu', f, v)).toEqual(gpuCounts(f));
    expect(w.terminated).toBe(true);
    expect(await client.request('gpu', f, v)).toEqual(gpuCounts(f));
    expect(made).toBe(1);
  });

  it('an error answer (e.g. another build) falls back for that request', async () => {
    const w = fakeWorker(async (r) => ({
      id: r.id,
      ok: false,
      error: 'version',
    }));
    const client = createFacetsClient({
      makeWorker: () => w,
      loadMain,
      schedule: now,
    });
    const f = gpuFilters();
    expect(await client.request('gpu', f, fileOf('gpu')!.builtAt)).toEqual(gpuCounts(f));
  });

  it('a build mismatch: the worker re-fetches once; still another build → that category counts on the main thread', async () => {
    const file = fileOf('gpu')!;
    const cpuFile = fileOf('cpu')!;
    let gpuLoads = 0;
    // The worker can only get another build of the GPU list (e.g. a deploy in between); the CPU list is fine.
    const h = createFacetHandler(async (c) => (c === 'gpu' ? (gpuLoads++, { ...structuredClone(file), builtAt: 'newer build' }) : structuredClone(cpuFile)));
    const w = fakeWorker(h);
    const client = createFacetsClient({
      makeWorker: () => w,
      loadMain,
      schedule: now,
    });
    const f = gpuFilters();
    const gpuPosts = () => w.posted.filter((p) => p.cat === 'gpu').length;
    expect(await client.request('gpu', f, file.builtAt)).toEqual(gpuCounts(f)); // fallback
    expect([gpuPosts(), gpuLoads]).toEqual([1, 1]);
    expect(await client.request('gpu', f, file.builtAt)).toEqual(gpuCounts(f)); // the worker fetched again: still another build
    expect([gpuPosts(), gpuLoads]).toEqual([2, 2]);
    expect(await client.request('gpu', f, file.builtAt)).toEqual(gpuCounts(f)); // straight to the main thread
    expect([gpuPosts(), gpuLoads]).toEqual([2, 2]);
    expect(w.terminated).toBe(false);
    // Other categories still use the worker.
    expect(await client.request('cpu', defaultFilters(CATEGORIES.cpu.groups), cpuFile.builtAt)).not.toBeNull();
    expect(w.posted.filter((p) => p.cat === 'cpu')).toHaveLength(1);
  });

  it('no answer in time: the worker is given up and the main thread counts', async () => {
    const w = fakeWorker(async () => 'silent');
    const client = createFacetsClient({
      makeWorker: () => w,
      loadMain,
      schedule: now,
      timeout: 30,
    });
    const f = gpuFilters();
    expect(await client.request('gpu', f, fileOf('gpu')!.builtAt)).toEqual(gpuCounts(f));
    expect(w.terminated).toBe(true);
  });

  it('a worker that cannot start: the main thread counts', async () => {
    const client = createFacetsClient({
      makeWorker: () => {
        throw new Error('blocked');
      },
      loadMain,
      schedule: now,
    });
    const f = gpuFilters();
    expect(await client.request('gpu', f, fileOf('gpu')!.builtAt)).toEqual(gpuCounts(f));
  });

  it('a request superseded while the fallback runs returns null', async () => {
    const pending: (() => void)[] = [];
    const later: Schedule = (fn) => {
      pending.push(fn);
      return () => {};
    };
    const client = createFacetsClient({
      makeWorker: null,
      loadMain,
      schedule: later,
    });
    const v = fileOf('gpu')!.builtAt;
    const first = client.request('gpu', gpuFilters(), v);
    await new Promise((r) => setTimeout(r, 0));
    const f2 = { ...gpuFilters(), lowOnly: true };
    const second = client.request('gpu', f2, v);
    expect(await first).toBeNull();
    for (let i = 0; i < 1000 && pending.length; i++) {
      pending.shift()!();
      await new Promise((r) => setTimeout(r, 0));
    }
    expect(await second).toEqual(gpuCounts(f2));
  });
});
