// Step 5 task 7 report: power supplies as products (src/lib/psuProduct.ts) on today's public/data, plus the GPU twins
// and the junk cooler names the builder leaves out. Prints Markdown to stdout; nothing is written.
// Run: npx tsx scripts/phase4/psu-products.mts [sample size, default 50] [seed, default 7]
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Category, CoolerListing, GpuListing, Latest, PsuListing } from '../../src/types';
import { VALIDATION_MODE, validateLatest } from '../../src/data/validate';
import { withMakerTables } from '../../src/lib/derive';
import { gpuTwinKey, junkCooler, slotModels, twinsAgree, usable } from '../../src/lib/builderData';
import { isSfxL, psuBaseKey, psuProductKey } from '../../src/lib/psuProduct';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SAMPLE = Number(process.argv[2] ?? 50);
let seed = Number(process.argv[3] ?? 7);
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

function latest<L>(cat: Category): Latest<L & { id: string; title: string; price: number; source: string }> {
  const raw = JSON.parse(readFileSync(join(ROOT, 'public', 'data', cat, 'latest.json'), 'utf8')) as Latest;
  return withMakerTables(cat, validateLatest(cat, raw, VALIDATION_MODE).latest) as never;
}

const psu = latest<PsuListing>('psu');
const L = psu.listings as unknown as PsuListing[];
const forms: Record<string, number> = {};
for (const l of L) forms[isSfxL(l) ? 'SFX-L' : l.formFactor] = (forms[isSfxL(l) ? 'SFX-L' : l.formFactor] ?? 0) + 1;
const groups = new Set(L.map((l) => `${l.chip} ${l.formFactor}`));
const products = new Map<string, PsuListing[]>();
for (const l of L) {
  const k = psuProductKey(l);
  products.set(k, [...(products.get(k) ?? []), l]);
}
const named = [...products].filter(([k]) => !k.startsWith('id:'));
const twins = named.filter(([, ls]) => new Set(ls.map((l) => l.source)).size >= 2);
const noSeries = [...products.keys()].filter((k) => k.startsWith('id:')).length;
const offered = slotModels('psu', L).filter((m) => usable.psu(m));

console.log(`# PSU products (data ${psu.updatedAt})\n`);
console.log(`- listings ${L.length}; form factors ${JSON.stringify(forms)}`);
console.log(`- spec groups (category page) ${groups.size}`);
console.log(`- products ${products.size}: ${named.length} with series words, ${noSeries} with none (one per listing)`);
console.log(`- products with listings on 2+ sites ${twins.length}; with 2+ listings ${named.filter(([, ls]) => ls.length > 1).length}`);
console.log(`- builder offers ${offered.length} products (ATX, SFX, SFX-L)`);

// Review I1: series (maker + series + watts + form) whose listings state two or more efficiencies, and how they split.
const bases = new Map<string, PsuListing[]>();
for (const l of L) {
  const b = psuBaseKey(l);
  if (!b.startsWith('id:')) bases.set(b, [...(bases.get(b) ?? []), l]);
}
const mixed = [...bases].filter(([, ls]) => new Set(ls.map((l) => l.efficiency).filter(Boolean)).size > 1).sort(([a], [b]) => (a < b ? -1 : 1));
const oneSite = mixed.filter(([, ls]) => [...new Set(ls.map((l) => l.source))].some((src) => new Set(ls.filter((l) => l.source === src).map((l) => l.efficiency).filter(Boolean)).size > 1));
const attached = L.filter((l) => !l.efficiency && l.productEfficiency).length;
console.log(`- series stating 2+ efficiencies ${mixed.length} (within one site ${oneSite.length}); listings with no stated efficiency attached to their series' most stated one ${attached}, left unknown ${L.filter((l) => !l.efficiency && !l.productEfficiency && !psuBaseKey(l).startsWith('id:')).length}\n`);
console.log('## Series stating 2+ efficiencies: the products they are now\n');
for (const [b, ls] of mixed) {
  const by = new Map<string, PsuListing[]>();
  for (const l of ls) by.set(psuProductKey(l), [...(by.get(psuProductKey(l)) ?? []), l]);
  console.log(`### ${b}`);
  for (const [k, xs] of by) console.log(`- ${k.split('|').pop()}: ${xs.map((l) => `${l.source} ${l.efficiency ?? '(none→' + (l.productEfficiency ?? '?') + ')'} "${l.title}"`).join('; ')}`);
}
console.log('');

console.log(`## ${SAMPLE} random products with 2+ listings (seed ${process.argv[3] ?? 7}), titles per listing\n`);
const multi = named.filter(([, ls]) => ls.length > 1).sort(([a], [b]) => (a < b ? -1 : 1));
const picked = new Set<number>();
while (picked.size < Math.min(SAMPLE, multi.length)) picked.add(Math.floor(rand() * multi.length));
for (const i of [...picked].sort((a, b) => a - b)) {
  const [k, ls] = multi[i];
  console.log(`### ${k}`);
  for (const l of ls) console.log(`- ${l.source} · ${l.price} € · ${l.title}`);
}

const gpus = latest<GpuListing>('gpu').listings as unknown as GpuListing[];
const tw = new Map<string, GpuListing[]>();
for (const l of gpus) tw.set(gpuTwinKey(l), [...(tw.get(gpuTwinKey(l)) ?? []), l]);
// the step file merges a group only when its listings agree (builderData.twinsAgree), over the offered cards
const offeredIds = new Set(slotModels('gpu', gpus).filter((m) => usable.gpu(m)).map((m) => m.key));
const merged = [...tw.values()].map((ls) => ls.filter((l) => offeredIds.has(l.id))).filter((ls) => ls.length > 1 && twinsAgree(ls));
console.log(`\n# GPU twins\n\n- listings ${gpus.length}; twin groups ${merged.length} covering ${merged.reduce((n, ls) => n + ls.length, 0)} listings; on 2+ sites ${merged.filter((ls) => new Set(ls.map((l) => l.source)).size >= 2).length}\n`);
for (const ls of merged.slice(0, 20)) console.log(`- ${ls.map((l) => `${l.source}: ${l.title}`).join(' ‖ ')}`);

const coolers = latest<CoolerListing>('cooler').listings as unknown as CoolerListing[];
const junk = slotModels('cooler', coolers).filter((m) => junkCooler(m));
console.log(`\n# Junk cooler models (left out of the builder): ${junk.length}\n`);
for (const m of junk) console.log(`- ${m.chip} (${m.listings.length} listings) — ${m.listings[0].title}`);
