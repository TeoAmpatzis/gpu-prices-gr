// Pick mode of a category page (`?pick=1`, v2 step 3): the saved build as engine parts, the page's models as
// candidates, and "Only compatible" from the engine. Loaded only with the pick code (a dynamic import from
// CategoryView), so a normal category page downloads none of it.
//
// Order of work (step2-plan sections 2 and 4, carried requirements A7, A9 and 3):
//  1. The build: parts with current, valid stored fields are used as they are; the others are fetched from
//     the compat chunks of their slot (only the slots the page's rules read), saved back with the page's data
//     date, or listed as "no longer available" when the data no longer has them.
//  2. The candidates (the builder's keys: a card per listing, a CPU per chip + cooler-in-box) and the engine
//     check, in slices after the first paint. Until both are done nothing is hidden.
import { useEffect, useMemo, useState } from 'react';
import { biosSupport, type Context, type Finding, type Part } from '../engine';
import type { BaseListing } from '../types';
import { onBuildChange, readBuild, setPart } from './buildStore';
import { slotModels, type Slot } from './builder';
import { loadCompat } from './compatChunks';
import type { CategoryData } from './data';
import { checkAll, toPart, usable } from './pick';
import { applyRefresh, idle, partOf, planBuild, runSliced, SLICE, validStored, type Refreshed } from './pickBuild';
import { navigate } from './router';

/** Pick mode's engine context: the BIOS table only (no chip length estimates: they need every card's data). */
const CTX: Context = { bios: biosSupport };

export type Verdict = { hide: boolean; findings: Finding[] };

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
  /** 'loading': chunks of saved parts are on their way; 'checking': the engine is running; 'ready'. */
  status: 'loading' | 'checking' | 'ready';
  /** The build parts the page checks against (other slots only). */
  build: Part[];
  missing: { slot: Slot; key: string; name: string }[];
  /** Candidate key → the engine's verdict; null until the check is done. */
  verdicts: Map<string, Verdict> | null;
  /** Listing ids hidden by "Only compatible" (empty until the check is done). */
  hidden: Set<string>;
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

  // 1. The build.
  const plan = useMemo(() => planBuild(stored, slot, data.builtAt), [stored, slot, data.builtAt]);
  const planKey = useMemo(() => JSON.stringify(plan), [plan]);
  const [fetched, setFetched] = useState<{ key: string; builtAt: string; r: Refreshed } | null>(null);
  // Keys the chunks already said are gone (same data): not fetched again, still listed as missing.
  const known = useMemo(() => (fetched?.builtAt === data.builtAt ? fetched.r.missing : []), [fetched, data.builtAt]);
  const pending = useMemo(
    () => (Object.keys(plan.refresh) as Slot[]).filter((s) => !known.some((m) => m.slot === s && m.key === plan.refresh[s])),
    [plan, known],
  );
  useEffect(() => {
    if (!pending.length) return;
    let live = true;
    // A slot whose chunk fails to load is `undefined`: its old fields (if valid) are used, nothing is saved.
    void Promise.all(pending.map((s) => loadCompat(s, [plan.refresh[s]!], data.builtAt).catch(() => undefined))).then((rows) => {
      if (!live) return;
      const results: Parameters<typeof applyRefresh>[1] = {};
      for (const s of Object.keys(plan.refresh) as Slot[]) results[s] = {}; // known missing
      pending.forEach((s, i) => (results[s] = rows[i]));
      const r = applyRefresh(plan, results, data.builtAt);
      setFetched({ key: planKey, builtAt: data.builtAt, r });
      // Saved once, so the next visit (and the builder) has them: this changes `stored`, and the new plan
      // needs no chunk for these parts.
      for (const w of r.writes) setPart(w.slot, w.part);
    });
    return () => {
      live = false;
    };
  }, [pending, plan, planKey, data.builtAt]);
  const engine = useMemo<Refreshed | null>(() => {
    if (!pending.length) {
      const missing = (Object.keys(plan.refresh) as Slot[]).map((s) => ({ slot: s, key: plan.refresh[s]! }));
      return { parts: plan.ready, missing, writes: [] };
    }
    return fetched?.key === planKey ? fetched.r : null;
  }, [pending, plan, fetched, planKey]);

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
  useEffect(() => {
    if (!current || !engineParts || runKey === null) return;
    const map = new Map<string, Verdict>();
    return runSliced(
      [...current.parts.values()],
      SLICE,
      (slice) => {
        for (const [k, v] of checkAll(engineParts, slot, slice, CTX)) map.set(k, v);
      },
      () => setResult({ key: runKey, map }),
    );
  }, [current, engineParts, runKey, slot]);
  const verdicts = result && result.key === runKey ? result.map : null;

  const hidden = useMemo(() => {
    const out = new Set<string>();
    if (verdicts && current) for (const [id, key] of current.keyOf) if (verdicts.get(key)?.hide) out.add(id);
    return out;
  }, [verdicts, current]);

  const missing = useMemo(
    () =>
      (engine?.missing ?? []).map(({ slot: s, key }) => {
        const p = stored.parts[s];
        const fields = (p && validStored(p)?.fields) ?? {};
        return { slot: s, key, name: partOf(s, key, fields).name };
      }),
    [engine, stored],
  );

  return {
    status: !engine ? 'loading' : !verdicts ? 'checking' : 'ready',
    build: engineParts ?? [],
    missing,
    verdicts,
    hidden,
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
