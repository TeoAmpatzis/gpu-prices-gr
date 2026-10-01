// Equivalence test: the site's results from the derived files (list.json / builder.json) must equal
// its results from the scraper's full files. Run from the repo root: npx tsx scripts/checks/data-equivalence.test.mts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const src = (p: string) => pathToFileURL(join(ROOT, 'src', p)).href;
const { CATEGORIES, CATEGORY_IDS } = await import(src('lib/categories.tsx'));
const { applyFilters, defaultFilters, allTimeLow, saleOf } = await import(src('lib/data.ts'));
const { listFile, builderFile } = await import(src('lib/derive.ts'));
const { fromColumns, expandHistory } = await import(src('lib/columns.ts'));
const B = await import(src('lib/builder.ts'));

const read = (cat: string, f: string, fb: unknown = {}) => {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'public/data', cat, f), 'utf8'));
  } catch {
    return fb;
  }
};

/** Same as ModelRow.weekChange (not exported there). */
function weekChange(points: { d: string; min: number }[] | undefined, current: number): number | null {
  if (!points?.length) return null;
  const cutoff = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const past = [...points].reverse().find((p) => p.d <= cutoff);
  return past ? current - past.min : null;
}

// Freeze "now" (Date.now and new Date()) so both sides see the same day; then move it a day ahead.
const RealDate = Date;
function freeze(ms: number) {
  class Fixed extends RealDate {
    constructor(...a: unknown[]) {
      if (a.length) super(...(a as [string]));
      else super(ms);
    }
    static now() {
      return ms;
    }
  }
  (globalThis as { Date: DateConstructor }).Date = Fixed as unknown as DateConstructor;
}

let failures = 0;
const fail = (msg: string) => {
  failures++;
  if (failures <= 25) console.log('  FAIL ' + msg);
};

const built = new RealDate().toISOString();
const allLatest: Record<string, unknown> = {};
for (const cat of CATEGORY_IDS) {
  const cfg = CATEGORIES[cat];
  const latest = read(cat, 'latest.json', null);
  allLatest[cat] = latest;
  const history = read(cat, 'history.json');
  const imported = read(cat, 'history_imported.json');
  const lf = listFile(cat, { latest, history, imported }, built);
  const listings = fromColumns(lf);
  const reduced = expandHistory(lf.hist);

  const d = defaultFilters(cfg.groups);
  const filterSets = [
    d,
    { ...d, segment: 'all' },
    { ...d, sort: 'price-asc' },
    { ...d, sort: 'discount', saleOnly: true },
    { ...d, segment: 'all', lowOnly: true },
    { ...d, query: 'a' },
    { ...d, sources: ['skroutz', 'bestprice'] },
  ];
  let compared = 0;
  for (const day of [0, 1]) {
    freeze(RealDate.parse(built) + day * 864e5);
    for (const f of filterSets) {
      const a = applyFilters(latest.listings, f, cfg, history, imported);
      const b = applyFilters(listings, f, cfg, reduced, lf.imported);
      if (a.length !== b.length) fail(`${cat} day+${day} ${JSON.stringify(f).slice(0, 60)}: ${a.length} vs ${b.length} models`);
      for (let i = 0; i < Math.min(a.length, b.length); i++) {
        const x = a[i];
        const y = b[i];
        const same =
          x.key === y.key &&
          x.chip === y.chip &&
          x.cheapest.id === y.cheapest.id &&
          x.cheapest.price === y.cheapest.price &&
          x.listings.length === y.listings.length &&
          JSON.stringify(x.sale) === JSON.stringify(y.sale) &&
          JSON.stringify(x.low) === JSON.stringify(y.low) &&
          JSON.stringify(x.bestTotal?.id) === JSON.stringify(y.bestTotal?.id) &&
          weekChange(history[x.key], x.cheapest.price) === weekChange(reduced[y.key], y.cheapest.price);
        if (!same) fail(`${cat} day+${day} #${i} ${x.key} / ${y.key}`);
        compared++;
      }
      // all-time low at other prices too (just under / at / over the lowest)
      for (const m of a.slice(0, 200)) {
        for (const p of [m.cheapest.price - 50, m.cheapest.price, m.cheapest.price * 0.5]) {
          const u = JSON.stringify(allTimeLow(history[m.key], imported[m.key], p));
          const v = JSON.stringify(allTimeLow(reduced[m.key], lf.imported[m.key], p));
          if (u !== v) fail(`${cat} allTimeLow ${m.key} @${p}: ${u} vs ${v}`);
        }
      }
    }
  }
  (globalThis as { Date: DateConstructor }).Date = RealDate;
  console.log(`${cat}: ${compared} model rows compared`);
}

// ---------- Builder ----------
const { file: bf, extra } = builderFile(allLatest, built);
const spec = (slot: string, m: { cheapest: Record<string, unknown> } & Record<string, unknown>) =>
  JSON.stringify({
    chip: m.chip,
    price: m.cheapest.price,
    url: m.cheapest.url,
    source: m.cheapest.source,
    rule: [
      slot === 'cpu' && [B.cpuSocket(m), B.cpuHasIgpu(m), B.cpuCooler(m), m.cheapest.cores],
      slot === 'mobo' && [B.moboSocket(m), B.moboMemory(m), B.moboForm(m), B.moboSlots(m), m.cheapest.chipset],
      slot === 'gpu' && [B.gpuLength(m), B.gpuPsu(m.cheapest), m.cheapest.vram],
      slot === 'case' && [
        B.caseBoard(m), B.caseBoardStated(m), B.caseGpuMax(m), B.caseCoolerMax(m), B.caseFanSlots(m), B.caseRadiators(m),
        B.caseFanMounts(m), B.caseFansIncluded(m), B.caseRadiatorSizes(m),
      ],
      slot === 'cooler' && [B.coolerSockets(m), B.coolerHeight(m), m.cheapest.type, m.cheapest.radiator],
      slot === 'ram' && [m.cheapest.type, m.cheapest.modules, m.cheapest.formFactor, m.cheapest.cas, m.cheapest.brand],
      slot === 'psu' && [m.cheapest.watts, m.cheapest.formFactor, m.cheapest.modular, m.cheapest.brand],
      slot === 'fan' && [
        m.cheapest.size, m.cheapest.pack, m.cheapest.pwm, m.cheapest.rgb,
        m.cheapest.connector, m.cheapest.airflowCfm, m.cheapest.pressureMm, m.cheapest.fanType,
      ],
      // Not m.group: the builder never reads it, and a one-row model takes it from its cheapest listing,
      // which can disagree with the most common value (one board listed as AM4 and AM5 by shops).
      m.pro, JSON.stringify(saleOf(m.listings, m.cheapest)?.pct ?? null),
    ],
  });
const oldModels: Record<string, any[]> = {};
const newModels: Record<string, any[]> = {};
for (const slot of B.SLOTS) {
  const full = B.candidates(slot, B.slotModels(slot, (allLatest[slot] as { listings: unknown[] }).listings), {});
  const rows = fromColumns(bf.slots[slot]) as any[];
  for (const r of rows) { r.url = extra.urls[r.id] ?? r.url; if (!r.title) r.title = extra.titles[r.id] ?? ''; } // as Builder.tsx does
  const slim = B.candidates(slot, B.slotModels(slot, rows), {});
  oldModels[slot] = full;
  newModels[slot] = slim;
  const byKey = new Map(slim.map((m: any) => [m.key, m]));
  if (full.length !== slim.length) fail(`builder ${slot}: ${full.length} vs ${slim.length} models`);
  for (const m of full) {
    const n = byKey.get(m.key);
    if (!n) fail(`builder ${slot}: ${m.key} missing`);
    else {
      const s1 = spec(slot, m);
      const s2 = spec(slot, n);
      if (s1 !== s2) { let i = 0; while (s1[i] === s2[i]) i++; fail(`builder ${slot} ${m.key}: ...${s1.slice(Math.max(0, i - 60), i + 60)}\n      vs ...${s2.slice(Math.max(0, i - 60), i + 60)}`); }
    }
  }
  // Picker search, as Builder.tsx does it
  const cfg = CATEGORIES[slot];
  for (const q of ['corsair', 'am5', 'rtx 5070', 'ddr5', 'noctua', 'asus', '850', 'white']) {
    const hit = (ms: any[]) =>
      ms.filter((m) => m.listings.some((l: any) => cfg.searchText(l).toLowerCase().includes(q))).map((m) => m.key).sort().join('|');
    if (hit(full) !== hit(slim)) fail(`builder ${slot} search "${q}" differs`);
  }
  console.log(`builder ${slot}: ${full.length} models compared`);
}
// Graphics chip length ranges ("Likely fits"): the same from the rows as from the full data.
const ctxOld = B.fitContext(oldModels.gpu);
const ctxNew = B.fitContext(newModels.gpu);
const ctxJson = (c: any) => JSON.stringify([...c.chips.entries()].sort());
if (ctxJson(ctxOld) !== ctxJson(ctxNew)) fail('builder chip length ranges differ');
console.log(`builder chip length ranges: ${ctxOld.chips.size} chips with enough measured cards`);
// Compatibility with sample builds: one random part per slot, then every other slot's options and labels.
let rand = 7;
const pick = <T,>(xs: T[]) => xs[(rand = (rand * 48271) % 2147483647) % xs.length];
const labels: Record<string, number> = {};
for (let t = 0; t < 40; t++) {
  const slots = B.SLOTS.filter(() => pick([0, 1]) === 1);
  const buildOld: any = {};
  const buildNew: any = {};
  for (const s of slots) {
    const m = pick(oldModels[s]);
    if (!m) continue;
    buildOld[s] = m;
    buildNew[s] = newModels[s].find((x: any) => x.key === m.key);
  }
  for (const s of B.SLOTS) {
    const rated = (ms: any[], b: any, ctx: any) =>
      B.candidates(s, ms, b, ctx)
        .map((m: any) => `${m.key}=${B.rate(s, m, { ...b, [s]: undefined }, ctx).fit}`)
        .sort();
    const a = rated(oldModels[s], buildOld, ctxOld);
    const b = rated(newModels[s], buildNew, ctxNew);
    if (a.join('|') !== b.join('|')) fail(`builder compat test ${t} slot ${s} differs (build: ${Object.keys(buildOld).join(',')})`);
    for (const x of a) labels[x.split('=').pop()!] = (labels[x.split('=').pop()!] ?? 0) + 1;
  }
  const n1 = JSON.stringify(B.buildNotes(buildOld, ctxOld));
  const n2 = JSON.stringify(B.buildNotes(buildNew, ctxNew));
  if (n1 !== n2) fail(`builder notes test ${t} differ`);
}
console.log(`builder labels in the sample builds: ${JSON.stringify(labels)}`);
console.log(`coverage: ${JSON.stringify(bf.coverage)}`);
console.log(failures ? `\n${failures} FAILURES` : '\nALL EQUAL');
process.exit(failures ? 1 : 0);
