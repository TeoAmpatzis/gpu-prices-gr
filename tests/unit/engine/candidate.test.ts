// "Μόνο συμβατά" hides a part only for an error it causes itself (v1 audit C-01: with an RTX 5080 and a
// 550 W PSU, v1 hid every CPU — "0 shown · 359 incompatible hidden").
import { describe, expect, it } from 'vitest';
import { biosSupport, candidateErrors, type Part, type PartCategory } from '../../../src/engine';

let n = 0;
const part = (category: PartCategory, fields: Record<string, unknown>, name: string = category): Part => ({ category, key: `${category}-${++n}`, name, quantity: 1, fields });
const card = part('gpu', { chip: 'RTX 5080', lengthMm: 340, minPsu: 850 });
const small = part('psu', { watts: 550, formFactor: 'ATX' });
const ok = part('psu', { watts: 1000, formFactor: 'ATX' });
const board = part('mobo', { socket: 'AM5', chipset: 'B650', formFactor: 'ATX', memory: 'DDR5', ramSlots: 4 });
const cpu = (socket: string, name: string) => part('cpu', { socket, igpu: true, coolerIncluded: true }, name);

describe('candidateErrors (C-01)', () => {
  it('C-01: a PSU too small for the card does not hide an ordinary CPU', () =>
    expect(candidateErrors([card, small, board], cpu('AM5', 'Ryzen 5 7600'))).toEqual([]));
  it('nor a top-tier one: the PSU was already too small without it', () =>
    expect(candidateErrors([card, small, board], cpu('AM5', 'Ryzen 9 9950X'))).toEqual([]));
  it('a CPU whose power limit makes the PSU too small is hidden (no card: the whole-build estimate decides)', () => {
    const weak = part('psu', { watts: 350, formFactor: 'ATX' });
    expect(candidateErrors([weak], cpu('LGA1700', 'Core i9-14900K')).map((f) => f.rule)).toEqual([14]);
  });
  it('with a card the maker figure decides: an Intel CPU with a PL2 row at maker <= PSU < formula is a warning, not hidden (owner)', () => {
    const exact = part('psu', { watts: 850, formFactor: 'ATX' });
    expect(candidateErrors([card, exact], cpu('LGA1700', 'Core i9-14900K'))).toEqual([]);
  });
  it('no maker figure, no CPU yet: a PSU too small for the card alone already errors, so no CPU is hidden for it', () => {
    const arc = part('gpu', { chip: 'Arc A750', lengthMm: 250, minPsu: null });
    const weak = part('psu', { watts: 300, formFactor: 'ATX' });
    expect(candidateErrors([arc, weak], cpu('LGA1700', 'Core i5-12400F'))).toEqual([]);
    expect(candidateErrors([arc, weak], cpu('AM5', 'Ryzen 5 7600'))).toEqual([]); // the error is there without it, and stays
  });
  it('no maker figure: a PSU that fits the card alone but not card + this CPU hides that CPU (its own clash)', () => {
    const arc = part('gpu', { chip: 'Arc A750', lengthMm: 250, minPsu: null });
    const mid = part('psu', { watts: 400, formFactor: 'ATX' }); // card + board: 400 W; with a 117 W PL2 CPU more
    expect(candidateErrors([arc, mid], cpu('LGA1700', 'Core i5-12400F')).map((f) => f.rule)).toEqual([14]);
    expect(candidateErrors([arc, mid], cpu('AM5', 'Ryzen 7 5755G'))).toEqual([]); // no TDP row: its power is unknown, never a guess
    expect(candidateErrors([arc, mid], cpu('AM5', 'Ryzen 9 9950X')).map((f) => f.rule)).toEqual([14]); // AMD's stated TDP now counts
  });
  it('a CPU for another socket is hidden for its own clash', () =>
    expect(candidateErrors([card, ok, board], cpu('AM4', 'Ryzen 5 5600')).map((f) => f.rule)).toEqual([1]));
  it('the PSU candidate itself is hidden when too small', () =>
    expect(candidateErrors([card, board], small).map((f) => f.rule)).toEqual([14]));
  it('warnings and notes never hide a part', () => {
    const tight = part('psu', { watts: 850, formFactor: 'ATX' });
    expect(candidateErrors([card, board], tight)).toEqual([]);
  });
  it('an AM4 board AMD marks X for the CPU (not-listed) is a warning: "Only compatible" keeps it', () => {
    const x570 = part('mobo', { socket: 'AM4', chipset: 'X570', formFactor: 'ATX', memory: 'DDR4', ramSlots: 4 });
    const old = cpu('AM4', 'Ryzen 3 1200');
    expect(biosSupport('X570', 'Ryzen 3 1200')).toBe('not-listed');
    expect(candidateErrors([old], x570, { bios: biosSupport })).toEqual([]);
    expect(candidateErrors([x570], old, { bios: biosSupport })).toEqual([]);
  });
});
