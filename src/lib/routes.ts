// The site's addresses (plan A2, approved 2026-10-04): real paths instead of v1's "#…" routes. One table
// here drives the app's routing, the redirect of old "#…" links, vercel.json's rewrites (checked by
// tests/unit/routes.test.ts) and the e2e tests.
import type { Category } from '../types';
import { REGISTRY } from './registry';

/** The published categories (registry `visible`), in registry order: v1's ids as URL segments (owner, 2026-10-04), the first nine in v1's order. */
export const CATEGORY_LIST = (Object.keys(REGISTRY) as Category[]).filter((c) => REGISTRY[c].visible);
export const INFO_PAGES = ['about', 'contact', 'privacy', 'how-prices'] as const;
export type InfoPage = (typeof INFO_PAGES)[number];

export type Route =
  | { kind: 'home' }
  | { kind: 'category'; cat: Category }
  /** /gpu/rtx-5070-12gb — a model's page (components/product/ModelPage): shown, moved (alias) or "no longer available". */
  | { kind: 'model'; cat: Category; slug: string }
  | { kind: 'builder' }
  | { kind: 'parts' }
  /** /compare: the saved comparison, or a shared one (?v=1&cat=…&items=…); shown only while lib/compare/flag is on. */
  | { kind: 'compare' }
  | { kind: 'search' }
  | { kind: 'info'; page: InfoPage }
  | { kind: 'notFound' };

const isCategory = (s: string): s is Category => (CATEGORY_LIST as string[]).includes(s);
const isInfo = (s: string): s is InfoPage => (INFO_PAGES as readonly string[]).includes(s);

/** The route for a pathname ("/ram", "/gpu/rtx-5070-12gb", "/builder"…); anything else is a 404. */
export function matchRoute(pathname: string): Route {
  const parts = pathname.split('/').filter(Boolean).map((p) => decodeURIComponent(p));
  if (parts.length === 0) return { kind: 'home' };
  const [first, second, ...rest] = parts;
  if (rest.length) return { kind: 'notFound' };
  if (isCategory(first)) return second ? { kind: 'model', cat: first, slug: second } : { kind: 'category', cat: first };
  if (second) return { kind: 'notFound' };
  if (first === 'builder') return { kind: 'builder' };
  if (first === 'parts') return { kind: 'parts' };
  if (first === 'compare') return { kind: 'compare' };
  if (first === 'search') return { kind: 'search' };
  if (isInfo(first)) return { kind: 'info', page: first };
  return { kind: 'notFound' };
}

/** First path segments the app serves (vercel.json rewrites exactly these to index.html; the rest is a 404). */
export const APP_SEGMENTS = [...CATEGORY_LIST, 'builder', 'parts', 'search', 'compare', ...INFO_PAGES];

/**
 * An old v1 link ("/#ram?type=ddr5&cap=32", "/#builder?cpu=…&use=gaming", "/#about") → its new address
 * ("/ram?type=ddr5&cap=32", …), every parameter kept as it was. Null when the hash isn't a v1 page (in-page
 * anchors such as "#main" stay) or the path isn't the site root (v1 had no other pages).
 */
export function legacyTarget(pathname: string, hash: string): string | null {
  if (pathname !== '/' && pathname !== '/index.html') return null;
  const raw = hash.replace(/^#/, '');
  if (raw === '') return null;
  const q = raw.indexOf('?');
  const page = q < 0 ? raw : raw.slice(0, q);
  const query = q < 0 ? '' : raw.slice(q + 1);
  if (!isCategory(page) && page !== 'builder' && !isInfo(page)) return null;
  return `/${page}${query ? `?${query}` : ''}`;
}

/**
 * Runs before the app renders (main.tsx), so an old link never shows the wrong page first; returns whether
 * it redirected. The app also runs it when only the hash changes on the home page (an old link opened in a
 * tab that already shows the site).
 */
export function redirectLegacyLink(): boolean {
  const target = legacyTarget(location.pathname, location.hash);
  if (target) history.replaceState(null, '', target);
  return !!target;
}
