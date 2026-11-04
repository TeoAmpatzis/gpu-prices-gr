// The case PSU table (owner 25/10, option B for rule 16): rows from the makers' pages, applied at build time.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CASE_PSU, casePsu } from '../../../src/engine/data/casePsu';
import { evaluate, type Part } from '../../../src/engine';
import { CATEGORIES } from '../../../src/lib/categories';
import { withCasePsu, withMakerTables } from '../../../src/lib/derive';
import type { BaseListing, CaseListing, Latest } from '../../../src/types';
import { ruleResult } from '../../compat/engine-adapter';

const latest = JSON.parse(readFileSync('public/data/case/latest.json', 'utf8')) as Latest;
const keyOf = (l: BaseListing) => (CATEGORIES.case.modelKey as (l: BaseListing) => string)(l);
const byKey = new Map<string, BaseListing[]>();
for (const l of latest.listings) byKey.set(keyOf(l), [...(byKey.get(keyOf(l)) ?? []), l]);

// Manufacturer compatibility stays valid even when this model is absent from live inventory.
const terraListing: CaseListing = {
  id: 'fixture-terra', source: 'skroutz', title: 'Fractal Design Terra Silver',
  url: 'https://www.fractal-design.com/products/cases/terra/terra/terra-silver/',
  price: 200, shopCount: 1, brand: 'Fractal Design', chip: 'Fractal Design Terra',
  scrapedAt: '2025-10-25T00:00:00Z', size: 'SFF / Cube', maxBoard: 'Mini ITX',
  window: false, rgb: false,
};
const terraInput: Latest<CaseListing> = {
  ...latest,
  listings: [terraListing, { ...terraListing, id: 'fixture-terra-second' }],
};

describe('CASE_PSU rows', () => {
  it('has about 25 rows, each with a model, an official https URL and a date', () => {
    expect(CASE_PSU.length).toBeGreaterThanOrEqual(20);
    for (const r of CASE_PSU) {
      expect(r.models.length).toBeGreaterThan(0);
      expect(r.source).toMatch(/^https:\/\//);
      expect(r.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.field.trim()).not.toBe('');
      for (const f of r.forms) expect(['ATX', 'SFX', 'SFX-L']).toContain(f);
    }
  });
  it('a model key is in one row only', () => {
    const all = CASE_PSU.flatMap((r) => r.models);
    expect(new Set(all).size).toBe(all.length);
  });
  it('an external-power row takes no PSU; every other row takes at least one size', () => {
    for (const r of CASE_PSU) {
      if (r.included === 'external') expect(r.forms).toEqual([]);
      else expect(r.forms.length).toBeGreaterThan(0);
    }
  });
  it('uses canonical model keys, including the stable Terra fixture key', () => {
    for (const k of CASE_PSU.flatMap((r) => r.models)) expect(k).toMatch(/^[a-z0-9]+$/);
    expect(keyOf(terraListing)).toBe('fractaldesignterra');
    expect(casePsu(keyOf(terraListing))?.forms).toEqual(['SFX', 'SFX-L']);
  });
  it('curated models present in live inventory are small cases', () => {
    const present = CASE_PSU.flatMap((r) => r.models).filter((k) => byKey.has(k));
    expect(present.length).toBeGreaterThan(0);
    for (const k of present) {
      const ls = byKey.get(k) as unknown as { size: string; maxBoard?: string | null }[];
      expect([k, ls.some((l) => l.size === 'Mini Tower' || l.size === 'SFF / Cube' || l.maxBoard === 'Mini ITX')]).toEqual([k, true]);
    }
  });
  it('includes the owner-named cases: Fractal Terra, Akasa Euler, Chieftec BT-02B-U3', () => {
    expect(casePsu('fractaldesignterra')?.forms).toEqual(['SFX', 'SFX-L']);
    expect(casePsu('akasaeulermxpluscube')?.included).toBe('external');
    expect(casePsu('chieftecbt02bu3')).toMatchObject({ forms: ['SFX'], included: 'SFX 250 W' });
  });
});

describe('withCasePsu (build time)', () => {
  const out = withCasePsu(latest);
  const terraOut = withCasePsu(terraInput);
  it('writes the row onto every listing of the model, and nothing onto others', () => {
    expect(terraOut.listings).toHaveLength(2);
    for (const l of terraOut.listings as CaseListing[]) {
      expect(l.psuFormFactors).toEqual(['SFX', 'SFX-L']);
      expect(l.psuIncluded).toBeUndefined();
    }
    for (const l of out.listings as CaseListing[]) {
      const row = casePsu(keyOf(l));
      if (!row) continue;
      expect(l.psuFormFactors).toEqual(row.forms);
      expect(l.psuIncluded).toBe(row.included);
    }
    const untouched = out.listings.filter((l) => !casePsu(keyOf(l))) as unknown as { psuFormFactors?: unknown }[];
    expect(untouched.length).toBeGreaterThan(1000);
    expect(untouched.every((l) => l.psuFormFactors === undefined)).toBe(true);
  });
  it('does not mutate its input; withMakerTables applies it to cases only', () => {
    expect(terraInput.listings.every((l) => l.psuFormFactors === undefined && l.psuIncluded === undefined)).toBe(true);
    expect((latest.listings as unknown as { psuFormFactors?: unknown }[]).every((l) => l.psuFormFactors === undefined)).toBe(true);
    expect(withMakerTables('gpu', latest)).toBe(latest);
    expect(withMakerTables('case', latest).listings.filter((l) => (l as unknown as { psuFormFactors?: unknown }).psuFormFactors).length)
      .toBe(CASE_PSU.flatMap((r) => r.models).reduce((n, k) => n + (byKey.get(k)?.length ?? 0), 0));
  });
  it('rule 16 then answers stated for a row case (Terra: ATX error, SFX pass)', () => {
    const terra = terraOut.listings[0] as unknown as Record<string, unknown>;
    const pc: Part = { category: 'case', key: 'fractaldesignterra', name: 'Fractal Design Terra', quantity: 1, fields: terra };
    const psu = (formFactor: string): Part => ({ category: 'psu', key: `psu-${formFactor}`, name: 'psu', quantity: 1, fields: { watts: 650, formFactor } });
    expect([ruleResult(evaluate([pc, psu('ATX')]), 16)?.status, ruleResult(evaluate([pc, psu('ATX')]), 16)?.basis]).toEqual(['error', 'stated']);
    expect([ruleResult(evaluate([pc, psu('SFX')]), 16)?.status, ruleResult(evaluate([pc, psu('SFX')]), 16)?.basis]).toEqual(['pass', 'stated']);
  });
});
