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
import { implausibleDips } from '../../src/lib/dips';
import { chartHistory, modelChunkPath } from '../../src/lib/modelData';
import { modelSlug } from '../../src/lib/slug';
import { dropRawHistory } from '../../vite-plugin-data';
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
        expect(points).toEqual(input.history[m.key]); // same points, same order
        const dips = implausibleDips(points!);
        expect([...dips].map((p) => p.d).sort()).toEqual([...entry!.dips].sort()); // same dips
      }
    });
  }

  it('no model entry: no chart points', () => {
    expect(chartHistory(null)).toBeUndefined();
  });
});

describe('dist leaves the category history.json out', () => {
  it('removes data/<cat>/history.json from the output only', () => {
    const out = mkdtempSync(join(tmpdir(), 'dist-'));
    for (const cat of ['gpu', 'cpu']) {
      mkdirSync(join(out, 'data', cat), { recursive: true });
      writeFileSync(join(out, 'data', cat, 'history.json'), '{}');
      writeFileSync(join(out, 'data', cat, 'history_imported.json'), '{}');
    }
    expect(dropRawHistory(out)).toBe(2);
    for (const cat of ['gpu', 'cpu']) {
      expect(existsSync(join(out, 'data', cat, 'history.json'))).toBe(false);
      expect(existsSync(join(out, 'data', cat, 'history_imported.json'))).toBe(true);
    }
  });
  it('the repo files stay', () => {
    expect(existsSync('public/data/gpu/history.json')).toBe(true);
  });
});

