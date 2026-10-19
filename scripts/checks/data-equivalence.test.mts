// Equivalence test: the site's results from the derived files (list.v2.json / builder.json) must equal
// its results from the scraper's full files. Run from the repo root: npx tsx scripts/checks/data-equivalence.test.mts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const src = (p: string) => pathToFileURL(join(ROOT, 'src', p)).href;
const { CATEGORIES, CATEGORY_IDS } = await import(src('lib/categories.tsx'));
const { applyFilters, defaultFilters, allTimeLow, saleOf } = await import(src('lib/data.ts'));
const { listFile, builderFile, reduceHistory } = await import(src('lib/derive.ts'));
const { implausibleDips, isDipPrice, sharedImportedDays, sharedImportedLows, importGlitches, untrustedPoints, withoutSharedLow } = await import(src('lib/dips.ts'));
const { fromColumns, decodeHist, decodePhotos } = await import(src('lib/columns.ts'));
const { productImage } = await import(src('lib/images.ts'));
const { createHash } = await import('node:crypto');
const B = await import(src('lib/builder.ts'));
const { VALIDATION_MODE, validateLatest } = await import(src('data/validate/index.ts'));

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
  console.log('  FAIL ' + msg);
};
// Differences between the scraper's FULL history and the list file's dip-stripped history (C6, src/lib/dips.ts).
// Expected by design, so they are counted apart and never mixed with regressions.
let c6Diffs = 0;
// Task 7b (expected by design, counted apart): models whose all-time low or week change differ between the C6-only
// rules and the list file, because an imported low that 3+ models of the category share is ignored and an imported
// day whose value 3+ models share on that day, or that equals such a shared low (in a run of ≤ 3 days, ≥ 5% under its
// neighbours), is left out like a dip. Every one of them must be a model 7b touches (else: FAIL).
const t7bDiffs: Record<string, Set<string>> = {};
const t7bTouched: Record<string, number> = {};

const built = new RealDate().toISOString();
const allLatest: Record<string, unknown> = {};
for (const cat of CATEGORY_IDS) {
  const cfg = CATEGORIES[cat];
  const rawLatest = read(cat, 'latest.json', null);
  // like the build: out-of-range values are "not stated" on both sides of the comparison
  const latest = rawLatest ? validateLatest(cat, rawLatest, VALIDATION_MODE).latest : rawLatest;
  allLatest[cat] = latest;
  const history = read(cat, 'history.json');
  const imported = read(cat, 'history_imported.json');
  // Photos: the old list.json held img[key] = "<cat>/<id>" (sha1 of cat NUL key); a fake images index with every 2nd id.
  const sha = (k: string) => createHash('sha1').update(`${cat}\0${k}`, 'utf8').digest('hex').slice(0, 12);
  const hasId = (id: string) => parseInt(id.slice(0, 4), 16) % 2 === 0;
  const lf = listFile(cat, { latest, history, imported }, built, (c: string, k: string) => (hasId(sha(k)) ? `${c}/${sha(k)}` : undefined));
  // What the list file carried before the compact form: the dip-stripped reduction in the old shape, applied to
  // the build day exactly as listFile did (reduceHistory + implausibleDips, dips also dropped from an imported low).
  const day0 = built.slice(0, 10);
  const curKeys = new Set(latest.listings.map((l: { [k: string]: unknown }) => cfg.modelKey(l)));
  const oldHist: Record<string, { d: string; min: number }[]> = {};
  const oldImported: Record<string, { low?: number } | number | string> = Object.fromEntries(Object.entries(imported).filter(([k]) => curKeys.has(k)));
  for (const [k, pts] of Object.entries(history) as [string, { d: string; min: number }[]][]) {
    if (!curKeys.has(k)) continue;
    const dips = implausibleDips(pts);
    const red = reduceHistory(dips.size ? pts.filter((p) => !dips.has(p)) : pts, day0);
    if (red.length) oldHist[k] = red.map(([d, min]: [string, number]) => ({ d, min }));
    const imp = oldImported[k] as { low?: number } | undefined;
    if (dips.size && typeof imp === 'object' && imp.low != null && isDipPrice(imp.low, dips)) oldImported[k] = { ...imp, low: undefined };
  }
  // The same from the full files with task 7b on top (src/lib/dips.ts, reproduced here from the raw files, not via
  // listFile): what the list file must give exactly. `touched` = the models 7b may change.
  const bad = sharedImportedLows(imported);
  const sharedDays = sharedImportedDays(history);
  const newHist: Record<string, { d: string; min: number }[]> = {};
  const newImported: Record<string, { low?: number } | number | string> = {};
  const touched = new Set<string>();
  for (const [k, imp] of Object.entries(imported) as [string, { d: string; low?: number } | string][]) {
    if (!curKeys.has(k)) continue;
    newImported[k] = withoutSharedLow(imp, bad);
    if (newImported[k] !== imp) touched.add(k);
  }
  for (const [k, pts] of Object.entries(history) as [string, { d: string; min: number; i?: 1 }[]][]) {
    if (!curKeys.has(k)) continue;
    const glitches = importGlitches(pts, sharedDays, bad);
    if (glitches.size) touched.add(k);
    const marked = pts.map((p) => (glitches.has(p) ? { ...p, g: 1 } : p));
    const dips = untrustedPoints(marked);
    const red = reduceHistory(marked.filter((p) => !dips.has(p)), day0);
    if (red.length) newHist[k] = red.map(([d, min]: [string, number]) => ({ d, min }));
    const imp = newImported[k] as { low?: number } | undefined;
    if (dips.size && typeof imp === 'object' && imp.low != null && isDipPrice(imp.low, dips)) newImported[k] = { ...imp, low: undefined };
  }
  t7bTouched[cat] = touched.size;
  t7bDiffs[cat] ??= new Set();
  const listings = fromColumns(lf);
  const reduced = decodeHist(lf);
  const photos = decodePhotos(lf);

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
      const pre = applyFilters(latest.listings, f, cfg, oldHist, oldImported); // C6 only (before task 7b)
      const a = applyFilters(latest.listings, f, cfg, newHist, newImported);
      const full = applyFilters(latest.listings, f, cfg, history, imported);
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
          weekChange(newHist[x.key], x.cheapest.price) === weekChange(reduced[y.key], y.cheapest.price);
        if (!same) fail(`${cat} day+${day} #${i} ${x.key} / ${y.key}`);
        const oldPhoto = hasId(sha(x.key)) ? `/img/${cat}/${sha(x.key)}` : null;
        if ((productImage(cat, y.key, photos.has(y.key))?.src ?? null) !== oldPhoto) fail(`${cat} photo ${y.key}`);
        compared++;
      }
      // Task 7b: C6-only vs 7b, per model (the order shifts with a changed low, so by key, not by position).
      const preBy = new Map(pre.map((m: { key: string }) => [m.key, m]));
      for (const m of a) {
        const o = preBy.get(m.key);
        const differs =
          !o || JSON.stringify(o.low) !== JSON.stringify(m.low) || weekChange(oldHist[m.key], m.cheapest.price) !== weekChange(newHist[m.key], m.cheapest.price);
        if (!differs) continue;
        if (o && touched.has(m.key)) t7bDiffs[cat].add(m.key);
        else if (!o && (f as { lowOnly?: boolean }).lowOnly && touched.has(m.key)) t7bDiffs[cat].add(m.key); // newly at its all-time low
        else fail(`${cat} day+${day} ${m.key}: differs from the C6-only rules but task 7b does not touch it`);
      }
      for (const o of pre) if (!a.some((m: { key: string }) => m.key === o.key)) {
        if ((f as { lowOnly?: boolean }).lowOnly && touched.has(o.key)) t7bDiffs[cat].add(o.key);
        else fail(`${cat} day+${day} ${o.key}: missing vs the C6-only rules`);
      }
      for (let i = 0; i < full.length; i++) {
        const o = pre.find((m: { key: string }) => m.key === full[i].key);
        if (!o || JSON.stringify(o.low) !== JSON.stringify(full[i].low) || weekChange(history[o.key], o.cheapest.price) !== weekChange(oldHist[o.key], o.cheapest.price)) c6Diffs++;
      }
      // all-time low at other prices too (just under / at / over the lowest)
      for (const m of a.slice(0, 200)) {
        for (const p of [m.cheapest.price - 50, m.cheapest.price, m.cheapest.price * 0.5]) {
          const u = JSON.stringify(allTimeLow(newHist[m.key], newImported[m.key], p));
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
const { file: bf, extra, lazy } = builderFile(allLatest, built);
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
        B.caseFanMounts(m), B.caseFansIncluded(m), B.caseRadiatorSizes(m), m.listings.some((l: any) => l.hasFans),
      ],
      slot === 'cooler' && [B.coolerSockets(m), B.coolerHeight(m), m.cheapest.type, m.cheapest.radiator],
      slot === 'storage' && [
        m.cheapest.media, m.cheapest.iface, m.cheapest.pcie, m.cheapest.formFactor, m.cheapest.capacity, m.cheapest.tier,
        m.cheapest.dram, m.cheapest.readMBs, m.cheapest.tbw,
      ],
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
  // Lazy slots (storage) come from their own file, links and titles included.
  const rows = fromColumns(bf.slots[slot] ?? lazy[slot]) as any[];
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
console.log(`C6 dip differences, full history vs the list file (expected, not failures): ${c6Diffs} model rows`);
console.log('  (the old 84 "failures" came from comparing the scraper FULL history.json with the list file history, which has the C6 implausible dips removed since commit f198493; that comparison is only counted here, the pass/fail comparison is old list file vs new list file)');
const t7bTotal = Object.values(t7bDiffs).reduce((n, s) => n + s.size, 0);
console.log(`Task 7b differences, C6-only rules vs the list file (expected, not failures): ${t7bTotal} models`);
for (const [cat, keys] of Object.entries(t7bDiffs)) {
  const list = [...keys].sort();
  console.log(`  ${cat}: ${list.length} of ${t7bTouched[cat]} touched models${list.length ? ": " + list.slice(0, 12).join(", ") + (list.length > 12 ? `, … +${list.length - 12}` : "") : ""}`);
}
console.log(failures ? `\n${failures} FAILURES` : '\nALL EQUAL');
process.exit(failures ? 1 : 0);
