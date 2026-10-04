// The component catalogue (/_preview) must not reach production (Phase 1, B1). Run after `npm run build`:
//   node scripts/phase1/check-no-preview.mjs [dist]
// Fails if any built file is a catalogue chunk or contains the catalogue's own text or classes. (The design
// system itself is live from Phase 1 Stop 3; only the catalogue page stays out of production.)
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = process.argv[2] ?? 'dist';
const MARKERS = ['/_preview', 'Κατάλογος components', 'Component catalogue', 'pv-section', 'Θα άνοιγε'];
const all = readdirSync(DIST, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile())
  .map((e) => join(e.parentPath, e.name))
  .filter((f) => !f.includes(`${join(DIST, 'data')}`) && !f.includes(`${join(DIST, 'img')}`));

const problems = [];
for (const f of all) {
  if (/preview/i.test(f)) problems.push(`file ${f}`);
  if (!/\.(js|css|html)$/.test(f)) continue;
  const text = readFileSync(f, 'utf8');
  for (const m of MARKERS) if (text.includes(m)) problems.push(`${f} contains "${m}"`);
}
for (const p of problems) console.log(`FAIL ${p}`);
console.log(problems.length ? `${problems.length} problem(s)` : `no catalogue code in ${DIST} (${all.length} files checked)`);
process.exit(problems.length ? 1 : 0);
