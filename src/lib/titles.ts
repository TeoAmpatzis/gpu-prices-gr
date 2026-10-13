// Listing titles in an expanded row (C5): the model's own name and the words every offer shares are cut, so
// the part that tells the offers apart (maker, variant) stays visible. The full title is kept for title/aria.

const words = (s: string) => s.split(/\s+/).filter(Boolean);
const norm = (w: string) => w.toLowerCase();

/** Cuts the first run of `phrase` words (case-insensitive) out of `ws`. */
function cutPhrase(ws: string[], phrase: string[]): string[] {
  if (phrase.length === 0) return ws;
  for (let i = 0; i + phrase.length <= ws.length; i++) {
    if (phrase.every((p, k) => norm(ws[i + k]) === norm(p))) return [...ws.slice(0, i), ...ws.slice(i + phrase.length)];
  }
  return ws;
}

/**
 * Short titles for one model's offers, same order. With fewer than two offers, or when nothing
 * would be left of a title, that title is returned whole.
 */
export function shortTitles(titles: string[], modelName: string): string[] {
  if (titles.length < 2) return titles;
  const cut = titles.map((t) => cutPhrase(words(t), words(modelName)));
  // Words in (nearly) every title: all of them for 2-3 offers, 70% from 4 on (a shop's own wording is the odd one out).
  const need = titles.length < 4 ? titles.length : Math.ceil(titles.length * 0.7);
  const seen = new Map<string, number>();
  for (const ws of cut) for (const w of new Set(ws.map(norm))) seen.set(w, (seen.get(w) ?? 0) + 1);
  const shared = new Set([...seen].filter(([, n]) => n >= need).map(([w]) => w));
  return titles.map((t, i) => {
    const rest = cut[i].filter((w) => !shared.has(norm(w))).join(' ');
    return rest || t;
  });
}
