import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TIERS } from '../../src/engine/data/tiers';
import { cpuThreads, threadsByRule, titleThreads } from '../../src/lib/cpuThreads';
import { mostCommon } from '../../src/lib/data';

interface L {
  chip: string;
  title: string;
  cores: number | null;
}
const listings = (JSON.parse(readFileSync(new URL('../../public/data/cpu/latest.json', import.meta.url), 'utf8')) as { listings: L[] }).listings;
const byChip = new Map<string, L[]>();
for (const l of listings) byChip.set(l.chip, [...(byChip.get(l.chip) ?? []), l]);
const coresOf = (chip: string) => mostCommon((byChip.get(chip) ?? []).map((l) => l.cores));

describe('titleThreads', () => {
  it('reads the shop wordings and ignores Threadripper', () => {
    expect(titleThreads('AMD RYZEN 5 8600G 4.3GHZ 6-CORES THREADS-12 16MB 65W')).toBe(12);
    expect(titleThreads('Ryzen 7 12 Threads')).toBe(12);
    expect(titleThreads('Ryzen 7 16 νήματα')).toBe(16);
    expect(titleThreads('AMD Ryzen Threadripper 5955WX 4GHz')).toBeNull();
  });
});

describe('threadsByRule', () => {
  it.each([
    ['Ryzen 5 5600X', 6, 12],
    ['Ryzen 3 3200G', 4, 4],
    ['Ryzen 3 4300G', 4, 8],
    ['Athlon 200GE', 2, 4],
    ['Core i5-12400F', 6, 12],
    ['Core i5-12600K', 10, 16],
    ['Core i5-14600K', 14, 20],
    ['Core i7-14700K', 20, 28],
    ['Core i9-14900K', 24, 32],
    ['Core i3-12100F', 4, 8],
    ['Core i3-9100', 4, 4],
    ['Core i5-9400', 6, 6],
    ['Core i7-9700', 8, 8],
    ['Core i7-8700', 6, 12],
    ['Core i5-10400', 6, 12],
    ['Core Ultra 7 265K', 20, 20],
    ['Pentium G6400', 2, 4],
    ['Celeron G5905', 2, 2],
    ['Xeon Gold 6126', 12, 24],
    ['Xeon 6756E', 128, 128],
    ['Xeon E-2324G', 4, 4],
    ['Xeon Bronze 3508U', 8, 8],
    ['Xeon 6325P', 4, 8],
    ['Celeron G6900', 2, 2],
    ['EPYC 9654', 96, 192],
    ['Threadripper PRO 7995WX', 96, 192],
  ])('%s with %i cores has %i threads', (chip, cores, threads) => expect(threadsByRule(chip, cores)).toBe(threads));

  it('is null, never a guess, when cores are unknown or the line is not covered', () => {
    expect(threadsByRule('Core i3-4130', null)).toBeNull();
    expect(threadsByRule('Celeron G6600', 2)).toBeNull(); // really a Pentium Gold (2/4): the name is the shops' slip
    expect(threadsByRule('Pentium G6900', 2)).toBeNull();
    expect(threadsByRule('Processor 300', 2)).toBeNull();
    expect(threadsByRule('Core i7-12700', 4)).toBeNull(); // fewer cores than performance cores: bad data
  });

  it('a title that states threads wins over the rule', () => {
    expect(cpuThreads('Ryzen 5 8600G', 6, ['x THREADS-12'])).toBe(12);
    expect(cpuThreads('Ryzen 5 5600X', 6, ['no mention'])).toBe(12);
  });
});

describe("against today's data", () => {
  it('agrees with every title that states threads', () => {
    const wrong: string[] = [];
    let checked = 0;
    for (const l of listings) {
      const stated = titleThreads(l.title);
      const rule = threadsByRule(l.chip, coresOf(l.chip));
      if (stated == null || rule == null) continue;
      checked++;
      if (stated !== rule) wrong.push(`${l.chip} cores ${coresOf(l.chip)}: title ${stated}, rule ${rule}`);
    }
    expect(checked).toBeGreaterThan(0); // few titles state threads (2 of 1447 today)
    expect(wrong).toEqual([]);
  });

  it('agrees with the sourced threads of the tier table', () => {
    const wrong: string[] = [];
    for (const row of TIERS) {
      if (row.kind !== 'cpu' || row.threads == null) continue;
      for (const chip of row.chips) {
        const rule = threadsByRule(chip, row.cores ?? coresOf(chip));
        if (rule != null && rule !== row.threads) wrong.push(`${chip}: table ${row.threads}, rule ${rule}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('covers at least 85% of the listings whose cores are known', () => {
    const known = listings.filter((l) => coresOf(l.chip) != null);
    const covered = known.filter((l) => cpuThreads(l.chip, coresOf(l.chip), [l.title]) != null);
    expect(covered.length / known.length).toBeGreaterThan(0.85);
  });
});
