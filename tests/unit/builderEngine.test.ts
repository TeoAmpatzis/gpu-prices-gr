// Step 5 task 9: the builder's build as engine parts, optional steps, the build status and the "not checked yet" line
// (src/lib/builderEngine.ts).
import { describe, expect, it } from 'vitest';
import { evaluate, type Finding } from '../../src/engine';
import { buildStatus, missingSlots, notCheckedYet, optionalSlot, toParts, withoutOptional, type ActiveBuild } from '../../src/lib/builderEngine';
import type { Model } from '../../src/lib/data';

/** A builder model: one row carrying its engine fields (as the step files' rows do). */
const model = (key: string, row: Record<string, unknown>) =>
  ({ key, chip: key, cheapest: { id: key, chip: key, price: 100, ...row }, listings: [] }) as unknown as Model<never>;
const active = (parts: ActiveBuild['parts'], extra: Partial<ActiveBuild> = {}): ActiveBuild => ({
  parts, fanQty: 1, offers: {}, use: null, res: null, budget: null, ...extra,
});
const cpu7500f = model('Ryzen 5 7500F|false', { chip: 'Ryzen 5 7500F', socket: 'AM5', igpu: false, coolerIncluded: false });
const cpu8600g = model('Ryzen 5 8600G|true', { chip: 'Ryzen 5 8600G', socket: 'AM5', igpu: true, coolerIncluded: true, boxCooler: 'AMD Wraith Stealth' });

describe('toParts', () => {
  it('checks a pinned listing using its own fields and leaves unresolved choices unchecked', () => {
    const board = model('board', { chip: 'Board', socket: 'AM5', memory: 'DDR5' });
    const exact = { id: 'same', source: 'bestprice', chip: 'Board', title: 'Board', socket: 'AM4', memory: 'DDR4', price: 100 };
    const b = active({ mobo: board } as never, { offers: { mobo: 'bd1:bestprice:same' }, resolvedOffers: { mobo: exact } } as unknown as Partial<ActiveBuild>);
    expect(toParts(b)[0].fields).toMatchObject({ socket: 'AM4', memory: 'DDR4' });
    expect(toParts({ ...b, resolvedOffers: {} })[0].fields).toEqual({});
  });
  it('one part per chosen slot with the PART_FIELDS of its row; storage2 a part of its own; fans with their quantity', () => {
    const drive = model('ssd', { iface: 'NVMe', pcie: 4, formFactor: 'M.2 2280', price: 50 });
    const fans = model('fans', { size: 120, pack: 3 });
    const parts = toParts(active({ cpu: cpu8600g, storage: drive, fan: fans } as never, { storage2: drive as never, fanQty: 2 }));
    expect(parts.map((p) => [p.category, p.key, p.quantity])).toEqual([
      ['cpu', 'Ryzen 5 8600G|true', 1],
      ['storage', 'ssd', 1],
      ['fan', 'fans', 2],
      ['storage', 'ssd#2', 1],
    ]);
    expect(parts[0].fields).toMatchObject({ chip: 'Ryzen 5 8600G', socket: 'AM5', igpu: true, coolerIncluded: true, boxCooler: 'AMD Wraith Stealth' });
    expect(parts[0].fields).not.toHaveProperty('price');
  });
});

describe('optionalSlot (both modes use it)', () => {
  it('7500F without a card: the GPU step is required', () => {
    const f = evaluate(toParts(active({ cpu: cpu7500f } as never)));
    expect(optionalSlot('gpu', f).optional).toBe(false);
    expect(optionalSlot('gpu', f).why).toBeTruthy();
    expect(missingSlots({ cpu: cpu7500f } as never, f)).toContain('gpu');
  });
  it('8600G Box: the cooler step is optional (the box cooler), so is the card (iGPU)', () => {
    const f = evaluate(toParts(active({ cpu: cpu8600g } as never)));
    expect(optionalSlot('cooler', f).optional).toBe(true);
    expect(optionalSlot('gpu', f).optional).toBe(true);
    expect(missingSlots({ cpu: cpu8600g } as never, f)).not.toContain('cooler');
  });
  it('fans are always optional', () => expect(optionalSlot('fan', []).optional).toBe(true));
  it('8600G Box with a cooler chosen: the cooler step is still optional (read without card and cooler)', () => {
    const cooler = model('cooler', { type: 'Air', sockets: 'AM5', heightMm: 150 });
    const f = evaluate(withoutOptional(toParts(active({ cpu: cpu8600g, cooler } as never))));
    expect(optionalSlot('cooler', f).optional).toBe(true);
  });
  it('no findings yet (engine loading or failed): card and cooler count as required', () => {
    expect(optionalSlot('gpu', null).optional).toBe(false);
    expect(missingSlots({ cpu: cpu8600g } as never, null)).toEqual(expect.arrayContaining(['gpu', 'cooler']));
  });
});

describe('buildStatus', () => {
  it('an empty build is "missing" with the list of parts (C8), never ok', () => {
    const missing = missingSlots({}, []);
    expect(missing).toEqual(['cpu', 'mobo', 'ram', 'cooler', 'storage', 'case', 'psu']);
    expect(buildStatus([], missing).kind).toBe('missing');
  });
  it('null findings: "checking", never ok', () => expect(buildStatus(null, []).kind).toBe('checking'));
  it('missing outranks an error', () => {
    const err: Finding = { rule: 1, status: 'error', basis: 'stated', parts: ['a', 'b'], message: { el: '', en: '' } };
    expect(buildStatus([err], ['psu']).kind).toBe('missing');
  });
  it('rules 27 and 28 (advice) never set the kind: a complete build with only those warnings is ok', () => {
    const w = (rule: Finding['rule']): Finding => ({ rule, status: 'warning', basis: 'stated', parts: ['cpu', 'gpu'], message: { el: '', en: '' } });
    const pass: Finding = { rule: 1, status: 'pass', basis: 'stated', parts: ['cpu', 'mobo'], message: { el: '', en: '' } };
    expect(buildStatus([pass, w(27), w(28)], []).kind).toBe('ok');
  });
  it('errors before warnings before ok; counts per label', () => {
    const f = (status: Finding['status'], basis: Finding['basis'] = 'stated'): Finding => ({ rule: 1, status, basis, parts: ['a', 'b'], message: { el: '', en: '' } });
    expect(buildStatus([f('pass'), f('warning')], []).kind).toBe('warning');
    expect(buildStatus([f('error'), f('warning')], []).kind).toBe('error');
    const ok = buildStatus([f('pass'), f('pass', 'estimate'), f('unknown', 'unknown')], []);
    expect(ok.kind).toBe('ok');
    expect(ok.counts).toMatchObject({ fits: 1, likely: 1, unverified: 1, check: 0, no: 0 });
  });
});

describe('notCheckedYet (M1)', () => {
  it('unknowns of checks whose fields no data has (rules 7, 15) become one line; other unknowns stay notes', () => {
    const u = (rule: Finding['rule']): Finding => ({ rule, status: 'unknown', basis: 'unknown', parts: ['a', 'b'], message: { el: '', en: '' } });
    const line = notCheckedYet([u(7), u(15), u(6)]);
    expect(line?.en).toMatch(/^Not checked yet: /);
    expect(line?.en.split(',').length).toBe(2);
    expect(notCheckedYet([u(6)])).toBeNull();
  });
});
