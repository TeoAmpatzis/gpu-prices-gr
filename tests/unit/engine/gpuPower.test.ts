import { describe, expect, it } from 'vitest';
import { GPU_OFFICIAL_DOMAINS, GPU_POWER, gpuPowerRow } from '../../../src/engine/data/gpuPower';

describe('GPU power table integrity', () => {
  it('has rows', () => expect(GPU_POWER.length).toBeGreaterThan(0));
  it('every row has chips, an official source, a date and positive integer figures', () => {
    for (const r of GPU_POWER) {
      expect(r.chips.length).toBeGreaterThan(0);
      const host = new URL(r.source).hostname;
      expect(GPU_OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))).toBe(true);
      expect(r.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.boardPowerW !== undefined || r.makerPsuW !== undefined).toBe(true);
      for (const v of [r.boardPowerW, r.makerPsuW]) if (v !== undefined) expect(Number.isInteger(v) && v > 0).toBe(true);
    }
  });
  it('no chip appears in two rows', () => {
    const all = GPU_POWER.flatMap((r) => r.chips.map((c) => c.toLowerCase().replace(/\s+/g, ' ')));
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('gpuPowerRow', () => {
  it('finds a chip ignoring case and spacing', () => expect(gpuPowerRow('rtx  5070')?.chips).toContain('RTX 5070'));
  it('is exact: RTX 5070 and RTX 5070 Ti are different chips', () => {
    expect(gpuPowerRow('RTX 5070')?.chips).not.toContain('RTX 5070 Ti');
    expect(gpuPowerRow('RTX 5070 Ti')?.chips).not.toContain('RTX 5070');
    expect(gpuPowerRow('RTX 5070 Ti')?.chips).toContain('RTX 5070 Ti');
  });
  it('unknown chip', () => expect(gpuPowerRow('RTX 9999')).toBeUndefined());
});
