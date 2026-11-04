import assert from 'node:assert/strict';
import test from 'node:test';
import { dataChecks } from './site-check.mjs';

const now = Date.parse('2026-11-04T12:00:00Z');
const cats = ['gpu', 'cpu', 'mobo', 'ram', 'storage', 'psu', 'case', 'fan', 'cooler'];
const at = (hours) => new Date(now - hours * 36e5).toISOString();
function healthy() {
  return {
    manifest: { cats: Object.fromEntries(cats.map((cat) => [cat, { models: 1, listings: 1, updatedAt: at(1) }])) },
    lists: Object.fromEntries(cats.map((cat) => [cat, {
      rows: [[1]], sources: { skroutz: { updatedAt: at(1) }, bestprice: { updatedAt: at(2) } },
    }])),
  };
}
const failures = ({ manifest, lists }) => dataChecks(manifest, lists, now).filter((check) => !check.ok);

test('fresh data in every category passes', () => {
  assert.deepEqual(failures(healthy()), []);
});

for (const damage of ['missing manifest category', 'zero models', 'zero listings', 'missing list', 'empty list']) {
  test(`rejects ${damage}`, () => {
    const data = healthy();
    if (damage === 'missing manifest category') delete data.manifest.cats.cpu;
    if (damage === 'zero models') data.manifest.cats.cpu.models = 0;
    if (damage === 'zero listings') data.manifest.cats.cpu.listings = 0;
    if (damage === 'missing list') delete data.lists.cpu;
    if (damage === 'empty list') data.lists.cpu.rows = [];
    assert.ok(failures(data).some((check) => check.what.includes('cpu')));
  });
}

test('rejects newest data older than 12 hours', () => {
  const data = healthy();
  for (const cat of cats) data.manifest.cats[cat].updatedAt = at(12.01);
  assert.ok(failures(data).some((check) => check.what.includes('newest')));
});

for (const damage of ['stale source', 'missing timestamp', 'invalid timestamp', 'missing sources']) {
  test(`rejects ${damage} despite fresh category data`, () => {
    const data = healthy();
    if (damage === 'stale source') data.lists.cpu.sources.bestprice.updatedAt = at(24.1);
    if (damage === 'missing timestamp') delete data.lists.cpu.sources.bestprice.updatedAt;
    if (damage === 'invalid timestamp') data.lists.cpu.sources.bestprice.updatedAt = 'bad';
    if (damage === 'missing sources') data.lists.cpu.sources = {};
    assert.ok(failures(data).some((check) => /source/.test(check.what)));
  });
}

test('12-hour newest and 24-hour source limits are inclusive', () => {
  const data = healthy();
  for (const cat of cats) data.manifest.cats[cat].updatedAt = at(12);
  data.lists.cpu.sources.bestprice.updatedAt = at(24);
  assert.deepEqual(failures(data), []);
});
