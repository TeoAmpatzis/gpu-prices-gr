// Pick mode (v2 step 3): the saved build as the engine's parts on a category page, and the candidate check
// run in slices after the first paint. Pure functions (no React), loaded only with the pick code.
//  - Stored engine fields are used only when they are plain JSON values and carry their data date (A7).
//  - A part with no usable fields, or fields from older data than the page's, is refreshed from the
//    compat chunks; a key the chunks no longer have is "no longer available" and left out (A9).
import { MODEL_ALIASES } from '../data/modelAliases';
import type { Part } from '../engine';
import { resolveKey, type StoredBuild, type StoredPart } from './buildStore';
import { CATEGORY_RULE_SLOTS, type Slot } from './slots';

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

/** What the page `pageSlot` needs from the build: only the slots its rules read (slots.CATEGORY_RULE_SLOTS). */
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
  /** Parts whose chunk failed to load and that have no valid stored fields: left out, the bar says so. */
  unchecked: { slot: Slot; key: string }[];
}

/**
 * What the compat chunks answered for one saved part: its fields (under its current key), gone from the data,
 * or the chunk failed to load. Kept per page data date; an answer is never asked for again, whatever it was.
 */
export type Outcome = { key: string; fields: Record<string, unknown> } | 'missing' | 'failed';

export const outcomeKey = (builtAt: string, slot: Slot, key: string) => `${builtAt}\n${slot}\n${key}`;

/** One key's answer from a `loadCompat` result (`undefined` = the chunk failed to load). */
export function outcomeOf(slot: Slot, key: string, rows: Record<string, { fields: Record<string, unknown> }> | undefined): Outcome {
  if (!rows) return 'failed';
  const r = resolveKey(slot, key, new Set(Object.keys(rows)), MODEL_ALIASES[slot]);
  return r.status === 'missing' ? 'missing' : { key: r.key, fields: rows[r.key].fields };
}

/**
 * The build the page checks against, from the plan and the chunks' answers so far.
 * - `toFetch`: the parts to refresh that have no answer yet (sorted, so its JSON is a stable effect key);
 * - `result`: null while any of them is unanswered; a failed chunk uses the stored fields when they are
 *   valid (older data), else the part is left out and listed in `unchecked`.
 * A part answered once is never fetched again, even when its fresh fields could not be saved back
 * (no refetch loop on a failing chunk or a full storage).
 */
export function resolvePlan(
  plan: BuildPlan,
  outcomes: Readonly<Record<string, Outcome>>,
  pageBuiltAt: string,
): { result: Refreshed | null; toFetch: { slot: Slot; key: string }[] } {
  const out: Refreshed = { parts: [...plan.ready], missing: [], unchecked: [] };
  const toFetch: { slot: Slot; key: string }[] = [];
  for (const s of (Object.keys(plan.refresh) as Slot[]).sort()) {
    const key = plan.refresh[s]!;
    const o = outcomes[outcomeKey(pageBuiltAt, s, key)];
    if (o === undefined) toFetch.push({ slot: s, key });
    else if (o === 'missing') out.missing.push({ slot: s, key });
    else if (o === 'failed') {
      const old = plan.fallback[s];
      if (old) out.parts.push(partOf(s, key, old));
      else out.unchecked.push({ slot: s, key });
    } else out.parts.push(partOf(s, o.key, o.fields));
  }
  return { result: toFetch.length ? null : out, toFetch };
}

type Load = (slot: Slot, keys: string[], builtAt: string) => Promise<Record<string, { fields: Record<string, unknown> }>>;

/** Asks the chunks once for each part in `toFetch` (`load` = compatChunks.loadCompat); a failure is an answer too. */
export async function fetchOutcomes(toFetch: { slot: Slot; key: string }[], builtAt: string, load: Load): Promise<Record<string, Outcome>> {
  const rows = await Promise.all(toFetch.map((p) => load(p.slot, [p.key], builtAt).catch(() => undefined)));
  return Object.fromEntries(toFetch.map((p, i) => [outcomeKey(builtAt, p.slot, p.key), outcomeOf(p.slot, p.key, rows[i])]));
}

/**
 * The offer whose candidate a row's "Add" button adds: the cheapest one "Only compatible" doesn't hide (a CPU's
 * Box or Tray), or the cheapest when every offer is hidden (its reasons are shown). `listings` are price-sorted.
 */
export function shownOffer<L extends { id: string }>(listings: L[], hidden: (id: string) => boolean): L {
  return listings.find((l) => !hidden(l.id)) ?? listings[0];
}

// Idle scheduling and slicing live in slices.ts (shared with the facet counts' main-thread fallback).
export { idle, runSliced, type Schedule } from './slices';

/** Candidates checked per slice: about 20 ms of engine work on a desktop (checkAll ~155 ms for 2,588 cases). */
export const SLICE = 300;
