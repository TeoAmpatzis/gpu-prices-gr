// The pick worker's messages (v2 step 3, task 6b): the page sends the candidates' engine parts and the build's
// parts, the worker answers with each candidate's verdict. Pure functions, shared by the worker
// (pick.worker.ts), the main-thread fallback (pickChecker.ts) and the tests. Imports only the check itself
// (pickCheck.ts → engine), so the worker's chunk holds the engine and nothing of the page.
import type { Finding, Part, PartCategory } from '../engine';
import { checkAll, PICK_CTX, type Verdict } from './pickCheck';

export interface CheckRequest {
  /** Matches the answer to its request (a newer request replaces an older one). */
  id: number;
  slot: PartCategory;
  /** The saved build's parts (`checkAll` drops the page's own slot). */
  build: Part[];
  /** Every model of the page as an engine part (`pick.toPart`). */
  candidates: Part[];
}

/** One candidate: key, hidden by "Only compatible", the findings its row can show. */
export type CheckResult = [key: string, hide: boolean, findings: Finding[]];

export type CheckAnswer = { id: number; ok: true; results: CheckResult[] } | { id: number; ok: false; error: string };

/**
 * The findings a row can show (PickView: a hidden row's hiding errors; another row's other errors and warnings).
 * Passes, notes and unknowns are left out of the verdict, so the answer stays small (structured clone cost on the
 * main thread) and the worker and the fallback give the page the same verdicts.
 */
export const shownFinding = (f: Finding): boolean => f.status === 'error' || f.status === 'warning';

/** `checkAll`'s result as the answer's rows (findings trimmed to `shownFinding`). */
export function toResults(map: Map<string, Verdict>): CheckResult[] {
  return [...map].map(([key, v]) => [key, v.hide, v.findings.filter(shownFinding)]);
}

/** The answer's rows as the page's verdicts. */
export function toVerdicts(results: CheckResult[], into = new Map<string, Verdict>()): Map<string, Verdict> {
  for (const [key, hide, findings] of results) into.set(key, { hide, findings });
  return into;
}

/** The worker's whole job: one request → one answer (an engine error is an answer too, never a dead worker). */
export function answer(req: CheckRequest): CheckAnswer {
  try {
    return { id: req.id, ok: true, results: toResults(checkAll(req.build, req.slot, req.candidates, PICK_CTX)) };
  } catch (e) {
    return { id: req.id, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
