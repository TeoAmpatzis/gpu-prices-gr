// Product page offers (step 4, task 6): the shops table's order, the header's cheapest offer, the "checked" time and
// the page's new strings in both languages.
import { describe, expect, it } from 'vitest';
import { availabilityOf, checkedAt, hasAvailability, offerTotal, sortOffers } from '../../src/lib/offers';
import { isStale } from '../../src/ui/PriceCell';
import { ago, UI } from '../../src/ui/strings';
import type { BaseListing } from '../../src/types';

let n = 0;
const offer = (price: number, shipping: number | null, extra: Partial<BaseListing> = {}): BaseListing => ({
  id: `skroutz:${++n}`,
  source: 'skroutz',
  title: `Card ${n}`,
  url: `https://example.test/${n}`,
  price,
  shopCount: 1,
  brand: 'NVIDIA',
  chip: 'RTX 5070',
  scrapedAt: '2026-10-17T10:00:00+00:00',
  shipping,
  total: shipping == null ? null : price + shipping,
  merchant: shipping == null ? null : 'Shop',
  ...extra,
});

describe('sortOffers', () => {
  it('orders by total (price + shipping when known), then price', () => {
    const a = offer(100, 10); // 110
    const b = offer(105, 0); // 105
    const c = offer(95, 12); // 107
    expect(sortOffers([a, b, c]).map((o) => o.id)).toEqual([b.id, c.id, a.id]);
  });

  it('an offer with unknown shipping comes after a known-total offer of the same price', () => {
    const unknown = offer(100, null);
    const free = offer(100, 0); // total 100, same as the unknown one's price
    const paid = offer(97, 3); // total 100 as well, lower price
    expect(sortOffers([unknown, free, paid]).map((o) => o.id)).toEqual([paid.id, free.id, unknown.id]);
  });

  it('an unknown-shipping offer still comes first when its price is under every known total', () => {
    const unknown = offer(90, null);
    const known = offer(92, 0);
    expect(sortOffers([known, unknown]).map((o) => o.id)).toEqual([unknown.id, known.id]);
  });

  it('two unknown-shipping offers: by price', () => {
    const a = offer(120, null);
    const b = offer(110, null);
    expect(sortOffers([a, b]).map((o) => o.id)).toEqual([b.id, a.id]);
  });

  it('a total that belongs to another offer of the product (ownTotal) counts as unknown', () => {
    // The cached best total is 60 € under the listing price: another shop's offer, so not this one's total.
    const wrong = offer(200, 2, { total: 142 });
    const known = offer(199, 2); // 201
    const sorted = sortOffers([known, wrong]);
    expect(sorted.map((o) => o.id)).toEqual([wrong.id, known.id]); // 200 (unknown) before 201
    expect(sorted[0]).toMatchObject({ shipping: null, total: null, merchant: null });
  });

  it('a one-listing model gives that one offer', () => {
    const only = offer(321.5, null);
    expect(sortOffers([only])).toEqual([only]);
  });

  it('does not change the input array', () => {
    const list = [offer(3, 0), offer(1, 0), offer(2, 0)];
    const ids = list.map((o) => o.id);
    sortOffers(list);
    expect(list.map((o) => o.id)).toEqual(ids);
  });
});

describe('availability and checked time', () => {
  it('no listing states availability today, so the column is left out', () => {
    expect(hasAvailability([offer(1, 0), offer(2, null)])).toBe(false);
    expect(availabilityOf(offer(1, 0))).toBeNull();
  });

  it('one listing with availability is enough for the column', () => {
    const withIt = { ...offer(1, 0), availability: 'Άμεσα διαθέσιμο' };
    expect(hasAvailability([offer(2, 0), withIt])).toBe(true);
    expect(availabilityOf(withIt)).toBe('Άμεσα διαθέσιμο');
    const blank = { ...offer(1, 0), availability: '  ' };
    expect(availabilityOf(blank)).toBeNull();
  });

  it("checked = the offer's source updatedAt", () => {
    const sources = { skroutz: { count: 1, ok: true, updatedAt: '2026-10-17T09:00:00Z' }, snif: { count: 1, ok: true, updatedAt: null } };
    expect(checkedAt(sources, 'skroutz')).toBe('2026-10-17T09:00:00Z');
    expect(checkedAt(sources, 'snif')).toBeNull();
    expect(checkedAt(sources, 'eshop')).toBeNull();
  });

  it('a price read more than 24 h ago is stale (marked ⚠ as in the price cell); an unknown time is not', () => {
    const now = Date.parse('2026-10-18T12:00:00Z');
    const sources = {
      skroutz: { count: 1, ok: true, updatedAt: '2026-10-17T11:00:00Z' }, // 25 h
      bestprice: { count: 1, ok: true, updatedAt: '2026-10-17T13:00:00Z' }, // 23 h
    };
    expect(isStale(checkedAt(sources, 'skroutz'), now)).toBe(true);
    expect(isStale(checkedAt(sources, 'bestprice'), now)).toBe(false);
    expect(isStale(checkedAt(sources, 'snif'), now)).toBe(false);
  });
});

describe('offerTotal: price + shipping, so every row adds up', () => {
  it('the sum, not the cached total, when ownTotal accepts the total', () => {
    // The cached total is within 2% of price + shipping (ownTotal keeps it) but not equal to it.
    expect(offerTotal(offer(456.83, 4, { total: 456.99 }))).toBeCloseTo(460.83, 10);
    expect(offerTotal(offer(100, 0))).toBe(100);
  });

  it('unknown when the shipping is unknown or the total belongs to another offer', () => {
    expect(offerTotal(offer(100, null))).toBeNull();
    expect(offerTotal(offer(200, 2, { total: 142 }))).toBeNull();
  });

  it('the order follows the shown totals', () => {
    const a = offer(100, 4, { total: 102 }); // shown 104 (cached 102 is within 2%)
    const b = offer(103, 0); // 103
    expect(sortOffers([a, b]).map((o) => o.id)).toEqual([b.id, a.id]);
  });
});

describe('product page strings', () => {
  const keys = ['toShop', 'shopsTitle', 'offerShop', 'offerShipping', 'offerTotal', 'offerAvailability', 'offerChecked', 'noShipping', 'lowestTotal', 'withShipping', 'keySpecs', 'specYes', 'showAllOffers', 'openShop', 'newTab'] as const;

  it.each(keys)('%s has Greek and English text', (k) => {
    const t = UI[k];
    expect(t.el.trim()).not.toBe('');
    expect(t.en.trim()).not.toBe('');
    expect(t.el).toMatch(/[α-ωά-ώ]/i);
    expect(t.en).not.toMatch(/[α-ωά-ώ]/i);
  });

  it('the shop button reads as the brief says; unknown shipping as the glossary (docs/phase1/glossary.md)', () => {
    expect(UI.toShop).toEqual({ el: 'Στο κατάστημα', en: 'To the shop' });
    expect(UI.noShipping).toEqual({ el: 'Μεταφορικά: άγνωστα', en: 'Shipping: unknown' });
    expect('shippingNotKnown' in UI).toBe(false);
  });

  it('"Show all N" names the number of offers', () => {
    expect(UI.showAllOffers.el.replace('{n}', '141')).toBe('Δες και τις 141');
    expect(UI.showAllOffers.en.replace('{n}', '141')).toBe('Show all 141');
  });

  it('"checked" ages: πριν από 3 ώρ. / 3 h ago', () => {
    const iso = new Date(Date.now() - 3 * 3_600_000).toISOString();
    expect(ago('el', iso)).toBe('πριν από 3 ώρ.');
    expect(ago('en', iso)).toBe('3 h ago');
    expect(ago('el', null)).toBe('—');
  });
});
