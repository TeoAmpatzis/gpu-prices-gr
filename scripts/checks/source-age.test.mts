// Per-source data age (backlog #8): each category's list.json names when every source last succeeded.
// A source older than 12 h warns, older than 24 h (or never updated) fails site-check.mjs.
// Run from the repo root: npx tsx scripts/checks/source-age.test.mts
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const { sourceAges, WARN_H, FAIL_H } = await import(pathToFileURL(join(process.cwd(), 'scripts/checks/source-age.mjs')).href);
const NOW = Date.parse('2026-10-04T16:50:00Z');
const at = (hoursAgo: number) => new Date(NOW - hoursAgo * 36e5).toISOString();
let bad = 0;
const expect = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : `\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`}`);
};
const level = (src: object) => sourceAges({ storage: { sources: src } }, NOW).map((r: { source: string; level: string }) => `${r.source}:${r.level}`);

expect('limits are 12 h (warn) and 24 h (fail)', [WARN_H, FAIL_H], [12, 24]);
expect('a source updated 2 h ago is ok', level({ bestprice: { ok: true, updatedAt: at(2) } }), ['bestprice:ok']);
expect('exactly 12 h is still ok', level({ snif: { ok: true, updatedAt: at(12) } }), ['snif:ok']);
expect('13 h warns', level({ snif: { ok: true, updatedAt: at(13) } }), ['snif:warn']);
expect('exactly 24 h warns', level({ eshop: { ok: true, updatedAt: at(24) } }), ['eshop:warn']);
// The case that motivated #8: at 2026-10-04 16:50 UTC Skroutz storage was 35.1 h old while the overall check was green.
expect('Skroutz storage at 35.1 h fails (2026-10-04)', level({ skroutz: { ok: false, updatedAt: '2026-10-03T05:44:00Z' } }), ['skroutz:fail']);
expect('a source that never updated fails', level({ shopflix: { ok: false, updatedAt: null } }), ['shopflix:fail']);
expect('a failed run with recent data is judged by its age', level({ skroutz: { ok: false, updatedAt: at(5) } }), ['skroutz:ok']);
expect('each source is judged on its own', level({ skroutz: { ok: true, updatedAt: at(30) }, bestprice: { ok: true, updatedAt: at(1) } }),
  ['skroutz:fail', 'bestprice:ok']);
const rows = sourceAges({ gpu: { sources: { skroutz: { ok: true, updatedAt: at(1.5) } } }, case: { sources: { snif: { ok: true, updatedAt: at(14) } } } }, NOW);
expect('rows name category, source and age in hours (1 decimal)', rows.map((r: { cat: string; source: string; ageH: number }) => [r.cat, r.source, r.ageH]),
  [['gpu', 'skroutz', 1.5], ['case', 'snif', 14]]);
expect('a category without a list (null) is skipped, not a crash', sourceAges({ gpu: null }, NOW), []);

console.log(`\n${bad ? `${bad} FAILED` : 'all passed'}`);
process.exit(bad ? 1 : 0);
