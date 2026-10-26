// Performance tiers (B6): coverage of src/engine/data/tiers.ts over today's data, and the reproducible derivation of
// every row from the saved source pages. Both modes regenerate their docs files (deterministic: no timestamp).
//
//   npm run tiers:coverage                                  regenerates docs/phase4/tier-coverage.md (no pages needed)
//   npm run tiers:coverage -- --pages <dir>                 also re-derives every tier from the pages in <dir>, fails
//                                                           (exit 1) if a row of tiers.ts differs, regenerates
//                                                           docs/phase4/tier-derivation.md and prints the gate per
//                                                           step (Tom's + PCGH, then + ComputerBase)
//   npm run tiers:coverage -- --pages <dir> --emit <file>   writes the TIERS / TIER_DISAGREE rows as TypeScript
//
// The pages are not in the repo (only our tier is stored). Files expected in <dir>, downloaded 2026-10-26:
//   toms-gpu-hierarchy.html      https://www.tomshardware.com/reviews/gpu-hierarchy,4388.html
//   toms-cpu-hierarchy.html      https://www.tomshardware.com/reviews/cpu-hierarchy,4312.html
//   toms-cpu-hierarchy-2.html    https://www.tomshardware.com/reviews/cpu-hierarchy,4312-2.html (legacy; names only,
//                                to say why a chip has no Tom's value: its scores are never used)
//   pcgh-gpu-rangliste-5497.json https://www.pcgameshardware.de/webservices/benchmarks/?collection=5497&article=1174201
//                                (the index the article .../Rangliste-GPU-Grafikchip-Benchmark-1174201/ shows)
//   pcgh-cpu-rangliste-5177.json https://www.pcgameshardware.de/webservices/benchmarks/?collection=5177&article=1143392
//                                (the index the article .../Rangliste-Bestenliste-1143392/2/ shows)
//   cb-gpu-rangliste.html        https://www.computerbase.de/artikel/grafikkarten/rangliste.2487/
//   cb-cpu-rangliste.html        https://www.computerbase.de/artikel/prozessoren/rangliste.89909/
//
// METHOD (the same for every source):
//   1. Tables read: Tom's GPU rasterization table (1080p/1440p/4K Ultra, the % column); PCGH GPU Performance Index
//      (Full HD / WQHD / Ultra HD; -1 = not measured); ComputerBase "Performancerating Rasterizer – <resolution>"
//      charts; Tom's CPU "Gaming CPU Benchmarks Rankings 2026" (1080p gaming score); PCGH CPU index "Spiele";
//      ComputerBase "Leistungsrating 720p … – Durchschnitts-FPS" charts.
//   2. share = the score ÷ the score of the reference chip (GPU RTX 5090, CPU Ryzen 7 9800X3D) in the same table and
//      resolution. A table or resolution without the reference is not used (nothing is rescaled between tables), so
//      Tom's legacy CPU tables and ComputerBase's 1080p GPU chart (no RTX 5090) give nothing.
//   3. tier = tierFromShare(share) = the 10 % band (> 90 % → 10 … ≤ 10 % → 1).
//   4. Names: maker words (GeForce/Geforce/Radeon/Intel/AMD), price tags, "Dual Edition"/"Dual Ed.", ComputerBase's
//      power/memory details ("120/162 W, DDR5-…") and test-setup tags (Dual-Chan, Single-Chan, D4, D5) dropped. The
//      chip must then equal a chip name in public/data/<kind>/latest.json exactly.
//   5. GPUs are matched per memory size (the listing's `vram`): a source row that states a size ("16GB", PCGH's
//      "16 GiB", ComputerBase's "(16 GB)") counts only for that size. A row without a size (Tom's single-size cards)
//      stands for the chip as the source tested it and counts for each size of the chip unless the source also has a
//      sized row for that chip; a tier still needs a second source, and PCGH/ComputerBase always state the size.
//   6. Several values for one product in one source (ComputerBase memory setups): the lowest.
//   7. pickTier: pairs Tom's+PCGH, Tom's+CB, PCGH+CB in that order; the first within 1 tier gives the lower of the
//      two; ≥ 2 sources but no pair within 1 → TIER_DISAGREE (GPU: at any resolution); 1 source → no tier.
//   8. Workstation GPUs, Titans and Xeon/EPYC/Threadripper/Opteron get no row.
//   F/KF twins (owner 2026-10-26: a twin needs the maker's pages to show the same cores, threads, clocks and cache):
//   intel.com was refused by the permission system on the first download, so no Intel twin is used; no AMD F chip in
//   the data has a non-F twin with a tier (7500F ≠ 7600, 8400F has none), so no twin rows exist.
//
// "Quarter" = desktop CPU chips (sockets AM5/AM4/LGA1851/LGA1700/LGA1200/LGA1151, no server chips) or consumer GPU
// chips (no workstation cards) ranked by listings, most first (ties by name); quarter 1 = the first ceil(n/4).
// A GPU chip counts as covered when every memory size of it in the data has a tier at one resolution or more.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CB_CPU, CB_GPU, PCGH_CPU, PCGH_GPU, RESOLUTIONS, SOURCE_ORDER, TIERS, TIER_DISAGREE, TOMS_CPU, TOMS_GPU,
  pickTier, tierFromShare, type Res, type SourceId, type TierDisagreement, type TierRow, type TierSource,
} from '../../src/engine/data/tiers';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOCS = join(ROOT, 'docs', 'phase4');
type Kind = 'cpu' | 'gpu';
type Tiers = Partial<Record<Res, number>>;

const WORKSTATION_GPU = /^(RTX PRO |RTX A\d|T\d|RTX \d{4} (Ada|\(Pro\)))|Quadro|Radeon PRO|Arc Pro|Titan/;
const SERVER_CPU = /Xeon|EPYC|Threadripper|Opteron|^W-/;
const DESKTOP_SOCKETS = new Set(['AM5', 'AM4', 'LGA1851', 'LGA1700', 'LGA1200', 'LGA1151']);
const REFERENCE: Record<Kind, string> = { gpu: 'RTX 5090', cpu: 'Ryzen 7 9800X3D' };
const SOURCES: Record<Kind, Record<SourceId, TierSource>> = {
  gpu: { toms: TOMS_GPU, pcgh: PCGH_GPU, cb: CB_GPU },
  cpu: { toms: TOMS_CPU, pcgh: PCGH_CPU, cb: CB_CPU },
};
const NAME: Record<SourceId, string> = { toms: "Tom's", pcgh: 'PCGH', cb: 'CB' };

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};

// ---------- today's data ----------
interface Listing { chip: string; socket?: string | null; cores?: number | null; vram?: number | null }
const read = (kind: Kind) => (JSON.parse(readFileSync(join(ROOT, 'public', 'data', kind, 'latest.json'), 'utf8')) as { listings: Listing[] }).listings;
const mostCommon = <T,>(xs: T[]): T | undefined => {
  const m = new Map<T, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
};

interface Chip { chip: string; n: number; cores?: number; variants: { vram: number; n: number }[] }
function dataChips(kind: Kind): Chip[] {
  const by = new Map<string, Listing[]>();
  for (const l of read(kind)) by.set(l.chip, [...(by.get(l.chip) ?? []), l]);
  const out: Chip[] = [];
  for (const [chip, ls] of by) {
    if (kind === 'gpu' && WORKSTATION_GPU.test(chip)) continue;
    if (kind === 'cpu') {
      if (SERVER_CPU.test(chip)) continue;
      const socket = mostCommon(ls.map((l) => l.socket).filter((s): s is string => !!s));
      if (!socket || !DESKTOP_SOCKETS.has(socket)) continue;
    }
    const cores = mostCommon(ls.map((l) => l.cores).filter((c): c is number => typeof c === 'number'));
    const vr = new Map<number, number>();
    if (kind === 'gpu') for (const l of ls) if (typeof l.vram === 'number') vr.set(l.vram, (vr.get(l.vram) ?? 0) + 1);
    const variants = [...vr.entries()].map(([vram, n]) => ({ vram, n })).sort((a, b) => b.n - a.n || a.vram - b.vram);
    out.push({ chip, n: ls.length, ...(cores ? { cores } : {}), variants });
  }
  return out.sort((a, b) => b.n - a.n || (a.chip < b.chip ? -1 : 1));
}
const CHIPS: Record<Kind, Chip[]> = { cpu: dataChips('cpu'), gpu: dataChips('gpu') };

// ---------- page parsing ----------
const strip = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&rsquo;/g, "'").replace(/\s+/g, ' ').trim();
function tables(html: string): { heading: string; rows: string[][] }[] {
  return [...html.matchAll(/<table[\s\S]*?<\/table>/g)].map((m) => {
    const before = html.slice(Math.max(0, m.index - 3000), m.index);
    const hs = [...before.matchAll(/<h[234][^>]*>([\s\S]*?)<\/h[234]>/g)];
    const rows = [...m[0].matchAll(/<tr[\s\S]*?<\/tr>/g)].map((r) => [...r[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => strip(c[1])));
    return { heading: hs.length ? strip(hs[hs.length - 1][1]) : '', rows };
  });
}
/** ComputerBase bar charts: title, then label + data-value per row. */
function cbCharts(html: string): { title: string; rows: { label: string; value: number }[] }[] {
  return html.split(/class="chart chart--bar/).slice(1).map((c) => {
    const title = strip((/chart__title[^>]*>([\s\S]*?)<\/(div|h\d|span|p)>/.exec(c) ?? [])[1] ?? '');
    const rows = c.split('class="chart__row"').slice(1).map((r) => ({
      label: strip((/class="chart__item"[^>]*>([\s\S]*?)<\/div>/.exec(r) ?? [])[1] ?? ''),
      value: Number((/data-value="([^"]+)"/.exec(r) ?? [])[1]),
    }));
    return { title, rows };
  });
}
const pct = (s: string | undefined): number | undefined => {
  const m = /(\d+(?:\.\d+)?)\s*%/.exec(s ?? '');
  return m ? Number(m[1]) : undefined;
};
const col = (header: string[], re: RegExp) => {
  const i = header.findIndex((h) => re.test(h));
  if (i < 0) throw new Error(`column ${re} not found in [${header.join(' | ')}]`);
  return i;
};

/** key → score; lowest wins (method step 6). */
type Scores = Map<string, number>;
const put = (m: Scores, key: string, v: number | undefined) => {
  if (v === undefined || !(v > 0)) return;
  m.set(key, Math.min(m.get(key) ?? Infinity, v));
};
const gpuSplit = (s: string): [string, string] => {
  const m = /^(?:GeForce|Geforce|Radeon|Intel)?\s*(.*?)(?:\s+\(?(\d+)\s?GB\)?)?$/.exec(s.trim())!;
  return [m[1].trim(), m[2] ?? '*'];
};
function cpuNames(raw: string): string[] {
  const s = raw.replace(/^\$[\d,]+\s*-\s*/, '').replace(/\s*\(\$[\d,.]+\)\s*$/, '').replace(/^(Intel|AMD)\s+/, '')
    .replace(/\s+\d+\/\d+\s*W\b.*$/, '').replace(/\*$/, '').replace(/\s+(DDR4 \/ DDR5|DDR5 \/ DDR4)$/, '')
    .replace(/\s+\(ABT off\/on\)$/, '').replace(/\s+(Dual-Chan|Single-Chan|Single Chan|D4|D5)$/, '')
    .replace(/\s+Dual (Edition|Ed\.)$/, '').trim();
  const [base, ...rest] = s.split(/\s*\/\s*/);
  return [base, ...rest.map((p) => (/^i\d-/.test(p) ? `Core ${p}` : /^[A-Z]{1,2}$/.test(p) ? base + p : p))];
}
const threadsOf = (s: string | undefined) => {
  const m = /^\s*\d+\s*\/\s*(\d+)/.exec(s ?? '');
  return m ? Number(m[1]) : undefined;
};

/** Per source, per resolution ('1080p' only for CPUs), key → share of the reference. */
type Shares = Record<SourceId, Partial<Record<Res, Map<string, number>>>>;
interface Derived { shares: Shares; threads: Map<string, number>; legacyOnly: Set<string>; notes: string[] }
const toShares = (scores: Scores, ref: (k: string) => boolean): Map<string, number> | undefined => {
  const refs = [...scores.entries()].filter(([k]) => ref(k)).map(([, v]) => v);
  if (!refs.length) return undefined; // no reference in this table → not used
  const r = Math.min(...refs);
  return new Map([...scores.entries()].map(([k, v]) => [k, v / r]));
};

function deriveGpu(dir: string): Derived {
  const notes: string[] = [];
  const shares: Shares = { toms: {}, pcgh: {}, cb: {} };
  const isRef = (k: string) => k.startsWith(`${REFERENCE.gpu}|`);
  const key = ([chip, size]: [string, string]) => `${chip}|${size}`;

  const t = tables(readFileSync(join(dir, 'toms-gpu-hierarchy.html'), 'utf8')).find((x) => /^Rasterization/.test(x.heading));
  if (!t) throw new Error("Tom's GPU rasterization table not found");
  const [h, ...rows] = t.rows;
  for (const [res, re] of [['1080p', /^1080p/], ['1440p', /^1440p/], ['4k', /^4K/]] as [Res, RegExp][]) {
    const i = col(h, re), sc: Scores = new Map();
    for (const r of rows) put(sc, key(gpuSplit(r[0])), pct(r[i]));
    shares.toms[res] = toShares(sc, isRef);
  }
  notes.push(`Tom's GPU: ${rows.length} rows (table "${t.heading}")`);

  const j = JSON.parse(readFileSync(join(dir, 'pcgh-gpu-rangliste-5497.json'), 'utf8'));
  const b = j.benchmarks[0];
  const labels: string[] = b.infos['5'].text;
  for (const [res, re] of [['1080p', /Full HD/], ['1440p', /^Index WQHD/], ['4k', /Ultra HD/]] as [Res, RegExp][]) {
    const k = String(labels.findIndex((l) => re.test(l)) + 1), sc: Scores = new Map();
    for (const r of b.data) {
      const [chip, named] = gpuSplit(r.name);
      const gib = /(\d+)\s*GiB/.exec(r.freitext ?? '')?.[1];
      put(sc, key([chip, named !== '*' ? named : gib ?? '*']), Number(r.result[k]?.[0]));
    }
    shares.pcgh[res] = toShares(sc, isRef);
  }
  notes.push(`PCGH GPU: ${b.data.length} rows ("${b.name}"; ${labels.join(', ')})`);

  const charts = cbCharts(readFileSync(join(dir, 'cb-gpu-rangliste.html'), 'utf8')).filter((c) => /^Performancerating Rasterizer/.test(c.title));
  for (const [res, re] of [['1080p', /1\.920 × 1\.080/], ['1440p', /2\.560 × 1\.440/], ['4k', /3\.840 × 2\.160/]] as [Res, RegExp][]) {
    const c = charts.find((x) => re.test(x.title));
    if (!c) continue;
    const sc: Scores = new Map();
    for (const r of c.rows) put(sc, key(gpuSplit(r.label)), r.value);
    shares.cb[res] = toShares(sc, isRef);
    notes.push(`ComputerBase GPU "${c.title}": ${c.rows.length} rows${shares.cb[res] ? '' : ` — no ${REFERENCE.gpu} in it, not used`}`);
  }
  return { shares, threads: new Map(), legacyOnly: new Set(), notes };
}

function deriveCpu(dir: string): Derived {
  const notes: string[] = [];
  const shares: Shares = { toms: {}, pcgh: {}, cb: {} };
  const threads = new Map<string, number>();
  const isRef = (k: string) => k === REFERENCE.cpu;

  const main = tables(readFileSync(join(dir, 'toms-cpu-hierarchy.html'), 'utf8')).find((x) => /^Gaming CPU Benchmarks/.test(x.heading));
  if (!main) throw new Error("Tom's main gaming table not found");
  const [h, ...body] = main.rows;
  const si = col(h, /^1080p Gaming Score/), ti = col(h, /^Cores\/Threads/);
  const sc: Scores = new Map();
  for (const r of body) {
    for (const c of cpuNames(r[0])) {
      put(sc, c, pct(r[si]));
      const th = threadsOf(r[ti]);
      if (th) threads.set(c, th);
    }
  }
  shares.toms['1080p'] = toShares(sc, isRef);
  notes.push(`Tom's CPU main 2026 table: ${body.length} rows`);
  // Legacy tables (page 2): names only, to explain a missing Tom's value. Their scores are never used.
  const legacyOnly = new Set<string>();
  for (const t of tables(readFileSync(join(dir, 'toms-cpu-hierarchy-2.html'), 'utf8'))) {
    if (!t.rows[0]?.some((c) => /^1080p Gaming Score/.test(c))) continue;
    for (const r of t.rows.slice(1)) for (const c of cpuNames(r[0])) if (!sc.has(c)) legacyOnly.add(c);
  }

  const j = JSON.parse(readFileSync(join(dir, 'pcgh-cpu-rangliste-5177.json'), 'utf8'));
  const b = j.benchmarks.find((x: { units: string[] }) => x.units[0] === 'Spiele');
  const ps: Scores = new Map();
  for (const r of b.data) for (const c of cpuNames(r.name)) put(ps, c, Number(r.result['1'][0]));
  shares.pcgh['1080p'] = toShares(ps, isRef);
  notes.push(`PCGH CPU: ${b.data.length} rows (index "${b.name}")`);

  const charts = cbCharts(readFileSync(join(dir, 'cb-cpu-rangliste.html'), 'utf8')).filter((c) => /^Leistungsrating 720p.*Durchschnitts-FPS/.test(c.title));
  const cs: Scores = new Map();
  for (const c of charts) for (const r of c.rows) for (const n of cpuNames(r.label)) put(cs, n, r.value);
  shares.cb['1080p'] = toShares(cs, isRef);
  notes.push(`ComputerBase CPU: ${charts.length} charts "Leistungsrating 720p … Durchschnitts-FPS", ${cs.size} chips`);
  return { shares, threads, legacyOnly, notes };
}

// ---------- verdicts ----------
interface Item { kind: Kind; chip: string; vram?: number; n: number; cores?: number }
const items = (kind: Kind): Item[] => CHIPS[kind].flatMap((c) => (kind === 'cpu'
  ? [{ kind, chip: c.chip, n: c.n, cores: c.cores }]
  : c.variants.map((v) => ({ kind, chip: c.chip, vram: v.vram, n: v.n }))));

function sourceTiers(d: Derived, it: Item, s: SourceId): Tiers {
  const out: Tiers = {};
  for (const res of it.kind === 'cpu' ? (['1080p'] as Res[]) : RESOLUTIONS) {
    const m = d.shares[s][res];
    if (!m) continue;
    let v: number | undefined;
    if (it.kind === 'cpu') v = m.get(it.chip);
    else {
      v = m.get(`${it.chip}|${it.vram}`);
      const sized = [...m.keys()].some((k) => k.startsWith(`${it.chip}|`) && !k.endsWith('|*'));
      if (v === undefined && !sized) v = m.get(`${it.chip}|*`);
    }
    if (v !== undefined) out[res] = tierFromShare(v);
  }
  return out;
}

interface Verdict { it: Item; by: Partial<Record<SourceId, Tiers>>; row?: Tiers; pairs?: Partial<Record<Res, [SourceId, SourceId]>>; why?: string }
function verdict(d: Derived, it: Item, use: SourceId[]): Verdict {
  const by: Partial<Record<SourceId, Tiers>> = {};
  for (const s of use) {
    const t = sourceTiers(d, it, s);
    if (Object.keys(t).length) by[s] = t;
  }
  const n = Object.keys(by).length;
  if (n < 2) {
    let why = n ? `only ${NAME[Object.keys(by)[0] as SourceId]} ranks it` : 'no source ranks it';
    if (it.kind === 'cpu' && !by.toms && d.legacyOnly.has(it.chip)) why += " (Tom's only in its legacy tables, not used)";
    return { it, by, why };
  }
  const row: Tiers = {}, pairs: Partial<Record<Res, [SourceId, SourceId]>> = {};
  let disagree = false;
  for (const res of RESOLUTIONS) {
    const vals: Partial<Record<SourceId, number>> = {};
    for (const s of use) if (by[s]?.[res] !== undefined) vals[s] = by[s]![res];
    const p = pickTier(vals);
    if (p === 'disagree') disagree = true;
    else if (p) { row[res] = p.tier; pairs[res] = p.pair; }
  }
  if (disagree) return { it, by, why: 'no two sources within 1 tier (owner list)' };
  if (!Object.keys(row).length) return { it, by, why: 'no resolution measured by two sources' };
  return { it, by, row, pairs };
}

// ---------- coverage (from the table only) ----------
const fmt = (t: Tiers | number | undefined) => (typeof t === 'number' ? String(t) : RESOLUTIONS.map((r) => t?.[r] ?? '—').join(' / '));
const rowOf = (it: { kind: Kind; chip: string; vram?: number }) =>
  TIERS.find((r) => r.kind === it.kind && r.chips.includes(it.chip) && (r.kind === 'cpu' || r.vram === it.vram));
const listed = (it: { kind: Kind; chip: string; vram?: number }) =>
  TIER_DISAGREE.find((d) => d.kind === it.kind && d.chip === it.chip && (it.kind === 'cpu' || d.vram === it.vram));
const covered = (kind: Kind, c: Chip, has: (it: Item) => boolean) =>
  kind === 'cpu' ? has({ kind, chip: c.chip, n: c.n }) : c.variants.length > 0 && c.variants.every((v) => has({ kind, chip: c.chip, vram: v.vram, n: v.n }));
const quarters = (kind: Kind) => {
  const chips = CHIPS[kind], q = Math.ceil(chips.length / 4);
  return { chips, q, qs: [0, 1, 2, 3].map((i) => chips.slice(i * q, (i + 1) * q)) };
};
const tierText = (r: TierRow | undefined) => (r ? (r.kind === 'cpu' ? `${r.tier}` : fmt(r.tier)) : 'no tier');
const cpuRange = () => {
  const t = TIERS.flatMap((r) => (r.kind === 'cpu' ? [r.tier] : []));
  return t.length ? `${Math.min(...t)}–${Math.max(...t)}` : '—';
};

const lines: string[] = [
  '# Performance tier coverage (B6)',
  '',
  'Our own gaming tier 1–10 (`src/engine/data/tiers.ts`) against the chips in `public/data/<cpu|gpu>/latest.json`: one tier per CPU chip, and per graphics card (chip + memory size) one tier at 1080p / 1440p / 4K.',
  'Regenerated by `npm run tiers:coverage`; do not edit by hand. The tiers are our grouping; only our tier is stored, never the sources\' numbers.',
  '',
  '## Sources',
  '',
  '| Kind | Source | Page | Downloaded |',
  '| --- | --- | --- | --- |',
  `| GPU | Tom's Hardware, GPU Benchmarks Hierarchy 2026 (rasterization, 1080p/1440p/4K Ultra) | ${TOMS_GPU.url} | ${TOMS_GPU.checked} |`,
  `| GPU | PC Games Hardware, GPU Performance Index 2026 (Full HD / WQHD / Ultra HD) | ${PCGH_GPU.url} | ${PCGH_GPU.checked} |`,
  `| GPU | ComputerBase, Grafikkarten-Rangliste 2026 (Performancerating Rasterizer, WQHD / Ultra HD; its Full HD chart has no RTX 5090 and is not used) | ${CB_GPU.url} | ${CB_GPU.checked} |`,
  `| CPU | Tom's Hardware, CPU Benchmarks Hierarchy 2026, main gaming table (1080p) | ${TOMS_CPU.url} | ${TOMS_CPU.checked} |`,
  `| CPU | PC Games Hardware, CPU Leistungsindex 2026, games ("Spiele", 720p) | ${PCGH_CPU.url} | ${PCGH_CPU.checked} |`,
  `| CPU | ComputerBase, CPU-Benchmark Prozessor-Vergleich 2026 (Leistungsrating 720p, average FPS) | ${CB_CPU.url} | ${CB_CPU.checked} |`,
  '',
  'Tom\'s Hardware (Future plc, US/UK), PC Games Hardware (Computec, Germany) and ComputerBase (ComputerBase GmbH, Germany) are different publishers with their own test labs, test systems and game lists; none builds its ranking from another\'s results, and none is TechPowerUp. Tom\'s legacy CPU tables (page 2, 2020–2022 baselines without the reference chip) are not used.',
  '',
  '## Method (the same for every source; reproduced by `npm run tiers:coverage -- --pages <dir>`)',
  '',
  '1. Score per chip from the tables above.',
  '2. share = score ÷ the reference chip\'s score in the same table and resolution (GPU: RTX 5090; CPU: Ryzen 7 9800X3D). A table or resolution without the reference is not used; nothing is rescaled between tables.',
  '3. Tier = the 10 % band of the share: more than 90 % → 10, more than 80 % → 9, …, 10 % or less → 1 (`tierFromShare`).',
  '4. Names: maker words, price tags, "Dual Edition", ComputerBase\'s power/memory details and test-setup tags (Dual-/Single-Chan, D4/D5) dropped. The chip must then equal a chip name in the data exactly.',
  '5. Graphics cards are matched per memory size (`vram` of the listing). A source row that states a size counts only for that size. A row without a size (Tom\'s single-size cards) stands for the chip as tested and counts for each size of the chip unless that source has sized rows for it; a tier still needs a second source, and PCGH and ComputerBase always state the size.',
  '6. Several values for one product in one source (ComputerBase memory setups): the lowest.',
  '7. Two of three (`pickTier`): pairs in the order Tom\'s + PCGH, Tom\'s + ComputerBase, PCGH + ComputerBase; the first pair within 1 tier gives the stored tier = the lower of the two. Two or more sources but no pair within 1 → no tier, owner list (`TIER_DISAGREE`; for a card, at any resolution). One source → no tier.',
  `8. CPU: one resolution-independent tier (all three sources measure games with an RTX 5090 at 720p/1080p). CPU tiers sit on a compressed scale (the slowest ranked CPU is above half the reference; today they run ${cpuRange()}); compare tiers only within a kind. Threads only where Tom's page states them; cores from the shop data.`,
  '9. Workstation graphics cards, Titans and server CPUs (Xeon, EPYC, Threadripper, Opteron) get no tier. Chips without a tier stay offered in the builder but are never auto-picked.',
  '10. F/KF twins (owner 2026-10-26): only when the maker\'s pages show the same cores, threads, clocks and cache. intel.com was refused by the permission system on the first download, so no Intel twin is used; no AMD F chip in the data has a non-F twin with a tier. No twin rows exist.',
  '',
  'A graphics chip counts as covered when every memory size of it in the data has a tier (at one resolution or more).',
  '',
];

for (const kind of ['cpu', 'gpu'] as const) {
  const { chips, q, qs } = quarters(kind);
  const has = (it: Item) => !!rowOf(it);
  const label = kind === 'cpu' ? 'Desktop CPU chips (AM5/AM4/LGA1851/LGA1700/LGA1200/LGA1151, no server chips)' : 'Consumer GPU chips (no workstation cards)';
  lines.push(`## ${kind.toUpperCase()}`, '', `${label}: ${chips.length}; a quarter = ${q} chips.`, '', '| Quarter | Chips | Listings | With a tier | Without |', '| --- | ---: | --- | ---: | ---: |');
  let tot = 0;
  qs.forEach((part, i) => {
    if (!part.length) return;
    const cov = part.filter((c) => covered(kind, c, has)).length;
    tot += cov;
    lines.push(`| ${i + 1} | ${part.length} | ${part[0].n}–${part[part.length - 1].n} | ${cov} | ${part.length - cov} |`);
  });
  lines.push(`| **All** | **${chips.length}** | | **${tot}** | **${chips.length - tot}** |`, '');
  lines.push('### Most-listed quarter (the gate)', '');
  if (kind === 'cpu') {
    lines.push('| Chip | Listings | Tier | Note |', '| --- | ---: | --- | --- |');
    for (const c of qs[0]) {
      const r = rowOf({ kind, chip: c.chip });
      lines.push(`| ${c.chip} | ${c.n} | ${tierText(r)} | ${r ? '' : listed({ kind, chip: c.chip }) ? 'no two sources within 1 tier (owner list)' : 'fewer than two sources rank it (see tier-derivation.md)'} |`);
    }
  } else {
    lines.push('| Chip | Memory | Listings | Tier 1080p / 1440p / 4K | Note |', '| --- | ---: | ---: | --- | --- |');
    for (const c of qs[0]) {
      for (const v of c.variants) {
        const it = { kind, chip: c.chip, vram: v.vram };
        const r = rowOf(it);
        lines.push(`| ${c.chip} | ${v.vram} GB | ${v.n} | ${tierText(r)} | ${r ? '' : listed(it) ? 'no two sources within 1 tier (owner list)' : 'fewer than two sources measure this memory size (see tier-derivation.md)'} |`);
      }
    }
  }
  lines.push('');
  const others = TIERS.filter((r) => r.kind === kind && !qs[0].some((c) => r.chips.includes(c.chip)));
  lines.push('### Other rows', '', '| Chip | Tier |', '| --- | --- |',
    ...others.map((r) => `| ${r.chips.join(', ')}${r.kind === 'gpu' ? ` ${r.vram} GB` : ''} | ${tierText(r)} |`), '');
}
lines.push('## For the owner: no two sources within 1 tier', '', '| Kind | Chip | Tiers per source |', '| --- | --- | --- |',
  ...(TIER_DISAGREE.length ? TIER_DISAGREE.map((d) => `| ${d.kind} | ${d.chip}${d.vram ? ` ${d.vram} GB` : ''} | ${SOURCE_ORDER.filter((s) => d.bySource[s] !== undefined).map((s) => `${NAME[s]} ${fmt(d.bySource[s])}`).join('; ')} |`) : ['| none | | |']), '');

mkdirSync(DOCS, { recursive: true });
writeFileSync(join(DOCS, 'tier-coverage.md'), lines.join('\n'));
for (const kind of ['cpu', 'gpu'] as const) {
  const { qs } = quarters(kind);
  console.log(`${kind}: quarter 1 ${qs[0].filter((c) => covered(kind, c, (it) => !!rowOf(it))).length}/${qs[0].length} with a tier (table)`);
}
console.log(`-> ${join(DOCS, 'tier-coverage.md')}`);

// ---------- derivation from the pages ----------
const pages = arg('--pages');
if (pages) {
  const derived = { cpu: deriveCpu(pages), gpu: deriveGpu(pages) };
  // Gate per step: Tom's + PCGH (fix round; step 1 adds no twin rows), then all three (step 2).
  for (const [step, use] of [["Tom's + PCGH", ['toms', 'pcgh']], ["Tom's + PCGH + ComputerBase", SOURCE_ORDER]] as [string, SourceId[]][]) {
    for (const kind of ['cpu', 'gpu'] as const) {
      const { qs } = quarters(kind);
      const has = (it: Item) => !!verdict(derived[kind], { ...it, n: 0 }, use).row;
      const missing = qs[0].filter((c) => !covered(kind, c, has)).map((c) => c.chip);
      console.log(`gate [${step}] ${kind}: quarter 1 ${qs[0].length - missing.length}/${qs[0].length}, all ${CHIPS[kind].filter((c) => covered(kind, c, has)).length}/${CHIPS[kind].length}`);
    }
  }

  const out: string[] = [
    '# Performance tiers: derivation per chip',
    '',
    'Regenerated by `npm run tiers:coverage -- --pages <dir>` from the pages listed in `tier-coverage.md` (not in the repo). Our tier from each source (CPU: one number; GPU: 1080p / 1440p / 4K), then the stored tier and the pair that gave it. Only our tier numbers appear here, never the sources\' scores.',
    '',
    'Tom\'s legacy CPU tables (page 2) are not used: their scores are on 2020–2022 baselines that do not contain the reference chip, and putting them on the 2026 scale would need a rescaling the owner rules out (only values the pages state). This removed Core i9-12900K, Ryzen 7 5700X, 5800X, 5800X3D and Ryzen 9 5950X, which the first version had rescaled. A CPU that Tom\'s ranks only there is marked "Tom\'s only in its legacy tables, not used".',
    '',
  ];
  const rows: TierRow[] = [];
  const dis: TierDisagreement[] = [];
  for (const kind of ['cpu', 'gpu'] as const) {
    const d = derived[kind];
    const vs = items(kind).map((it) => verdict(d, it, SOURCE_ORDER));
    const ranked = vs.filter((v) => Object.keys(v.by).length > 0);
    out.push(`## ${kind.toUpperCase()}`, '', ...d.notes.map((n) => `- ${n}`), '');
    const pairText = (v: Verdict) => [...new Set(Object.values(v.pairs ?? {}).map((p) => p.map((s) => NAME[s]).join(' + ')))].join('; ');
    out.push(kind === 'cpu' ? "| Chip | Listings | Tom's | PCGH | CB | Stored | Pair / why |" : "| Chip | Memory | Listings | Tom's | PCGH | CB | Stored | Pair / why |",
      kind === 'cpu' ? '| --- | ---: | --- | --- | --- | --- | --- |' : '| --- | ---: | ---: | --- | --- | --- | --- | --- |');
    const one = (t: Tiers | undefined) => (kind === 'cpu' ? String(t?.['1080p'] ?? '—') : fmt(t));
    for (const v of ranked) {
      const cells = [v.it.chip, ...(kind === 'gpu' ? [`${v.it.vram} GB`] : []), v.it.n, one(v.by.toms), one(v.by.pcgh), one(v.by.cb), v.row ? one(v.row) : '—', v.row ? pairText(v) : v.why];
      out.push(`| ${cells.join(' | ')} |`);
      if (v.row) {
        const used = SOURCE_ORDER.filter((s) => Object.values(v.pairs!).some((p) => p.includes(s)));
        const sources = used.map((s) => SOURCES[kind][s]);
        if (kind === 'cpu') {
          const threads = d.threads.get(v.it.chip);
          rows.push({ kind, chips: [v.it.chip], tier: v.row['1080p']!, ...(v.it.cores ? { cores: v.it.cores } : {}), ...(threads ? { threads } : {}), sources });
        } else rows.push({ kind, chips: [v.it.chip], vram: v.it.vram!, tier: v.row, sources });
      } else if (v.why?.startsWith('no two sources')) {
        const bySource: TierDisagreement['bySource'] = {};
        for (const s of SOURCE_ORDER) if (v.by[s]) bySource[s] = kind === 'cpu' ? v.by[s]!['1080p'] : v.by[s];
        dis.push({ kind, chip: v.it.chip, ...(kind === 'gpu' ? { vram: v.it.vram } : {}), bySource });
      }
    }
    const tiered = ranked.filter((v) => v.row);
    const pairCount = (a: SourceId, b: SourceId) => tiered.filter((v) => Object.values(v.pairs!).some((p) => p[0] === a && p[1] === b)).length;
    const exact1 = tiered.filter((v) => Object.entries(v.pairs!).some(([res, p]) => Math.abs(v.by[p[0]]![res as Res]! - v.by[p[1]]![res as Res]!) === 1)).length;
    const unranked = items(kind).length - ranked.length;
    const legacy = vs.filter((v) => !Object.keys(v.by).length && d.legacyOnly.has(v.it.chip)).map((v) => v.it.chip);
    if (legacy.length) out.push('', `Ranked by no source used, but named in Tom's legacy tables (not used; some rows there have no value):${legacy.join(', ')}.`);
    out.push('', `${tiered.length} ${kind === 'cpu' ? 'chips' : 'cards (chip + memory size)'} with a tier; pairs used: Tom's + PCGH ${pairCount('toms', 'pcgh')}, Tom's + CB ${pairCount('toms', 'cb')}, PCGH + CB ${pairCount('pcgh', 'cb')}; ${exact1} of them with a pair that differs by exactly 1 (lower kept). Owner list: ${dis.filter((x) => x.kind === kind).length}. ${unranked} more in the data are ranked by no source.`, '');
    console.log(`${kind}: ${tiered.length} tiered (pairs T+P ${pairCount('toms', 'pcgh')}, T+CB ${pairCount('toms', 'cb')}, P+CB ${pairCount('pcgh', 'cb')}), exact-1 ${exact1}, owner list: ${dis.filter((x) => x.kind === kind).map((x) => x.chip + (x.vram ? ` ${x.vram}GB` : '')).join(', ') || 'none'}`);
  }
  writeFileSync(join(DOCS, 'tier-derivation.md'), out.join('\n'));
  console.log(`-> ${join(DOCS, 'tier-derivation.md')}`);

  rows.sort((a, b) => (a.kind !== b.kind ? (a.kind === 'cpu' ? -1 : 1) : a.chips[0] !== b.chips[0] ? (a.chips[0] < b.chips[0] ? -1 : 1) : (a.kind === 'gpu' && b.kind === 'gpu' ? a.vram - b.vram : 0)));
  const sig = (r: TierRow) => JSON.stringify({ t: r.tier, c: r.kind === 'cpu' ? r.cores : undefined, th: r.kind === 'cpu' ? r.threads : undefined, s: r.sources.map((s) => s.url) });
  const k = (r: { kind: string; chips?: string[]; chip?: string; vram?: number }) => `${r.kind}:${r.chips?.[0] ?? r.chip}:${r.vram ?? ''}`;
  const want = new Map(rows.map((r) => [k(r), sig(r)])), have = new Map(TIERS.map((r) => [k(r), sig(r)]));
  let mismatches = 0;
  for (const key of new Set([...want.keys(), ...have.keys()])) if (want.get(key) !== have.get(key)) { mismatches++; console.log(`MISMATCH ${key}: table ${have.get(key) ?? '-'} vs pages ${want.get(key) ?? '-'}`); }
  const wantD = new Map(dis.map((x) => [k(x), JSON.stringify(x.bySource)])), haveD = new Map(TIER_DISAGREE.map((x) => [k(x), JSON.stringify(x.bySource)]));
  for (const key of new Set([...wantD.keys(), ...haveD.keys()])) if (wantD.get(key) !== haveD.get(key)) { mismatches++; console.log(`MISMATCH disagreement ${key}`); }

  const emit = arg('--emit');
  if (emit) {
    const names: Record<string, string> = { [TOMS_GPU.url]: 'TOMS_GPU', [PCGH_GPU.url]: 'PCGH_GPU', [CB_GPU.url]: 'CB_GPU', [TOMS_CPU.url]: 'TOMS_CPU', [PCGH_CPU.url]: 'PCGH_CPU', [CB_CPU.url]: 'CB_CPU' };
    const t = (x: Tiers) => `{ ${RESOLUTIONS.filter((r) => x[r] !== undefined).map((r) => `'${r}': ${x[r]}`).join(', ')} }`;
    const v = (x: number | Tiers) => (typeof x === 'number' ? String(x) : t(x));
    const ts = [
      'export const TIERS: TierRow[] = [',
      ...rows.map((r) => (r.kind === 'cpu'
        ? `  { kind: 'cpu', chips: ['${r.chips[0]}'], tier: ${r.tier}${r.cores ? `, cores: ${r.cores}` : ''}${r.threads ? `, threads: ${r.threads}` : ''}, sources: [${r.sources.map((s) => names[s.url]).join(', ')}] },`
        : `  { kind: 'gpu', chips: ['${r.chips[0]}'], vram: ${r.vram}, tier: ${t(r.tier)}, sources: [${r.sources.map((s) => names[s.url]).join(', ')}] },`)),
      '];',
      '',
      'export const TIER_DISAGREE: TierDisagreement[] = [',
      ...dis.map((x) => `  { kind: '${x.kind}', chip: '${x.chip}'${x.vram ? `, vram: ${x.vram}` : ''}, bySource: { ${SOURCE_ORDER.filter((s) => x.bySource[s] !== undefined).map((s) => `${s}: ${v(x.bySource[s]!)}`).join(', ')} } },`),
      '];',
      '',
    ];
    writeFileSync(emit, ts.join('\n'));
    console.log(`rows -> ${emit}`);
  } else if (mismatches) {
    console.error(`${mismatches} row(s) of tiers.ts differ from the pages`);
    process.exit(1);
  } else console.log('tiers.ts matches the pages');
}
