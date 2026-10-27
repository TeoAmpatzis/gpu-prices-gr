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
//   pcgh-review-*.html/.json, cb-review-*.html   single-chip CPU reviews (REVIEWS below has every file and URL)
//   wiki-*.html                  English Wikipedia processor lists (WIKI below), for the F/KF twin check
//
// METHOD (the same for every source; steps 9 and 10 here are steps 10 and 11 in tier-coverage.md):
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
//      counts only when the chip has ONE memory size in public/data/gpu (owner, M-A 2026-10-26: Tom's tested one
//      product, and a chip sold in two sizes is two products); otherwise that source gives the chip nothing.
//   6. Several values for one product in one source (ComputerBase memory setups, review setups): the lowest.
//   7. pickTier: pairs Tom's+PCGH, Tom's+CB, PCGH+CB in that order; the first within 1 tier gives the lower of the
//      two; ≥ 2 sources but no pair within 1 → TIER_DISAGREE (GPU: at any resolution); 1 source → no tier.
//   8. Workstation GPUs, Titans and Xeon/EPYC/Threadripper/Opteron get no row.
//   9. Single-chip reviews (owner step 1, 2026-10-26), CPUs: when a site's ranking lacks a chip, that site's own
//      review of the chip (the chip named in the review's title or headline, REVIEWS) can give the site's value. The
//      review's gaming result must be a CPU-limit measurement (the page says 720p, 1.280 × 720, "CPU-Limit" or
//      "so niedrig wie möglich"), like the rankings. ANCHOR = a chip in both the review's gaming result and the same
//      site's ranking, not on the ranking with two different test setups (ComputerBase's DDR4/single-channel rows),
//      the closest to the chip in the review (smallest |ln(anchor ÷ chip)|, ties by name). share = chip ÷ anchor in
//      the review × anchor ÷ reference in the ranking; then the same 10 % bands. A site counts once per chip: its
//      ranking value when the ranking has the chip, else its first review in REVIEWS with an anchor. Tom's Hardware
//      reviews are not used: their charts are images (no value a script can re-read).
//  10. F/KF twins (owner step 2, 2026-10-26): an F/KF chip with no tier of its own takes its non-F twin's row (tier
//      and sources) when the twin has a tier of its own and an English Wikipedia spec table (WIKI) lists both with
//      identical cores, threads, base clocks, boost clocks, L2 and L3 cache (every such column of the table). A table
//      without an L2 column cannot show that, so it gives no twin.
//
// "Quarter" = desktop CPU chips (sockets AM5/AM4/LGA1851/LGA1700/LGA1200/LGA1151, no server chips) or consumer GPU
// chips (no workstation cards) ranked by listings, most first (ties by name); quarter 1 = the first ceil(n/4).
// A GPU chip counts as covered when every memory size of it in the data has a tier at one resolution or more.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CB_CPU, CB_GPU, PCGH_CPU, PCGH_GPU, RESOLUTIONS, SOURCE_ORDER, TIERS, TIER_DISAGREE, TOMS_CPU, TOMS_GPU,
  pickTier, tierFromShare, type Res, type SourceId, type TierDisagreement, type TierRow, type TierSource, type TierTwin,
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
interface Derived { shares: Shares; threads: Map<string, number>; legacyOnly: Set<string>; notes: string[]; reviews?: ReviewData[]; ambiguous?: Record<SourceId, Set<string>> }
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
  // Anchors (method step 9): a ranking chip shown with two different test setups is not an anchor.
  const ambiguous: Record<SourceId, Set<string>> = { toms: new Set(), pcgh: new Set(), cb: new Set() };
  const setups = new Map<string, Set<string>>();
  for (const c of charts) for (const r of c.rows) { const m = chipIn(r.label); if (m) setups.set(m.chip, (setups.get(m.chip) ?? new Set()).add(m.setup)); }
  for (const [chip, s] of setups) if (s.size > 1) ambiguous.cb.add(chip);
  const reviews = REVIEWS.map((r) => readReview(dir, r));
  notes.push(`Single-chip reviews: ${reviews.length} (PCGH ${reviews.filter((r) => r.r.site === 'pcgh').length}, ComputerBase ${reviews.filter((r) => r.r.site === 'cb').length}); ComputerBase ranking chips with two test setups (no anchor): ${[...ambiguous.cb].sort().join(', ')}`);
  return { shares, threads, legacyOnly, notes, reviews, ambiguous };
}

// ---------- single-chip reviews (method step 9) ----------
interface Review {
  site: 'pcgh' | 'cb';
  /** The review article (stored as the row's source URL). */
  url: string;
  /** Saved files: [0] = a page of the article whose title/headline names the subjects; the data file is `data`. */
  pages: string[];
  /** PCGH: the benchmark widget JSON; ComputerBase: the article page with the charts. */
  data: string;
  /** PCGH: the benchmark's name; ComputerBase: the chart title (the review's gaming result, CPU limit). */
  table: RegExp;
  /** The chips the review is about (each must be named in the title or headline). */
  subjects: string[];
}
const PCGH = 'https://www.pcgameshardware.de';
const CB = 'https://www.computerbase.de/artikel/prozessoren';
const REVIEWS: Review[] = [
  { site: 'pcgh', url: `${PCGH}/Core-i5-14400-CPU-280143/Tests/Intel-vs-12400f-14500-14600-Benchmark-Review-1444317/`, pages: ['pcgh-review-1444317.html', 'pcgh-review-1444317-5.html'], data: 'pcgh-review-1444317-3360.json', table: /^CPU-Index 2024,14400/, subjects: ['Core i5-14400', 'Core i5-14500', 'Core i5-14600'] },
  { site: 'pcgh', url: `${PCGH}/Core-i5-12400-CPU-278099/Tests/vs-5600-X-Benchmark-Review-kaufen-Preis-1387603/`, pages: ['pcgh-review-1387603.html'], data: 'pcgh-review-1387603-2080.json', table: /CPU-Index \(Spiele\)/, subjects: ['Core i5-12400'] },
  { site: 'pcgh', url: `${PCGH}/Core-i7-12700-CPU-278090/Tests/Preis-Benchmark-vs-Ryzen-7-5800X-1389670/`, pages: ['pcgh-review-1389670.html'], data: 'pcgh-review-1389670-2099.json', table: /CPU-Index \(Spiele\)/, subjects: ['Core i7-12700'] },
  { site: 'pcgh', url: `${PCGH}/Alder-Lake-S-Codename-277726/Tests/Release-Benchmark-Core-i9-12900K-Core-i5-12600K-1382613/`, pages: ['pcgh-review-1382613.html'], data: 'pcgh-review-1382613-1919.json', table: /^CPU-Leistungsindex 2021$/, subjects: ['Core i9-12900K', 'Core i5-12600K'] },
  { site: 'pcgh', url: `${PCGH}/Ryzen-9-7900-CPU-279362/Tests/AMD-Ryzen-7900-7700-7600-non-X-Benchmark-Review-1410740/`, pages: ['pcgh-review-1410740.html'], data: 'pcgh-review-1410740-2396.json', table: /Index \(Spiele\)/, subjects: ['Ryzen 9 7900', 'Ryzen 7 7700', 'Ryzen 5 7600'] },
  { site: 'pcgh', url: `${PCGH}/Ryzen-5-7600X-CPU-279082/Tests/AMD-Ryzen-7600X-Review-Test-1404300/`, pages: ['pcgh-review-1404300.html'], data: 'pcgh-review-1404300-2268.json', table: /CPU-Index \(Spiele\)/, subjects: ['Ryzen 5 7600X'] },
  { site: 'pcgh', url: `${PCGH}/Ryzen-7-5700X-CPU-278283/Tests/5600-5500-Release-Benchmark-Preis-vs-5800x-1393445/`, pages: ['pcgh-review-1393445.html'], data: 'pcgh-review-1393445-2160.json', table: /CPU-Index \(Spiele\)/, subjects: ['Ryzen 7 5700X', 'Ryzen 5 5600', 'Ryzen 5 5500'] },
  { site: 'pcgh', url: `${PCGH}/Ryzen-7-5700G-CPU-277698/Tests/AMD-Ryzen-7-5700G-Vega-APU-Review-1376578/`, pages: ['pcgh-review-1376578.html'], data: 'pcgh-review-1376578-1788.json', table: /^CPU-Leistungsindex 2021$/, subjects: ['Ryzen 7 5700G'] },
  { site: 'pcgh', url: `${PCGH}/Ryzen-7-8700F-CPU-280504/Tests/APU-Mobile-Desktop-Phoenix-Review-1450790/`, pages: ['pcgh-review-1450790.html'], data: 'pcgh-review-1450790-3478.json', table: /^Spiele-Index CPUs 2024$/, subjects: ['Ryzen 7 8700F', 'Ryzen 5 8400F'] },
  { site: 'cb', url: `${CB}/intel-core-i5-14400f-14500-cpu-test.86571/`, pages: ['cb-review-86571-3.html'], data: 'cb-review-86571-3.html', table: /^Leistungsrating FPS$/, subjects: ['Core i5-14400F', 'Core i5-14500'] },
  { site: 'cb', url: `${CB}/intel-core-i5-12400-12500-test.79266/`, pages: ['cb-review-79266-2.html'], data: 'cb-review-79266-2.html', table: /^Performancerating FPS – 1\.280 × 720$/, subjects: ['Core i5-12400', 'Core i5-12500'] },
  { site: 'cb', url: `${CB}/intel-core-i9-12900k-i7-12700k-i5-12600k-test.78382/`, pages: ['cb-review-78382-6.html'], data: 'cb-review-78382-6.html', table: /^Performancerating FPS – 1\.280 × 720 Bildpunkte$/, subjects: ['Core i9-12900K', 'Core i7-12700K', 'Core i5-12600K'] },
  { site: 'cb', url: `${CB}/intel-core-i9-14900ks-test.87292/`, pages: ['cb-review-87292-2.html'], data: 'cb-review-87292-2.html', table: /^Leistungsrating FPS$/, subjects: ['Core i9-14900KS'] },
  { site: 'cb', url: `${CB}/intel-core-ultra-5-225f-235-test.92075/`, pages: ['cb-review-92075-2.html'], data: 'cb-review-92075-2.html', table: /^Leistungsrating – Durchschnitts-FPS$/, subjects: ['Core Ultra 5 225F', 'Core Ultra 5 235'] },
  { site: 'cb', url: `${CB}/ryzen-7000-65-watt-test.82790/`, pages: ['cb-review-82790.html'], data: 'cb-review-82790.html', table: /^Performancerating – Rasterizer, AVG-FPS$/, subjects: ['Ryzen 9 7900', 'Ryzen 7 7700', 'Ryzen 5 7600'] },
  { site: 'cb', url: `${CB}/amd-ryzen-5000-test.74008/`, pages: ['cb-review-74008-4.html'], data: 'cb-review-74008-4.html', table: /^Performancerating \(FPS\) – 1\.280 × 720 Bildpunkte$/, subjects: ['Ryzen 9 5950X', 'Ryzen 9 5900X', 'Ryzen 7 5800X', 'Ryzen 5 5600X'] },
  { site: 'cb', url: `${CB}/amd-ryzen-7-5700x-ryzen-5-5500-test.80254/`, pages: ['cb-review-80254-2.html'], data: 'cb-review-80254-2.html', table: /^Performancerating FPS – 1\.280 × 720$/, subjects: ['Ryzen 7 5700X', 'Ryzen 5 5500'] },
  { site: 'cb', url: `${CB}/amd-ryzen-5600g-5700g-test.77324/`, pages: ['cb-review-77324-2.html'], data: 'cb-review-77324-2.html', table: /^Performancerating FPS – 1\.280 × 720 Bildpunkte$/, subjects: ['Ryzen 5 5600G', 'Ryzen 7 5700G'] },
  { site: 'cb', url: `${CB}/amd-ryzen-5-8400f-7500f-b850-test.91043/`, pages: ['cb-review-91043-2.html'], data: 'cb-review-91043-2.html', table: /^Leistungsrating – Durchschnitts-FPS$/, subjects: ['Ryzen 5 8400F', 'Ryzen 5 7500F'] },
];
const REVIEW_CHECKED = '2026-10-26';
const CPU_LIMIT = /720p|1\.280 × 720|CPU-Limit|So niedrig wie möglich/;

/** A CPU name inside a review/ranking label, and the rest of the label (its test setup). */
const CPU_IN = /(Core Ultra [3579] \d{3}[A-Z]*|Core i[3579][- ]\d{4,5}[A-Z]*|Ryzen [3579] \d{4}[A-Z0-9]*|Athlon \d{3,4}[A-Z]*|Pentium G\d{4}[A-Z]*)/;
function chipIn(label: string): { chip: string; setup: string } | undefined {
  const m = CPU_IN.exec(label);
  if (!m) return undefined;
  const setup = label.replace(m[1], '').replace(/^\s*(Intel|AMD)\s+/, '').replace(/\bDual[- ]Chan\b/, '').replace(/\s+/g, ' ').trim();
  return { chip: m[1].replace(/^(Core i\d) /, '$1-'), setup };
}

interface ReviewData { r: Review; values: Scores; heading: string }
function readReview(dir: string, r: Review): ReviewData {
  const files = [...r.pages, r.data].map((f) => readFileSync(join(dir, f), 'utf8'));
  const head = files[0];
  const named = [(/<title>([^<]*)/.exec(head) ?? [])[1] ?? '', ...[...head.matchAll(/"(?:headline|alternativeHeadline)"\s*:\s*"([^"]*)"/g)].map((m) => m[1])].join(' | ');
  for (const s of r.subjects) {
    const model = s.split(/[ -]/).pop()!;
    if (!new RegExp(`\\b${model}\\b`).test(named)) throw new Error(`review ${r.url}: "${model}" is not in its title/headline (${named})`);
  }
  if (!files.some((f) => CPU_LIMIT.test(f))) throw new Error(`review ${r.url}: no CPU-limit / 720p statement in its files`);
  const values: Scores = new Map();
  let heading = '';
  if (r.site === 'pcgh') {
    const j = JSON.parse(files[files.length - 1]) as { benchmarks: { name: string; units: string[]; data: { name: string; result: Record<string, string[]> }[] }[] };
    const b = j.benchmarks.find((x) => r.table.test(x.name));
    if (!b) throw new Error(`review ${r.url}: benchmark ${r.table} not found`);
    const g = b.units.findIndex((u) => /Gaming|Spiele/i.test(u));
    const col = g >= 0 ? g : 0;
    for (const row of b.data) { const m = chipIn(row.name); if (m) put(values, m.chip, Number(row.result['1']?.[col])); }
    heading = `${b.name}${b.units.length > 1 ? ` (${b.units[col]})` : ''}`;
  } else {
    const c = cbCharts(files[files.length - 1]).find((x) => r.table.test(x.title));
    if (!c) throw new Error(`review ${r.url}: chart ${r.table} not found`);
    for (const row of c.rows) { const m = chipIn(row.label); if (m) put(values, m.chip, row.value); }
    heading = c.title;
  }
  for (const s of r.subjects) if (!values.has(s)) throw new Error(`review ${r.url}: subject ${s} not in "${heading}"`);
  return { r, values, heading };
}

interface ReviewTier { share: number; url: string; anchor: string }
/** Method step 9: the site's value for a chip its ranking lacks, from its first review of the chip with an anchor. */
function reviewShare(d: Derived, chip: string, s: SourceId): ReviewTier | undefined {
  const ranking = d.shares[s]['1080p'];
  if (!ranking || !d.reviews) return undefined;
  for (const rv of d.reviews) {
    if (rv.r.site !== s || !rv.r.subjects.includes(chip)) continue;
    const v = rv.values.get(chip)!;
    const anchors = [...rv.values.entries()]
      .filter(([c]) => c !== chip && ranking.has(c) && !d.ambiguous![s].has(c))
      .sort((a, b) => Math.abs(Math.log(a[1] / v)) - Math.abs(Math.log(b[1] / v)) || (a[0] < b[0] ? -1 : 1));
    if (!anchors.length) continue;
    const [anchor, a] = anchors[0];
    return { share: (v / a) * ranking.get(anchor)!, url: rv.r.url, anchor };
  }
  return undefined;
}

// ---------- F/KF twins from English Wikipedia (method step 10) ----------
const WIKI: { url: string; file: string }[] = [
  { url: 'https://en.wikipedia.org/wiki/List_of_Intel_Core_processors', file: 'wiki-list-of-intel-core-processors.html' },
  { url: 'https://en.wikipedia.org/wiki/Arrow_Lake_(microprocessor)', file: 'wiki-arrow-lake.html' },
  { url: 'https://en.wikipedia.org/wiki/Raptor_Lake', file: 'wiki-raptor-lake.html' },
  { url: 'https://en.wikipedia.org/wiki/Alder_Lake', file: 'wiki-alder-lake.html' },
  { url: 'https://en.wikipedia.org/wiki/List_of_AMD_Ryzen_processors', file: 'wiki-list-of-amd-ryzen-processors.html' },
];
const WIKI_CHECKED = '2026-10-26';
const wikiText = (s: string) => s.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<br\s*\/?>/g, ' ')
  .replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g, ' ').replace(/&#160;|&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8202;|&#8239;/g, '').replace(/\s+/g, ' ').trim();
interface WikiTable { url: string; caption: string; labels: string[]; rows: string[][] }
/** Wikipedia tables as grids (rowspan/colspan expanded); header rows (only <th>) become one label per column. */
function wikiTables(url: string, html: string): WikiTable[] {
  return [...html.matchAll(/<table[\s\S]*?<\/table>/g)].map((m) => {
    const grid: { th: boolean; text: string }[][] = [];
    const pending = new Map<string, { th: boolean; text: string }>();
    [...m[0].matchAll(/<tr[\s\S]*?<\/tr>/g)].forEach((tr, ri) => {
      const row: { th: boolean; text: string }[] = [];
      const cells = [...tr[0].matchAll(/<t([hd])((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/t[hd]>/g)];
      let ci = 0, k = 0;
      while (k < cells.length || pending.has(`${ri},${ci}`)) {
        const p = pending.get(`${ri},${ci}`);
        if (p) { row.push(p); pending.delete(`${ri},${ci}`); ci++; continue; }
        const [, tag, attr, body] = cells[k++];
        const cs = Number(/colspan="?(\d+)/.exec(attr)?.[1] ?? 1), rs = Number(/rowspan="?(\d+)/.exec(attr)?.[1] ?? 1);
        const cell = { th: tag === 'h', text: wikiText(body) };
        for (let c = 0; c < cs; c++, ci++) {
          row.push(cell);
          for (let r = 1; r < rs; r++) pending.set(`${ri + r},${ci}`, cell);
        }
      }
      grid.push(row);
    });
    const nHead = grid.findIndex((r) => r.some((c) => !c.th));
    const head = grid.slice(0, Math.max(0, nHead));
    const width = Math.max(0, ...grid.map((r) => r.length));
    const labels = Array.from({ length: width }, (_, i) => [...new Set(head.map((r) => r[i]?.text ?? ''))].join(' / '));
    const caption = wikiText((/<caption[^>]*>([\s\S]*?)<\/caption>/.exec(m[0]) ?? [])[1] ?? '');
    return { url, caption, labels, rows: grid.slice(Math.max(0, nHead)).map((r) => r.map((c) => c.text)) };
  });
}
const EXCLUDED_COL = /GPU|[Gg]raphics|Arc |NPU|TDP|Power|Price|Release|Launch|Socket|EUs/;
type TwinCheck = { twin?: TierTwin; why: string };
/** Method step 10 for one F/KF chip and its non-F twin. */
function twinCheck(tables: WikiTable[], chip: string, base: string): TwinCheck {
  const find = (t: WikiTable, name: string) => t.rows.find((r) => r.length > 2 && [`${r[0]} ${r[1]}`, `${r[0]}-${r[1]}`].includes(name));
  const both = tables.filter((t) => find(t, chip) && find(t, base));
  if (!both.length) return { why: 'not in a Wikipedia table with its twin' };
  const notes: string[] = [];
  for (const t of both) {
    const cols = t.labels.map((l, i) => ({ l, i })).filter(({ l }) => !EXCLUDED_COL.test(l));
    const cores = cols.filter(({ l }) => /Cores/i.test(l));
    const base_ = cols.filter(({ l }) => /Clock/i.test(l) && /Base/i.test(l));
    const boost = cols.filter(({ l }) => /Clock/i.test(l) && /Turbo|Boost/i.test(l));
    const l2 = cols.filter(({ l }) => /\bL2\b/.test(l));
    const l3 = cols.filter(({ l }) => /\bL3\b|Smart cache/i.test(l));
    if (!cores.length || !base_.length || !boost.length || !l2.length || !l3.length) {
      notes.push(`${t.url}${t.caption ? ` (${t.caption.slice(0, 60)})` : ''}: no ${[!cores.length && 'cores', !base_.length && 'base clock', !boost.length && 'boost clock', !l2.length && 'L2', !l3.length && 'L3'].filter(Boolean).join('/')} column`);
      continue;
    }
    const a = find(t, chip)!, b = find(t, base)!;
    const diff = [...cores, ...base_, ...boost, ...l2, ...l3].filter(({ i }) => a[i] !== b[i]);
    if (diff.length) return { why: `differs in ${diff.map(({ l, i }) => `${l} (${a[i]} vs ${b[i]})`).join('; ')} (${t.url})` };
    if (!/\(\d+\)/.test(cores.map(({ i }) => a[i]).join(' '))) { notes.push(`${t.url}: no threads`); continue; }
    return { twin: { chip: base, urls: [t.url], checked: WIKI_CHECKED }, why: `identical cores (threads), base/boost clocks, L2, L3 (${t.url})` };
  }
  return { why: notes.join('; ') };
}

// ---------- verdicts ----------
interface Item { kind: Kind; chip: string; vram?: number; n: number; cores?: number }
const items = (kind: Kind): Item[] => CHIPS[kind].flatMap((c) => (kind === 'cpu'
  ? [{ kind, chip: c.chip, n: c.n, cores: c.cores }]
  : c.variants.map((v) => ({ kind, chip: c.chip, vram: v.vram, n: v.n }))));
/** Memory sizes of a GPU chip in today's data (method step 5: an unsized row counts only for a one-size chip). */
const sizesOf = (chip: string) => CHIPS.gpu.find((c) => c.chip === chip)?.variants.length ?? 0;

function sourceTiers(d: Derived, it: Item, s: SourceId, reviews: boolean): { t: Tiers; via?: ReviewTier } {
  const out: Tiers = {};
  for (const res of it.kind === 'cpu' ? (['1080p'] as Res[]) : RESOLUTIONS) {
    const m = d.shares[s][res];
    if (!m) continue;
    let v: number | undefined;
    if (it.kind === 'cpu') v = m.get(it.chip);
    else {
      v = m.get(`${it.chip}|${it.vram}`);
      const sized = [...m.keys()].some((k) => k.startsWith(`${it.chip}|`) && !k.endsWith('|*'));
      if (v === undefined && !sized && sizesOf(it.chip) === 1) v = m.get(`${it.chip}|*`);
    }
    if (v !== undefined) out[res] = tierFromShare(v);
  }
  // Method step 9: the site's ranking lacks the chip → the site's own review, through an anchor (CPUs only).
  if (it.kind === 'cpu' && reviews && out['1080p'] === undefined) {
    const via = reviewShare(d, it.chip, s);
    if (via) return { t: { '1080p': tierFromShare(via.share) }, via };
  }
  return { t: out };
}

interface Verdict {
  it: Item; by: Partial<Record<SourceId, Tiers>>; via: Partial<Record<SourceId, ReviewTier>>; row?: Tiers;
  pairs?: Partial<Record<Res, [SourceId, SourceId]>>; why?: string; twin?: TierTwin; twinOf?: Verdict;
}
function verdict(d: Derived, it: Item, use: SourceId[], reviews = true): Verdict {
  const by: Partial<Record<SourceId, Tiers>> = {}, via: Partial<Record<SourceId, ReviewTier>> = {};
  for (const s of use) {
    const r = sourceTiers(d, it, s, reviews);
    if (Object.keys(r.t).length) by[s] = r.t;
    if (r.via) via[s] = r.via;
  }
  const n = Object.keys(by).length;
  if (n < 2) {
    let why = n ? `only ${NAME[Object.keys(by)[0] as SourceId]} ranks it` : 'no source ranks it';
    if (it.kind === 'cpu' && !by.toms && d.legacyOnly.has(it.chip)) why += " (Tom's only in its legacy tables, not used)";
    return { it, by, via, why };
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
  if (disagree) return { it, by, via, why: 'no two sources within 1 tier (owner list)' };
  if (!Object.keys(row).length) return { it, by, via, why: 'no resolution measured by two sources' };
  return { it, by, via, row, pairs };
}

/** The non-F twin's name of an F/KF chip (Intel 12400F → 12400, 12600KF → 12600K; AMD 5500F → 5500). */
const nonF = (chip: string) => (/\d[A-Z]*F$/.test(chip) ? chip.replace(/KF$/, 'K').replace(/(\d)F$/, '$1') : undefined);
/** Method step 10 over all CPU verdicts: an F/KF chip without a row takes its non-F twin's row when Wikipedia agrees. */
function applyTwins(vs: Verdict[], tables: WikiTable[]): Map<string, TwinCheck> {
  const checks = new Map<string, TwinCheck>();
  for (const v of vs) {
    const base = nonF(v.it.chip);
    if (v.row || !base || v.why?.startsWith('no two sources')) continue;
    const b = vs.find((x) => x.it.chip === base);
    if (!b?.row) { checks.set(v.it.chip, { why: b ? `twin ${base} has no tier` : `twin ${base} not in the data` }); continue; }
    const c = twinCheck(tables, v.it.chip, base);
    checks.set(v.it.chip, c);
    if (c.twin) { v.row = b.row; v.pairs = b.pairs; v.twin = c.twin; v.twinOf = b; }
  }
  return checks;
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
  `| CPU | Single-chip reviews by PC Games Hardware and ComputerBase (method step 10), for chips a site's ranking lacks | ${REVIEWS.length} articles, listed with their anchors in tier-derivation.md | ${REVIEW_CHECKED} |`,
  `| CPU | English Wikipedia processor spec tables, only to check F/KF twins (method step 11; text under CC BY-SA 4.0) | ${WIKI.map((w) => w.url).join(', ')} | ${WIKI_CHECKED} |`,
  '',
  'Tom\'s Hardware (Future plc, US/UK), PC Games Hardware (Computec, Germany) and ComputerBase (ComputerBase GmbH, Germany) are different publishers with their own test labs, test systems and game lists; none builds its ranking from another\'s results, and none is TechPowerUp. Tom\'s legacy CPU tables (page 2, 2020–2022 baselines without the reference chip) are not used.',
  '',
  '## Method (the same for every source; reproduced by `npm run tiers:coverage -- --pages <dir>`)',
  '',
  '1. Score per chip from the tables above.',
  '2. share = score ÷ the reference chip\'s score in the same table and resolution (GPU: RTX 5090; CPU: Ryzen 7 9800X3D). A table or resolution without the reference is not used; nothing is rescaled between tables.',
  '3. Tier = the 10 % band of the share: more than 90 % → 10, more than 80 % → 9, …, 10 % or less → 1 (`tierFromShare`).',
  '4. Names: maker words, price tags, "Dual Edition", ComputerBase\'s power/memory details and test-setup tags (Dual-/Single-Chan, D4/D5) dropped. The chip must then equal a chip name in the data exactly.',
  "5. Graphics cards are matched per memory size (`vram` of the listing). A source row that states a size counts only for that size. A row without a size (Tom's single-size cards) counts only when the chip has one memory size in the data (owner, 2026-10-26: Tom's tested one product, and a chip sold in two sizes is two products); otherwise that source gives the chip nothing.",
  "6. Several values for one product in one source (ComputerBase memory setups, a review's test setups): the lowest.",
  '7. Two of three (`pickTier`): pairs in the order Tom\'s + PCGH, Tom\'s + ComputerBase, PCGH + ComputerBase; the first pair within 1 tier gives the stored tier = the lower of the two. Two or more sources but no pair within 1 → no tier, owner list (`TIER_DISAGREE`; for a card, at any resolution). One source → no tier.',
  `8. CPU: one resolution-independent tier (the rankings measure games with an RTX 5090 at 720p/1080p, the reviews in the CPU limit). CPU tiers sit on a compressed scale (in the CPU limit even old CPUs reach about half the reference; today they run ${cpuRange()}); compare tiers only within a kind. Threads only where Tom's page states them; cores from the shop data.`,
  '9. Workstation graphics cards, Titans and server CPUs (Xeon, EPYC, Threadripper, Opteron) get no tier. Chips without a tier stay offered in the builder but are never auto-picked.',
  "10. Single-chip reviews (owner, 2026-10-26), CPUs: when a site's ranking lacks a chip, that site's own review of the chip (the chip named in its title or headline; PC Games Hardware and ComputerBase) can give the site's value. The review's gaming result must be measured in the CPU limit (the page says 720p, 1.280 × 720, \"CPU-Limit\" or \"so niedrig wie möglich\"), like the rankings. Anchor = a chip in both the review's gaming result and the same site's ranking (not one the ranking shows with two test setups), the closest to the chip in the review. Share = chip ÷ anchor in the review × anchor ÷ reference in the ranking, then the same 10 % bands. A site counts once per chip: its ranking value when the ranking has the chip, else its review. Tom's Hardware reviews are not used: their charts are images, so no value can be re-read by the script. Every review, anchor and value: tier-derivation.md.",
  "11. F/KF twins (owner, 2026-10-26): an F/KF chip with no tier of its own takes its non-F twin's tier and sources when the twin has a tier of its own and an English Wikipedia spec table lists both with identical cores, threads, base clocks, boost clocks, L2 and L3 cache. A table without an L2 column (the 14th-gen Core tables, the AMD Ryzen tables) cannot show that, so it gives no twin.",
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
      lines.push(`| ${c.chip} | ${c.n} | ${tierText(r)} | ${r ? (r.kind === 'cpu' && r.twin ? `twin of ${r.twin.chip} (Wikipedia)` : '') : listed({ kind, chip: c.chip }) ? 'no two sources within 1 tier (owner list)' : 'fewer than two sources rank it (see tier-derivation.md)'} |`);
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
  const wiki = WIKI.flatMap((w) => wikiTables(w.url, readFileSync(join(pages, w.file), 'utf8')));
  const allVerdicts = (kind: Kind, reviews: boolean, twins: boolean) => {
    const vs = items(kind).map((it) => verdict(derived[kind], it, SOURCE_ORDER, reviews));
    const checks = kind === 'cpu' && twins ? applyTwins(vs, wiki) : new Map<string, TwinCheck>();
    return { vs, checks };
  };
  // Gate per owner step (2026-10-26, round 2): rankings only (after M-A), + single-chip reviews, + Wikipedia twins.
  // GPUs: no review gives a second source at a resolution the rankings can use (tier-derivation.md), so the same rows.
  for (const [step, reviews, twins] of [['rankings (M-A)', false, false], ['+ reviews (step 1)', true, false], ['+ Wikipedia twins (step 2)', true, true]] as [string, boolean, boolean][]) {
    for (const kind of ['cpu', 'gpu'] as const) {
      const { qs } = quarters(kind);
      const { vs } = allVerdicts(kind, reviews, twins);
      const has = (it: Item) => !!vs.find((v) => v.it.chip === it.chip && (kind === 'cpu' || v.it.vram === it.vram))?.row;
      console.log(`gate [${step}] ${kind}: quarter 1 ${qs[0].filter((c) => covered(kind, c, has)).length}/${qs[0].length}, all ${CHIPS[kind].filter((c) => covered(kind, c, has)).length}/${CHIPS[kind].length}`);
    }
  }

  const out: string[] = [
    '# Performance tiers: derivation per chip',
    '',
    'Regenerated by `npm run tiers:coverage -- --pages <dir>` from the pages listed in `tier-coverage.md` and in the script (not in the repo). Our tier from each source (CPU: one number; GPU: 1080p / 1440p / 4K), then the stored tier and the pair that gave it. Only our tier numbers appear here, never the sources\' scores. A CPU value marked "r" comes from that site\'s own review of the chip through an anchor (tier-coverage.md, method step 10; table "Values from reviews" below); "twin" = the non-F twin\'s row (method step 11).',
    '',
    'Tom\'s legacy CPU tables (page 2) are not used: their scores are on 2020–2022 baselines that do not contain the reference chip, and putting them on the 2026 scale would need a rescaling the owner rules out (only values the pages state). This removed Core i9-12900K, Ryzen 7 5700X, 5800X, 5800X3D and Ryzen 9 5950X, which the first version had rescaled. A CPU that Tom\'s ranks only there is marked "Tom\'s only in its legacy tables, not used".',
    '',
  ];
  const rows: TierRow[] = [];
  const dis: TierDisagreement[] = [];
  const sourcesOf = (kind: Kind, v: Verdict): TierSource[] => SOURCE_ORDER
    .filter((s) => Object.values(v.pairs!).some((p) => p.includes(s)))
    .map((s) => (v.via[s] ? { url: v.via[s]!.url, checked: REVIEW_CHECKED, anchor: v.via[s]!.anchor } : SOURCES[kind][s]));
  for (const kind of ['cpu', 'gpu'] as const) {
    const d = derived[kind];
    const { vs, checks } = allVerdicts(kind, true, true);
    const ranked = vs.filter((v) => Object.keys(v.by).length > 0 || v.twin);
    out.push(`## ${kind.toUpperCase()}`, '', ...d.notes.map((n) => `- ${n}`), '');
    const pairText = (v: Verdict) => (v.twin ? `twin of ${v.twin.chip} (Wikipedia)` : [...new Set(Object.values(v.pairs ?? {}).map((p) => p.map((s) => NAME[s]).join(' + ')))].join('; '));
    out.push(kind === 'cpu' ? "| Chip | Listings | Tom's | PCGH | CB | Stored | Pair / why |" : "| Chip | Memory | Listings | Tom's | PCGH | CB | Stored | Pair / why |",
      kind === 'cpu' ? '| --- | ---: | --- | --- | --- | --- | --- |' : '| --- | ---: | ---: | --- | --- | --- | --- | --- |');
    const one = (t: Tiers | undefined, r?: ReviewTier) => (kind === 'cpu' ? `${t?.['1080p'] ?? '—'}${r ? ' r' : ''}` : fmt(t));
    for (const v of ranked) {
      const cells = [v.it.chip, ...(kind === 'gpu' ? [`${v.it.vram} GB`] : []), v.it.n, one(v.by.toms, v.via.toms), one(v.by.pcgh, v.via.pcgh), one(v.by.cb, v.via.cb), v.row ? one(v.row) : '—', v.row ? pairText(v) : v.why];
      out.push(`| ${cells.join(' | ')} |`);
      if (v.row) {
        if (kind === 'cpu') {
          const from = v.twinOf ?? v;
          const threads = d.threads.get(from.it.chip);
          rows.push({ kind, chips: [v.it.chip], tier: v.row['1080p']!, ...(v.it.cores ? { cores: v.it.cores } : {}), ...(threads ? { threads } : {}), sources: sourcesOf(kind, from), ...(v.twin ? { twin: v.twin } : {}) });
        } else rows.push({ kind, chips: [v.it.chip], vram: v.it.vram!, tier: v.row, sources: sourcesOf(kind, v) });
      } else if (v.why?.startsWith('no two sources')) {
        const bySource: TierDisagreement['bySource'] = {};
        for (const s of SOURCE_ORDER) if (v.by[s]) bySource[s] = kind === 'cpu' ? v.by[s]!['1080p'] : v.by[s];
        dis.push({ kind, chip: v.it.chip, ...(kind === 'gpu' ? { vram: v.it.vram } : {}), bySource });
      }
    }
    const tiered = ranked.filter((v) => v.row && !v.twin);
    const twinned = ranked.filter((v) => v.twin);
    const pairCount = (a: SourceId, b: SourceId) => tiered.filter((v) => Object.values(v.pairs!).some((p) => p[0] === a && p[1] === b)).length;
    const exact1 = tiered.filter((v) => Object.entries(v.pairs!).some(([res, p]) => Math.abs(v.by[p[0]]![res as Res]! - v.by[p[1]]![res as Res]!) === 1)).length;
    const unranked = items(kind).length - ranked.length;
    const legacy = vs.filter((v) => !Object.keys(v.by).length && d.legacyOnly.has(v.it.chip)).map((v) => v.it.chip);
    if (legacy.length) out.push('', `Ranked by no source used, but named in Tom's legacy tables (not used; some rows there have no value): ${legacy.join(', ')}.`);
    out.push('', `${tiered.length} ${kind === 'cpu' ? 'chips' : 'cards (chip + memory size)'} with a tier of their own; pairs used: Tom's + PCGH ${pairCount('toms', 'pcgh')}, Tom's + CB ${pairCount('toms', 'cb')}, PCGH + CB ${pairCount('pcgh', 'cb')}; ${exact1} of them with a pair that differs by exactly 1 (lower kept).${kind === 'cpu' ? ` ${twinned.length} more through a twin.` : ''} Owner list: ${dis.filter((x) => x.kind === kind).length}. ${unranked} more in the data are ranked by no source.`, '');
    if (kind === 'cpu') {
      const used = vs.flatMap((v) => SOURCE_ORDER.filter((s) => v.via[s]).map((s) => ({ v, s, r: v.via[s]! })));
      out.push('### Values from reviews (tier-coverage.md, method step 10)', '', 'The site\'s ranking lacks the chip, so its own review gives the value: chip ÷ anchor in the review × anchor ÷ Ryzen 7 9800X3D in the same site\'s ranking.', '',
        '| Chip | Site | Tier | Anchor | Review |', '| --- | --- | ---: | --- | --- |',
        ...used.map(({ v, s, r }) => `| ${v.it.chip} | ${NAME[s]} | ${v.by[s]!['1080p']} | ${r.anchor} | ${r.url} |`), '');
      const unusedReviews = d.reviews!.flatMap((rv) => rv.r.subjects.filter((c) => CHIPS.cpu.some((x) => x.chip === c)).map((c) => {
        const v = vs.find((x) => x.it.chip === c)!;
        const s = rv.r.site;
        if (v.via[s]?.url === rv.r.url) return undefined;
        const why = d.shares[s]['1080p']?.has(c) ? `${NAME[s]}'s ranking has the chip (ranking value used)` : v.via[s] ? `an earlier ${NAME[s]} review was used` : 'no anchor: no chip of the review is in the ranking with one test setup';
        return `| ${c} | ${NAME[s]} | ${rv.r.url} | ${why} |`;
      }).filter((x): x is string => !!x));
      out.push('Reviews read but not used for a chip:', '', '| Chip | Site | Review | Why |', '| --- | --- | --- | --- |', ...unusedReviews, '');
      out.push('### F/KF twins (tier-coverage.md, method step 11)', '', `Wikipedia pages read: ${WIKI.map((w) => w.url).join(', ')}.`, '', '| Chip | Twin | Result |', '| --- | --- | --- |',
        ...[...checks.entries()].map(([chip, c]) => `| ${chip} | ${nonF(chip)} | ${c.twin ? 'twin (same tier and sources): ' : 'no twin: '}${c.why} |`), '');
    }
    if (kind === 'gpu') {
      out.push('### Single-card reviews for the most-listed cards without a tier (owner step 3)', '',
        'Read on 2026-10-26 (saved with the pages); none gives a second source at a resolution a ranking can anchor (each ranking needs the RTX 5090 at that resolution; ComputerBase\'s Full HD ranking has none):', '',
        '| Card | PC Games Hardware | ComputerBase | Tom\'s Hardware |', '| --- | --- | --- | --- |',
        '| RTX 3050 8 GB | review https://www.pcgameshardware.de/Geforce-RTX-3050-Grafikkarte-278118/Tests/Kaufen-Preis-Release-Benchmark-Vergleich-vs-6500-XT-RTX-2060-1387678/ (index Full HD only) | review https://www.computerbase.de/artikel/grafikkarten/nvidia-geforce-rtx-3050-test.79429/ (1.920 × 1.080 only) | ranking row without a size; RTX 3050 has two sizes in the data (step 5) |',
        '| RTX 3050 6 GB | review https://www.pcgameshardware.de/Geforce-RTX-3050-6GB-Grafikkarte-280241/Tests/6GB-vs-8GB-RTX-3050-vs-RX-6600-vs-A580-1444664/ (index Full HD only) | review https://www.computerbase.de/artikel/grafikkarten/geforce-rtx-3050-6gb-test.86897/ (Full HD rating only) | as above |',
        '| RTX 3060 8 GB | review https://www.pcgameshardware.de/Geforce-RTX-3060-Grafikkarte-277122/Specials/Test-12GB-vs-8GB-Benchmarks-Preis-Leistung-1415350/ | no review | ranking row is the 12 GB card |',
        '| GT 1030 2 / 4 GB | — | review https://www.computerbase.de/artikel/grafikkarten/geforce-gt-1030-radeon-rx-550-test.59512/ (Full HD only) | — |',
        '| GT 730, GT 710 (all sizes) | — | — | — |',
        '| RTX 5070 16 GB, RX 9070 12 GB (1 listing each) | ranks the 12 GB / 16 GB card only | same | ranking row without a size; two sizes in the data (step 5) |', '',
        'Tom\'s Hardware reviews show their results as chart images, so they are not used for any card or CPU.', '');
    }
    console.log(`${kind}: ${tiered.length} tiered + ${twinned.length} twins (pairs T+P ${pairCount('toms', 'pcgh')}, T+CB ${pairCount('toms', 'cb')}, P+CB ${pairCount('pcgh', 'cb')}), exact-1 ${exact1}, owner list: ${dis.filter((x) => x.kind === kind).map((x) => x.chip + (x.vram ? ` ${x.vram}GB` : '')).join(', ') || 'none'}`);
  }
  writeFileSync(join(DOCS, 'tier-derivation.md'), out.join('\n'));
  console.log(`-> ${join(DOCS, 'tier-derivation.md')}`);

  rows.sort((a, b) => (a.kind !== b.kind ? (a.kind === 'cpu' ? -1 : 1) : a.chips[0] !== b.chips[0] ? (a.chips[0] < b.chips[0] ? -1 : 1) : (a.kind === 'gpu' && b.kind === 'gpu' ? a.vram - b.vram : 0)));
  const sig = (r: TierRow) => JSON.stringify({ t: r.tier, c: r.kind === 'cpu' ? r.cores : undefined, th: r.kind === 'cpu' ? r.threads : undefined, s: r.sources.map((s) => [s.url, s.checked, s.anchor ?? '']), tw: r.kind === 'cpu' ? r.twin : undefined });
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
    const src = (s: TierSource) => (s.anchor ? `{ url: '${s.url}', checked: '${s.checked}', anchor: '${s.anchor}' }` : names[s.url]);
    const ts = [
      'export const TIERS: TierRow[] = [',
      ...rows.map((r) => (r.kind === 'cpu'
        ? `  { kind: 'cpu', chips: ['${r.chips[0]}'], tier: ${r.tier}${r.cores ? `, cores: ${r.cores}` : ''}${r.threads ? `, threads: ${r.threads}` : ''}, sources: [${r.sources.map(src).join(', ')}]${r.twin ? `, twin: { chip: '${r.twin.chip}', urls: [${r.twin.urls.map((u) => `'${u}'`).join(', ')}], checked: '${r.twin.checked}' }` : ''} },`
        : `  { kind: 'gpu', chips: ['${r.chips[0]}'], vram: ${r.vram}, tier: ${t(r.tier)}, sources: [${r.sources.map(src).join(', ')}] },`)),
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
