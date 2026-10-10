// Per-source data age (backlog #8). Each category's list.json has `sources[name].updatedAt` = when that
// source last succeeded; a source that keeps failing keeps its old listings, so its prices age while the
// category's newest data looks fresh. Used by site-check.mjs; tests in source-age.test.mts.
export const WARN_H = 12; // scrapes run every 6 h: two missed runs
export const FAIL_H = 24; // the plan: a price older than 24 h is marked

/** lists: {cat: list.json | null}. Returns one row per category × source, with its age and level. */
export function sourceAges(lists, now = Date.now()) {
  const rows = [];
  for (const [cat, list] of Object.entries(lists)) {
    for (const [source, meta] of Object.entries(list?.sources ?? {})) {
      const t = Date.parse(meta?.updatedAt ?? '');
      const ageH = Number.isNaN(t) ? null : Math.round((now - t) / 36e5 * 10) / 10;
      const level = ageH === null || ageH > FAIL_H ? 'fail' : ageH > WARN_H ? 'warn' : 'ok';
      rows.push({ cat, source, ageH, level, updatedAt: meta?.updatedAt ?? null });
    }
  }
  return rows;
}
