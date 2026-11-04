import { search, type PreparedIndex, type Hit } from './search';
import { CATEGORY_LIST } from './routes';
import type { Category } from '../types';

export interface SearchState { q: string; cat?: Category; min?: number; max?: number; sort: 'relevance' | 'price-asc' | 'price-desc'; page: number }
export const SEARCH_PAGE_SIZE = 24;
export function parseSearch(query: string): SearchState {
  const p = new URLSearchParams(query);
  const price = (key: string) => { const value = p.get(key); const n = Number(value); return value?.trim() && Number.isFinite(n) && n >= 0 ? n : undefined; };
  let min = price('min'), max = price('max');
  if (min != null && max != null && min > max) [min, max] = [max, min];
  const cat = p.get('cat') as Category;
  const sort = p.get('sort');
  const page = Number(p.get('page'));
  return { q: (p.get('q') ?? '').trim().slice(0, 500), ...(CATEGORY_LIST.includes(cat) ? { cat } : {}), ...(min != null ? { min } : {}), ...(max != null ? { max } : {}), sort: sort === 'price-asc' || sort === 'price-desc' ? sort : 'relevance', page: Number.isSafeInteger(page) && page > 0 ? page : 1 };
}
export function searchUrl(state: SearchState): string {
  const p = new URLSearchParams();
  if (state.q) p.set('q', state.q);
  if (state.cat) p.set('cat', state.cat);
  if (state.min != null) p.set('min', String(state.min));
  if (state.max != null) p.set('max', String(state.max));
  if (state.sort !== 'relevance') p.set('sort', state.sort);
  if (state.page > 1) p.set('page', String(state.page));
  return '/search' + (p.size ? `?${p}` : '');
}
export function searchResults(index: PreparedIndex, state: SearchState) {
  const groups = search(index, state.q, Number.MAX_SAFE_INTEGER);
  const counts: Partial<Record<Category, number>> = {};
  const all: (Hit & { cat: Category })[] = [];
  for (const group of groups) {
    const hits = group.hits.filter((h) => (state.min == null || h.price >= state.min) && (state.max == null || h.price <= state.max));
    if (hits.length) counts[group.cat] = hits.length;
    if (!state.cat || state.cat === group.cat) all.push(...hits.map((h) => ({ ...h, cat: group.cat })));
  }
  if (state.sort !== 'relevance') all.sort((a, b) => state.sort === 'price-asc' ? a.price - b.price : b.price - a.price);
  const pages = Math.max(1, Math.ceil(all.length / SEARCH_PAGE_SIZE));
  const page = Math.min(state.page, pages);
  return { hits: all.slice((page - 1) * SEARCH_PAGE_SIZE, page * SEARCH_PAGE_SIZE), total: all.length, counts, page, pages };
}
