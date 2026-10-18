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
// Steps 1 and the check are useBuildCheck.ts (shared with the product page); this file adds the page's candidates.
import { useEffect, useMemo, useState } from 'react';
import type { Part } from '../engine';
import type { BaseListing } from '../types';
import { setPart } from './buildStore';
import { slotModels, type Slot } from './builder';
import type { CategoryData } from './data';
import { toPart, usable, type Verdict } from './pick';
import { idle } from './pickBuild';
import { navigate } from './router';
import { useBuildCheck, type BuildCheck } from './useBuildCheck';

export type { Verdict };
export { PENDING_DEADLINE } from './useBuildCheck';

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

export interface PickState extends BuildCheck {
  /**
   * True while a saved build is being checked (status not 'ready' and the build has parts for this page): the
   * page shows placeholders instead of rows and counts, then the final rows once, so nothing shifts.
   */
  pending: boolean;
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
  // The candidates, built after the first paint (slotModels + toPart of a few thousand models).
  const [cands, setCands] = useState<Candidates | null>(null);
  useEffect(() => idle(() => setCands(candidatesOf(slot, data))), [slot, data]);
  const current = cands?.data === data ? cands : null;
  const list = useMemo(() => (current ? [...current.parts.values()] : null), [current]);

  const check = useBuildCheck(slot, data.builtAt, list);
  const { verdicts } = check;

  const hidden = useMemo(() => {
    const out = new Set<string>();
    if (verdicts && current) for (const [id, key] of current.keyOf) if (verdicts.get(key)?.hide) out.add(id);
    return out;
  }, [verdicts, current]);

  return {
    ...check,
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
