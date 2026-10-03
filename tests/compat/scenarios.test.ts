// The scenario files themselves: format, coverage of the plan's rules, and that every real product
// still maps to the model key v1 gives it.
import { describe, expect, it } from 'vitest';
import { loadScenarios, validate, type Level } from './scenario';
import { V1_CHECKS, modelOf } from './v1-adapter';

const all = loadScenarios();
const fails = (l: Level) => l !== 'pass';

describe('compatibility scenarios', () => {
  it('has at least 30 scenarios with unique ids', () => {
    expect(all.length).toBeGreaterThanOrEqual(30);
    expect(new Set(all.map((x) => x.scenario.id)).size).toBe(all.length);
  });

  it.each(all.map((x) => [x.file, x.scenario] as const))('%s is valid', (_file, s) => {
    expect(validate(s)).toEqual([]);
  });

  it("includes the 14 examples of the plan's Phase 0 table", () => {
    expect(all.filter((x) => x.scenario.planExample).length).toBe(14);
  });

  it('has a must-pass and a must-fail case for every rule v1 can express', () => {
    const missing: string[] = [];
    for (const rule of Object.keys(V1_CHECKS).map(Number)) {
      const levels = all.flatMap((x) => x.scenario.expected.filter((e) => e.rule === rule).map((e) => e.level));
      if (!levels.includes('pass')) missing.push(`rule ${rule}: no pass`);
      if (!levels.some(fails)) missing.push(`rule ${rule}: no fail`);
    }
    expect(missing).toEqual([]);
  });

  it('every real part maps to its recorded v1 model key', () => {
    const wrong = all.flatMap(({ scenario }) =>
      scenario.parts
        .filter((p) => !p.key.startsWith('synthetic:'))
        .filter((p) => modelOf(p).key !== p.key)
        .map((p) => `${scenario.id} ${p.key} → ${modelOf(p).key}`),
    );
    expect(wrong).toEqual([]);
  });
});
