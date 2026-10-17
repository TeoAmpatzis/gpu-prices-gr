// Renamed models (plan item Q5): when the scraper merges or renames a model, its old address and its saved-build
// key keep working. ONE source: per category a list of records, empty until the backend's B9 batches land.
// The future build step (from main's scraper/model_aliases.json) must emit records of exactly this shape:
//   { oldKey, oldSlug, newKey, newSlug }
// A slug cannot be derived from a key exactly (GPU/CPU/RAM/PSU slug = hyphenated key, the other categories' keys
// drop the hyphens, src/lib/slug.ts modelSlug), so both are stated. The two lookups the app uses are derived:
//  - MODEL_ALIASES: old key -> final key (saved builds: buildStore.resolveKey).
//  - MODEL_ALIAS_SLUGS: old slug -> final slug (/<cat>/<slug>: modelData.resolveModel).
import type { Category } from '../types';

export interface AliasRecord {
  oldKey: string;
  oldSlug: string;
  newKey: string;
  newSlug: string;
}

export const ALIAS_RECORDS: Record<Category, AliasRecord[]> = {
  gpu: [],
  cpu: [],
  mobo: [],
  ram: [],
  storage: [],
  psu: [],
  case: [],
  fan: [],
  cooler: [],
};

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
    if (r.oldSlug === r.newSlug) throw new Error(`${cat}: slug "${r.oldSlug}" is an alias of itself`);
    if (keys.has(r.oldKey)) throw new Error(`${cat}: key "${r.oldKey}" appears twice`);
    if (slugs.has(r.oldSlug)) throw new Error(`${cat}: slug "${r.oldSlug}" appears twice`);
    keys.set(r.oldKey, r.newKey);
    slugs.set(r.oldSlug, r.newSlug);
  }
  return records.map((r) => ({
    oldKey: r.oldKey,
    oldSlug: r.oldSlug,
    newKey: finalOf(cat, 'key', r.oldKey, r.newKey, keys),
    newSlug: finalOf(cat, 'slug', r.oldSlug, r.newSlug, slugs),
  }));
}

/** The two lookups from validated records. */
export function deriveAliases(all: Record<Category, AliasRecord[]>) {
  const keys = {} as Record<Category, Record<string, string>>;
  const slugs = {} as Record<Category, Record<string, string>>;
  for (const cat of Object.keys(all) as Category[]) {
    const ok = validateAliases(cat, all[cat]);
    keys[cat] = Object.fromEntries(ok.map((r) => [r.oldKey, r.newKey]));
    slugs[cat] = Object.fromEntries(ok.map((r) => [r.oldSlug, r.newSlug]));
  }
  return { keys, slugs };
}

const derived = deriveAliases(ALIAS_RECORDS); // validated at module load: a bad table fails the unit tests
export const MODEL_ALIASES: Record<Category, Record<string, string>> = derived.keys;
export const MODEL_ALIAS_SLUGS: Record<Category, Record<string, string>> = derived.slugs;
