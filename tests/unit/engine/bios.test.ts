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
    expect(biosSupport('x670e', 'ryzen 7  9700x')).toBe(biosSupport('X670E', 'Ryzen 7 9700X'));
  });
  it('undefined for an unknown CPU name', () => expect(biosSupport('X670E', 'EPYC 4124P')).toBeUndefined());
  it('undefined for a CPU whose generation has no row for the chipset', () => {
    expect(biosSupport('X670E', 'Core i5-14600K')).toBeUndefined();
  });
  it('undefined for an unknown chipset', () => expect(biosSupport('ZZ999', 'Ryzen 7 9700X')).toBeUndefined());
  it('chipset match is exact: a partial or longer name is not a match', () => {
    expect(biosSupport('X670', 'Ryzen 7 9700X')).toBe('update');
    expect(biosSupport('X67', 'Ryzen 7 9700X')).toBeUndefined();
    expect(biosSupport('X6700', 'Ryzen 7 9700X')).toBeUndefined();
  });
  it('official statements: 600-series AM5 board with a Ryzen 9000 may need an update, 800-series does not', () => {
    expect(biosSupport('X670E', 'Ryzen 7 9700X')).toBe('update');
    expect(biosSupport('X870E', 'Ryzen 7 9700X')).toBe('ok');
  });
  it('deliberate gaps stay unknown', () => {
    expect(biosSupport('B650', 'Ryzen 7 9700X')).toBeUndefined(); // am5.html never names B650
    expect(biosSupport('B550', 'Ryzen 5 3600')).toBeUndefined(); // the two 3000 columns disagree
    expect(biosSupport('B760', 'Core i5-12400')).toBeUndefined(); // no 12th gen statement
    expect(biosSupport('A320', 'Ryzen 3 3200G')).toBeUndefined();
    expect(biosSupport('X570', 'Ryzen 3 1200')).toBeUndefined(); // an X in AMD's table is not exhaustive
  });
  it('AM4 ticks are not "no update needed" (AMD: support may require a BIOS upgrade)', () => {
    expect(biosSupport('B450', 'Ryzen 5 5600X')).toBe('update');
    expect(biosSupport('X470', 'Ryzen 5 5600X')).toBe('update');
  });
  it('Processor 300 is not a 13th/14th gen Core: unknown', () => {
    expect(biosSupport('B760', 'Processor 300')).toBeUndefined();
    expect(biosSupport('H610', 'processor  300')).toBeUndefined();
  });
});

function cpuRowFor(gen: string): string | undefined {
  const samples = ['Ryzen 3 1200', 'Ryzen 5 3600', 'Ryzen 3 4100', 'Ryzen 5 4600G', 'Ryzen 5 5600X', 'Ryzen 5 5600G', 'Ryzen 5 7600',
    'Ryzen 5 8400F', 'Ryzen 5 8600G', 'Ryzen 7 9700X', 'Core i5-12400F', 'Core i5-13400', 'Core i5-14600K', 'Core Ultra 7 265K'];
  return samples.find((n) => cpuRow(n)?.generation === gen);
}
