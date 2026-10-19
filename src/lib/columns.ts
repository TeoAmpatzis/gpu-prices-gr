// Reading the build-time data files (written by src/lib/derive.ts). Pure functions with no imports besides
// types, so the site's main bundle and the facet worker can decode list.v2.json without the derivation (and
// through it the PC builder's rules).

import type { Columns, DailyLow, ListFile } from '../types';

/** Listings back from columns; a field the listing didn't have is null. */
export function fromColumns<L>({ cols, rows }: Columns): L[] {
  return rows.map((r) => {
    const o: Record<string, unknown> = {};
    for (let i = 0; i < cols.length; i++) o[cols[i]] = r[i];
    return o as L;
  });
}

/** Current list file format: it has its own file name (list.v2.json), so cached older code and files never meet. */
export const LIST_FORMAT = 2;
export const listUrl = (cat: string) => `/data/${cat}/list.v2.json`;

/** Throws a clear error for a list file of another format (instead of failing later while decoding). */
export function assertListFormat(file: { v?: unknown }): void {
  if (file.v !== LIST_FORMAT) throw new Error(`list.v2.json: format ${String(file.v)}, expected ${LIST_FORMAT}`);
}

const DAY = 864e5;

/**
 * The daily lows per model from `hist` (derive.encodeHist): per model [first day offset from `histBase`,
 * price in cents, then (days since the previous point, price in cents) pairs]. A model without points is
 * left out, as it was before the compact form.
 */
export function decodeHist(file: Pick<ListFile, 'v' | 'hist' | 'histBase'>): Record<string, DailyLow[]> {
  assertListFormat(file);
  const base = Date.parse(`${file.histBase}T00:00:00Z`);
  const names = new Map<number, string>();
  const dayName = (n: number) => {
    let s = names.get(n);
    if (s === undefined) names.set(n, (s = new Date(base + n * DAY).toISOString().slice(0, 10)));
    return s;
  };
  const out: Record<string, DailyLow[]> = {};
  for (const [k, v] of Object.entries(file.hist)) {
    if (!v.length) continue;
    const pts: DailyLow[] = [];
    let day = 0;
    for (let i = 0; i < v.length; i += 2) {
      day += v[i];
      pts.push({ d: dayName(day), min: v[i + 1] / 100 });
    }
    out[k] = pts;
  }
  return out;
}

/** The model keys of a list file, sorted: the order of the `photos` bitset (every current model has a `hist` entry). */
export const modelKeys = (file: Pick<ListFile, 'hist'>): string[] => Object.keys(file.hist).sort();

/** Model keys that have a photo (`photos` is a base64 bitset over `modelKeys`, bit i = byte i>>3, bit i&7). */
export function decodePhotos(file: Pick<ListFile, 'v' | 'hist' | 'photos'>): Set<string> {
  assertListFormat(file);
  const bits = atob(file.photos ?? '');
  const out = new Set<string>();
  modelKeys(file).forEach((k, i) => {
    if ((bits.charCodeAt(i >> 3) >> (i & 7)) & 1) out.add(k);
  });
  return out;
}
