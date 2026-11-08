// Filters start empty: no group and no source selected means "all"; ticking narrows; unticking the last one is "all"
// again (design 2026-11-08 WS4). Old links with the full list keep showing everything.
import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '../../src/lib/categories';
import { activeFilterCount, defaultFilters } from '../../src/lib/data';
import { filterCatalogue } from '../../src/lib/catalogueFilters';
import { decodeFilters, encodeFilters } from '../../src/lib/filterUrl';
import type { GpuListing } from '../../src/types';

const cfg = CATEGORIES.gpu;
const card = (id: string, brand: GpuListing['brand'], chip: string, source: GpuListing['source']): GpuListing => ({
  id,
  source,
  price: 300,
  lengthMm: 250,
  title: `${brand} ${chip} ${id}`,
  chip,
  brand,
  vram: 12,
  partner: 'MSI',
  url: '',
  shopCount: 1,
  scrapedAt: '',
});
const all = [
  card('a', 'NVIDIA', 'GeForce RTX 5070', 'skroutz'),
  card('b', 'AMD', 'Radeon RX 9070', 'bestprice'),
  card('c', 'NVIDIA', 'GeForce RTX 5060', 'shopflix'),
];
const ids = (f: ReturnType<typeof defaultFilters>) => filterCatalogue(all, f, cfg).map((p) => p.listing.id).sort();

describe('empty selection means all', () => {
  it('the defaults select nothing and show everything', () => {
    const f = defaultFilters(cfg.groups);
    expect(f.groups).toEqual([]);
    expect(f.sources).toEqual([]);
    expect(ids(f)).toEqual(['a', 'b', 'c']);
    expect(activeFilterCount(f, cfg.groups)).toBe(0);
  });

  it('ticking a group or a source narrows', () => {
    expect(ids({ ...defaultFilters(cfg.groups), groups: ['AMD'] })).toEqual(['b']);
    expect(ids({ ...defaultFilters(cfg.groups), sources: ['shopflix', 'skroutz'] })).toEqual(['a', 'c']);
    expect(activeFilterCount({ ...defaultFilters(cfg.groups), groups: ['AMD'], sources: ['skroutz'] }, cfg.groups)).toBe(2);
  });

  it('the URL of the defaults is empty and a ticked group round-trips', () => {
    expect(encodeFilters(defaultFilters(cfg.groups), cfg)).toBe('');
    const f = { ...defaultFilters(cfg.groups), groups: ['AMD'] };
    const qs = encodeFilters(f, cfg);
    expect(qs).toContain(`${cfg.groupParam}=`);
    expect(decodeFilters(new URLSearchParams(qs), cfg).groups).toEqual(['AMD']);
  });

  it('an old link that lists every group and source still shows everything', () => {
    const everyGroup = cfg.groups.map((g) => g.toLowerCase()).join(',');
    const f = decodeFilters(new URLSearchParams(`${cfg.groupParam}=${everyGroup}&src=skroutz,bestprice,shopflix,snif,eshop`), cfg);
    expect(ids(f)).toEqual(['a', 'b', 'c']);
  });

  it('an empty value in a link means all, not nothing', () => {
    const f = decodeFilters(new URLSearchParams(`${cfg.groupParam}=&src=`), cfg);
    expect(ids(f)).toEqual(['a', 'b', 'c']);
  });
});
