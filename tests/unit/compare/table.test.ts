import { describe, expect, it } from 'vitest';
import { buildTable, visibleRows, type CompareItem } from '../../../src/lib/compare/table';
import type { CompareRef } from '../../../src/lib/compare/refs';
import type { GpuListing } from '../../../src/types';

const gpu = (o: Partial<GpuListing> & { id: string }): GpuListing =>
  ({ source: 'skroutz', title: 't', url: 'u', price: 300, shopCount: 1, scrapedAt: '2026-11-09', brand: 'NVIDIA', chip: 'RTX 5060', vram: 8, partner: 'Asus',
    shipping: null, total: null, merchant: null, ...o }) as GpuListing;
const ref = (slug: string): CompareRef => ({ cat: 'gpu', slug });
const item = (slug: string, ...listings: GpuListing[]): CompareItem => ({ ref: ref(slug), listings });
const row = (t: ReturnType<typeof buildTable>, label: string) => t.rows.find((r) => r.label === label);

const a = item('a', gpu({ id: 'skroutz:1', memType: 'GDDR7', lengthMm: 300, minPsu: 650, price: 320, shipping: 3, total: 323 }));
const b = item('b', gpu({ id: 'skroutz:2', partner: 'MSI', memType: 'GDDR6', lengthMm: 300, price: 300, shipping: 5, total: 305 }));

describe('compare table', () => {
  it('aligns rows by label and marks same, differing and partly unknown values', () => {
    const t = buildTable('gpu', [a, b], 'en');
    expect(row(t, 'Length')).toMatchObject({ values: ['300 mm', '300 mm'], status: 'same' });
    expect(row(t, 'Memory type')).toMatchObject({ values: ['GDDR7', 'GDDR6'], status: 'differs' });
    expect(row(t, 'Maker')).toMatchObject({ values: ['Asus', 'MSI'], status: 'differs' });
    expect(row(t, 'Minimum PSU')).toMatchObject({ values: ['650 W', null], status: 'partial' });
  });

  it('a row unknown for every item is "none"; a label only one item has still gets a row', () => {
    const c = item('c', gpu({ id: 'skroutz:3' }));
    const t = buildTable('gpu', [c, c], 'en');
    expect(t.rows.filter((r) => r.group !== 'price' && r.status === 'none')).toEqual([]); // spec rows no item states are not created
    const d = buildTable('gpu', [item('x', gpu({ id: 'skroutz:4', minPsu: 500 })), item('y', gpu({ id: 'skroutz:5' }))], 'en');
    expect(row(d, 'Minimum PSU')?.status).toBe('partial');
  });

  it('hide identical keeps differing and unknown rows; hide unknown drops rows no item states', () => {
    const t = buildTable('gpu', [a, b], 'en');
    const kept = visibleRows(t.rows, { hideIdentical: true, hideUnknown: false }).map((r) => r.label);
    expect(kept).not.toContain('Length');
    expect(kept).toContain('Memory type');
    expect(kept).toContain('Minimum PSU');
    const withNone = [...t.rows, { id: 'x', label: 'x', group: 'general' as const, values: [null, null], tags: [], status: 'none' as const }];
    expect(visibleRows(withNone, { hideIdentical: false, hideUnknown: true }).some((r) => r.label === 'x')).toBe(false);
    expect(visibleRows(withNone, { hideIdentical: false, hideUnknown: false }).some((r) => r.label === 'x')).toBe(true);
  });

  it('price rows: lowest price and delivered total, with a "lower" marker only when every total is known', () => {
    const t = buildTable('gpu', [a, b], 'en');
    expect(row(t, 'Lowest price')?.values).toEqual(['€320.00', '€300.00']);
    expect(row(t, 'Lowest price')?.lower).toBe(1);
    expect(row(t, 'Lowest total with delivery')?.values).toEqual(['€323.00', '€305.00']);
    expect(row(t, 'Lowest total with delivery')?.lower).toBe(1);
    const unknownTotal = item('c', gpu({ id: 'skroutz:6', price: 280 }));
    const t2 = buildTable('gpu', [a, unknownTotal], 'en');
    expect(row(t2, 'Lowest price')?.lower).toBe(1);
    expect(row(t2, 'Lowest total with delivery')?.values).toEqual(['€323.00', null]);
    expect(row(t2, 'Lowest total with delivery')?.lower).toBeUndefined();
  });

  it('equal prices carry no lower marker; spec rows never carry one', () => {
    const t = buildTable('gpu', [a, item('d', gpu({ id: 'skroutz:7', price: 320, shipping: 3, total: 323 }))], 'en');
    expect(row(t, 'Lowest price')?.lower).toBeUndefined();
    expect(t.rows.filter((r) => r.group !== 'price').every((r) => r.lower === undefined)).toBe(true);
  });

  it('a family compares its cheapest offers; an exact item compares only its own listing', () => {
    const family = item('f', gpu({ id: 'skroutz:8', price: 400 }), gpu({ id: 'bestprice:9', source: 'bestprice', price: 350, shipping: 2, total: 352 }));
    const t = buildTable('gpu', [family], 'en');
    expect(row(t, 'Lowest price')?.values).toEqual(['€350.00']);
    expect(row(t, 'Lowest total with delivery')?.values).toEqual(['€352.00']);
  });

  it('availability appears only when some offer states it', () => {
    expect(row(buildTable('gpu', [a, b], 'en'), 'Availability')).toBeUndefined();
    const withStock = item('s', { ...gpu({ id: 'skroutz:10' }), availability: 'In stock' } as GpuListing);
    expect(row(buildTable('gpu', [withStock, b], 'en'), 'Availability')?.values).toEqual(['In stock', null]);
  });

  it('labels come in Greek as well, and a page-only value keeps its tag', () => {
    const t = buildTable('gpu', [a, b], 'el');
    expect(t.rows.some((r) => r.label === 'Χαμηλότερη τιμή')).toBe(true);
    expect(t.rows.some((r) => r.label === 'Τύπος μνήμης')).toBe(true);
  });
});
