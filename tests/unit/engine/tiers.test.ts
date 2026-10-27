import { describe, expect, it } from 'vitest';
import {
  CB_CPU, PCGH_CPU, RESOLUTIONS, TIERS, TIER_DISAGREE, TOMS_CPU, TOMS_GPU, makeTierOf, pickTier, tierFromShare, tierOf,
  type CpuTierRow, type TierDisagreement, type TierRow,
} from '../../../src/engine/data/tiers';

const WORKSTATION_GPU = /^(RTX PRO |RTX A\d|T\d|RTX \d{4} (Ada|\(Pro\)))|Quadro|Radeon PRO|Arc Pro|Titan/;
const SERVER_CPU = /Xeon|EPYC|Threadripper|Opteron/;

describe('tier table integrity', () => {
  it('has CPU and GPU rows', () => {
    expect(TIERS.some((r) => r.kind === 'cpu')).toBe(true);
    expect(TIERS.some((r) => r.kind === 'gpu')).toBe(true);
  });

  it('every row has at least two sources on different sites, each with a URL and a date', () => {
    for (const r of TIERS) {
      expect(r.sources.length).toBeGreaterThanOrEqual(2);
      const hosts = new Set(r.sources.map((s) => new URL(s.url).hostname));
      expect(hosts.size).toBeGreaterThanOrEqual(2);
      for (const s of r.sources) {
        expect(s.url).toMatch(/^https:\/\//);
        expect(s.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it("no source is TechPowerUp, and no row cites Tom's legacy (rescaled) tables", () => {
    for (const r of TIERS) {
      for (const s of r.sources) {
        expect(s.url).not.toMatch(/techpowerup/i);
        expect(s.url).not.toMatch(/4312-2\.html/);
      }
    }
  });

  it('every tier is a whole number from 1 to 10; a GPU row has at least one resolution', () => {
    for (const r of TIERS) {
      const values = r.kind === 'cpu' ? [r.tier] : Object.values(r.tier);
      expect(values.length).toBeGreaterThan(0);
      for (const t of values) {
        expect(Number.isInteger(t)).toBe(true);
        expect(t).toBeGreaterThanOrEqual(1);
        expect(t).toBeLessThanOrEqual(10);
      }
    }
  });

  it('a CPU chip appears once; a GPU chip appears once per memory size', () => {
    const cpu = TIERS.filter((r) => r.kind === 'cpu').flatMap((r) => r.chips);
    expect(new Set(cpu).size).toBe(cpu.length);
    const gpu = TIERS.flatMap((r) => (r.kind === 'gpu' ? r.chips.map((c) => `${c}|${r.vram}`) : []));
    expect(new Set(gpu).size).toBe(gpu.length);
  });

  it('every GPU row names its memory size', () => {
    for (const r of TIERS) if (r.kind === 'gpu') expect(r.vram).toBeGreaterThan(0);
  });

  it('workstation and server chips get no tier', () => {
    for (const r of TIERS) for (const c of r.chips) expect(c).not.toMatch(r.kind === 'gpu' ? WORKSTATION_GPU : SERVER_CPU);
  });

  it('a chip on the disagreement list has no row', () => {
    for (const d of TIER_DISAGREE) {
      expect(TIERS.some((r) => r.kind === d.kind && r.chips.includes(d.chip) && (r.kind === 'cpu' || r.vram === d.vram))).toBe(false);
    }
  });
});

describe('tierOf', () => {
  it('finds a chip by its exact name in the data (GPU: with its memory size)', () => {
    for (const res of RESOLUTIONS) expect(tierOf('gpu', 'RTX 5090', res, 32)).toBe(10);
    expect(tierOf('cpu', 'Ryzen 7 9800X3D', '1080p')).toBe(10);
    const t = tierOf('gpu', 'RTX 5070', '1440p', 12);
    expect(t).toBeGreaterThanOrEqual(1);
    expect(t).toBeLessThan(10);
  });

  it('a CPU tier is the same at every resolution', () => {
    for (const r of TIERS) {
      if (r.kind !== 'cpu') continue;
      for (const res of RESOLUTIONS) expect(tierOf('cpu', r.chips[0], res)).toBe(r.tier);
    }
  });

  it('is exact: another spelling, a partial name, the wrong kind or no memory size is unknown', () => {
    expect(tierOf('gpu', 'rtx 5090', '1080p', 32)).toBeUndefined();
    expect(tierOf('gpu', 'GeForce RTX 5090', '1080p', 32)).toBeUndefined();
    expect(tierOf('gpu', 'RTX 509', '1080p', 32)).toBeUndefined();
    expect(tierOf('gpu', 'RTX 5090', '1080p')).toBeUndefined();
    expect(tierOf('gpu', 'RTX 5090', '1080p', 16)).toBeUndefined();
    expect(tierOf('cpu', 'RTX 5090', '1080p')).toBeUndefined();
  });

  it('memory sizes are separate products: RTX 5060 Ti 16 GB vs 8 GB', () => {
    // 1080p: the 16 GB card is measured by Tom's and PCGH; the 8 GB card only by Tom's (PCGH has no 8 GB result and
    // ComputerBase's 1080p table has no RTX 5090 to compare with), so it has no 1080p tier.
    expect(tierOf('gpu', 'RTX 5060 Ti', '1080p', 16)).toBeDefined();
    expect(tierOf('gpu', 'RTX 5060 Ti', '1080p', 8)).toBeUndefined();
    // 4K: 16 GB by Tom's + PCGH; the 8 GB card by Tom's only.
    expect(tierOf('gpu', 'RTX 5060 Ti', '4k', 16)).toBeDefined();
    expect(tierOf('gpu', 'RTX 5060 Ti', '4k', 8)).toBeUndefined();
  });

  it('a memory size no source measured has no tier (RTX 3060 8 GB)', () => {
    for (const res of RESOLUTIONS) expect(tierOf('gpu', 'RTX 3060', res, 8)).toBeUndefined();
  });

  it('a chip on the disagreement list is unknown at every resolution', () => {
    for (const d of TIER_DISAGREE) for (const res of RESOLUTIONS) expect(tierOf(d.kind, d.chip, res, d.vram)).toBeUndefined();
    // Also on a table built for the test: a listed chip is unknown even when a row names it.
    const row: TierRow = { kind: 'gpu', chips: ['RX 7600'], vram: 8, tier: { '1080p': 3 }, sources: [] };
    const listed: TierDisagreement = { kind: 'gpu', chip: 'RX 7600', vram: 8, bySource: { toms: { '1080p': 5 }, pcgh: { '1080p': 3 } } };
    expect(makeTierOf([row], [])('gpu', 'RX 7600', '1080p', 8)).toBe(3);
    for (const res of RESOLUTIONS) expect(makeTierOf([row], [listed])('gpu', 'RX 7600', res, 8)).toBeUndefined();
    const cpuRow: TierRow = { kind: 'cpu', chips: ['Ryzen 5 7600'], tier: 7, sources: [] };
    const cpuListed: TierDisagreement = { kind: 'cpu', chip: 'Ryzen 5 7600', bySource: { toms: 7, cb: 9 } };
    expect(makeTierOf([cpuRow], [])('cpu', 'Ryzen 5 7600', '4k')).toBe(7);
    expect(makeTierOf([cpuRow], [cpuListed])('cpu', 'Ryzen 5 7600', '1080p')).toBeUndefined();
  });

  it('a chip no source ranks is unknown (never guessed)', () => {
    expect(tierOf('gpu', 'GT 710', '1080p', 2)).toBeUndefined();
    expect(tierOf('cpu', 'Xeon Silver 4410Y', '1080p')).toBeUndefined();
  });

  it('a resolution a GPU row lacks is unknown', () => {
    for (const r of TIERS) {
      if (r.kind !== 'gpu') continue;
      for (const res of RESOLUTIONS) if (r.tier[res] === undefined) expect(tierOf('gpu', r.chips[0], res, r.vram)).toBeUndefined();
    }
  });
});

describe('pickTier (two of three sources)', () => {
  it('two sources within 1 → the lower', () => {
    expect(pickTier({ toms: 5, pcgh: 4 })).toEqual({ tier: 4, pair: ['toms', 'pcgh'] });
    expect(pickTier({ pcgh: 6, cb: 6 })).toEqual({ tier: 6, pair: ['pcgh', 'cb'] });
  });
  it("three sources: the first agreeing pair in the order Tom's+PCGH, Tom's+CB, PCGH+CB", () => {
    expect(pickTier({ toms: 8, pcgh: 5, cb: 7 })).toEqual({ tier: 7, pair: ['toms', 'cb'] });
    expect(pickTier({ toms: 8, pcgh: 5, cb: 5 })).toEqual({ tier: 5, pair: ['pcgh', 'cb'] });
    expect(pickTier({ toms: 8, pcgh: 8, cb: 7 })).toEqual({ tier: 8, pair: ['toms', 'pcgh'] });
  });
  it('no pair within 1 → disagree', () => {
    expect(pickTier({ toms: 8, pcgh: 6 })).toBe('disagree');
    expect(pickTier({ toms: 9, pcgh: 6, cb: 3 })).toBe('disagree');
  });
  it('fewer than two sources → undefined', () => {
    expect(pickTier({ toms: 8 })).toBeUndefined();
    expect(pickTier({})).toBeUndefined();
  });
});

describe('tierFromShare (the mapping method)', () => {
  it('splits the share of the reference chip into ten 10 % bands', () => {
    expect(tierFromShare(1)).toBe(10);
    expect(tierFromShare(1.08)).toBe(10);
    expect(tierFromShare(0.901)).toBe(10);
    expect(tierFromShare(0.9)).toBe(9);
    expect(tierFromShare(0.5)).toBe(5);
    expect(tierFromShare(0.4999)).toBe(5);
    expect(tierFromShare(0.4)).toBe(4);
    expect(tierFromShare(0.1)).toBe(1);
    expect(tierFromShare(0.03)).toBe(1);
  });
});

const cpuRow = (chip: string) => TIERS.find((r): r is CpuTierRow => r.kind === 'cpu' && r.chips.includes(chip));
const RANKINGS = [TOMS_CPU.url, PCGH_CPU.url, CB_CPU.url];

describe('single-chip reviews (owner step 1, round 2)', () => {
  it('a review-anchored row stores the review URL, the anchor chip and the date (Ryzen 5 7600: no ranking has it)', () => {
    const r = cpuRow('Ryzen 5 7600')!;
    expect(r).toBeDefined();
    expect(tierOf('cpu', 'Ryzen 5 7600', '1080p')).toBe(r.tier);
    expect(r.sources).toHaveLength(2);
    for (const s of r.sources) {
      expect(s.anchor).toBeTruthy();
      expect(s.anchor).not.toBe('Ryzen 5 7600');
      expect(RANKINGS).not.toContain(s.url);
      expect(s.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(r.sources.map((s) => new URL(s.url).hostname).sort()).toEqual(['www.computerbase.de', 'www.pcgameshardware.de']);
  });

  it("a ranking and a review can pair (Core i5-14400: Tom's ranking + the PCGH review through an anchor)", () => {
    const r = cpuRow('Core i5-14400')!;
    expect(r.sources[0]).toEqual(TOMS_CPU);
    expect(r.sources[1].url).toMatch(/^https:\/\/www\.pcgameshardware\.de\/.*-1444317\/$/);
    expect(r.sources[1].anchor).toBeTruthy();
  });

  it('a site counts once per chip: no row has two sources from the same site', () => {
    for (const r of TIERS) {
      const hosts = r.sources.map((s) => new URL(s.url).hostname);
      expect(new Set(hosts).size).toBe(hosts.length);
    }
  });

  it("only review sources carry an anchor, and an anchor is never a Tom's Hardware page (its review charts are images)", () => {
    for (const r of TIERS) {
      for (const s of r.sources) {
        if (RANKINGS.includes(s.url) || s.url === TOMS_GPU.url) expect(s.anchor).toBeUndefined();
        if (s.anchor) {
          expect(r.kind).toBe('cpu');
          expect(new URL(s.url).hostname).not.toBe('www.tomshardware.com');
          expect(r.chips).not.toContain(s.anchor);
        }
      }
    }
  });
});

describe('F/KF twins from Wikipedia (owner step 2, round 2)', () => {
  it("a twin row takes the non-F chip's tier and sources and names the Wikipedia page (Core Ultra 5 245KF)", () => {
    const kf = cpuRow('Core Ultra 5 245KF')!, k = cpuRow('Core Ultra 5 245K')!;
    expect(kf.twin?.chip).toBe('Core Ultra 5 245K');
    expect(kf.twin?.urls).toEqual(['https://en.wikipedia.org/wiki/Arrow_Lake_(microprocessor)']);
    expect(kf.tier).toBe(k.tier);
    expect(kf.sources).toEqual(k.sources);
    expect(tierOf('cpu', 'Core Ultra 5 245KF', '1440p')).toBe(k.tier);
  });

  it('every twin row: the chip is its twin + F/KF, the twin has a tier of its own with the same tier and sources', () => {
    const twins = TIERS.filter((r): r is CpuTierRow => r.kind === 'cpu' && !!r.twin);
    expect(twins.length).toBeGreaterThan(0);
    for (const r of twins) {
      const t = r.twin!;
      expect([`${t.chip}F`, t.chip.replace(/K$/, 'KF')]).toContain(r.chips[0]);
      const base = cpuRow(t.chip)!;
      expect(base.twin).toBeUndefined();
      expect(r.tier).toBe(base.tier);
      expect(r.sources).toEqual(base.sources);
      for (const u of t.urls) expect(u).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
      expect(t.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("not a twin: Ryzen 5 7500F does not take Ryzen 5 7600's tier (different clocks; owner)", () => {
    expect(tierOf('cpu', 'Ryzen 5 7600', '1080p')).toBeDefined();
    expect(tierOf('cpu', 'Ryzen 5 7500F', '1080p')).toBeUndefined();
    expect(TIERS.some((r) => r.kind === 'cpu' && r.twin?.chip === 'Ryzen 5 7600')).toBe(false);
  });

  it('no twin when the Wikipedia table has no L2 column: Core i7-14700KF stays unknown although 14700K has a tier', () => {
    expect(tierOf('cpu', 'Core i7-14700K', '1080p')).toBeDefined();
    expect(tierOf('cpu', 'Core i7-14700KF', '1080p')).toBeUndefined();
  });
});

describe('M-A: a source row without a memory size counts only for a chip with one size in the data', () => {
  it("RTX 5070 (12 and 16 GB in the data): Tom's unsized row no longer gives the 12 GB card a 1080p tier", () => {
    expect(tierOf('gpu', 'RTX 5070', '1080p', 12)).toBeUndefined();
    expect(tierOf('gpu', 'RTX 5070', '1440p', 12)).toBe(6);
    expect(tierOf('gpu', 'RX 9070', '1080p', 16)).toBeUndefined();
    for (const chip of ['RTX 5070', 'RX 9070']) {
      const r = TIERS.find((x) => x.kind === 'gpu' && x.chips.includes(chip))!;
      expect(r.sources).not.toContainEqual(TOMS_GPU);
    }
  });

  it('RTX 3050 (6 and 8 GB in the data) has no tier at either size', () => {
    for (const vram of [6, 8]) for (const res of RESOLUTIONS) expect(tierOf('gpu', 'RTX 3050', res, vram)).toBeUndefined();
  });
});
