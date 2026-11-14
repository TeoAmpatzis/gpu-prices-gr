// Mousepad pills and filters: the pill is the size word, only stated values match, and the pill counts use the same rule
// as the filter. A pad is a peripheral: never in the PC builder, and hidden until the owner publishes it.
import { describe, expect, it } from 'vitest';
import { CATEGORIES, type CategoryConfig } from '../../src/lib/categories';
import { MOUSEPAD_RULES, OTHER, padSize } from '../../src/lib/categoryRules';
import { filterCatalogue } from '../../src/lib/catalogueFilters';
import { defaultFilters, type Filters } from '../../src/lib/data';
import { facetCounts, optionsOf } from '../../src/lib/facets';
import { decodeFilters, encodeFilters } from '../../src/lib/filterUrl';
import { REGISTRY, slotOf } from '../../src/lib/registry';
import type { MousepadListing } from '../../src/types';

let n = 0;
const pad = (o: Partial<MousepadListing> = {}): MousepadListing => ({
  id: `bestprice:${++n}`, source: 'bestprice', title: 'Acme P1', url: `https://x/${n}`, price: 12, shopCount: 2,
  brand: 'Acme', chip: `Acme P${n}`, scrapedAt: '2026-11-14T00:00:00Z',
  size: null, shape: null, gaming: null, extended: null, widthMm: null, heightMm: null, thicknessMm: null, surface: null,
  rgb: null, wristRest: null, usbPort: null, wirelessCharging: null, antiSlip: null, stitchedEdges: null, colour: null, partNumber: null,
  ...o,
});
const filter = (key: string) => MOUSEPAD_RULES.extraFilters.find((f) => f.key === key)!;
const cfg = CATEGORIES.mousepad as CategoryConfig<MousepadListing>;
const filters = (o: Partial<Filters>): Filters => ({ ...defaultFilters(cfg.groups), ...o });
const ids = (all: MousepadListing[], f: Partial<Filters>) => filterCatalogue(all, filters(f), cfg).map((p) => p.listing.id).sort();

describe('mousepad registry entry', () => {
  it('is a peripheral, outside the builder, disabled and hidden', () => {
    expect(REGISTRY.mousepad).toEqual({ domain: 'peripherals', enabled: false, visible: false });
    expect(slotOf('mousepad')).toBeNull();
  });
});

describe('mousepad size pills', () => {
  it('the pill is the size word; an unstated size is in no pill', () => {
    expect(MOUSEPAD_RULES.group(pad({ size: 'XXL' }))).toBe('xxl');
    expect(MOUSEPAD_RULES.group(pad({ size: 'Medium' }))).toBe('medium');
    expect(MOUSEPAD_RULES.group(pad())).toBe(OTHER);
    expect(MOUSEPAD_RULES.groups).toEqual(['small', 'medium', 'large', 'xl', 'xxl', 'xxxl']);
  });

  it('the filter and the pill counts agree and All keeps the unknown', () => {
    const all = [pad({ size: 'XXL' }), pad({ size: 'Medium' }), pad({ size: 'XXL' }), pad()];
    const [a, b, c, unknown] = all.map((l) => l.id);
    expect(ids(all, {})).toEqual([a, b, c, unknown].sort());
    expect(ids(all, { groups: ['xxl'] })).toEqual([a, c].sort());
    const counts = facetCounts(all, filters({}), cfg, {}, {}, optionsOf(cfg, all));
    expect(counts.groups).toEqual({ small: 0, medium: 1, large: 0, xl: 0, xxl: 2, xxxl: 0 });
  });
});

describe('mousepad filters match stated values only', () => {
  it('yes / no flags: an unknown value matches neither, "No" is offered only once a source states it', () => {
    for (const key of ['gaming', 'rgb', 'wristRest'] as const) {
      const f = filter(key);
      expect(f.options([pad({ [key]: true }), pad()]).map((o) => o.value)).toEqual(['yes']);
      expect(f.options([pad({ [key]: false })]).map((o) => o.value)).toEqual(['yes', 'no']);
      for (const v of ['yes', 'no']) expect(f.test(pad({ [key]: null }), v)).toBe(false);
      expect(f.test(pad({ [key]: true }), 'yes')).toBe(true);
      expect(f.test(pad({ [key]: false }), 'no')).toBe(true);
    }
  });

  it('length is a minimum on a stated width only', () => {
    const f = filter('widthMm');
    expect(f.test(pad({ widthMm: 900 }), '800')).toBe(true);
    expect(f.test(pad({ widthMm: 350 }), '800')).toBe(false);
    expect(f.test(pad({ widthMm: null }), '300')).toBe(false);
  });

  it('every filter survives the address round trip', () => {
    const f = filters({ groups: ['xxl'], extra: { rgb: 'yes', widthMm: '800' } });
    expect(decodeFilters(new URLSearchParams(encodeFilters(f, cfg)), cfg)).toEqual(f);
  });
});

describe('padSize', () => {
  it('shows both sides when stated, the long side alone otherwise, nothing when unstated', () => {
    expect(padSize({ widthMm: 900, heightMm: 400 })).toBe('900 × 400 mm');
    expect(padSize({ widthMm: 900, heightMm: null })).toBe('900 mm');
    expect(padSize({ widthMm: null, heightMm: null })).toBeNull();
  });
});
