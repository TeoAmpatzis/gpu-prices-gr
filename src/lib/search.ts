// Global search over every category's models (plan A1): the build writes one index file; the browser
// loads it only when the search box is used, prepares it once, and matches on every keystroke.
import type { Category } from '../types';

/** The index file: per category, models as [name, cheapest price] in popularity order, and makers. */
export interface SearchIndexFile {
  builtAt?: string;
  cats: Partial<Record<Category, { m: [string, number][]; mk: string[] }>>;
}

/** Lower-case, accents removed: "Μητρικές" → "μητρικες", "Ryzen 7 9800X3D" → "ryzen 7 9800x3d". */
export const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
const words = (s: string) => fold(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

interface Entry {
  name: string;
  price: number;
  rank: number;
  words: string[];
  compact: string; // letters and digits only, for "990pro" / "rtx5070"
}
export interface PreparedIndex {
  cats: { cat: Category; entries: Entry[]; makers: string[] }[];
}

export function prepare(file: SearchIndexFile): PreparedIndex {
  return {
    cats: (Object.entries(file.cats) as [Category, { m: [string, number][]; mk: string[] }][]).map(([cat, c]) => ({
      cat,
      makers: c.mk,
      entries: c.m.map(([name, price], rank) => ({ name, price, rank, words: words(name), compact: words(name).join('') })),
    })),
  };
}

export interface Hit {
  name: string;
  price: number;
}
export interface Group {
  cat: Category;
  total: number;
  hits: Hit[];
  makers: string[];
  best: number;
}

/** Every typed word must start a word of the name (3 if it is the whole word); digits may also match inside. */
function score(tokens: string[], e: Entry): number {
  let s = 0;
  for (const t of tokens) {
    if (e.words.includes(t)) s += 3;
    else if (e.words.some((w) => w.startsWith(t))) s += 2;
    else if (/\d/.test(t) && e.compact.includes(t)) s += 1;
    else return 0;
  }
  return s;
}

/** Suggestions grouped by category, best group first; at most `perCat` models per group. */
export function search(index: PreparedIndex, query: string, perCat = 5): Group[] {
  const tokens = words(query);
  if (!tokens.length) return [];
  const q = fold(query.trim());
  const groups: Group[] = [];
  for (const c of index.cats) {
    const scored: { e: Entry; s: number }[] = [];
    for (const e of c.entries) {
      const s = score(tokens, e);
      if (s) scored.push({ e, s });
    }
    const makers = q.length >= 2 ? c.makers.filter((m) => fold(m).startsWith(q)).slice(0, 2) : [];
    if (!scored.length && !makers.length) continue;
    scored.sort((a, b) => b.s - a.s || a.e.rank - b.e.rank);
    groups.push({
      cat: c.cat,
      total: scored.length,
      hits: scored.slice(0, perCat).map(({ e }) => ({ name: e.name, price: e.price })),
      makers,
      best: Math.max(scored[0]?.s ?? 0, makers.length ? tokens.length * 3 : 0),
    });
  }
  return groups.sort((a, b) => b.best - a.best || b.total - a.total);
}

/** Categories whose names (Greek, English or common words such as "vga", "ssd") start with the query. */
export function matchCategories<C extends string>(query: string, names: { cat: C; words: string[] }[]): C[] {
  const tokens = words(query);
  if (!tokens.length) return [];
  return names
    .filter((n) => {
      const ws = n.words.flatMap(words);
      return tokens.every((t) => ws.some((w) => w.startsWith(t)));
    })
    .map((n) => n.cat);
}
