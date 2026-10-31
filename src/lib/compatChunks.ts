// Compat chunks (v2 step 3, A7): small per-slot files with the engine fields of every usable model, so a
// part saved without fields (old builds, share links) or from older data can be checked without
// loading the builder's step files. The chunk of a key is a hash of it, the same function in build and browser.
import type { Slot } from './builder';

export const CHUNKS = 64;

export interface CompatChunk {
  v: 1;
  builtAt: string;
  rows: Record<string, Record<string, unknown>>;
}

const encoder = new TextEncoder();

/** FNV-1a 32-bit over the text's UTF-8 bytes (also the model chunks' hash, src/lib/modelData.ts). */
export function fnv1a(text: string): number {
  let h = 2166136261;
  for (const b of encoder.encode(text)) h = Math.imul(h ^ b, 16777619) >>> 0;
  return h;
}

/** FNV-1a 32-bit over the key's UTF-8 bytes, mod CHUNKS. */
export const chunkOf = (key: string): number => fnv1a(key) % CHUNKS;

export const chunkPath = (slot: Slot, n: number) => `data/compat/${slot}-${String(n).padStart(2, '0')}.json`;

const loadChunk = (() => {
  const cache = new Map<string, Promise<CompatChunk>>();
  return (slot: Slot, n: number, builtAt: string): Promise<CompatChunk> => {
    const url = `/${chunkPath(slot, n)}?v=${builtAt}`;
    let p = cache.get(url);
    if (!p) {
      p = fetch(url).then((r) => {
        if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
        return r.json() as Promise<CompatChunk>;
      });
      p.catch(() => cache.delete(url));
      cache.set(url, p);
    }
    return p;
  };
})();

/**
 * The engine fields of the given keys (same build as the page: `?v=<builtAt>`). Fetches only the chunks
 * those keys fall in; a key that is no longer offered is simply absent from the result.
 */
export async function loadCompat(
  slot: Slot,
  keys: string[],
  builtAt: string,
): Promise<Record<string, { fields: Record<string, unknown> }>> {
  const needed = [...new Set(keys.map(chunkOf))];
  const chunks = await Promise.all(needed.map((n) => loadChunk(slot, n, builtAt)));
  const out: Record<string, { fields: Record<string, unknown> }> = {};
  for (const key of keys) {
    const row = chunks[needed.indexOf(chunkOf(key))].rows[key];
    if (row) out[key] = { fields: row };
  }
  return out;
}