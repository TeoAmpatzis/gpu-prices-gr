// PC builder state shared by the Guided and Quick list modes: the builder's index file, each step's parts (one file
// per step, src/lib/builderFiles.ts), the build, the use and budget, a build opened from a share link, and each step's
// shop links and search titles fetched only when needed.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { BaseListing, BuilderIndex } from '../types';
import type { Model } from './data';
import { loadExtra, loadIndex, loadSlot, prefetchSlot } from './builderFiles';
import { NO_CONTEXT, SLOTS, slotFallback, type Build, type FitContext, type Slot, type SlotListing } from './builder';
import { afterLargestPaint } from './paint';
import { onBuildChange, readBuild, writeBuild, type BuildChangeSource, type StoredBuild } from './buildStore';

export type Models = { [S in Slot]: Model<SlotListing[S]>[] };
export type AnyModel = Model<BaseListing>;
/**
 * A saved or shared part among its step's models: by its key, else the product or card it became (task 7: a power
 * supply saved as a spec group "650W Gold ATX", a graphics card listing merged into its twin's row).
 */
export function findSaved(slot: Slot, models: AnyModel[], key: string | undefined): AnyModel | undefined {
  if (key === undefined) return undefined;
  const own = models.find((x) => x.key === key);
  if (own) return own;
  const k = slotFallback(slot, key, models);
  return k == null ? undefined : models.find((x) => x.key === k);
}
export type Use = 'gaming' | 'everyday' | 'creating' | 'unsure';
export const USES: Use[] = ['gaming', 'everyday', 'creating', 'unsure'];
export interface Prefs {
  use: Use | null;
  budget: number | null; // €
}

// The saved build lives in localStorage `pcBuild` (src/lib/buildStore.ts) — per-browser convenience
// only (listed on the privacy page).
const EXTRA_DELAY = 5000; // ms after the index loads before the loaded steps' extra files are fetched unasked

interface Saved {
  parts: Partial<Record<Slot, string>>;
  prefs: Prefs;
}

const asPrefs = (use: unknown, budget: unknown): Prefs => ({
  use: USES.includes(use as Use) ? (use as Use) : null,
  budget: Number(budget) > 0 ? Math.round(Number(budget)) : null,
});

function readSaved(): Saved {
  const b = readBuild();
  const parts = Object.fromEntries(SLOTS.filter((s) => b.parts[s]).map((s) => [s, b.parts[s]!.key]));
  return { parts, prefs: asPrefs(b.use, b.budget) };
}

/** Saved parts of steps whose file hasn't arrived yet: kept when the build is saved meanwhile. */
const pendingLazy: Partial<Record<Slot, string>> = {};

/**
 * Does the builder show a saved build that changed while it is open? Not its own saves; not a change of compat
 * fields only (a page saving fresh engine fields for the same parts); and a shared link on screen stays as it is
 * when another tab changes the saved build. A part added in this tab (a category page's "Add to build") applies,
 * shared link or not: that is the user's own edit, so a shared view it replaces becomes the user's own, as when
 * they edit it in the builder ('own': the share parameters leave the address).
 */
export function followSavedBuild(c: {
  ownWrite: boolean;
  changed: boolean;
  shared: boolean;
  source: BuildChangeSource;
}): 'ignore' | 'follow' | 'own' {
  if (c.ownWrite || !c.changed) return 'ignore';
  if (!c.shared) return 'follow';
  return c.source === 'other-tab' ? 'ignore' : 'own';
}

/** True while the builder writes its own build (its change listener ignores that write). */
let ownWrite = false;

/** Saves the build; a part whose key didn't change keeps its stored engine fields and data date. */
export function writeSaved(b: Build, p: Prefs) {
  const old = readBuild().parts;
  const keys: Partial<Record<Slot, string>> = {
    ...pendingLazy,
    ...Object.fromEntries(SLOTS.filter((s) => b[s]).map((s) => [s, b[s]!.key])),
  };
  const parts: StoredBuild['parts'] = {};
  for (const s of SLOTS) {
    const key = keys[s];
    if (key !== undefined) parts[s] = old[s]?.key === key ? old[s] : { key };
  }
  ownWrite = true;
  try {
    writeBuild({ parts, ...(p.use && { use: p.use }), ...(p.budget && { budget: p.budget }) });
  } finally {
    ownWrite = false;
  }
}

// ---------- The builder's URL parameters (/builder?mode=quick&step=case&cpu=…) ----------

/** The builder's parameters, or empty ones on another page. */
export function builderParams(): URLSearchParams {
  return location.pathname === '/builder' ? new URLSearchParams(location.search) : new URLSearchParams();
}

/** Replace (not push) the builder's parameters; the page stays "/builder". */
export function writeBuilderParams(change: (p: URLSearchParams) => void) {
  if (location.pathname !== '/builder') return;
  const p = builderParams();
  change(p);
  const qs = p.toString();
  const next = `/builder${qs ? `?${qs}` : ''}`;
  if (location.pathname + location.search !== next) history.replaceState(history.state, '', next);
}

const SHARE_KEYS = [...SLOTS, 'use', 'budget'];

/** A shared build became the user's own: its parameters leave the builder's address. */
export const clearShareParams = () => writeBuilderParams((p) => SHARE_KEYS.forEach((k) => p.delete(k)));

/** A build in a share link: one parameter per part (model keys hold "|", ":" and spaces). */
export function shareLink(b: Build, p: Prefs): string {
  const q = new URLSearchParams();
  for (const s of SLOTS) if (b[s]) q.set(s, b[s]!.key);
  if (p.use) q.set('use', p.use);
  if (p.budget) q.set('budget', String(p.budget));
  return `${location.origin}/builder?${q}`;
}

function readShared(): Saved | null {
  const p = builderParams();
  if (!SLOTS.some((s) => p.has(s))) return null;
  return {
    parts: Object.fromEntries(SLOTS.filter((s) => p.get(s)).map((s) => [s, p.get(s)!])),
    prefs: asPrefs(p.get('use'), p.get('budget')),
  };
}

// ---------- The hook ----------

export function useBuilderState() {
  // A shared link is shown as it is; the saved build is left alone until the user changes something.
  const [sharedAtStart] = useState(readShared);
  const [models, setModels] = useState<Models | null>(null);
  const [coverage, setCoverage] = useState<BuilderIndex['coverage'] | null>(null);
  const [chipLengths, setChipLengths] = useState<BuilderIndex['chipLengths'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [build, setBuild] = useState<Build>({});
  const [prefs, setPrefsState] = useState<Prefs>(() => (sharedAtStart ?? readSaved()).prefs);
  const [shared, setShared] = useState(sharedAtStart != null);
  const [extraVersion, setExtraVersion] = useState(0);
  const [builtAt, setBuiltAt] = useState<string | null>(null);
  const extraRef = useRef<(() => void) | null>(null);
  const extraTimer = useRef<number | undefined>(undefined);
  // Each step's parts are their own file: loaded on demand (the step or picker opens, or a saved part is there),
  // then restored into the build. true = loaded, false = failed, missing = not loaded yet.
  const [slotState, setSlotState] = useState<Partial<Record<Slot, boolean>>>({});
  const slotRef = useRef<((slot: Slot) => void) | null>(null);

  useEffect(() => {
    // /data/builder/index.json (a few KiB): the build date, coverage and chip lengths; requested once the builder's
    // step text (the page's largest paint) is on screen: a download that finishes before that paint counts toward
    // it in Lighthouse's phone simulation (src/lib/paint.ts). The steps' files follow on demand.
    const cancel = afterLargestPaint(() => {
      loadIndex()
        .then((index) => {
          const at = index.builtAt;
          setCoverage(index.coverage);
          setChipLengths(index.chipLengths);
          setBuiltAt(at);
          setModels(Object.fromEntries(SLOTS.map((s) => [s, []])) as unknown as Models);
          // The shared or the saved build; parts that disappeared from the market are dropped.
          const parts = (sharedAtStart ?? readSaved()).parts;
          const loaded: Partial<Record<Slot, AnyModel[]>> = {};
          // Shop links and search titles (<slot>-extra.json), written onto each model's one row; `extraVersion`
          // makes searches and links pick them up. Per loaded step, once wanted (see extraRef below).
          let extraWanted = false;
          const extraRequested = new Set<Slot>();
          const fetchExtra = (slot: Slot) => {
            const ms = loaded[slot];
            if (!ms || extraRequested.has(slot)) return;
            extraRequested.add(slot);
            loadExtra(slot, at)
              .then((extra) => {
                for (const model of ms) {
                  const row = model.cheapest;
                  row.url = extra.urls[row.id] ?? row.url;
                  if (!row.title) row.title = extra.titles[row.id] ?? '';
                }
                setExtraVersion((v) => v + 1);
              })
              .catch(() => extraRequested.delete(slot)); // the builder still works; links and title search stay missing
          };
          const requestedSlots = new Set<Slot>();
          slotRef.current = (slot) => {
            if (requestedSlots.has(slot)) return;
            requestedSlots.add(slot);
            loadSlot(slot, at)
              .then((ms) => {
                loaded[slot] = ms as AnyModel[];
                // The part saved meanwhile (a category page's "Add to build") wins over the one at load.
                const want = pendingLazy[slot] ?? parts[slot];
                delete pendingLazy[slot];
                setModels((prev) => (prev ? ({ ...prev, [slot]: ms } as Models) : prev));
                const found = findSaved(slot, ms as AnyModel[], want);
                // Restored only if the user hasn't picked one meanwhile.
                if (found) setBuild((b) => (b[slot] ? b : { ...b, [slot]: found }));
                setSlotState((r) => ({ ...r, [slot]: true }));
                if (extraWanted) fetchExtra(slot);
                // The next step's parts, in idle time.
                const next = SLOTS[SLOTS.indexOf(slot) + 1];
                if (next) prefetchSlot(next, at);
              })
              .catch(() => {
                requestedSlots.delete(slot); // the next request retries
                setSlotState((r) => ({ ...r, [slot]: false }));
              });
          };
          for (const s of SLOTS) {
            // Only the saved build is protected; a shared one isn't saved until changed (then it's the user's).
            if (parts[s] && !sharedAtStart) pendingLazy[s] = parts[s];
            if (parts[s]) slotRef.current(s);
          }
          // The first step's parts, in idle time (after the first paint: the largest one is on screen here).
          prefetchSlot(SLOTS[0], at);
          // At once for a restored build (its parts need their links), else on the first interaction, or
          // EXTRA_DELAY after the index loads, so a phone's first seconds download the first screen only.
          extraRef.current = () => {
            if (extraWanted) return;
            extraWanted = true;
            window.clearTimeout(extraTimer.current);
            for (const s of SLOTS) fetchExtra(s);
          };
          if (SLOTS.some((s) => parts[s])) extraRef.current();
          else extraTimer.current = window.setTimeout(() => extraRef.current?.(), EXTRA_DELAY);
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    });
    return () => {
      cancel();
      window.clearTimeout(extraTimer.current);
    };
  }, [sharedAtStart]);

  // The builder stays mounted while other pages are open: when the saved build changes there (a category
  // page's "Add to build", v2 step 3) or in another tab, show that build (rules: `followSavedBuild`).
  useEffect(() => {
    if (!models) return;
    let last = JSON.stringify(readSaved());
    return onBuildChange((source) => {
      const saved = readSaved();
      const now = JSON.stringify(saved);
      const changed = now !== last;
      last = now;
      const action = followSavedBuild({ ownWrite, changed, shared, source });
      if (action === 'ignore') return;
      const next: Build = {};
      for (const s of SLOTS) {
        const key = saved.parts[s];
        if (!key) continue;
        const found = findSaved(s, models[s] as AnyModel[], key);
        if (found) (next as Record<Slot, AnyModel>)[s] = found;
        else {
          // Its step's file hasn't arrived (or doesn't have it): restored when it does.
          pendingLazy[s] = key;
          slotRef.current?.(s);
        }
      }
      setBuild(next);
      setPrefsState(saved.prefs);
      if (action === 'own') {
        // The same path as editing a shared build: it is the user's own now, and the link parameters go.
        setShared(false);
        clearShareParams();
      }
    });
  }, [models, shared]);

  /** The first change to a shared build makes it the user's own: saved, and the link parameters go. */
  const own = () => {
    if (!shared) return;
    setShared(false);
    clearShareParams();
  };
  const update = (b: Build) => {
    // A step the user empties or fills themselves is no longer pending.
    for (const s of SLOTS) if (s in b) delete pendingLazy[s];
    setBuild(b);
    writeSaved(b, prefs);
    own();
  };
  const setPrefs = (p: Prefs) => {
    setPrefsState(p);
    writeSaved(build, p);
    own();
  };

  // Measured length range per graphics chip, for "Likely fits" (src/lib/builder.ts fitContext, from the index file).
  const ctx = useMemo<FitContext>(() => (chipLengths ? { chips: new Map(Object.entries(chipLengths)) } : NO_CONTEXT), [chipLengths]);

  return {
    models,
    coverage,
    error,
    loading: !models,
    ctx,
    build,
    update,
    prefs,
    setPrefs,
    shared,
    extraVersion,
    /** When the site's data was built (the prices' date). */
    builtAt,
    /** Load the loaded steps' extra files now (first interaction); a no-op before the index has arrived. */
    wantExtra: () => extraRef.current?.(),
    /** Load a step's file now; a no-op once requested (until it fails). */
    wantSlot: (slot: Slot) => slotRef.current?.(slot),
    /** False while a step's parts haven't arrived (or failed). */
    slotReady: (slot: Slot) => slotState[slot] === true,
  };
}

export type BuilderState = ReturnType<typeof useBuilderState>;
