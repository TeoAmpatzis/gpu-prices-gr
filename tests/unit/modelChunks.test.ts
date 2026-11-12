// Model chunk files (step 4, task 4): data/<cat>/model/<nnn>.json, 256 per category, keyed by the lookup form of the
// model's slug (task 13: slug.slugLookup).
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VALIDATION_MODE, validateLatest } from '../../src/data/validate';
import { CATEGORIES, CATEGORY_IDS, type CategoryConfig } from '../../src/lib/categories';
import { chunkOf } from '../../src/lib/compatChunks';
import { slotModels } from '../../src/lib/builderData';
import { allTimeLow, decodeList, groupModels, saleOf } from '../../src/lib/data';
import { checkData, listFile, manifest, modelChunks, sameKind, searchFile, type CategoryInput } from '../../src/lib/derive';
import { importGlitches, sharedImportedDays, sharedImportedLows, untrustedPoints } from '../../src/lib/dips';
import { photoId } from '../../src/lib/images';
import { MODEL_CHUNKS, loadModel, modelChunkOf, modelChunkPath } from '../../src/lib/modelData';
import { SLOT_OF, slotOf, toPart } from '../../src/lib/pick';
import { recommendedScores } from '../../src/lib/ranking';
import { modelSlug, nameSlug, slugLookup } from '../../src/lib/slug';
import { psuProductKey } from '../../src/lib/psuProduct';
import type {
  BaseListing,
  Category,
  CoolerListing,
  CpuListing,
  FanListing,
  History,
  Imported,
  Latest,
  Manifest,
  MoboListing,
  ModelChunk,
} from '../../src/types';

const read = <T>(cat: string, f: string, fb: T): T => {
  try {
    return JSON.parse(readFileSync(`public/data/${cat}/${f}`, 'utf8')) as T;
  } catch {
    return fb;
  }
};
const cfgOf = (cat: Category) => CATEGORIES[cat] as unknown as CategoryConfig<BaseListing>;
const BUILT = '2026-10-17T14:00:00.000Z';
const KIB = 1024;
/** Brief: the largest chunk of a category stays at or under 40 KiB gzip. */
const MAX_GZIP = 40 * KIB;

const inputs: Partial<Record<Category, CategoryInput>> = {};
for (const cat of CATEGORY_IDS) {
  const raw = read<Latest | null>(cat, 'latest.json', null);
  if (!raw) continue;
  inputs[cat] = {
    latest: validateLatest(cat, raw, VALIDATION_MODE).latest,
    history: read<History>(cat, 'history.json', {}),
    imported: read<Imported>(cat, 'history_imported.json', {}),
  };
}
// Every third model "has a photo" (any lookup will do: the chunks only record whether one exists).
const image = (c: Category, k: string) => (parseInt(photoId(c, k).slice(0, 2), 16) % 3 === 0 ? `${c}/${photoId(c, k)}` : undefined);
const chunks: Partial<Record<Category, ModelChunk[]>> = {};
for (const cat of CATEGORY_IDS) if (inputs[cat]) chunks[cat] = modelChunks(cat, inputs[cat], BUILT, image);

describe('modelChunkOf', () => {
  it('is FNV-1a of the slug mod 256 (the compat chunk hash, 256 buckets)', () => {
    expect(MODEL_CHUNKS).toBe(256);
    expect(modelChunkOf('')).toBe(2166136261 % 256);
    expect(modelChunkOf('a')).toBe(0xe40c292c % 256);
    expect(modelChunkOf('foobar')).toBe(0xbf9cf968 % 256);
  });
  it('spans 0–255 and agrees with the compat chunks mod 64 (same hash)', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      const s = `model-${i}`;
      const n = modelChunkOf(s);
      expect(Number.isInteger(n) && n >= 0 && n < 256).toBe(true);
      expect(n % 64).toBe(chunkOf(s));
      seen.add(n);
    }
    expect(seen.size).toBe(256);
  });
  it('file names are data/<cat>/model/000.json … 255.json', () => {
    expect(modelChunkPath('gpu', 0)).toBe('data/gpu/model/000.json');
    expect(modelChunkPath('case', 255)).toBe('data/case/model/255.json');
  });
});

/** Categories without a "cheaper" list (their variants cover the other sizes; a chip's cheaper cards are its offers; monitors and mice have no "same kind" rule yet). */
const NO_CHEAPER: Category[] = ['gpu', 'ram', 'storage', 'psu', 'monitor', 'mouse'];
/** Most common non-null value (first seen wins a tie, as data.mostCommon). */
function mode<T>(vs: (T | null | undefined)[]): T | null {
  const n = new Map<T, number>();
  for (const v of vs) if (v != null) n.set(v, (n.get(v) ?? 0) + 1);
  let best: T | null = null;
  let c = 0;
  for (const [v, k] of n) if (k > c) [best, c] = [v, k];
  return best;
}
/**
 * The owner's "same kind" (Task 4 fix round 1), written out independently of derive.sameKind: CPU same socket and
 * not server/HEDT (pro), board same socket and board size, case same size group (pill group; the size most listings
 * state; none states one = "Other" = no list), cooler same type (AIO: same radiator), fan same size.
 */
const SAME_KIND_TEST: Partial<Record<Category, (m: { cheapest: BaseListing; listings: BaseListing[]; pro: boolean; group: string }) => string | null>> = {
  cpu: (m) => (m.pro ? null : mode((m.listings as CpuListing[]).map((l) => l.socket))),
  mobo: (m) => {
    const ls = m.listings as MoboListing[];
    const socket = mode(ls.map((l) => l.socket));
    const form = mode(ls.map((l) => l.formFactor));
    return socket && form ? `${socket} ${form}` : null;
  },
  case: (m) => mode(m.listings.map((l) => (l as BaseListing & { size: string }).size).filter((s) => s !== 'Άλλο')),
  cooler: (m) => {
    const c = m.cheapest as CoolerListing;
    return c.type === 'Air' ? 'Air' : c.radiator ? `AIO ${c.radiator}` : null;
  },
  fan: (m) => String((m.cheapest as FanListing).size),
};

describe('model chunks over today\'s data', () => {
  const sizes: string[] = [];
  afterEach(() => vi.unstubAllGlobals());

  for (const cat of CATEGORY_IDS) {
    const input = inputs[cat];
    if (!input) continue;
    const cs = chunks[cat]!;
    const models = groupModels(input.latest.listings, cfgOf(cat));
    const byKey = new Map(models.map((m) => [m.key, m]));
    const entries = cs.flatMap((c) => Object.values(c.models));
    const bad = sharedImportedLows(input.imported);
    const days = sharedImportedDays(input.history);

    it(`${cat}: 256 chunks, each model in the chunk of its slug, every current model exactly once`, () => {
      expect(cs.length).toBe(256);
      cs.forEach((c, n) => {
        expect(c.v).toBe(1);
        expect(c.builtAt).toBe(BUILT);
        expect(c.sources).toEqual(input.latest.sources);
        // Filed under the lookup form of its canonical slug (task 13).
        for (const [k, e] of Object.entries(c.models)) {
          expect(slugLookup(cat, e.slug)).toBe(k);
          expect(modelChunkOf(k)).toBe(n);
        }
      });
      expect(entries.length).toBe(models.length);
      expect(new Set(entries.map((e) => e.key)).size).toBe(models.length);
      for (const m of models) {
        const k = slugLookup(cat, modelSlug(cat, m));
        const e = cs[modelChunkOf(k)].models[k];
        expect(e?.key).toBe(m.key);
        expect(e.chip).toBe(m.chip);
        expect(e.slug).toBe(modelSlug(cat, m));
      }
    });

    // Task 13 (final review I1): a source filter shows a model through some of its listings, so the category page's row
    // link and chart lookup use that listing's spelling; every spelling, in any letter case, reaches the model's entry,
    // whose slug is the canonical one.
    it(`${cat}: every listing's spelling (and its upper case) finds the model's entry`, () => {
      let misses = 0;
      for (const m of models) {
        let miss = false;
        for (const l of m.listings) {
          const one = groupModels([l], cfgOf(cat), input.latest.listings)[0];
          for (const s of [modelSlug(cat, one), modelSlug(cat, one).toUpperCase()]) {
            const k = slugLookup(cat, s);
            const e = cs[modelChunkOf(k)].models[k];
            if (e?.key !== m.key || e.slug !== modelSlug(cat, m)) miss = true;
          }
        }
        if (miss) misses++;
      }
      expect(misses).toBe(0);
    });
    if (cat === 'gpu' || cat === 'cpu' || cat === 'ram' || cat === 'psu') {
      it(`${cat}: slugs are still the key's (unchanged by task 13)`, () => {
        for (const e of entries) expect(e.slug).toBe(nameSlug(e.key));
      });
    }

    it(`${cat}: full listings (url, scrapedAt), full history, dips and imported entry`, () => {
      for (const e of entries) {
        const m = byKey.get(e.key)!;
        expect(e.listings).toEqual(m.listings);
        // The full history; task 7b import glitches marked g: 1 (and nothing else changed).
        const raw = input.history[e.key] ?? [];
        const glitches = importGlitches(raw, days, bad);
        expect(e.history).toEqual(raw.map((p) => (glitches.has(p) ? { ...p, g: 1 } : p)));
        const dips = [...untrustedPoints(e.history)].map((p) => p.d).sort();
        expect(e.dips).toEqual(dips);
        for (const p of glitches) expect(e.dips).toContain(p.d);
        const imp = input.imported[e.key] ?? null;
        // As on the category page (derive.listFile): an imported low that 3+ models share (task 7b), or that is one of
        // the dips, is left out.
        if (imp && typeof imp === 'object' && imp.low != null && e.imported && typeof e.imported === 'object' && e.imported.low == null) {
          expect(bad.has(imp.low) || dips.length > 0).toBe(true);
          expect(e.imported).toEqual({ ...imp, low: undefined });
        } else expect(e.imported).toEqual(imp);
        if (imp && typeof imp === 'object' && imp.low != null && bad.has(imp.low)) expect((e.imported as { low?: number }).low).toBeUndefined();
      }
      expect(entries.some((e) => e.listings.every((l) => typeof l.url === 'string' && typeof l.scrapedAt === 'string'))).toBe(true);
    });

    it(`${cat}: photo flag = the list file's photo bitset (product pages request no photo a model hasn't)`, () => {
      const { photos } = decodeList(listFile(cat, input, BUILT, image));
      for (const e of entries) expect(e.photo).toBe(photos.has(e.key));
      expect(entries.some((e) => e.photo)).toBe(true);
      expect(entries.some((e) => !e.photo)).toBe(true);
    });

    // A peripheral (monitors) is no builder part: no slot, no engine parts.
    it.skipIf(slotOf(cat) == null)(`${cat}: engine parts by the builder's key (slotModels + toPart)`, () => {
      const slot = slotOf(cat)!;
      const step = Math.max(1, Math.floor(entries.length / 30));
      for (const e of entries.filter((_, i) => i % step === 0)) {
        const want = slotModels(slot, byKey.get(e.key)!.listings as never[]).map((p) => [p.key, toPart(slot, p as never).fields]);
        expect(e.parts).toEqual(Object.fromEntries(want));
        if (cat === 'gpu') expect(Object.keys(e.parts!).sort()).toEqual(e.listings.map((l) => l.id).sort());
        // A power supply spec group holds one candidate per product (task 7, psuProduct.psuProductKey).
        else if (cat === 'psu') expect(Object.keys(e.parts!).sort()).toEqual([...new Set(e.listings.map((l) => psuProductKey(l as never)))].sort());
        else if (cat !== 'cpu') expect(Object.keys(e.parts!)).toEqual([e.key]);
      }
    });

    it(`${cat}: variants are other models of the same family, never the model itself`, () => {
      for (const e of entries) {
        const keys = e.variants.map((v) => v.key);
        expect(keys).not.toContain(e.key);
        expect(new Set(keys).size).toBe(keys.length);
        for (const v of e.variants) {
          const m = byKey.get(v.key)!;
          expect(v.slug).toBe(modelSlug(cat, m));
          expect(v.price).toBe(m.cheapest.price);
          expect(v.label.length).toBeGreaterThan(0);
        }
      }
      const withVariants = entries.filter((e) => e.variants.length).length;
      if (cat === 'gpu' || cat === 'ram' || cat === 'psu' || cat === 'storage') expect(withVariants).toBeGreaterThan(0);
      else expect(withVariants).toBe(0);
    });

    it(`${cat}: alternatives — up to 3 cheaper of the same kind (≥5% less, Recommended order), up to 3 of better value within ±10%`, () => {
      const value = cfgOf(cat).value;
      // The Recommended score as the category page computes it: from what its list file gives (reduced history,
      // imported lows without dips).
      const page = decodeList(listFile(cat, input, BUILT));
      const scored = models.map((m) => ({
        ...m,
        sale: saleOf(m.listings, m.cheapest),
        low: allTimeLow(page.history[m.key], page.imported[m.key], m.cheapest.price),
      }));
      const rec = recommendedScores(scored, cat, value);
      for (const e of entries) {
        const m = byKey.get(e.key)!;
        const cheaper = e.alternatives.filter((a) => a.kind === 'cheaper');
        const better = e.alternatives.filter((a) => a.kind === 'value');
        expect(cheaper.length).toBeLessThanOrEqual(3);
        expect(better.length).toBeLessThanOrEqual(3);
        for (const a of e.alternatives) {
          const o = byKey.get(a.key)!;
          expect(a.key).not.toBe(e.key);
          expect(a.slug).toBe(modelSlug(cat, o));
          expect(a.chip).toBe(o.chip);
          expect(a.price).toBe(o.cheapest.price);
          expect(a.img).toBe(image(cat, a.key) != null);
        }
        if (NO_CHEAPER.includes(cat)) expect(cheaper).toEqual([]);
        for (const a of cheaper) {
          const o = byKey.get(a.key)!;
          const kind = SAME_KIND_TEST[cat]!(m);
          expect(kind).not.toBeNull();
          expect(SAME_KIND_TEST[cat]!(o)).toBe(kind);
          expect(sameKind(cat, m, o)).toBe(true);
          if (cat === 'cpu') expect(o.pro || m.pro).toBe(false);
          expect(a.price).toBeLessThanOrEqual(m.cheapest.price * 0.95 + 1e-9);
        }
        for (let i = 1; i < cheaper.length; i++) expect(rec.get(cheaper[i - 1].key)!).toBeGreaterThanOrEqual(rec.get(cheaper[i].key)!);
        if (!value) expect(better).toEqual([]);
        for (const a of better) {
          const o = byKey.get(a.key)!;
          expect(o.segment).toBe(m.segment);
          expect(Math.abs(a.price - m.cheapest.price)).toBeLessThanOrEqual(m.cheapest.price * 0.1 + 1e-9);
          expect(value!(o)!).toBeGreaterThan(value!(m)!);
        }
      }
      if (!NO_CHEAPER.includes(cat)) expect(entries.some((e) => e.alternatives.some((a) => a.kind === 'cheaper'))).toBe(true);
      if (value) expect(entries.some((e) => e.alternatives.some((a) => a.kind === 'value'))).toBe(true);
    });

    it(`${cat}: largest chunk ≤ 40 KiB gzip`, () => {
      const gz = cs.map((c) => gzipSync(JSON.stringify(c)).length);
      const raw = cs.map((c) => JSON.stringify(c).length);
      const max = Math.max(...gz);
      sizes.push(`${cat}: largest ${(max / KIB).toFixed(1)} KiB gzip (${(Math.max(...raw) / KIB).toFixed(0)} KiB raw), mean ${(gz.reduce((a, b) => a + b, 0) / gz.length / KIB).toFixed(1)} KiB`);
      console.log(sizes.at(-1));
      expect(max).toBeLessThanOrEqual(MAX_GZIP);
    });
  }
});

describe('"Other" cases (owner, 17/10)', () => {
  // Owner: "'Other' cases: no cheaper list (size unknown, so 'same kind' can't be checked)."
  const cases = chunks.case!.flatMap((c) => Object.values(c.models));
  const stated = (e: (typeof cases)[number]) => e.listings.some((l) => (l as BaseListing & { size: string }).size !== 'Άλλο');
  it('a case whose listings state no size has no cheaper list', () => {
    const other = cases.filter((e) => !stated(e));
    expect(other.length).toBeGreaterThan(0);
    for (const e of other) expect(e.alternatives.filter((a) => a.kind === 'cheaper')).toEqual([]);
  });
  it('no case is offered as a cheaper alternative from an "Other" model', () => {
    const byKey = new Map(cases.map((e) => [e.key, e]));
    for (const e of cases) for (const a of e.alternatives) if (a.kind === 'cheaper') expect(stated(byKey.get(a.key)!)).toBe(true);
  });
});

describe('reviewer examples (fix round 1)', () => {
  const all = (cat: Category) => chunks[cat]!.flatMap((c) => Object.values(c.models));
  const entry = (cat: Category, chip: string) => all(cat).find((e) => e.chip === chip)!;
  it('9800X3D: the cheaper list is desktop AM5 only (no AM4 Ryzen 5 PRO 4655G)', () => {
    const cheaper = entry('cpu', 'Ryzen 7 9800X3D').alternatives.filter((a) => a.kind === 'cheaper');
    expect(cheaper.length).toBeGreaterThan(0);
    expect(cheaper.map((a) => a.chip)).not.toContain('Ryzen 5 PRO 4655G');
    const cpus = new Map(all('cpu').map((e) => [e.key, e]));
    for (const a of cheaper) expect((cpus.get(a.key)!.listings as CpuListing[]).some((l) => l.socket === 'AM5')).toBe(true);
  });
  it('O11 Dynamic EVO XL: no SilverStone GD08 (HTPC) among the alternatives', () => {
    const xl = all('case').filter((e) => /O11 Dynamic EVO XL/i.test(e.chip));
    expect(xl.length).toBeGreaterThan(0);
    for (const e of xl) expect(e.alternatives.map((a) => a.chip).join()).not.toMatch(/GD08/);
    // The model most shops list (key lianlio11dynamicevoxl): a Full Tower, though its cheapest listing says "Άλλο";
    // its cheaper list holds Full Towers only.
    const main = all('case').find((e) => e.key === 'lianlio11dynamicevoxl')!;
    const cases = new Map(all('case').map((e) => [e.key, e]));
    const cheaper = main.alternatives.filter((a) => a.kind === 'cheaper');
    expect(cheaper.length).toBeGreaterThan(0);
    for (const a of cheaper) expect(SAME_KIND_TEST.case!({ ...cases.get(a.key)!, cheapest: cases.get(a.key)!.listings[0], pro: false, group: '' })).toBe('Full Tower');
  });
  it('RX 9070 XT: one part per card, each with its own length', () => {
    const e = all('gpu').find((x) => x.key === 'RX 9070 XT 16GB')!;
    expect(Object.keys(e.parts!).length).toBe(e.listings.length);
    for (const l of e.listings) expect(e.parts![l.id].lengthMm).toBe((l as BaseListing & { lengthMm?: number | null }).lengthMm ?? null);
    expect(new Set(Object.values(e.parts!).map((p) => p.lengthMm)).size).toBeGreaterThan(1);
  });
  it('Ryzen 5 7600: Box and Tray are separate parts, each with its own coolerIncluded', () => {
    const e = entry('cpu', 'Ryzen 5 7600');
    const ls = e.listings as CpuListing[];
    const box = ls.find((l) => l.packaging === 'Box')!;
    const tray = ls.find((l) => l.packaging === 'Tray' && l.coolerIncluded === false)!;
    const keyOf = (l: CpuListing) => `${l.chip}|${l.coolerIncluded ?? '?'}`;
    expect(keyOf(box)).not.toBe(keyOf(tray));
    // The data's own value for the Box listings (2026-10-17: not stated, null — no source says "with cooler").
    expect(e.parts![keyOf(box)].coolerIncluded).toBe(box.coolerIncluded ?? null);
    expect(e.parts![keyOf(tray)].coolerIncluded).toBe(false);
  });
});

describe('publishing check: every current model in exactly one chunk', () => {
  const all = Object.fromEntries(CATEGORY_IDS.filter((c) => inputs[c]).map((c) => [c, inputs[c]!.latest])) as Partial<Record<Category, Latest>>;
  const next: Manifest = manifest(all, {}, BUILT);
  next.builder = Object.fromEntries(Object.keys(SLOT_OF).map((s) => [s, 1]));
  const modelProblems = (cs: Partial<Record<Category, ModelChunk[]>>) => checkData(next, next, cs).filter((p) => p.includes('model chunk'));
  /** The real chunks with a copy of one category's, to change; returns both. */
  const clone = (cat: Category): [Partial<Record<Category, ModelChunk[]>>, ModelChunk[]] => {
    const copy = chunks[cat]!.map((c) => ({ ...c, models: { ...c.models } }));
    return [{ ...chunks, [cat]: copy }, copy];
  };

  it('passes on the real chunks', () => expect(modelProblems(chunks)).toEqual([]));
  it('fails when a model is missing', () => {
    const [cs, gpu] = clone('gpu');
    const n = gpu.findIndex((c) => Object.keys(c.models).length);
    delete gpu[n].models[Object.keys(gpu[n].models)[0]];
    expect(modelProblems(cs)).toEqual([expect.stringContaining('gpu')]);
  });
  it('fails when a model is in two chunks (or in the wrong one)', () => {
    const [cs, psu] = clone('psu');
    const n = psu.findIndex((c) => Object.keys(c.models).length);
    const [slug, e] = Object.entries(psu[n].models)[0];
    psu[(n + 1) % 256].models[slug] = e;
    expect(modelProblems(cs).length).toBeGreaterThan(0);
    expect(modelProblems(cs).join()).toContain('psu');
  });
  it('fails when an entry is filed under its hyphenated slug instead of the lookup form', () => {
    const [cs, cases] = clone('case');
    const n = cases.findIndex((c) => Object.values(c.models).some((e) => e.slug.includes('-')));
    const [k, e] = Object.entries(cases[n].models).find(([, x]) => x.slug.includes('-'))!;
    delete cases[n].models[k];
    cases[modelChunkOf(e.slug)].models[e.slug] = e;
    expect(modelProblems(cs)).toEqual([expect.stringContaining('case: 1 model chunk entries not in the file')]);
  });
  it('fails when an entry is filed under another model\'s spelling', () => {
    const [cs, cases] = clone('case');
    const n = cases.findIndex((c) => Object.keys(c.models).length);
    const [k, e] = Object.entries(cases[n].models)[0];
    cases[n].models[k] = { ...e, slug: `${e.slug}-x` };
    expect(modelProblems(cs).join()).toContain('case: 1 model chunk entries not in the file');
  });
  it('fails when a category has no chunks', () => {
    const cs: Partial<Record<Category, ModelChunk[]>> = { ...chunks };
    delete cs.cpu;
    expect(modelProblems(cs)).toEqual([expect.stringContaining('cpu')]);
  });
});

describe('the search index opens canonical addresses (task 13)', () => {
  const all = Object.fromEntries(CATEGORY_IDS.filter((c) => inputs[c]).map((c) => [c, inputs[c]!.latest])) as Partial<Record<Category, Latest>>;
  const index = searchFile(all, BUILT);
  for (const cat of CATEGORY_IDS) {
    if (!inputs[cat]) continue;
    it(cat, () => {
      const slugs = new Set(chunks[cat]!.flatMap((c) => Object.values(c.models).map((e) => e.slug)));
      const hits = index.cats[cat]!.m.map(([name, , slug]) => slug ?? nameSlug(name));
      expect(hits.length).toBe(slugs.size);
      for (const s of hits) expect(slugs.has(s)).toBe(true);
    });
  }
});

describe('loadModel', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('fetches the slug\'s chunk once, with ?v=<builtAt>, and returns the entry or null', async () => {
    const cat: Category = 'gpu';
    const slug = Object.keys(chunks.gpu!.find((c) => Object.keys(c.models).length)!.models)[0];
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        urls.push(url);
        if (url === '/data/manifest.json') return new Response(JSON.stringify({ builtAt: BUILT, cats: {}, builder: {} }));
        const n = Number(/model\/(\d{3})\.json/.exec(url)![1]);
        return new Response(JSON.stringify(chunks.gpu![n]));
      }),
    );
    const e = await loadModel(cat, slug);
    expect(e?.slug).toBe(slug);
    expect(await loadModel(cat, slug)).toBe(e);
    const chunkUrl = `/${modelChunkPath(cat, modelChunkOf(slug))}?v=${BUILT}`;
    expect(urls.filter((u) => u === chunkUrl).length).toBe(1);
    // A slug that is not in its chunk (delisted since the build, or never a model): null.
    expect(await loadModel(cat, `${slug}-x`)).toBeNull();
  });
  it('a failed chunk is forgotten, so the next call retries', async () => {
    let fail = true;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/data/manifest.json') return new Response(JSON.stringify({ builtAt: BUILT, cats: {}, builder: {} }));
        if (fail) return new Response('', { status: 503 });
        return new Response(JSON.stringify(chunks.cpu![Number(/model\/(\d{3})\.json/.exec(url)![1])]));
      }),
    );
    // A real model of the built chunks.
    const slug = Object.keys(chunks.cpu!.find((c) => Object.keys(c.models).length)!.models)[0];
    await expect(loadModel('cpu', slug)).rejects.toThrow(/503/);
    fail = false;
    const e = await loadModel('cpu', slug);
    expect(e).not.toBeNull();
    expect(e!.slug).toBe(slug);
    expect(e).toEqual(chunks.cpu![modelChunkOf(slug)].models[slug]);
  });
});

