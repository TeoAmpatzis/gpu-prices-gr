// The candidate check of pick mode (v2 step 3): one slot's whole page checked against the build, and the pick
// worker's answer to a request. The only pick module with engine code: the worker (pick.worker.ts) bundles it,
// and the page loads it only for the main-thread fallback (pickChecker.ts, a dynamic import), so the page's own
// chunk carries no engine.
import { biosSupport, candidateErrors, evaluate, type Context, type Finding, type Part, type PartCategory } from '../engine';
import { hides } from './pickHide';
import { toResults, type CheckAnswer, type CheckRequest, type Verdict } from './pickProtocol';

export { hides, HIDE_RULES, NEVER_HIDE_WHEN_MISSING } from './pickHide';
export type { Verdict };

/** Pick mode's engine context: the BIOS table only (no chip length estimates: they need every card's data). */
export const PICK_CTX: Context = { bios: biosSupport };

/** The own-clash filter of `candidateErrors`, from two evaluations (so `checkAll` evaluates the base build once). */
function ownErrors(beforeErrors: Finding[], after: Finding[], key: string): Finding[] {
  return after.filter((f) => f.status === 'error' && f.parts.includes(key)).filter((f) => {
    const others = f.parts.filter((k) => k !== key);
    return !beforeErrors.some((e) => e.rule === f.rule && others.every((k) => e.parts.includes(k)));
  });
}

/** The errors that hide `candidate` in this build (`build` = without the part it would replace). */
export function hidingErrors(build: Part[], candidate: Part, ctx: Context): Finding[] {
  return candidateErrors(build, candidate, ctx).filter((f) => hides(f, build));
}

/**
 * Check a whole page's candidates for one slot. Unlike `hidingErrors` (whose `build` the caller has already
 * stripped), `checkAll` drops the slot itself: it replaces the candidate's WHOLE category in `build` (one part per
 * category, like today's builder; multi-part slots are Phase 4). Then each candidate is added in turn.
 * `findings` = what the engine says about the candidate for its row: its own errors (clashes the build did not
 * already have, same filter as `candidateErrors`) plus every warning, note and unknown that names it. A clash that
 * existed without it (v1 C-01: a PSU too small for the card) is not shown as the candidate's own.
 * `hide` = at least one of its own errors is a hiding one (`hidingErrors`' rule).
 */
export function checkAll(build: Part[], slot: PartCategory, candidates: Part[], ctx: Context): Map<string, Verdict> {
  const base = build.filter((p) => p.category !== slot);
  const before = evaluate(base, ctx).filter((f) => f.status === 'error');
  const out = new Map<string, Verdict>();
  for (const c of candidates) {
    const after = evaluate([...base, c], ctx);
    const ownErr = new Set(ownErrors(before, after, c.key));
    const findings = after.filter((f) => f.parts.includes(c.key) && (f.status !== 'error' || ownErr.has(f)));
    out.set(c.key, { hide: [...ownErr].some((f) => hides(f, base)), findings });
  }
  return out;
}

/** The worker's whole job: one request → one answer (an engine error is an answer too, never a dead worker). */
export function answer(req: CheckRequest): CheckAnswer {
  try {
    return { id: req.id, ok: true, results: toResults(checkAll(req.build, req.slot, req.candidates, PICK_CTX)) };
  } catch (e) {
    return { id: req.id, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
