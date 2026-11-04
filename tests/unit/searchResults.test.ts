import { describe, expect, it } from 'vitest';
import { prepare } from '../../src/lib/search';
import { parseSearch, searchResults, searchUrl } from '../../src/lib/searchResults';

const index = prepare({ cats: { gpu: { m: Array.from({ length: 31 }, (_, i) => [`Κάρτα RTX 5070 ${i}`, 100 + i, `card-${i}`]), mk: [] }, cpu: { m: [['RTX processor', 50]], mk: [] } } });
describe('complete family search', () => {
  it('matches accents and token order without suggestion cap', () => {
    expect(searchResults(index, parseSearch('?q=5070+καρτα')).total).toBe(31);
    expect(searchResults(index, parseSearch('?q=καρτα+5070')).total).toBe(31);
  });
  it('filters category and inclusive item price, then sorts stably', () => {
    const result = searchResults(index, parseSearch('?q=rtx&cat=gpu&min=110&max=120&sort=price-desc'));
    expect(result.total).toBe(11);
    expect(result.hits[0].price).toBe(120);
    expect(result.counts.cpu).toBeUndefined();
  });
  it('normalizes invalid bounds, category, sort and page', () => {
    expect(parseSearch('?min=-1&max=no&cat=no&sort=no&page=2.5')).toEqual({ q: '', sort: 'relevance', page: 1 });
    expect(parseSearch('?min=200&max=100').min).toBe(100);
  });
  it('handles empty, long, absent queries and clamps pages', () => {
    expect(searchResults(index, parseSearch('')).total).toBe(0);
    expect(searchResults(index, parseSearch('?q=' + 'x'.repeat(1000))).total).toBe(0);
    expect(searchResults(index, parseSearch('?q=rtx&page=999')).page).toBe(2);
  });
  it('round trips bookmark state', () => {
    const state = parseSearch('?q=RTX+5070&cat=gpu&min=100&sort=price-asc&page=2');
    expect(parseSearch(new URL(searchUrl(state), 'https://builddraft.gr').search)).toEqual(state);
  });
  it('keeps equal-price order stable and category counts independent of selected category', () => {
    const tied = prepare({ cats: { gpu: { m: [['RTX B', 100], ['RTX A', 100]], mk: [] }, cpu: { m: [['RTX CPU', 100]], mk: [] } } });
    const result = searchResults(tied, parseSearch('?q=rtx&cat=gpu&sort=price-asc'));
    expect(result.hits.map((h) => h.name)).toEqual(['RTX B', 'RTX A']);
    expect(result.counts).toEqual({ gpu: 2, cpu: 1 });
  });
});
