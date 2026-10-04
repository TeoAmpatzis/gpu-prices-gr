// Shared helpers for the v2 Phase 0 data-quality audit (part B3). Read-only: loads the committed
// scraper files (public/data) and an already-built copy of the derived files (builder.json …), and
// writes results only under docs/audit/data/. No network requests.
//
// Model grouping mirrors src/lib/categories.tsx `modelKey` (checked against manifest.json counts
// by `node scripts/audit/data-quality/run-all.mjs`).

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const DATA = join(ROOT, 'public', 'data');
/** Built derived files (the vite build output's data/ folder). Override with AUDIT_DIST. */
export const DIST =
  process.env.AUDIT_DIST ??
  'C:\\Users\\Teo\\AppData\\Local\\Temp\\claude\\C--Users-Teo-Desktop-PROJECTS-Gpu-price-comparison\\02d0ddd3-8325-4a13-9c8a-f5fb2316d60f\\scratchpad\\dist-audit\\data';
export const OUT = join(ROOT, 'docs', 'audit', 'data');

export const CATS = ['gpu', 'cpu', 'mobo', 'ram', 'storage', 'psu', 'case', 'fan', 'cooler'];
export const SOURCES = ['skroutz', 'bestprice', 'snif', 'shopflix', 'eshop'];

const cache = new Map();
export function readJson(path, fallback) {
  if (cache.has(path)) return cache.get(path);
  if (!existsSync(path)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`missing ${path}`);
  }
  let text = readFileSync(path, 'utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const value = JSON.parse(text);
  cache.set(path, value);
  return value;
}

export const latest = (cat) => readJson(join(DATA, cat, 'latest.json'));
export const specsCache = (cat) => readJson(join(DATA, cat, 'specs.json'), {});

/** Same as src/lib/categories.tsx `productKey` (and scraper/names.py `model_key`). */
export const productKey = (chip) => chip.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Same as `modelKey` in src/lib/categories.tsx, per category. */
export const MODEL_KEY = {
  gpu: (l) => `${l.chip} ${l.vram}GB`,
  cpu: (l) => l.chip,
  mobo: (l) => productKey(l.chip),
  ram: (l) => `${l.chip} ${l.formFactor}`,
  psu: (l) => `${l.chip} ${l.formFactor}`,
  case: (l) => productKey(l.chip),
  fan: (l) => productKey(l.chip),
  cooler: (l) => productKey(l.chip),
  storage: (l) => productKey(`${l.chip} ${l.media}`),
};

/** Models of a category like src/lib/data.ts `groupModels`: key → listings sorted by price (cheapest first). */
export function groupModels(cat, listings = latest(cat).listings) {
  const map = new Map();
  for (const l of listings) {
    const k = MODEL_KEY[cat](l);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(l);
  }
  const models = [];
  for (const [key, ls] of map) {
    ls.sort((a, b) => a.price - b.price);
    models.push({ key, listings: ls, cheapest: ls[0] });
  }
  return models;
}

/**
 * "Most-listed quarter": models whose listing count is at least the count of the model at rank
 * ceil(N/4) when sorted by listing count (descending), so ties at the cutoff are all included.
 */
export function topQuarter(models) {
  const counts = models.map((m) => m.listings.length).sort((a, b) => b - a);
  const rank = Math.max(1, Math.ceil(counts.length / 4));
  const cutoff = counts[rank - 1] ?? 0;
  return { cutoff, models: models.filter((m) => m.listings.length >= cutoff) };
}

/** Most frequent non-null value (src/lib/data.ts `mostCommon`: the first value wins a tie). */
export function mostCommon(values) {
  const counts = new Map();
  for (const v of values) if (v != null) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = null;
  let n = 0;
  for (const [v, c] of counts) if (c > n) [best, n] = [v, c];
  return best;
}

export function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return null;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Rows of a column file ({cols, rows}) as objects. */
export const fromColumns = (c) => c.rows.map((r) => Object.fromEntries(c.cols.map((k, i) => [k, r[i]])));

/**
 * Builder rows per slot from the built builder.json + builder-storage.json, with the URL and shop
 * titles that builder-extra.json holds put back (`title` = the model's distinct titles, " | "-joined).
 */
export function builderRows() {
  const b = readJson(join(DIST, 'builder.json'));
  const extra = readJson(join(DIST, 'builder-extra.json'), { urls: {}, titles: {} });
  const out = {};
  for (const [slot, c] of Object.entries(b.slots)) {
    out[slot] = fromColumns(c).map((r) => ({
      ...r,
      url: r.url ?? extra.urls[r.id] ?? '',
      title: r.title || extra.titles[r.id] || '',
    }));
  }
  const st = readJson(join(DIST, 'builder-storage.json'), null);
  if (st) out.storage = fromColumns(st);
  return { builtAt: b.builtAt, coverage: b.coverage, rows: out };
}

export const manifest = () => readJson(join(DIST, 'manifest.json'));

/** GPU_PSU from src/lib/builder.ts, read from the source so the audit can't drift from it. */
export function gpuPsuTable() {
  const src = readFileSync(join(ROOT, 'src', 'lib', 'builder.ts'), 'utf8');
  const block = src.match(/const GPU_PSU: Record<string, number> = \{([\s\S]*?)\n\};/)[1];
  return Object.fromEntries([...block.matchAll(/'([^']+)':\s*(\d+)/g)].map((m) => [m[1], Number(m[2])]));
}

/** 95% Wilson score interval for k successes in n trials, as fractions. */
export function wilson(k, n, z = 1.96) {
  if (!n) return [0, 1];
  const p = k / n;
  const den = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / den;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}

/** Small seeded RNG (mulberry32) so the samples can be reproduced. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** k distinct items from `xs`, chosen with `random` (partial Fisher–Yates on a copy). */
export function sample(xs, k, random) {
  const a = [...xs];
  const n = Math.min(k, a.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(random() * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

export const pct = (k, n, digits = 1) => (n ? `${((100 * k) / n).toFixed(digits)}%` : '—');

export function writeOut(name, value) {
  mkdirSync(OUT, { recursive: true });
  const path = join(OUT, name);
  writeFileSync(path, typeof value === 'string' ? value : `${JSON.stringify(value, null, 1)}\n`, 'utf8');
  return path;
}

const csvCell = (v) => {
  const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (rows, cols) => [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n';

/** A short listing description for examples. */
export const brief = (l, extra = {}) => ({ id: l.id, source: l.source, title: l.title, price: l.price, ...extra });

/** Markdown table from rows of cells (cells are escaped for `|`). */
export function mdTable(header, rows) {
  const esc = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  return [`| ${header.map(esc).join(' | ')} |`, `| ${header.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.map(esc).join(' | ')} |`)].join('\n');
}
