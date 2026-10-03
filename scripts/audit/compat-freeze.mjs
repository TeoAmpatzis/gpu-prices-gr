// Phase 0 (v2 audit): freezes real products into compatibility scenario files.
//
//   node scripts/audit/compat-freeze.mjs <drafts.mjs> <models.json> <outDir>
//
// <models.json> is a dump of the builder's models made from a built site (dist/data/builder.json,
// builder-storage.json, builder-extra.json) through v1's own slotModels; <drafts.mjs> exports the
// scenario drafts (parts by builder key, expected results, why). For every part the fields the
// compatibility rules read are copied from the current data into the scenario, so a scenario keeps
// explaining itself after the market data changes. Run once in Phase 0 (2026-10-03); the scenario
// files in tests/compat/scenarios/ are the source of truth from then on — do not re-run blindly.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [draftsPath, modelsPath, outDir] = process.argv.slice(2);
const { builtAt, slots } = JSON.parse(readFileSync(modelsPath, 'utf8'));
const { DRAFTS } = await import(pathToFileURL(draftsPath).href);

/** Fields the v1 rules (src/lib/builder.ts, fans.ts) or the plan's rules read, per category. */
export const FIELDS = {
  cpu: ['socket', 'igpu', 'coolerIncluded', 'packaging', 'tdp', 'cores'],
  mobo: ['socket', 'chipset', 'formFactor', 'memory', 'ramSlots'],
  ram: ['type', 'capacity', 'modules', 'speed', 'cas', 'formFactor'],
  gpu: ['chip', 'partner', 'vram', 'lengthMm', 'minPsu'],
  cooler: ['type', 'radiator', 'sockets', 'heightMm'],
  storage: ['media', 'iface', 'pcie', 'formFactor', 'capacity', 'tier'],
  case: ['size', 'maxBoard', 'gpuMaxMm', 'coolerMaxMm', 'fanSlots', 'radiatorMounts', 'fanMounts', 'fansIncluded', 'hasFans', 'radiators'],
  fan: ['size', 'pack', 'connector', 'fanType', 'pwm'],
  psu: ['watts', 'efficiency', 'modular', 'formFactor'],
};

/** The category page's model key (src/lib/categories.tsx modelKey). */
const productKey = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const MODEL_KEY = {
  gpu: (r) => `${r.chip} ${r.vram}GB`,
  cpu: (r) => r.chip,
  mobo: (r) => productKey(r.chip),
  ram: (r) => `${r.chip} ${r.formFactor}`,
  psu: (r) => `${r.chip} ${r.formFactor}`,
  case: (r) => productKey(r.chip),
  fan: (r) => productKey(r.chip),
  cooler: (r) => productKey(r.chip),
  storage: (r) => productKey(`${r.chip} ${r.media}`),
};

mkdirSync(outDir, { recursive: true });
let written = 0;
for (const d of DRAFTS) {
  const parts = d.parts.map((p) => {
    // A product made up for a rule no real product (or no collected field) can show.
    if (p.syntheticProduct) {
      return {
        category: p.category,
        key: p.key,
        modelKey: null,
        name: p.name,
        quantity: p.quantity ?? 1,
        synthetic: true,
        syntheticFields: Object.keys(p.fields),
        source: null,
        fields: p.fields,
        note: p.note,
      };
    }
    const m = slots[p.category].find((x) => x.key === p.key);
    if (!m) throw new Error(`${d.id}: ${p.category} "${p.key}" is not in the builder data`);
    const r = m.row;
    const fields = Object.fromEntries(FIELDS[p.category].map((f) => [f, r[f] ?? null]));
    const part = {
      category: p.category,
      key: p.key,
      modelKey: MODEL_KEY[p.category](r),
      name: m.chip,
      quantity: p.quantity ?? 1,
      synthetic: Boolean(p.synthetic?.length),
      source: { site: r.source, id: r.id, title: String(r.title ?? '').split(' | ')[0], price: r.price },
      fields: { ...fields, ...(p.override ?? {}) },
    };
    if (p.synthetic?.length) part.syntheticFields = p.synthetic;
    if (p.note) part.note = p.note;
    return part;
  });
  const scenario = {
    id: d.id,
    title: d.title,
    ...(d.planExample ? { planExample: d.planExample } : {}),
    parts,
    ...(d.context ? { context: d.context } : {}),
    expected: d.expected,
    why: d.why,
    capturedFrom: { builtAt, files: 'dist/data/builder.json, builder-storage.json, builder-extra.json' },
  };
  writeFileSync(join(outDir, `${d.id.toLowerCase()}-${d.slug}.json`), `${JSON.stringify(scenario, null, 2)}\n`);
  written++;
}
console.log(`${written} scenarios written to ${outDir}`);
