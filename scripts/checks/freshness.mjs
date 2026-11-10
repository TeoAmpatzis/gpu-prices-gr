// Audit 2026-11-10, P2-006: fails when the live site's prices are old, so a stopped scrape is noticed within hours
// (GitHub emails the owner when a scheduled workflow fails). One request, read only.
//   node scripts/checks/freshness.mjs [site]      MAX_HOURS (default 30) = oldest allowed source, per category
const site = process.argv[2] || 'https://gpu-prices-gr.vercel.app';
const MAX_HOURS = Number(process.env.MAX_HOURS) || 30;

/** The stale sources of a manifest: [category, source, age in hours]. Skroutz runs about twice a day, the rest every 6 h. */
export function stale(manifest, now, maxHours = MAX_HOURS) {
  const out = [];
  for (const [cat, c] of Object.entries(manifest.cats ?? {}))
    for (const [source, s] of Object.entries(c.sources ?? {})) {
      const age = (now - Date.parse(s.updatedAt)) / 36e5;
      if (!(age <= maxHours)) out.push([cat, source, Math.round(age)]);
    }
  return out;
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/').replace(/^(?!\/)/, '/')}`) {
  const res = await fetch(`${site}/data/manifest.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`manifest: HTTP ${res.status}`);
  const manifest = await res.json();
  const old = stale(manifest, Date.now());
  if (!Object.keys(manifest.cats ?? {}).length) throw new Error('manifest has no categories');
  for (const [cat, source, age] of old) console.error(`STALE ${cat}/${source}: ${age} h (limit ${MAX_HOURS} h)`);
  console.log(old.length ? `${old.length} stale source(s)` : `fresh: every source is under ${MAX_HOURS} h old (built ${manifest.builtAt})`);
  process.exit(old.length ? 1 : 0);
}
