// Which engine errors hide a candidate in pick mode (v2 step 3, step2-plan section 4). No engine code at run time
// (types only), so the page's chunk can use it without the engine; the check itself is pickCheck.ts.
import type { Build, Finding, PartCategory, RuleId } from '../engine';

/**
 * "Only compatible" hides a candidate only for an error of these rules (step2-plan section 4): 1 CPU socket, 2 RAM
 * type, 3 RAM sticks, 5 board in case, 6 card in case, 8 air cooler height, 10 cooler sockets, 16 PSU in case,
 * and 14 (PSU wattage) only when its basis is `stated`. Everything else is shown on the row, never hides.
 */
export const HIDE_RULES: ReadonlySet<RuleId> = new Set<RuleId>([1, 2, 3, 5, 6, 8, 10, 14, 16]);

/** Rules 11 (CPU needs a cooler) and 12 (CPU needs a card): never hide while this other part is not in the build. */
export const NEVER_HIDE_WHEN_MISSING: Readonly<Record<11 | 12, PartCategory>> = { 11: 'cooler', 12: 'gpu' };

/** Does this error of the candidate hide it? Exported for the rule-set tests. */
export function hides(f: Finding, build: Build): boolean {
  if (f.status !== 'error') return false;
  const need = NEVER_HIDE_WHEN_MISSING[f.rule as 11 | 12]; // undefined for every other rule
  if (need && !build.some((p) => p.category === need)) return false;
  if (!HIDE_RULES.has(f.rule)) return false;
  return f.rule !== 14 || f.basis === 'stated';
}
