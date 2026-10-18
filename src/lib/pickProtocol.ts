// The pick worker's messages (v2 step 3, task 6b): the page sends the candidates' engine parts and the build's
// parts, the worker answers with each candidate's verdict. Pure functions and types only (no engine code), shared
// by the worker (pick.worker.ts → pickCheck.answer), the checker (pickChecker.ts) and the tests.
import type { Finding, Part, PartCategory } from '../engine';

/** The engine's verdict on one candidate: hidden by "Only compatible" or not, and its findings for the row. */
export type Verdict = { hide: boolean; findings: Finding[] };

export interface CheckRequest {
  /** Matches the answer to its request (a newer request replaces an older one). */
  id: number;
  slot: PartCategory;
  /** The saved build's parts (`checkAll` drops the page's own slot). */
  build: Part[];
  /** Every model of the page as an engine part (`pick.toPart`). */
  candidates: Part[];
  /** Keep every finding but passes (notes and unknowns too): the product page's fit section (`keptFinding`). */
  full?: boolean;
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

/**
 * The product page's fit section (step 4) also needs the notes and unknowns: it says "Fits" only when nothing was
 * left unchecked (redesign principle 1: never "compatible" when we don't know). Passes are still left out.
 */
export const keptFinding = (f: Finding): boolean => f.status !== 'pass';

/** `checkAll`'s result as the answer's rows (findings trimmed to `shownFinding`, or to `keptFinding` when `full`). */
export function toResults(map: Map<string, Verdict>, full = false): CheckResult[] {
  const keep = full ? keptFinding : shownFinding;
  return [...map].map(([key, v]) => [key, v.hide, v.findings.filter(keep)]);
}

/** The answer's rows as the page's verdicts. */
export function toVerdicts(results: CheckResult[], into = new Map<string, Verdict>()): Map<string, Verdict> {
  for (const [key, hide, findings] of results) into.set(key, { hide, findings });
  return into;
}
