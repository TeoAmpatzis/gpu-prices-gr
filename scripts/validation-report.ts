// Writes docs/phase2/validation-report.md: every measured value in public/data/<cat>/latest.json that is
// outside its plausible range (src/data/validate), and what that changes in the builder's data.
// Run: npm run validation:report
// The file has no "generated at" time, so the same data gives the same file.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Category, Latest } from '../src/types';
import { CATEGORY_IDS } from '../src/lib/categories';
import { RANGES } from '../src/data/validate/ranges';
import { VALIDATION_MODE, validateLatest, type Rejection } from '../src/data/validate';
import { CONFLICT_CHECKS, conflicts, type Conflict } from '../src/data/validate/conflicts';
import { CATEGORIES, type CategoryConfig } from '../src/lib/categories';
import type { BaseListing } from '../src/types';
import { builderFile } from '../src/lib/derive';
import { fromColumns } from '../src/lib/columns';
// Resolved from this file, not the working directory, so the script runs from anywhere.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const OUT = join(ROOT, 'docs', 'phase2', 'validation-report.md');
const EXAMPLES = 10;
const BUILT_AT = '2026-01-01T00:00:00.000Z'; // any fixed value: it is not compared

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 3 });

const stated: Record<string, number> = {};
const rejections: Rejection[] = [];
const updated: string[] = [];
const raw: Partial<Record<Category, Latest>> = {};
const checked: Partial<Record<Category, Latest>> = {};

for (const cat of CATEGORY_IDS) {
  const path = join(ROOT, 'public', 'data', cat, 'latest.json');
  if (!existsSync(path)) continue; // category not scraped yet
  const latest = JSON.parse(readFileSync(path, 'utf8')) as Latest;
  const v = validateLatest(cat, latest, 'enforce'); // the lists below are what enforce changes
  Object.assign(stated, v.stated);
  rejections.push(...v.rejections);
  updated.push(`${cat}: ${latest.updatedAt}`);
  raw[cat] = latest;
  checked[cat] = v.latest;
}

const enforced = VALIDATION_MODE === 'enforce';
const lines: string[] = [];
lines.push('# Data validation report', '');
lines.push(
  'Measured values (lengths, heights, speeds, wattages) that fall outside the plausible range for their field. ' +
    'These are almost always scraping mistakes (for example a case "up to 3.502 mm"), not real measurements. ' +
    (enforced
      ? 'The site runs in enforce mode: each listed value is treated as "not stated" in the site\'s data files (list.v2.json, builder.json, the compatibility and product page files), ' +
        'so the compatibility checks say "unknown" instead of using it. The scraper\'s own files are not changed. ' +
        '`psu-watts` is report only (a wattage cannot be "not stated").'
      : 'The site runs in report mode: nothing is changed on the site; the owner approves the ranges before `VALIDATION_MODE` becomes `\'enforce\'`, ' +
        'which then treats the listed values as "not stated".'),
  '',
);
lines.push('Data times (`latest.updatedAt`):', '');
for (const u of updated) lines.push(`- ${u}`);
lines.push('', '## Summary', '');
lines.push('| Check | Field | Range | Mode | Values stated | Out of range | Distinct models out of range |');
lines.push('| --- | --- | --- | --- | ---: | ---: | ---: |');
for (const c of RANGES) {
  const rej = rejections.filter((r) => r.check === c.id);
  const models = new Set(rej.map((r) => r.chip)).size;
  lines.push(
    `| \`${c.id}\` | ${c.cat}.${c.field} | ${c.rangeText ?? `${fmt(c.min)}–${fmt(c.max)} ${c.unit}`} | ${c.reportOnly || !enforced ? 'report only' : 'enforced'} | ` +
      `${stated[c.id] ?? 0} | ${rej.length} | ${models} |`,
  );
}
lines.push('');

for (const c of RANGES) {
  const rej = rejections.filter((r) => r.check === c.id).sort((a, b) => cmp(a.chip, b.chip) || cmp(a.id, b.id));
  if (!rej.length) continue;
  lines.push(`## \`${c.id}\`: ${c.cat}.${c.field} ${c.rangeText ? `needs ${c.rangeText}` : `outside ${fmt(c.min)}–${fmt(c.max)} ${c.unit}`}`, '');
  lines.push(`${rej.length} value(s), ${new Set(rej.map((r) => r.chip)).size} model(s). Showing ${Math.min(EXAMPLES, rej.length)}.`, '');
  lines.push('| Model | Value | Title | Listing id |', '| --- | ---: | --- | --- |');
  for (const r of rej.slice(0, EXAMPLES)) {
    lines.push(`| ${cell(r.chip)} | ${fmt(r.value)} ${c.unit} | ${cell(cut(r.title, 80))} | \`${r.id}\` |`);
  }
  lines.push('');
  if (c.id === 'ram-ddr4-speed' || c.id === 'ram-ddr5-speed') {
    lines.push('RAM model names keep the speed the scraper read (e.g. "60000MHz"); the fix for the names is in the scraper (queued for main).', '');
  }
}

// Builder rows changed: the same builder files built from the raw and from the checked data.
type Cols = { cols: string[]; rows: unknown[][] };
const builderRows = (all: Partial<Record<Category, Latest>>) => {
  const out: Record<string, Map<string, Record<string, unknown>>> = {};
  const { file, lazy } = builderFile(all, BUILT_AT);
  const put = (slot: string, c: Cols) => {
    const m = new Map<string, Record<string, unknown>>();
    for (const r of fromColumns<Record<string, unknown>>(c as never)) m.set(String(r['id']), r);
    out[slot] = m;
  };
  for (const [slot, c] of Object.entries(file.slots)) put(slot, c as unknown as Cols);
  for (const [slot, f] of Object.entries(lazy)) put(slot, f as unknown as Cols);
  return out;
};
const before = builderRows(raw);
const after = builderRows(checked);
lines.push('## Builder rows changed', '');
lines.push(
  "builder.json built from the scraper's raw data and again from the checked data, rows matched by listing id " +
    '(a row is one model; its value is the one the builder uses for that model). Rows whose value differs:',
  '',
);
lines.push('| Check | Builder rows changed | Rows in the slot |', '| --- | ---: | ---: |');
const detail: string[] = [];
for (const c of RANGES) {
  const b = before[c.cat];
  const a = after[c.cat];
  const isField = !!b && [...b.values()].some((r) => c.field in r);
  if (!isField || !a) {
    lines.push(`| \`${c.id}\` | not a builder field | ${b?.size ?? 0} |`);
    continue;
  }
  const changed: { chip: string; from: unknown; to: unknown; id: string }[] = [];
  for (const [id, r] of b) {
    const n = a.get(id);
    if (c.applies && !c.applies(r)) continue; // e.g. the DDR4 check only looks at DDR4 rows
    if (n && r[c.field] !== n[c.field]) changed.push({ id, chip: String(r['chip']), from: r[c.field], to: n[c.field] });
  }
  lines.push(`| \`${c.id}\` | ${changed.length} | ${b.size} |`);
  if (!changed.length) continue;
  changed.sort((x, y) => cmp(x.chip, y.chip) || cmp(x.id, y.id));
  detail.push(`### \`${c.id}\`: ${c.cat}.${c.field}`, '', `Showing ${Math.min(EXAMPLES, changed.length)} of ${changed.length}.`, '');
  detail.push('| Model | Before | After | Listing id |', '| --- | ---: | ---: | --- |');
  for (const x of changed.slice(0, EXAMPLES)) {
    detail.push(
      `| ${cell(x.chip)} | ${typeof x.from === 'number' ? fmt(x.from) : String(x.from)} | ${x.to === null ? 'not stated' : String(x.to)} | \`${x.id}\` |`,
    );
  }
  detail.push('');
}
lines.push('');
const unmatched = Object.keys(before).reduce((n, slot) => n + [...before[slot].keys()].filter((id) => !after[slot]?.has(id)).length, 0);
lines.push(`Rows only in one of the two builds: ${unmatched}.`, '');
lines.push(...detail);

// Conflicts (step 5, task 2): a value one page states against another page, the model's listings or its size class.
{
  const all: Conflict[] = [];
  const stating: Record<string, number> = {}; // "<cat>.<field>" -> models that state the value (after the ranges)
  for (const cat of CATEGORY_IDS) {
    const latest = checked[cat];
    if (!latest) continue;
    const specsPath = join(ROOT, 'public', 'data', cat, 'specs.json');
    const specs = existsSync(specsPath) ? (JSON.parse(readFileSync(specsPath, 'utf8')) as Record<string, Record<string, unknown>>) : {};
    const cfg = CATEGORIES[cat] as unknown as CategoryConfig<BaseListing>;
    for (const f of new Set(CONFLICT_CHECKS.filter((c) => c.cat === cat).map((c) => c.field))) {
      const seen = new Set<string>();
      for (const l of latest.listings) {
        const v = (l as unknown as Record<string, unknown>)[f === 'socketsTitle' ? 'sockets' : f]; // G4: models that state sockets
        if (v !== null && v !== undefined && v !== '' && v !== 'Άλλο') seen.add(cfg.modelKey(l as BaseListing));
      }
      stating[`${cat}.${f}`] = seen.size;
    }
    all.push(...conflicts(cat, latest, specs, 'enforce').conflicts);
  }
  const shown = (a: Conflict) => (a.action === 'title-socket' ? `title says ${a.values[0]}` : a.values.join(' / '));
  lines.push('## Conflicts', '');
  lines.push(
    'Second pass after the ranges (`src/data/validate/conflicts.ts`), on whole models. ' +
      '**G1** two product pages of a model state the same measurement and differ by more than the tolerance (case card length > 50 mm, case cooler clearance > 20 mm, cooler height > 20 mm): unknown. ' +
      '**G2** a value outside its size class (card length under 230 mm in a Midi/Full Tower, ATX/E-ATX board in an SFF / Cube, E-ATX in a Mini Tower) that two agreeing pages do not confirm: unknown. ' +
      '**G3** a model\'s listings disagree on the board size (case `maxBoard`, board `formFactor`): unknown, except a board whose name says ITX (not mATX): Mini ITX. ' +
      '**G4** a shop title names a socket (AM4, AM5, 1200, 1700, 1851) that the cooler\'s `sockets` lacks: `socketsTitle`. ' +
      '**G5** a board\'s chipset names its socket (H610 = LGA1700, B840 = AM5; table `CHIPSET_SOCKET`) and a listing says another socket: the chipset\'s socket. ' +
      `Mode: ${enforced ? 'enforced' : 'report only'}.`,
    '',
  );
  lines.push('| Check | Field | Models affected | Models stating the value | Share |', '| --- | --- | ---: | ---: | ---: |');
  for (const c of CONFLICT_CHECKS) {
    const n = all.filter((a) => a.check === c.id && a.cat === c.cat && a.field === c.field).length;
    const of = stating[`${c.cat}.${c.field}`] ?? 0;
    lines.push(`| ${c.id} | ${c.cat}.${c.field} | ${n} | ${of} | ${of ? `${((100 * n) / of).toFixed(1)}%` : '-'} |`);
  }
  const perSocket: Record<string, number> = {};
  for (const a of all.filter((x) => x.check === 'G4')) for (const s of String(a.values[0]).split(',')) perSocket[s] = (perSocket[s] ?? 0) + 1;
  const corrected = all.filter((a) => a.check === 'G3' && a.action === 'corrected').length;
  lines.push('', `Boards: ${corrected} corrected to Mini ITX by their name, ${all.filter((a) => a.check === 'G3' && a.cat === 'mobo').length - corrected} unknown.`);
  lines.push(`Boards whose socket was corrected by their chipset (G5): ${all.filter((a) => a.check === 'G5').length}.`);
  lines.push(`Cooler sockets named by a title but missing from the spec: ${Object.entries(perSocket).sort().map(([s, n]) => `${s} ${n}`).join(', ')}.`);
  lines.push('', `${all.length} conflict(s) in all. Every one:`, '');
  lines.push('| Check | Category | Field | Model | Values | Action |', '| --- | --- | --- | --- | --- | --- |');
  const order = (a: Conflict) => `${a.check}|${a.cat}|${a.field}|${a.model}`;
  for (const a of [...all].sort((x, y) => cmp(order(x), order(y)))) {
    lines.push(`| ${a.check} | ${a.cat} | ${a.field} | ${cell(a.model)} | ${cell(shown(a))} | ${a.action} |`);
  }
  lines.push('');
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, lines.join('\n'));
console.log(`wrote ${OUT}: ${rejections.length} value(s) out of range`);
