import { describe, expect, it } from 'vitest';
import { decodeRef, encodeRef, isComparable, MAX_ITEMS, parseShare, shareSearch, type CompareRef } from '../../../src/lib/compare/refs';

const family: CompareRef = { cat: 'gpu', slug: 'rtx-5060-8gb' };
const exact: CompareRef = { cat: 'gpu', slug: 'rtx-5060-8gb', selection: { source: 'skroutz', id: '60561002' } };

describe('compare references', () => {
  it('round-trips a family and an exact listing', () => {
    expect(encodeRef(family)).toBe('gpu:rtx-5060-8gb');
    expect(encodeRef(exact)).toBe('gpu:rtx-5060-8gb:bd1:skroutz:60561002');
    expect(decodeRef(encodeRef(family))).toEqual(family);
    expect(decodeRef(encodeRef(exact))).toEqual(exact);
  });

  it('keeps ids with reserved characters intact', () => {
    const odd: CompareRef = { cat: 'case', slug: 'lian-li-o11', selection: { source: 'shopflix', id: 'SF-1,2:3/4 %' } };
    expect(decodeRef(encodeRef(odd))).toEqual(odd);
  });

  it('keeps Greek-free slugs with dots, plus and times signs', () => {
    expect(decodeRef('cooler:arctic-p12-120mm×3')).toEqual({ cat: 'cooler', slug: 'arctic-p12-120mm×3' });
    expect(decodeRef('psu:850w-80+-gold')).toEqual({ cat: 'psu', slug: '850w-80+-gold' });
  });

  it('rejects malformed input', () => {
    for (const bad of ['', 'gpu', 'gpu:', ':slug', 'nope:rtx', 'gpu:rtx 5060', 'gpu:rtx,5060', 'gpu:a:b', 'gpu:rtx:bd1:badsource:1',
      'gpu:rtx:bd1:skroutz:', 'gpu:rtx:60561002', 'gpu:' + 'a'.repeat(200), 'gpu:rtx:bd1:skroutz:%E0%A4%A', 'GPU:rtx', 'gpu:-rtx']) {
      expect(decodeRef(bad), bad).toBeNull();
    }
  });

  it('only published categories are comparable (monitors stay out until they are visible)', () => {
    expect(isComparable('gpu')).toBe(true);
    expect(isComparable('storage')).toBe(true);
    expect(isComparable('monitor')).toBe(false);
    expect(isComparable('builder')).toBe(false);
    expect(isComparable('toString')).toBe(false);
    expect(decodeRef('monitor:samsung-g50f')).toBeNull();
  });
});

describe('compare share links', () => {
  const other: CompareRef = { cat: 'gpu', slug: 'rtx-5070-12gb' };

  it('builds and parses a link for one category', () => {
    const search = shareSearch('gpu', [family, exact, other]);
    expect(search.startsWith('?v=1&cat=gpu&items=')).toBe(true);
    expect(parseShare(search)).toEqual({ cat: 'gpu', refs: [family, exact, other] });
  });

  it('rejects wrong version, unknown category, empty, duplicates, mixed categories and oversized lists', () => {
    const enc = (refs: string[], extra = 'v=1&cat=gpu') => `?${extra}&items=${encodeURIComponent(refs.join(','))}`;
    expect(parseShare(enc(['gpu:a'], 'v=2&cat=gpu'))).toBeNull();
    expect(parseShare(enc(['gpu:a'], 'cat=gpu'))).toBeNull();
    expect(parseShare(enc(['gpu:a'], 'v=1&cat=nope'))).toBeNull();
    expect(parseShare('?v=1&cat=gpu')).toBeNull();
    expect(parseShare(enc([]))).toBeNull();
    expect(parseShare(enc(['gpu:a', 'gpu:a']))).toBeNull();
    expect(parseShare(enc(['gpu:a', 'cpu:b']))).toBeNull();
    expect(parseShare(enc(['gpu:a', 'gpu:b', 'gpu:c', 'gpu:d', 'gpu:e']))).toBeNull();
    expect(parseShare(enc(['gpu:a', 'gpu:b with space']))).toBeNull();
    expect(parseShare('?v=1&v=1&cat=gpu&items=gpu:a')).toBeNull();
  });

  it('a link holds at most MAX_ITEMS', () => {
    expect(MAX_ITEMS).toBe(4);
    expect(shareSearch('gpu', Array.from({ length: 6 }, (_, i) => ({ cat: 'gpu', slug: `m${i}` }) as CompareRef))).toBe('');
  });
});
