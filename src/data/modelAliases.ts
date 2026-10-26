// Renamed models (plan item Q5, step 5 task 1): when the scraper merges or renames a model, its old address and its
// saved-build key keep working. ONE source: main's scraper/model_aliases.json ({ <cat>: { oldKey: newKey } }), read
// at build time (vite-plugin-data.ts) into /data/aliases.json as per-category records of exactly this shape:
//   { oldKey, oldSlug, newKey, newSlug }
// A slug cannot be derived from a key exactly (GPU/CPU/RAM/PSU slug = hyphenated key, the other categories' keys
// drop the hyphens, src/lib/slug.ts modelSlug), so both are stated. The browser loads the file only when a stored
// or shared key, or an address, is unknown (src/lib/aliases.ts), so it is never part of a first paint. The two
// lookups the app uses are derived from the records (deriveAliases):
//  - keys: old key -> final key (saved builds: buildStore.resolveKey).
//  - slugs: old slug -> final slug (/<cat>/<slug>: modelData.resolveModel).
import type { AliasFile, Category } from '../types';
import { CATEGORY_LIST } from '../lib/routes';

export interface AliasRecord {
  oldKey: string;
  oldSlug: string;
  newKey: string;
  newSlug: string;
}

/** Follows `from` through `next` to its end; throws on a cycle (a name met twice, the start included). */
function finalOf(cat: string, what: string, start: string, first: string, next: Map<string, string>): string {
  const seen = new Set([start]);
  let cur = first;
  for (;;) {
    if (seen.has(cur)) throw new Error(`${cat}: ${what} alias cycle at "${cur}"`);
    const to = next.get(cur);
    if (to === undefined) return cur;
    seen.add(cur);
    cur = to;
  }
}

/**
 * Checks a category's records and returns them with chains collapsed (A->B, B->C becomes A->C).
 * Throws on: an oldKey or oldSlug twice, an alias to itself (key or slug), a cycle.
 */
export function validateAliases(cat: string, records: AliasRecord[]): AliasRecord[] {
  const keys = new Map<string, string>();
  const slugs = new Map<string, string>();
  for (const r of records) {
    if (r.oldKey === r.newKey) throw new Error(`${cat}: key "${r.oldKey}" is an alias of itself`);
    if (keys.has(r.oldKey)) throw new Error(`${cat}: key "${r.oldKey}" appears twice`);
    keys.set(r.oldKey, r.newKey);
    // A rename that keeps the address (punctuation or case only) has no slug half: the key record stays.
    if (r.oldSlug === r.newSlug) continue;
    if (slugs.has(r.oldSlug)) throw new Error(`${cat}: slug "${r.oldSlug}" appears twice`);
    slugs.set(r.oldSlug, r.newSlug);
  }
  return records.map((r) => ({
    oldKey: r.oldKey,
    oldSlug: r.oldSlug,
    newKey: finalOf(cat, 'key', r.oldKey, r.newKey, keys),
    newSlug: r.oldSlug === r.newSlug ? r.newSlug : finalOf(cat, 'slug', r.oldSlug, r.newSlug, slugs),
  }));
}

/** The two lookups from validated records. */
export function deriveAliases(all: Record<Category, AliasRecord[]>) {
  const keys = {} as Record<Category, Record<string, string>>;
  const slugs = {} as Record<Category, Record<string, string>>;
  for (const cat of Object.keys(all) as Category[]) {
    const ok = validateAliases(cat, all[cat]);
    keys[cat] = Object.fromEntries(ok.map((r) => [r.oldKey, r.newKey]));
    slugs[cat] = Object.fromEntries(ok.filter((r) => r.oldSlug !== r.newSlug).map((r) => [r.oldSlug, r.newSlug]));
  }
  return { keys, slugs };
}

/** main's scraper/model_aliases.json: per category old key -> new key (a category may be missing). */
export type AliasSource = Partial<Record<Category, Record<string, string>>>;

/** The address segment a key has: `slugOf(cat, key, 'old' | 'new')` (the build knows the current models' own slugs). */
export type SlugOf = (cat: Category, key: string, which: 'old' | 'new') => string;

/**
 * The records of main's alias file, validated and with chains collapsed (validateAliases: a cycle, a duplicate or an
 * alias to itself throws, so the build fails), for every category. A category's entry must be an object of strings.
 */
export function aliasFile(raw: AliasSource, builtAt: string, slugOf: SlugOf): AliasFile {
  const cats = {} as Record<Category, AliasRecord[]>;
  for (const name of Object.keys(raw)) {
    if (!(CATEGORY_LIST as readonly string[]).includes(name))
      console.warn(`model aliases: category "${name}" in the alias file is not one of ours; its renames are ignored`);
  }
  for (const cat of CATEGORY_LIST) {
    const entries = raw[cat] ?? {};
    if (typeof entries !== 'object' || entries === null || Array.isArray(entries)) throw new Error(`${cat}: aliases are not an object`);
    const records = Object.entries(entries).map(([oldKey, newKey]) => {
      if (typeof newKey !== 'string' || !newKey) throw new Error(`${cat}: alias of "${oldKey}" is not a key`);
      return { oldKey, oldSlug: slugOf(cat, oldKey, 'old'), newKey, newSlug: slugOf(cat, newKey, 'new') };
    });
    cats[cat] = validateAliases(cat, records);
  }
  return { v: 1, builtAt, cats };
}
