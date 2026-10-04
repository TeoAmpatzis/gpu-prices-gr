/** URL-friendly form of an option value: "Micro ATX" → "micro-atx", "DDR5" → "ddr5". */
export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.+×]+/gu, '-')
    .replace(/^-+|-+$/g, '');

/**
 * A model's address segment (plan A2.2): "/gpu/rtx-5070-12gb", "/ram/ddr5-32gb-2x16gb-6000mhz-desktop",
 * "/storage/samsung-990-pro-2tb-ssd". GPU, CPU, RAM and PSU keys are readable, so the slug is the key;
 * for the rest the key is the name's letters and digits, so the slug is the name with every other run of
 * characters as "-" (removing the hyphens gives the key back exactly; storage adds SSD/HDD like its key).
 * Unique across every model of a category (tests/unit/routes.test.ts).
 */
export function modelSlug(cat: string, m: { key: string; chip: string; cheapest: object }): string {
  const media = (m.cheapest as { media?: string }).media ?? '';
  const base = cat === 'gpu' || cat === 'cpu' || cat === 'ram' || cat === 'psu' ? m.key : cat === 'storage' ? `${m.chip} ${media}` : m.chip;
  return base
    .toLowerCase()
    .replace(/×/g, 'x')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
