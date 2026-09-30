/** URL-friendly form of an option value: "Micro ATX" → "micro-atx", "DDR5" → "ddr5". */
export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.+×]+/gu, '-')
    .replace(/^-+|-+$/g, '');
