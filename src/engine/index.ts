// The compatibility engine: every rule of the plan's table (1–26) over a build, a summary, and the
// candidate check behind "Μόνο συμβατά". Rules 27–30 come in Phase 4 (owner, 2026-10-10).
import { rule11, rule21, rule22, rule23 } from './rules/cooling';
import { rule10, rule16, rule19, rule26, rule5, rule6, rule7, rule8, rule9 } from './rules/fit';
import { rule1, rule12, rule13, rule2, rule24, rule25, rule3, rule4 } from './rules/platform';
import { rule14, rule15 } from './rules/power';
import { rule17, rule18, rule20 } from './rules/storage';
import type { Build, Context, Finding, Part, RuleId, Status } from './types';
import { shownLevel } from './util';

export type * from './types';
export { shownLevel } from './util';
export { v1RecommendedPsu } from './rules/power';

type Rule = (b: Build, ctx: Context) => Finding[];

/** Rule number → its check, in the plan's order. */
export const RULES: Record<RuleId, Rule> = {
  1: rule1, 2: rule2, 3: rule3, 4: rule4, 5: rule5, 6: rule6, 7: rule7, 8: rule8, 9: rule9, 10: rule10,
  11: rule11, 12: rule12, 13: rule13, 14: rule14, 15: rule15, 16: rule16, 17: rule17, 18: rule18, 19: rule19,
  20: rule20, 21: rule21, 22: rule22, 23: rule23, 24: rule24, 25: rule25, 26: rule26,
};

/** Every finding for a build, rule by rule. A rule whose parts aren't in the build says nothing. */
export function evaluate(build: Build, ctx: Context = {}): Finding[] {
  return (Object.keys(RULES) as unknown as RuleId[]).flatMap((id) => RULES[Number(id) as RuleId](build, ctx));
}

/** Counts per shown level (an unknown counts as a note; `unknown` says how many of those notes it is). */
export function summary(findings: Finding[]): Record<Exclude<Status, 'unknown'>, number> & { unknown: number } {
  const out = { pass: 0, error: 0, warning: 0, note: 0, unknown: 0 };
  for (const f of findings) {
    out[shownLevel(f.status)]++;
    if (f.status === 'unknown') out.unknown++;
  }
  return out;
}

/**
 * "Μόνο συμβατά": the errors a candidate part would cause in this build — errors that involve the candidate
 * and were not already there without it. A part is hidden only for its own clashes (v1 audit C-01: a PSU
 * too small for the card hid every CPU). `build` is the build without the part the candidate would replace.
 */
export function candidateErrors(build: Build, candidate: Part, ctx: Context = {}): Finding[] {
  const before = evaluate(build, ctx).filter((f) => f.status === 'error');
  const after = evaluate([...build, candidate], ctx).filter((f) => f.status === 'error' && f.parts.includes(candidate.key));
  return after.filter((f) => {
    const others = f.parts.filter((k) => k !== candidate.key);
    return !before.some((e) => e.rule === f.rule && others.every((k) => e.parts.includes(k)));
  });
}
