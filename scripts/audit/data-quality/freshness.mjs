// Section 5 of the data-quality audit: freshness per category and source, from latest.json only.
// "now" = the time this script runs (or AUDIT_NOW=ISO time); the snapshot time = latest.json updatedAt.
// Run: node scripts/audit/data-quality/freshness.mjs → docs/audit/data/freshness.json + freshness.csv

import { CATS, SOURCES, latest, toCsv, writeOut } from './lib.mjs';

const now = new Date(process.env.AUDIT_NOW ?? Date.now());
const hours = (a, b) => (a && b ? +((new Date(a) - new Date(b)) / 3.6e6).toFixed(1) : null);

const rows = [];
for (const cat of CATS) {
  const lt = latest(cat);
  for (const src of SOURCES) {
    const meta = lt.sources?.[src] ?? null;
    const ls = lt.listings.filter((l) => l.source === src);
    const times = ls.map((l) => l.scrapedAt).filter(Boolean).sort();
    const lastOk = meta?.updatedAt ?? null;
    rows.push({
      cat,
      source: src,
      count: meta?.count ?? null,
      listings: ls.length,
      ok: meta?.ok ?? null,
      lastSuccess: lastOk,
      oldestScrapedAt: times[0] ?? null,
      newestScrapedAt: times[times.length - 1] ?? null,
      snapshot: lt.updatedAt,
      ageAtSnapshotH: hours(lt.updatedAt, lastOk),
      ageNowH: hours(now.toISOString(), lastOk),
      oldestListingAgeNowH: hours(now.toISOString(), times[0]),
      over24hNow: lastOk ? hours(now.toISOString(), lastOk) > 24 : true,
    });
  }
}
writeOut('freshness.json', { now: now.toISOString(), rows });
writeOut('freshness.csv', toCsv(rows, Object.keys(rows[0])));
console.log(`now = ${now.toISOString()}`);
for (const r of rows) {
  console.log(
    `${r.cat.padEnd(8)} ${r.source.padEnd(9)} ok=${String(r.ok).padEnd(5)} count=${String(r.count).padEnd(5)} last=${r.lastSuccess} ageAtSnap=${r.ageAtSnapshotH}h ageNow=${r.ageNowH}h scraped ${r.oldestScrapedAt} … ${r.newestScrapedAt}`,
  );
}
