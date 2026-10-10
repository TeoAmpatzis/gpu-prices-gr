// Labels per category and site: how many sampled pages state each, with one example value.
import { readFileSync } from 'node:fs';
const rows = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const out = {};
for (const r of rows) {
  const k = `${r.cat} ${r.source}`;
  out[k] ??= { pages: 0, labels: {} };
  out[k].pages++;
  for (const [lab, v] of Object.entries(r.labels ?? {})) {
    out[k].labels[lab] ??= { n: 0, ex: v.slice(0, 70) };
    out[k].labels[lab].n++;
  }
}
for (const [k, { pages, labels }] of Object.entries(out)) {
  console.log(`\n## ${k} (${pages} pages)`);
  for (const [lab, { n, ex }] of Object.entries(labels)) console.log(`  ${n}/${pages}  ${lab} = ${ex}`);
}
