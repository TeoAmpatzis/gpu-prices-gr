// Phase 4 gate (step 5 task 16): the 7 builds of scripts/phase4/builds.mjs driven through the builder like a buyer,
// each once in Guided at 1366 px (Greek and English in turn) and builds a and d in the Part list at 360 px. Each run
// checks the findings against the build's expectations, total = sum of the lines, Copy list (every line with its variant
// and URL), reload keeps the build, the share link opens the same build in a fresh context, no page errors.
// The full matrix (56 runs with a screenshot per step) is `node scripts/phase4/drive.mjs all` against a preview.
import { expect, test } from '@playwright/test';
// @ts-expect-error -- plain .mjs shared with the CLI (no type declarations)
import { driveRun } from '../../scripts/phase4/drive.mjs';

const RUNS = [
  'a-guided-1366-el',
  'b-guided-1366-en',
  'c-guided-1366-el',
  'd-guided-1366-en',
  'e-guided-1366-el',
  'f-guided-1366-en',
  'g-guided-1366-el',
  'a-quick-360-en',
  'd-quick-360-el',
];

for (const id of RUNS) {
  test(`gate build ${id}`, async ({ browser, baseURL }) => {
    test.setTimeout(300_000);
    const log = (await driveRun(browser, id, { base: baseURL, shots: false })) as { problems: string[] };
    expect(log.problems).toEqual([]);
  });
}
