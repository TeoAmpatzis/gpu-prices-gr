// Headphone pills and filters: only stated values match, a pair that works both ways is under both connections,
// bone conduction sits in the open-ear pill, and the pill counts use the same rule as the filter.
import { describe, expect, it } from 'vitest';
import { CATEGORIES, type CategoryConfig } from '../../src/lib/categories';
import { HEADPHONES_RULES, OTHER } from '../../src/lib/categoryRules';
import { filterCatalogue } from '../../src/lib/catalogueFilters';
import { defaultFilters, type Filters } from '../../src/lib/data';
import { facetCounts, optionsOf } from '../../src/lib/facets';
import { decodeFilters, encodeFilters } from '../../src/lib/filterUrl';
import type { HeadphonesListing } from '../../src/types';

let n = 0;
const phones = (o: Partial<HeadphonesListing> = {}): HeadphonesListing => ({
  id: `bestprice:${++n}`, source: 'bestprice', title: 'Acme H1', url: `https://x/${n}`, price: 40, shopCount: 2,
  brand: 'Acme', chip: `Acme H${n}`, scrapedAt: '2026-11-14T00:00:00Z',
  formFactor: null, productType: null, gaming: null, trueWireless: null, connection: null, bluetooth: null, rf: null,
  connector: null, multipoint: null, anc: null, transparency: null, microphone: null, spatialAudio: null, driverMm: null,
  batteryHours: null, chargingCase: null, waterResistance: null, foldable: null, colour: null, partNumber: null,
  ...o,
});
const filter = (key: string) => HEADPHONES_RULES.extraFilters.find((f) => f.key === key)!;
const cfg = CATEGORIES.headphones as CategoryConfig<HeadphonesListing>;
const filters = (o: Partial<Filters>): Filters => ({ ...defaultFilters(cfg.groups), ...o });
const ids = (all: HeadphonesListing[], f: Partial<Filters>) => filterCatalogue(all, filters(f), cfg).map((p) => p.listing.id).sort();

describe('headphone form-factor pills', () => {
  it('bone conduction is listed under open-ear; an unknown form factor is in no pill', () => {
    expect(HEADPHONES_RULES.group(phones({ formFactor: 'bone-conduction' }))).toBe('open-ear');
    expect(HEADPHONES_RULES.group(phones({ formFactor: 'open-ear' }))).toBe('open-ear');
    expect(HEADPHONES_RULES.group(phones({ formFactor: 'over-ear' }))).toBe('over-ear');
    expect(HEADPHONES_RULES.group(phones())).toBe(OTHER);
    expect(HEADPHONES_RULES.groups).toEqual(['over-ear', 'on-ear', 'in-ear', 'open-ear']);
  });

  it('the filter and the pill counts agree and All keeps the unknown', () => {
    const all = [phones({ formFactor: 'over-ear' }), phones({ formFactor: 'in-ear' }), phones({ formFactor: 'bone-conduction' }), phones()];
    const [over, inEar, bone, unknown] = all.map((l) => l.id);
    expect(ids(all, {})).toEqual([over, inEar, bone, unknown].sort());
    expect(ids(all, { groups: ['open-ear'] })).toEqual([bone]);
    expect(ids(all, { groups: ['over-ear', 'in-ear'] })).toEqual([over, inEar].sort());
    const counts = facetCounts(all, filters({}), cfg, {}, {}, optionsOf(cfg, all));
    expect(counts.groups).toEqual({ 'over-ear': 1, 'on-ear': 0, 'in-ear': 1, 'open-ear': 1 });
  });
});

describe('headphone filters match stated values only', () => {
  it('connection: a pair that works both ways is under both, an unknown connection under neither', () => {
    const f = filter('connection');
    expect(f.test(phones({ connection: 'both' }), 'wired')).toBe(true);
    expect(f.test(phones({ connection: 'both' }), 'wireless')).toBe(true);
    expect(f.test(phones({ connection: 'wired' }), 'wireless')).toBe(false);
    expect(f.test(phones({ connection: null }), 'wired')).toBe(false);
    expect(f.test(phones({ connection: null }), 'wireless')).toBe(false);
  });

  it('yes / no flags: an unknown value matches neither, "No" is offered only once a source states it', () => {
    for (const key of ['anc', 'trueWireless', 'microphone', 'gaming', 'bluetooth'] as const) {
      const f = filter(key);
      expect(f.options([phones({ [key]: true }), phones()]).map((o) => o.value)).toEqual(['yes']);
      expect(f.options([phones({ [key]: false })]).map((o) => o.value)).toEqual(['yes', 'no']);
      for (const v of ['yes', 'no']) expect(f.test(phones({ [key]: null }), v)).toBe(false);
      expect(f.test(phones({ [key]: true }), 'yes')).toBe(true);
      expect(f.test(phones({ [key]: false }), 'no')).toBe(true);
    }
  });

  it('battery life is a minimum on a stated figure only', () => {
    const f = filter('batteryHours');
    expect(f.test(phones({ batteryHours: 30 }), '20')).toBe(true);
    expect(f.test(phones({ batteryHours: 10 }), '20')).toBe(false);
    expect(f.test(phones({ batteryHours: null }), '10')).toBe(false);
  });

  it('every filter survives the address round trip', () => {
    const f = filters({ groups: ['in-ear'], extra: { anc: 'yes', connection: 'wireless', batteryHours: '20' } });
    expect(decodeFilters(new URLSearchParams(encodeFilters(f, cfg)), cfg)).toEqual(f);
  });
});
