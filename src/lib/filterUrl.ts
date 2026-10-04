// Filters ⇄ URL: "/ram?type=ddr5&cap=32&kit=2&cl=30&sort=price-asc&page=2&per=100" (the same parameters as v1's
// "#ram?…" links, which src/lib/routes.ts redirects here).
// Generic for every category: the pill group, sources, segment, sale/low chips, max price, sort and
// every `extraFilters` entry are encoded from the category config, so new filters get URLs for free.

import type { BaseListing, Category } from '../types';
import type { CategoryConfig } from './categories';
import { groupName } from './categories';
import { PER_PAGE, defaultFilters, type Filters, type Segment, type SortKey } from './data';
import { SOURCE_NAMES } from './sources';

import { slug } from './slug';

export { slug };

/** Shorter URL names for some extra filters (the rest use their key). */
const PARAM_ALIASES: Record<string, string> = {
  capacity: 'cap',
  modules: 'kit',
  cas: 'cl',
  memType: 'mem',
  formFactor: 'size',
  ramSlots: 'slots',
  packaging: 'box',
  radiator: 'rad',
};
export const paramOf = (key: string) => PARAM_ALIASES[key] ?? key;

const SORTS: SortKey[] = ['model', 'price-asc', 'price-desc', 'offers', 'discount', 'per-tb'];
const segmentsOf = <L extends BaseListing>(cfg: CategoryConfig<L>): Segment[] => [
  'main',
  ...(cfg.segments?.middle ?? []).map((s) => s.value),
  'pro',
  'all',
];

/** The page (first path segment) and its query string: "/ram?type=ddr5" → "ram", params (null without one). */
export function parseUrl(): { page: string; params: URLSearchParams | null } {
  const page = location.pathname.split('/').filter(Boolean)[0] ?? '';
  return { page, params: location.search.length > 1 ? new URLSearchParams(location.search) : null };
}

const groupSlug = (g: string) => slug(groupName(g, 'en'));

export function encodeFilters<L extends BaseListing>(f: Filters, cfg: CategoryConfig<L>): string {
  const d = defaultFilters(cfg.groups);
  const p = new URLSearchParams();
  if (f.query.trim()) p.set('q', f.query.trim());
  if (f.groups.length !== d.groups.length) p.set(cfg.groupParam, f.groups.map(groupSlug).join(','));
  if (f.sources.length !== d.sources.length) p.set('src', f.sources.join(','));
  if (f.segment !== d.segment) p.set('seg', f.segment);
  for (const x of cfg.extraFilters) if (f.extra[x.key]) p.set(paramOf(x.key), f.extra[x.key]);
  if (f.saleOnly) p.set('sale', '1');
  if (f.lowOnly) p.set('low', '1');
  if (f.maxPrice != null) p.set('max', String(f.maxPrice));
  if (f.sort !== d.sort) p.set('sort', f.sort);
  if (f.page !== d.page) p.set('page', String(f.page));
  if (f.per !== d.per) p.set('per', String(f.per));
  // Keep commas readable in shared links.
  return p.toString().replace(/%2C/gi, ',');
}

export function decodeFilters<L extends BaseListing>(p: URLSearchParams, cfg: CategoryConfig<L>): Filters {
  const f = defaultFilters(cfg.groups);
  f.query = p.get('q') ?? '';
  const groups = p.get(cfg.groupParam);
  if (groups != null) {
    const wanted = new Set(groups.split(','));
    const picked = cfg.groups.filter((g) => wanted.has(groupSlug(g)));
    if (picked.length) f.groups = picked;
  }
  const src = p.get('src');
  if (src != null) {
    const picked = SOURCE_NAMES.filter((s) => src.split(',').includes(s));
    if (picked.length) f.sources = picked;
  }
  const seg = p.get('seg');
  if (seg && segmentsOf(cfg).includes(seg)) f.segment = seg;
  for (const x of cfg.extraFilters) {
    const v = p.get(paramOf(x.key));
    if (v) f.extra[x.key] = v;
  }
  f.saleOnly = p.get('sale') === '1';
  f.lowOnly = p.get('low') === '1';
  const max = Number(p.get('max'));
  if (p.get('max') && Number.isFinite(max) && max > 0) f.maxPrice = max;
  const sort = p.get('sort') as SortKey | null;
  if (sort && SORTS.includes(sort) && (sort !== 'per-tb' || cfg.capacityTb)) f.sort = sort;
  const page = Number(p.get('page'));
  if (Number.isInteger(page) && page > 1) f.page = page;
  const per = Number(p.get('per'));
  if ((PER_PAGE as readonly number[]).includes(per)) f.per = per;
  return f;
}

/**
 * Replace (not push) the URL with the page + its filters, so filter changes don't fill the history. Only
 * while that category's own page is open; the path doesn't change, so the router isn't told.
 */
export function writeFiltersToUrl<L extends BaseListing>(cfg: CategoryConfig<L>, f: Filters, page: Category) {
  if (location.pathname !== `/${page}`) return;
  const qs = encodeFilters(f, cfg);
  const next = `/${page}${qs ? `?${qs}` : ''}`;
  if (location.pathname + location.search !== next) history.replaceState(history.state, '', next);
}
