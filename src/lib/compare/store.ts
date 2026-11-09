import type { Category } from '../../types';
import { decodeRef, encodeRef, isComparable, MAX_ITEMS, type CompareRef } from './refs';

/** localStorage key; the version is in the key and in the data, so a new format never reads an old one. */
export const STORAGE_KEY = 'bdCompare:v1';
/** At most this many categories hold items at once (one group per category). */
export const MAX_GROUPS = 3;

export interface CompareState {
  v: 1;
  /** The group the tray and the compare page show. */
  active: Category | null;
  groups: Partial<Record<Category, CompareRef[]>>;
}

export type AddResult = 'added' | 'duplicate' | 'full' | 'groups-full';

export const emptyState = (): CompareState => ({ v: 1, active: null, groups: {} });

const same = (a: CompareRef, b: CompareRef) => encodeRef(a) === encodeRef(b);
const withGroups = (groups: CompareState['groups'], preferred: Category | null): CompareState => {
  const cats = Object.keys(groups) as Category[];
  return { v: 1, groups, active: preferred && groups[preferred] ? preferred : (cats[0] ?? null) };
};

/** Never evicts: a full group or a fourth category is reported and the state is returned unchanged (same object). */
export function addRef(s: CompareState, ref: CompareRef): { state: CompareState; result: AddResult } {
  const group = s.groups[ref.cat];
  if (group?.some((r) => same(r, ref))) return { state: s, result: 'duplicate' };
  if (group && group.length >= MAX_ITEMS) return { state: s, result: 'full' };
  if (!group && Object.keys(s.groups).length >= MAX_GROUPS) return { state: s, result: 'groups-full' };
  return { state: withGroups({ ...s.groups, [ref.cat]: [...(group ?? []), ref] }, ref.cat), result: 'added' };
}

export function removeRef(s: CompareState, ref: CompareRef): CompareState {
  const group = s.groups[ref.cat];
  if (!group?.some((r) => same(r, ref))) return s;
  const left = group.filter((r) => !same(r, ref));
  const groups = { ...s.groups };
  if (left.length > 0) groups[ref.cat] = left;
  else delete groups[ref.cat];
  return withGroups(groups, s.active);
}

export function clearGroup(s: CompareState, cat: Category): CompareState {
  if (!s.groups[cat]) return s;
  const groups = { ...s.groups };
  delete groups[cat];
  return withGroups(groups, s.active);
}

export const setActive = (s: CompareState, cat: Category): CompareState => (!s.groups[cat] || s.active === cat ? s : { ...s, active: cat });

/** Swap one item for another of the same category in place; refused across categories and onto an existing item. */
export function replaceRef(s: CompareState, from: CompareRef, to: CompareRef): CompareState {
  const group = s.groups[from.cat];
  if (to.cat !== from.cat || !group?.some((r) => same(r, from)) || group.some((r) => same(r, to))) return s;
  return { ...s, groups: { ...s.groups, [from.cat]: group.map((r) => (same(r, from) ? to : r)) } };
}

/** Whatever is in storage becomes a valid state: anything corrupt, foreign, misfiled or over a limit is dropped. */
export function parseStored(text: string): CompareState {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return emptyState();
  }
  if (!raw || typeof raw !== 'object' || (raw as { v?: unknown }).v !== 1) return emptyState();
  const { groups: stored, active } = raw as { groups?: unknown; active?: unknown };
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return emptyState();
  const groups: CompareState['groups'] = {};
  for (const [cat, items] of Object.entries(stored)) {
    if (!isComparable(cat) || !Array.isArray(items) || Object.keys(groups).length >= MAX_GROUPS) continue;
    const refs: CompareRef[] = [];
    for (const item of items) {
      const ref = typeof item === 'string' ? decodeRef(item) : null;
      if (ref && ref.cat === cat && refs.length < MAX_ITEMS && !refs.some((r) => same(r, ref))) refs.push(ref);
    }
    if (refs.length > 0) groups[cat] = refs;
  }
  return withGroups(groups, typeof active === 'string' && isComparable(active) ? active : null);
}

const serialize = (s: CompareState) =>
  JSON.stringify({ v: 1, active: s.active, groups: Object.fromEntries(Object.entries(s.groups).map(([cat, refs]) => [cat, refs!.map(encodeRef)])) });

/** Storage can be missing or blocked (private windows, cleared site data): reading then gives an empty state. */
export function readState(storage: Pick<Storage, 'getItem'> | undefined): CompareState {
  try {
    return parseStored(storage?.getItem(STORAGE_KEY) ?? '');
  } catch {
    return emptyState();
  }
}

/** True when saved. A false result means this tab keeps working from memory only. */
export function writeState(storage: Pick<Storage, 'setItem'> | undefined, s: CompareState): boolean {
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, serialize(s));
    return true;
  } catch {
    return false;
  }
}

/** Calls back with the state when another tab changes it. Returns the unsubscribe function. */
export function onOtherTabs(callback: (s: CompareState) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) callback(parseStored(e.newValue ?? ''));
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
