// Listing titles in an expanded row (C5): the model's own name and spec words are cut, so the part that tells
// the offers apart (maker, variant) stays visible. The full title is kept for title/aria. The first word
// (the maker, or both words of a two-word maker) is never removed, and neither are the words that tell offers
// apart (KEEP). Two offers that say different things never read the same.

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
  /** Global pattern removed from each title before it is split into words. */
  phrases?: RegExp;
}

/**
 * RAM: "με 2 Modules" says how many sticks, and its lone digit would read as a series number (C5). The word "με"
 * ("with") goes wherever it stands (task 13): "με Module 1x2GB" left a lone "με", and dropping it only there made
 * the other titles of a model keep theirs (the 70% shared-word step no longer saw it in every title): short titles
 * still saying "με" over today's RAM data, 147 before, 522 with that narrower fix, 22 with this one (all models with
 * one offer, whose title is never shortened).
 * No \b before Greek (JS \b knows ASCII only) and no lookbehind (older Safari).
 */
export const RAM_TITLE: TitleOptions = { phrases: /(?:με\s+)?\b\d+\s+modules?\b|\bmodules?\b|(?:^|\s)με(?=\s|$)/giu };

/** The title options ModelRow uses for a category (the data test builds the same ones). */
export function titleOptions(cat: string): TitleOptions {
  return cat === 'gpu' ? { known: GPU_WORDS, spec: GPU_SPEC } : cat === 'ram' ? RAM_TITLE : {};
}

/**
 * Makers whose name is two words: both stay, as the title's first two words ("Be Quiet", never "Be"). Only pairs
 * that start real titles (checked 2026-10-17 on 36,819 titles); one-word spellings (Thermalright, DeepCool,
 * SilverStone) and hyphenated ones (ID-Cooling, Inter-Tech) are a single word already.
 */
const TWO_WORD_MAKERS = new Set([
  'be quiet', 'cooler master', 'fractal design', 'lian li', 'mars gaming', 'monarch gear', 'white shark',
  'pro gamersware', 'power train', 'silicon power', 'western digital', 'team group', 'super flower',
  'natec genesis', 'fsp fortron', 'inno 3d', 'arctic cooling',
]);
const makerKey = (w: string) => norm(w).replace(/[!.]+$/, '');

/** How many leading words name the maker (1, or 2 for a two-word maker). */
function makerWords(ws: string[]): number {
  return ws.length > 2 && TWO_WORD_MAKERS.has(`${makerKey(ws[0])} ${makerKey(ws[1])}`) ? 2 : 1;
}

/**
 * Words that tell offers of one model apart and are never cut as "shared" or "known" words: OC, Tray/Box, RGB,
 * ARGB, Tempered Glass, PCIe generation (Gen.2, Gen4x4), cache words (Cache, 256MB). VRAM and capacity are the
 * model's own and still go.
 */
export const KEEP = /^(oc|tray|box|rgb|argb|a-rgb|tempered|glass|gen\.?\d+(x\d+)?|cache|\d+mb)$/i;

/** The title without the model's words and spec words (the maker always stays). */
function baseWords(title: string, drop: Set<string>, opts: TitleOptions): string[] {
  const ws = words(opts.phrases ? title.replace(opts.phrases, ' ') : title);
  const maker = makerWords(ws);
  const model = new Set(drop);
  return ws.filter((w, i) => {
    if (i < maker) return true;
    const n = norm(w);
    if (model.has(n)) return false;
    if (KEEP.test(w)) return true;
    return !(opts.known?.some((k) => norm(k) === n) || opts.spec?.test(w));
  });
}

const modelWords = (modelName: string) => new Set(words(modelName).map(norm));

/**
 * An offer's text once the model's words and spec words are gone, ignoring case and brackets: two offers with the
 * same key read the same on purpose ("… 4GB GDDR6 ECO" / "… 4GB ECO"); two with different keys must not.
 */
export function titleKey(title: string, modelName: string, opts: TitleOptions = {}): string {
  return baseWords(title, modelWords(modelName), opts).map(norm).join(' ');
}

/**
 * Short titles for one model's offers, same order: the model's words and the known spec words go (never the
 * maker); with 4+ offers also words 70% of them share (never a `KEEP` word). A title never ends up as only the
 * maker, and never reads the same as another offer's that says something different (`titleKey`): those keep the
 * text without the frequency step.
 */
export function shortTitles(titles: string[], modelName: string, opts: TitleOptions = {}): string[] {
  if (titles.length < 2) return titles;
  const drop = modelWords(modelName);
  const base = titles.map((t) => baseWords(t, drop, opts));
  const keys = base.map((ws) => ws.map(norm).join(' '));
  let freq = new Set<string>();
  if (titles.length >= 4) {
    const need = Math.ceil(titles.length * 0.7);
    const seen = new Map<string, number>();
    for (const ws of base) for (const w of new Set(ws.slice(makerWords(ws)).filter((x) => !KEEP.test(x)).map(norm))) seen.set(w, (seen.get(w) ?? 0) + 1);
    freq = new Set([...seen].filter(([, n]) => n >= need).map(([w]) => w));
  }
  const out = base.map((ws) => {
    const maker = makerWords(ws);
    const kept = ws.filter((w, i) => i < maker || !freq.has(norm(w)));
    return (kept.length > maker ? kept : ws).join(' ');
  });
  // Two offers that say different things must not read the same: both go back to the text without the
  // frequency step (repeated, since a restored text can meet another shortened one).
  for (let changed = true; changed; ) {
    changed = false;
    const groups = new Map<string, Set<string>>();
    out.forEach((s, i) => groups.set(s.toLowerCase(), (groups.get(s.toLowerCase()) ?? new Set()).add(keys[i])));
    out.forEach((s, i) => {
      const full = base[i].join(' ');
      if (groups.get(s.toLowerCase())!.size > 1 && s !== full) {
        out[i] = full;
        changed = true;
      }
    });
  }
  return out;
}
