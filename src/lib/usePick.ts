// Pick mode of a category page (`?pick=1`, v2 step 3): the saved build as engine parts, the page's models as
// candidates, and "Only compatible" from the engine. Loaded only with the pick code (a dynamic import from
// CategoryView), so a normal category page downloads none of it.
//
// Order of work (step2-plan sections 2 and 4, carried requirements A7, A9 and 3):
//  1. The build: parts with current, valid stored fields are used as they are; the others are fetched from
//     the compat chunks of their slot (only the slots the page's rules read), saved back with the page's data
//     date, or listed as "no longer available" when the data no longer has them.
//  2. The candidates (the builder's keys: a card per listing, a CPU per chip + cooler-in-box), built after the
//     first paint, and the engine check in the pick worker (pickChecker.ts; idle slices on the main thread when
//     no worker can run). Until both are done nothing is hidden, and with a saved build the page shows its rows
//     only then (`pending`), so nothing moves when the check finishes (task 6b).
import { useEffect, useMemo, useState } from 'react';
import type { Part } from '../engine';
import type { BaseListing } from '../types';
import { onBuildChange, readBuild, setPart } from './buildStore';
import { slotModels, type Slot } from './builder';
import { loadCompat } from './compatChunks';
import type { CategoryData } from './data';
import { toPart, usable, type Verdict } from './pick';
import { fetchOutcomes, idle, outcomeKey, partOf, planBuild, resolvePlan, validStored, type Outcome } from './pickBuild';
import { createChecker, type WorkerLike } from './pickChecker';
import { navigate } from './router';

export type { Verdict };

/**
 * With a saved build the rows wait for the check (`pending`), never longer than this: a compat chunk or a worker
 * that never answers. Then the rows show with nothing hidden and the bar says the check didn't finish
 * (status 'timeout', final for this build and data, so nothing is hidden later either).
 */
// Must exceed the worker's timeout (pickChecker.WORKER_TIMEOUT, 10 s) plus the main-thread fallback after it.
export const PENDING_DEADLINE = 15_000;

/** The pick worker (a lazy chunk of its own); null where the browser has no Worker (main-thread fallback). */
const makeWorker =
  typeof Worker === 'undefined'
    ? null
    : () => new Worker(new URL('./pick.worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike;

interface Candidates {
  data: CategoryData;
  /** Listing id → its candidate key. */
  keyOf: Map<string, string>;
  /** Candidate key → its engine part. Every model is checked (an AM4 board is hidden next to an AM5 CPU even
   * if the builder doesn't offer it); only the offered ones get a button. */
  parts: Map<string, Part>;
  /** The keys the builder offers (`usable`: desktop parts). */
  offered: Set<string>;
}

function candidatesOf(slot: Slot, data: CategoryData): Candidates {
  const keyOf = new Map<string, string>();
  const parts = new Map<string, Part>();
  const offered = new Set<string>();
  for (const m of slotModels(slot, data.latest.listings as never[])) {
    for (const l of m.listings as BaseListing[]) keyOf.set(l.id, m.key);
    parts.set(m.key, toPart(slot, m));
    if (usable(slot, m)) offered.add(m.key);
  }
  return { data, keyOf, parts, offered };
}

export interface PickState {
  /**
   * 'loading': chunks of saved parts are on their way; 'checking': the engine is running; 'ready'; 'timeout': not
   * done within PENDING_DEADLINE, given up (rows shown, nothing hidden).
   */
  status: 'loading' | 'checking' | 'ready' | 'timeout';
  /**
   * True while a saved build is being checked (status not 'ready' and the build has parts for this page): the
   * page shows placeholders instead of rows and counts, then the final rows once, so nothing shifts.
   */
  pending: boolean;
  /** The build parts the page checks against (other slots only). */
  build: Part[];
  missing: { slot: Slot; key: string; name: string }[];
  /** Saved parts whose chunk failed to load and that have no usable stored fields: not checked. */
  unchecked: { slot: Slot; key: string; name: string }[];
  /** Candidate key → the engine's verdict; null until the check is done. */
  verdicts: Map<string, Verdict> | null;
  /** Listing ids hidden by "Only compatible" (empty until the check is done). */
  hidden: Set<string>;
  /** False until the candidates are built (keyOf / part answer undefined meanwhile: not "not offered"). */
  candidatesReady: boolean;
  /** The candidate key of a listing (a card's own id, a CPU's chip + cooler-in-box, else the model). */
  keyOf: (l: BaseListing) => string | undefined;
  /** The candidate's part when the builder offers it (else no "Add" button). */
  part: (key: string) => Part | undefined;
  /** Saves the candidate into the build (fields + the page's data date) and opens the builder. */
  add: (key: string) => void;
}

export function usePick(slot: Slot, data: CategoryData): PickState {
  const [stored, setStored] = useState(readBuild);
  useEffect(() => onBuildChange(() => setStored(readBuild())), []);

  // 1. The build. The chunks' answers are kept per part (and data date): each part is asked for once, whatever
  // the answer, so a failing chunk or a write-back that can't be saved never loops (fix round 1).
  const plan = useMemo(() => planBuild(stored, slot, data.builtAt), [stored, slot, data.builtAt]);
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const { result: engine, toFetch } = useMemo(() => resolvePlan(plan, outcomes, data.builtAt), [plan, outcomes, data.builtAt]);
  const fetchKey = JSON.stringify(toFetch);
  useEffect(() => {
    const parts = JSON.parse(fetchKey) as { slot: Slot; key: string }[];
    if (!parts.length) return;
    const builtAt = data.builtAt;
    void fetchOutcomes(parts, builtAt, loadCompat).then((got) => {
      setOutcomes((prev) => ({ ...prev, ...got }));
      // Saved back once, so the next visit (and the builder) has them; only if that part is still the one saved.
      for (const p of parts) {
        const o = got[outcomeKey(builtAt, p.slot, p.key)];
        if (typeof o === 'object' && readBuild().parts[p.slot]?.key === p.key) setPart(p.slot, { key: o.key, fields: o.fields, builtAt });
      }
    });
  }, [fetchKey, data.builtAt]);

  // 2. The candidates, built after the first paint (slotModels + toPart of a few thousand models).
  const [cands, setCands] = useState<Candidates | null>(null);
  useEffect(() => idle(() => setCands(candidatesOf(slot, data))), [slot, data]);
  const current = cands?.data === data ? cands : null;

  // 3. The check, in slices; a new build or new data cancels a run that is still going.
  // The build's parts by value (sorted by slot): the same parts again — stored vs. just fetched, a save of
  // fresh fields — neither re-run the check nor change what is hidden (no re-filtering of the page).
  const engineJson = engine ? JSON.stringify([...engine.parts].sort((a, b) => a.category.localeCompare(b.category))) : null;
  const engineParts = useMemo(() => (engineJson === null ? null : (JSON.parse(engineJson) as Part[])), [engineJson]);
  const runKey = current && engineJson !== null ? `${data.builtAt}\n${engineJson}` : null;
  const [result, setResult] = useState<{ key: string; map: Map<string, Verdict> } | null>(null);
  const [checker] = useState(() => createChecker(makeWorker));
  useEffect(() => () => checker.dispose(), [checker]);
  const hasParts = plan.ready.length > 0 || Object.keys(plan.refresh).length > 0;
  // The worker's chunk downloads while the candidates are being built.
  useEffect(() => {
    if (hasParts) checker.warm();
  }, [checker, hasParts]);
  useEffect(() => {
    if (!current || !engineParts || runKey === null) return;
    return checker.run(slot, engineParts, [...current.parts.values()], (map) => setResult({ key: runKey, map }));
  }, [checker, current, engineParts, runKey, slot]);
  // The deadline, per data date, page and saved keys (not their fields: saving fresh fields back doesn't restart it).
  const deadlineKey = `${data.builtAt}
${slot}
${JSON.stringify([plan.ready.map((p) => p.key), plan.refresh])}`;
  const [gaveUp, setGaveUp] = useState<string | null>(null);
  const timedOut = gaveUp === deadlineKey;
  const done = result !== null && result.key === runKey;
  const waitingRows = hasParts && !done && !timedOut;
  useEffect(() => {
    if (!waitingRows) return;
    const id = setTimeout(() => setGaveUp(deadlineKey), PENDING_DEADLINE);
    return () => clearTimeout(id);
  }, [waitingRows, deadlineKey]);
  const verdicts = done && !timedOut ? result.map : null;

  const hidden = useMemo(() => {
    const out = new Set<string>();
    if (verdicts && current) for (const [id, key] of current.keyOf) if (verdicts.get(key)?.hide) out.add(id);
    return out;
  }, [verdicts, current]);

  const missing = useMemo(
    () => {
      const named = (list: { slot: Slot; key: string }[]) =>
        list.map(({ slot: s, key }) => {
          const p = stored.parts[s];
          const fields = (p && validStored(p)?.fields) ?? {};
          return { slot: s, key, name: partOf(s, key, fields).name };
        });
      return { missing: named(engine?.missing ?? []), unchecked: named(engine?.unchecked ?? []) };
    },
    [engine, stored],
  );

  const status = timedOut ? 'timeout' : !engine ? 'loading' : !verdicts ? 'checking' : 'ready';
  return {
    status,
    pending: waitingRows,
    build: engineParts ?? [],
    missing: missing.missing,
    unchecked: missing.unchecked,
    verdicts,
    hidden,
    candidatesReady: current !== null,
    keyOf: (l) => current?.keyOf.get(l.id),
    part: (key) => (current?.offered.has(key) ? current.parts.get(key) : undefined),
    add: (key) => {
      const p = current?.offered.has(key) ? current.parts.get(key) : undefined;
      if (!p) return;
      setPart(slot, { key, fields: p.fields, builtAt: data.builtAt });
      navigate('/builder');
    },
  };
}
