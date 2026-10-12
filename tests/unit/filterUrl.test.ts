// Pick mode in the URL (v2 step 3): `pick=1` and `compat=0` survive every filter, sort and page change, and the
// pick page's default sort is price ascending unless the URL says otherwise.
import { describe, expect, it } from 'vitest';
import { CATEGORIES, type CategoryConfig } from '../../src/lib/categories';
import { defaultFilters, type Filters } from '../../src/lib/data';
import { decodeFilters, encodeFilters, leavePick } from '../../src/lib/filterUrl';
import type { BaseListing } from '../../src/types';

const mobo = CATEGORIES.mobo as unknown as CategoryConfig<BaseListing>;
const decode = (qs: string) => decodeFilters(new URLSearchParams(qs), mobo);
const encode = (f: Filters) => encodeFilters(f, mobo);
/** A change made the way the UI makes it (spread of the current filters), then written and read back. */
const roundTrip = (f: Filters) => decode(encode(f));

describe('pick mode in the URL', () => {
  it('a normal page has no pick and keeps its URL as before', () => {
    const f = decode('sort=price-asc&page=2');
    expect(f.pick).toBe(false);
    expect(f.compat).toBe(true);
    expect(encode(f)).toBe('sort=price-asc&page=2');
    expect(encode(defaultFilters(mobo.groups))).toBe('');
    expect(defaultFilters(mobo.groups).sort).toBe('model');
  });

  it('pick=1 defaults to price ascending, written without a sort parameter', () => {
    const f = decode('pick=1');
    expect(f.pick).toBe(true);
    expect(f.compat).toBe(true);
    expect(f.sort).toBe('price-asc');
    expect(encode(f)).toBe('pick=1');
  });

  it('a sort in the URL wins over the pick default, including Recommended', () => {
    expect(decode('pick=1&sort=price-desc').sort).toBe('price-desc');
    const rec = { ...decode('pick=1'), sort: 'model' as const };
    expect(encode(rec)).toBe('pick=1&sort=model');
    expect(roundTrip(rec).sort).toBe('model');
  });

  it('compat=0 is read only in pick mode and written only when off', () => {
    expect(decode('pick=1&compat=0').compat).toBe(false);
    expect(decode('compat=0').compat).toBe(true);
    expect(encode({ ...decode('pick=1'), compat: false })).toBe('pick=1&compat=0');
    expect(encode({ ...decode('compat=0') })).toBe('');
  });

  it('pick and compat survive filter, sort and page changes', () => {
    const start = decode('pick=1&compat=0');
    const changes: Partial<Filters>[] = [
      { query: 'b650' },
      { extra: { ...start.extra, chipset: 'b650' } },
      { groups: mobo.groups.slice(0, 1) },
      { saleOnly: true },
      { maxPrice: 200 },
      { sort: 'offers' },
      { sort: 'model' },
      { page: 3 },
      { per: 100 },
    ];
    let f = start;
    for (const c of changes) {
      f = roundTrip({ ...f, ...c });
      expect(f.pick).toBe(true);
      expect(f.compat).toBe(false);
    }
    expect(f).toMatchObject({ query: 'b650', saleOnly: true, maxPrice: 200, sort: 'model', page: 3, per: 100 });
  });

  it('the filter resets keep pick mode (the "Clear" buttons build on defaultFilters(groups, pick))', () => {
    const f = decode('pick=1&compat=0&q=x');
    const cleared = { ...defaultFilters(mobo.groups, f.pick), per: f.per };
    expect(encode(cleared)).toBe('pick=1');
  });

  it('leaving pick mode (a plain link to the page) keeps the other filters', () => {
    const f = decode('pick=1&compat=0&q=x&sort=offers');
    const plain = leavePick(f);
    expect(plain.pick).toBe(false);
    expect(plain.compat).toBe(true);
    expect(encode(plain)).toBe('q=x&sort=offers');
    // The pick default sort is not carried over to the normal page.
    expect(encode(leavePick(decode('pick=1&q=x')))).toBe('q=x');
    expect(leavePick(decode('q=x'))).toEqual(decode('q=x'));
  });
});
