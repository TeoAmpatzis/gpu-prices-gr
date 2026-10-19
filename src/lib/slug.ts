/** URL-friendly form of an option value: "Micro ATX" → "micro-atx", "DDR5" → "ddr5". */
export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.+×]+/gu, '-')
    .replace(/^-+|-+$/g, '');

/** Categories whose key is readable ("RTX 5070 12GB"), so the slug is the key's. */
const KEYED = new Set(['gpu', 'cpu', 'ram', 'psu']);

/**
 * A model's address segment (plan A2.2): "/gpu/rtx-5070-12gb", "/ram/ddr5-32gb-2x16gb-6000mhz-desktop",
 * "/storage/samsung-990-pro-2tb-ssd". GPU, CPU, RAM and PSU keys are readable, so the slug is the key;
 * for the rest the key is the name's letters and digits, so the slug is the name with every other run of
 * characters as "-" (removing the hyphens gives the key's letters and digits; storage adds SSD/HDD like its key).
 * Shops spell one model differently ("Aerocool CS-111" / "Aerocool CS111"), so the name is the spelling most of
 * the model's listings use, a tie going to the alphabetically smallest slug (task 13): the address doesn't move when
 * another shop becomes the cheapest. The build passes every listing; a model shown through some of its listings (a
 * source filter) may get another spelling, which slugLookup still resolves. Without listings: the cheapest's name.
 * Unique across every model of a category (tests/unit/routes.test.ts).
 */
export function modelSlug(cat: string, m: { key: string; chip: string; cheapest: object; listings?: readonly object[] }): string {
  if (KEYED.has(cat)) return nameSlug(m.key);
  const nameOf = (l: object) => {
    const { chip, media } = l as { chip?: string; media?: string };
    return nameSlug(cat === 'storage' ? `${chip ?? ''} ${media ?? ''}` : (chip ?? ''));
  };
  const ls = m.listings?.length ? m.listings : [m.cheapest];
  const counts = new Map<string, number>();
  for (const l of ls) {
    const s = nameOf(l);
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  let best = '';
  let n = 0;
  for (const [s, c] of counts) if (c > n || (c === n && s < best)) [best, n] = [s, c];
  return best;
}

/**
 * The form a model's chunk entry is filed and looked up under (src/lib/modelData.ts, src/lib/derive.ts modelChunks):
 * lower case, and for boards, drives, cases, fans and coolers letters and digits only (the key's form), so every
 * shop's spelling and any letter case of an address find the same model. The page then shows the canonical address
 * (the entry's slug).
 */
export function slugLookup(cat: string, slug: string): string {
  const s = slug.toLowerCase();
  return KEYED.has(cat) ? s : s.replace(/[^a-z0-9]+/g, '');
}

/** A name as an address segment: lower case, every other run of characters one "-" ("Micro ATX" → "micro-atx"). */
export function nameSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/×/g, 'x')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
