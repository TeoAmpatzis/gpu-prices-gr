// The build's publishing check (derive.checkData) against a manifest: run `npm run build` first (it reads
// dist/data/manifest.json), then from the repo root: npx tsx scripts/checks/data-check.test.mts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const { checkData } = await import(pathToFileURL(join(process.cwd(), 'src/lib/derive.ts')).href);
const live = JSON.parse(readFileSync('dist/data/manifest.json', 'utf8').replace(/^﻿/, ''));
const clone = () => JSON.parse(JSON.stringify(live));
let bad = 0;
const expect = (name: string, problems: string[], wantFail: boolean) => {
  const ok = wantFail ? problems.length > 0 : problems.length === 0;
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${problems.length ? ' -> ' + problems.join(' | ') : ''}`);
};

expect('same data as live', checkData(clone(), live), false);
let n = clone(); n.cats.case.models = Math.round(live.cats.case.models * 0.75);
expect('cases -25% models (normal swing) passes', checkData(n, live), false);
n = clone(); n.cats.case.models = Math.round(live.cats.case.models * 0.65);
expect('cases -35% models fails', checkData(n, live), true);
n = clone(); n.cats.ram.listings = Math.round(live.cats.ram.listings * 0.6);
expect('ram -40% listings fails', checkData(n, live), true);
n = clone(); n.cats.gpu = { models: 0, listings: 0, updatedAt: '' };
expect('gpu empty fails', checkData(n, live), true);
n = clone(); delete n.cats.fan;
expect('fan missing fails', checkData(n, live), true);
n = clone(); n.builder.cooler = 0;
expect('builder offers no coolers fails', checkData(n, live), true);
n = clone(); n.cats.gpu.models = 40;
expect('no live manifest, gpu 40 models (< 49) fails', checkData(n, null), true);
expect('no live manifest, real counts pass', checkData(clone(), null), false);
n = clone(); n.cats.psu.models = live.cats.psu.models * 2;
expect('growth is fine', checkData(n, live), false);
n = clone(); n.cats.gpu.historyPoints = Math.round(live.cats.gpu.historyPoints * 0.6);
expect('history -40% points fails', checkData(n, live), true);
n = clone(); n.cats.gpu.historyPoints = Math.round(live.cats.gpu.historyPoints * 0.9);
expect('history -10% (365-day trim) passes', checkData(n, live), false);
n = clone(); const oldLive = clone(); for (const c of Object.values(oldLive.cats) as any[]) delete c.historyPoints;
expect('live manifest without historyPoints: no history comparison', checkData(n, oldLive), false);
console.log(bad ? `${bad} FAILED` : 'all checks behave as intended');
process.exit(bad ? 1 : 0);
