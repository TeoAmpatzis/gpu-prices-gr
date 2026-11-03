import { expect, it } from 'vitest';
import { catalogueProducts } from '../../src/lib/catalogueProducts';
import type { Model } from '../../src/lib/data';
import type { BaseListing } from '../../src/types';

it('flattens listings in stable family order without merging names, prices or shipping', () => {
  const a = { id: 'same', source: 'skroutz', chip: 'Board', title: 'Similar board', price: 80, socket: 'AM5', shipping: 4 };
  const b = { id: 'same', source: 'bestprice', chip: 'Board', title: 'Similar board', price: 100, socket: 'AM4' };
  const families = [{ key: 'family', chip: 'Board', cheapest: a, listings: [a, b] }] as unknown as Model<BaseListing>[];
  const before = JSON.stringify(families);
  const products = catalogueProducts('mobo', families);
  expect(products.map((p) => p.listing)).toEqual([a, b]);
  expect(new Set(products.map((p) => p.key)).size).toBe(2);
  expect(products.map((p) => p.familyKey)).toEqual(['family', 'family']);
  expect(products.map((p) => p.familySlug)).toEqual(['board', 'board']);
  expect(products[1].listing.shipping).toBeUndefined();
  expect(products[1].listing.price).toBe(100);
  expect(products.map((p) => p.key)).toEqual(catalogueProducts('mobo', families).map((p) => p.key));
  expect(JSON.stringify(families)).toBe(before);
});
