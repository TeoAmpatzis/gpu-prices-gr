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

/** A stored key against the keys the data has now: kept, renamed (alias list, from step 4) or gone. */
export function resolveKey(
  _slot: Slot,
  key: string,
  known: Set<string>,
  aliases?: Record<string, string>,
): { key: string; status: 'ok' | 'renamed' | 'missing' } {
  if (known.has(key)) return { key, status: 'ok' };
  const to = aliases && Object.prototype.hasOwnProperty.call(aliases, key) ? aliases[key] : undefined;
  if (to !== undefined && known.has(to)) return { key: to, status: 'renamed' };
  return { key, status: 'missing' };
}
