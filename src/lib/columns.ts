// Reading the build-time data files (written by src/lib/derive.ts). No imports, so the site's main
// bundle doesn't pull in the derivation (and through it the PC builder's rules).

import type { Columns, DailyLow, ListFile } from '../types';

/** Listings back from columns; a field the listing didn't have is null. */
export function fromColumns<L>({ cols, rows }: Columns): L[] {
  return rows.map((r) => {
    const o: Record<string, unknown> = {};
    for (let i = 0; i < cols.length; i++) o[cols[i]] = r[i];
    return o as L;
  });
}

export const expandHistory = (hist: ListFile['hist']): Record<string, DailyLow[]> =>
  Object.fromEntries(Object.entries(hist).map(([k, pts]) => [k, pts.map(([d, min]) => ({ d, min }))]));
