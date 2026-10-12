import { describe, expect, it } from 'vitest';
import { evaluate, type Part } from '../../src/engine';
import { ruleResult } from '../compat/engine-adapter';
import { RANGES } from '../../src/data/validate/ranges';
import { VALIDATION_MODE, validateLatest } from '../../src/data/validate';
import { builderFile } from '../../src/lib/derive';
import { fromColumns } from '../../src/lib/columns';
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

  it('cooler height: under 30 mm is unknown (owner 2026-10-11), 30 and 200 kept', () => {
    const r = validateLatest('cooler', latest([
      row('akasa', { heightMm: 21.8 }), row('lo', { heightMm: 29.9 }), row('min', { heightMm: 30 }),
      row('max', { heightMm: 200 }), row('hi', { heightMm: 200.1 }), row('none', { heightMm: null }),
    ]), 'enforce');
    expect(r.rejections.map((x) => [x.check, x.id])).toEqual([['cooler-height', 'akasa'], ['cooler-height', 'lo'], ['cooler-height', 'hi']]);
    expect(get(r.latest, 2, 'heightMm')).toBe(30);
    expect(get(r.latest, 3, 'heightMm')).toBe(200);
    expect(get(r.latest, 0, 'heightMm')).toBeNull();
    expect(get(r.latest, 5, 'heightMm')).toBeNull();
    expect(r.stated['cooler-height']).toBe(5);
  });

  it('card minPsu plausibility: only the board-power + 100 W floor (owner 2026-10-12)', () => {
    const r = validateLatest('gpu', latest([
      row('luna', { chip: 'Arc B570', minPsu: 170 }), row('ok570', { chip: 'Arc B570', minPsu: 250 }),
      row('5070', { chip: 'RTX 5070', minPsu: 650 }), row('5070maker', { chip: 'RTX 5070', minPsu: 540 }),
      row('5070edge', { chip: 'RTX 5070', minPsu: 350 }), row('5070lo', { chip: 'RTX 5070', minPsu: 349 }),
      row('nochip', { chip: 'Unknown X', minPsu: 100 }), row('nominpsu', { chip: 'RTX 5070', minPsu: null }),
      row('rx550', { chip: 'RX 550', minPsu: 250 }), // board 50 + 100 = 150 floor; maker's 400 no longer counts
      row('4060ti', { chip: 'RTX 4060 Ti', minPsu: 100 }), // maker figure only, no board power: not checked
    ]), 'enforce');
    expect(r.rejections.map((x) => [x.check, x.id])).toEqual([['gpu-minpsu-plausible', 'luna'], ['gpu-minpsu-plausible', '5070lo']]);
    expect([1, 2, 3, 4, 6, 8, 9].map((i) => get(r.latest, i, 'minPsu'))).toEqual([250, 650, 540, 350, 100, 250, 100]);
    expect(get(r.latest, 0, 'minPsu')).toBeNull();
    expect(get(r.latest, 5, 'minPsu')).toBeNull();
    expect(r.stated['gpu-minpsu-plausible']).toBe(7); // the unknown chip, the null and the maker-only chip are not counted
  });

  it('runs in enforce mode', () => {
    expect(VALIDATION_MODE).toBe('enforce');
  });

  it('builder row of the Spire U20M case has gpuMaxMm null after validation', () => {
    const spire = {
      id: 'skroutz:spire', source: 'skroutz', title: 'Spire U20M Midi Tower', url: 'https://x/spire', price: 40, shopCount: 1,
      brand: 'Spire', chip: 'Spire U20M', size: 'Midi Tower', window: false, rgb: false, maxBoard: 'ATX', gpuMaxMm: 3.502,
      scrapedAt: '2026-10-11T00:00:00Z',
    };
    const input = latest([spire]);
    const caseRow = (all: Latest<BaseListing>) => {
      const rows = fromColumns(builderFile({ case: all as never }, '2026-10-11T00:00:00Z').file.slots.case!) as unknown as Row[];
      return rows.find((r) => r['id'] === 'skroutz:spire');
    };
    expect(caseRow(input)?.['gpuMaxMm']).toBe(3.502); // raw data: the bad value reaches the builder
    const fixed = caseRow(validateLatest('case', input, 'enforce').latest);
    expect(fixed).toBeDefined();
    expect(fixed?.['gpuMaxMm']).toBeNull();
  });

  it('psu watts: 3000 kept, 3000.1 listed (report only, value unchanged)', () => {
    const r = validateLatest('psu', latest([row('ok', { watts: 3000 }), row('big', { watts: 3000.1 })]), 'enforce');
    expect(r.rejections.map((x) => x.id)).toEqual(['big']);
    expect(get(r.latest, 1, 'watts')).toBe(3000.1);
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
