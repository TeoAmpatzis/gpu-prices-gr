import { describe, expect, it } from 'vitest';
import { CPU_BOX, boxCooler } from '../../../src/engine/data/cpuBox';
import { OFFICIAL_DOMAINS } from '../../../src/engine/data/cpuMemory';
import { withBoxCoolers } from '../../../src/lib/derive';
import type { CpuListing, Latest } from '../../../src/types';
import { evaluate, type Part } from '../../../src/engine';
import { ruleResult } from '../../compat/engine-adapter';
import { optional } from '../../../src/lib/wizard';
import type { Model } from '../../../src/lib/data';

describe('CPU box table integrity', () => {
  it('has rows', () => expect(CPU_BOX.length).toBeGreaterThan(0));
  it('every row names chips, an official page, the field read and a date', () => {
    for (const r of CPU_BOX) {
      expect(r.models.length).toBeGreaterThan(0);
      const host = new URL(r.source).hostname;
      expect(OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))).toBe(true);
      expect(r.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.field.length).toBeGreaterThan(0);
      expect(r.cooler === null || r.cooler.length > 0).toBe(true);
    }
  });
  it('no model appears twice', () => {
    const all = CPU_BOX.flatMap((r) => r.models.map((m) => m.toLowerCase().replace(/\s+/g, ' ')));
    expect(new Set(all).size).toBe(all.length);
  });
  it('no Intel row relies on a thermal design class (PCG)', () => {
    for (const r of CPU_BOX) expect(r.cooler ?? '').not.toMatch(/^PCG/i);
  });
});

describe('boxCooler', () => {
  it('7600: the page names the cooler in the box', () => {
    const b = boxCooler('Ryzen 5 7600');
    expect(b?.included).toBe(true);
    expect(b?.cooler).toBe('AMD Wraith Stealth');
    expect(b?.source).toContain('amd-ryzen-5-7600.html');
  });
  it('7600X: the page says Not Included', () => {
    const b = boxCooler('Ryzen 5 7600X');
    expect(b?.included).toBe(false);
    expect(b?.cooler).toBeNull();
  });
  it('matches ignoring case and spacing, exact otherwise', () => {
    expect(boxCooler('ryzen 5  7600')?.included).toBe(true);
    expect(boxCooler('Ryzen 5 7600XT')).toBeUndefined();
  });
  it('a chip whose page has no thermal-solution field has no row (8600G)', () => expect(boxCooler('Ryzen 5 8600G')).toBeUndefined());
  it('Intel without an intel.com page naming the boxed cooler has no row (i5-14400)', () => expect(boxCooler('Core i5-14400')).toBeUndefined());
});

const latestOf = (listings: object[]): Latest => ({ updatedAt: 'x', sources: {}, listings }) as unknown as Latest;
const L = (id: string, chip: string, packaging: string | null, coolerIncluded: boolean | null) => ({ id, chip, packaging, coolerIncluded });

describe('withBoxCoolers', () => {
  const out = withBoxCoolers(
    latestOf([
      L('a', 'Ryzen 5 7600', 'Box', null),
      L('b', 'Ryzen 5 7600', 'Tray', null),
      L('c', 'Ryzen 5 7600', null, null),
      L('d', 'Ryzen 5 7600X', 'Box', null),
      L('e', 'Ryzen 5 7600', 'Box', false),
      L('f', 'Ryzen 5 8600G', 'Box', null),
      L('g', 'Ryzen 5 7600', 'Tray', false),
    ]),
  );
  const by = (id: string) => out.listings.find((l) => l.id === id) as unknown as { coolerIncluded: boolean | null };
  it('fills a Box listing the shops do not state', () => {
    expect(by('a').coolerIncluded).toBe(true);
    expect(by('d').coolerIncluded).toBe(false);
  });
  it("names the page's cooler on a listing it fills with true (rule 11 names it), nothing otherwise", () => {
    const named = (id: string) => (out.listings.find((l) => l.id === id) as unknown as { boxCooler?: string }).boxCooler;
    expect(named('a')).toBe('AMD Wraith Stealth');
    expect(named('d')).toBeUndefined();
    expect(named('e')).toBeUndefined();
    expect(named('b')).toBeUndefined();
  });
  it('never changes Tray, unknown packaging, or a value a shop stated', () => {
    expect(by('b').coolerIncluded).toBeNull();
    expect(by('c').coolerIncluded).toBeNull();
    expect(by('e').coolerIncluded).toBe(false);
    expect(by('g').coolerIncluded).toBe(false);
  });
  it('leaves a Box listing of a chip with no row unknown', () => expect(by('f').coolerIncluded).toBeNull());
  it('does not mutate its input', () => {
    const input = latestOf([L('a', 'Ryzen 5 7600', 'Box', null)]);
    withBoxCoolers(input);
    expect((input.listings[0] as unknown as { coolerIncluded: boolean | null }).coolerIncluded).toBeNull();
  });
});

describe('a Box 7600 filled from the table', () => {
  const listing = withBoxCoolers(latestOf([L('a', 'Ryzen 5 7600', 'Box', null)])).listings[0] as unknown as { coolerIncluded: boolean | null };
  const fields = { socket: 'AM5', igpu: true, coolerIncluded: listing.coolerIncluded };

  it('rule 11 passes with no separate cooler in the build', () => {
    const cpu: Part = { category: 'cpu', key: 'Ryzen 5 7600|true', name: 'Ryzen 5 7600', quantity: 1, fields };
    const f = ruleResult(evaluate([cpu]), 11);
    expect(f?.status).toBe('pass');
  });
  it('the builder cooler step is optional', () => {
    const model = { cheapest: listing, listings: [listing] } as unknown as Model<CpuListing>;
    expect(optional('cooler', { cpu: model }).optional).toBe(true);
  });
});
