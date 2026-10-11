import { describe, expect, it } from 'vitest';
import { CPU_MEMORY, OFFICIAL_DOMAINS, cpuRow, officialSpeed } from '../../../src/engine/data/cpuMemory';

describe('CPU memory table integrity', () => {
  it('has rows', () => expect(CPU_MEMORY.length).toBeGreaterThan(0));
  it('every row has models, an official source, a date and sane speeds', () => {
    for (const r of CPU_MEMORY) {
      expect(r.models.length).toBeGreaterThan(0);
      const host = new URL(r.source).hostname;
      expect(OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))).toBe(true);
      expect(r.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const speeds = Object.values(r.memory).flatMap((m) => (m ? [m.sticks2, m.sticks4] : []));
      expect(speeds.some((s) => s !== undefined)).toBe(true);
      for (const s of speeds) if (s !== undefined) expect(Number.isInteger(s) && s > 0).toBe(true);
      for (const m of Object.values(r.memory)) if (m?.sticks2 !== undefined && m.sticks4 !== undefined) expect(m.sticks4).toBeLessThanOrEqual(m.sticks2);
    }
  });
  it('no model appears twice', () => {
    const all = CPU_MEMORY.flatMap((r) => r.models.map((m) => m.toLowerCase().replace(/\s+/g, ' ')));
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('cpuRow / officialSpeed', () => {
  it('finds a row ignoring case and spacing', () => expect(cpuRow('ryzen 5  7600')?.models).toContain('Ryzen 5 7600'));
  it('is exact: a name that only starts like a row is not a match', () => {
    expect(cpuRow('Ryzen 5 7600')?.models).toContain('Ryzen 5 7600');
    expect(cpuRow('Ryzen 5 7600XT')).toBeUndefined();
    expect(cpuRow('Ryzen 5 760')).toBeUndefined();
    expect(cpuRow('Ryzen 5 7600X')?.models.includes('Ryzen 5 7600X')).toBe(true);
  });
  it('unknown CPU', () => expect(cpuRow('EPYC 4124P')).toBeUndefined());
  it('sticks map to 2 or 4', () => {
    const row = cpuRow('Ryzen 5 7600')!.memory.DDR5!;
    expect([1, 2].map((s) => officialSpeed('Ryzen 5 7600', 'DDR5', s)?.sticks)).toEqual([2, 2]);
    expect([3, 4].map((s) => officialSpeed('Ryzen 5 7600', 'DDR5', s)?.sticks)).toEqual([4, 4]);
    expect(officialSpeed('Ryzen 5 7600', 'DDR5', 2)?.mhz).toBe(row.sticks2);
    expect(officialSpeed('Ryzen 5 7600', 'DDR5', 4)?.mhz).toBe(row.sticks4);
  });
  it('null for a type the row lacks and for an unknown CPU', () => {
    expect(officialSpeed('Ryzen 5 7600', 'DDR4', 2)).toBeNull();
    expect(officialSpeed('EPYC 4124P', 'DDR5', 2)).toBeNull();
  });
});

describe('Intel rows (one figure per DDR type, no 4-stick value)', () => {
  const k = cpuRow('Core i5-14600K');
  it('exact names: Core i5-13600KF is covered, Core i5-13600K (a different chip) is not', () => {
    expect(cpuRow('Core i5-13600KF')?.models).toContain('Core i5-13600KF');
    expect(cpuRow('Core i5-13600K')).toBeUndefined();
    expect(k?.models).toContain('Core i5-14600K');
    expect(k?.models).not.toContain('Core i5-14600KS');
    expect(cpuRow('Core i5-1460')).toBeUndefined();
  });
  it('exact match only, no suffix stripping: "250K Plus" is covered, "250K" is not', () => {
    expect(cpuRow('Core Ultra 5 250K Plus')?.models).toContain('Core Ultra 5 250K Plus');
    expect(cpuRow('Core Ultra 5 250K')).toBeUndefined();
  });
  it('Intel row has no 4-stick value: 2 sticks give the speed, 4 sticks give null', () => {
    expect(k?.memory.DDR5?.sticks4).toBeUndefined();
    expect(officialSpeed('Core i5-14600K', 'DDR5', 2)?.mhz).toBe(5600);
    expect(officialSpeed('Core i5-14600K', 'DDR5', 4)).toBeNull();
    expect(officialSpeed('Core i5-14600K', 'DDR4', 2)?.mhz).toBe(3200);
  });
  it('a DDR5-only Intel row gives null for DDR4', () => expect(officialSpeed('Core Ultra 7 265K', 'DDR4', 2)).toBeNull());
});
