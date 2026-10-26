// The saved PC build (localStorage `pcBuild`): { <slot>: model key, use?, budget?, compat?: { <slot>:
// { fields, builtAt } } }. The keys stay at the top level, as they always were, so an old file (keys
// only) is still valid; `compat` holds, per part, the engine fields and the data date they came from.
// Per-browser convenience only (listed on the privacy page).

import { SLOTS, type Slot } from './slots';

export interface StoredPart {
  key: string;
  fields?: Record<string, unknown>;
  builtAt?: string;
}
export interface StoredBuild {
  parts: Partial<Record<Slot, StoredPart>>;
  use?: string;
  budget?: number;
}

const STORAGE_KEY = 'pcBuild';
/** Where a change came from: a write in this tab, or another tab (the `storage` event). */
export type BuildChangeSource = 'tab' | 'other-tab';
const listeners = new Set<(source: BuildChangeSource) => void>();

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function readBuild(): StoredBuild {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as unknown;
    if (!isObject(raw)) return { parts: {} };
    const compat = isObject(raw.compat) ? raw.compat : {};
    const parts: StoredBuild['parts'] = {};
    for (const s of SLOTS) {
      const key = raw[s];
      if (typeof key !== 'string') continue;
      const c = compat[s];
      const part: StoredPart = { key };
      if (isObject(c)) {
        if (isObject(c.fields)) part.fields = c.fields;
        if (typeof c.builtAt === 'string') part.builtAt = c.builtAt;
      }
      parts[s] = part;
    }
    const build: StoredBuild = { parts };
    if (typeof raw.use === 'string') build.use = raw.use;
    if (Number(raw.budget) > 0) build.budget = Number(raw.budget);
    return build;
  } catch {
    return { parts: {} };
  }
}

export function writeBuild(b: StoredBuild): void {
  try {
    const out: Record<string, unknown> = {};
    const compat: Record<string, unknown> = {};
    for (const s of SLOTS) {
      const p = b.parts[s];
      if (!p) continue;
      out[s] = p.key;
      if (p.fields || p.builtAt) compat[s] = { ...(p.fields && { fields: p.fields }), ...(p.builtAt && { builtAt: p.builtAt }) };
    }
    if (b.use) out.use = b.use;
    if (b.budget) out.budget = b.budget;
    if (Object.keys(compat).length) out.compat = compat;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
  } catch {
    /* storage unavailable (private mode): the build just isn't remembered */
  }
  for (const fn of [...listeners]) fn('tab');
}

/** Read-modify-write one slot (null removes it) and notify. */
export function setPart(slot: Slot, part: StoredPart | null): void {
  const b = readBuild();
  if (part) b.parts[slot] = part;
  else delete b.parts[slot];
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
