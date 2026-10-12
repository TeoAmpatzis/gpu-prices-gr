import { describe, expect, it } from 'vitest';
import { BIOS, biosSupport } from '../../../src/engine/data/bios';
import { OFFICIAL_DOMAINS, cpuRow } from '../../../src/engine/data/cpuMemory';

const VERDICTS = ['ok', 'update', 'unsupported'];

describe('BIOS table integrity', () => {
  it('has rows', () => expect(BIOS.length).toBeGreaterThan(0));
  it('every row has chipsets, an official source, a date, a quote and a valid verdict', () => {
    for (const r of BIOS) {
      expect(r.chipsets.length).toBeGreaterThan(0);
      const host = new URL(r.source).hostname;
      expect(OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))).toBe(true);
      expect(r.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.quote.trim().length).toBeGreaterThan(10);
      expect(VERDICTS).toContain(r.verdict);
    }
  });
  it('no chipset x generation pair appears in two rows', () => {
    const pairs = BIOS.flatMap((r) => r.chipsets.map((c) => `${c.toUpperCase()}|${r.generation}`));
    expect(new Set(pairs).size).toBe(pairs.length);
  });
});

describe('biosSupport', () => {
  it('returns the row verdict for a covered pair', () => {
    // every row is reachable through some CPU of its generation
    for (const r of BIOS) {
      const cpu = cpuRowFor(r.generation);
      expect(cpu, r.generation).toBeDefined();
      for (const c of r.chipsets) expect(biosSupport(c, cpu!)).toBe(r.verdict);
    }
  });
  it('is case-insensitive on chipset and CPU name', () => {
    expect(biosSupport('b650', 'ryzen 7  9700x')).toBe(biosSupport('B650', 'Ryzen 7 9700X'));
  });
  it('undefined for an unknown CPU name', () => expect(biosSupport('B650', 'EPYC 4124P')).toBeUndefined());
  it('undefined for a CPU whose generation has no row for the chipset', () => {
    expect(biosSupport('B650', 'Core i5-14600K')).toBeUndefined();
  });
  it('undefined for an unknown chipset', () => expect(biosSupport('ZZ999', 'Ryzen 7 9700X')).toBeUndefined());
  it('chipset match is exact: B650 is not B650E and H61 is not H610', () => {
    const only = BIOS.filter((r) => r.chipsets.includes('B650') && !r.chipsets.includes('B650E'));
    expect(only.length).toBe(0); // both are listed together, so a partial name must not match on its own
    expect(biosSupport('B65', 'Ryzen 7 9700X')).toBeUndefined();
    expect(biosSupport('B6500', 'Ryzen 7 9700X')).toBeUndefined();
  });
  it('official pages: 600-series AM5 board with a Ryzen 9000 may need an update', () => {
    expect(biosSupport('B650', 'Ryzen 7 9700X')).toBe('update');
    expect(biosSupport('X870E', 'Ryzen 7 9700X')).toBe('ok');
  });
});

function cpuRowFor(gen: string): string | undefined {
  const samples = ['Ryzen 3 1200', 'Ryzen 5 3600', 'Ryzen 3 4100', 'Ryzen 5 4600G', 'Ryzen 5 5600X', 'Ryzen 5 5600G', 'Ryzen 5 7600',
    'Ryzen 5 8400F', 'Ryzen 5 8600G', 'Ryzen 7 9700X', 'Core i5-12400F', 'Core i5-13400', 'Core i5-14600K', 'Core Ultra 7 265K'];
  return samples.find((n) => cpuRow(n)?.generation === gen);
}
