// PC builder state shared by the Guided and Quick list modes: builder.json, the build, the use and
// budget, a build opened from a share link, and builder-extra.json fetched only when needed.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { BaseListing, BuilderFile } from '../types';
import { fromColumns } from './columns';
import { loadBuilder, loadBuilderExtra, loadBuilderSlot, type Model } from './data';
import { LAZY_SLOTS, SLOTS, fitContext, slotModels, type Build, type Slot, type SlotListing } from './builder';
import { afterLargestPaint } from './paint';

export type Models = { [S in Slot]: Model<SlotListing[S]>[] };
export type AnyModel = Model<BaseListing>;
export type Use = 'gaming' | 'everyday' | 'creating' | 'unsure';
export const USES: Use[] = ['gaming', 'everyday', 'creating', 'unsure'];
export interface Prefs {
  use: Use | null;
  budget: number | null; // €
}
const NO_PREFS: Prefs = { use: null, budget: null };

// localStorage `pcBuild`: { <slot>: model key, use?, budget? } — per-browser convenience only (listed
// on the privacy page).
const STORAGE_KEY = 'pcBuild';
const EXTRA_DELAY = 5000; // ms after the parts load before builder-extra.json is fetched unasked

interface Saved {
  parts: Partial<Record<Slot, string>>;
  prefs: Prefs;
}

const asPrefs = (use: unknown, budget: unknown): Prefs => ({
  use: USES.includes(use as Use) ? (use as Use) : null,
  budget: Number(budget) > 0 ? Math.round(Number(budget)) : null,
});

function readSaved(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>;
    const parts = Object.fromEntries(SLOTS.filter((s) => typeof raw[s] === 'string').map((s) => [s, raw[s]]));
    return { parts, prefs: asPrefs(raw.use, raw.budget) };
  } catch {
    return { parts: {}, prefs: NO_PREFS };
  }
}

/** Saved parts of lazy slots whose file hasn't arrived yet: kept when the build is saved meanwhile. */
const pendingLazy: Partial<Record<Slot, string>> = {};

function writeSaved(b: Build, p: Prefs) {
  try {
    const parts = {
      ...pendingLazy,
      ...Object.fromEntries(SLOTS.filter((s) => b[s]).map((s) => [s, b[s]!.key])),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parts, ...(p.use && { use: p.use }), ...(p.budget && { budget: p.budget }) }));
  } catch {
    /* storage unavailable (private mode): the build just isn't remembered */
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
  const [coverage, setCoverage] = useState<BuilderFile['coverage'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [build, setBuild] = useState<Build>({});
  const [prefs, setPrefsState] = useState<Prefs>(() => (sharedAtStart ?? readSaved()).prefs);
  const [shared, setShared] = useState(sharedAtStart != null);
  const [extraVersion, setExtraVersion] = useState(0);
  const [builtAt, setBuiltAt] = useState<string | null>(null);
  const extraRef = useRef<(() => void) | null>(null);
  const extraTimer = useRef<number | undefined>(undefined);
  // Slots kept out of builder.json (LAZY_SLOTS): loaded on demand, then restored into the build.
  const [lazyReady, setLazyReady] = useState<Partial<Record<Slot, boolean>>>({});
  const slotRef = useRef<((slot: Slot) => void) | null>(null);

  useEffect(() => {
    // builder.json: one row per model the builder can offer, in Recommended order (src/lib/derive.ts).
    // Requested once the builder's step text (the page's largest paint) is on screen: a download that
    // finishes before that paint counts toward it in Lighthouse's phone simulation (src/lib/paint.ts).
    const cancel = afterLargestPaint(() => {
      loadBuilder('all')
        .then((file) => {
          const m = Object.fromEntries(
            SLOTS.map((s) => [s, slotModels(s, fromColumns<SlotListing[typeof s]>(file.slots[s] ?? { cols: [], rows: [] }))]),
          ) as unknown as Models;
          setCoverage(file.coverage);
          setBuiltAt(file.builtAt);
          setModels(m);
          // The shared or the saved build; parts that disappeared from the market are dropped.
          const parts = (sharedAtStart ?? readSaved()).parts;
          const restored: Build = {};
          for (const s of SLOTS) {
            const found = (m[s] as AnyModel[]).find((x) => x.key === parts[s]);
            if (found) (restored as Record<Slot, AnyModel>)[s] = found;
          }
          setBuild(restored);
          // A lazy slot's own file: when its step or picker opens, or at once when the saved/shared
          // build has a part there (no request otherwise, so the first load stays as it was).
          const requestedSlots = new Set<Slot>();
          slotRef.current = (slot) => {
            if (!LAZY_SLOTS.includes(slot) || requestedSlots.has(slot)) return;
            requestedSlots.add(slot);
            loadBuilderSlot(`${slot}.json?v=${file.builtAt}`)
              .then((f) => {
                delete pendingLazy[slot];
                const ms = slotModels(slot, fromColumns<SlotListing[typeof slot]>(f));
                setModels((prev) => (prev ? ({ ...prev, [slot]: ms } as Models) : prev));
                const found = (ms as AnyModel[]).find((x) => x.key === parts[slot]);
                // Restored only if the user hasn't picked one meanwhile.
                if (found) setBuild((b) => (b[slot] ? b : { ...b, [slot]: found }));
                setLazyReady((r) => ({ ...r, [slot]: true }));
              })
              .catch(() => {
                requestedSlots.delete(slot); // the next request retries
                setLazyReady((r) => ({ ...r, [slot]: false }));
              });
          };
          for (const s of LAZY_SLOTS) {
            // Only the saved build is protected; a shared one isn't saved until changed (then it's the user's).
            if (parts[s] && !sharedAtStart) pendingLazy[s] = parts[s];
            if (parts[s]) slotRef.current(s);
          }
          // Then the shop links and the search titles (builder-extra.json, ~430 KB gzipped), written
          // onto each model's one row; `extraVersion` makes searches and links pick them up. Only when
          // needed: at once for a restored build (its parts need their links), else on the first
          // interaction, or EXTRA_DELAY after the parts load, so a phone's first seconds download the
          // parts only.
          let requested = false;
          extraRef.current = () => {
            if (requested) return;
            requested = true;
            window.clearTimeout(extraTimer.current);
            loadBuilderExtra(file.builtAt)
              .then((extra) => {
                for (const s of SLOTS) {
                  for (const model of m[s] as AnyModel[]) {
                    const row = model.cheapest;
                    row.url = extra.urls[row.id] ?? row.url;
                    if (!row.title) row.title = extra.titles[row.id] ?? '';
                  }
                }
                setExtraVersion((v) => v + 1);
              })
              .catch(() => {}); // the builder still works; links and title search just stay missing
          };
          if (Object.keys(restored).length || LAZY_SLOTS.some((s) => parts[s])) extraRef.current();
          else extraTimer.current = window.setTimeout(() => extraRef.current?.(), EXTRA_DELAY);
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    });
    return () => {
      cancel();
      window.clearTimeout(extraTimer.current);
    };
  }, [sharedAtStart]);

  /** The first change to a shared build makes it the user's own: saved, and the link parameters go. */
  const own = () => {
    if (!shared) return;
    setShared(false);
    writeBuilderParams((p) => SHARE_KEYS.forEach((k) => p.delete(k)));
  };
  const update = (b: Build) => {
    // A lazy slot the user empties or fills themselves is no longer pending.
    for (const s of LAZY_SLOTS) if (s in b) delete pendingLazy[s];
    setBuild(b);
    writeSaved(b, prefs);
    own();
  };
  const setPrefs = (p: Prefs) => {
    setPrefsState(p);
    writeSaved(build, p);
    own();
  };

  // Measured length range per graphics chip, for "Likely fits" (src/lib/builder.ts fitContext).
  const ctx = useMemo(() => fitContext(models?.gpu ?? []), [models]);

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
    /** Load builder-extra.json now (first interaction); a no-op before builder.json has arrived. */
    wantExtra: () => extraRef.current?.(),
    /** Load a lazy slot's file (storage) now; a no-op for the others and once requested. */
    wantSlot: (slot: Slot) => slotRef.current?.(slot),
    /** False while a lazy slot's parts haven't arrived (or failed: undefined → still loading). */
    slotReady: (slot: Slot) => !LAZY_SLOTS.includes(slot) || lazyReady[slot] === true,
  };
}

export type BuilderState = ReturnType<typeof useBuilderState>;
