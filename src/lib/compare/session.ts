// The comparison state of this browser tab: loaded from localStorage once, saved on every change, kept in sync
// with other tabs. Pure rules live in ./store; this file only connects them to React and the browser.
import { useSyncExternalStore } from 'react';
import type { Category } from '../../types';
import { encodeRef, type CompareRef } from './refs';
import { addRef, clearGroup, onOtherTabs, readState, removeRef, setActive, writeState, type AddResult, type CompareState } from './store';

/** Why the last add was refused; the tray shows it for a few seconds. */
export type Notice = { kind: Exclude<AddResult, 'added' | 'duplicate'>; cat: Category } | null;

const listeners = new Set<() => void>();
const storage = (): Storage | undefined => {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined; // blocked storage: this tab keeps working from memory
  }
};

let state: CompareState = readState(storage());
let notice: Notice = null;
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
let stopTabs: (() => void) | undefined;

const emit = () => listeners.forEach((l) => l());
function commit(next: CompareState) {
  if (next === state) return;
  state = next;
  writeState(storage(), next);
  emit();
}
function say(n: Notice) {
  notice = n;
  clearTimeout(noticeTimer);
  if (n) noticeTimer = setTimeout(() => say(null), 5000);
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  if (listeners.size === 1) {
    state = readState(storage());
    stopTabs = onOtherTabs((s) => {
      state = s;
      emit();
    });
  }
  return () => {
    listeners.delete(l);
    if (listeners.size === 0) stopTabs?.();
  };
}

export const useCompare = (): CompareState => useSyncExternalStore(subscribe, () => state);
export const useNotice = (): Notice => useSyncExternalStore(subscribe, () => notice);

export function compareAdd(ref: CompareRef): AddResult {
  const { state: next, result } = addRef(state, ref);
  commit(next);
  say(result === 'full' || result === 'groups-full' ? { kind: result, cat: ref.cat } : null);
  return result;
}
export const compareRemove = (ref: CompareRef) => commit(removeRef(state, ref));
export const compareClear = (cat: Category) => commit(clearGroup(state, cat));
export const compareActivate = (cat: Category) => commit(setActive(state, cat));
export const dismissNotice = () => say(null);

export const isCompared = (s: CompareState, ref: CompareRef): boolean => !!s.groups[ref.cat]?.some((r) => encodeRef(r) === encodeRef(ref));
