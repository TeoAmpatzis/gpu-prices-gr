// Section 3 of the data-quality audit: implausible values (listing level), with the values the PC
// builder relies on. Thresholds are the audit brief's; "rule-of-thumb" checks are labelled as such.
// Run: node scripts/audit/data-quality/implausible.mjs → docs/audit/data/implausible.json

import { builderRows, gpuPsuTable, groupModels, latest, median, specsCache, writeOut } from './lib.mjs';
import { titleKit, titleRamTotal } from './derive.mjs';

const MAX_EXAMPLES = 20;
const results = [];
const builder = builderRows().rows;
const inBuilder = (slot) => new Set((builder[slot] ?? []).map((r) => r.id));

/** Adds a check: `hits` = [{ l, value, extra? }]. */
function add(cat, check, hits, { field, note = '', rootCause = '', severity = '', ruleOfThumb = false, slot = cat } = {}) {
  const offered = inBuilder(slot);
  const models = new Set(hits.map((h) => h.model ?? h.l.chip));
  results.push({
    cat,
    check,
    field,
    ruleOfThumb,
    listings: hits.length,
    models: models.size,
    inBuilderRows: hits.filter((h) => offered.has(h.l.id)).length,
    note,
    rootCause,
    severity,
    examples: hits.slice(0, MAX_EXAMPLES).map((h) => ({ source: h.l.source, title: h.l.title, value: h.value, ...(h.extra ?? {}), id: h.l.id })),
  });
}
const L = (cat) => latest(cat).listings;
const between = (v, lo, hi) => v != null && (v < lo || v > hi);

// ---------- Measurements ----------

const gpuSpecs = specsCache('gpu');
add(
  'gpu',
  'lengthMm < 120 or > 400',
  L('gpu').filter((l) => between(l.lengthMm, 120, 400)).map((l) => ({ l, value: l.lengthMm, extra: { specCache: gpuSpecs[l.id]?.lengthMm ?? null } })),
  { field: 'lengthMm' },
);
add(
  'case',
  'gpuMaxMm < 150 or > 500',
  L('case').filter((l) => between(l.gpuMaxMm, 150, 500)).map((l) => ({ l, value: l.gpuMaxMm })),
  { field: 'gpuMaxMm' },
);
add(
  'case',
  'coolerMaxMm > 250 (and < 30, extra)',
  L('case').filter((l) => between(l.coolerMaxMm, 30, 250)).map((l) => ({ l, value: l.coolerMaxMm })),
  { field: 'coolerMaxMm' },
);
const coolerSpecs = specsCache('cooler');
add(
  'cooler',
  'air cooler heightMm > 200 (and < 30, extra)',
  L('cooler').filter((l) => l.type === 'Air' && between(l.heightMm, 30, 200)).map((l) => ({ l, value: l.heightMm })),
  { field: 'heightMm' },
);
add(
  'cooler',
  'spec cache (raw product page) air cooler height < 30 or > 200',
  L('cooler')
    .filter((l) => l.type === 'Air' && between(coolerSpecs[l.id]?.heightMm, 30, 200))
    .map((l) => ({ l, value: coolerSpecs[l.id].heightMm, extra: { latestHeightMm: l.heightMm } })),
  {
    field: 'heightMm (specs.json)',
    note: 'Raw values before sharing; when sites disagree, scraper/main.py SAFER keeps the larger height, so a too-small raw value is usually hidden.',
  },
);
add('psu', 'watts < 300 or > 2000', L('psu').filter((l) => between(l.watts, 300, 2000)).map((l) => ({ l, value: l.watts })), {
  field: 'watts',
  note: 'The scraper accepts 150–3000 W (normalize_psu.py MIN_WATTS/MAX_WATTS). Small TFX/Flex/SFX units below 300 W are real products.',
});

// ---------- RAM ----------

const kitHits = [];
for (const l of L('ram')) {
  const m = l.chip.match(/(\d+)GB \((\d+)×(\d+)GB\)/);
  const k = titleKit(l.title);
  const t = titleRamTotal(l.title);
  if (m && (Number(m[1]) !== Number(m[2]) * Number(m[3]) || Number(m[1]) !== l.capacity)) kitHits.push({ l, value: l.chip, extra: { why: 'chip kit ≠ capacity' } });
  else if (k && k.modules * k.size !== l.capacity) kitHits.push({ l, value: `${l.modules}×${l.capacity / l.modules}GB = ${l.capacity}GB`, extra: { why: `title kit ${k.modules}×${k.size}GB` } });
  else if (t && k && t !== k.modules * k.size) kitHits.push({ l, value: `${l.modules}×${l.capacity / l.modules}GB = ${l.capacity}GB`, extra: { why: `title says ${t}GB total and ${k.modules}×${k.size}GB` } });
  else if (t && !k && t !== l.capacity) kitHits.push({ l, value: `${l.capacity}GB`, extra: { why: `title says ${t}GB` } });
}
add('ram', 'capacity ≠ modules × per-module size (chip vs fields, or title kit/total vs fields)', kitHits, {
  field: 'capacity / modules',
  rootCause: 'verified: scraper/normalize_ram.py sets capacity = modules × size from the first "N×SIZE GB" in title + URL, so the fields always agree with each other; disagreements come from titles whose total and kit differ, or kits written without "GB" ("Kit (2x16)").',
});
const speedSimple = L('ram').filter((l) => between(l.speed, 1333, 10000));
add('ram', 'speed < 1333 or > 10000 MHz (coordinator rule)', speedSimple.map((l) => ({ l, value: l.speed, extra: { type: l.type } })), {
  field: 'speed',
  note: 'Most hits are real DDR2/DDR3 speeds (400–1066 MHz); see the type-aware check.',
});
const RANGE = { DDR2: [400, 1066], DDR3: [800, 3100], DDR4: [1600, 5333], DDR5: [4000, 10000] };
const speedType = L('ram').filter((l) => RANGE[l.type] && between(l.speed, ...RANGE[l.type]));
add(
  'ram',
  'speed outside the range of its DDR type (DDR2 400–1066, DDR3 800–3100, DDR4 1600–5333, DDR5 4000–10000)',
  speedType.map((l) => ({ l, value: l.speed, extra: { type: l.type, titleSays: (l.title.match(/\b\d{3,5}\s*(?:MHz|MT\/s)\b/i) ?? [null])[0], url: l.url } })),
  {
    field: 'speed',
    rootCause:
      'verified: normalize_ram.py SPEED accepts any 3–5 digit number before MHz/MT/s (or Skroutz "Tachytita-N") with no range check. 60000 MHz: the e-shop title itself says "60000MHZ". DDR5 2400/2800: Skroutz URL "Tachytita-2800" (half the data rate, the I/O clock) for DDR5-5600 laptop kits. DDR4 6000/5600: the title says DDR4 for a DDR5 kit (part F5-/AX5U/LD5S).',
  },
);

// ---------- Prices far below the model's median ----------

for (const cat of ['gpu', 'cpu', 'mobo', 'ram', 'storage', 'psu', 'case', 'fan', 'cooler']) {
  const hits = [];
  let modelsChecked = 0;
  let cheapestHit = 0;
  for (const m of groupModels(cat)) {
    if (m.listings.length < 3) continue;
    modelsChecked++;
    const med = median(m.listings.map((l) => l.price));
    for (const l of m.listings) {
      if (l.price < 0.25 * med) {
        hits.push({ l, model: m.key, value: l.price, extra: { modelMedian: med, ratio: +(l.price / med).toFixed(3), isModelPrice: l === m.cheapest, modelListings: m.listings.length } });
        if (l === m.cheapest) cheapestHit++;
      }
    }
  }
  hits.sort((a, b) => a.extra.ratio - b.extra.ratio);
  add(cat, 'listing price < 25% of its model’s median listing price (models with ≥ 3 listings)', hits, {
    field: 'price',
    note: `${modelsChecked} models checked; ${cheapestHit} of the hits are the model’s own (cheapest) price shown on the category page.`,
  });
}

// ---------- Builder-critical values ----------

const GPU_PSU = gpuPsuTable();
const psuHits = L('gpu')
  .filter((l) => l.minPsu != null && GPU_PSU[l.chip] != null && (l.minPsu < GPU_PSU[l.chip] - 100 || l.minPsu > GPU_PSU[l.chip] + 300))
  .map((l) => ({ l, value: l.minPsu, extra: { table: GPU_PSU[l.chip], chip: l.chip, specCache: gpuSpecs[l.id]?.minPsu ?? null } }));
add('gpu', 'minPsu more than 100 W below or 300 W above the chip table (builder GPU_PSU)', psuHits, {
  field: 'minPsu',
  note: 'The builder uses the card’s minPsu first (src/lib/builder.ts gpuPsu), so a too-low value lowers the PSU the builder asks for.',
});

const RANK = ['Mini ITX', 'Micro ATX', 'ATX', 'E-ATX'];
const caseBoard = L('case').filter((l) => {
  if (!l.maxBoard) return false;
  const r = RANK.indexOf(l.maxBoard);
  return (
    (l.size === 'SFF / Cube' && r >= 2) ||
    (l.size === 'Mini Tower' && r >= 3) ||
    (l.size === 'Full Tower' && r <= 1) ||
    (l.size === 'Midi Tower' && r === 0)
  );
});
add('case', 'maxBoard implausible for the size (SFF/Cube ≥ ATX, Mini Tower E-ATX, Full Tower ≤ mATX, Midi Tower Mini ITX)', caseBoard.map((l) => ({ l, value: l.maxBoard, extra: { size: l.size } })), {
  field: 'maxBoard',
  ruleOfThumb: true,
  note: 'Rule of thumb: some cubes do take ATX boards and some "Midi" cases are ITX-only; candidates, not verified against the maker.',
  rootCause: 'verified: normalize_case.py max_board takes the largest board named anywhere in title + spec line, so "supports Mini-ITX/mATX/ATX" or a size word for another product can raise it.',
});

const moboSlots = L('mobo').filter((l) => l.ramSlots != null && (![2, 4, 8].includes(l.ramSlots) || (l.formFactor === 'Mini ITX' && l.ramSlots > 2)));
add('mobo', 'ramSlots outside {2, 4, 8}, or Mini ITX with > 2', moboSlots.map((l) => ({ l, value: l.ramSlots, extra: { formFactor: l.formFactor, socket: l.socket } })), {
  field: 'ramSlots',
  note: '12/16/24 slots are real on server/workstation boards (not offered by the builder).',
});

// CPU: integrated graphics by the model-number rule (audit's own implementation).
function igpuRule(chip) {
  let m;
  if ((m = chip.match(/^(?:Core (?:Ultra )?(?:i?\d)[- ]|Pentium |Celeron )\D*\d+([A-Z]*)/))) return !/F/.test(m[1]);
  if ((m = chip.match(/^Ryzen \d (?:PRO )?(\d)\d{3}([A-Z0-9]*)/))) {
    const gen = Number(m[1]);
    const suf = m[2];
    if (/G/.test(suf)) return true;
    if (gen <= 5) return false;
    if (/F/.test(suf)) return false; // 7400F, 7500F, 8400F, 8700F
    if (gen === 8) return false; // Ryzen 8000 desktop without G: none (8000F)
    return gen >= 7;
  }
  return null; // not judged (Xeon, EPYC, Threadripper, Athlon…)
}
const igpu = L('cpu')
  .map((l) => ({ l, rule: igpuRule(l.chip) }))
  .filter((x) => x.rule != null && x.rule !== !!x.l.igpu)
  .map((x) => ({ l: x.l, value: x.l.igpu, extra: { rule: x.rule, chip: x.l.chip } }));
add('cpu', 'igpu contradicts the model-number rule (Intel F/KF none; Ryzen 1000–5000 non-G none; 7000/9000 non-F yes; 8000F/7500F/7400F none; G yes)', igpu, {
  field: 'igpu',
  ruleOfThumb: true,
  note: 'igpu is itself computed from the model number (normalize_cpu.py has_igpu), so this mainly re-checks that rule.',
});

const trayCooler = L('cpu').filter((l) => l.packaging === 'Tray' && l.coolerIncluded === true);
add('cpu', 'Tray with coolerIncluded = true', trayCooler.map((l) => ({ l, value: true, extra: { url: l.url } })), {
  field: 'coolerIncluded',
  ruleOfThumb: true,
  note: 'Greek shops sell "Tray με ψύκτρα" / "Tray with Fan" packs, so some of these are real; the brief’s rule "Tray must be false" does not hold for them.',
});
const BOXNO = (chip) => /^Core (?:i\d-\d{4,5}KF?|Ultra \d \d{3}KF?)\b/.test(chip) || /^Ryzen \d (?:PRO )?[79]\d{3}X(3D)?\b/.test(chip);
const boxNo = L('cpu').filter((l) => l.packaging !== 'Tray' && l.coolerIncluded === true && BOXNO(l.chip));
add('cpu', 'coolerIncluded = true for a chip whose retail box has no cooler (Intel K/KF, Ryzen 7000/9000 X/X3D)', boxNo.map((l) => ({ l, value: true, extra: { packaging: l.packaging } })), {
  field: 'coolerIncluded',
  ruleOfThumb: true,
});
const urlSays = (l) => /(me-psyktra|me-psuktra|with-fan|me-psyktra-)/i.test(l.url) || /\bwith fan\b|με ψύκτρα/i.test(l.title);
const urlCool = L('cpu').filter((l) => l.coolerIncluded === false && urlSays(l));
add('cpu', 'coolerIncluded = false but the title/URL says "with cooler" (με ψύκτρα / me-psyktra / with Fan)', urlCool.map((l) => ({ l, value: false, extra: { packaging: l.packaging, url: l.url } })), {
  field: 'coolerIncluded',
  ruleOfThumb: true,
  rootCause: 'verified: scraper/specs.py apply sets coolerIncluded=false for any Tray listing without a stated value; BestPrice/Shopflix "Tray με ψύκτρα" listings have no product-page value.',
});
const urlNo = L('cpu').filter((l) => l.coolerIncluded === true && /-(?:se-)?(?:tray|kouti)(?!-me-ps)/i.test(l.url) && !urlSays(l) && /skroutz|bestprice/.test(l.source));
add('cpu', 'coolerIncluded = true but the Skroutz/BestPrice URL names the package without "με ψύκτρα"', urlNo.map((l) => ({ l, value: true, extra: { url: l.url } })), {
  field: 'coolerIncluded',
  ruleOfThumb: true,
});

writeOut('implausible.json', { generated: 'node scripts/audit/data-quality/implausible.mjs', results });
for (const r of results) console.log(`${r.cat.padEnd(8)} ${r.check}: ${r.listings} listings, ${r.models} models, ${r.inBuilderRows} in builder rows`);
