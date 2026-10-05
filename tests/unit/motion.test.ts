// Plan A4, rule 1: the shell animates only transform and opacity. Colour, size and "all" transitions are
// what made v1's theme switch drop frames (O-02), so the new layer's files must not contain them:
// Tailwind's `transition-colors`, `transition-all`, `transition-shadow` or bare `transition`, or a CSS
// `transition` / `transition-property` of any other property. v1's components (src/components) are out of
// scope here; the language switch turns their transitions off for one frame (rule 3).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOTS = ['src/ui', 'src/shell'];
const EXTRA = ['src/index.css'];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(tsx?|css)$/.test(name) ? [p] : [];
  });
}

/** Source without comments (so prose such as "every transition off" is not a class). */
const code = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/(^|[^:'"`])\/\/.*$/, '$1'))
    .join('\n');

const ALLOWED = /^(none|transform|opacity)\b/;

function problems(src: string): string[] {
  const out: string[] = [];
  const c = code(src);
  // Utility classes (in class strings and @apply): transition, transition-colors/-all/-shadow.
  for (const m of c.matchAll(/(?<![\w-])transition(-colors|-all|-shadow)?(?![\w-]|\s*:)/g)) out.push(m[0]);
  // CSS declarations.
  for (const m of c.matchAll(/(?<![\w-])transition(-property)?\s*:\s*([^;}]+)/g)) {
    const parts = m[2].split(',').map((s) => s.trim());
    if (!parts.every((x) => ALLOWED.test(x))) out.push(m[0].trim());
  }
  return out;
}

describe('motion: only transform and opacity animate (plan A4 rule 1)', () => {
  const all = [...ROOTS.flatMap(files), ...EXTRA];
  it('scans the shell, the component layer and index.css', () => {
    expect(all.length).toBeGreaterThan(10);
  });
  for (const f of all) {
    it(f.replace(/\\/g, '/'), () => {
      expect(problems(readFileSync(f, 'utf8'))).toEqual([]);
    });
  }
  it('catches what it should', () => {
    expect(problems('className="transition hover:bg-hover"')).toEqual(['transition']);
    expect(problems("cls = 'transition-colors duration-150'")).toEqual(['transition-colors']);
    expect(problems('.x { transition: background-color 150ms; }')).toHaveLength(1);
    expect(problems('.x { transition: transform 120ms ease, opacity 120ms; }')).toEqual([]);
    expect(problems('* { transition: none !important; }')).toEqual([]);
    expect(problems('className="transition-transform duration-[var(--motion-fast)]"')).toEqual([]);
    expect(problems('/* every transition off */')).toEqual([]);
  });
});
