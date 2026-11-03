import type { BaseListing, Category, SourceName } from '../types';
import { SOURCE_NAMES } from './sources';

export interface ProductSelection { source: SourceName; id: string }
const sourceName = (value: string): value is SourceName => SOURCE_NAMES.includes(value as SourceName);

/** Null includes absent and invalid input; consumers distinguish presence with hasProductSelection. */
export function readProductSelection(search: string): ProductSelection | null {
  const q = new URLSearchParams(search);
  const source = q.get('source');
  const id = q.get('offer');
  return q.getAll('source').length === 1 && q.getAll('offer').length === 1 && source && sourceName(source) && id?.trim()
    ? { source, id } : null;
}
export const hasProductSelection = (search: string): boolean => {
  const q = new URLSearchParams(search);
  return q.has('source') || q.has('offer');
};
export const productHref = (cat: Category, familySlug: string, selection: ProductSelection): string =>
  `/${cat}/${familySlug}?${new URLSearchParams({ source: selection.source, offer: selection.id })}`;

export function resolveProductSelection<L extends BaseListing>(listings: readonly L[], selection: ProductSelection): L | null {
  return listings.find((l) => l.source === selection.source && l.id === selection.id) ?? null;
}
export const encodeOfferChoice = (selection: ProductSelection): string => `bd1:${selection.source}:${encodeURIComponent(selection.id)}`;
export type OfferChoice = { kind: 'qualified'; selection: ProductSelection } | { kind: 'legacy'; id: string } | { kind: 'invalid' };
export function decodeOfferChoice(value: string): OfferChoice {
  if (!value.trim()) return { kind: 'invalid' };
  if (!/^bd\d*:/.test(value)) return { kind: 'legacy', id: value };
  const match = /^bd1:([^:]+):([^:]+)$/.exec(value);
  if (!match || !sourceName(match[1])) return { kind: 'invalid' };
  try {
    const id = decodeURIComponent(match[2]);
    return id.trim() ? { kind: 'qualified', selection: { source: match[1], id } } : { kind: 'invalid' };
  } catch { return { kind: 'invalid' }; }
}
/** Bare ids from old saves resolve only when one allowed offer owns that id. */
export function resolveOfferChoice<L extends BaseListing>(listings: readonly L[], value: string): L | null {
  const choice = decodeOfferChoice(value);
  if (choice.kind === 'invalid') return null;
  if (choice.kind === 'qualified') return resolveProductSelection(listings, choice.selection);
  const matches = listings.filter((l) => l.id === choice.id);
  return matches.length === 1 ? matches[0] : null;
}
