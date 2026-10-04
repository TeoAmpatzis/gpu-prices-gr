// Runs the whole data-quality audit (v2 Phase 0, part B3) in order. Read-only on the site's data;
// writes docs/audit/data/*. First checks that the audit groups models exactly like the site
// (model counts = the built manifest.json).
// Run: node scripts/audit/data-quality/run-all.mjs

import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATS, groupModels, manifest } from './lib.mjs';

const man = manifest();
let ok = true;
for (const cat of CATS) {
  const n = groupModels(cat).length;
  const m = man.cats[cat]?.models;
  if (n !== m) ok = false;
  console.log(`${cat.padEnd(8)} models: audit ${n}, manifest ${m}${n === m ? '' : '  MISMATCH'}`);
}
if (!ok) {
  console.error('Model grouping differs from the site (src/lib/categories.tsx modelKey): fix lib.mjs MODEL_KEY first.');
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
for (const script of ['coverage.mjs', 'grouping.mjs', 'implausible.mjs', 'identity.mjs', 'freshness.mjs', 'builder-impact.mjs', 'report-tables.mjs']) {
  console.log(`\n== ${script}`);
  execFileSync(process.execPath, [join(here, script)], { stdio: ['ignore', 'ignore', 'inherit'] });
  console.log('done');
}
