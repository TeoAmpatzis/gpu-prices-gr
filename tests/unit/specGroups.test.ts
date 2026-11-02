// Product page: full specs in groups (step 4, task 9) and the variants line's labels.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { variantChips } from '../../src/components/product/variantChips';
import { VALIDATION_MODE, validateLatest } from '../../src/data/validate';
import { CATEGORY_IDS } from '../../src/lib/categories';
import { candidates, fitContext, slotModels } from '../../src/lib/builderData';
import { modelChunks, type CategoryInput } from '../../src/lib/derive';
import { SPEC_GROUP_ORDER, specGroups } from '../../src/ui/specs';
import type { BaseListing, CaseListing, Category, GpuListing, History, Imported, Latest, ModelEntry, StorageListing } from '../../src/types';

const base = { id: 'x:1', source: 'skroutz', title: 't', url: 'u', price: 100, shopCount: 1, scrapedAt: '2026-10-17' } as const;
const gpu = (o: Partial<GpuListing> = {}) => ({ ...base, brand: 'NVIDIA', chip: 'RTX 5070', vram: 12, partner: 'Asus', ...o }) as GpuListing;
const idsOf = (g: { id: string }[]) => g.map((x) => x.id);

describe('specGroups', () => {
  it('lists groups in the spec order and only those with a value', () => {
    const g = specGroups('gpu', [gpu({ memType: 'GDDR7', lengthMm: 300, minPsu: 650 })], 'en');
    expect(idsOf(g)).toEqual(['general', 'dimensions', 'power']);
    expect(g.find((x) => x.id === 'dimensions')!.items).toEqual([{ label: 'Length', value: '300 mm' }]);
    expect(g.find((x) => x.id === 'power')!.items[0].value).toBe('650 W');
  });

  it('omits empty values and empty groups (no "—" rows)', () => {
    const g = specGroups('gpu', [gpu()], 'en');
    expect(idsOf(g)).toEqual(['general']);
    for (const grp of g) for (const i of grp.items) expect(['', '—', null, undefined]).not.toContain(i.value);
  });

  it('puts a case\'s limits under dimensions and its fan positions under connections', () => {
    const c = { ...base, brand: 'Lian Li', chip: 'Lian Li O11', size: 'Midi Tower', window: true, rgb: false, maxBoard: 'ATX', gpuMaxMm: 420, coolerMaxMm: 167, fanSlots: 9 } as CaseListing;
    const g = specGroups('case', [c], 'en');
    expect(idsOf(g)).toEqual(['general', 'dimensions', 'connections']);
    expect(g.find((x) => x.id === 'dimensions')!.items.map((i) => i.value)).toEqual(['ATX', '420 mm', '167 mm']);
  });

  it('puts drive performance under general and the interface under connections', () => {
    const s = { ...base, brand: 'Samsung', chip: 'Samsung 990 Pro 1TB', media: 'SSD', iface: 'NVMe', pcie: 4, formFactor: 'M.2 2280', capacity: 1000, tier: 'Consumer', readMBs: 7450, dram: true } as StorageListing;
    const g = specGroups('storage', [s], 'el');
    expect(g.find((x) => x.id === 'connections')!.items.map((i) => i.value)).toEqual(['NVMe', 'PCIe 4.0']);
    expect(g.find((x) => x.id === 'general')!.items.some((i) => i.value.includes('7.450'))).toBe(true);
  });

  it('is Greek or English per language', () => {
    const el = specGroups('gpu', [gpu({ lengthMm: 300 })], 'el');
    expect(el.find((x) => x.id === 'dimensions')!.items[0].label).toBe('Μήκος');
  });

  for (const cat of CATEGORY_IDS) {
    it(`${cat}: real data gives groups in order, no blank rows`, () => {
      let latest: Latest | null = null;
      try {
        latest = validateLatest(cat, JSON.parse(readFileSync(`public/data/${cat}/latest.json`, 'utf8')), VALIDATION_MODE).latest;
      } catch {
        return;
      }
      if (!latest) return;
      let withGroups = 0;
      for (const l of latest.listings.slice(0, 150)) {
        const g = specGroups(cat, [l as BaseListing], 'en');
        const order = idsOf(g).map((i) => SPEC_GROUP_ORDER.indexOf(i as never));
        expect(order).toEqual([...order].sort((a, b) => a - b));
        for (const grp of g) {
          expect(grp.items.length).toBeGreaterThan(0);
          for (const i of grp.items) {
            expect(i.label.length).toBeGreaterThan(0);
            expect(i.value.trim()).not.toBe('');
            expect(i.value).not.toBe('—');
          }
        }
        if (g.length) withGroups++;
      }
      expect(withGroups).toBeGreaterThan(0);
    });
  }
});

// ---- From the build's own output (derive.modelChunks on the real data; skipped without it)
const readJson = <T>(cat: string, f: string): T | null => {
  try {
    return JSON.parse(readFileSync(`public/data/${cat}/${f}`, 'utf8')) as T;
  } catch {
    return null;
  }
};
const entriesOf = (cat: Category): ModelEntry[] => {
  const raw = readJson<Latest>(cat, 'latest.json');
  if (!raw) return [];
  const input: CategoryInput = {
    latest: validateLatest(cat, raw, VALIDATION_MODE).latest,
    history: readJson<History>(cat, 'history.json') ?? {},
    imported: readJson<Imported>(cat, 'history_imported.json') ?? {},
  };
  return modelChunks(cat, input, '2026-10-18T10:00:00.000Z').flatMap((c) => Object.values(c.models));
};
const measured = (e: ModelEntry) => e.listings.some((l) => (l as GpuListing).lengthMm != null);

describe('GPU length estimate (builder.fitContext rule)', () => {
  const gpus = entriesOf('gpu');
  it('a card with no measured length of a chip with an estimate shows "≈ min–max mm" tagged as an estimate', () => {
    if (!gpus.length) return;
    const e = gpus.find((g) => g.lengthEstimate && !measured(g));
    expect(e, 'a real chip with an estimate').toBeTruthy();
    const dims = specGroups('gpu', e!.listings, 'en', e!.lengthEstimate).find((g) => g.id === 'dimensions')!;
    // The UI displays whole millimetres; current maker data can contain fractional measurements.
    expect(dims.items[0].value).toBe(`≈ ${Math.round(e!.lengthEstimate!.min)}–${Math.round(e!.lengthEstimate!.max)} mm`);
    expect(dims.items[0].tag).toBe('estimate');
    expect(specGroups('gpu', e!.listings, 'el', e!.lengthEstimate).find((g) => g.id === 'dimensions')!.items[0].tag).toBe('εκτίμηση');
  });
  it('a measured card shows its length without a tag, an unmeasured one of a chip without an estimate shows nothing', () => {
    if (!gpus.length) return;
    const m = gpus.find(measured)!;
    const item = specGroups('gpu', m.listings, 'en', m.lengthEstimate).find((g) => g.id === 'dimensions')!.items[0];
    expect(item.value).toMatch(/^\d[\d.,]* mm$/);
    expect(item.tag).toBeUndefined();
    const none = gpus.find((g) => !g.lengthEstimate && !measured(g))!;
    expect(specGroups('gpu', none.listings, 'en', none.lengthEstimate).some((g) => g.id === 'dimensions')).toBe(false);
  });
  it("equals the builder's fitContext range over its candidate rows, chip by chip", () => {
    const raw = readJson<Latest>('gpu', 'latest.json');
    if (!raw) return;
    const listings = validateLatest('gpu', raw, VALIDATION_MODE).latest.listings as GpuListing[];
    const ctx = fitContext(candidates('gpu', slotModels('gpu', listings)));
    const withEstimate = gpus.filter((g) => g.lengthEstimate);
    expect(withEstimate.length).toBeGreaterThan(0);
    for (const g of withEstimate) {
      const c = ctx.chips.get(g.listings[0].chip)!;
      expect({ min: c.min, max: c.max }).toEqual(g.lengthEstimate);
    }
  });
  it('is never set for a card that has its own length', () => {
    if (!gpus.length) return;
    expect(gpus.filter((g) => g.lengthEstimate && measured(g)).length).toBe(0);
  });
});

describe('variants line (labels and order come from the build)', () => {
  for (const cat of ['gpu', 'storage', 'ram', 'psu'] as const) {
    it(`${cat}: the current model and its siblings are one sorted line, and the siblings agree on each other`, () => {
      const entries = entriesOf(cat);
      if (!entries.length) return;
      const byKey = new Map(entries.map((e) => [e.key, e]));
      const withVariants = entries.filter((e) => e.variants.length > 0);
      expect(withVariants.length).toBeGreaterThan(0);
      for (const e of withVariants.slice(0, 300)) {
        expect(e.variantLabel).not.toBeNull();
        const chips = variantChips(e);
        expect(chips.length).toBe(e.variants.length + 1);
        expect(chips.filter((c) => c.current).map((c) => c.label)).toEqual([e.variantLabel]);
        const orders = [...e.variants.map((v) => v.order), e.variantOrder!].sort((a, b) => a - b);
        expect(orders).toEqual([...orders].sort((a, b) => a - b));
        for (const v of e.variants) {
          const sib = byKey.get(v.key)!;
          expect(sib.variantLabel).toBe(v.label);
          expect(sib.variantOrder).toBe(v.order);
          expect(sib.variants.some((x) => x.key === e.key && x.label === e.variantLabel)).toBe(true);
        }
      }
    });
  }
  it('a model without a family has no label', () => {
    for (const e of entriesOf('cpu').slice(0, 20)) {
      expect(e.variantLabel).toBeNull();
      expect(variantChips(e)).toEqual([]);
    }
  });
  it('sorts by order with the current one among the others', () => {
    const chips = variantChips({
      variantLabel: '12GB',
      variantOrder: 12,
      variants: [
        { key: 'b', slug: 'b', label: '16GB', order: 16, price: 600 },
        { key: 'a', slug: 'a', label: '8GB', order: 8, price: 300 },
      ],
    });
    expect(chips.map((c) => c.label)).toEqual(['8GB', '12GB', '16GB']);
  });
});
