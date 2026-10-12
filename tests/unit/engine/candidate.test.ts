// "Μόνο συμβατά" hides a part only for an error it causes itself (v1 audit C-01: with an RTX 5080 and a
// 550 W PSU, v1 hid every CPU — "0 shown · 359 incompatible hidden").
import { describe, expect, it } from 'vitest';
import { candidateErrors, type Part, type PartCategory } from '../../../src/engine';

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
  it('with a card the maker figure decides, so a CPU alone never hides a part by rule 14 (owner: warning, not error)', () => {
    const exact = part('psu', { watts: 900, formFactor: 'ATX' });
    expect(candidateErrors([card, exact, board], cpu('AM5', 'Ryzen 9 9950X'))).toEqual([]);
  });
  it('a CPU for another socket is hidden for its own clash', () =>
    expect(candidateErrors([card, ok, board], cpu('AM4', 'Ryzen 5 5600')).map((f) => f.rule)).toEqual([1]));
  it('the PSU candidate itself is hidden when too small', () =>
    expect(candidateErrors([card, board], small).map((f) => f.rule)).toEqual([14]));
  it('warnings and notes never hide a part', () => {
    const tight = part('psu', { watts: 850, formFactor: 'ATX' });
    expect(candidateErrors([card, board], tight)).toEqual([]);
  });
});
