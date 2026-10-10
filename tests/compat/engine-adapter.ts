// Runs a compatibility scenario through the v2 engine (src/engine) and reads off one level per rule.
// Comparison: levels must be equal. An "unknown" never matches a scenario's "note" here; the expectations
// where the scenario's note means "data missing" are listed in engine-scenarios.test.ts (EXPECTED_UNKNOWN).
import { evaluate, type Build, type Context, type Finding, type Part, type RuleId } from '../../src/engine';
import type { Level, Scenario } from './scenario';

export function toBuild(s: Scenario): Build {
  return s.parts.map((p, i): Part => ({ category: p.category, key: `${p.category}#${i}:${p.key}`, name: p.name, quantity: p.quantity, fields: p.fields }));
}

export const toContext = (s: Scenario): Context => ({ chipLengths: s.context?.chipLengths });

const SEVERITY = { error: 4, warning: 3, note: 2, unknown: 1, pass: 0 } as const;

/** The most severe finding of a rule (an unknown ranks below a real note), or null if the rule said nothing. */
export function ruleResult(findings: Finding[], rule: RuleId): Finding | null {
  return findings.filter((f) => f.rule === rule).sort((a, b) => SEVERITY[b.status] - SEVERITY[a.status])[0] ?? null;
}

export interface Comparison {
  rule: RuleId;
  expected: Level;
  /** The engine's status for the rule, "none" if it said nothing. */
  engine: Finding['status'] | 'none';
  basis: Finding['basis'] | null;
  /** Same level (an unknown is not a note). */
  matches: boolean;
  message: string | null;
}

export function compare(s: Scenario): Comparison[] {
  const findings = evaluate(toBuild(s), toContext(s));
  return s.expected.map(({ rule, level }) => {
    const r = ruleResult(findings, rule as RuleId);
    const engine = r?.status ?? 'none';
    return {
      rule: rule as RuleId,
      expected: level,
      engine,
      basis: r?.basis ?? null,
      matches: engine === level,
      message: r ? r.message.en : null,
    };
  });
}
