// Product pages' data (v2 step 4): the build writes each category's models into 256 files,
// data/<cat>/model/000.json … 255.json (src/lib/derive.ts modelChunks), keyed by the model's address slug
// (src/lib/slug.ts modelSlug). The file of a slug is a hash of it, so a page needs only its address to find its
// data: no list.json and no slug index.
import type { Category, HistoryPoint, ModelChunk, ModelEntry } from '../types';
import { fnv1a } from './compatChunks';
import { MODEL_ALIAS_SLUGS } from '../data/modelAliases';
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
  return (await loadModelWithSources(cat, slug))?.entry ?? null;
}

/** loadModel plus its chunk's `sources` (each source's last update: the product page's "checked" column). */
async function loadModelWithSources(cat: Category, slug: string): Promise<{ entry: ModelEntry; sources: ModelChunk['sources'] } | null> {
  const { builtAt } = await loadManifest();
  const chunk = await loadChunk(`/${modelChunkPath(cat, modelChunkOf(slug))}?v=${builtAt}`);
  return has(chunk.models, slug) ? { entry: chunk.models[slug], sources: chunk.sources } : null;
}

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

export type ModelResolution =
  | { kind: 'ok'; entry: ModelEntry; sources: ModelChunk['sources'] }
  | { kind: 'moved'; slug: string }
  | { kind: 'gone' };

/**
 * What an address /<cat>/<slug> shows: an aliased old slug is `moved` to the new one (no request); otherwise the
 * slug's chunk is fetched and the entry looked up: `ok` (with the chunk's per-source update times), or `gone` (delisted since the build, or never a model:
 * the chunks can't tell the two apart). `aliases` = old slug -> new slug (data/modelAliases.ts).
 */
export async function resolveModel(cat: Category, slug: string, aliases: Record<string, string> = MODEL_ALIAS_SLUGS[cat]): Promise<ModelResolution> {
  if (has(aliases, slug)) return { kind: 'moved', slug: aliases[slug] };
  const found = await loadModelWithSources(cat, slug);
  return found ? { kind: 'ok', ...found } : { kind: 'gone' };
}

/**
 * The page's guard against alias loops (validated tables have none, but a bad table must not hang the page):
 * a `moved` to the same slug, or to a slug already left during this redirect chain, is `gone`. `visited` is the
 * page's set of slugs left in the current chain; it is emptied when the chain ends.
 */
export function guardMoved(res: ModelResolution, slug: string, visited: Set<string>): ModelResolution {
  if (res.kind !== 'moved') {
    visited.clear();
    return res;
  }
  if (res.slug === slug || visited.has(res.slug)) {
    visited.clear();
    return { kind: 'gone' };
  }
  visited.add(slug);
  return res;
}

/** The expanded row's chart: the model's full history points (the same ones the category history.json held). */
export const chartHistory = (entry: ModelEntry | null): HistoryPoint[] | undefined => entry?.history;
