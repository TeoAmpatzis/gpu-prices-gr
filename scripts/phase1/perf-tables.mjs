// Markdown tables for the Phase 1 gate report: Lighthouse medians of v2 (docs/phase1/perf/lighthouse.json)
// next to v1's Phase 0 baseline (docs/audit/perf/lighthouse.json), and first-load bytes per page.
//   node scripts/phase1/perf-tables.mjs
import { readFileSync } from 'node:fs';

const v2 = JSON.parse(readFileSync('docs/phase1/perf/lighthouse.json', 'utf8'));
const v1 = JSON.parse(readFileSync('docs/audit/perf/lighthouse.json', 'utf8'));
const PAGES = [
  ['home', 'Home `/`'],
  ['gpu', 'GPU `/gpu`'],
  ['cpu', 'CPU'],
  ['mobo', 'Motherboards'],
  ['ram', 'RAM'],
  ['storage', 'Storage'],
  ['psu', 'PSU'],
  ['case', 'Cases'],
  ['fan', 'Fans'],
  ['cooler', 'Coolers'],
  ['builder-guided', 'Builder, Guided `/builder`'],
  ['builder-quick', 'Builder, Quick list'],
];
const s = (ms) => (ms == null ? '—' : `${(ms / 1000).toFixed(2)} s`);
const kb = (x) => (x == null ? '—' : `${x.toFixed(1)}`);
const cls = (x) => (x == null ? '—' : x === 0 ? '0' : x.toFixed(4));
const runs = (r) => r.runs.map((x) => x.performance).join('/');
const arrow = (a, b) => (a == null ? `**${b}**` : a === b ? `${b}` : `${a} → **${b}**`);

let out = '| Page | Mobile perf (v1 → v2) | runs | LCP v1 → v2 | TBT v2 | CLS v1 → v2 | Desktop perf (v1 → v2) | Desktop LCP v2 | A11y m/d |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n';
for (const [id, name] of PAGES) {
  const m = v2[`${id}/mobile`];
  const d = v2[`${id}/desktop`];
  if (!m || !d) continue;
  const om = v1[`${id}/mobile`]?.median;
  const od = v1[`${id}/desktop`]?.median;
  out += `| ${name} | ${arrow(om?.performance, m.median.performance)} | ${runs(m)} | ${om ? s(om.lcpMs) + ' → ' : ''}${s(m.median.lcpMs)} | ${Math.round(m.median.tbtMs)} ms | ${om ? cls(om.cls) + ' → ' : ''}${cls(m.median.cls)} | ${arrow(od?.performance, d.median.performance)} | ${s(d.median.lcpMs)} | ${m.median.accessibility} / ${d.median.accessibility} |\n`;
}
console.log(out);

let bytes = '| Page | JS v1 → v2 (KB, compressed) | v2 scripts | Data v1 → v2 (KB) | v2 data files | Within 110 KB JS? |\n| --- | --- | --- | --- | --- | --- |\n';
for (const [id, name] of PAGES) {
  const m = v2[`${id}/mobile`];
  if (!m) continue;
  const om = v1[`${id}/mobile`]?.median;
  bytes += `| ${name} | ${om ? kb(om.jsKB) + ' → ' : ''}${kb(m.median.jsKB)} | ${m.scripts.join(', ')} | ${om ? kb(om.dataKB) + ' → ' : ''}${kb(m.median.dataKB)} | ${m.data.join(', ')} | ${m.median.jsKB <= 110 ? 'yes' : '**no**'} |\n`;
}
console.log(bytes);
