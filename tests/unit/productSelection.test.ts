import { describe, expect, it } from 'vitest';
import { decodeOfferChoice, encodeOfferChoice, productHref, readProductSelection, resolveOfferChoice, resolveProductSelection } from '../../src/lib/productSelection';
import type { BaseListing } from '../../src/types';

const rows = [{ source: 'skroutz', id: 'same' }, { source: 'bestprice', id: 'same' }] as BaseListing[];
describe('exact product selection', () => {
  it('uses both source and id, including encoded identifiers', () => {
    const selection = { source: 'bestprice' as const, id: 'x:/ ?&%Ε' };
    expect(readProductSelection(new URL(productHref('gpu', 'rtx-5070', selection), 'https://x').search)).toEqual(selection);
    expect(resolveProductSelection(rows, { source: 'bestprice', id: 'same' })).toBe(rows[1]);
    expect(resolveProductSelection(rows, { source: 'snif', id: 'same' })).toBeNull();
  });
  it.each(['', '?source=skroutz', '?offer=same', '?source=other&offer=same', '?source=skroutz&offer=', '?source=skroutz&source=snif&offer=same'])('rejects absent or invalid pairs %s', (search) => {
    expect(readProductSelection(search)).toBeNull();
  });
  it('round-trips qualified choices and resolves legacy ids only when unique', () => {
    const selection = { source: 'bestprice' as const, id: 'x:/ ?&%Ε' };
    const encoded = encodeOfferChoice(selection);
    expect(encoded).toBe(`bd1:bestprice:${encodeURIComponent(selection.id)}`);
    expect(decodeOfferChoice(encoded)).toEqual({ kind: 'qualified', selection });
    expect(decodeOfferChoice('same')).toEqual({ kind: 'legacy', id: 'same' });
    expect(resolveOfferChoice(rows, 'same')).toBeNull();
    expect(resolveOfferChoice(rows.slice(0, 1), 'same')).toBe(rows[0]);
    expect(resolveOfferChoice(rows, encodeOfferChoice({ source: 'bestprice', id: 'same' }))).toBe(rows[1]);
  });
  it.each(['', 'bd1:', 'bd1:other:x', 'bd1:skroutz:', 'bd1:skroutz:%ZZ', 'bd1:skroutz:x:y', 'bd2:skroutz:x'])('rejects malformed codec %s', (value) => {
    expect(decodeOfferChoice(value)).toEqual({ kind: 'invalid' });
  });
});
