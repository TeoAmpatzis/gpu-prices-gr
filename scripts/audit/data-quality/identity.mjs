// Section 4 of the data-quality audit: identity fields that contradict the listing title.
//   1. Regex pass over every listing: socket (CPU, mobo), memory type (mobo, RAM), form factor
//      (mobo, PSU, case size).
//   2. A seeded random sample of 20 listings per category (docs/audit/data/spotcheck-sample.json),
//      judged by hand in docs/audit/data/spotcheck-verdicts.json; this script turns the verdicts into
//      error rates with 95% Wilson intervals.
// Run: node scripts/audit/data-quality/identity.mjs

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CATS, OUT, latest, readJson, rng, sample, specsCache, wilson, writeOut } from './lib.mjs';
import { titleBoard, titleCaseSizes, titleDdr, titlePsuForm, titleSockets } from './derive.mjs';

const MAX_EXAMPLES = 20;
const SEED = 20261003;

// ---------- 1. Regex pass ----------

/** `stated(l)` = values the title states (array, empty = says nothing); `field(l)` = our value. */
const CHECKS = [
  { cat: 'cpu', name: 'socket', stated: (l) => titleSockets(l.title), field: (l) => l.socket },
  { cat: 'mobo', name: 'socket', stated: (l) => titleSockets(l.title), field: (l) => l.socket },
  { cat: 'mobo', name: 'memory type', stated: (l) => titleDdr(l.title, true), field: (l) => l.memory },
  { cat: 'ram', name: 'memory type', stated: (l) => titleDdr(l.title), field: (l) => l.type },
  { cat: 'mobo', name: 'form factor', stated: (l) => titleBoard(l.title), field: (l) => (l.formFactor === 'Άλλο' ? null : l.formFactor) },
  { cat: 'psu', name: 'form factor', stated: (l) => titlePsuForm(l.title), field: (l) => l.formFactor },
  { cat: 'case', name: 'size', stated: (l) => titleCaseSizes(l.title), field: (l) => (l.size === 'Άλλο' ? null : l.size) },
];

const regex = [];
for (const c of CHECKS) {
  const ls = latest(c.cat).listings;
  let states = 0;
  const contra = [];
  const missing = [];
  for (const l of ls) {
    const s = c.stated(l);
    if (!s.length) continue;
    states++;
    const f = c.field(l);
    if (f == null) missing.push({ l, s });
    else if (!s.includes(f)) contra.push({ l, s, f });
  }
  const bySource = {};
  for (const x of contra) bySource[x.l.source] = (bySource[x.l.source] ?? 0) + 1;
  regex.push({
    cat: c.cat,
    field: c.name,
    listings: ls.length,
    titleStates: states,
    contradictions: contra.length,
    contradictionsBySource: bySource,
    missingWhileTitleStates: missing.length,
    examples: contra.slice(0, MAX_EXAMPLES).map((x) => ({ source: x.l.source, title: x.l.title, field: x.f, titleSays: x.s.join(' / '), id: x.l.id })),
    missingExamples: missing.slice(0, 5).map((x) => ({ source: x.l.source, title: x.l.title, titleSays: x.s.join(' / ') })),
  });
}

// ---------- 2. Spot-check sample ----------

const KEYS = {
  gpu: ['chip', 'vram', 'partner', 'memType', 'lengthMm', 'minPsu'],
  cpu: ['chip', 'socket', 'cores', 'packaging', 'igpu', 'coolerIncluded', 'tdp'],
  mobo: ['chip', 'chipset', 'socket', 'formFactor', 'memory', 'wifi', 'ramSlots'],
  ram: ['chip', 'type', 'capacity', 'modules', 'speed', 'cas', 'formFactor'],
  storage: ['chip', 'media', 'iface', 'pcie', 'formFactor', 'capacity', 'tier', 'dram', 'readMBs', 'rpm'],
  psu: ['chip', 'watts', 'efficiency', 'modular', 'formFactor'],
  case: ['chip', 'size', 'maxBoard', 'gpuMaxMm', 'coolerMaxMm', 'fanSlots', 'window'],
  fan: ['chip', 'size', 'pack', 'connector', 'pwm', 'rgb'],
  cooler: ['chip', 'type', 'radiator', 'sockets', 'heightMm', 'rgb'],
};

const samples = {};
for (const cat of CATS) {
  const random = rng(SEED + CATS.indexOf(cat));
  const spec = specsCache(cat);
  const ls = [...latest(cat).listings].sort((a, b) => a.id.localeCompare(b.id)); // stable order before sampling
  samples[cat] = sample(ls, 20, random).map((l, i) => ({
    n: i + 1,
    id: l.id,
    source: l.source,
    title: l.title,
    url: l.url,
    fields: Object.fromEntries(KEYS[cat].map((k) => [k, l[k] ?? null])),
    specCache: spec[l.id] ? Object.fromEntries(Object.entries(spec[l.id]).filter(([k]) => k !== 'checked')) : null,
  }));
}
writeOut('spotcheck-sample.json', { seed: SEED, note: 'Listings sampled uniformly per category (sorted by id, then mulberry32 + partial Fisher–Yates).', samples });

// Verdicts (hand-judged): { cat: [{ n, verdict: 'ok' | 'error' | 'unclear', note }] }
const verdictPath = join(OUT, 'spotcheck-verdicts.json');
const spot = {};
if (existsSync(verdictPath)) {
  const v = readJson(verdictPath);
  for (const cat of CATS) {
    const vs = v.verdicts?.[cat] ?? [];
    const errors = vs.filter((x) => x.verdict === 'error').length;
    const unclear = vs.filter((x) => x.verdict === 'unclear').length;
    const missing = vs.filter((x) => x.verdict === 'missing').length;
    const n = vs.length;
    const [lo, hi] = wilson(errors, n);
    const [mlo, mhi] = wilson(missing, n);
    spot[cat] = { judged: n, errors, missing, unclear, rate: n ? errors / n : null, wilson95: [lo, hi], missingWilson95: [mlo, mhi] };
  }
}

writeOut('identity.json', { generated: 'node scripts/audit/data-quality/identity.mjs', seed: SEED, regex, spotcheck: spot });
for (const r of regex) {
  console.log(`${r.cat.padEnd(6)} ${r.field.padEnd(12)} title states ${r.titleStates}/${r.listings}, contradictions ${r.contradictions} ${JSON.stringify(r.contradictionsBySource)}, field missing ${r.missingWhileTitleStates}`);
}
for (const [cat, s] of Object.entries(spot)) {
  console.log(`spot ${cat}: ${s.errors}/${s.judged} errors, ${s.missing} missing, ${s.unclear} unclear, 95% Wilson ${(100 * s.wilson95[0]).toFixed(1)}–${(100 * s.wilson95[1]).toFixed(1)}%`);
}
