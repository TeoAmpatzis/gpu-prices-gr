// Task 2 of step 5: a fit value that rests on one shop page contradicted by another page, by the model's own
// listings or by its size class becomes unknown. Fixtures are cut from main's data of 25/10 (tests/fixtures/conflicts).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { conflicts } from '../../src/data/validate/conflicts';
import { CATEGORIES } from '../../src/lib/categories';
import { candidates, slotModels } from '../../src/lib/builder';
import type { BaseListing, Category, Latest, MoboListing } from '../../src/types';

type Row = Record<string, unknown>;
type Specs = Record<string, Row>;
const load = (cat: Category) => ({
  latest: JSON.parse(readFileSync(`tests/fixtures/conflicts/${cat}/latest.json`, 'utf8')) as Latest,
  specs: JSON.parse(readFileSync(`tests/fixtures/conflicts/${cat}/specs.json`, 'utf8')) as Specs,
});
const keyOf = (cat: Category, l: unknown) => (CATEGORIES[cat] as unknown as { modelKey: (l: BaseListing) => string }).modelKey(l as BaseListing);
const values = (latest: Latest, cat: Category, key: string, field: string) =>
  [...new Set(latest.listings.filter((l) => keyOf(cat, l) === key).map((l) => (l as unknown as Row)[field]))];
const mk = (id: string, fields: Row): Row => ({ id, title: `t ${id}`, chip: 'Acme Case', size: 'Midi Tower', ...fields });
const lat = (listings: Row[]) => ({ updatedAt: 'x', sources: {}, listings }) as unknown as Latest;

describe('conflicts: real cut-outs', () => {
  const c = load('case');
  const out = conflicts('case', c.latest, c.specs);
  it('G1: H9 Flow (pages 459 / 200) has no card length; the 2025 model keeps 459', () => {
    expect(values(out.latest, 'case', 'nzxth9flow', 'gpuMaxMm')).toEqual([null]);
    expect(values(out.latest, 'case', 'nzxth9flow2025', 'gpuMaxMm')).toEqual([459]);
    expect(out.conflicts.find((x) => x.check === 'G1' && x.model === 'nzxth9flow')).toMatchObject({ field: 'gpuMaxMm', action: 'unknown' });
  });
  it('G1: 3200D RS (pages 180 / 400) has no card length; the Smoke keeps 400', () => {
    expect(values(out.latest, 'case', 'corsair3200drs', 'gpuMaxMm')).toEqual([null]);
    expect(values(out.latest, 'case', 'corsair3200drssmoke', 'gpuMaxMm')).toEqual([400]);
    expect(values(out.latest, 'case', 'corsair3200drs', 'coolerMaxMm')).toEqual([165]); // one page: untouched
  });
  it('G2: an ATX board in an SFF / Cube is unknown; the Sugo 16 (Mini ITX) is kept', () => {
    expect(values(out.latest, 'case', 'silverstonesugosg13bqcube', 'maxBoard')).toEqual([null]);
    expect(values(out.latest, 'case', 'silverstonesugo16cube', 'maxBoard')).toEqual(['Mini ITX']);
    expect(values(out.latest, 'case', 'silverstonesugosg13bqcube', 'gpuMaxMm')).toEqual([266]);
  });
  it('G3: listings that disagree (H9 Flow ATX / E-ATX) give an unknown board size', () => {
    expect(values(out.latest, 'case', 'nzxth9flow', 'maxBoard')).toEqual([null]);
    expect(values(out.latest, 'case', 'nzxth9flow2025', 'maxBoard')).toEqual(['E-ATX']);
  });
  it('does not touch the input', () => {
    expect(values(c.latest, 'case', 'nzxth9flow', 'gpuMaxMm')).toEqual([200]);
  });
  it('report mode lists the conflicts and returns the same object', () => {
    const r = conflicts('case', c.latest, c.specs, 'report');
    expect(r.latest).toBe(c.latest);
    expect(r.conflicts.length).toBe(out.conflicts.length);
  });

  it('G3: B550M-ITX/ac (Micro ATX / Mini ITX) is corrected to Mini ITX by its name', () => {
    const m = load('mobo');
    const r = conflicts('mobo', m.latest, m.specs);
    expect(values(r.latest, 'mobo', 'asrockb550mitxac', 'formFactor')).toEqual(['Mini ITX']);
    expect(r.conflicts.find((x) => x.model === 'asrockb550mitxac')).toMatchObject({ check: 'G3', action: 'corrected' });
  });

  it('C1: a G3 board (ROG Strix B850-I, ATX / Mini ITX) stays a builder candidate with an unknown size', () => {
    const m = load('mobo');
    const r = conflicts('mobo', m.latest, m.specs);
    expect(values(r.latest, 'mobo', 'asusrogstrixb850igamingwifi', 'formFactor')).toEqual(['Άλλο']);
    const offered = (latest: Latest) =>
      candidates('mobo', slotModels('mobo', latest.listings as MoboListing[]), {}).map((x) => keyOf('mobo', x.cheapest));
    expect(offered(m.latest)).toContain('asusrogstrixb850igamingwifi');
    expect(offered(r.latest)).toContain('asusrogstrixb850igamingwifi');
    expect(offered(r.latest)).toHaveLength(offered(m.latest).length); // G3 hides nothing from the builder
    // a board the scraper itself labels 'Άλλο' keeps today's exclusion
    const own = lat([{ id: 'm:1', title: 't', chip: 'Acme X', formFactor: 'Άλλο', socket: 'AM5', memory: 'DDR5', chipset: 'X' }]);
    expect(candidates('mobo', slotModels('mobo', own.listings as unknown as MoboListing[]), {})).toHaveLength(0);
  });

  it('M2: a listing that states no size (Άλλο) is not a disagreement with Micro ATX', () => {
    const m = load('mobo');
    const r = conflicts('mobo', m.latest, m.specs);
    expect(values(r.latest, 'mobo', 'gigabytea620mds3h', 'formFactor')).toEqual(['Άλλο', 'Micro ATX']);
  });

  it('I1: coolers whose model sockets lack LGA1200 while a title names it', () => {
    const k = load('cooler');
    const r = conflicts('cooler', k.latest, k.specs);
    for (const key of ['modecomvolcano0ct202lcd', 'thermalrightturboright240c'])
      expect(String(values(r.latest, 'cooler', key, 'socketsTitle')[0])).toContain('LGA1200');
  });

  it('I2: a value already set to the larger page (an override) is kept; the SAFER minimum is undone', () => {
    const c = load('case');
    const set459 = { ...c.latest, listings: c.latest.listings.map((l) => (keyOf('case', l) === 'nzxth9flow' ? { ...l, gpuMaxMm: 459 } : l)) } as Latest;
    expect(values(conflicts('case', set459, c.specs).latest, 'case', 'nzxth9flow', 'gpuMaxMm')).toEqual([459]);
  });

  it('G4: Assassin X 120 Refined SE has AM4 in its titles only; the AK400 is untouched', () => {
    const k = load('cooler');
    const r = conflicts('cooler', k.latest, k.specs);
    expect(values(r.latest, 'cooler', 'thermalrightassassinx120refinedse', 'socketsTitle')).toEqual(['AM4']);
    expect(values(r.latest, 'cooler', 'deepcoolak400zerodarkplus', 'socketsTitle')).toEqual([undefined]);
    expect(values(r.latest, 'cooler', 'deepcoolak400zerodarkplus', 'heightMm')).toEqual([155]);
    expect(r.conflicts.every((x) => x.check === 'G4' && x.action === 'title-socket')).toBe(true);
    expect(r.conflicts.map((x) => x.model)).not.toContain('deepcoolak400zerodarkplus');
  });
});

describe('conflicts: rules on small inputs', () => {
  it('G1 tolerances: a 50 mm gap stays, a 51 mm gap goes; case coolerMaxMm 20 / 21', () => {
    const a = lat([mk('a:1', { chip: 'A', gpuMaxMm: 300, coolerMaxMm: 160 }), mk('a:2', { chip: 'A', gpuMaxMm: 300, coolerMaxMm: 160 })]);
    const s1: Specs = { 'a:1': { gpuMaxMm: 300, coolerMaxMm: 160 }, 'a:2': { gpuMaxMm: 350, coolerMaxMm: 180 } };
    expect(values(conflicts('case', a, s1).latest, 'case', 'a', 'gpuMaxMm')).toEqual([300]);
    expect(values(conflicts('case', a, s1).latest, 'case', 'a', 'coolerMaxMm')).toEqual([160]);
    const s2: Specs = { 'a:1': { gpuMaxMm: 300, coolerMaxMm: 160 }, 'a:2': { gpuMaxMm: 351, coolerMaxMm: 181 } };
    const r = conflicts('case', a, s2).latest;
    expect(values(r, 'case', 'a', 'gpuMaxMm')).toEqual([null]);
    expect(values(r, 'case', 'a', 'coolerMaxMm')).toEqual([null]);
  });
  it('G1: a value a maker or override set (equal to no page) is not undone', () => {
    const a = lat([mk('a:1', { chip: 'A', gpuMaxMm: 455 }), mk('a:2', { chip: 'A', gpuMaxMm: 455 })]);
    const s: Specs = { 'a:1': { gpuMaxMm: 200 }, 'a:2': { gpuMaxMm: 440 } };
    expect(values(conflicts('case', a, s).latest, 'case', 'a', 'gpuMaxMm')).toEqual([455]);
  });
  it('G1: a cooler page value outside the range (a 25 mm fan) is not a disagreement', () => {
    const a = lat([mk('c:1', { chip: 'C', type: 'Air', heightMm: 155 }), mk('c:2', { chip: 'C', type: 'Air', heightMm: 155 })]);
    const s: Specs = { 'c:1': { heightMm: 155 }, 'c:2': { heightMm: 25 } };
    expect(values(conflicts('cooler', a, s).latest, 'cooler', 'c', 'heightMm')).toEqual([155]);
  });
  it('G2: a Midi Tower under 230 mm is unknown unless two pages agree; a Mini Tower is not checked', () => {
    const one = lat([mk('a:1', { chip: 'A', gpuMaxMm: 200 })]);
    expect(values(conflicts('case', one, { 'a:1': { gpuMaxMm: 200 } }).latest, 'case', 'a', 'gpuMaxMm')).toEqual([null]);
    const two = lat([mk('a:1', { chip: 'A', gpuMaxMm: 200 }), mk('a:2', { chip: 'A', gpuMaxMm: 200 })]);
    expect(values(conflicts('case', two, { 'a:1': { gpuMaxMm: 200 }, 'a:2': { gpuMaxMm: 200 } }).latest, 'case', 'a', 'gpuMaxMm')).toEqual([200]);
    const mini = lat([mk('a:1', { chip: 'A', size: 'Mini Tower', gpuMaxMm: 200 })]);
    expect(values(conflicts('case', mini, { 'a:1': { gpuMaxMm: 200 } }).latest, 'case', 'a', 'gpuMaxMm')).toEqual([200]);
  });
  it('G2: E-ATX in a Mini Tower is unknown, ATX in a Mini Tower is kept', () => {
    const e = lat([mk('a:1', { chip: 'A', size: 'Mini Tower', maxBoard: 'E-ATX' }), mk('b:1', { chip: 'B', size: 'Mini Tower', maxBoard: 'ATX' })]);
    const r = conflicts('case', e, {}).latest;
    expect(values(r, 'case', 'a', 'maxBoard')).toEqual([null]);
    expect(values(r, 'case', 'b', 'maxBoard')).toEqual(['ATX']);
  });
  it('G3: a tie between two board sizes is unknown; a board named mATX is not corrected', () => {
    const a = lat([
      { id: 'm:1', title: 't', chip: 'Acme B650M-A mATX', formFactor: 'Micro ATX' },
      { id: 'm:2', title: 't', chip: 'Acme B650M-A mATX', formFactor: 'ATX' },
    ]);
    const r = conflicts('mobo', a, {});
    expect(values(r.latest, 'mobo', 'acmeb650mamatx', 'formFactor')).toEqual(['Άλλο']);
    expect(r.conflicts[0]).toMatchObject({ check: 'G3', action: 'unknown' });
  });
  it('G4: titles naming 1200 / 1700 / 1851 / AM5 but not RPM numbers', () => {
    const a = lat([
      { id: 'c:1', title: 'Cooler X Socket AM5/1200/1700', chip: 'Cooler X', sockets: 'AM5,LGA1700' },
      { id: 'c:2', title: 'Cooler X 1700 RPM LGA 1851', chip: 'Cooler X', sockets: 'AM5,LGA1700' },
    ]);
    expect(values(conflicts('cooler', a, {}).latest, 'cooler', 'coolerx', 'socketsTitle')).toEqual(['LGA1200,LGA1851']);
  });
  it('M1: a model name like "Jonsbo CR-1200" is not socket LGA1200, nor is "1200-1700 rpm"', () => {
    const a = lat([
      { id: 'c:1', title: 'Jonsbo CR-1200 ARGB', chip: 'Cooler Y', sockets: 'AM5' },
      { id: 'c:2', title: 'Cooler Y 1200-1700 rpm', chip: 'Cooler Y', sockets: 'AM5' },
    ]);
    expect(values(conflicts('cooler', a, {}).latest, 'cooler', 'coolery', 'socketsTitle')).toEqual([undefined]);
  });
  it('M3: G2 judges a model by its most common case size, not the first listing', () => {
    const a = lat([
      mk('a:1', { chip: 'A', size: 'Mini Tower', gpuMaxMm: 200 }),
      mk('a:2', { chip: 'A', gpuMaxMm: 200 }),
      mk('a:3', { chip: 'A', gpuMaxMm: 200 }),
    ]);
    expect(values(conflicts('case', a, {}).latest, 'case', 'a', 'gpuMaxMm')).toEqual([null]);
  });
  it('M4: the G2 board conflict says what was wrong in one value', () => {
    const e = lat([mk('a:1', { chip: 'A', size: 'SFF / Cube', maxBoard: 'ATX' })]);
    expect(conflicts('case', e, {}).conflicts[0].values).toEqual(['ATX in SFF / Cube']);
  });
  it('G4: a cooler with no sockets field gets nothing', () => {
    const a = lat([{ id: 'c:1', title: 'Cooler X AM4', chip: 'Cooler X', sockets: null }]);
    expect(values(conflicts('cooler', a, {}).latest, 'cooler', 'coolerx', 'socketsTitle')).toEqual([undefined]);
  });
});
