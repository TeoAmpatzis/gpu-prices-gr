import { describe, expect, it } from 'vitest';
import { evaluate, type Part } from '../../src/engine';
import { ruleResult } from '../compat/engine-adapter';
import { RANGES } from '../../src/data/validate/ranges';
import { validateLatest } from '../../src/data/validate';
import type { BaseListing, Latest } from '../../src/types';

type Row = Record<string, unknown>;
const latest = (listings: Row[]): Latest<BaseListing> =>
  ({ updatedAt: '2026-10-11T00:00:00Z', sources: {}, listings } as unknown as Latest<BaseListing>);
const row = (id: string, fields: Row): Row => ({ id, title: `t-${id}`, chip: `c-${id}`, ...fields });
const get = (l: Latest<BaseListing>, i: number, f: string) => (l.listings[i] as unknown as Row)[f];

const cases = () => latest([
  row('spire', { gpuMaxMm: 3.502 }),
  row('ax700', { gpuMaxMm: 630 }),
]);

describe('validateLatest', () => {
  it('enforce nulls the implausible case GPU length and keeps the real extreme', () => {
    const r = validateLatest('case', cases(), 'enforce');
    expect(get(r.latest, 0, 'gpuMaxMm')).toBeNull();
    expect(get(r.latest, 1, 'gpuMaxMm')).toBe(630);
    expect(r.rejections).toHaveLength(1);
    expect(r.rejections[0]).toMatchObject({ check: 'case-gpu-max', value: 3.502, id: 'spire' });
  });

  it('report mode returns the same object and the same rejections', () => {
    const input = cases();
    const r = validateLatest('case', input, 'report');
    expect(r.latest).toBe(input);
    expect(get(r.latest, 0, 'gpuMaxMm')).toBe(3.502);
    expect(r.rejections).toEqual(validateLatest('case', cases(), 'enforce').rejections);
  });

  it('bounds are inclusive', () => {
    const r = validateLatest('case', latest([
      row('a', { gpuMaxMm: 100 }), row('b', { gpuMaxMm: 700 }), row('c', { gpuMaxMm: 99.9 }), row('d', { gpuMaxMm: 700.1 }),
    ]), 'enforce');
    expect(r.rejections.map((x) => x.id)).toEqual(['c', 'd']);
    expect(get(r.latest, 0, 'gpuMaxMm')).toBe(100);
    expect(get(r.latest, 1, 'gpuMaxMm')).toBe(700);
  });

  it('RAM speed is checked per DDR type', () => {
    const r = validateLatest('ram', latest([
      row('a', { type: 'DDR4', speed: 6400 }), row('b', { type: 'DDR5', speed: 6400 }),
      row('c', { type: 'DDR5', speed: 2400 }), row('d', { type: 'DDR3', speed: 1333 }),
    ]), 'enforce');
    expect(r.rejections.map((x) => [x.check, x.id])).toEqual([['ram-ddr4-speed', 'a'], ['ram-ddr5-speed', 'c']]);
    expect(r.stated['ram-ddr4-speed']).toBe(1);
    expect(r.stated['ram-ddr5-speed']).toBe(2);
  });

  it('cooler height: 21.8 kept, 12 rejected, null not counted', () => {
    const r = validateLatest('cooler', latest([
      row('akasa', { heightMm: 21.8 }), row('low', { heightMm: 12 }), row('none', { heightMm: null }),
    ]), 'enforce');
    expect(r.rejections.map((x) => x.id)).toEqual(['low']);
    expect(get(r.latest, 0, 'heightMm')).toBe(21.8);
    expect(get(r.latest, 2, 'heightMm')).toBeNull();
    expect(r.stated['cooler-height']).toBe(2);
  });

  it('enforce does not mutate its input', () => {
    const input = cases();
    const copy = structuredClone(input);
    const r = validateLatest('case', input, 'enforce');
    expect(input).toEqual(copy);
    expect(r.latest).not.toBe(input);
    expect(r.latest.listings[1]).toBe(input.listings[1]);
  });

  it('psu watts is report only', () => {
    const r = validateLatest('psu', latest([row('big', { watts: 3500 })]), 'enforce');
    expect(r.rejections).toHaveLength(1);
    expect(r.rejections[0].check).toBe('psu-watts');
    expect(get(r.latest, 0, 'watts')).toBe(3500);
  });

  it('engine end to end: rule 6 is unknown after validation, error before', () => {
    const card: Part = { category: 'gpu', key: 'g', name: 'gpu', quantity: 1, fields: { chip: 'RTX 5070', lengthMm: 300 } };
    const mk = (fields: Row): Part => ({ category: 'case', key: 'c', name: 'case', quantity: 1, fields });
    const base = { gpuMaxMm: 3.502, size: 'Midi Tower', maxBoard: 'ATX' };
    const input = latest([row('x', base)]);
    const fixed = validateLatest('case', input, 'enforce').latest.listings[0] as unknown as Row;
    expect(ruleResult(evaluate([card, mk(fixed)]), 6)?.status).toBe('unknown');
    expect(ruleResult(evaluate([card, mk(input.listings[0] as unknown as Row)]), 6)?.status).toBe('error');
  });

  it('range table integrity', () => {
    const ids = RANGES.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const x of RANGES) expect(x.min).toBeLessThan(x.max);
  });
});
