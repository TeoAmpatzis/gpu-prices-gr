import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '../../src/lib/categories';
import { defaultFilters } from '../../src/lib/data';
import { filterCatalogue, sortCatalogue } from '../../src/lib/catalogueFilters';
import { facetCounts, shownListings } from '../../src/lib/facets';
import { decodeFilters, encodeFilters } from '../../src/lib/filterUrl';
import { encodeOfferChoice } from '../../src/lib/productSelection';
import type { GpuListing } from '../../src/types';
import { productSpecs } from '../../src/components/catalogue/specs';

const listing = (id: string, price: number, lengthMm: number | null, source: GpuListing['source'] = 'skroutz'): GpuListing => ({
  id,
  source,
  price,
  lengthMm,
  title: `Own card ${source} ${id}`,
  chip: 'GeForce RTX 5070',
  brand: 'NVIDIA',
  vram: 12,
  partner: 'MSI',
  url: '',
  shopCount: 1,
  scrapedAt: '',
});
const all = [listing('same', 300, 250), listing('same', 600, 350, 'bestprice'), listing('unknown', 400, null)];
const cfg = CATEGORIES.gpu;
describe('individual catalogue records', () => {
  it('filters price and measurements on the same listing, preserving source-qualified identity', () => {
    const f = {
      ...defaultFilters(cfg.groups),
      maxPrice: 500,
      numericMax: 300,
      includeUnknown: false,
    };
    expect(filterCatalogue(all, f, cfg).map((p) => p.key)).toEqual([encodeOfferChoice(all[0])]);
    expect(filterCatalogue(all, { ...f, includeUnknown: true }, cfg).map((p) => p.listing.id)).toEqual(['same', 'unknown']);
    expect(filterCatalogue(all, { ...f, sources: ['bestprice'] }, cfg)).toEqual([]);
  });
  it('sorts and paginates visible listings globally, not their family minimum', () => {
    const f = { ...defaultFilters(cfg.groups), sort: 'price-desc' as const };
    const products = sortCatalogue(filterCatalogue(all, f, cfg), f, cfg);
    expect(products.map((p) => p.listing.price)).toEqual([600, 400, 300]);
    expect(products.slice(1, 2)[0].listing.id).toBe('unknown');
  });
  it('counts listings rather than families and hides only the qualified source product', () => {
    const f = defaultFilters(cfg.groups);
    const counts = facetCounts(all, f, cfg, {}, {}, {});
    expect(counts.groups.NVIDIA).toBe(3);
    expect(counts.sources.skroutz).toBe(2);
    expect(shownListings(all, [encodeOfferChoice(all[0])])).toEqual(all.slice(1));
  });
  it('round trips both range endpoints and explicit unknown policy through existing URLs', () => {
    const f = {
      ...defaultFilters(cfg.groups),
      minPrice: 100,
      maxPrice: 500,
      numericMin: 200,
      numericMax: 300,
      includeUnknown: false,
    };
    expect(decodeFilters(new URLSearchParams(encodeFilters(f, cfg)), cfg)).toEqual(f);
  });
  it('preserves explicitly empty source and group selections on refresh', () => {
    const f = { ...defaultFilters(cfg.groups), groups: [], sources: [] };
    expect(decodeFilters(new URLSearchParams(encodeFilters(f, cfg)), cfg)).toEqual(f);
  });
  it('preserves a zero price cap rather than restoring all products', () => {
    const f = { ...defaultFilters(cfg.groups), maxPrice: 0 };
    expect(decodeFilters(new URLSearchParams(encodeFilters(f, cfg)), cfg)).toEqual(f);
  });
  it('never lends a sibling discount or measurement to a product', () => {
    const siblings = [
      { ...all[0], drop: 20 },
      { ...all[1], drop: null },
    ];
    expect(filterCatalogue(siblings, { ...defaultFilters(cfg.groups), saleOnly: true }, cfg).map((p) => p.key)).toEqual([encodeOfferChoice(siblings[0])]);
    expect(productSpecs('gpu', siblings[0], 'en')[0].value).toBe('250 mm');
    expect(productSpecs('gpu', all[2], 'en')[0].value).toBeNull();
    expect(productSpecs('gpu', all[2], 'en')[2].value).toBeNull();
  });
});
