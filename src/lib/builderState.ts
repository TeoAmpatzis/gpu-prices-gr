// PC builder state shared by the Guided and Quick list modes: the builder's index file, each step's parts (one file
// per step, src/lib/builderFiles.ts), the build, the use and budget, a build opened from a share link, and each step's
// shop links and search titles fetched only when needed. Fits come from the v2 engine (step 5 task 9): the build's own
// findings from the engine's lazy chunk (pickCheck.ts), each step's candidates from the pick worker (`useStepVerdicts`).

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Finding, Part } from '../engine';
import type { BaseListing, BuilderIndex } from '../types';
import type { Model } from './data';
import { loadExtra, loadIndex, loadSlot, prefetchSlot } from './builderFiles';
import { SLOTS, candidates, slotFallback, type Build, type Slot, type SlotListing } from './builderData';
import { engineUse, partOf, toParts, withoutOptional, type ActiveBuild } from './builderEngine';
import type { Checker } from './pickChecker';
import type { PostedContext, Verdict } from './pickProtocol';
import { afterLargestPaint } from './paint';
import { onBuildChange, readBuild, writeBuild, type BuildChangeSource, type StoredBuild } from './buildStore';
import { decodeShare, isShareParam } from './share';

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
  /** A shared link's whole build (second drive, fan quantity, shops, resolution): saved from it on the first edit. */
  build?: StoredBuild;
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

/**
 * Saves the build; a part whose key didn't change keeps its stored engine fields, data date and chosen shop. The
 * build store's other lines (second drive, fan quantity, resolution) are kept as they are: from the saved build, or
 * from `base` (the shared link on screen, whose first edit makes it the user's own).
 */
export function writeSaved(b: Build, p: Prefs, base?: StoredBuild) {
  const prev = base ?? readBuild();
  const old = prev.parts;
  const offers = { ...prev.offers };
  const keys: Partial<Record<Slot, string>> = {
    ...pendingLazy,
    ...Object.fromEntries(SLOTS.filter((s) => b[s]).map((s) => [s, b[s]!.key])),
  };
  const parts: StoredBuild['parts'] = {};
  for (const s of SLOTS) {
    const key = keys[s];
    if (key !== undefined) parts[s] = old[s]?.key === key ? old[s] : { key };
    if (old[s]?.key !== key) delete offers[s];
  }
  const next: StoredBuild = { ...prev, parts, offers };
  delete next.use;
  delete next.budget;
  if (p.use) next.use = p.use;
  if (p.budget) next.budget = p.budget;
  ownWrite = true;
  try {
    writeBuild(next);
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

/** A shared build became the user's own: its parameters (share.ts, v1 and v2 links) leave the builder's address. */
export const clearShareParams = () => writeBuilderParams((p) => [...p.keys()].filter(isShareParam).forEach((k) => p.delete(k)));

/** A build in a share link: one parameter per part (model keys hold "|", ":" and spaces). */
export function shareLink(b: Build, p: Prefs): string {
  const q = new URLSearchParams();
  for (const s of SLOTS) if (b[s]) q.set(s, b[s]!.key);
  if (p.use) q.set('use', p.use);
  if (p.budget) q.set('budget', String(p.budget));
  return `${location.origin}/builder?${q}`;
}

function readShared(): Saved | null {
  const d = decodeShare(builderParams());
  if (!d) return null;
  return {
    parts: Object.fromEntries(SLOTS.filter((s) => d.build.parts[s]).map((s) => [s, d.build.parts[s]!.key])),
    prefs: asPrefs(d.build.use, d.build.budget),
    build: d.build,
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
    writeSaved(b, prefs, shared ? sharedAtStart?.build : undefined);
    own();
  };
  const setPrefs = (p: Prefs) => {
    setPrefsState(p);
    writeSaved(build, p, shared ? sharedAtStart?.build : undefined);
    own();
  };

  // The engine's view of the build. Resolution and fan quantity come from the saved or shared build (their controls
  // are tasks 11–12); the second drive is not loaded as a model yet (task 12).
  // TODO(step 5 tasks 11–12): fanQty and res are read once at mount; follow the store when their controls exist.
  const [stored] = useState(() => sharedAtStart?.build ?? readBuild());
  const active = useMemo<ActiveBuild>(
    () => ({ parts: build, fanQty: stored.fanQty ?? 1, offers: {}, use: prefs.use, res: stored.res ?? null, budget: prefs.budget }),
    [build, prefs, stored],
  );
  const parts = useMemo(() => toParts(active), [active]);
  // Chip length estimates (rule 6) and the use (rules 27–30): the same context pick mode and the product pages send.
  const engineCtx = useMemo<PostedContext>(() => {
    const use = engineUse(active);
    return { ...(chipLengths ? { chipLengths } : {}), ...(use ? { use } : {}) };
  }, [chipLengths, active]);
  // The engine's chunk (shared with the pick worker's main-thread fallback), loaded once a part is chosen.
  // A failed load is retried on the next change of the build; meanwhile the summary says the checks are unavailable.
  const [engine, setEngine] = useState<typeof import('./pickCheck') | null>(null);
  const [engineFailed, setEngineFailed] = useState(false);
  const anyPart = parts.length > 0;
  useEffect(() => {
    if (engine || !anyPart) return;
    let live = true;
    const load = () => import('./pickCheck');
    load()
      .catch(load)
      .then(
        (m) => {
          if (!live) return;
          setEngine(m);
          setEngineFailed(false);
        },
        () => live && setEngineFailed(true),
      );
    return () => {
      live = false;
    };
  }, [engine, anyPart, parts]);
  const findings = useMemo<Finding[] | null>(
    () => (engine ? engine.evaluate(parts, { ...engine.PICK_CTX, ...engineCtx }) : anyPart ? null : []),
    [engine, parts, engineCtx, anyPart],
  );
  // The CPU's own rule 11 / 12 findings (the build without card and cooler), for which steps can be skipped.
  const optFindings = useMemo<Finding[] | null>(
    () => (engine ? engine.evaluate(withoutOptional(parts), { ...engine.PICK_CTX, ...engineCtx }) : anyPart ? null : []),
    [engine, parts, engineCtx, anyPart],
  );
  // The recommended PSU: the larger of the card maker's figure and the whole-build formula (rule 14's two figures).
  const psuWatts = useMemo(() => {
    if (!engine) return null;
    const e = engine.powerEstimate(parts);
    return Math.max(e.makerW ?? 0, e.formulaW ?? 0) || null;
  }, [engine, parts]);
  // The pick worker's checker: its own chunk, loaded after the first paint (once the index is here), so the builder's
  // first-paint JS stays within rule 11.
  const [checker, setChecker] = useState<Checker | null>(null);
  const [checkerFailed, setCheckerFailed] = useState(false);
  const indexReady = models != null;
  useEffect(() => {
    if (!indexReady) return;
    let made: Checker | null = null;
    let live = true;
    const load = () => import('./pickChecker');
    load()
      .catch(load)
      .then((m) => {
        if (!live) return;
        made = m.createChecker(m.makeWorker);
        setChecker(made);
      }, () => live && setCheckerFailed(true)); // no checker: the steps show their parts unlabelled, nothing hidden
    return () => {
      live = false;
      made?.dispose();
    };
  }, [indexReady]);

  return {
    models,
    coverage,
    error,
    loading: !models,
    /** The build as engine parts, its findings (null while the engine loads) and the recommended PSU. */
    parts,
    findings,
    /** Findings of the build without card and cooler (builderEngine.optionalSlot); null while the engine loads. */
    optFindings,
    engineFailed,
    psuWatts,
    engineCtx,
    checker,
    checkerFailed,
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

/**
 * The engine's verdict on every part a step can offer, from the pick worker (`full: 'all'`: passes kept, so a label
 * tells a stated fit from an estimate). While a new build is checked the previous verdicts stay (no flicker); null
 * until the step's file and the first check are there. A part without a verdict (the check failed) is shown unlabelled
 * and never hidden.
 */
export function useStepVerdicts(state: BuilderState, slot: Slot | null): { verdicts: Map<string, Verdict> | null; checking: boolean } {
  const ready = slot != null && state.slotReady(slot);
  const models = ready ? (state.models?.[slot] as AnyModel[] | undefined) : undefined;
  const list = useMemo<Part[] | null>(
    () => (slot && models ? candidates(slot, models as never).map((m) => partOf(slot, m as AnyModel)) : null),
    [slot, models],
  );
  const { checker, parts, engineCtx } = state;
  // parts + context by value: a re-render with the same build doesn't re-run the check.
  const runKey = JSON.stringify([parts, engineCtx]);
  const [res, setRes] = useState<{ of: Part[]; key: string; map: Map<string, Verdict> } | null>(null);
  useEffect(() => {
    if (!slot || !list || !checker) return;
    return checker.run(slot, parts, list, (map) => setRes({ of: list, key: runKey, map }), { full: 'all', ctx: engineCtx });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runKey stands for parts and engineCtx
  }, [slot, list, runKey, checker]);
  const own = res && res.of === list ? res : null;
  if (!own && list && state.checkerFailed) return { verdicts: new Map(), checking: false };
  return { verdicts: own?.map ?? null, checking: !!list && own?.key !== runKey };
}
