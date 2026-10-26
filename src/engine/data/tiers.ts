// Our own gaming performance tier, 1 (slowest) to 10 (fastest): one tier per desktop CPU chip, and per graphics card
// (chip + memory size) one tier at 1080p, 1440p and 4K. It is our grouping, built from three independent published
// benchmark hierarchies (Tom's Hardware, PC Games Hardware, ComputerBase), downloaded on the date of each row. Only our
// tier is stored here, never the sources' numbers or text.
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
// Tiers are only comparable within a kind. CPU tiers sit on a compressed scale (with an RTX 5090 at low resolution the
// slowest ranked CPU is still above half the reference, so today's CPU tiers run 7–10), GPU tiers run the full range.
// A CPU tier is resolution-independent: the sources measure games with the graphics card out of the way (Tom's
// 1080p, PCGH and ComputerBase 720p, each with an RTX 5090); at 1440p and 4K the graphics card's tier is what limits.
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
  /** The two sources whose agreement gave the tier. */
  sources: TierSource[];
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
  { kind: 'cpu', chips: ['Core Ultra 5 245K'], tier: 7, cores: 14, threads: 14, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Core Ultra 5 250K Plus'], tier: 8, cores: 18, threads: 18, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Core Ultra 7 265K'], tier: 8, cores: 20, threads: 20, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Core Ultra 7 270K Plus'], tier: 8, cores: 24, threads: 24, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Core Ultra 9 285K'], tier: 8, cores: 24, threads: 24, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Core i5-14600K'], tier: 8, cores: 14, threads: 20, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Core i7-12700K'], tier: 7, cores: 12, threads: 20, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Core i7-13700K'], tier: 8, cores: 16, threads: 24, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Core i7-14700K'], tier: 8, cores: 20, threads: 28, sources: [TOMS_CPU, CB_CPU] },
  { kind: 'cpu', chips: ['Core i9-13900K'], tier: 8, cores: 24, threads: 32, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Core i9-14900K'], tier: 8, cores: 24, threads: 32, sources: [TOMS_CPU, CB_CPU] },
  { kind: 'cpu', chips: ['Ryzen 5 7500X3D'], tier: 8, cores: 6, sources: [PCGH_CPU, CB_CPU] },
  { kind: 'cpu', chips: ['Ryzen 5 9600X'], tier: 8, cores: 6, threads: 12, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Ryzen 7 5800X3D'], tier: 7, cores: 8, sources: [PCGH_CPU, CB_CPU] },
  { kind: 'cpu', chips: ['Ryzen 7 7700X'], tier: 7, cores: 8, threads: 16, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Ryzen 7 7800X3D'], tier: 9, cores: 8, threads: 16, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Ryzen 7 9700X'], tier: 8, cores: 8, sources: [PCGH_CPU, CB_CPU] },
  { kind: 'cpu', chips: ['Ryzen 7 9800X3D'], tier: 10, cores: 8, threads: 16, sources: [TOMS_CPU, PCGH_CPU] },
  { kind: 'cpu', chips: ['Ryzen 7 9850X3D'], tier: 10, cores: 8, threads: 16, sources: [TOMS_CPU, PCGH_CPU] },
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
  { kind: 'gpu', chips: ['RTX 5070'], vram: 12, tier: { '1080p': 6, '1440p': 6, '4k': 5 }, sources: [TOMS_GPU, PCGH_GPU] },
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
  { kind: 'gpu', chips: ['RX 9070'], vram: 16, tier: { '1080p': 7, '1440p': 6, '4k': 5 }, sources: [TOMS_GPU, PCGH_GPU] },
  { kind: 'gpu', chips: ['RX 9070 GRE'], vram: 12, tier: { '1080p': 6, '1440p': 5, '4k': 5 }, sources: [TOMS_GPU, PCGH_GPU] },
  { kind: 'gpu', chips: ['RX 9070 XT'], vram: 16, tier: { '1080p': 7, '1440p': 7, '4k': 6 }, sources: [TOMS_GPU, PCGH_GPU] },
];

export const TIER_DISAGREE: TierDisagreement[] = [];

/**
 * A lookup over a table. CPU: the chip's one tier (`res` does not change it). GPU: the row of that chip and memory
 * size (`vramGb`, the listing's `vram`); without a memory size a GPU has no tier. A listed disagreement is unknown.
 */
export function makeTierOf(rows: TierRow[], disagree: TierDisagreement[]) {
  return (kind: 'cpu' | 'gpu', chip: string, res: Res, vramGb?: number): number | undefined => {
    if (disagree.some((d) => d.kind === kind && d.chip === chip && (kind === 'cpu' || d.vram === vramGb))) return undefined;
    for (const r of rows) {
      if (r.kind !== kind || !r.chips.includes(chip)) continue;
      if (r.kind === 'cpu') return r.tier;
      if (vramGb !== undefined && r.vram === vramGb) return r.tier[res];
    }
    return undefined;
  };
}

/** Our tier (exact chip name as in the data; GPUs also need the memory size); undefined = no tier (never guessed). */
export const tierOf: (kind: 'cpu' | 'gpu', chip: string, res: Res, vramGb?: number) => number | undefined = makeTierOf(TIERS, TIER_DISAGREE);
