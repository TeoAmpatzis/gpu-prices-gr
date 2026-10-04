// Section 2 of the data-quality audit: grouping problems.
//   (a) likely duplicates: one product split into several models;
//   (b) likely wrong merges: different products (or contradicting facts) inside one model.
// Heuristics only; every finding lists the listing titles so it can be checked by eye.
// Run: node scripts/audit/data-quality/grouping.mjs → docs/audit/data/grouping.json

import { groupModels, latest, mostCommon, productKey, specsCache, writeOut } from './lib.mjs';
import { partNumbers, sameCapacity, titleCapacities, titleDdr, titleKit, titleRamSpeeds, titleRamTotal } from './derive.mjs';

const MAX_EXAMPLES = 20;
const findings = [];

/** One finding: `groups` = arrays of models (a duplicate set or one wrong-merge model). */
function report(cat, kind, check, groups, { note = '', confidence = 'medium', byDesign = false, rootCause = '', flag } = {}) {
  const sorted = [...groups].sort((a, b) => size(b) - size(a));
  const examples = sorted.slice(0, MAX_EXAMPLES).map((g) => ({
    models: g.models.map((m) => ({ key: m.key, chip: m.cheapest.chip, listings: m.listings.length })),
    why: g.why ?? '',
    listings: g.models.flatMap((m) =>
      m.listings
        .filter((l) => !g.only || g.only.includes(l))
        .slice(0, 8)
        .map((l) => ({ source: l.source, title: l.title, price: l.price, ...(flag ? { [flag]: l[flag] } : {}), model: m.key })),
    ),
  }));
  const models = new Set(groups.flatMap((g) => g.models.map((m) => m.key)));
  const listings = groups.reduce((n, g) => n + (g.only ? g.only.length : g.models.reduce((k, m) => k + m.listings.length, 0)), 0);
  findings.push({ cat, kind, check, byDesign, confidence, groups: groups.length, models: models.size, listings, note, rootCause, examples });
}
const size = (g) => g.models.reduce((n, m) => n + m.listings.length, 0);

/** Groups of models with the same value of `keyOf` (null = skip), ≥ 2 models per group. */
function collide(models, keyOf) {
  const by = new Map();
  for (const m of models) {
    const k = keyOf(m);
    if (k == null) continue;
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(m);
  }
  return [...by.values()].filter((ms) => ms.length > 1);
}

const distinct = (m, f, skip = []) => new Set(m.listings.map((l) => l[f]).filter((v) => v != null && !skip.includes(v)).map(String));

// ---------- (a) Duplicates ----------

// Filler words that never tell two products apart (colours: colours are merged by design for cases;
// the scraper drops them for other categories too, except where noted in the report).
const FILLER = new Set([
  'gaming', 'edition', 'series', 'case', 'pc', 'computer', 'cpu', 'cooler', 'fan', 'casefan', 'motherboard',
  'internal', 'drive', 'for', 'with', 'the', 'black', 'white', 'bk', 'wh', 'retail', 'bulk', 'oem', 'atx', 'midi', 'tower', 'extended',
]);
/** Tokens of a name: lower case, "2.4TB" → "2p4tb" (a decimal point matters), "×3" → "pack3". */
const tokens = (s) =>
  s
    .toLowerCase()
    .replace(/(\d)\.(\d)/g, '$1p$2')
    .replace(/×\s?(\d+)/g, ' pack$1 ')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
const NAMED = ['mobo', 'case', 'fan', 'cooler', 'storage'];
// Storage: the media is part of the model key (WD Blue is an SSD and an HDD), so it stays a token.
const nameOf = (cat, m) => (cat === 'storage' ? `${m.cheapest.chip} media${m.cheapest.media}` : m.cheapest.chip);

/** Part-number tokens worth matching across models (not speed grades, clocks or dimensions). */
function parts(title) {
  return partNumbers(title).filter(
    (p) =>
      /^[A-Z0-9]+$/.test(p) &&
      !/^PC\d/.test(p) &&
      !/(CORES?|GHZ|MHZ|RPM|CFM|MM)$/.test(p) &&
      !/\d+X\d+X\d+/.test(p) &&
      !/^(GEN|PCIE|DDR|GDDR)\d/.test(p),
  );
}

/** A spec that legitimately differs between models sharing a family part code. */
const SPEC_OF = {
  storage: (m) => m.cheapest.capacity,
  ram: (m) => m.key,
  fan: (m) => `${m.cheapest.size}|${m.cheapest.pack}`,
  cooler: (m) => m.cheapest.radiator,
};

function duplicates(cat, models) {
  if (NAMED.includes(cat)) {
    const order = collide(models, (m) => [...tokens(nameOf(cat, m))].sort().join(' '));
    report(cat, 'duplicate', 'same words in a different order', order.map((ms) => ({ models: ms })), {
      confidence: 'high',
      rootCause: 'hypothesis: sites write the name in a different word order; model keys keep the order (productKey).',
    });
    const inOrder = new Set(order.flat().map((m) => m.key));
    const filler = collide(models, (m) => {
      const t = tokens(nameOf(cat, m));
      const kept = t.filter((x) => !FILLER.has(x));
      return kept.length ? [...kept].sort().join(' ') : null;
    }).filter((ms) => ms.some((m) => !inOrder.has(m.key)));
    report(cat, 'duplicate', 'same name apart from filler/colour words (Gaming, Edition, Case, Black, White…)', filler.map((ms) => ({ models: ms })), {
      confidence: 'medium',
      rootCause: 'hypothesis: a filler or colour word survives the normalizer on one site only.',
    });
    // Same model name under different vendor names.
    const rest = collide(models, (m) => {
      const r = productKey(m.cheapest.chip.slice(m.cheapest.brand.length));
      return r.length >= 5 && /\d/.test(r) && /[a-z]/.test(r) ? `${r}|${cat === 'storage' ? m.cheapest.media : ''}` : null;
    }).filter((ms) => new Set(ms.map((m) => productKey(m.cheapest.brand))).size > 1);
    report(cat, 'duplicate', 'same model name under different vendor names (needs review: some are different products)', rest.map((ms) => ({ models: ms })), {
      confidence: 'low',
      rootCause: 'hypothesis: vendor spelling (Alpenfoehn/Alpenfohn), rebrands (SilentiumPC/Endorfy, Natec/Genesis) or a wrong vendor on one site.',
    });
    // Greek words left in the name: productKey drops Greek letters but keeps what follows ("120mm").
    const GREEK = /[Ͱ-Ͽἀ-῿]/;
    const keys = new Map(models.map((m) => [m.key, m]));
    const greek = models
      .filter((m) => GREEK.test(m.cheapest.chip))
      .map((m) => {
        const bare = productKey(m.cheapest.chip.replace(/[Ͱ-Ͽἀ-῿]+\S*/g, ' ').replace(/\b\d{2,3}\s?mm\b/gi, ' ')) + (cat === 'storage' ? m.cheapest.media.toLowerCase() : '');
        const sib = bare !== m.key ? keys.get(bare) : undefined;
        return { models: sib ? [m, sib] : [m], why: sib ? 'a Greek-free twin model exists' : 'Greek words in the name (no twin found)' };
      });
    report(cat, 'duplicate', 'Greek words left in the model name (e.g. Shopflix "Τριπλού Ανεμιστήρα 120mm", Greek capitals typed for Latin ones)', greek, {
      confidence: 'high',
      note: `${greek.filter((g) => g.models.length > 1).length} of these have a Greek-free twin model (the same product split in two).`,
      rootCause:
        'verified: productKey (src/lib/categories.tsx) / model_key (scraper/names.py) keep only [a-z0-9], so Greek words vanish but their "120mm" stays and changes the key; normalize_cooling.py does not cut Shopflix’s "Διπλού/Τριπλού Ανεμιστήρα 120mm" phrase, and normalize_case.py does not convert Greek capitals typed for Latin ones ("ΑΧ61") as normalize_mobo.py does.',
    });
  }
  if (cat === 'cpu') {
    const sp = collide(models, (m) => m.key.toLowerCase().replace(/[^a-z0-9]/g, ''));
    report(cat, 'duplicate', 'chip names equal apart from spaces/hyphens/case', sp.map((ms) => ({ models: ms })), { confidence: 'high' });
  }
  // Same part number in titles of different models.
  const by = new Map();
  for (const m of models)
    for (const l of m.listings)
      for (const p of parts(l.title)) {
        if (!by.has(p)) by.set(p, new Map());
        const mm = by.get(p);
        if (!mm.has(m.key)) mm.set(m.key, { m, ls: [] });
        mm.get(m.key).ls.push(l);
      }
  const groups = [];
  const seen = new Set();
  for (const [p, mm] of by) {
    if (mm.size < 2 || mm.size > 3) continue; // > 3 models: a series name, not a part number
    if (cat === 'gpu' && p.length < 8) continue; // "ICE16GD": a suffix shared by different cards
    const ms = [...mm.values()];
    // The token is the shared model name itself ("A620AMX" in "A620AM-X" and "A620AM-X WiFi"): no evidence.
    if (ms.every((x) => productKey(x.m.cheapest.chip).includes(p.toLowerCase()))) continue;
    // A family code shared by different capacities / packs is not a duplicate (Skroutz family cards).
    const spec = SPEC_OF[cat];
    if (spec && new Set(ms.map((x) => spec(x.m))).size > 1 && cat !== 'ram') continue;
    // RAM part numbers lose their "/16" capacity suffix in tokens: different capacities = a family code.
    if (cat === 'ram' && new Set(ms.map((x) => x.m.cheapest.capacity)).size > 1) continue;
    const id = ms.map((x) => x.m.key).sort().join('|');
    if (seen.has(id)) continue;
    seen.add(id);
    groups.push({ models: ms.map((x) => x.m), only: ms.flatMap((x) => x.ls), why: `part number ${p}`, diff: specDiff(cat, ms.map((x) => x.m)) });
  }
  const note = 'Part numbers: title tokens with letters and digits, ≥ 7 characters; tokens found in more than 3 models (series names) or contained in every model’s own name are ignored.';
  if (cat === 'ram' || cat === 'psu') {
    // Spec-grouped categories: say what differs between the spec models sharing the part number.
    const CLASSES = {
      'missing-spec': { by: true, check: 'same part number in a spec model and its "spec not stated" twin (speed / efficiency missing on one listing)' },
      form: { by: false, check: 'same part number filed under different form factors (Desktop/Laptop/Server or ATX/SFX)' },
      spec: { by: false, check: 'same part number filed under different specs (capacity, kit, speed, watts or efficiency differ)' },
    };
    const CAUSES = {
      psu: {
        'missing-spec': 'verified: normalize_psu.py leaves the efficiency out of the chip when a title does not state it (Shopflix "Corsair RM1000e 1000W Μαύρο").',
        form: 'verified for LC300SFX: normalize_psu.py FORM needs "SFX" as a separate word, so "LC300SFX" stays ATX (the default); others: one site’s spec line says TFX/SFX, the rest default to ATX (hypothesis).',
        spec: 'verified for Skroutz family cards: the title names one unit (e.g. "MSI MPG A1000GS") while the link/price is another (A1250GS, 1250W) and normalize_psu.py takes the watts from the title, else from the URL; some e-shop titles carry another unit’s part number (hypothesis: shop error).',
      },
      ram: {
        'missing-spec': 'verified: normalize_ram.py reads the speed only from "MHz"/"MT/s" or the Skroutz slug "Tachytita-N"; Shopflix titles say "με Ταχύτητα 3600" and get no speed.',
        form: 'verified: normalize_ram.py defaults to Desktop when neither the slug nor the title says SO-DIMM/ECC/Registered (e-shop "SO-DIMM" vs Snif titles without it).',
        spec: 'verified: normalize_ram.py KIT needs "GB" after the module size, so Shopflix "(2x16)" is read as one 32GB stick; plus title typos (Snif "KF560C36BWEA-32 … (2x16GB)").',
      },
    };
    for (const [cls, c] of Object.entries(CLASSES)) {
      report(cat, cls === 'missing-spec' ? 'duplicate' : 'wrong-merge', c.check, groups.filter((g) => g.diff === cls), {
        byDesign: c.by,
        confidence: cls === 'spec' ? 'high' : 'medium',
        note,
        rootCause: CAUSES[cat][cls],
      });
    }
    return;
  }
  report(cat, cat === 'gpu' ? 'wrong-merge' : 'duplicate', cat === 'gpu' ? 'same part number filed under different chip/VRAM models' : 'same part number in the titles of different models', groups, {
    confidence: 'medium',
    note,
    rootCause:
      cat === 'gpu'
        ? 'hypothesis: a shop title with the wrong VRAM (Snif "GV-N507TWF3OC-16GD … RTX 5070 Ti 12GB").'
        : 'hypothesis: names cut differently per site (e-shop/Snif titles keep the part number or extra words, Skroutz/BestPrice drop them).',
  });
}

/** For RAM/PSU part-number groups: 'missing-spec' (one model is the other without speed/efficiency), 'form', or 'spec'. */
function specDiff(cat, ms) {
  if (cat !== 'ram' && cat !== 'psu') return null;
  const parse = (m) => {
    const l = m.cheapest;
    return cat === 'ram'
      ? { base: `${l.type} ${l.capacity} ${l.modules}`, opt: l.speed, form: l.formFactor }
      : { base: `${l.watts}`, opt: l.efficiency, form: l.formFactor };
  };
  const ps = ms.map(parse);
  const sameBase = new Set(ps.map((p) => p.base)).size === 1;
  const forms = new Set(ps.map((p) => p.form)).size;
  const opts = new Set(ps.map((p) => p.opt).filter((v) => v != null)).size;
  const someMissing = ps.some((p) => p.opt == null);
  if (sameBase && forms === 1 && opts <= 1 && someMissing) return 'missing-spec';
  if (sameBase && forms > 1 && opts <= 1) return 'form';
  return 'spec';
}

// ---------- (b) Wrong merges ----------

// GPU chip → the VRAM sizes it is sold with (audit's reference table from the chip makers' public
// spec pages, written from general knowledge, not fetched in this audit).
const GPU_VRAM = {
  'RTX 5090': [32], 'RTX 5080': [16], 'RTX 5070 Ti': [16], 'RTX 5070': [12], 'RTX 5060 Ti': [8, 16], 'RTX 5060': [8], 'RTX 5050': [8],
  'RTX 4090': [24], 'RTX 4080 Super': [16], 'RTX 4080': [16], 'RTX 4070 Ti Super': [16], 'RTX 4070 Ti': [12], 'RTX 4070 Super': [12],
  'RTX 4070': [12], 'RTX 4060 Ti': [8, 16], 'RTX 4060': [8], 'RTX 3090 Ti': [24], 'RTX 3090': [24], 'RTX 3080 Ti': [12],
  'RTX 3080': [10, 12], 'RTX 3070 Ti': [8], 'RTX 3070': [8], 'RTX 3060 Ti': [8], 'RTX 3060': [8, 12], 'RTX 3050': [6, 8],
  'RX 9070 XT': [16], 'RX 9070': [16], 'RX 9070 GRE': [12], 'RX 9060 XT': [8, 16], 'RX 9060': [8], 'RX 7900 XTX': [24],
  'RX 7900 XT': [20], 'RX 7900 GRE': [16], 'RX 7800 XT': [16], 'RX 7700 XT': [12], 'RX 7600 XT': [16], 'RX 7600': [8],
  'RX 6800 XT': [16], 'RX 6800': [16], 'RX 6750 XT': [12], 'RX 6700 XT': [12], 'RX 6650 XT': [8], 'RX 6600 XT': [8], 'RX 6600': [8],
  'RX 6500 XT': [4, 8], 'RX 6400': [4], 'Arc B580': [12], 'Arc B570': [10], 'Arc A770': [8, 16], 'Arc A750': [8], 'Arc A580': [8],
  'Arc A380': [6], 'Arc A310': [4],
};

function wrongMerges(cat, models) {
  const flagged = (pred) => models.map((m) => ({ m, only: m.listings.filter((l) => pred(l, m)) })).filter((x) => x.only.length);
  const asGroups = (xs, why) => xs.map((x) => ({ models: [x.m], only: x.only, why: typeof why === 'function' ? why(x) : why }));
  const disagree = (f, check, opts = {}) => {
    const xs = models.filter((m) => distinct(m, f, opts.skip ?? []).size > 1);
    report(cat, 'wrong-merge', check, xs.map((m) => ({ models: [m], why: `${f}: ${[...distinct(m, f, opts.skip ?? [])].join(' / ')}` })), { flag: f, ...opts });
  };

  if (cat === 'gpu') {
    const vramTitle = flagged((l) => {
      const vs = [...l.title.matchAll(/(?<![\d.])(\d{1,2})\s?GB\b/gi)].map((x) => +x[1]).filter((v) => v >= 2 && v <= 48);
      return vs.length > 0 && !vs.includes(l.vram);
    });
    report(cat, 'wrong-merge', 'title states another VRAM size than the model', asGroups(vramTitle, 'title VRAM'), { flag: 'vram', confidence: 'high' });
    const partVram = flagged((l) => {
      const m = l.title.match(/-(\d{1,2})G[DL]?\b/i);
      return !!m && Number(m[1]) !== l.vram && /^(GV-|N\d|[A-Z]{2}\d)/i.test(l.title.split(/\s/).find((t) => /-\d{1,2}G[DL]?\b/i.test(t)) ?? '');
    });
    report(cat, 'wrong-merge', "part number's VRAM (e.g. Gigabyte …-12GD) differs from the model's VRAM", asGroups(partVram, 'part number VRAM'), {
      flag: 'vram',
      confidence: 'high',
      rootCause: 'verified: normalize.py takes VRAM from the title text ("16GB"), which some shops write wrongly; the part number disagrees.',
    });
    const combo = models.filter((m) => GPU_VRAM[m.cheapest.chip] && !GPU_VRAM[m.cheapest.chip].includes(m.cheapest.vram));
    report(cat, 'wrong-merge', 'chip + VRAM combination that the chip is not sold with (phantom model)', combo.map((m) => ({ models: [m], why: `${m.cheapest.chip} is sold with ${GPU_VRAM[m.cheapest.chip].join('/')} GB` })), {
      confidence: 'high',
      note: 'Reference VRAM table written from the chip makers’ public specs (general knowledge, not fetched here). Workstation chips not checked.',
      rootCause: 'verified: the model key is chip + VRAM from the title (src/lib/categories.tsx GPU.modelKey); a shop title with the wrong VRAM makes its own model.',
    });
    disagree('memType', 'memory type differs between listings (GDDR4/GDDR5 variants share a chip + VRAM model)', {
      byDesign: true,
      note: 'By design the GPU model is chip + VRAM; memory-type variants of old low-end chips (GT 1030 GDDR4/GDDR5) share it.',
    });
  }
  if (cat === 'cpu') {
    disagree('socket', 'socket differs between listings', { confidence: 'high' });
    disagree('cores', 'core count differs between listings', { confidence: 'high' });
    disagree('tdp', 'TDP differs between listings');
    const cool = models.filter((m) => {
      const by = new Map();
      for (const l of m.listings) {
        if (l.coolerIncluded == null) continue;
        const k = l.packaging ?? '?';
        if (!by.has(k)) by.set(k, new Set());
        by.get(k).add(l.coolerIncluded);
      }
      return [...by.values()].some((s) => s.size > 1);
    });
    report(cat, 'wrong-merge', 'cooler-in-box differs between listings with the same packaging', cool.map((m) => ({ models: [m] })), {
      flag: 'coolerIncluded',
      confidence: 'high',
      note: 'Box and Tray listings share a model by design; this counts only listings with the same packaging value (incl. unknown).',
      rootCause: 'verified (scraper/specs.py apply): a Tray listing without a stated value gets coolerIncluded=false, but shops sell "Tray με ψύκτρα" / "Tray with Fan" packs that do include one.',
    });
    report(cat, 'wrong-merge', 'Box and Tray in one model', models.filter((m) => distinct(m, 'packaging').size > 1).map((m) => ({ models: [m] })), {
      byDesign: true,
      note: 'By design (category page); the builder splits CPUs by cooler-in-box instead.',
    });
  }
  if (cat === 'mobo') {
    const mem = models.filter((m) => distinct(m, 'memory').size > 1);
    report(cat, 'wrong-merge', 'DDR4 and DDR5 listings in one board model', mem.map((m) => ({ models: [m], why: `memory: ${[...distinct(m, 'memory')].join(' / ')}; model shows ${mostCommon(m.listings.map((l) => l.memory))}` })), {
      flag: 'memory',
      confidence: 'high',
      rootCause:
        'verified for "…/M.2+ D5" vs "…/M.2" (ASRock): scraper/normalize_mobo.py removes e-shop’s "D5" and "+" from names, so the DDR5 and DDR4 boards get one key; others are a wrong spec on one site (hypothesis).',
    });
    const wifi = models.filter((m) => {
      const said = m.listings.map((l) => /\b(wi-?\s?fi|wifi|wireless)\b|\bAX\b/i.test(l.title));
      return said.some(Boolean) && said.some((x) => !x) && !/wifi|ax$/.test(m.key);
    });
    report(cat, 'wrong-merge', 'some titles say WiFi, others do not, and the model name has no WiFi', wifi.map((m) => ({ models: [m] })), {
      flag: 'wifi',
      confidence: 'medium',
      rootCause: 'hypothesis: a WiFi and a non-WiFi board share a key when one site drops the word, or one site leaves it out of the title.',
    });
    disagree('wifi', 'WiFi flag differs between listings (all titles of the model)', { confidence: 'low' });
    disagree('socket', 'socket differs between listings', { confidence: 'high' });
    disagree('formFactor', 'board size differs between listings', {
      skip: ['Άλλο'],
      rootCause: 'verified (normalize_mobo.py): a board whose title states no size gets the chipset’s M/I suffix, else "ATX" by default; e-shop sizes are ignored as unreliable, so "ROG STRIX B850-I … RETAIL" (no suffix on B850) becomes ATX, and "A520M-ITX" becomes Micro ATX from the "M"',
    });
    disagree('ramSlots', 'RAM slot count differs between listings');
  }
  if (cat === 'ram') {
    const kit = flagged((l) => {
      const k = titleKit(l.title);
      const t = titleRamTotal(l.title);
      return (k && (k.modules !== l.modules || k.modules * k.size !== l.capacity)) || (t && k && t !== k.modules * k.size) || (t && !k && t !== l.capacity);
    });
    report(cat, 'wrong-merge', 'title states another kit / total capacity than the model', asGroups(kit, 'title kit'), {
      flag: 'capacity',
      confidence: 'high',
      rootCause: 'verified: normalize_ram.py takes the first "N×SIZE GB" in title+URL; a title whose total and kit disagree ("128GB (2X4GB)") is filed by the kit.',
    });
    const speed = flagged((l) => {
      const sp = titleRamSpeeds(l.title).filter((v) => v >= 200);
      return l.speed != null && sp.length > 0 && !sp.includes(l.speed);
    });
    report(cat, 'wrong-merge', 'title states another speed than the model', asGroups(speed, 'title speed'), { flag: 'speed', confidence: 'high' });
    const ddr = flagged((l) => {
      const d = titleDdr(l.title);
      const part = l.title.match(/\bF([45])-\d{4}/) ?? l.title.match(/\bAX([45])U\d{4}/) ?? l.url.match(/-f([45])-\d{4}/i) ?? l.url.match(/-ax([45])u\d{4}/i);
      return (d.length > 0 && !d.includes(l.type)) || (part && `DDR${part[1]}` !== l.type);
    });
    report(cat, 'wrong-merge', 'DDR type contradicts the title or the part number (G.Skill F4-/F5-, ADATA AX4/AX5)', asGroups(ddr, 'DDR type'), {
      flag: 'type',
      confidence: 'high',
      rootCause: 'verified: normalize_ram.py takes the type from the title first; shops sometimes write "DDR4" for a DDR5 kit (part number F5-…).',
    });
    disagree('cas', 'CL differs between listings of one spec model', { byDesign: true, note: 'By design: RAM models are kit specs across makers; CL is filtered per listing.' });
    const noSpeed = models.filter((m) => m.cheapest.speed == null);
    report(cat, 'duplicate', 'speed not stated: listings fall into a separate "no speed" model', noSpeed.map((m) => ({ models: [m] })), {
      byDesign: true,
      note: 'By design (scraper/normalize_ram.py: chip without MHz when no speed is found).',
    });
  }
  if (cat === 'storage') {
    const cap = flagged((l) => {
      const cs = titleCapacities(l.title);
      return cs.length > 0 && !cs.some((c) => sameCapacity(c, l.capacity));
    });
    report(cat, 'wrong-merge', 'title states another capacity than the model', asGroups(cap, 'title capacity'), { flag: 'capacity', confidence: 'high' });
    const capMix = models.filter((m) => distinct(m, 'capacity').size > 1);
    report(cat, 'wrong-merge', 'two capacities in one model (key collision: "2.4TB" and "24TB" both become "24tb")', capMix.map((m) => ({ models: [m] })), {
      flag: 'capacity',
      confidence: 'high',
      rootCause: 'verified: productKey (src/lib/categories.tsx) and model_key (scraper/names.py) drop the decimal point, so 2.4TB = 24TB, 1.2TB = 12TB, 1.6TB = 16TB.',
    });
    const iface = models.filter((m) => distinct(m, 'iface').size > 1);
    report(cat, 'wrong-merge', 'interface differs between listings (SATA vs SAS, SATA vs NVMe)', iface.map((m) => ({ models: [m], why: `${m.cheapest.tier}: ${[...distinct(m, 'iface')].join(' / ')}` })), {
      flag: 'iface',
      confidence: 'high',
      rootCause: 'verified: the model is vendor + series + capacity (normalize_storage.py), so SATA and SAS versions of one HDD series (Exos, Ultrastar) share it.',
    });
    disagree('formFactor', 'form factor differs between listings (M.2 vs U.2 / 2.5")', { confidence: 'high' });
    disagree('pcie', 'PCIe generation differs between listings');
    disagree('rpm', 'RPM differs between listings (e.g. WD Purple 8TB 5400 and 7200 rpm)', { confidence: 'high' });
  }
  if (cat === 'psu') {
    disagree('modular', 'modularity differs between listings of one spec model', { byDesign: true, note: 'By design: PSU models are watts + efficiency across makers.' });
    const noEff = models.filter((m) => m.cheapest.efficiency == null);
    report(cat, 'duplicate', 'efficiency not stated: listings fall into a separate "<W>W" model', noEff.map((m) => ({ models: [m] })), {
      byDesign: true,
      note: 'By design (scraper/normalize_psu.py: chip without a tier when none is stated).',
    });
  }
  if (cat === 'case') {
    disagree('size', 'case size differs between listings (sites label it differently)', {
      skip: ['Άλλο'],
      confidence: 'medium',
      note: 'The model takes the cheapest listing’s size (groupModels uses the first listing for the pill; builder uses cheapest.size as the board-size fallback).',
    });
    disagree('maxBoard', 'largest board differs between listings', { confidence: 'medium' });
    const sp = specsCache('case');
    const raw = models.filter((m) => {
      const vals = m.listings.map((l) => sp[l.id]?.maxBoard).filter(Boolean);
      return new Set(vals).size > 1;
    });
    report(cat, 'wrong-merge', 'product pages (spec cache) disagree on the largest board', raw.map((m) => ({ models: [m], why: m.listings.map((l) => `${l.source}:${sp[l.id]?.maxBoard ?? '-'}`).join(' ') })), { confidence: 'medium' });
  }
  if (cat === 'cooler') {
    const type = models.filter((m) => distinct(m, 'type').size > 1);
    report(cat, 'wrong-merge', 'air and AIO listings in one model', type.map((m) => ({ models: [m], why: `cheapest is ${m.cheapest.type}` })), {
      flag: 'type',
      confidence: 'high',
      rootCause: 'verified: normalize_cooling.py WATER (Υδρόψυξη, Ydropsyxi, AIO, Liquid, Water, Hydro) decides AIO; Shopflix titles without those words and its slug spelling "udropsuxe" ("NZXT Kraken Elite 240 RGB με Διπλού Ανεμιστήρα") make an AIO "Air"; the builder checks the cheapest listing’s type (src/lib/builder.ts)',
    });
    const rad = flagged((l) => {
      if (l.type !== 'AIO') return false;
      const big = [...l.title.matchAll(/(?<![\d.])(240|280|360|420|480)(?:\s?mm)?\b/gi)].map((x) => +x[1]);
      return big.length > 0 && !big.includes(l.radiator);
    });
    report(cat, 'wrong-merge', 'AIO title names another radiator size than the model', asGroups(rad, 'title radiator'), {
      flag: 'radiator',
      confidence: 'high',
      rootCause: 'verified: normalize_cooling.py takes the radiator first from the Skroutz card spec line "(2x120mm)", which describes the linked variant, while the card title names another (family card: "1STPLAYER Mothra MT360" linked to a 2-fan version); the radiator is then appended to the name ("… MT360 240")',
    });
    const sp = specsCache('cooler');
    const h = models.filter((m) => {
      const xs = m.listings.map((l) => sp[l.id]?.heightMm).filter((v) => v != null);
      return xs.length > 1 && Math.max(...xs) - Math.min(...xs) > 5;
    });
    report(cat, 'wrong-merge', 'product pages disagree on the cooler height by more than 5 mm', h.map((m) => ({ models: [m], why: m.listings.map((l) => `${l.source}:${sp[l.id]?.heightMm ?? '-'}`).join(' ') })), { confidence: 'medium' });
  }
  if (cat === 'fan') {
    const pack = flagged((l) => {
      const t = l.title;
      const vals = [];
      for (const x of t.matchAll(/(?<![\d.])(\d{1,2})\s?(?:τμχ|τεμ\b|τεμάχια|pcs\b|-?pack\b)/gi)) vals.push(+x[1]);
      for (const x of t.matchAll(/(?<![\d.])(\d)\s?in\s?1\b/gi)) vals.push(+x[1]);
      for (const x of t.matchAll(/\b(triple|dual|twin|quad)[\s-]?pack\b/gi)) vals.push({ triple: 3, dual: 2, twin: 2, quad: 4 }[x[1].toLowerCase()]);
      for (const x of t.matchAll(/(?<![\d.])(\d)\s?x\s?1[24]0\s?mm\b/gi)) vals.push(+x[1]);
      return vals.length > 0 && !vals.includes(l.pack);
    });
    report(cat, 'wrong-merge', 'title states another pack size than the model ("3in1", "Twin Pack", "2 X 140MM")', asGroups(pack, 'title pack'), {
      flag: 'pack',
      confidence: 'high',
      rootCause: 'verified: normalize_cooling.py PACK reads "3τμχ"/"tmch", "pcs", "-Pack", "x Fans" and Dual/Triple; "3IN1", "Twin Pack" and "2 X 140MM" are not read, and a title that states two counts ("Triple Pack … 2τμχ") keeps the first match.',
    });
    disagree('connector', '3-pin and 4-pin PWM listings in one model', {
      confidence: 'medium',
      rootCause: 'verified: normalize_cooling.py FAN_CUT ends the name at the size ("140mm") or "με", so words after it ("PWM", "High-Speed") never reach the key and the 3-pin and PWM versions of a series share a model; some hits are one site stating "3-Pin" for a PWM fan (hypothesis).',
    });
  }
}

// ---------- Skroutz family cards: title names another variant than the link ----------

function skroutzVariant(cat) {
  const hits = [];
  for (const l of latest(cat).listings) {
    if (l.source !== 'skroutz') continue;
    const slug = decodeURIComponent(l.url.split('/').pop() ?? '').toLowerCase().replace(/\.html$/, '').replace(/[^a-z0-9]/g, '');
    const toks = l.title
      .toLowerCase()
      .split(/[^a-z0-9.+-]+/)
      .map((t) => t.replace(/[^a-z0-9]/g, ''))
      .filter((t) => t.length >= 4 && /\d/.test(t) && /[a-z]/.test(t) && !/^\d+(gb|tb|mb|mm|w|rpm|mhz)$/.test(t) && !/^(socket|gen|pcie|lga|am)\d/.test(t));
    const missing = toks.filter((t) => !slug.includes(t));
    if (missing.length) hits.push({ l, missing });
  }
  findings.push({
    cat,
    kind: 'wrong-merge',
    check: 'Skroutz card title names another product than its link (family cards)',
    byDesign: false,
    confidence: 'medium',
    groups: hits.length,
    models: new Set(hits.map((h) => h.l.chip)).size,
    listings: hits.length,
    note: 'A model-number token of the title (letters + digits, ≥ 4 chars) is missing from the URL slug. Some hits are harmless spelling differences.',
    rootCause:
      'verified: scraper/sources/skroutz.py takes the title from the card link’s title attribute and the price from the JSON-LD entry of the linked variant; for family cards the two name different variants.',
    examples: hits.slice(0, MAX_EXAMPLES).map((h) => ({ why: `missing from slug: ${h.missing.join(', ')}; filed as ${h.l.chip}`, listings: [{ source: 'skroutz', title: h.l.title, url: h.l.url, price: h.l.price, chip: h.l.chip }] })),
  });
}

// ---------- Run ----------

const CATS = ['gpu', 'cpu', 'mobo', 'ram', 'storage', 'psu', 'case', 'fan', 'cooler'];
for (const cat of CATS) {
  const models = groupModels(cat);
  duplicates(cat, models);
  wrongMerges(cat, models);
  skroutzVariant(cat);
}

writeOut('grouping.json', { generated: 'node scripts/audit/data-quality/grouping.mjs', findings });
for (const f of findings) {
  console.log(`${f.cat.padEnd(8)} ${f.kind.padEnd(12)} ${f.byDesign ? '[by design] ' : ''}${f.check}: ${f.groups} groups, ${f.models} models, ${f.listings} listings`);
}
