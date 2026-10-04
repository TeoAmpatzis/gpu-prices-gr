// Phase 0 (v2 audit, B6 item 6): check v1's recommended builds (scripts/audit/recommender.mts) against the
// plan's "Σύστημα προτάσεων": minimums per use, rule 28 (gaming CPU ≥ 6 cores), rule 29 (VRAM minimum),
// the CPU–GPU balance rule at 1080p (rules 27 and 30) with PROVISIONAL tiers
// (docs/audit/recommender/tiers-provisional.json), total within the budget, no missing part, PSU ≥ the
// recommended wattage. Writes check.json (every build with its failures) and check.md (counts, 20 worst).
//
// v1 uses → plan uses: gaming → Gaming 1080p (v1 doesn't ask the resolution; 1080p has the lowest card
// minimums); everyday → Γραφείο; creating → Δημιουργία; unsure (no plan equivalent) → Γραφείο
// minimums, plus the gaming card checks (VRAM, balance) when the build has a graphics card.
//
//   node scripts/audit/recommender-check.mjs docs/audit/recommender

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
const { builds } = JSON.parse(readFileSync(join(dir, 'builds.json'), 'utf8'));
const tiers = JSON.parse(readFileSync(join(dir, 'tiers-provisional.json'), 'utf8'));

const MIN = {
  gaming: { name: 'Gaming 1080p', cores: 6, ramGb: 16, diskGb: 1000, vram: 8, gpu: true },
  everyday: { name: 'Γραφείο', cores: 6, ramGb: 16, diskGb: 500, vram: null, gpu: false, igpu: true },
  creating: { name: 'Δημιουργία', cores: 8, ramGb: 32, diskGb: 2000, vram: null, gpu: false },
  unsure: { name: 'Γραφείο (+ gaming card checks)', cores: 6, ramGb: 16, diskGb: 500, vram: 8, gpu: false, igpu: true },
};
const REQUIRED = ['cpu', 'mobo', 'ram', 'storage', 'case', 'psu'];

function check(b) {
  const m = MIN[b.use];
  const p = b.parts;
  const fails = [];
  let score = 0;
  const add = (code, text, s) => { fails.push({ code, text }); score += s; };
  if (b.total > b.budget) add('budget', `over budget by ${Math.round(b.total - b.budget)} € (+${Math.round((100 * (b.total - b.budget)) / b.budget)}%)`, Math.ceil((10 * (b.total - b.budget)) / b.budget));
  const missing = REQUIRED.filter((s) => !p[s]);
  if (m.gpu && !p.gpu) missing.push('gpu');
  if (!p.cooler && b.boxCooler !== true) missing.push('cooler');
  if (missing.length) add('missing', `missing ${missing.join(', ')}`, 2 * missing.length);
  if (b.status.no > 0) add('compat', `${b.status.no} incompatible check(s)`, 3);
  if (p.psu && b.requiredWatts && p.psu.watts < b.requiredWatts) add('psu', `PSU ${p.psu.watts} W < recommended ${b.requiredWatts} W`, 2);
  if (p.cpu) {
    if (p.cpu.cores != null && p.cpu.cores < m.cores) add(b.use === 'gaming' ? 'r28-cores' : 'min-cores', `${p.cpu.chip}: ${p.cpu.cores} cores < ${m.cores}`, b.use === 'gaming' ? 4 : 2);
    if (m.igpu && !p.gpu && !p.cpu.igpu) add('min-igpu', `${p.cpu.chip} has no integrated graphics and no card`, 3);
  }
  if (p.ram && p.ram.capacity < m.ramGb) add('min-ram', `RAM ${p.ram.capacity} GB < ${m.ramGb} GB`, p.ram.capacity < m.ramGb / 2 ? 2 : 1);
  if (p.storage) {
    if (p.storage.capacity < m.diskGb) add('min-disk', `drive ${p.storage.capacity} GB < ${m.diskGb} GB`, 1);
    if (p.storage.iface !== 'NVMe') add('min-nvme', `drive is ${p.storage.media} ${p.storage.iface}, not NVMe`, 1);
  }
  const gamingCard = p.gpu && (b.use === 'gaming' || b.use === 'unsure');
  if (gamingCard) {
    if (p.gpu.vram < m.vram) add('r29-vram', `${p.gpu.chip} ${p.gpu.vram} GB < ${m.vram} GB VRAM`, p.gpu.vram < 4 ? 3 : 1);
    const ct = tiers.cpu[p.cpu?.chip];
    const gt = tiers.gpu[p.gpu.chip];
    if (ct != null && gt != null) {
      if (ct < gt) add('r27-balance', `CPU tier ${ct} < card tier ${gt} at 1080p (${p.cpu.chip} + ${p.gpu.chip})`, 2 * (gt - ct));
      if (ct > gt + 2) add('r30-balance', `CPU tier ${ct} > card tier ${gt} + 2 (${p.cpu.chip} + ${p.gpu.chip})`, 0.5 * (ct - gt - 2));
    } else add('no-tier', `no provisional tier for ${ct == null ? p.cpu?.chip : p.gpu.chip}`, 0);
  }
  return { fails, score };
}

const checked = builds.map((b) => ({ ...b, ...check(b) }));
writeFileSync(join(dir, 'check.json'), `${JSON.stringify(checked.map(({ strategy, use, budget, total, parts, fails, score }) => ({ strategy, use, budget, total, cpu: parts.cpu?.chip, cores: parts.cpu?.cores, gpu: parts.gpu ? `${parts.gpu.chip} ${parts.gpu.vram}GB` : null, ram: parts.ram?.chip, storage: parts.storage?.chip, psu: parts.psu?.chip, score, fails: fails.map((f) => f.text) })), null, 1)}\n`);

const STRATS = ['first', 'within', 'suggested', 'value', 'valueCpu'];
const USES = ['gaming', 'everyday', 'creating', 'unsure'];
const CODES = ['budget', 'missing', 'compat', 'psu', 'r28-cores', 'min-cores', 'min-igpu', 'min-ram', 'min-disk', 'min-nvme', 'r29-vram', 'r27-balance', 'r30-balance'];
const lines = [];
lines.push('| Way of following v1 | Use | Builds | Failing ≥ 1 check | ' + CODES.join(' | ') + ' |');
lines.push('| --- | --- | --- | --- | ' + CODES.map(() => '---').join(' | ') + ' |');
for (const s of STRATS) for (const u of USES) {
  const bs = checked.filter((b) => b.strategy === s && b.use === u);
  const n = (code) => bs.filter((b) => b.fails.some((f) => f.code === code)).length;
  lines.push(`| ${s} | ${u} | ${bs.length} | ${bs.filter((b) => b.fails.length).length} | ${CODES.map(n).join(' | ')} |`);
}
const all = checked.length;
const failing = checked.filter((b) => b.fails.length).length;
const balance2 = checked.filter((b) => b.fails.some((f) => f.code === 'r27-balance' && Number(/tier (\d+) < card tier (\d+)/.exec(f.text).slice(1).reduce((a, c) => c - a)) >= 2)).length;
lines.push('', `Total: ${all} builds, ${failing} fail at least one check; CPU weaker than the card by 2+ provisional tiers: ${balance2}.`);
lines.push('', '### 20 worst (distinct builds; the worst budget of each, with where else the same parts come out)', '', '| # | Way · use · budget | Total | CPU | Card | RAM | Drive | Failed checks | Same parts also from |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
// The same parts recur across uses, ways and budgets: one row per distinct set of parts, its worst case.
const groups = new Map();
for (const b of [...checked].sort((a, c) => c.score - a.score || a.budget - c.budget)) {
  const k = ['cpu', 'mobo', 'ram', 'gpu', 'storage', 'case', 'psu'].map((s) => b.parts[s]?.key ?? '-').join('|');
  if (!groups.has(k)) groups.set(k, { worst: b, also: [] });
  else groups.get(k).also.push(b);
}
const worst = [...groups.values()].filter((g) => g.worst.fails.length).slice(0, 20);
worst.forEach(({ worst: b, also }, i) => {
  const where = [...new Set(also.map((x) => `${x.strategy} · ${x.use}`))];
  const budgets = also.map((x) => x.budget);
  lines.push(`| ${i + 1} | ${b.strategy} · ${b.use} · ${b.budget} € | ${b.total.toFixed(2)} € | ${b.parts.cpu?.chip ?? '—'} (${b.parts.cpu?.cores ?? '?'} cores) | ${b.parts.gpu ? `${b.parts.gpu.chip} ${b.parts.gpu.vram}GB` : '—'} | ${b.parts.ram?.chip ?? '—'} | ${b.parts.storage?.chip ?? '—'} | ${b.fails.map((f) => f.text).join('; ')} | ${also.length ? `${also.length} more: ${where.join(', ')}; budgets ${Math.min(...budgets)}–${Math.max(...budgets)} €` : '—'} |`);
});
writeFileSync(join(dir, 'check.md'), `${lines.join('\n')}\n`);
console.log(lines.join('\n'));
