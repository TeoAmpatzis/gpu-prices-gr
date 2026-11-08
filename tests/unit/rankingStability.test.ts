// Recommended v2 (design 2026-11-08 WS3): the order does not depend on the filters, a real deal is only a small tie-break,
// and a premium card is not buried for its price.
import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '../../src/lib/categories';
import { defaultFilters, saleOf, groupModels } from '../../src/lib/data';
import { filterCatalogue, sortCatalogue } from '../../src/lib/catalogueFilters';
import { DEAL_BOOST, RANKING, recommendedScores } from '../../src/lib/ranking';
import type { GpuListing } from '../../src/types';

const cfg = CATEGORIES.gpu;
let n = 0;
const card = (chip: string, price: number, source: GpuListing['source'], extra: Partial<GpuListing> = {}): GpuListing => ({
  id: `c${n++}`,
  source,
  price,
  lengthMm: 250,
  title: `${chip} ${n}`,
  chip,
  brand: chip.startsWith('RX') || chip.startsWith('Arc') ? 'AMD' : 'NVIDIA',
  vram: 12,
  partner: 'MSI',
  url: '',
  shopCount: 3,
  scrapedAt: '',
  ...extra,
});
const SOURCES: GpuListing['source'][] = ['skroutz', 'bestprice', 'shopflix', 'snif', 'eshop'];
/** A model sold by `shops` shops at roughly `price`. */
const model = (chip: string, price: number, shops: number) => SOURCES.slice(0, shops).map((s, i) => card(chip, price + i * 3, s));
const catalogue = [
  ...model('RTX 5090', 2400, 5),
  ...model('RTX 5080', 1250, 5),
  ...model('RTX 5070 Ti', 900, 5),
  ...model('RTX 5070', 640, 5),
  ...model('RTX 5060 Ti', 460, 5),
  ...model('RTX 5060', 330, 5),
  ...model('RTX 5050', 250, 5),
  ...model('RX 9060 XT', 340, 4),
  ...model('RX 7600', 260, 4),
  ...model('GTX 1650', 150, 3),
];
const order = (all: GpuListing[], f = defaultFilters(cfg.groups)) => {
  const fl = { ...f, sort: 'model' as const };
  return sortCatalogue(filterCatalogue(all, fl, cfg), fl, cfg).map((p) => p.family.cheapest.chip);
};
const unique = (xs: string[]) => [...new Set(xs)];

describe('Recommended v2', () => {
  it('keeps two models in the same relative order whatever the filters remove', () => {
    const full = unique(order(catalogue));
    for (const sources of [['skroutz'], ['skroutz', 'bestprice'], ['eshop', 'snif', 'shopflix']] as GpuListing['source'][][]) {
      const narrowed = unique(order(catalogue, { ...defaultFilters(cfg.groups), sources }));
      expect(narrowed).toEqual(full.filter((chip) => narrowed.includes(chip)));
    }
    const nvidia = unique(order(catalogue, { ...defaultFilters(cfg.groups), groups: ['NVIDIA'] }));
    expect(nvidia).toEqual(full.filter((chip) => nvidia.includes(chip)));
  });

  it('does not bury a premium card: 5070 Ti above 5050 and above RX 9060 XT, 5090 and 5080 not in the bottom three', () => {
    const ranked = unique(order(catalogue));
    const at = (chip: string) => ranked.indexOf(chip);
    expect(at('RTX 5070 Ti')).toBeLessThan(at('RTX 5050'));
    expect(at('RTX 5070 Ti')).toBeLessThan(at('RX 9060 XT'));
    expect(at('RTX 5090')).toBeLessThan(ranked.length - 3);
    expect(at('RTX 5080')).toBeLessThan(ranked.length - 3);
  });

  it('a real deal adds at most 3% to a score, and "lowest" adds nothing', () => {
    expect(DEAL_BOOST).toBe(1.03);
    const base = groupModels(model('RTX 5070', 640, 5), cfg);
    const withDeal = groupModels(model('RTX 5070', 640, 5).map((l) => ({ ...l, dealPct: 12, dealRef: 727 })), cfg);
    const withLowest = groupModels(model('RTX 5070', 640, 5).map((l) => ({ ...l, lowestSince: '2026-08-01' })), cfg);
    const score = (ms: typeof base) => recommendedScores(ms.map((m) => ({ ...m, sale: saleOf(m.listings, m.cheapest) })), 'gpu', cfg.value).get(ms[0].key)!;
    expect(score(withDeal) / score(base)).toBeCloseTo(DEAL_BOOST, 5);
    expect(score(withLowest)).toBe(score(base));
    for (const rc of Object.values(RANKING)) expect(rc.saleBoost).toBeLessThanOrEqual(1.03);
  });

  it('gives GPUs only a small price-fit weight', () => {
    expect(RANKING.gpu.weights.price).toBeLessThanOrEqual(0.1);
  });
});
