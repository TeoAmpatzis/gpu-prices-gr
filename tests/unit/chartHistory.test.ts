// Task 4b: the expanded row's chart reads the model chunks (not the category history.json), and the built site
// leaves the category history.json files out.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VALIDATION_MODE, validateLatest } from '../../src/data/validate';
import { groupModels } from '../../src/lib/data';
import { CATEGORIES, type CategoryConfig } from '../../src/lib/categories';
import { modelChunks, type CategoryInput } from '../../src/lib/derive';
import { importGlitches, sharedImportedDays, sharedImportedLows, untrustedPoints } from '../../src/lib/dips';
import { chartHistory, modelChunkPath } from '../../src/lib/modelData';
import { modelSlug } from '../../src/lib/slug';
import { pruneRawData } from '../../vite-plugin-data';
import type { BaseListing, Category, History, Imported, Latest, ModelChunk } from '../../src/types';

const BUILT = '2026-10-17T14:00:00.000Z';
const read = <T>(cat: string, f: string, fb: T): T => {
  try {
    return JSON.parse(readFileSync(`public/data/${cat}/${f}`, 'utf8')) as T;
  } catch {
    return fb;
  }
};

afterEach(() => vi.unstubAllGlobals());

describe('chart data from the model chunks', () => {
  for (const cat of ['gpu', 'ram', 'case'] as Category[]) {
    it(`${cat}: same points and dips as history.json gave`, async () => {
      const raw = read<Latest | null>(cat, 'latest.json', null);
      if (!raw) return;
      const input: CategoryInput = {
        latest: validateLatest(cat, raw, VALIDATION_MODE).latest,
        history: read<History>(cat, 'history.json', {}),
        imported: read<Imported>(cat, 'history_imported.json', {}),
      };
      const chunks = modelChunks(cat, input, BUILT, undefined);
      const files: Record<string, unknown> = { '/data/manifest.json': { builtAt: '2026-10-17T14:00:00.000Z' } };
      chunks.forEach((c: ModelChunk, n) => (files[`/${modelChunkPath(cat, n)}?v=${BUILT}`] = c));
      vi.stubGlobal('fetch', async (url: string) => ({ ok: url in files, status: 200, json: async () => files[url] }));
      vi.resetModules();
      const md = await import('../../src/lib/modelData');
      const models = groupModels(input.latest.listings as BaseListing[], CATEGORIES[cat] as unknown as CategoryConfig<BaseListing>);
      // models with the most history points: the ones whose chart matters
      const withHist = models.filter((m) => (input.history[m.key]?.length ?? 0) > 0);
      expect(withHist.length).toBeGreaterThan(0);
      const sample = withHist.sort((a, b) => input.history[b.key].length - input.history[a.key].length).slice(0, 5);
      for (const m of sample) {
        const entry = await md.loadModel(cat, modelSlug(cat, m));
        const points = chartHistory(entry);
        // same points, same order (task 7b: import glitches marked g: 1)
        const glitches = importGlitches(input.history[m.key], sharedImportedDays(input.history), sharedImportedLows(input.imported));
        expect(points).toEqual(input.history[m.key].map((p) => (glitches.has(p) ? { ...p, g: 1 } : p)));
        const dips = untrustedPoints(points!);
        expect([...dips].map((p) => p.d).sort()).toEqual([...entry!.dips].sort()); // same dips
      }
    });
  }

  it('no model entry: no chart points', () => {
    expect(chartHistory(null)).toBeUndefined();
  });
});

describe('dist leaves the raw scraper files out (allow-list of generated files)', () => {
  const RAW = ['latest.json', 'offers.json', 'specs.json', 'image_urls.json', 'history.json', 'history_imported.json'];
  const GENERATED = ['data/manifest.json', 'data/builder/index.json', 'data/builder/case.json', 'data/builder/case-extra.json', 'data/search.json', 'data/gpu/list.v2.json', 'data/gpu/detail.json', 'data/gpu/model/000.json', 'data/compat/cpu-00.json'];
  function fakeDist() {
    const out = mkdtempSync(join(tmpdir(), 'dist-'));
    const put = (p: string) => {
      mkdirSync(join(out, p, '..'), { recursive: true });
      writeFileSync(join(out, p), '{}');
    };
    for (const cat of ['gpu', 'cpu']) for (const f of RAW) put(`data/${cat}/${f}`);
    put('data/makers/msi.json');
    put('data/gpu/brand-new-scraper-file.json');
    for (const g of GENERATED) put(g);
    put('assets/index.js');
    return out;
  }
  it('removes every raw file (and makers/, new scraper files), keeps every generated file and the rest of dist', () => {
    const out = fakeDist();
    const removed = pruneRawData(out, new Set(GENERATED));
    expect(removed).toBe(2 * RAW.length + 2);
    for (const cat of ['gpu', 'cpu']) for (const f of RAW) expect(existsSync(join(out, 'data', cat, f))).toBe(false);
    expect(existsSync(join(out, 'data', 'makers'))).toBe(false);
    expect(existsSync(join(out, 'data/gpu/brand-new-scraper-file.json'))).toBe(false);
    for (const g of GENERATED) expect(existsSync(join(out, g)), g).toBe(true);
    expect(existsSync(join(out, 'assets/index.js'))).toBe(true);
  });
  it('the repo files stay', () => {
    expect(existsSync('public/data/gpu/history.json')).toBe(true);
    expect(existsSync('public/data/gpu/latest.json')).toBe(true);
  });
});
