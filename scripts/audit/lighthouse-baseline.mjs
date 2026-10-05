// Phase 0 (v2 audit, B5): Lighthouse baseline of v1 on the local production preview. Runs every page
// `RUNS` times for mobile (Lighthouse default: simulated slow 4G, mid-range phone) and desktop, one
// run at a time, and writes the median of each metric plus the bytes each page downloaded (JS, data
// JSON, fonts, images) from the run's own network log. Full reports stay in <rawDir> (not committed).
// Phase 0 measured v1 at its #hash addresses; since v2 Phase 1 every page has its own address (the old
// links redirect to them) and the home page exists, so the same script measures the new ones.
//
//   node scripts/audit/lighthouse-baseline.mjs <baseUrl> <outDir> <rawDir> [runs=3] [pageFilter]

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [BASE, OUT, RAW, RUNS_ARG, ONLY] = process.argv.slice(2);
const RUNS = Number(RUNS_ARG ?? 3);
mkdirSync(OUT, { recursive: true });
mkdirSync(RAW, { recursive: true });

const PAGES = [
  { id: 'home', path: '/' },
  ...['gpu', 'cpu', 'mobo', 'ram', 'storage', 'psu', 'case', 'fan', 'cooler'].map((c) => ({ id: c, path: `/${c}` })),
  { id: 'builder-guided', path: '/builder' },
  { id: 'builder-quick', path: '/builder?mode=quick' },
];
const FORMS = ['mobile', 'desktop'];

const median = (xs) => {
  const s = xs.filter((x) => x != null).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function summarize(lhr) {
  const a = lhr.audits;
  const reqs = a['network-requests']?.details?.items ?? [];
  const bytes = (pred) => reqs.filter(pred).reduce((t, r) => t + (r.transferSize ?? 0), 0);
  const isData = (r) => /\/data\/.+\.json/.test(r.url);
  return {
    performance: Math.round((lhr.categories.performance?.score ?? 0) * 100),
    accessibility: Math.round((lhr.categories.accessibility?.score ?? 0) * 100),
    fcpMs: a['first-contentful-paint']?.numericValue,
    lcpMs: a['largest-contentful-paint']?.numericValue,
    tbtMs: a['total-blocking-time']?.numericValue,
    cls: a['cumulative-layout-shift']?.numericValue,
    siMs: a['speed-index']?.numericValue,
    totalKB: bytes(() => true) / 1024,
    jsKB: bytes((r) => r.resourceType === 'Script') / 1024,
    dataKB: bytes(isData) / 1024,
    fontKB: bytes((r) => r.resourceType === 'Font') / 1024,
    imageKB: bytes((r) => r.resourceType === 'Image') / 1024,
    scripts: reqs.filter((r) => r.resourceType === 'Script').map((r) => `${r.url.split('/').pop()} ${(r.transferSize / 1024).toFixed(1)}`),
    data: reqs.filter(isData).map((r) => `${r.url.split('/data/').pop().split('?')[0]} ${(r.transferSize / 1024).toFixed(1)}`),
  };
}

const results = {};
for (const page of PAGES) {
  if (ONLY && !ONLY.split(',').includes(page.id)) continue;
  for (const form of FORMS) {
    const runs = [];
    for (let i = 1; i <= RUNS; i++) {
      const file = join(RAW, `${page.id}-${form}-${i}.json`);
      const args = ['-y', 'lighthouse@12', `${BASE}${page.path}`, '--quiet', '--output=json', `--output-path=${file}`,
        '--only-categories=performance,accessibility', '--chrome-flags=--headless=new'];
      if (form === 'desktop') args.push('--preset=desktop');
      execFileSync('npx', args, { stdio: 'inherit', shell: true });
      runs.push(summarize(JSON.parse(readFileSync(file, 'utf8'))));
      console.log(`${page.id} ${form} run ${i}: perf ${runs.at(-1).performance}, LCP ${(runs.at(-1).lcpMs / 1000).toFixed(2)} s`);
    }
    const keys = ['performance', 'accessibility', 'fcpMs', 'lcpMs', 'tbtMs', 'cls', 'siMs', 'totalKB', 'jsKB', 'dataKB', 'fontKB', 'imageKB'];
    results[`${page.id}/${form}`] = {
      median: Object.fromEntries(keys.map((k) => [k, median(runs.map((r) => r[k]))])),
      runs: runs.map((r) => Object.fromEntries(keys.map((k) => [k, r[k]]))),
      scripts: runs[0].scripts,
      data: runs[0].data,
    };
    writeFileSync(join(OUT, 'lighthouse.json'), `${JSON.stringify(results, null, 2)}\n`);
  }
}
