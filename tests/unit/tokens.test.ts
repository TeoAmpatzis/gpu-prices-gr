// Every text/background pair the design system uses passes WCAG AA, in both palettes and both themes,
// computed from src/ui/tokens.css itself (the same pairs the preview's contrast table shows).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PAIRS, contrast, parseRgb } from '../../src/ui/contrast';

const css = readFileSync(new URL('../../src/ui/tokens.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** Declarations of the first block whose selector list contains `selector`. */
function block(selector: string): Record<string, string> {
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = m[1].split(',').map((s) => s.trim());
    if (!selectors.includes(selector)) continue;
    return Object.fromEntries([...m[2].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((d) => [d[1], d[2].trim()]));
  }
  throw new Error(`no block for ${selector}`);
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

const shared = block('.ds');
for (const palette of ['blue', 'indigo'] as const) {
  const scales = block(`.ds[data-palette='${palette}']`);
  for (const theme of ['light', 'dark'] as const) {
    const roles = theme === 'light' ? block('.dark .ds.ds-light') : block('.ds.ds-dark');
    const get = resolver({ ...shared, ...scales, ...roles });
    describe(`${palette} / ${theme}`, () => {
      for (const p of PAIRS) {
        it(`${p.fg} on ${p.bg} ≥ ${p.min} (${typeof p.use === 'string' ? p.use : p.use.en})`, () => {
          expect(contrast(parseRgb(get(p.fg)), parseRgb(get(p.bg)))).toBeGreaterThanOrEqual(p.min);
        });
      }
    });
  }
}
