import type { Category } from '../../types';
import { decodeOfferChoice, encodeOfferChoice, type ProductSelection } from '../productSelection';
import { REGISTRY } from '../registry';

/** One compared product: a model (family) page, or the exact listing a card or offer row stands for. */
export interface CompareRef {
  cat: Category;
  slug: string;
  selection?: ProductSelection;
}

/** The most items one category's group (and one share link) holds. */
export const MAX_ITEMS = 4;
/** A model slug: letters, digits and `.+×-` (src/lib/slug.ts), never starting with a hyphen. */
const SLUG = /^[\p{L}\p{N}][\p{L}\p{N}.+×-]{0,119}$/u;

/** Published categories only: a hidden one (monitors, until Phase 3 ships) can be neither saved nor shared. */
export const isComparable = (cat: string): cat is Category => Object.prototype.hasOwnProperty.call(REGISTRY, cat) && REGISTRY[cat as Category].visible;

/** `gpu:rtx-5060-8gb` (family) or `gpu:rtx-5060-8gb:bd1:skroutz:60561002` (exact listing). */
export const encodeRef = (r: CompareRef): string =>
  `${r.cat}:${r.slug}${r.selection ? `:${encodeOfferChoice(r.selection)}` : ''}`;

/** Null for anything that is not exactly what encodeRef writes: bare legacy ids, unknown sources, bad escapes. */
export function decodeRef(text: string): CompareRef | null {
  const [cat, slug, ...rest] = text.split(':');
  if (!cat || !slug || !isComparable(cat) || !SLUG.test(slug)) return null;
  if (rest.length === 0) return { cat, slug };
  const choice = decodeOfferChoice(rest.join(':'));
  return choice.kind === 'qualified' ? { cat, slug, selection: choice.selection } : null;
}

/** `?v=1&cat=gpu&items=<ref>,<ref>`; empty when there is nothing valid to share. */
export function shareSearch(cat: Category, refs: CompareRef[]): string {
  if (refs.length === 0 || refs.length > MAX_ITEMS || refs.some((r) => r.cat !== cat)) return '';
  return `?${new URLSearchParams({ v: '1', cat, items: refs.map(encodeRef).join(',') })}`;
}

/** The group a link describes, or null if any part of it is invalid (viewing never guesses or repairs). */
export function parseShare(search: string): { cat: Category; refs: CompareRef[] } | null {
  const q = new URLSearchParams(search);
  const one = (name: string) => (q.getAll(name).length === 1 ? q.get(name) : null);
  const cat = one('cat');
  const items = one('items');
  if (one('v') !== '1' || !cat || !isComparable(cat) || !items) return null;
  const parts = items.split(',');
  if (parts.length === 0 || parts.length > MAX_ITEMS) return null;
  const refs: CompareRef[] = [];
  for (const part of parts) {
    const ref = decodeRef(part);
    if (!ref || ref.cat !== cat || refs.some((r) => encodeRef(r) === encodeRef(ref))) return null;
    refs.push(ref);
  }
  return { cat, refs };
}
