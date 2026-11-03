// The saved PC build (localStorage `pcBuild`): { <slot>: model key, use?, budget?, compat?: { <slot>:
// { fields, builtAt } } }. The keys stay at the top level, as they always were, so an old file (keys
// only) is still valid; `compat` holds, per part, the engine fields and the data date they came from.
// Per-browser convenience only (listed on the privacy page). Task 8 adds, at the top level too: `storage2` (a second
// drive's key, its compat under `compat.storage2`), `fanQty` (packs of the chosen fan product), `offers` ({ <line>:
// chosen listing id }) and `res` (gaming resolution). Keys this version doesn't know are kept on every write.
// The active named build (src/lib/savedBuilds.ts, localStorage `pcBuilds`) follows every write.

import type { Res } from '../engine/data/tiers';
import type { Use } from '../engine/types';
import { mirrorActive } from './savedBuilds';
import { SLOTS, type Slot } from './slots';

export interface StoredPart {
  key: string;
  fields?: Record<string, unknown>;
  builtAt?: string;
}
export type UseKind = Use['kind'];
/** A line of the build: a slot, or the second drive (answer 13). */
export type Line = Slot | 'storage2';
export interface StoredBuild {
  parts: Partial<Record<Slot, StoredPart>>;
  storage2?: StoredPart; // answer 13: a second drive
  fanQty?: number; // 1–12, packs of the chosen fan product
  offers?: Partial<Record<Line, string>>; // chosen listing id per line (answer 11)
  use?: UseKind;
  res?: Res;
  budget?: number;
}

export const LINES: Line[] = [...SLOTS, 'storage2'];
export const MAX_FAN_QTY = 12;
const USE_KINDS: UseKind[] = ['gaming', 'everyday', 'creating', 'unsure'];
const RESOLUTIONS: Res[] = ['1080p', '1440p', '4k']; // engine/data/tiers.ts RESOLUTIONS, without loading the tier table

export const lineOf = (b: StoredBuild, line: Line): StoredPart | undefined => (line === 'storage2' ? b.storage2 : b.parts[line]);
export const asUse = (v: unknown): UseKind | undefined => (USE_KINDS.includes(v as UseKind) ? (v as UseKind) : undefined);
export const asRes = (v: unknown): Res | undefined => (RESOLUTIONS.includes(v as Res) ? (v as Res) : undefined);
export const asFanQty = (v: unknown): number | undefined =>
  Number.isInteger(v) && (v as number) >= 1 && (v as number) <= MAX_FAN_QTY ? (v as number) : undefined;

const STORAGE_KEY = 'pcBuild';
const KNOWN = new Set<string>([...LINES, 'compat', 'fanQty', 'offers', 'use', 'res', 'budget']);
/** Where a change came from: a write in this tab, or another tab (the `storage` event). */
export type BuildChangeSource = 'tab' | 'other-tab';
const listeners = new Set<(source: BuildChangeSource) => void>();

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function readRaw(): Record<string, unknown> {
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as unknown;
  return isObject(raw) ? raw : {};
}

export function readBuild(): StoredBuild {
  try {
    const raw = readRaw();
    const compat = isObject(raw.compat) ? raw.compat : {};
    const part = (line: Line): StoredPart | undefined => {
      const key = raw[line];
      if (typeof key !== 'string') return undefined;
      const c = compat[line];
      const p: StoredPart = { key };
      if (isObject(c)) {
        if (isObject(c.fields)) p.fields = c.fields;
        if (typeof c.builtAt === 'string') p.builtAt = c.builtAt;
      }
      return p;
    };
    const parts: StoredBuild['parts'] = {};
    for (const s of SLOTS) {
      const p = part(s);
      if (p) parts[s] = p;
    }
    const build: StoredBuild = { parts };
    const storage2 = part('storage2');
    if (storage2) build.storage2 = storage2;
    const fanQty = asFanQty(raw.fanQty);
    if (fanQty) build.fanQty = fanQty;
    if (isObject(raw.offers)) {
      const offers: StoredBuild['offers'] = {};
      for (const l of LINES) if (typeof raw.offers[l] === 'string') offers[l] = raw.offers[l];
      if (Object.keys(offers).length) build.offers = offers;
    }
    const use = asUse(raw.use);
    if (use) build.use = use;
    const res = asRes(raw.res);
    if (res) build.res = res;
    if (Number(raw.budget) > 0) build.budget = Number(raw.budget);
    return build;
  } catch {
    return { parts: {} };
  }
}

export function writeBuild(b: StoredBuild): void {
  try {
    let out: Record<string, unknown> = {};
    try {
      // A newer version's keys survive this version's writes.
      out = Object.fromEntries(Object.entries(readRaw()).filter(([k]) => !KNOWN.has(k)));
    } catch {
      /* unreadable file: written fresh */
    }
    const compat: Record<string, unknown> = {};
    for (const l of LINES) {
      const p = lineOf(b, l);
      if (!p) continue;
      out[l] = p.key;
      if (p.fields || p.builtAt) compat[l] = { ...(p.fields && { fields: p.fields }), ...(p.builtAt && { builtAt: p.builtAt }) };
    }
    if (b.fanQty) out.fanQty = b.fanQty;
    if (b.offers && Object.keys(b.offers).length) out.offers = b.offers;
    if (b.use) out.use = b.use;
    if (b.res) out.res = b.res;
    if (b.budget) out.budget = b.budget;
    if (Object.keys(compat).length) out.compat = compat;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
  } catch {
    /* storage unavailable or full (private mode): the build just isn't remembered */
  }
  mirrorActive(b);
  for (const fn of [...listeners]) fn('tab');
}

/** Read-modify-write one slot (null removes it) and notify. A changed part drops the shop chosen for the old one. */
export function setPart(slot: Slot, part: StoredPart | null, offerChoice?: string): void {
  const b = readBuild();
  if (b.offers && b.parts[slot]?.key !== part?.key) delete b.offers[slot];
  if (part) b.parts[slot] = part;
  else delete b.parts[slot];
  if (part && offerChoice !== undefined) b.offers = { ...b.offers, [slot]: offerChoice };
  writeBuild(b);
}

/** Called after a write in this tab and when another tab changes the build (the `storage` event). */
export function onBuildChange(fn: (source: BuildChangeSource) => void): () => void {
  listeners.add(fn);
  const onStorage = (e: { key: string | null }) => {
    if (e.key === null || e.key === STORAGE_KEY) fn('other-tab');
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

/**
 * What main's alias table (old key -> new key) says a stored key is now. Main keys CPUs by chip ("Core i5-14600KF")
 * while the builder's CPU keys are `chip|<cooler in box>` (`chip|true`): a CPU key is looked up whole, then by its
 * chip, and the answer keeps the `|suffix`.
 */
export function aliasOf(slot: Slot, aliases: Record<string, string> | undefined, key: string): string | undefined {
  if (!aliases) return undefined;
  const has = (k: string) => Object.prototype.hasOwnProperty.call(aliases, k);
  if (has(key)) return aliases[key];
  const bar = key.indexOf('|');
  if (slot === 'cpu' && bar > 0) {
    const chip = key.slice(0, bar);
    if (has(chip)) return aliases[chip] + key.slice(bar);
  }
  return undefined;
}

/**
 * A stored key against the keys the data has now: kept, renamed (main's alias file, src/lib/aliases.ts `keys[slot]`,
 * or a slot-specific `fallback`) or gone. The fallback is asked only for a key that is unknown and has no alias; it
 * names the current key an old kind of key stands for (the CPU's, `cpuFallback`) and counts only when the data has it.
 */
export function resolveKey(
  slot: Slot,
  key: string,
  known: Set<string>,
  aliases?: Record<string, string>,
  fallback?: (slot: Slot, key: string) => string | null,
): { key: string; status: 'ok' | 'renamed' | 'missing' } {
  if (known.has(key)) return { key, status: 'ok' };
  const to = aliasOf(slot, aliases, key);
  if (to !== undefined && known.has(to)) return { key: to, status: 'renamed' };
  const other = fallback?.(slot, to ?? key);
  if (other && known.has(other)) return { key: other, status: 'renamed' };
  return { key, status: 'missing' };
}

/**
 * Keys an old kind of key may stand for now, best first (the rows to look for in the data). A CPU saved before the
 * box-cooler table is `<chip>|?`: it is `<chip>|true` (cooler in the box), else `<chip>|false`.
 * HOOK for task 7: the PSU's old spec-group key ("650W Gold ATX") goes here (psuGroupFallback: the cheapest current
 * product of that group), as another case that returns candidate keys.
 */
export function fallbackKeys(slot: Slot, key: string): string[] {
  if (slot === 'cpu' && key.endsWith('|?')) {
    const chip = key.slice(0, -2);
    return [`${chip}|true`, `${chip}|false`];
  }
  return [];
}

/** `resolveKey`'s fallback over the rows the data has: the first of `fallbackKeys` that is there. */
export const fallbackFor =
  (known: Set<string>) =>
  (slot: Slot, key: string): string | null =>
    fallbackKeys(slot, key).find((k) => known.has(k)) ?? null;
