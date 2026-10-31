// Our own gaming performance tier, 1 (slowest) to 10 (fastest): one tier per desktop CPU chip, and per graphics card
// (chip + memory size) one tier at 1080p, 1440p and 4K. It is our grouping, built from three independent published
// benchmark hierarchies (Tom's Hardware, PC Games Hardware, ComputerBase) and, for CPUs those lack, the same sites'
// single-chip reviews; English Wikipedia's spec tables only decide F/KF twins. Downloaded on the date of each row. Only
// our tier is stored here, never the sources' numbers or text.
//
// Method (the same for every source; `npm run tiers:coverage -- --pages <dir>` re-derives every row from the saved
// pages and fails if one differs; docs/phase4/tier-coverage.md has the details):
// 1. share = the score the page states ÷ the score the same page states for the reference chip in the same table
//    (GPU: RTX 5090; CPU: Ryzen 7 9800X3D). Nothing is rescaled between tables: a table without the reference is
//    not used.
// 2. tier = the 10 % band of that share: above 90 % → 10, above 80 % → 9, … , 10 % or less → 1 (`tierFromShare`).
// 3. Two of the three sources must agree (`pickTier`): pairs are tried in the order Tom's + PCGH, Tom's + ComputerBase,
//    PCGH + ComputerBase; the first pair within 1 tier gives the stored tier = the lower of the two. Two or more
//    sources but no pair within 1 → no tier, on TIER_DISAGREE (for GPUs: at any resolution). One source → no tier.
// 4. A CPU that a site's ranking lacks can take that site's value from the site's own review of the chip, through an
//    anchor chip in both the review's gaming result and the ranking (TierSource.anchor). A site still counts once.
// 5. An F/KF chip with no tier of its own takes its non-F twin's row when English Wikipedia's spec table shows the
//    same cores, threads, base and boost clocks, L2 and L3 cache (CpuTierRow.twin).
// Tiers are only comparable within a kind. CPU tiers sit on a compressed scale (in the CPU limit even old CPUs reach
// about half the reference, so today's CPU tiers run 5–10), GPU tiers run the full range.
// A CPU tier is resolution-independent: the sources measure games with the graphics card out of the way (Tom's
// 1080p, PCGH and ComputerBase 720p or "CPU limit", the rankings with an RTX 5090); at 1440p and 4K the graphics card's
// tier is what limits.
// Workstation and server chips get no tier. A chip with no tier stays offered but is never auto-picked.
export type Res = '1080p' | '1440p' | '4k';
export const RESOLUTIONS: Res[] = ['1080p', '1440p', '4k'];

export type SourceId = 'toms' | 'pcgh' | 'cb';
/** Pair order of the two-of-three rule. */
export const SOURCE_ORDER: SourceId[] = ['toms', 'pcgh', 'cb'];

export interface TierSource {
  /** The page downloaded (for PCGH, the article whose benchmark widget holds the index). */
  url: string;
  /** 'YYYY-MM-DD' */
  checked: string;
  /**
   * Only for a single-chip review (`url` is the review): the chip that is in both the review's gaming result and the
   * same site's ranking. The chip's share of the reference = its share of this anchor in the review × the anchor's
   * share of the reference in the ranking (method step 4).
   */
  anchor?: string;
}

/** An F/KF chip that takes the tier of its non-F twin (method step 5): identical specs in the Wikipedia table. */
export interface TierTwin {
  /** The non-F chip whose row gave the tier. */
  chip: string;
  /** The English Wikipedia page(s) whose table shows identical cores, threads, base/boost clocks, L2 and L3 cache. */
  urls: string[];
  /** 'YYYY-MM-DD' */
  checked: string;
}

export interface CpuTierRow {
  kind: 'cpu';
  /** Chip names exactly as in public/data/cpu/latest.json. */
  chips: string[];
  /** One tier at every resolution (see the header). */
  tier: number;
  /** Cores as the shop data states them (most common value), when known. */
  cores?: number;
  /** Threads, only where a source page states them. */
  threads?: number;
  /** The two sources whose agreement gave the tier (for a twin row: the twin's sources). */
  sources: TierSource[];
  /** Set when the tier is the non-F twin's (the chip itself is ranked by fewer than two sources). */
  twin?: TierTwin;
}

export interface GpuTierRow {
  kind: 'gpu';
  /** Chip names exactly as in public/data/gpu/latest.json. */
  chips: string[];
  /** Memory size in GB, exactly the listing's `vram`: each memory size is its own product. */
  vram: number;
  /** A resolution missing here has fewer than two agreeing sources. */
  tier: Partial<Record<Res, number>>;
  /** Every source whose agreement gave a tier at some resolution. */
  sources: TierSource[];
}

export type TierRow = CpuTierRow | GpuTierRow;

/** Two or more sources rank it, but no two are within 1 tier: no tier, for the owner to decide. */
export interface TierDisagreement {
  kind: 'cpu' | 'gpu';
  chip: string;
  /** GPUs: the memory size. */
  vram?: number;
  /** Our tier from each source (CPU: one number; GPU: per resolution), so the owner sees where they part. */
  bySource: Partial<Record<SourceId, number | Partial<Record<Res, number>>>>;
}

const CHECKED = '2026-10-26';
export const TOMS_GPU: TierSource = { url: 'https://www.tomshardware.com/reviews/gpu-hierarchy,4388.html', checked: CHECKED };
export const PCGH_GPU: TierSource = {
  url: 'https://www.pcgameshardware.de/Grafikkarten-Grafikkarte-97980/Specials/Rangliste-GPU-Grafikchip-Benchmark-1174201/',
  checked: CHECKED,
};
export const CB_GPU: TierSource = { url: 'https://www.computerbase.de/artikel/grafikkarten/rangliste.2487/', checked: CHECKED };
export const TOMS_CPU: TierSource = { url: 'https://www.tomshardware.com/reviews/cpu-hierarchy,4312.html', checked: CHECKED };
export const PCGH_CPU: TierSource = { url: 'https://www.pcgameshardware.de/CPU-CPU-154106/Tests/Rangliste-Bestenliste-1143392/2/', checked: CHECKED };
export const CB_CPU: TierSource = { url: 'https://www.computerbase.de/artikel/prozessoren/rangliste.89909/', checked: CHECKED };

/** Step 2 of the method: the 10 % band of a share of the reference chip (1 = the reference). */
export function tierFromShare(share: number): number {
  const t = Math.ceil(Math.round(share * 1e6) / 1e5);
  return Math.min(10, Math.max(1, t));
}

export type Picked = { tier: number; pair: [SourceId, SourceId] } | 'disagree' | undefined;

/**
 * Step 3 of the method for one value: the first pair (in SOURCE_ORDER pair order) within 1 tier gives the lower of
 * its two tiers; two or more sources with no pair within 1 → 'disagree'; fewer than two sources → undefined.
 */
export function pickTier(bySource: Partial<Record<SourceId, number>>): Picked {
  const have = SOURCE_ORDER.filter((s) => bySource[s] !== undefined);
  if (have.length < 2) return undefined;
  for (let i = 0; i < have.length; i++) {
    for (let j = i + 1; j < have.length; j++) {
      const a = bySource[have[i]]!, b = bySource[have[j]]!;
      if (Math.abs(a - b) <= 1) return { tier: Math.min(a, b), pair: [have[i], have[j]] };
    }
  }
  return 'disagree';
}

// Rows: generated by `npm run tiers:coverage -- --pages <dir> --emit <file>` from the pages saved on the date above.
export const TIERS: TierRow[] = [
  { kind: 'cpu', chips: ['Core Ultra 5 225F'], tier: 7, cores: 10, sources: [PCGH_CPU, { url: 'https://www.computerbase.de/artikel/prozessoren/intel-core-ultra-5-225f-235-test.92075/', checked: '2026-10-26', anchor: 'Core Ultra 5 245K' }] },
  { kind: 'cpu', chips: ['Core Ultra 5 245K'], tier: 7, cores: 14, threads: 14, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Core Ultra 5 245KF'], tier: 7, cores: 14, threads: 14, sources: [TOMS_CPU, PCGH_CPU], twin: { chip: 'Core Ultra 5 245K', urls: ['https://en.wikipedia.org/wiki/Arrow_Lake_(microprocessor)'], checked: '2026-10-26' } },
  { kind: 'cpu', chips: ['Core Ultra 5 250K Plus'], tier: 8, cores: 18, threads: 18, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Core Ultra 7 265K'], tier: 8, cores: 20, threads: 20, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Core Ultra 7 265KF'], tier: 8, cores: 20, threads: 20, sources: [TOMS_CPU, PCGH_CPU], twin: { chip: 'Core Ultra 7 265K', urls: ['https://en.wikipedia.org/wiki/Arrow_Lake_(microprocessor)'], checked: '2026-10-26' } },
  { kind: 'cpu', chips: ['Core Ultra 7 270K Plus'], tier: 8, cores: 24, threads: 24, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Core Ultra 9 285K'], tier: 8, cores: 24, threads: 24, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Core i5-12400'], tier: 5, cores: 6, sources: [{ url: 'https://www.pcgameshardware.de/Core-i5-12400-CPU-278099/Tests/vs-5600-X-Benchmark-Review-kaufen-Preis-1387603/', checked: '2026-10-26', anchor: 'Ryzen 7 5800X' }, { url: 'https://www.computerbase.de/artikel/prozessoren/intel-core-i5-12400-12500-test.79266/', checked: '2026-10-26', anchor: 'Ryzen 5 3600' }] },
  { kind: 'cpu', chips: ['Core i5-12400F'], tier: 5, cores: 6, sources: [{ url: 'https://www.pcgameshardware.de/Core-i5-12400-CPU-278099/Tests/vs-5600-X-Benchmark-Review-kaufen-Preis-1387603/', checked: '2026-10-26', anchor: 'Ryzen 7 5800X' }, { url: 'https://www.computerbase.de/artikel/prozessoren/intel-core-i5-12400-12500-test.79266/', checked: '2026-10-26', anchor: 'Ryzen 5 3600' }], twin: { chip: 'Core i5-12400', urls: ['https://en.wikipedia.org/wiki/List_of_Intel_Core_processors'], checked: '2026-10-26' } },
  { kind: 'cpu', chips: ['Core i5-12600K'], tier: 6, cores: 10, threads: 16, sources: [TOMS_CPU, { url: 'https://www.pcgameshardware.de/Alder-Lake-S-Codename-277726/Tests/Release-Benchmark-Core-i9-12900K-Core-i5-12600K-1382613/', checked: '2026-10-26', anchor: 'Ryzen 9 5950X' }] },
  { kind: 'cpu', chips: ['Core i5-12600KF'], tier: 6, cores: 10, threads: 16, sources: [TOMS_CPU, { url: 'https://www.pcgameshardware.de/Alder-Lake-S-Codename-277726/Tests/Release-Benchmark-Core-i9-12900K-Core-i5-12600K-1382613/', checked: '2026-10-26', anchor: 'Ryzen 9 5950X' }], twin: { chip: 'Core i5-12600K', urls: ['https://en.wikipedia.org/wiki/List_of_Intel_Core_processors'], checked: '2026-10-26' } },
  { kind: 'cpu', chips: ['Core i5-14400'], tier: 6, cores: 10, threads: 16, sources: [TOMS_CPU, { url: 'https://www.pcgameshardware.de/Core-i5-14400-CPU-280143/Tests/Intel-vs-12400f-14500-14600-Benchmark-Review-1444317/', checked: '2026-10-26', anchor: 'Ryzen 5 7500F' }] },
  { kind: 'cpu', chips: ['Core i5-14400F'], tier: 6, cores: 10, sources: [PCGH_CPU, { url: 'https://www.computerbase.de/artikel/prozessoren/intel-core-i5-14400f-14500-cpu-test.86571/', checked: '2026-10-26', anchor: 'Ryzen 7 5800X3D' }] },
  { kind: 'cpu', chips: ['Core i5-14500'], tier: 6, cores: 14, sources: [{ url: 'https://www.pcgameshardware.de/Core-i5-14400-CPU-280143/Tests/Intel-vs-12400f-14500-14600-Benchmark-Review-1444317/', checked: '2026-10-26', anchor: 'Core i7-12700K' }, { url: 'https://www.computerbase.de/artikel/prozessoren/intel-core-i5-14400f-14500-cpu-test.86571/', checked: '2026-10-26', anchor: 'Ryzen 7 5800X3D' }] },
  { kind: 'cpu', chips: ['Core i5-14600K'], tier: 8, cores: 14, threads: 20, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Core i7-12700K'], tier: 7, cores: 12, threads: 20, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Core i7-12700KF'], tier: 7, cores: 12, threads: 20, sources: [TOMS_CPU, PCGH_CPU], twin: { chip: 'Core i7-12700K', urls: ['https://en.wikipedia.org/wiki/List_of_Intel_Core_processors'], checked: '2026-10-26' } },
  { kind: 'cpu', chips: ['Core i7-13700K'], tier: 8, cores: 16, threads: 24, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Core i7-13700KF'], tier: 8, cores: 16, threads: 24, sources: [TOMS_CPU, PCGH_CPU], twin: { chip: 'Core i7-13700K', urls: ['https://en.wikipedia.org/wiki/List_of_Intel_Core_processors'], checked: '2026-10-26' } },
  { kind: 'cpu', chips: ['Core i7-14700K'], tier: 8, cores: 20, threads: 28, sources: [TOMS_CPU, CB_CPU] },
  { kind: 'cpu', chips: ['Core i9-13900K'], tier: 8, cores: 24, threads: 32, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Core i9-13900KF'], tier: 8, cores: 24, threads: 32, sources: [TOMS_CPU, PCGH_CPU], twin: { chip: 'Core i9-13900K', urls: ['https://en.wikipedia.org/wiki/List_of_Intel_Core_processors'], checked: '2026-10-26' } },
  { kind: 'cpu', chips: ['Core i9-14900K'], tier: 8, cores: 24, threads: 32, sources: [TOMS_CPU, CB_CPU] },
  { kind: 'cpu', chips: ['Core i9-14900KS'], tier: 9, cores: 24, sources: [PCGH_CPU, { url: 'https://www.computerbase.de/artikel/prozessoren/intel-core-i9-14900ks-test.87292/', checked: '2026-10-26', anchor: 'Ryzen 7 7800X3D' }] },
  { kind: 'cpu', chips: ['Ryzen 5 5500'], tier: 5, cores: 6, sources: [{ url: 'https://www.pcgameshardware.de/Ryzen-7-5700X-CPU-278283/Tests/5600-5500-Release-Benchmark-Preis-vs-5800x-1393445/', checked: '2026-10-26', anchor: 'Ryzen 5 5600' }, { url: 'https://www.computerbase.de/artikel/prozessoren/amd-ryzen-7-5700x-ryzen-5-5500-test.80254/', checked: '2026-10-26', anchor: 'Ryzen 5 3600' }] },
  { kind: 'cpu', chips: ['Ryzen 5 7500X3D'], tier: 8, cores: 6, sources: [PCGH_CPU, CB_CPU] },
  { kind: 'cpu', chips: ['Ryzen 5 7600'], tier: 7, cores: 6, sources: [{ url: 'https://www.pcgameshardware.de/Ryzen-9-7900-CPU-279362/Tests/AMD-Ryzen-7900-7700-7600-non-X-Benchmark-Review-1410740/', checked: '2026-10-26', anchor: 'Core i7-12700K' }, { url: 'https://www.computerbase.de/artikel/prozessoren/ryzen-7000-65-watt-test.82790/', checked: '2026-10-26', anchor: 'Ryzen 7 5800X3D' }] },
  { kind: 'cpu', chips: ['Ryzen 5 7600X'], tier: 7, cores: 6, threads: 12, sources: [TOMS_CPU, { url: 'https://www.pcgameshardware.de/Ryzen-5-7600X-CPU-279082/Tests/AMD-Ryzen-7600X-Review-Test-1404300/', checked: '2026-10-26', anchor: 'Core i9-12900K' }] },
  { kind: 'cpu', chips: ['Ryzen 5 9600X'], tier: 8, cores: 6, threads: 12, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Ryzen 7 5700G'], tier: 5, cores: 8, sources: [{ url: 'https://www.pcgameshardware.de/Ryzen-7-5700G-CPU-277698/Tests/AMD-Ryzen-7-5700G-Vega-APU-Review-1376578/', checked: '2026-10-26', anchor: 'Ryzen 7 5800X' }, { url: 'https://www.computerbase.de/artikel/prozessoren/amd-ryzen-5600g-5700g-test.77324/', checked: '2026-10-26', anchor: 'Ryzen 5 3600' }] },
  { kind: 'cpu', chips: ['Ryzen 7 5700X'], tier: 6, cores: 8, sources: [PCGH_CPU, { url: 'https://www.computerbase.de/artikel/prozessoren/amd-ryzen-7-5700x-ryzen-5-5500-test.80254/', checked: '2026-10-26', anchor: 'Ryzen 7 5800X3D' }] },
  { kind: 'cpu', chips: ['Ryzen 7 5800X'], tier: 6, cores: 8, sources: [PCGH_CPU, { url: 'https://www.computerbase.de/artikel/prozessoren/amd-ryzen-5000-test.74008/', checked: '2026-10-26', anchor: 'Ryzen 5 3600' }] },
  { kind: 'cpu', chips: ['Ryzen 7 5800X3D'], tier: 7, cores: 8, sources: [PCGH_CPU, CB_CPU] },
  { kind: 'cpu', chips: ['Ryzen 7 7700'], tier: 7, cores: 8, sources: [{ url: 'https://www.pcgameshardware.de/Ryzen-9-7900-CPU-279362/Tests/AMD-Ryzen-7900-7700-7600-non-X-Benchmark-Review-1410740/', checked: '2026-10-26', anchor: 'Core i7-12700K' }, { url: 'https://www.computerbase.de/artikel/prozessoren/ryzen-7000-65-watt-test.82790/', checked: '2026-10-26', anchor: 'Ryzen 7 5800X3D' }] },
  { kind: 'cpu', chips: ['Ryzen 7 7700X'], tier: 7, cores: 8, threads: 16, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Ryzen 7 7800X3D'], tier: 9, cores: 8, threads: 16, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Ryzen 7 9700X'], tier: 8, cores: 8, sources: [PCGH_CPU, CB_CPU] },
  { kind: 'cpu', chips: ['Ryzen 7 9800X3D'], tier: 10, cores: 8, threads: 16, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Ryzen 7 9850X3D'], tier: 10, cores: 8, threads: 16, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Ryzen 9 5950X'], tier: 6, cores: 16, sources: [PCGH_CPU, { url: 'https://www.computerbase.de/artikel/prozessoren/amd-ryzen-5000-test.74008/', checked: '2026-10-26', anchor: 'Ryzen 5 3600' }] },
  { kind: 'cpu', chips: ['Ryzen 9 7900'], tier: 7, cores: 12, sources: [{ url: 'https://www.pcgameshardware.de/Ryzen-9-7900-CPU-279362/Tests/AMD-Ryzen-7900-7700-7600-non-X-Benchmark-Review-1410740/', checked: '2026-10-26', anchor: 'Ryzen 7 7700X' }, { url: 'https://www.computerbase.de/artikel/prozessoren/ryzen-7000-65-watt-test.82790/', checked: '2026-10-26', anchor: 'Ryzen 7 5800X3D' }] },
  { kind: 'cpu', chips: ['Ryzen 9 9950X'], tier: 8, cores: 16, threads: 32, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Ryzen 9 9950X3D'], tier: 10, cores: 16, threads: 32, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Ryzen 9 9950X3D2'], tier: 10, cores: 16, sources: [PCGH_CPU, CB_CPU] },
  { kind: 'gpu', chips: ['Arc B570'], vram: 10, tier: { '1080p': 3 }, sources: [TOMS_GPU, PCGH_GPU] },
  { kind: 'gpu', chips: ['Arc B580'], vram: 12, tier: { '1080p': 4, '1440p': 3, '4k': 3 }, sources: [TOMS_GPU, PCGH_GPU] },
  { kind: 'gpu', chips: ['RTX 3060'], vram: 12, tier: { '1080p': 3 }, sources: [TOMS_GPU, PCGH_GPU] },
  { kind: 'gpu', chips: ['RTX 3060 Ti'], vram: 8, tier: { '1440p': 3 }, sources: [TOMS_GPU, CB_GPU] },
  { kind: 'gpu', chips: ['RTX 3080'], vram: 10, tier: { '1080p': 5, '1440p': 5, '4k': 4 }, sources: [TOMS_GPU, PCGH_GPU] },
  { kind: 'gpu', chips: ['RTX 4060'], vram: 8, tier: { '1080p': 3, '1440p': 3 }, sources: [TOMS_GPU, PCGH_GPU, CB_GPU] },
  { kind: 'gpu', chips: ['RTX 4060 Ti'], vram: 8, tier: { '1440p': 4 }, sources: [TOMS_GPU, CB_GPU] },
  { kind: 'gpu', chips: ['RTX 4070 Ti Super'], vram: 16, tier: { '1440p': 7, '4k': 6 }, sources: [TOMS_GPU, CB_GPU] },
  { kind: 'gpu', chips: ['RTX 5050'], vram: 8, tier: { '1080p': 3 }, sources: [TOMS_GPU, PCGH_GPU] },
  { kind: 'gpu', chips: ['RTX 5060'], vram: 8, tier: { '1080p': 4, '1440p': 3, '4k': 2 }, sources: [TOMS_GPU, PCGH_GPU] },
  { kind: 'gpu', chips: ['RTX 5060 Ti'], vram: 8, tier: { '1440p': 4 }, sources: [TOMS_GPU, CB_GPU] },
  { kind: 'gpu', chips: ['RTX 5060 Ti'], vram: 16, tier: { '1080p': 5, '1440p': 4, '4k': 4 }, sources: [TOMS_GPU, PCGH_GPU] },
  { kind: 'gpu', chips: ['RTX 5070'], vram: 12, tier: { '1440p': 6, '4k': 5 }, sources: [PCGH_GPU, CB_GPU] },
  { kind: 'gpu', chips: ['RTX 5070 Ti'], vram: 16, tier: { '1080p': 7, '1440p': 7, '4k': 6 }, sources: [TOMS_GPU, PCGH_GPU] },
  { kind: 'gpu', chips: ['RTX 5080'], vram: 16, tier: { '1080p': 8, '1440p': 8, '4k': 7 }, sources: [TOMS_GPU, PCGH_GPU] },
  { kind: 'gpu', chips: ['RTX 5090'], vram: 32, tier: { '1080p': 10, '1440p': 10, '4k': 10 }, sources: [TOMS_GPU, PCGH_GPU] },
  { kind: 'gpu', chips: ['RX 6700 XT'], vram: 12, tier: { '1440p': 3 }, sources: [TOMS_GPU, CB_GPU] },
  { kind: 'gpu', chips: ['RX 6800 XT'], vram: 16, tier: { '1080p': 5, '1440p': 5, '4k': 4 }, sources: [TOMS_GPU, PCGH_GPU] },
  { kind: 'gpu', chips: ['RX 7600'], vram: 8, tier: { '1080p': 3, '1440p': 3 }, sources: [TOMS_GPU, PCGH_GPU, CB_GPU] },
  { kind: 'gpu', chips: ['RX 7700 XT'], vram: 12, tier: { '1440p': 4 }, sources: [TOMS_GPU, CB_GPU] },
  { kind: 'gpu', chips: ['RX 7800 XT'], vram: 16, tier: { '1080p': 5, '1440p': 5, '4k': 4 }, sources: [TOMS_GPU, PCGH_GPU] },
  { kind: 'gpu', chips: ['RX 7900 XTX'], vram: 24, tier: { '1080p': 8, '1440p': 7, '4k': 7 }, sources: [TOMS_GPU, PCGH_GPU] },
  { kind: 'gpu', chips: ['RX 9060 XT'], vram: 8, tier: { '1080p': 4, '1440p': 4, '4k': 3 }, sources: [TOMS_GPU, PCGH_GPU] },
  { kind: 'gpu', chips: ['RX 9060 XT'], vram: 16, tier: { '1080p': 5, '1440p': 4, '4k': 4 }, sources: [TOMS_GPU, PCGH_GPU] },
  { kind: 'gpu', chips: ['RX 9070'], vram: 16, tier: { '1440p': 6, '4k': 5 }, sources: [PCGH_GPU, CB_GPU] },
  { kind: 'gpu', chips: ['RX 9070 GRE'], vram: 12, tier: { '1080p': 6, '1440p': 5, '4k': 5 }, sources: [TOMS_GPU, PCGH_GPU] },
  { kind: 'gpu', chips: ['RX 9070 XT'], vram: 16, tier: { '1080p': 7, '1440p': 7, '4k': 6 }, sources: [TOMS_GPU, PCGH_GPU] },
];

export const TIER_DISAGREE: TierDisagreement[] = [];

/** A tier found for a chip: `borrowed` names the resolution it came from when the card has none at the one asked (M4). */
export interface TierHit {
  tier: number;
  borrowed?: Res;
}

/**
 * M4 (owner 27/10): a card with no tier at the asked resolution takes the nearest one: 1080p ← 1440p, 4K ← 1440p,
 * 1440p ← the lower of its 1080p and 4K tiers (the one it has, if only one). 4K and 1080p never borrow each other.
 */
function nearest(tier: Partial<Record<Res, number>>, res: Res): TierHit | undefined {
  const own = tier[res];
  if (own !== undefined) return { tier: own };
  if (res !== '1440p') return tier['1440p'] === undefined ? undefined : { tier: tier['1440p'], borrowed: '1440p' };
  const lo = tier['1080p'], hi = tier['4k'];
  if (lo === undefined && hi === undefined) return undefined;
  if (hi === undefined || (lo !== undefined && lo <= hi)) return { tier: lo!, borrowed: '1080p' };
  return { tier: hi, borrowed: '4k' };
}

/**
 * A lookup over a table. CPU: the chip's one tier (`res` does not change it, never borrowed). GPU: the row of that
 * chip and memory size (`vramGb`, the listing's `vram`), at `res` or borrowed from the nearest resolution (M4);
 * without a memory size a GPU has no tier. A listed disagreement is unknown.
 */
export function makeTierOf(rows: TierRow[], disagree: TierDisagreement[]) {
  return (kind: 'cpu' | 'gpu', chip: string, res: Res, vramGb?: number): TierHit | undefined => {
    if (disagree.some((d) => d.kind === kind && d.chip === chip && (kind === 'cpu' || d.vram === vramGb))) return undefined;
    for (const r of rows) {
      if (r.kind !== kind || !r.chips.includes(chip)) continue;
      if (r.kind === 'cpu') return { tier: r.tier };
      if (vramGb !== undefined && r.vram === vramGb) return nearest(r.tier, res);
    }
    return undefined;
  };
}

/**
 * Our tier (exact chip name as in the data; GPUs also need the memory size); undefined = no tier (never guessed).
 * Since M4 it returns `{ tier, borrowed? }`: `.tier` is the number the callers used before; `borrowed` is set only
 * when a card's tier comes from another resolution (rules 27–30 then say "estimate").
 */
export const tierOf: (kind: 'cpu' | 'gpu', chip: string, res: Res, vramGb?: number) => TierHit | undefined = makeTierOf(TIERS, TIER_DISAGREE);
