// Writes docs/phase2/validation-report.md: every measured value in public/data/<cat>/latest.json that is
// outside its plausible range (src/data/validate). Run: npm run validation:report
// The file has no "generated at" time, so the same data gives the same file.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Latest } from '../src/types';
import { CATEGORY_IDS } from '../src/lib/categories';
import { REVIEW_BANDS, RANGES } from '../src/data/validate/ranges';
import { validateLatest, type Rejection } from '../src/data/validate';

const OUT = join(process.cwd(), 'docs', 'phase2', 'validation-report.md');
const EXAMPLES = 10;
const BAND_ROWS = 60;

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 3 });

const stated: Record<string, number> = {};
const rejections: Rejection[] = [];
const updated: string[] = [];
const bandRows: Record<string, Map<string, { values: Set<number>; listings: number }>> = {};
for (const b of REVIEW_BANDS) bandRows[b.id] = new Map();

for (const cat of CATEGORY_IDS) {
  const path = join(process.cwd(), 'public', 'data', cat, 'latest.json');
  if (!existsSync(path)) continue; // category not scraped yet
  const latest = JSON.parse(readFileSync(path, 'utf8')) as Latest;
  const v = validateLatest(cat, latest, 'report');
  Object.assign(stated, v.stated);
  rejections.push(...v.rejections);
  updated.push(`${cat}: ${latest.updatedAt}`);
  for (const band of REVIEW_BANDS.filter((b) => b.cat === cat)) {
    for (const l of latest.listings) {
      const x = (l as unknown as Record<string, unknown>)[band.field];
      if (typeof x !== 'number' || !Number.isFinite(x) || x < band.min || x >= band.below) continue;
      const row = bandRows[band.id].get(l.chip) ?? { values: new Set<number>(), listings: 0 };
      row.values.add(x);
      row.listings++;
      bandRows[band.id].set(l.chip, row);
    }
  }
}

const lines: string[] = [];
lines.push('# Data validation report', '');
lines.push(
  'Measured values (lengths, heights, speeds, wattages) that fall outside the plausible range for their field. ' +
    'These are almost always scraping mistakes (for example a case "up to 3.502 mm"), not real measurements. ' +
    'In report mode nothing is changed on the site; the owner approves the ranges before `VALIDATION_MODE` becomes `\'enforce\'`, ' +
    'which then treats the listed values as "not stated".',
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
    `| \`${c.id}\` | ${c.cat}.${c.field} | ${fmt(c.min)}–${fmt(c.max)} ${c.unit} | ${c.reportOnly ? 'report only' : 'enforced'} | ` +
      `${stated[c.id] ?? 0} | ${rej.length} | ${models} |`,
  );
}
lines.push('');

for (const c of RANGES) {
  const rej = rejections.filter((r) => r.check === c.id).sort((a, b) => cmp(a.chip, b.chip) || cmp(a.id, b.id));
  if (!rej.length) continue;
  lines.push(`## \`${c.id}\`: ${c.cat}.${c.field} outside ${fmt(c.min)}–${fmt(c.max)} ${c.unit}`, '');
  lines.push(`${rej.length} value(s), ${new Set(rej.map((r) => r.chip)).size} model(s). Showing ${Math.min(EXAMPLES, rej.length)}.`, '');
  lines.push('| Model | Value | Title | Listing id |', '| --- | ---: | --- | --- |');
  for (const r of rej.slice(0, EXAMPLES)) {
    lines.push(`| ${cell(r.chip)} | ${fmt(r.value)} ${c.unit} | ${cell(cut(r.title, 80))} | \`${r.id}\` |`);
  }
  lines.push('');
}

for (const b of REVIEW_BANDS) {
  const rows = [...bandRows[b.id].entries()].sort((x, y) => cmp(x[0], y[0]));
  lines.push(`## Review band \`${b.id}\`: ${b.cat}.${b.field} from ${b.min} to under ${b.below}`, '');
  lines.push(`${b.note} (Report only: these values are kept in every mode.)`, '');
  lines.push(`${rows.length} model(s).`, '');
  lines.push('| Model | Value(s) | Listings |', '| --- | --- | ---: |');
  for (const [chip, row] of rows.slice(0, BAND_ROWS)) {
    lines.push(`| ${cell(chip)} | ${[...row.values].sort((p, q) => p - q).map(fmt).join(', ')} | ${row.listings} |`);
  }
  if (rows.length > BAND_ROWS) lines.push('', `… and ${rows.length - BAND_ROWS} more`);
  lines.push('');
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, lines.join('\n'));
console.log(`wrote ${OUT}: ${rejections.length} value(s) out of range`);
