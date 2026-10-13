// Listing titles in an expanded row (C5): the model's own name and spec words are cut, so the part that tells
// the offers apart (maker, variant) stays visible. The full title is kept for title/aria. The first word
// (the maker) is never removed.

/** Compare words ignoring case, brackets and "2×16GB" / "2x16GB" / "2 x 16GB" spelling. */
const norm = (w: string) => w.toLowerCase().replace(/[()[\],]/g, '').replace(/×/g, 'x');
const words = (s: string) =>
  s
    .replace(/\b(\d{1,2})\s*[×x]\s*(\d)/gi, '$1x$2')
    .split(/\s+/)
    .filter(Boolean);

/** Words that only repeat what the model name says on a graphics card's title. */
export const GPU_WORDS = ['GeForce', 'Radeon', 'NVIDIA', 'AMD', 'Κάρτα', 'Γραφικών'];
export const GPU_SPEC = /^(GDDR\d+X?|\d+(GB|TB))$/i;

export interface TitleOptions {
  /** More words to cut (VRAM, memory type, brand names). */
  known?: string[];
  /** Cut any word that matches (spec tokens that belong to the model). */
  spec?: RegExp;
}

/**
 * Short titles for one model's offers, same order: the model's words and the known spec words go (never the
 * first word); with 4+ offers also words 70% of them share. A title never ends up empty or as a copy of a
 * different shortening: if the frequency step would leave only the maker, the step is skipped for it.
 */
export function shortTitles(titles: string[], modelName: string, opts: TitleOptions = {}): string[] {
  if (titles.length < 2) return titles;
  const drop = new Set([...words(modelName), ...(opts.known ?? [])].map(norm));
  const base = titles.map((t) => words(t).filter((w, i) => i === 0 || !(drop.has(norm(w)) || opts.spec?.test(w))));
  let freq = new Set<string>();
  if (titles.length >= 4) {
    const need = Math.ceil(titles.length * 0.7);
    const seen = new Map<string, number>();
    for (const ws of base) for (const w of new Set(ws.slice(1).map(norm))) seen.set(w, (seen.get(w) ?? 0) + 1);
    freq = new Set([...seen].filter(([, n]) => n >= need).map(([w]) => w));
  }
  return base.map((ws) => {
    const kept = ws.filter((w, i) => i === 0 || !freq.has(norm(w)));
    return (kept.length > 1 ? kept : ws).join(' ');
  });
}
