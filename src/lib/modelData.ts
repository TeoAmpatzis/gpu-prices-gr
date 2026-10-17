// Product pages' data (v2 step 4): the build writes each category's models into 256 files,
// data/<cat>/model/000.json … 255.json (src/lib/derive.ts modelChunks), keyed by the model's address slug
// (src/lib/slug.ts modelSlug). The file of a slug is a hash of it, so a page needs only its address to find its
// data: no list.json and no slug index.
import type { Category, ModelChunk, ModelEntry } from '../types';
import { fnv1a } from './compatChunks';
import { loadManifest } from './manifest';

export const MODEL_CHUNKS = 256;

/** The chunk of a model's slug: FNV-1a (the compat chunks' hash, compatChunks.fnv1a) mod 256. */
export const modelChunkOf = (slug: string): number => fnv1a(slug) % MODEL_CHUNKS;

/** Three-digit file names: data/gpu/model/000.json … 255.json. */
export const modelChunkPath = (cat: Category | string, n: number) => `data/${cat}/model/${String(n).padStart(3, '0')}.json`;

const loadChunk = (() => {
  const cache = new Map<string, Promise<ModelChunk>>();
  return (url: string): Promise<ModelChunk> => {
    let p = cache.get(url);
    if (!p) {
      p = fetch(url).then((r) => {
        if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
        return r.json() as Promise<ModelChunk>;
      });
      p.catch(() => cache.delete(url)); // forgotten, so the next call retries
      cache.set(url, p);
    }
    return p;
  };
})();

/**
 * A model's product-page data, or null when its chunk has no such slug (delisted since the build, or never a
 * model). Requested with the build's `builtAt` as `?v=` (the manifest's: every file of a build carries the same
 * one, list files included), like detail/history (data.ts loadDetails), so a deploy in between can't mix two
 * builds; each chunk is fetched once per build.
 */
export async function loadModel(cat: Category, slug: string): Promise<ModelEntry | null> {
  const { builtAt } = await loadManifest();
  const chunk = await loadChunk(`/${modelChunkPath(cat, modelChunkOf(slug))}?v=${builtAt}`);
  return chunk.models[slug] ?? null;
}
