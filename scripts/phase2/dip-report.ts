// C6 report: how many daily lows the implausible-dip rule excludes, and what it does to the
// all-time-low badges on the current data. Run: npx vite-node scripts/phase2/dip-report.ts
import { readFileSync } from 'node:fs';
import { implausibleDips } from '../../src/lib/dips';
import { allTimeLow } from '../../src/lib/data';
import { CATEGORIES, CATEGORY_IDS } from '../../src/lib/categories';
import type { BaseListing, DailyLow, History, Imported } from '../../src/types';
import type { CategoryConfig } from '../../src/lib/categories';

const read = <T>(p: string, d: T): T => { try { return JSON.parse(readFileSync(p, 'utf8')) as T; } catch { return d; } };
const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
// The previous rule (no dip handling), for the "before" count.
function before(points: DailyLow[] | undefined, imp: Imported[string] | undefined, price: number) {
  const today = new Date().toISOString().slice(0, 10);
  const past = (points ?? []).filter((p) => p.d < today);
  const il = typeof imp === 'object' ? imp : undefined;
  const since = [past[0]?.d, il?.since].filter((d): d is string => !!d).sort()[0];
  if (!since || Date.now() - new Date(since).getTime() < 60 * 864e5) return false;
  const lows = past.map((p) => p.min);
  if (il?.low != null) lows.push(il.low);
  return lows.length > 0 && price <= Math.min(...lows) + 0.005;
}
const samples: string[] = [];
let tp = 0, tm = 0, tb = 0, ta = 0, total = 0, own = 0;
for (const cat of CATEGORY_IDS) {
  const dir = `public/data/${cat}`;
  const history = read<History>(`${dir}/history.json`, {});
  const imported = read<Imported>(`${dir}/history_imported.json`, {});
  const latest = read<{ listings: BaseListing[] }>(`${dir}/latest.json`, { listings: [] });
  const cfg = CATEGORIES[cat] as unknown as CategoryConfig<BaseListing>;
  const cheapest = new Map<string, number>();
  for (const l of latest.listings) { const k = cfg.modelKey(l); cheapest.set(k, Math.min(cheapest.get(k) ?? Infinity, l.price)); }
  let pts = 0, models = 0, b = 0, a = 0;
  for (const [k, h] of Object.entries(history)) {
    total += h.length;
    const dips = implausibleDips(h);
    if (dips.size) { models++; pts += dips.size; for (const p of dips) if (!(p as { i?: number }).i) own++; }
    if (dips.size && samples.length < 15 && [...dips][0] && Math.random() < 0.05) {
      const sorted = [...h].sort((x, y) => (x.d < y.d ? -1 : 1));
      const p = [...dips].sort((x, y) => (x.d < y.d ? -1 : 1))[0];
      const i = sorted.indexOf(p);
      samples.push(`${cat} | ${k} | ${p.d} | ${p.min} | before-median ${median(sorted.slice(Math.max(0, i - 30), i).map((q) => q.min)).toFixed(1)} | after-median ${median(sorted.slice(i + 1, i + 31).map((q) => q.min)).toFixed(1)}`);
    }
    const price = cheapest.get(k);
    if (price != null) { if (before(h, imported[k], price)) b++; if (allTimeLow(h, imported[k], price)) a++; }
  }
  console.log(`${cat}: excluded ${pts} points in ${models} models; all-time-low badges ${b} -> ${a}`);
  tp += pts; tm += models; tb += b; ta += a;
}
console.log(`TOTAL: ${tp} of ${total} points (${own} own scrapes) in ${tm} models; badges ${tb} -> ${ta}`);
console.log(samples.join('\n'));
