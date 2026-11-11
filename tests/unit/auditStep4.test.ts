// Regression tests for the 2026-11-10 audit (docs/audits/full-system-audit): P4-001, P4-002, P4-004.
import { describe, expect, it } from 'vitest';
import { CATEGORIES, type CategoryConfig } from '../../src/lib/categories';
import { decodeFilters } from '../../src/lib/filterUrl';
import { matchRoute } from '../../src/lib/routes';
import { decodeShare } from '../../src/lib/share';
import type { BaseListing } from '../../src/types';

const gpu = CATEGORIES.gpu as unknown as CategoryConfig<BaseListing>;
const filters = (query: string) => decodeFilters(new URLSearchParams(query), gpu);

describe('P4-001: a malformed % escape is a 404, not an exception', () => {
  it.each(['/gpu/%', '/%E0%A4%A', '/gpu/%zz'])('%s', (path) => {
    expect(matchRoute(path)).toEqual({ kind: 'notFound' });
  });
  it('valid escapes still decode', () => {
    expect(matchRoute('/gpu/rtx%205070')).toEqual({ kind: 'model', cat: 'gpu', slug: 'rtx 5070' });
  });
});

describe('P4-002: hand-edited addresses are bounded', () => {
  it('an absurd page number is dropped, a real one kept', () => {
    expect(filters('page=1000000000').page).toBe(1);
    expect(filters('page=7').page).toBe(7);
  });
  it('a very long search text is cut', () => {
    expect(filters(`q=${'a'.repeat(20_000)}`).query).toHaveLength(200);
  });
  it('a very long option value is dropped', () => {
    expect(filters(`vram=${'9'.repeat(500)}`).extra.vram).toBeUndefined();
    expect(filters('vram=16').extra.vram).toBe('16');
  });
});

describe('P4-004 and P4-002: a share link cannot put long text or an absurd budget on the page', () => {
  const share = (extra: string) => decodeShare(new URLSearchParams(`v=2&cpu=some-key&${extra}`))!;
  it('a part name from the link is cut to 80 characters', () => {
    expect(share(`n.cpu=${'x'.repeat(500)}`).names.cpu).toHaveLength(80);
    expect(share('n.cpu=Ryzen 7 9800X3D').names.cpu).toBe('Ryzen 7 9800X3D');
  });
  it('budgets: a normal one is kept, 1e308 and Infinity are not', () => {
    expect(share('budget=1500').build.budget).toBe(1500);
    expect(share('budget=1e308').build.budget).toBeUndefined();
    expect(share('budget=Infinity').build.budget).toBeUndefined();
  });
});
