// The case PSU table (owner 25/10, option B for rule 16): rows from the makers' pages, applied at build time.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CASE_PSU, casePsu } from '../../../src/engine/data/casePsu';
import { evaluate, type Part } from '../../../src/engine';
import { CATEGORIES } from '../../../src/lib/categories';
import { withCasePsu, withMakerTables } from '../../../src/lib/derive';
import type { BaseListing, Latest } from '../../../src/types';
import { ruleResult } from '../../compat/engine-adapter';

const latest = JSON.parse(readFileSync('public/data/case/latest.json', 'utf8')) as Latest;
const keyOf = (l: BaseListing) => (CATEGORIES.case.modelKey as (l: BaseListing) => string)(l);
const byKey = new Map<string, BaseListing[]>();
for (const l of latest.listings) byKey.set(keyOf(l), [...(byKey.get(keyOf(l)) ?? []), l]);

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
  it('every model key is a case model in public/data exactly as written', () => {
    const missing = CASE_PSU.flatMap((r) => r.models).filter((k) => !byKey.has(k));
    expect(missing).toEqual([]);
  });
  it('every row is a small case in the data (some listing says Mini Tower, SFF / Cube or a Mini ITX board)', () => {
    for (const k of CASE_PSU.flatMap((r) => r.models)) {
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
  const fieldsOf = (k: string) => out.listings.filter((l) => keyOf(l) === k) as unknown as { psuFormFactors?: string[]; psuIncluded?: string }[];
  it('writes the row onto every listing of the model, and nothing onto others', () => {
    expect(fieldsOf('fractaldesignterra').every((l) => l.psuFormFactors?.join() === 'SFX,SFX-L' && l.psuIncluded === undefined)).toBe(true);
    expect(fieldsOf('akasaeulermxpluscube').every((l) => l.psuFormFactors?.length === 0 && l.psuIncluded === 'external')).toBe(true);
    const untouched = out.listings.filter((l) => !casePsu(keyOf(l))) as unknown as { psuFormFactors?: unknown }[];
    expect(untouched.length).toBeGreaterThan(1000);
    expect(untouched.every((l) => l.psuFormFactors === undefined)).toBe(true);
  });
  it('does not mutate its input; withMakerTables applies it to cases only', () => {
    expect((latest.listings as unknown as { psuFormFactors?: unknown }[]).every((l) => l.psuFormFactors === undefined)).toBe(true);
    expect(withMakerTables('gpu', latest)).toBe(latest);
    expect(withMakerTables('case', latest).listings.filter((l) => (l as unknown as { psuFormFactors?: unknown }).psuFormFactors).length)
      .toBe(CASE_PSU.flatMap((r) => r.models).reduce((n, k) => n + (byKey.get(k)?.length ?? 0), 0));
  });
  it('rule 16 then answers stated for a row case (Terra: ATX error, SFX pass)', () => {
    const terra = fieldsOf('fractaldesignterra')[0] as unknown as Record<string, unknown>;
    const pc: Part = { category: 'case', key: 'fractaldesignterra', name: 'Fractal Design Terra', quantity: 1, fields: terra };
    const psu = (formFactor: string): Part => ({ category: 'psu', key: `psu-${formFactor}`, name: 'psu', quantity: 1, fields: { watts: 650, formFactor } });
    expect([ruleResult(evaluate([pc, psu('ATX')]), 16)?.status, ruleResult(evaluate([pc, psu('ATX')]), 16)?.basis]).toEqual(['error', 'stated']);
    expect([ruleResult(evaluate([pc, psu('SFX')]), 16)?.status, ruleResult(evaluate([pc, psu('SFX')]), 16)?.basis]).toEqual(['pass', 'stated']);
  });
});
