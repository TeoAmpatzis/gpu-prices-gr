// Section 1 of the data-quality audit: coverage of every field the v2 plan's rules (1–26) and
// per-category filters use, over all models, the most-listed quarter and the builder's offered rows.
// Run: node scripts/audit/data-quality/coverage.mjs  → docs/audit/data/coverage.json + coverage.md (tables)

import { CATS, builderRows, gpuPsuTable, groupModels, mdTable, pct, topQuarter, writeOut } from './lib.mjs';
import { cpuGeneration, cpuSeries, storageType } from './derive.mjs';

const has = (v) => v != null && v !== '';
const field = (name) => (l) => has(l[name]);
const NOT = null; // not collected

const isSsd = (l) => l.media === 'SSD';
const isNvme = (l) => storageType(l) === 'NVMe';
const isHdd = (l) => l.media === 'HDD';
const isAir = (l) => l.type === 'Air';
const isAio = (l) => l.type === 'AIO';

/**
 * Per category: plan field (Greek + English), our JSON field(s), the rules/filters using it, and how a
 * listing (or builder row) "has" it. `status`: collected | not collected | derivable | title words.
 * `scope`: only models whose cheapest listing matches count (e.g. RPM: hard drives).
 */
const FIELDS = {
  cpu: [
    { plan: 'Socket', json: 'socket', used: '1, 10, 13; filter, quick', has: field('socket') },
    { plan: 'Σειρά (series)', json: 'derivable from chip (cpuSeries)', status: 'derivable', used: 'filter', has: (l) => cpuSeries(l.chip) != null },
    { plan: 'Γενιά/αρχιτεκτονική (generation)', json: 'derivable from chip model number', status: 'derivable', used: '13, 25; filter', has: (l) => cpuGeneration(l.chip) != null },
    { plan: 'Πυρήνες (cores)', json: 'cores', used: 'filter, column', has: field('cores') },
    { plan: 'Threads', json: 'not collected', used: 'filter, column', has: NOT },
    { plan: 'Συχνότητα boost (boost clock)', json: 'not collected', used: 'filter, column', has: NOT },
    { plan: 'TDP', json: 'tdp', used: 'filter, column', has: field('tdp') },
    { plan: 'PPT/PL2 (real power limit)', json: 'not collected (plan: hand table per family)', used: 'power estimate, 14', has: NOT },
    { plan: 'Ενσωματωμένα γραφικά (iGPU)', json: 'igpu (computed from the model number, never null)', used: '12; filter, quick, column', has: (l) => typeof l.igpu === 'boolean' },
    { plan: 'Ψύκτρα στο κουτί (cooler in box)', json: 'coolerIncluded', used: '11; filter, quick', has: field('coolerIncluded') },
    { plan: 'Box/Tray', json: 'packaging', used: '11; filter', has: field('packaging') },
  ],
  mobo: [
    { plan: 'Socket', json: 'socket', used: '1, 13; filter, quick', has: field('socket') },
    { plan: 'Chipset', json: 'chipset', used: '13; filter, column', has: field('chipset') },
    { plan: 'Form factor', json: "formFactor (≠ 'Άλλο')", used: '5; filter, quick, column', has: (l) => has(l.formFactor) && l.formFactor !== 'Άλλο' },
    { plan: 'Τύπος μνήμης (memory type)', json: 'memory', used: '2; filter, quick, column', has: field('memory') },
    { plan: 'Θέσεις RAM (RAM slots)', json: 'ramSlots', used: '3; filter', has: field('ramSlots') },
    { plan: 'Μέγιστη μνήμη (max memory)', json: 'not collected', used: '4; filter', has: NOT },
    { plan: 'Θέσεις M.2 (M.2 slots)', json: 'not collected', used: '17, 20; filter, column', has: NOT },
    { plan: 'Θύρες SATA (SATA ports)', json: 'not collected', used: '18; filter', has: NOT },
    { plan: 'WiFi', json: 'wifi (from the title; false = title does not say WiFi)', status: 'title words', used: 'filter, quick, column', has: (l) => l.wifi === true },
    { plan: 'Bluetooth', json: 'not collected', used: 'filter', has: NOT },
    { plan: 'USB-C header μπροστά (front USB-C header)', json: 'not collected', used: '24; filter', has: NOT },
    { plan: 'BIOS Flashback', json: 'not collected', used: '13; filter', has: NOT },
    { plan: 'Fan headers', json: 'not collected', used: '23', has: NOT },
  ],
  ram: [
    { plan: 'Τύπος (type)', json: 'type', used: '2; filter, quick', has: field('type') },
    { plan: 'Συνολική χωρητικότητα (total capacity)', json: 'capacity', used: '4; filter', has: field('capacity') },
    { plan: 'Διαμόρφωση κιτ (kit layout)', json: 'modules (+ capacity)', used: '3; filter, quick, column', has: field('modules') },
    { plan: 'Συχνότητα (speed)', json: 'speed', used: '25; filter, column', has: field('speed') },
    { plan: 'CL', json: 'cas', used: 'filter, column', has: field('cas') },
    { plan: 'Latency σε ns (latency in ns)', json: 'derivable: 2000 × cas / speed', status: 'derivable', used: 'filter', has: (l) => has(l.cas) && has(l.speed) },
    { plan: 'XMP/EXPO', json: 'not collected', used: 'filter', has: NOT },
    { plan: 'Ύψος (height)', json: 'not collected', used: '26; filter', has: NOT },
    { plan: 'RGB', json: 'not collected (titles name it sometimes)', used: 'filter', has: NOT },
    { plan: 'Χρώμα (colour)', json: 'not collected', used: 'filter', has: NOT },
    { plan: '€/GB', json: 'derivable: price / capacity', status: 'derivable', used: 'column, sort', has: (l) => l.capacity > 0 },
    { plan: '(builder) Desktop/Laptop/Server', json: 'formFactor (default Desktop when not stated)', used: 'builder: usable', has: field('formFactor') },
  ],
  gpu: [
    { plan: 'Chip', json: 'chip', used: 'filter, quick; 14 (table)', has: field('chip') },
    { plan: 'Board partner', json: 'partner', used: 'filter', has: field('partner') },
    { plan: 'VRAM', json: 'vram', used: 'filter, column', has: field('vram') },
    { plan: 'Τύπος μνήμης (memory type)', json: 'memType', used: 'filter', has: field('memType') },
    { plan: 'Μήκος (length)', json: 'lengthMm', used: '6; filter, column', has: field('lengthMm') },
    { plan: 'Πάχος σε slots (thickness)', json: 'not collected', used: '7; filter', has: NOT },
    { plan: 'Προτεινόμενο τροφοδοτικό (recommended PSU)', json: 'minPsu (card page / maker)', used: '14; filter, column', has: field('minPsu') },
    { plan: 'Προτεινόμενο τροφοδοτικό, με πίνακα chip (PSU incl. chip table)', json: 'minPsu ?? GPU_PSU[chip] (builder gpuPsu)', status: 'derivable', used: '14 (what v1 uses)', has: (l, ctx) => has(l.minPsu) || ctx.gpuPsu[l.chip] != null },
    { plan: 'Βύσμα ρεύματος (power connector)', json: 'not collected', used: '15; filter, column', has: NOT },
    { plan: 'Αριθμός ανεμιστήρων (fan count)', json: 'not collected', used: 'filter', has: NOT },
    { plan: 'Χρώμα (colour)', json: 'not collected', used: 'filter', has: NOT },
    { plan: 'TBP (board power)', json: 'not collected (plan: per-chip table)', used: 'power estimate', has: NOT },
  ],
  storage: [
    { plan: 'Τύπος (type)', json: 'media', used: 'filter, quick', has: field('media') },
    { plan: 'Interface', json: 'iface', used: '17, 18; filter, column', has: field('iface') },
    { plan: 'Χωρητικότητα (capacity)', json: 'capacity', used: 'filter, quick, column', has: (l) => l.capacity > 0 },
    { plan: 'PCIe gen (NVMe only)', json: 'pcie', used: '20; filter', has: field('pcie'), scope: isNvme },
    { plan: 'Form factor', json: 'formFactor', used: '17, 19; filter', has: field('formFactor') },
    { plan: 'DRAM (SSD only)', json: 'dram', used: 'filter', has: field('dram'), scope: isSsd },
    { plan: 'Ταχύτητες: ανάγνωση (read speed, SSD)', json: 'readMBs', used: 'filter, column', has: field('readMBs'), scope: isSsd },
    { plan: 'Ταχύτητες: εγγραφή (write speed, SSD)', json: 'writeMBs', used: 'filter', has: field('writeMBs'), scope: isSsd },
    { plan: 'TBW (SSD only)', json: 'tbw', used: 'filter', has: field('tbw'), scope: isSsd },
    { plan: 'Στροφές (RPM, HDD only)', json: 'rpm', used: 'filter', has: field('rpm'), scope: isHdd },
    { plan: 'Κατηγορία χρήσης (usage tier)', json: 'tier', used: 'filter (segment)', has: field('tier') },
    { plan: '(v1 only) Cache (HDD)', json: 'cacheMB', used: 'v1 card text', has: field('cacheMB'), scope: isHdd },
    { plan: '(v1 only) Heatsink (NVMe)', json: 'heatsink', used: 'v1 data', has: field('heatsink'), scope: isNvme },
    { plan: '€/TB', json: 'derivable: price / capacity', status: 'derivable', used: 'column, sort', has: (l) => l.capacity > 0 },
  ],
  case: [
    { plan: 'Τύπος (type / size)', json: "size (≠ 'Άλλο')", used: '5 (fallback); filter, quick, column', has: (l) => has(l.size) && l.size !== 'Άλλο' },
    { plan: 'Μητρικές που δέχεται (boards it takes)', json: 'maxBoard (stated)', used: '5; filter, quick', has: field('maxBoard') },
    { plan: 'Max μήκος κάρτας (max GPU length)', json: 'gpuMaxMm', used: '6; filter, column', has: field('gpuMaxMm') },
    { plan: 'Max ύψος ψύκτρας (max cooler height)', json: 'coolerMaxMm', used: '8; filter, column', has: field('coolerMaxMm') },
    { plan: 'Radiators ανά θέση: μεγέθη (radiator sizes per position)', json: 'radiators (makers)', used: '9; filter', has: field('radiators') },
    { plan: 'Radiators ανά θέση: μόνο θέσεις (positions only)', json: 'radiatorMounts (shops)', used: '9 (fallback)', has: field('radiatorMounts') },
    { plan: 'Θέσεις ανεμιστήρων ανά μέγεθος (fan positions per size)', json: 'fanMounts (makers)', used: '21', has: field('fanMounts') },
    { plan: 'Θέσεις ανεμιστήρων, πλήθος (fan positions, count)', json: 'fanSlots', used: '21 (fallback)', has: field('fanSlots') },
    { plan: 'Ανεμιστήρες στο κουτί (fans included)', json: 'fansIncluded (list or []) or hasFans', used: '22; filter, quick, column', has: (l) => Array.isArray(l.fansIncluded) || l.hasFans != null },
    { plan: 'Θέσεις 3.5"/2.5" (drive bays)', json: 'not collected', used: '19; filter', has: NOT },
    { plan: 'Θέσεις επέκτασης (expansion slots)', json: 'not collected', used: '7', has: NOT },
    { plan: 'Μορφή τροφοδοτικού (PSU form factor it takes)', json: 'not collected', used: '16', has: NOT },
    { plan: 'Γυάλινο πλαϊνό (glass side)', json: 'window (from the title; false = not said)', status: 'title words', used: 'filter', has: (l) => l.window === true },
    { plan: 'USB-C μπροστά (front USB-C)', json: 'not collected', used: '24; filter', has: NOT },
    { plan: 'Χρώμα (colour)', json: 'not collected (colours merged by design)', used: 'filter', has: NOT },
    { plan: 'Mesh (quick filter)', json: 'title words "Mesh"/"Airflow"/"Flow" (positive only)', status: 'title words', used: 'quick', has: (l) => /\b(mesh|airflow|flow)\b/i.test(l.title) },
  ],
  psu: [
    { plan: 'Watt', json: 'watts', used: '14; filter, quick, column', has: field('watts') },
    { plan: 'Πιστοποίηση 80+ (80 PLUS)', json: 'efficiency', used: 'filter, quick, column', has: field('efficiency') },
    { plan: 'Modular', json: 'modular', used: 'filter, column', has: field('modular') },
    { plan: 'Form factor (ATX/SFX)', json: 'formFactor — stated in title/URL (default ATX otherwise)', status: 'collected (defaulted)', used: '16; filter; builder usable', has: (l) => /\b(ATX|SFX(-?L)?|TFX|Flex(-?ATX)?)\b/i.test(`${l.title} ${l.url.replace(/-/g, ' ')}`) },
    { plan: 'ATX 3.x', json: 'not collected (title words "ATX 3.0/3.1", positive only)', status: 'title words', used: 'filter, quick, column', has: (l) => /ATX\s?3(\.\d)?\b/i.test(l.title) },
    { plan: 'Βύσμα 12V-2x6 (12V-2x6 connector)', json: 'not collected (title words, positive only)', status: 'title words', used: '15; filter', has: (l) => /12V-?2x6|12VHPWR|PCIe 5\.\d/i.test(l.title) },
    { plan: 'Μήκος (length)', json: 'not collected', used: 'filter', has: NOT },
    { plan: '€/W', json: 'derivable: price / watts', status: 'derivable', used: 'column, sort', has: (l) => l.watts > 0 },
  ],
  cooler: [
    { plan: 'Τύπος (type)', json: 'type', used: '8, 9; filter, quick, column', has: field('type') },
    { plan: 'Socket', json: 'sockets', used: '10; filter, quick, column', has: field('sockets') },
    { plan: 'Ύψος (height, air only)', json: 'heightMm', used: '8, 26; filter, column', has: field('heightMm'), scope: isAir },
    { plan: 'Μέγεθος radiator (radiator, AIO only)', json: 'radiator', used: '9; filter, quick, column', has: field('radiator'), scope: isAio },
    { plan: 'Θόρυβος (noise)', json: 'not collected', used: 'filter', has: NOT },
    { plan: 'RGB', json: 'rgb (from the title; false = not said)', status: 'title words', used: 'filter', has: (l) => l.rgb === true },
    { plan: 'Χρώμα (colour)', json: 'not collected', used: 'filter', has: NOT },
  ],
  fan: [
    { plan: 'Μέγεθος (size)', json: 'size', used: '21; filter, quick, column', has: field('size') },
    { plan: 'Πλήθος στο πακέτο (pack)', json: 'pack', used: '21, 23; filter, quick, column', has: field('pack') },
    { plan: 'PWM/3-pin (connector)', json: 'connector (stated)', used: 'filter, quick, column', has: field('connector') },
    { plan: 'PWM (title word)', json: 'pwm (true = "PWM" in the title/URL; false = not said)', status: 'title words', used: 'v1 filter', has: (l) => l.pwm === true },
    { plan: 'Airflow/static pressure (type)', json: 'fanType (maker series only)', used: 'filter', has: field('fanType') },
    { plan: 'CFM', json: 'airflowCfm', used: 'filter', has: field('airflowCfm') },
    { plan: 'Static pressure (mmH2O)', json: 'pressureMm', used: 'filter', has: field('pressureMm') },
    { plan: 'Θόρυβος (noise)', json: 'not collected', used: 'filter', has: NOT },
    { plan: 'RGB', json: 'rgb (from the title; false = not said)', status: 'title words', used: 'filter', has: (l) => l.rgb === true },
    { plan: '€/ανεμιστήρα (€/fan)', json: 'derivable: price / pack', status: 'derivable', used: 'column, sort', has: (l) => l.pack > 0 },
  ],
};

const ctx = { gpuPsu: gpuPsuTable() };

const share = (models, f) => {
  const inScope = f.scope ? models.filter((m) => f.scope(m.cheapest)) : models;
  if (!f.has) return { n: inScope.length, k: null };
  return { n: inScope.length, k: inScope.filter((m) => m.listings.some((l) => f.has(l, ctx))).length };
};
const shareRows = (rows, f) => {
  if (!rows) return null;
  const inScope = f.scope ? rows.filter((r) => f.scope(r)) : rows;
  if (!f.has) return { n: inScope.length, k: null };
  return { n: inScope.length, k: inScope.filter((r) => f.has(r, ctx)).length };
};

const builder = builderRows();
const result = { builderBuiltAt: builder.builtAt, categories: {} };
let md = '';
for (const cat of CATS) {
  const models = groupModels(cat);
  const q = topQuarter(models);
  const rows = builder.rows[cat];
  const out = [];
  for (const f of FIELDS[cat]) {
    const status = f.status ?? (f.has ? 'collected' : 'not collected');
    out.push({ plan: f.plan, json: f.json, used: f.used, status, all: share(models, f), quarter: share(q.models, f), builder: shareRows(rows, f) });
  }
  result.categories[cat] = { models: models.length, quarterCutoff: q.cutoff, quarterModels: q.models.length, builderRows: rows?.length ?? null, fields: out };
  const cell = (s) => (s == null ? 'n/a' : s.k == null ? 'not collected' : `${pct(s.k, s.n)} (${s.k}/${s.n})`);
  md += `\n#### ${cat} — ${models.length} models; most-listed quarter = ${q.models.length} models with ≥ ${q.cutoff} listings; builder rows: ${rows?.length ?? 'n/a'}\n\n`;
  md += mdTable(
    ['Plan field', 'Our JSON field(s)', 'Used by', 'Status', 'All models', 'Most-listed quarter', 'Builder rows'],
    out.map((r) => [r.plan, r.json, r.used, r.status, cell(r.all), cell(r.quarter), cell(r.builder)]),
  );
  md += '\n';
}
writeOut('coverage.json', result);
writeOut('coverage.md', md);
console.log(md);
