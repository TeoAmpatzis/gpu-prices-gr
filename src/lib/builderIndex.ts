// The builder's first-screen file, /data/builder/index.json, and the fetch helpers of its data files (builderFiles.ts).
// Kept free of the builder's row code, so the start screen (use, budget, "costs at least X € today") loads it without
// the parts' code (rule 11: /builder first-paint JS).

import type { BuilderIndex } from '../types';

export const INDEX_URL = '/data/builder/index.json';

const getJson = <T>(url: string): Promise<T> =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
    return r.json() as Promise<T>;
  });

/** One retry at once: a phone's connection drops a request now and then. */
export const getJsonRetry = <T>(url: string): Promise<T> => getJson<T>(url).catch(() => getJson<T>(url));

/** A promise per key that is forgotten if it fails, so the next call retries. */
export function memo<V>(load: (k: string) => Promise<V>): (k: string) => Promise<V> {
  const cache = new Map<string, Promise<V>>();
  return (k) => {
    let p = cache.get(k);
    if (!p) {
      p = load(k);
      p.catch(() => cache.delete(k));
      cache.set(k, p);
    }
    return p;
  };
}

const index = memo(() => getJsonRetry<BuilderIndex>(INDEX_URL));
/** The first screen's file (a few KiB). */
export const loadIndex = (): Promise<BuilderIndex> => index('');
