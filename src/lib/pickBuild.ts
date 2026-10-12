// Pick mode (v2 step 3): the saved build as the engine's parts on a category page, and the candidate check
// run in slices after the first paint. Pure functions (no React), loaded only with the pick code.
//  - Stored engine fields are used only when they are plain JSON values and carry their data date (A7).
//  - A part with no usable fields, or fields from older data than the page's, is refreshed from the
//    compat chunks; a key the chunks no longer have is "no longer available" and left out (A9).
import type { Part } from '../engine';
import { resolveKey, type StoredBuild, type StoredPart } from './buildStore';
import type { Slot } from './builder';
import { CATEGORY_RULE_SLOTS } from './pick';

const MAX_DEPTH = 4;

/** A value the engine may read: string, finite number, boolean, null, or arrays / plain objects of those. */
export function isPlainValue(v: unknown, depth = 0): boolean {
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (depth >= MAX_DEPTH || typeof v !== 'object') return false;
  if (Array.isArray(v)) return v.every((x) => isPlainValue(x, depth + 1));
  const proto = Object.getPrototypeOf(v) as unknown;
  if (proto !== Object.prototype && proto !== null) return false;
  return Object.values(v as Record<string, unknown>).every((x) => isPlainValue(x, depth + 1));
}

/** The stored fields and data date of a part, or null when either is missing or not plain data. */
export function validStored(p: StoredPart): { fields: Record<string, unknown>; builtAt: string } | null {
  const { fields, builtAt } = p as { fields?: unknown; builtAt?: unknown };
  if (typeof builtAt !== 'string' || typeof fields !== 'object' || fields === null || Array.isArray(fields)) return null;
  if (!isPlainValue(fields)) return null;
  return { fields: fields as Record<string, unknown>, builtAt };
}

/** Fields from data older than the page's (or of an unreadable date) are checked with the page's data. */
export const isStale = (stored: string, page: string): boolean => !(Date.parse(stored) >= Date.parse(page));

/** An engine part from a stored key and fields. A CPU's name is its chip (the CPU tables match it). */
export function partOf(slot: Slot, key: string, fields: Record<string, unknown>): Part {
  const chip = typeof fields.chip === 'string' && fields.chip ? fields.chip : null;
  const name = chip ?? (slot === 'cpu' ? key.split('|')[0] : key);
  return { category: slot, key, name, quantity: 1, fields };
}

export interface BuildPlan {
  /** Parts whose stored fields are valid and current. */
  ready: Part[];
  /** Slot → key of the parts to fetch from the compat chunks (no valid fields, or older data). */
  refresh: Partial<Record<Slot, string>>;
  /** Their stored fields where valid (older data): used if the chunk can't be loaded. */
  fallback: Partial<Record<Slot, Record<string, unknown>>>;
}

/** What the page `pageSlot` needs from the build: only the slots its rules read (pick.CATEGORY_RULE_SLOTS). */
export function planBuild(stored: StoredBuild, pageSlot: Slot, pageBuiltAt: string): BuildPlan {
  const plan: BuildPlan = { ready: [], refresh: {}, fallback: {} };
  for (const s of CATEGORY_RULE_SLOTS[pageSlot]) {
    const p = stored.parts[s];
    if (!p) continue;
    const v = validStored(p);
    if (v && !isStale(v.builtAt, pageBuiltAt)) plan.ready.push(partOf(s, p.key, v.fields));
    else {
      plan.refresh[s] = p.key;
      if (v) plan.fallback[s] = v.fields;
    }
  }
  return plan;
}

export interface Refreshed {
  parts: Part[];
  /** Keys the data no longer has (A9): shown as "no longer available", left out of the checks. */
  missing: { slot: Slot; key: string }[];
  /** Fresh fields to save back (`setPart`), so the next visit needs no chunk. */
  writes: { slot: Slot; part: StoredPart }[];
}

/**
 * The refreshed parts from `loadCompat` results per slot (`undefined` = that slot's chunk failed to load:
 * the old valid fields are used if there are any, nothing is marked missing and nothing is saved).
 */
export function applyRefresh(
  plan: BuildPlan,
  results: Partial<Record<Slot, Record<string, { fields: Record<string, unknown> }> | undefined>>,
  pageBuiltAt: string,
): Refreshed {
  const out: Refreshed = { parts: [...plan.ready], missing: [], writes: [] };
  for (const s of Object.keys(plan.refresh) as Slot[]) {
    const key = plan.refresh[s]!;
    const rows = results[s];
    if (!rows) {
      const old = plan.fallback[s];
      if (old) out.parts.push(partOf(s, key, old));
      continue;
    }
    const r = resolveKey(s, key, new Set(Object.keys(rows)));
    if (r.status === 'missing') {
      out.missing.push({ slot: s, key });
      continue;
    }
    const fields = rows[r.key].fields;
    out.parts.push(partOf(s, r.key, fields));
    out.writes.push({ slot: s, part: { key: r.key, fields, builtAt: pageBuiltAt } });
  }
  return out;
}

/** Schedules `fn` when the browser is idle (a timer where requestIdleCallback is missing); returns a cancel. */
export type Schedule = (fn: () => void) => () => void;

export const idle: Schedule = (fn) => {
  const w = globalThis as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
  if (w.requestIdleCallback && w.cancelIdleCallback) {
    const id = w.requestIdleCallback(fn, { timeout: 200 });
    return () => w.cancelIdleCallback!(id);
  }
  const id = setTimeout(fn, 0);
  return () => clearTimeout(id);
};

/** Candidates checked per slice: about 20 ms of engine work on a desktop (checkAll ~155 ms for 2,588 cases). */
export const SLICE = 300;

/**
 * Runs `step` over `items` in slices of `size`, each in its own scheduled task (none before the first one is
 * scheduled), then `done`. The returned function cancels a run that is no longer wanted (build or data changed).
 */
export function runSliced<T>(items: T[], size: number, step: (slice: T[]) => void, done: () => void, schedule: Schedule = idle): () => void {
  let cancelled = false;
  let cancelNext = () => {};
  const next = (from: number) => {
    cancelNext = schedule(() => {
      if (cancelled) return;
      step(items.slice(from, from + size));
      if (cancelled) return;
      if (from + size < items.length) next(from + size);
      else done();
    });
  };
  next(0);
  return () => {
    cancelled = true;
    cancelNext();
  };
}
