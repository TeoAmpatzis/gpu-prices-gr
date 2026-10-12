import { describe, expect, it } from 'vitest';
import { OFFICIAL_DOMAINS } from '../../../src/engine/data/cpuMemory';
import { CPU_POWER, cpuPowerRow } from '../../../src/engine/data/cpuPower';

describe('CPU power table integrity', () => {
  it('has rows', () => expect(CPU_POWER.length).toBeGreaterThan(0));
  it('every row has models, an official source, a date, integer watts and the kind of its brand', () => {
    for (const r of CPU_POWER) {
      expect(r.models.length).toBeGreaterThan(0);
      const host = new URL(r.source).hostname;
      expect(OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))).toBe(true);
      expect(r.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isInteger(r.watts) && r.watts > 0).toBe(true);
      for (const m of r.models) {
        if (/^(Core|Pentium|Celeron|Processor)/i.test(m)) expect(r.kind).toBe('PL2');
        else if (/^(Ryzen|Athlon)/i.test(m)) expect(r.kind).toBe('TDP');
        else throw new Error(`unknown brand: ${m}`);
      }
    }
  });
  it('Intel rows are only PL2, AMD rows only TDP, and no PPT row exists', () => {
    expect(CPU_POWER.some((r) => r.kind === 'PPT')).toBe(false);
    expect(CPU_POWER.filter((r) => r.kind === 'TDP').length).toBeGreaterThan(0);
    for (const r of CPU_POWER) for (const m of r.models) expect(/^(Ryzen|Athlon)/i.test(m)).toBe(r.kind === 'TDP');
  });
  it('AMD rows come from the AMD specifications table', () => {
    for (const r of CPU_POWER.filter((x) => x.kind === 'TDP')) expect(r.source).toBe('https://www.amd.com/en/products/specifications/processors.html');
  });
  it('no model appears twice', () => {
    const all = CPU_POWER.flatMap((r) => r.models.map((m) => m.toLowerCase().replace(/\s+/g, ' ')));
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('cpuPowerRow', () => {
  it('finds a row ignoring case and spacing', () => expect(cpuPowerRow('core  i7-14700k')?.watts).toBeGreaterThan(0));
  it('K and KF are separate chips with their own rows', () => {
    const k = cpuPowerRow('Core i5-14600K'), kf = cpuPowerRow('Core i5-14600KF');
    expect(k?.models).toContain('Core i5-14600K');
    expect(k?.models).not.toContain('Core i5-14600KF');
    expect(kf?.models).toContain('Core i5-14600KF');
    expect(k?.source).not.toBe(kf?.source);
  });
  it('is exact: no suffix stripping', () => {
    expect(cpuPowerRow('Core Ultra 5 250K Plus')).toBeDefined();
    expect(cpuPowerRow('Core Ultra 5 250K')).toBeUndefined();
    expect(cpuPowerRow('Core i5-1460')).toBeUndefined();
  });
  it('AMD chips carry their stated default TDP', () => {
    expect(cpuPowerRow('Ryzen 5 7600')).toMatchObject({ kind: 'TDP', watts: 65 });
    expect(cpuPowerRow('Ryzen 9 9950X')).toMatchObject({ kind: 'TDP', watts: 170 });
    expect(cpuPowerRow('Ryzen 7 5800X3D')).toMatchObject({ kind: 'TDP', watts: 105 });
  });
  it('a chip whose record states no TDP stays uncovered', () => {
    expect(cpuPowerRow('Ryzen 7 5755G')).toBeUndefined();
    expect(cpuPowerRow('Ryzen 7 9850X3')).toBeUndefined();
  });
  it('unknown CPU gives undefined, never a guess', () => {
    expect(cpuPowerRow('EPYC 4124P')).toBeUndefined();
  });
});
