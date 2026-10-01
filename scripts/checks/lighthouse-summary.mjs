// Summarise Lighthouse JSON reports: node scripts/checks/lighthouse-summary.mjs <dir> <file prefix>
import { readFileSync, readdirSync } from 'node:fs';
const [dir, prefix] = process.argv.slice(2);
const kb = (b) => (b / 1024).toFixed(0) + ' KB';
for (const f of readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith('.json')).sort()) {
  const r = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
  const a = r.audits;
  const sc = Object.fromEntries(Object.entries(r.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
  const reqs = a['network-requests'].details.items;
  const sum = (pred, key) => reqs.filter(pred).reduce((s, x) => s + (x[key] || 0), 0);
  const isJs = (x) => x.resourceType === 'Script';
  const isData = (x) => /\/data\//.test(x.url);
  console.log(`\n== ${f.replace('.json', '')}`);
  console.log(`   scores: perf ${sc.performance} | a11y ${sc.accessibility} | best-practices ${sc['best-practices']} | seo ${sc.seo}`);
  console.log(`   FCP ${a['first-contentful-paint'].displayValue} | LCP ${a['largest-contentful-paint'].displayValue} | TBT ${a['total-blocking-time'].displayValue} | CLS ${a['cumulative-layout-shift'].displayValue} | SI ${a['speed-index'].displayValue}`);
  console.log(`   total downloaded ${kb(sum(() => true, 'transferSize'))} (uncompressed ${kb(sum(() => true, 'resourceSize'))}) | JS ${kb(sum(isJs, 'transferSize'))} (uncompressed ${kb(sum(isJs, 'resourceSize'))}) | data JSON ${kb(sum(isData, 'transferSize'))} (uncompressed ${kb(sum(isData, 'resourceSize'))})`);
  console.log(`   main-thread work ${a['mainthread-work-breakdown'].displayValue} | JS execution ${a['bootup-time'].displayValue}`);
  for (const x of reqs.filter(isData)) console.log(`     ${x.url.replace(/.*\/data\//, 'data/').padEnd(36)} ${kb(x.transferSize).padStart(8)} sent, ${kb(x.resourceSize).padStart(8)} raw`);
}
