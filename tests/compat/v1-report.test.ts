// Characterization of v1: every scenario through the v1 builder logic. The results are recorded in
// docs/audit/compat-results.{json,md}; a change in v1's answers fails this test until the record is
// updated on purpose (`npx vitest run -u`). The v1 adapter and this test can go once v2's engine
// passes the scenarios (Phase 2).
import { expect, it } from 'vitest';
import { loadScenarios } from './scenario';
import { runScenario } from './v1-adapter';
import { report } from './v1-report';

const scenarios = loadScenarios().map((x) => x.scenario);
const results = scenarios.map(runScenario);

it('v1 answers every scenario', () => {
  expect(results).toHaveLength(scenarios.length);
  for (const r of results) expect(r.rules.length).toBeGreaterThan(0);
});

it('v1 results match the recorded audit (docs/audit/compat-results.*)', async () => {
  await expect(`${JSON.stringify(results, null, 2)}\n`).toMatchFileSnapshot('../../docs/audit/compat-results.json');
  await expect(report(scenarios, results)).toMatchFileSnapshot('../../docs/audit/compat-results.md');
});
