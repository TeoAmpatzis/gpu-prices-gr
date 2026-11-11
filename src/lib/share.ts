// Share links v2 (task 8): /builder?v=2&cpu=<key>&n.cpu=<name>&o.cpu=<listing id>&storage2=…&fanQty=3&use=gaming&res=1440p
// &budget=1200. The names let a part the data no longer has be named (finding #22). Engine fields never go in a link.
// Old links (v1 "/#builder?cpu=…", redirected by routes.legacyTarget, and v2 links without `v=2`) decode as version 1.

import type { Text } from './i18n';
import { LINES, asFanQty, asRes, asUse, lineOf, type Line, type StoredBuild } from './buildStore';
import type { Slot } from './slots';

export type ShareNames = Partial<Record<Line, string>>;

/** "Δεν πωλείται πια: <name>" for a part a link or a saved build names but the data no longer has. */
export const GONE_TEXT: Text = { el: 'Δεν πωλείται πια', en: 'No longer sold' };

/** The parameters of every share link, for removing them from the builder's address. */
export const isShareParam = (k: string): boolean =>
  (LINES as string[]).includes(k) || ['v', 'fanQty', 'use', 'res', 'budget'].includes(k) || /^[no]\./.test(k);

export function encodeShare(b: StoredBuild, names: ShareNames): string {
  const q = new URLSearchParams({ v: '2' });
  for (const l of LINES) {
    const p = lineOf(b, l);
    if (!p) continue;
    q.set(l, p.key);
    if (names[l]) q.set(`n.${l}`, names[l]);
    if (b.offers?.[l]) q.set(`o.${l}`, b.offers[l]);
  }
  if (b.fanQty) q.set('fanQty', String(b.fanQty));
  if (b.use) q.set('use', b.use);
  if (b.res) q.set('res', b.res);
  if (b.budget) q.set('budget', String(b.budget));
  return `/builder?${q}`;
}

/** A link's own text is shown on the page ("No longer sold: <name>"): product names are short, so longer text is cut. */
const MAX_NAME = 80;
const MAX_BUDGET = 1_000_000;

export function decodeShare(params: URLSearchParams): { build: StoredBuild; names: ShareNames; version: 1 | 2 } | null {
  if (!LINES.some((l) => params.get(l))) return null;
  const version = params.get('v') === '2' ? 2 : 1;
  const build: StoredBuild = { parts: {} };
  const names: ShareNames = {};
  const offers: NonNullable<StoredBuild['offers']> = {};
  for (const l of LINES) {
    const key = params.get(l);
    if (!key) continue;
    if (l === 'storage2') build.storage2 = { key };
    else build.parts[l] = { key };
    const name = params.get(`n.${l}`);
    if (name) names[l] = name.slice(0, MAX_NAME);
    const offer = params.get(`o.${l}`);
    if (offer) offers[l] = offer;
  }
  if (Object.keys(offers).length) build.offers = offers;
  const fanQty = asFanQty(Number(params.get('fanQty')));
  if (fanQty) build.fanQty = fanQty;
  const use = asUse(params.get('use'));
  if (use) build.use = use;
  // Question 6: v1 had no resolution; its "gaming" opens as gaming 1080p.
  const res = asRes(params.get('res')) ?? (version === 1 && use === 'gaming' ? '1080p' : undefined);
  if (res) build.res = res;
  const budget = Number(params.get('budget'));
  if (budget > 0 && budget <= MAX_BUDGET) build.budget = Math.round(budget);
  return { build, names, version };
}

/**
 * The lines whose part the data no longer has (finding #22), each with the name a v2 link gives (`n.<line>`); an old
 * link has none, so the UI names it by its step and key. `isGone` is asked per step (the second drive = storage).
 */
export function goneParts(
  b: StoredBuild,
  names: ShareNames,
  isGone: (slot: Slot, key: string) => boolean,
): { slot: Line; key: string; name?: string }[] {
  const out: { slot: Line; key: string; name?: string }[] = [];
  for (const l of LINES) {
    const p = lineOf(b, l);
    if (p && isGone(l === 'storage2' ? 'storage' : l, p.key)) out.push({ slot: l, key: p.key, ...(names[l] && { name: names[l] }) });
  }
  return out;
}
