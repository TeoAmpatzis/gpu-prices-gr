import { describe, expect, it } from 'vitest';
import { offersFor, offerSlug, resolveLine } from '../../src/lib/builderOffers';
import { psuProductKey } from '../../src/lib/builderData';
import type { PsuListing } from '../../src/types';
import type { ModelEntry, BaseListing } from '../../src/types';
import type { AnyModel } from '../../src/lib/builderState';

const listing = (id: string, fields: object = {}): BaseListing => ({ id, source: 'bestprice', title: id, url: `https://example.com/${id}`, price: 50, shopCount: null, brand: 'AMD', chip: 'Ryzen 5 7600', scrapedAt: '', ...fields });
const model = (key: string, row: BaseListing): AnyModel => ({ key, chip: row.chip, cheapest: row, listings: [row], maxPrice: row.price } as AnyModel);
const entry = (listings: BaseListing[], parts: object): ModelEntry => ({ listings, parts } as ModelEntry);

describe('builder offer ownership', () => {
  it('resolves qualified collisions, rejects ambiguous legacy ids, and exposes no unresolved purchase URL', () => {
    const a = listing('same', { source: 'skroutz' });
    const b = listing('same', { source: 'bestprice', price: 70 });
    expect(resolveLine('cpu', model('cpu', a), 1, 'bd1:bestprice:same', [a, b]).offer).toMatchObject({ source: 'bestprice', price: 70 });
    expect(resolveLine('cpu', model('cpu', a), 1, 'same', [a, b]).status).toBe('missing');
    for (const resolved of [resolveLine('cpu', model('cpu', a), 1, 'gone'), resolveLine('cpu', model('cpu', a), 1, 'gone', undefined, true), resolveLine('cpu', model('cpu', a), 1, 'gone', [])]) {
      expect(resolved.offer.url).toBe('');
    }
  });
  it('looks up the category CPU, not the builder version key', () => {
    expect(offerSlug('cpu', model('Ryzen 5 7600|true', listing('box')))).toBe('ryzen-5-7600');
  });
  it('never crosses CPU cooler versions', () => {
    const box = listing('box', { coolerIncluded: true });
    const tray = listing('tray', { coolerIncluded: false });
    expect(offersFor('cpu', model('Ryzen 5 7600|true', box), entry([box, tray], { 'Ryzen 5 7600|true': {} })).map((l) => l.id)).toEqual(['box']);
  });
  it('restricts graphics cards to the selected row and its approved twin ids', () => {
    const row = listing('card', { twins: 'twin', vram: 12 });
    expect(offersFor('gpu', model('card', row), entry([row, listing('twin'), listing('other')], { card: {} })).map((l) => l.id)).toEqual(['card', 'twin']);
  });
  it('opens the PSU spec-group chunk while keeping offers inside the chosen maker and series', () => {
    const rm = listing('rm', { brand: 'Corsair', chip: '650W Gold', title: 'Corsair RM650 650W Gold', watts: 650, efficiency: 'Gold', formFactor: 'ATX' }) as PsuListing;
    const cx = { ...rm, id: 'cx', title: 'Corsair CX650 650W Gold' };
    const key = psuProductKey(rm);
    const selected = model(key, { ...rm, chip: 'Corsair RM650 650W Gold' });
    expect(offerSlug('psu', selected)).toBe('650w-gold-atx');
    expect(offersFor('psu', selected, entry([rm, cx], { [key]: {} })).map((l) => l.id)).toEqual(['rm']);
  });
  it('does not attach a chunk for another selected product', () => {
    expect(offersFor('cpu', model('Ryzen 5 7600|true', listing('box')), entry([listing('wrong')], {}))).toEqual([]);
  });
  it('marks a saved offer pending until its chunk arrives', () => {
    expect(resolveLine('cpu', model('cpu', listing('base')), 1, 'saved').status).toBe('pending');
  });
  it('does not attach another merchant’s shipping total to the selected listing', () => {
    const row = listing('offer', { price: 50, shipping: 4, total: 90, merchant: 'Different offer' });
    expect(resolveLine('cpu', model('cpu', row), 1, row.id, [row]).offer).toMatchObject({ price: 50, ship: null, merchant: null });
  });
  it('resolves price, link, shop and shipping together; quantities affect the line total', () => {
    const row = listing('base');
    const chosen = listing('chosen', { price: 70, shipping: 4, total: 74, merchant: 'Shop' });
    const resolved = resolveLine('fan', model('fans', row), 3, 'chosen', [row, chosen]);
    expect(resolved.offer).toMatchObject({ id: 'chosen', price: 70, url: 'https://example.com/chosen', merchant: 'Shop', ship: 4 });
    expect(resolved.total).toBe(210);
    expect(resolved.status).toBe('chosen');
  });
  it('keeps missing-offer evidence and falls back to the row without dropping the selected product', () => {
    const resolved = resolveLine('storage2', model('ssd', listing('base')), 1, 'gone', []);
    expect(resolved.status).toBe('missing');
    expect(resolved.requestedOffer).toBe('gone');
    expect(resolved.offer.id).toBe('base');
    expect(resolved.model.key).toBe('ssd');
  });
});
