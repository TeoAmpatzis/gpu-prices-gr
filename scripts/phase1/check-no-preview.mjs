// The component catalogue (/_preview) must not reach production (Phase 1, B1). Run after `npm run build`:
//   node scripts/phase1/check-no-preview.mjs [dist]
// Fails if any built file is a catalogue chunk or font, or contains catalogue text, the design-system
// classes or tokens. (Stop 2: production must still be exactly v1's site.)
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = process.argv[2] ?? 'dist';
const MARKERS = ['/_preview', 'Κατάλογος components', 'Component catalogue', 'ui-btn--', 'data-palette', 'jetbrains-mono'];
const all = readdirSync(DIST, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile())
  .map((e) => join(e.parentPath, e.name))
  .filter((f) => !f.includes(`${join(DIST, 'data')}`) && !f.includes(`${join(DIST, 'img')}`));

const problems = [];
for (const f of all) {
  if (/preview|jetbrains/i.test(f)) problems.push(`file ${f}`);
  if (!/\.(js|css|html)$/.test(f)) continue;
  const text = readFileSync(f, 'utf8');
  for (const m of MARKERS) if (text.includes(m)) problems.push(`${f} contains "${m}"`);
}
for (const p of problems) console.log(`FAIL ${p}`);
console.log(problems.length ? `${problems.length} problem(s)` : `no catalogue code, styles or fonts in ${DIST} (${all.length} files checked)`);
process.exit(problems.length ? 1 : 0);
