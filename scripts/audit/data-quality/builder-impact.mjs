// How many of the PC builder's offered rows (builder.json / builder-storage.json) carry the data
// problems found in sections 2–4, i.e. where a wrong value reaches a compatibility check.
// Run: node scripts/audit/data-quality/builder-impact.mjs → docs/audit/data/builder-impact.json

import { builderRows, gpuPsuTable, groupModels, latest, mostCommon, writeOut } from './lib.mjs';
import { titleBoard } from './derive.mjs';

const { rows } = builderRows();
const out = [];
const add = (slot, check, hits, note = '') =>
  out.push({
    slot,
    check,
    rows: hits.length,
    note,
    examples: hits.slice(0, 15).map((r) => ({ id: r.id, chip: r.chip, title: (r.title ?? '').split(' | ')[0], value: r.value })),
  });

// Cooler: an air cooler with a height of a fan's thickness says "fits" in every case that states a limit.
const shortAir = rows.cooler.filter((r) => r.type === 'Air' && r.heightMm != null && r.heightMm < 40).map((r) => ({ ...r, value: r.heightMm }));
add('cooler', 'air cooler rows with heightMm < 40 (a tower cooler measured as 21–28 mm passes every case height check)', shortAir, 'Low-profile coolers are 37–70 mm; the hits under 30 mm are fan thicknesses.');

// Cooler: AIO models whose cheapest listing is classified Air (the builder checks cheapest.type).
const coolerModels = groupModels('cooler');
const typeMix = coolerModels.filter((m) => new Set(m.listings.map((l) => l.type)).size > 1);
add(
  'cooler',
  'models mixing Air and AIO listings: the type the builder uses (cheapest listing)',
  typeMix.map((m) => ({ id: m.cheapest.id, chip: m.cheapest.chip, title: m.cheapest.title, value: `cheapest ${m.cheapest.type}; listings ${m.listings.map((l) => l.type).join('/')}` })),
);

// GPU: a minimum PSU that is really the card's board power lowers the PSU the builder asks for.
const T = gpuPsuTable();
const lowPsu = rows.gpu.filter((r) => r.minPsu != null && T[r.chip] != null && r.minPsu < T[r.chip] - 100 && !(r.chip === 'RTX 3050' && r.vram === 6));
add('gpu', 'GPU rows whose minPsu is > 100 W under the chip table (RTX 3050 6GB excluded: its 300 W is NVIDIA’s figure)', lowPsu.map((r) => ({ ...r, value: `${r.minPsu} W (table ${T[r.chip]} W)` })));

// Mobo: E-ATX boards offered as ATX (Shopflix "Extended ATX" titles).
const eatx = rows.mobo.filter((r) => r.formFactor !== 'E-ATX' && titleBoard(r.title).includes('E-ATX'));
add('mobo', 'board rows whose titles say Extended ATX / E-ATX but formFactor is smaller', eatx.map((r) => ({ ...r, value: r.formFactor })));
const itx = rows.mobo.filter((r) => r.formFactor !== 'Mini ITX' && /\bITX\b/i.test(r.title) && !/\bE-?ATX\b/i.test(r.title));
add('mobo', 'board rows whose titles say ITX but formFactor is not Mini ITX', itx.map((r) => ({ ...r, value: r.formFactor })));

// Mobo: DDR4/DDR5 listings merged in one model offered by the builder.
const moboModels = groupModels('mobo');
const memMix = moboModels.filter((m) => new Set(m.listings.map((l) => l.memory).filter(Boolean)).size > 1);
const offeredMobo = new Set(rows.mobo.map((r) => r.id));
add(
  'mobo',
  'offered board models that mix DDR4 and DDR5 listings (the row shows one memory type, the cheapest listing may be the other board)',
  memMix
    .filter((m) => offeredMobo.has(m.cheapest.id))
    .map((m) => ({ id: m.cheapest.id, chip: m.cheapest.chip, title: m.cheapest.title, value: `row memory ${mostCommon(m.listings.map((l) => l.memory))}; cheapest listing ${m.cheapest.memory}` })),
);

// RAM: rows whose type contradicts the title / part number, and server RDIMMs offered as desktop RAM.
const ddrPart = (t) => t.match(/\bF([45])-\d{4}/) ?? t.match(/\bAX([45])U\d{4}/i) ?? t.match(/\bLD([45])S\d/i);
const ramType = rows.ram.filter((r) => r.title.split(' | ').some((t) => {
  const p = ddrPart(t);
  return p && `DDR${p[1]}` !== r.type;
}));
add('ram', 'RAM rows whose title part number says another DDR generation (G.Skill F4-/F5-, ADATA AX4/AX5, Lexar LD4/LD5)', ramType.map((r) => ({ ...r, value: r.type })));
const RDIMM = /\b(MTA\d+ASF\d+G72P|KSM\d+R|M393[A-Z0-9]+|HMA\d+R|HMCG\d+[A-Z]*R)/i;
const rdimmListings = latest('ram').listings.filter((l) => l.formFactor === 'Desktop' && RDIMM.test(l.title));
const offeredRam = new Set(rows.ram.map((r) => r.id));
const offeredRamModels = new Set(rows.ram.map((r) => `${r.chip}|${r.formFactor}`));
const rdimmOwnRow = rdimmListings.filter((l) => offeredRam.has(l.id)).length;
const rdimmInOffered = rdimmListings.filter((l) => offeredRamModels.has(`${l.chip}|${l.formFactor}`)).length;
add(
  'ram',
  `Desktop-classified RAM listings whose part number is a registered/ECC server DIMM (Micron MTA…72P, Kingston KSM…R, Samsung M393, Hynix HMA…R) — heuristic; counts listings: ${rdimmOwnRow} are a builder row’s own (cheapest) listing, ${rdimmInOffered} sit in spec models the builder offers`,
  rdimmListings.map((l) => ({ id: l.id, chip: l.chip, title: l.title, value: offeredRam.has(l.id) ? 'builder row' : offeredRamModels.has(`${l.chip}|${l.formFactor}`) ? 'in an offered model' : 'category page only' })),
  'Part-number prefixes from general knowledge of the makers’ numbering, not verified per product.',
);

// RAM: kit layout wrong (modules) on offered rows — the slot check uses modules.
const kitWrong = rows.ram.filter((r) => r.title.split(' | ').some((t) => {
  const m = t.match(/\b(\d)\s*[x×]\s*(\d{1,3})\s*(?:GB)?\b(?!\s*(?:MHz|mm))/i);
  return m && Number(m[1]) !== r.modules && Number(m[1]) * Number(m[2]) === r.capacity;
}));
add('ram', 'RAM rows where one of the model’s titles states another kit layout with the same total (e.g. "2x16" filed as 1×32GB)', kitWrong.map((r) => ({ ...r, value: `${r.modules} × ${r.capacity / r.modules}GB` })));

// Storage: offered drives whose model mixes SATA and SAS, or M.2 and U.2.
const st = groupModels('storage');
const offeredSt = new Set(rows.storage.map((r) => r.id));
const mixSt = st.filter((m) => offeredSt.has(m.cheapest.id) && (new Set(m.listings.map((l) => l.iface).filter(Boolean)).size > 1 || new Set(m.listings.map((l) => l.formFactor).filter(Boolean)).size > 1));
add('storage', 'offered drive models mixing interfaces or form factors', mixSt.map((m) => ({ id: m.cheapest.id, chip: m.cheapest.chip, title: m.cheapest.title, value: `${[...new Set(m.listings.map((l) => l.iface))].join('/')} · ${[...new Set(m.listings.map((l) => l.formFactor))].join('/')}` })));

// Case: largest board where sites disagree and the most common value is the smaller one.
const RANK = ['Mini ITX', 'Micro ATX', 'ATX', 'E-ATX'];
const cases = groupModels('case');
const caseLow = cases.filter((m) => {
  const vals = m.listings.map((l) => l.maxBoard).filter(Boolean);
  if (new Set(vals).size < 2) return false;
  const most = mostCommon(vals);
  return RANK.indexOf(most) < Math.max(...vals.map((v) => RANK.indexOf(v)));
});
add('case', 'cases whose listings disagree on the largest board and the builder uses the smaller (most common) value', caseLow.map((m) => ({ id: m.cheapest.id, chip: m.cheapest.chip, title: m.cheapest.title, value: `uses ${mostCommon(m.listings.map((l) => l.maxBoard))}; listings ${[...new Set(m.listings.map((l) => l.maxBoard))].join('/')}` })));

// CPU: rows the builder offers with an unknown cooler-in-box (the builder splits CPUs by it).
const cpuUnknown = rows.cpu.filter((r) => r.coolerIncluded == null);
add('cpu', 'CPU rows with cooler-in-box unknown (a separate row next to the known one)', cpuUnknown.map((r) => ({ ...r, value: r.packaging })));
const cpuWrongNo = rows.cpu.filter((r) => r.coolerIncluded === false && /me-ps[yu]k?tra|with fan|με ψύκτρα/i.test(`${r.url} ${r.title}`));
add('cpu', 'CPU rows saying "no cooler in the box" while the URL/title says "with cooler"', cpuWrongNo.map((r) => ({ ...r, value: r.packaging })));

writeOut('builder-impact.json', { generated: 'node scripts/audit/data-quality/builder-impact.mjs', rowsPerSlot: Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, v.length])), checks: out });
for (const c of out) console.log(`${c.slot.padEnd(8)} ${c.rows} — ${c.check}`);
