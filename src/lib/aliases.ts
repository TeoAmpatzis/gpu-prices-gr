// The renamed-model lookups (data/aliases.json, written at build time from main's scraper/model_aliases.json:
// src/data/modelAliases.ts aliasFile). Fetched only when a stored or shared key, or an address, is unknown (a rare
// path), so neither the builder's nor a product page's first paint pays for it.
import type { AliasFile, Category } from '../types';

export interface Aliases {
  /** old key -> final key, per category (saved builds, share links). */
  keys: Record<Category, Record<string, string>>;
  /** old address segment -> final one, per category (product pages). */
  slugs: Record<Category, Record<string, string>>;
}

/** The two lookups; the build already validated the records and collapsed their chains (modelAliases.aliasFile). */
function lookups(file: AliasFile): Aliases {
  const keys = {} as Aliases['keys'];
  const slugs = {} as Aliases['slugs'];
  for (const cat of Object.keys(file.cats) as Category[]) {
    keys[cat] = Object.fromEntries(file.cats[cat].map((r) => [r.oldKey, r.newKey]));
    slugs[cat] = Object.fromEntries(file.cats[cat].map((r) => [r.oldSlug, r.newSlug]));
  }
  return { keys, slugs };
}

const cache = new Map<string, Promise<Aliases>>();

/** The alias lookups of the build `builtAt` (`?v=` like every data file); each build's file is fetched once. */
export function loadAliases(builtAt: string): Promise<Aliases> {
  let p = cache.get(builtAt);
  if (!p) {
    p = fetch(`/data/aliases.json?v=${builtAt}`).then(async (r) => {
      if (!r.ok) throw new Error(`/data/aliases.json: HTTP ${r.status}`);
      return lookups((await r.json()) as AliasFile);
    });
    p.catch(() => cache.delete(builtAt)); // forgotten, so the next call retries
    cache.set(builtAt, p);
  }
  return p;
}
