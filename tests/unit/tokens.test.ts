// Every text/background pair the design system uses passes WCAG AA in the site's dark theme, and the
// print stylesheet (dark text on white) passes too — computed from src/ui/tokens.css itself (the same
// pairs the /_preview catalogue shows).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PAIRS, contrast, parseRgb } from '../../src/ui/contrast';

const css = readFileSync(new URL('../../src/ui/tokens.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** Declarations of the first `:root { … }` block in `text`. */
function rootBlock(text: string): Record<string, string> {
  const m = text.match(/:root\s*\{([^{}]*)\}/);
  if (!m) throw new Error('no :root block');
  return Object.fromEntries([...m[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((d) => [d[1], d[2].trim()]));
}

function resolver(vars: Record<string, string>) {
  const get = (name: string, depth = 0): string => {
    const v = vars[name];
    if (v == null || depth > 10) throw new Error(`unresolved --${name}`);
    const ref = v.match(/^var\(--([\w-]+)\)$/);
    return ref ? get(ref[1], depth + 1) : v;
  };
  return get;
}

const screen = rootBlock(css);
const print = rootBlock(css.slice(css.indexOf('@media print')));
const label = (p: (typeof PAIRS)[number]) => `${p.fg} on ${p.bg} ≥ ${p.min} (${typeof p.use === 'string' ? p.use : p.use.en})`;

describe('dark (the site)', () => {
  const get = resolver(screen);
  for (const p of PAIRS) {
    it(label(p), () => expect(contrast(parseRgb(get(p.fg)), parseRgb(get(p.bg)))).toBeGreaterThanOrEqual(p.min));
  }
});

describe('print (dark text on white)', () => {
  const get = resolver({ ...screen, ...print });
  // Pairs whose colours the print sheet sets (the rest, e.g. hover states, never print).
  for (const p of PAIRS.filter((x) => x.fg in print && x.bg in print)) {
    it(label(p), () => expect(contrast(parseRgb(get(p.fg)), parseRgb(get(p.bg)))).toBeGreaterThanOrEqual(p.min));
  }
});
