// The candidate check of pick mode (v2 step 3): which engine errors hide a candidate, and one slot's whole page
// checked against the build. Imports the engine only, so the pick worker (pick.worker.ts) bundles nothing else;
// pick.ts re-exports all of it for the page code and the tests.
import { biosSupport, candidateErrors, evaluate, type Build, type Context, type Finding, type Part, type PartCategory, type RuleId } from '../engine';

/** Pick mode's engine context: the BIOS table only (no chip length estimates: they need every card's data). */
export const PICK_CTX: Context = { bios: biosSupport };

/**
 * "Only compatible" hides a candidate only for an error of these rules (step2-plan section 4): 1 CPU socket, 2 RAM
 * type, 3 RAM sticks, 5 board in case, 6 card in case, 8 air cooler height, 10 cooler sockets, 16 PSU in case,
 * and 14 (PSU wattage) only when its basis is `stated`. Everything else is shown on the row, never hides.
 */
export const HIDE_RULES: ReadonlySet<RuleId> = new Set<RuleId>([1, 2, 3, 5, 6, 8, 10, 14, 16]);

/** Rules 11 (CPU needs a cooler) and 12 (CPU needs a card): never hide while this other part is not in the build. */
export const NEVER_HIDE_WHEN_MISSING: Readonly<Record<11 | 12, PartCategory>> = { 11: 'cooler', 12: 'gpu' };

/** The own-clash filter of `candidateErrors`, from two evaluations (so `checkAll` evaluates the base build once). */
function ownErrors(beforeErrors: Finding[], after: Finding[], key: string): Finding[] {
  return after.filter((f) => f.status === 'error' && f.parts.includes(key)).filter((f) => {
    const others = f.parts.filter((k) => k !== key);
    return !beforeErrors.some((e) => e.rule === f.rule && others.every((k) => e.parts.includes(k)));
  });
}

/** Does this error of the candidate hide it? Exported for the rule-set tests. */
export function hides(f: Finding, build: Build): boolean {
  if (f.status !== 'error') return false;
  const need = NEVER_HIDE_WHEN_MISSING[f.rule as 11 | 12]; // undefined for every other rule
  if (need && !build.some((p) => p.category === need)) return false;
  if (!HIDE_RULES.has(f.rule)) return false;
  return f.rule !== 14 || f.basis === 'stated';
}

/** The errors that hide `candidate` in this build (`build` = without the part it would replace). */
export function hidingErrors(build: Part[], candidate: Part, ctx: Context): Finding[] {
  return candidateErrors(build, candidate, ctx).filter((f) => hides(f, build));
}

/** The engine's verdict on one candidate: hidden by "Only compatible" or not, and its findings for the row. */
export type Verdict = { hide: boolean; findings: Finding[] };

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
