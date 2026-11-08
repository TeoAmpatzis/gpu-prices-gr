/* eslint-disable @typescript-eslint/no-explicit-any -- a dev check script on dynamically imported modules and JSON */
// Audit of the deal ("on sale"), "lowest ever" and Recommended signals against the site's own price history
// (design 2026-11-08 section 7). Needs a build (`npm run build`) for dist/data and the scraper's full history in
// public/data/<cat>/history.json. Run from the repo root: npx tsx scripts/checks/deal-audit.mts [--strict]
// Precision: a flagged model really is under its own 30-day median. Recall: of the models at least 8% under it, how many are flagged.
// With --strict the process exits 1 when a target is missed (targets of section 7); without it the table is only printed.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const src = (p: string) => pathToFileURL(join(ROOT, 'src', p)).href;
const { CATEGORIES, CATEGORY_IDS } = await import(src('lib/categories.tsx'));
const { applyFilters, defaultFilters, decodeList } = await import(src('lib/data.ts'));

const TARGET = { dealPrecision: 0.9, lowPrecision: 0.9, recall: 0.6 };
const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) / 2)];
const today = new Date().toISOString().slice(0, 10);
const day = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

const t = { deals: 0, dealsReal: 0, lows: 0, lowsReal: 0, genuine: 0, flagged: 0, top40Suspect: 0 };
const rows: string[] = [];
for (const cat of CATEGORY_IDS) {
  const cfg = CATEGORIES[cat];
  const data = decodeList(JSON.parse(readFileSync(join(ROOT, 'dist/data', cat, 'list.v2.json'), 'utf8')));
  const hist = JSON.parse(readFileSync(join(ROOT, 'public/data', cat, 'history.json'), 'utf8'));
  const models = applyFilters(data.latest.listings, { ...defaultFilters(cfg.groups), sort: 'model' as const }, cfg, data.history, data.imported);
  const recent = (key: string): number[] => (hist[key] ?? []).filter((p: { d: string }) => p.d >= day(37) && p.d < today).map((p: { min: number }) => p.min);
  const under = (m: { key: string; cheapest: { price: number } }): number | null => {
    const r = recent(m.key);
    return r.length < 5 ? null : ((median(r) - m.cheapest.price) / median(r)) * 100;
  };
  // `deal` (history based, design WS2) when the build has it, else the shops' badge (`sale`, the old behaviour).
  const isDeal = (m: any) => (m.deal !== undefined ? m.deal : m.sale);
  const isLow = (m: any) => (m.lowest !== undefined ? m.lowest : m.low);
  let deals = 0, dealsReal = 0, lows = 0, lowsReal = 0, genuine = 0, flagged = 0;
  for (const m of models as any[]) {
    const u = under(m);
    if (isDeal(m)) { deals++; if (u != null && u >= 3) dealsReal++; }
    if (isLow(m)) { lows++; if (u != null && u >= 3) lowsReal++; }
    if (u != null && recent(m.key).length >= 10 && u >= 8) { genuine++; if (isDeal(m) || isLow(m)) flagged++; }
  }
  // Top 40 of Recommended: a model whose cheapest listing is under 25% of the median of its own other listings
  // (3 or more) is a wrong price that got through (src/lib/sanity.ts leaves those out of the build).
  let suspect = 0;
  for (const m of (models as any[]).slice(0, 40)) {
    const others = m.listings.filter((l: any) => l !== m.cheapest).map((l: any) => l.price);
    if (others.length >= 3 && m.cheapest.price < 0.25 * median(others)) suspect++;
  }
  Object.assign(t, { deals: t.deals + deals, dealsReal: t.dealsReal + dealsReal, lows: t.lows + lows, lowsReal: t.lowsReal + lowsReal, genuine: t.genuine + genuine, flagged: t.flagged + flagged, top40Suspect: t.top40Suspect + suspect });
  rows.push(`${cat.padEnd(8)} deals ${String(deals).padStart(3)} (real ${String(dealsReal).padStart(3)}) | lows ${String(lows).padStart(3)} (real ${String(lowsReal).padStart(3)}) | genuine drops ${String(genuine).padStart(3)}, flagged ${String(flagged).padStart(3)} | top-40 suspect ${suspect}`);
}
const pct = (a: number, b: number) => (b ? a / b : 1);
console.log(rows.join('\n'));
const result = {
  dealPrecision: pct(t.dealsReal, t.deals),
  lowPrecision: pct(t.lowsReal, t.lows),
  recall: pct(t.flagged, t.genuine),
};
console.log(`\ndeal precision ${(100 * result.dealPrecision).toFixed(0)}% (target >= ${100 * TARGET.dealPrecision}%) | lowest precision ${(100 * result.lowPrecision).toFixed(0)}% (target >= ${100 * TARGET.lowPrecision}%) | recall ${(100 * result.recall).toFixed(0)}% (target >= ${100 * TARGET.recall}%) | suspect prices in top 40: ${t.top40Suspect} (target 0)`);
const missed = result.dealPrecision < TARGET.dealPrecision || result.lowPrecision < TARGET.lowPrecision || result.recall < TARGET.recall || t.top40Suspect > 0;
if (process.argv.includes('--strict') && missed) process.exit(1);
