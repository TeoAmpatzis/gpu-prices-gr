// Monitor launch gates that can be measured offline (docs/superpowers/plans/2026-11-10-monitors-and-compare-launch.md, section 6):
// coverage of the four launch specs per model, listings that state conflicting sizes or resolutions inside one model
// (false-merge candidates), and the gzip size of the built list file. The scrape history (three complete runs) is not
// here: `gh run list` shows it.
// Usage: npx tsx scripts/phase3/monitor-gates.mts [dataDir=public/data/monitor] [distListFile=dist/data/monitor/list.v2.json]
// Exit code 1 when a gate fails.
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import type { MonitorListing } from '../../src/types';

const dir = process.argv[2] ?? 'public/data/monitor';
const listFile = process.argv[3] ?? 'dist/data/monitor/list.v2.json';
const COVERAGE_MIN = 0.9;
const LIST_MAX_KIB = 300;

const latest = JSON.parse(readFileSync(`${dir}/latest.json`, 'utf8')) as { listings: MonitorListing[] };
const models = new Map<string, MonitorListing[]>();
for (const l of latest.listings) models.set(l.chip, [...(models.get(l.chip) ?? []), l]);

/** What a model states for one spec: the title's value first, else the shop page's. */
const stated = <T,>(ls: MonitorListing[], title: (l: MonitorListing) => T | null | undefined, page: (l: MonitorListing) => T | null | undefined): T | null => {
  for (const l of ls) { const v = title(l); if (v != null) return v; }
  for (const l of ls) { const v = page(l); if (v != null) return v; }
  return null;
};
const specs = {
  diagonal: (ls: MonitorListing[]) => stated(ls, (l) => l.size, (l) => l.pgSize),
  resolution: (ls: MonitorListing[]) => stated(ls, (l) => l.height, (l) => l.pgHeight),
  panel: (ls: MonitorListing[]) => stated(ls, (l) => l.panel, (l) => l.pgPanel),
  refresh: (ls: MonitorListing[]) => stated(ls, (l) => l.hz, (l) => l.pgHz),
};

let failed = false;
const gate = (name: string, ok: boolean, detail: string) => { if (!ok) failed = true; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${detail}`); };

const bySource: Record<string, number> = {};
for (const l of latest.listings) bySource[l.source] = (bySource[l.source] ?? 0) + 1;
console.log(`models ${models.size}, listings ${latest.listings.length}, by source ${JSON.stringify(bySource)}`);
console.log(`page-read listings (EAN or page size known): ${latest.listings.filter((l) => l.gtin != null || l.pgSize != null).length}`);

for (const [name, get] of Object.entries(specs)) {
  const known = [...models.values()].filter((ls) => get(ls) != null).length;
  const share = known / models.size;
  gate(`coverage ${name}`, share >= COVERAGE_MIN, `${(share * 100).toFixed(1)}% of models (need ${COVERAGE_MIN * 100}%)`);
}

// Listings of one model that state different diagonals (more than 0.6"; a panel is sold as 31.5 or 32, 21.5 or 22) or different pixel rows: possible false merges.
const conflicts: string[] = [];
for (const [chip, ls] of models) {
  const sizes = new Set(ls.map((l) => l.size).filter((v): v is number => v != null));
  const rows = new Set(ls.map((l) => l.height).filter((v): v is number => v != null));
  const spread = sizes.size ? Math.max(...sizes) - Math.min(...sizes) : 0;
  if (spread > 0.6 || rows.size > 1) conflicts.push(`${chip}: sizes ${[...sizes].join('/')} rows ${[...rows].join('/')}`);
}
gate('false-merge candidates', conflicts.length === 0, `${conflicts.length} model(s) with conflicting size or resolution`);
for (const c of conflicts.slice(0, 25)) console.log(`  ${c}`);

if (existsSync(listFile)) {
  const kib = gzipSync(readFileSync(listFile)).length / 1024;
  gate('list file size', kib <= LIST_MAX_KIB, `${kib.toFixed(1)} KiB gzip (max ${LIST_MAX_KIB})`);
} else {
  gate('list file size', false, `${listFile} not found: run \`npm run build\` first`);
}

process.exit(failed ? 1 : 0);
