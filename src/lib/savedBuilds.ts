// Named saved builds (answer 12): localStorage `pcBuilds` = { v: 1, active, builds: { <id>: { name, savedAt, build } } },
// at most MAX_BUILDS. `pcBuild` (src/lib/buildStore.ts) stays the active build that pick mode and the product pages
// read; opening a named build writes it there, and every write there updates the active named build (mirrorActive).
// Per-browser convenience only (listed on the privacy page). Side-by-side compare = backlog.

import type { Text } from './i18n';
import { readBuild, writeBuild, type StoredBuild } from './buildStore';

export interface SavedBuild {
  name: string;
  savedAt: string; // ISO time of the last change
  build: StoredBuild;
}
export interface SavedBuilds {
  v: 1;
  active: string | null;
  builds: Record<string, SavedBuild>;
}
export type SaveResult = { ok: true; id: string } | { ok: false; message: Text };

export const MAX_BUILDS = 30;
const STORAGE_KEY = 'pcBuilds';

export const FULL_TEXT: Text = {
  el: `Έχεις ήδη ${MAX_BUILDS} αποθηκευμένες συνθέσεις. Σβήσε μία για να αποθηκεύσεις καινούρια.`,
  en: `You already have ${MAX_BUILDS} saved builds. Delete one to save a new one.`,
};
export const NOT_STORED_TEXT: Text = {
  el: 'Ο browser δεν επέτρεψε την αποθήκευση (ο χώρος είναι γεμάτος ή η αποθήκευση είναι κλειστή). Η σύνθεση μένει ανοιχτή σε αυτή τη σελίδα.',
  en: "Your browser didn't allow saving (storage is full or turned off). The build stays open on this page.",
};
export const NOT_FOUND_TEXT: Text = { el: 'Η σύνθεση δεν βρέθηκε.', en: 'Build not found.' };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const empty = (): SavedBuilds => ({ v: 1, active: null, builds: {} });

export function readSavedBuilds(): SavedBuilds {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as unknown;
    if (!isObject(raw) || raw.v !== 1 || !isObject(raw.builds)) return empty();
    const builds: SavedBuilds['builds'] = {};
    for (const [id, e] of Object.entries(raw.builds)) {
      if (!isObject(e) || typeof e.name !== 'string' || !isObject(e.build) || !isObject(e.build.parts)) continue;
      // Named builds hold the StoredBuild buildStore reads: keys it doesn't know (kept in `pcBuild`) are not kept here.
      builds[id] = { name: e.name, savedAt: typeof e.savedAt === 'string' ? e.savedAt : '', build: e.build as unknown as StoredBuild };
    }
    const active = typeof raw.active === 'string' && raw.active in builds ? raw.active : null;
    return { v: 1, active, builds };
  } catch {
    return empty();
  }
}

/** False when the browser refuses (private mode, storage full); never throws. */
function store(s: SavedBuilds): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

function add(s: SavedBuilds, name: string, build: StoredBuild): SaveResult {
  if (Object.keys(s.builds).length >= MAX_BUILDS) return { ok: false, message: FULL_TEXT };
  const base = Date.now().toString(36);
  let id = base;
  for (let n = 1; id in s.builds; n++) id = `${base}-${n}`;
  s.builds[id] = { name, savedAt: new Date().toISOString(), build };
  s.active = id;
  return store(s) ? { ok: true, id } : { ok: false, message: NOT_STORED_TEXT };
}

/** The current build (`pcBuild`), or `build` (a shared link on screen), under a new name; it becomes the active one. */
export const saveBuildAs = (name: string, build: StoredBuild = readBuild()): SaveResult => add(readSavedBuilds(), name, build);

/** No named build is open any more: later writes of `pcBuild` leave every named build as saved ("Build it for me"). */
export function closeActive(): boolean {
  const s = readSavedBuilds();
  if (!s.active) return true;
  s.active = null;
  return store(s);
}

/** A copy of a named build under "<name> (2)"; the copy becomes the active one and opens. */
export function duplicateBuild(id: string): SaveResult {
  const s = readSavedBuilds();
  const e = s.builds[id];
  if (!e) return { ok: false, message: NOT_FOUND_TEXT };
  const copy = JSON.parse(JSON.stringify(e.build)) as StoredBuild;
  const r = add(s, `${e.name} (2)`, copy);
  if (r.ok) writeBuild(copy);
  return r;
}

export function renameBuild(id: string, name: string): boolean {
  const s = readSavedBuilds();
  if (!s.builds[id]) return false;
  s.builds[id].name = name;
  return store(s);
}

/** Removes a named build; the current build (`pcBuild`) stays as it is. */
export function removeBuild(id: string): boolean {
  const s = readSavedBuilds();
  if (!s.builds[id]) return false;
  delete s.builds[id];
  if (s.active === id) s.active = null;
  return store(s);
}

/** Makes a named build the active one and writes it to `pcBuild`. */
export function openBuild(id: string): boolean {
  const s = readSavedBuilds();
  const e = s.builds[id];
  if (!e) return false;
  s.active = id;
  store(s);
  writeBuild(e.build);
  return true;
}

/** Called by buildStore.writeBuild: the active named build follows every change of `pcBuild`. */
export function mirrorActive(b: StoredBuild): void {
  const s = readSavedBuilds();
  const e = s.active ? s.builds[s.active] : undefined;
  // Unchanged (openBuild, duplicateBuild write the stored build back): savedAt stays the last real change.
  if (!e || JSON.stringify(e.build) === JSON.stringify(b)) return;
  e.build = b;
  e.savedAt = new Date().toISOString();
  store(s);
}
