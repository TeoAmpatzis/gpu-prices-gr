// Step 5 task 9: a part's label in the builder comes from the v2 engine's findings (src/lib/fitLabel.ts).
import { describe, expect, it } from 'vitest';
import { evaluate, type Finding, type Part, type PartCategory } from '../../src/engine';
import { labelOf, stepReason } from '../../src/lib/fitLabel';
import { checkAll, PICK_CTX } from '../../src/lib/pickCheck';

let n = 0;
const part = (category: PartCategory, fields: Record<string, unknown>, key = `${category}-${++n}`): Part => ({ category, key, name: key, quantity: 1, fields });
const f = (status: Finding['status'], basis: Finding['basis'], parts: string[], rule: Finding['rule'] = 6): Finding => ({
  rule, status, basis, parts, message: { el: `${status} ${basis}`, en: `${status} ${basis}` },
});

describe('labelOf: label mapping', () => {
  it('a stated or maker-list pass fits; an estimate likely; unknown unverified; warning check; error no', () => {
    expect(labelOf([f('pass', 'stated', ['a', 'b'])], 'a').label).toBe('fits');
    expect(labelOf([f('pass', 'maker-list', ['a', 'b'])], 'a').label).toBe('fits');
    expect(labelOf([f('pass', 'estimate', ['a', 'b'])], 'a').label).toBe('likely');
    expect(labelOf([f('note', 'estimate', ['a', 'b'])], 'a').label).toBe('likely');
    expect(labelOf([f('unknown', 'unknown', ['a', 'b'])], 'a').label).toBe('unverified');
    expect(labelOf([f('warning', 'stated', ['a', 'b'])], 'a').label).toBe('check');
    expect(labelOf([f('error', 'stated', ['a', 'b'])], 'a').label).toBe('no');
  });
  it('the worst finding decides', () => {
    const r = labelOf([f('pass', 'stated', ['a', 'b']), f('unknown', 'unknown', ['a', 'c']), f('pass', 'estimate', ['a', 'd'])], 'a');
    expect(r.label).toBe('unverified');
    expect(r.worst?.status).toBe('unknown');
  });
  it('nothing checked: no label', () => expect(labelOf([f('error', 'stated', ['b', 'c'])], 'a').label).toBeNull());
  it('advice rules 26–30 and a part alone (rules 11/12 with the other part missing) never change a label', () => {
    expect(labelOf([f('warning', 'stated', ['a', 'b'], 27), f('note', 'stated', ['a', 'b'], 26)], 'a').label).toBeNull();
    expect(labelOf([f('error', 'stated', ['a'], 12)], 'a').label).toBeNull();
  });
});

describe('labelOf on the engine', () => {
  it('H9 Flow (case limit made unknown by the conflict rule) + a 342 mm RTX 5090: not verified, not hidden', () => {
    const pc = part('case', { size: 'Midi Tower', maxBoard: 'ATX', gpuMaxMm: null, coolerMaxMm: 165 }, 'nzxth9flow');
    const card = part('gpu', { chip: 'RTX 5090', vram: 32, lengthMm: 342, minPsu: 1000 }, 'gpu:5090');
    const verdict = checkAll([pc], 'gpu', [card], PICK_CTX).get(card.key)!;
    expect(verdict.hide).toBe(false);
    expect(labelOf(verdict.findings, card.key).label).toBe('unverified');
  });
  it('a case whose only non-fit is the fan check names the fans (#19)', () => {
    const pc = part('case', {
      size: 'Midi Tower', maxBoard: 'ATX', gpuMaxMm: 400, coolerMaxMm: 170,
      fanMounts: [{ pos: 'front', size: 120, n: 3 }], fansIncluded: [{ pos: 'front', size: 120, n: 3 }],
    }, 'case');
    const board = part('mobo', { socket: 'AM5', chipset: 'B650', formFactor: 'ATX', memory: 'DDR5', ramSlots: 4, usbCHeader: true }, 'board');
    const fans = part('fan', { size: 120, pack: 3 }, 'fans');
    const build = [pc, board, fans];
    const r = labelOf(evaluate(build), pc.key, build);
    expect(r.label).not.toBe('fits');
    expect(r.other).toBe('fan');
  });
});

describe('stepReason', () => {
  it('M.2 drives on a board without stated M.2 slots: every drive unverified, the reason said once', () => {
    const board = part('mobo', { socket: 'AM5', chipset: 'B650', formFactor: 'ATX', memory: 'DDR5', ramSlots: 4, m2Slots: null }, 'board');
    const drives = [1, 2, 3].map((i) => part('storage', { iface: 'NVMe', pcie: 4, formFactor: 'M.2 2280' }, `ssd${i}`));
    const verdicts = checkAll([board], 'storage', drives, PICK_CTX);
    for (const d of drives) expect(labelOf(verdicts.get(d.key)!.findings, d.key).label).toBe('unverified');
    const why = stepReason(verdicts);
    expect(why).not.toBeNull();
    expect(typeof why === 'object' && why?.en).toMatch(/M\.2/);
  });
  it('no unverified part: no reason', () => {
    const v = new Map([['a', { hide: false, findings: [f('pass', 'stated', ['a', 'b'])] }]]);
    expect(stepReason(v)).toBeNull();
  });
});
