// The saved build checked against some candidates of one slot (v2 step 3 pick mode, shared with the step 4 product
// page): the build's parts with current stored fields are used as they are, the others are refreshed from the compat
// chunks first (A7) and saved back, keys the data no longer has are listed (A9); then the candidates go to the pick
// worker (pickChecker.ts; idle slices on the main thread when no worker can run). Moved out of usePick.ts (plus the
// options below), so the category page's pick mode and the product page run the same steps (no second engine path).
import { useEffect, useMemo, useState } from 'react';
import type { ChipLengths, Part } from '../engine';
import { onBuildChange, readBuild, setPart, type StoredBuild } from './buildStore';
import type { Slot } from './builderData';
import { loadIndex } from './builderFiles';
import { loadCompat } from './compatChunks';
import { fetchOutcomes, outcomeKey, partOf, planBuild, resolvePlan, validStored, type Outcome } from './pickBuild';
import { createChecker, makeWorker } from './pickChecker';
import type { Verdict } from './pickProtocol';

/**
 * With a saved build the rows wait for the check (`pending`), never longer than this: a compat chunk or a worker
 * that never answers. Then the rows show with nothing hidden and the bar says the check didn't finish
 * (status 'timeout', final for this build and data, so nothing is hidden later either).
 */
// Must exceed the worker's timeout (pickChecker.WORKER_TIMEOUT, 10 s) plus the main-thread fallback after it.
export const PENDING_DEADLINE = 15_000;

export interface BuildCheck {
  /** The saved build as read now (follows writes in this tab and in others). */
  stored: StoredBuild;
  /**
   * 'loading': chunks of saved parts are on their way; 'checking': the engine is running; 'ready'; 'timeout': not
   * done within PENDING_DEADLINE, given up (nothing hidden).
   */
  status: 'loading' | 'checking' | 'ready' | 'timeout';
  /** True while a saved build with parts for this slot's rules is being checked (status not 'ready', no timeout). */
  pending: boolean;
  /** The saved build has parts this slot's rules read (known at once, before any chunk or check). */
  relevant: boolean;
  /** The build parts the candidates are checked against (other slots only, those the slot's rules read). */
  build: Part[];
  missing: { slot: Slot; key: string; name: string }[];
  /** Saved parts whose chunk failed to load and that have no usable stored fields: not checked. */
  unchecked: { slot: Slot; key: string; name: string }[];
  /** Candidate key → the engine's verdict; null until the check is done. */
  verdicts: Map<string, Verdict> | null;
}

export interface CheckOptions {
  /** Keep every finding but passes in the verdicts (the product page says "Fits" only when nothing was left
   * unchecked); pick mode keeps errors and warnings (pickProtocol.shownFinding). */
  full?: boolean;
  /** No check at all (no worker) while the saved build is empty: the product page then shows no fit section. */
  skipEmpty?: boolean;
}

/**
 * `candidates`: null until they are built (the check waits); the same array (by reference) for the same candidates,
 * so a re-render doesn't re-run the check.
 */
export function useBuildCheck(
  slot: Slot,
  builtAt: string,
  candidates: Part[] | null,
  { full = false, skipEmpty = false }: CheckOptions = {},
): BuildCheck {
  const [stored, setStored] = useState(readBuild);
  useEffect(() => onBuildChange(() => setStored(readBuild())), []);

  // 1. The build. The chunks' answers are kept per part (and data date): each part is asked for once, whatever
  // the answer, so a failing chunk or a write-back that can't be saved never loops (fix round 1).
  const plan = useMemo(() => planBuild(stored, slot, builtAt), [stored, slot, builtAt]);
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const { result: engine, toFetch } = useMemo(() => resolvePlan(plan, outcomes, builtAt), [plan, outcomes, builtAt]);
  const fetchKey = JSON.stringify(toFetch);
  useEffect(() => {
    const parts = JSON.parse(fetchKey) as { slot: Slot; key: string }[];
    if (!parts.length) return;
    void fetchOutcomes(parts, builtAt, loadCompat).then((got) => {
      setOutcomes((prev) => ({ ...prev, ...got }));
      // Saved back once, so the next visit (and the builder) has them; only if that part is still the one saved.
      for (const p of parts) {
        const o = got[outcomeKey(builtAt, p.slot, p.key)];
        if (typeof o === 'object' && readBuild().parts[p.slot]?.key === p.key) setPart(p.slot, { key: o.key, fields: o.fields, builtAt });
      }
    });
  }, [fetchKey, builtAt]);

  // 2. The check; a new build, new data or new candidates cancel a run that is still going.
  // The build's parts by value (sorted by slot): the same parts again — stored vs. just fetched, a save of
  // fresh fields — neither re-run the check nor change the verdicts.
  const engineJson = engine ? JSON.stringify([...engine.parts].sort((a, b) => a.category.localeCompare(b.category))) : null;
  const engineParts = useMemo(() => (engineJson === null ? null : (JSON.parse(engineJson) as Part[])), [engineJson]);
  const empty = skipEmpty && Object.keys(stored.parts).length === 0;
  const runKey = candidates && engineJson !== null && !empty ?`${builtAt}\n${engineJson}` : null;
  const [result, setResult] = useState<{ key: string; of: Part[]; map: Map<string, Verdict> } | null>(null);
  const [checker] = useState(() => createChecker(makeWorker));
  useEffect(() => () => checker.dispose(), [checker]);
  const hasParts = plan.ready.length > 0 || Object.keys(plan.refresh).length > 0;
  // The worker's chunk downloads while the candidates are being built.
  useEffect(() => {
    if (hasParts) checker.warm();
  }, [checker, hasParts]);
  // Rule 6's chip length estimates on the card and case pages, the same as the builder's (audit L2): from the builder's
  // index file (a few KiB, memoised). null = it failed: checked without estimates.
  const lengthsWanted = (slot === 'gpu' || slot === 'case') && hasParts;
  const [chipLengths, setChipLengths] = useState<Record<string, ChipLengths> | null | undefined>(undefined);
  useEffect(() => {
    if (!lengthsWanted || chipLengths !== undefined) return;
    let live = true;
    loadIndex().then((i) => live && setChipLengths(i.chipLengths), () => live && setChipLengths(null));
    return () => {
      live = false;
    };
  }, [lengthsWanted, chipLengths]);
  const lengthsReady = !lengthsWanted || chipLengths !== undefined;
  useEffect(() => {
    if (!candidates || !engineParts || runKey === null || !lengthsReady) return;
    const ctx = chipLengths ? { chipLengths } : undefined;
    return checker.run(slot, engineParts, candidates, (map) => setResult({ key: runKey, of: candidates, map }), { full, ctx });
  }, [checker, candidates, engineParts, runKey, slot, full, lengthsReady, chipLengths]);
  // The deadline, per data date, page and saved keys (not their fields: saving fresh fields back doesn't restart it).
  const deadlineKey = `${builtAt}
${slot}
${JSON.stringify([plan.ready.map((p) => p.key), plan.refresh])}`;
  const [gaveUp, setGaveUp] = useState<string | null>(null);
  const timedOut = gaveUp === deadlineKey;
  const done = result !== null && result.key === runKey && result.of === candidates;
  const waiting = hasParts && !done && !timedOut;
  useEffect(() => {
    if (!waiting) return;
    const id = setTimeout(() => setGaveUp(deadlineKey), PENDING_DEADLINE);
    return () => clearTimeout(id);
  }, [waiting, deadlineKey]);
  const verdicts = done && !timedOut ? result.map : null;

  const names = useMemo(() => {
    const named = (list: { slot: Slot; key: string }[]) =>
      list.map(({ slot: s, key }) => {
        const p = stored.parts[s];
        const fields = (p && validStored(p)?.fields) ?? {};
        return { slot: s, key, name: partOf(s, key, fields).name };
      });
    return { missing: named(engine?.missing ?? []), unchecked: named(engine?.unchecked ?? []) };
  }, [engine, stored]);

  return {
    stored,
    status: timedOut ? 'timeout' : !engine ? 'loading' : !verdicts ? 'checking' : 'ready',
    pending: waiting,
    relevant: hasParts,
    build: engineParts ?? [],
    missing: names.missing,
    unchecked: names.unchecked,
    verdicts,
  };
}
