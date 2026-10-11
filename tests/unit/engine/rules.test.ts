// Every rule of the engine (1–26) with a pass, a fail and an unknown case where the rule has them.
// Rules 23 and 26 are notes by design (no "unknown"); rule 13 needs a BIOS table (none in the data yet),
// so its pass and fail are tested with a small table passed through the context.
import { describe, expect, it } from 'vitest';
import { evaluate, type Context, type Part, type PartCategory, type RuleId } from '../../../src/engine';
import { ruleResult } from '../../compat/engine-adapter';
import { cpuRow } from '../../../src/engine/data/cpuMemory';

let n = 0;
const part = (category: PartCategory, fields: Record<string, unknown>, opts: { name?: string; qty?: number } = {}): Part => ({
  category, key: `${category}-${++n}`, name: opts.name ?? category, quantity: opts.qty ?? 1, fields,
});
const status = (rule: RuleId, parts: Part[], ctx: Context = {}) => ruleResult(evaluate(parts, ctx), rule)?.status ?? 'none';
const basis = (rule: RuleId, parts: Part[], ctx: Context = {}) => ruleResult(evaluate(parts, ctx), rule)?.basis ?? 'none';

const cpu = (f: Record<string, unknown> = {}, name = 'Ryzen 5 7600') => part('cpu', { socket: 'AM5', igpu: true, coolerIncluded: true, ...f }, { name });
const mobo = (f: Record<string, unknown> = {}) => part('mobo', { socket: 'AM5', chipset: 'B650', formFactor: 'ATX', memory: 'DDR5', ramSlots: 4, ...f });
const ram = (f: Record<string, unknown> = {}, qty = 1) => part('ram', { type: 'DDR5', capacity: 32, modules: 2, speed: 6000, ...f }, { qty });
const gpu = (f: Record<string, unknown> = {}) => part('gpu', { chip: 'RTX 5070', lengthMm: 300, minPsu: 650, ...f });
const pcase = (f: Record<string, unknown> = {}) => part('case', { size: 'Midi Tower', maxBoard: 'ATX', gpuMaxMm: 330, coolerMaxMm: 160, ...f });
const cooler = (f: Record<string, unknown> = {}) => part('cooler', { type: 'Air', sockets: 'AM4,AM5', heightMm: 155, ...f });
const psu = (watts: number, f: Record<string, unknown> = {}) => part('psu', { watts, formFactor: 'ATX', ...f });
const drive = (f: Record<string, unknown> = {}, qty = 1) => part('storage', { media: 'SSD', iface: 'NVMe', pcie: 4, formFactor: 'M.2 2280', ...f }, { qty });
const hdd = (qty = 1) => drive({ media: 'HDD', iface: 'SATA', pcie: null, formFactor: '3.5"' }, qty);
const fan = (size: number, pack: number, qty = 1) => part('fan', { size, pack }, { qty });

describe('rule 1: CPU socket = board socket', () => {
  it('pass', () => expect(status(1, [cpu(), mobo()])).toBe('pass'));
  it('fail', () => expect(status(1, [cpu(), mobo({ socket: 'AM4' })])).toBe('error'));
  it('unknown', () => expect(status(1, [cpu({ socket: null }), mobo()])).toBe('unknown'));
});

describe('rule 2: memory type = board', () => {
  it('pass', () => expect(status(2, [mobo(), ram()])).toBe('pass'));
  it('fail', () => expect(status(2, [mobo({ memory: 'DDR4' }), ram()])).toBe('error'));
  it('unknown', () => expect(status(2, [mobo({ memory: null }), ram()])).toBe('unknown'));
});

describe('rule 3: sticks ≤ board slots (kits × quantity)', () => {
  it('pass', () => expect(status(3, [mobo(), ram({}, 2)])).toBe('pass'));
  it('fail: two 2-stick kits on a 2-slot board', () => expect(status(3, [mobo({ ramSlots: 2 }), ram({}, 2)])).toBe('error'));
  it('unknown: 4 sticks, slots not stated', () => expect(status(3, [mobo({ ramSlots: null }), ram({ modules: 4 })])).toBe('unknown'));
  it('2 sticks always fit (estimate)', () => expect(basis(3, [mobo({ ramSlots: null }), ram()])).toBe('estimate'));
});

describe('rule 4: total memory ≤ board maximum', () => {
  it('pass', () => expect(status(4, [mobo({ maxMemoryGB: 128 }), ram({ capacity: 64 })])).toBe('pass'));
  it('fail', () => expect(status(4, [mobo({ maxMemoryGB: 64 }), ram({ capacity: 64 }, 2)])).toBe('error'));
  it('unknown', () => expect(status(4, [mobo(), ram()])).toBe('unknown'));
});

describe('rule 5: board size vs case (error; note if estimated)', () => {
  it('pass', () => expect(status(5, [mobo(), pcase()])).toBe('pass'));
  it('fail', () => expect(status(5, [mobo(), pcase({ maxBoard: 'Mini ITX' })])).toBe('error'));
  it('estimate → note', () => expect([status(5, [mobo(), pcase({ maxBoard: null })]), basis(5, [mobo(), pcase({ maxBoard: null })])]).toEqual(['note', 'estimate']));
  it('unknown', () => expect(status(5, [mobo(), pcase({ maxBoard: null, size: null })])).toBe('unknown'));
});

describe('rule 6: card length vs case (≤ 10 mm margin → warning)', () => {
  it('pass', () => expect(status(6, [gpu(), pcase()])).toBe('pass'));
  it('margin and equal → warning', () => expect([status(6, [gpu({ lengthMm: 325 }), pcase()]), status(6, [gpu({ lengthMm: 330 }), pcase()])]).toEqual(['warning', 'warning']));
  it('fail', () => expect(status(6, [gpu({ lengthMm: 340 }), pcase()])).toBe('error'));
  it('chip estimate → note', () => {
    const ctx = { chipLengths: { 'RTX 5070': { cards: 20, makers: 6, min: 200, max: 300 } } };
    expect([status(6, [gpu({ lengthMm: null }), pcase()], ctx), basis(6, [gpu({ lengthMm: null }), pcase()], ctx)]).toEqual(['note', 'estimate']);
  });
  it('unknown', () => expect(status(6, [gpu({ lengthMm: null }), pcase()])).toBe('unknown'));
});

describe('rule 7: card slots vs case expansion slots', () => {
  it('pass', () => expect(status(7, [gpu({ slots: 2.5 }), pcase({ expansionSlots: 7 })])).toBe('pass'));
  it('fail', () => expect(status(7, [gpu({ slots: 3.5 }), pcase({ expansionSlots: 2 })])).toBe('error'));
  it('unknown', () => expect(status(7, [gpu(), pcase()])).toBe('unknown'));
});

describe('rule 8: air-cooler height vs case (≤ 5 mm margin → warning)', () => {
  it('pass', () => expect(status(8, [cooler(), pcase({ coolerMaxMm: 170 })])).toBe('pass'));
  it('margin → warning', () => expect(status(8, [cooler(), pcase()])).toBe('warning'));
  it('fail', () => expect(status(8, [cooler({ heightMm: 165 }), pcase()])).toBe('error'));
  it('unknown: under 30 mm is a fan thickness, not a height', () => expect(status(8, [cooler({ heightMm: 25 }), pcase()])).toBe('unknown'));
  it('an AIO is not an air cooler', () => expect(status(8, [cooler({ type: 'AIO', radiator: 240, heightMm: null }), pcase()])).toBe('none'));
});

describe('rule 9: AIO radiator (maker list only → warning)', () => {
  const aio = (r: number) => cooler({ type: 'AIO', radiator: r, heightMm: null });
  const listed = pcase({ radiators: [{ pos: 'top', sizes: [240, 280, 360] }] });
  it('pass', () => expect(status(9, [aio(360), listed])).toBe('pass'));
  it('fail (maker list) → warning', () => expect([status(9, [aio(420), listed]), basis(9, [aio(420), listed])]).toEqual(['warning', 'maker-list']));
  it('120 mm with positions → note (estimate)', () => expect(status(9, [aio(120), pcase({ radiatorMounts: 'Μπροστά, Πίσω' })])).toBe('note'));
  it('unknown', () => expect(status(9, [aio(240), pcase()])).toBe('unknown'));
});

describe('rule 10: cooler supports the socket', () => {
  it('pass', () => expect(status(10, [cpu(), cooler()])).toBe('pass'));
  it('fail', () => expect(status(10, [cpu(), cooler({ sockets: 'LGA1700,LGA1851' })])).toBe('error'));
  it('unknown', () => expect(status(10, [cpu(), cooler({ sockets: null })])).toBe('unknown'));
});

describe('rule 11: a cooler in the box or in the build (unknown → warning)', () => {
  it('pass: in the box', () => expect(status(11, [cpu()])).toBe('pass'));
  it('pass: in the build', () => expect(status(11, [cpu({ coolerIncluded: false }), cooler()])).toBe('pass'));
  it('fail', () => expect(status(11, [cpu({ coolerIncluded: false })])).toBe('error'));
  it('unknown → warning', () => expect([status(11, [cpu({ coolerIncluded: null })]), basis(11, [cpu({ coolerIncluded: null })])]).toEqual(['warning', 'unknown']));
});

describe('rule 12: graphics', () => {
  it('pass: iGPU', () => expect(status(12, [cpu()])).toBe('pass'));
  it('pass: card', () => expect(status(12, [cpu({ igpu: false }), gpu()])).toBe('pass'));
  it('fail', () => expect(status(12, [cpu({ igpu: false })])).toBe('error'));
  it('unknown', () => expect(status(12, [cpu({ igpu: null })])).toBe('unknown'));
});

describe('rule 13: BIOS (no table in the data → unknown)', () => {
  const bios: Context['bios'] = (chipset, name) => (chipset === 'B650' && /9\d00X/.test(name) ? 'update' : chipset === 'X870' ? 'ok' : chipset === 'A320' ? 'unsupported' : undefined);
  const r9 = (chipset: string) => [cpu({}, 'Ryzen 7 9700X'), mobo({ chipset })];
  it('unknown without a table', () => expect(status(13, r9('B650'))).toBe('unknown'));
  it('pass (with a table)', () => expect(status(13, r9('X870'), { bios })).toBe('pass'));
  it('update → warning (with a table)', () => expect(status(13, r9('B650'), { bios })).toBe('warning'));
  it('fail (with a table)', () => expect(status(13, r9('A320'), { bios })).toBe('error'));
  it('unknown when the table has no row', () => expect(status(13, r9('B850'), { bios })).toBe('unknown'));
});

describe('rule 14: PSU vs v1 estimate (≤ +10% → warning)', () => {
  const el = (parts: Part[]) => ruleResult(evaluate(parts, {}), 14)?.message.el ?? '';
  it('pass', () => expect([status(14, [gpu(), psu(750)]), basis(14, [gpu(), psu(750)])]).toEqual(['pass', 'stated']));
  it('basis: only the stated figure (no table row) → stated, no "Εκτίμηση v1"', () => {
    const parts = [gpu({ chip: 'Unknown X', minPsu: 650 }), psu(750)];
    expect([status(14, parts), basis(14, parts), el(parts).includes('Εκτίμηση v1')]).toEqual(['pass', 'stated', false]);
  });
  it('basis: the table decides (card figure lower or missing) → v1-estimate, "Εκτίμηση v1"', () => {
    const lower = [gpu({ minPsu: 300 }), psu(750)], missing = [gpu({ minPsu: null }), psu(750)];
    expect([basis(14, lower), basis(14, missing), el(lower).includes('Εκτίμηση v1')]).toEqual(['v1-estimate', 'v1-estimate', true]);
  });
  it('basis: +100 W for a top-tier CPU → v1-estimate, "Εκτίμηση v1"', () => {
    const parts = [cpu({}, 'Ryzen 9 9950X'), gpu(), psu(850)];
    expect([status(14, parts), basis(14, parts), el(parts).includes('Εκτίμηση v1')]).toEqual(['pass', 'v1-estimate', true]);
  });
  it('margin and equal → warning', () => expect([status(14, [gpu(), psu(650)]), status(14, [gpu(), psu(700)])]).toEqual(['warning', 'warning']));
  it('fail', () => expect(status(14, [gpu({ chip: 'RTX 5080', minPsu: 850 }), psu(550)])).toBe('error'));
  it('+100 W for a top-tier CPU', () => expect(status(14, [cpu({}, 'Ryzen 9 9950X'), gpu(), psu(700)])).toBe('error'));
  it('the card figure and the chip table: the larger wins', () => expect(status(14, [gpu({ minPsu: 300 }), psu(550)])).toBe('error'));
  it('unknown: no card', () => expect(status(14, [cpu(), psu(550)])).toBe('unknown'));
  it('unknown: card without a figure or table row', () => expect(status(14, [gpu({ chip: 'Unknown X', minPsu: null }), psu(550)])).toBe('unknown'));
});

describe('rule 15: 12V-2x6 card and a native PSU cable', () => {
  const g = gpu({ powerConnector: '12V-2x6' });
  it('pass: 8-pin card', () => expect(status(15, [gpu({ powerConnector: '2 x 8-pin' }), psu(750)])).toBe('pass'));
  it('pass: native cable', () => expect(status(15, [g, psu(750, { native12v2x6: true })])).toBe('pass'));
  it('fail → note (adapter)', () => expect(status(15, [g, psu(750, { native12v2x6: false })])).toBe('note'));
  it('ATX 3.x → note, estimate', () => expect([status(15, [g, psu(750, { atx3: true })]), basis(15, [g, psu(750, { atx3: true })])]).toEqual(['note', 'estimate']));
  it('unknown: connector not stated', () => expect(status(15, [gpu(), psu(750)])).toBe('unknown'));
  it('unknown: PSU cable not stated', () => expect(status(15, [g, psu(750)])).toBe('unknown'));
});

describe('rule 16: PSU form factor vs case', () => {
  it('pass: tower (estimate)', () => expect([status(16, [psu(650), pcase()]), basis(16, [psu(650), pcase()])]).toEqual(['pass', 'estimate']));
  it('pass: stated', () => expect(status(16, [psu(650, { formFactor: 'SFX' }), pcase({ size: 'SFF / Cube', psuFormFactors: ['SFX'] })])).toBe('pass'));
  it('fail', () => expect(status(16, [psu(650), pcase({ size: 'SFF / Cube', psuFormFactors: ['SFX'] })])).toBe('error'));
  it('unknown: SFF case without a statement', () => expect(status(16, [psu(650), pcase({ size: 'SFF / Cube' })])).toBe('unknown'));
});

describe('rule 17: M.2 drives ≤ M.2 slots', () => {
  it('pass', () => expect(status(17, [mobo({ m2Slots: 2 }), drive()])).toBe('pass'));
  it('fail', () => expect(status(17, [mobo({ m2Slots: 1 }), drive({}, 2)])).toBe('error'));
  it('unknown', () => expect(status(17, [mobo(), drive()])).toBe('unknown'));
  it('pass: no M.2 drives', () => expect(status(17, [mobo(), hdd()])).toBe('pass'));
});

describe('rule 18: SATA drives ≤ SATA ports; sharing → note', () => {
  it('pass', () => expect(status(18, [mobo({ sataPorts: 4 }), hdd(2)])).toBe('pass'));
  it('fail', () => expect(status(18, [mobo({ sataPorts: 2 }), hdd(3)])).toBe('error'));
  it('M.2 + SATA → note', () => expect(status(18, [mobo({ sataPorts: 4 }), hdd(2), drive()])).toBe('note'));
  it('unknown', () => expect(status(18, [mobo(), hdd()])).toBe('unknown'));
});

describe('rule 19: 3.5" drives ≤ case bays', () => {
  it('pass', () => expect(status(19, [pcase({ bays35: 2 }), hdd(2)])).toBe('pass'));
  it('fail', () => expect(status(19, [pcase({ bays35: 2 }), hdd(3)])).toBe('error'));
  it('unknown', () => expect(status(19, [pcase(), hdd()])).toBe('unknown'));
  it('pass: no 3.5" drives', () => expect(status(19, [pcase(), drive()])).toBe('pass'));
});

describe('rule 20: PCIe 5.0 drive on the board', () => {
  it('pass: Gen4 drive', () => expect(status(20, [mobo(), drive()])).toBe('pass'));
  it('pass: Gen5 slot', () => expect(status(20, [mobo({ m2Gen: 5 }), drive({ pcie: 5 })])).toBe('pass'));
  it('fail → note (runs at Gen4)', () => expect(status(20, [mobo({ m2Gen: 4 }), drive({ pcie: 5 })])).toBe('note'));
  it('unknown', () => expect(status(20, [mobo(), drive({ pcie: 5 })])).toBe('unknown'));
});

describe('rule 21: fans vs case positions (maker list only → warning)', () => {
  const maker = pcase({ fanMounts: [{ n: 3, pos: 'front', size: 120 }, { n: 2, pos: 'top', size: 140 }], fansIncluded: [] });
  it('pass (maker list)', () => expect(status(21, [maker, fan(120, 3)])).toBe('pass'));
  it('fail (maker list) → warning', () => expect(status(21, [maker, fan(140, 3)])).toBe('warning'));
  it('fail (shop page count) → error', () => expect(status(21, [pcase({ fanSlots: 3 }), fan(120, 5)])).toBe('error'));
  it('120 mm within the count → note (estimate)', () => expect(status(21, [pcase({ fanSlots: 6 }), fan(120, 3)])).toBe('note'));
  it('unknown', () => expect(status(21, [pcase(), fan(120, 3)])).toBe('unknown'));
});

describe('rule 22: a case without fans', () => {
  it('pass: fans in the build', () => expect(status(22, [pcase({ fansIncluded: [] }), fan(120, 1)])).toBe('pass'));
  it('pass: fans in the box', () => expect(status(22, [pcase({ fansIncluded: [{ n: 2, pos: 'front', size: 120 }] })])).toBe('pass'));
  it('fail → warning', () => expect(status(22, [pcase({ fansIncluded: [] })])).toBe('warning'));
  it('unknown', () => expect(status(22, [pcase()])).toBe('unknown'));
});

describe('rule 23: fans vs board headers (a note by design, never unknown)', () => {
  it('pass: within stated headers', () => expect(status(23, [mobo({ fanHeaders: 4 }), fan(120, 3)])).toBe('pass'));
  it('fail → note: more than the stated headers', () => expect(status(23, [mobo({ fanHeaders: 3 }), fan(120, 3, 2)])).toBe('note'));
  it('headers not stated: up to 3 pass, more → note (estimate)', () =>
    expect([status(23, [mobo(), fan(120, 3)]), status(23, [mobo(), fan(120, 3, 2)]), basis(23, [mobo(), fan(120, 3, 2)])]).toEqual(['pass', 'note', 'estimate']));
});

describe('rule 24: front USB-C and the board header', () => {
  it('pass: no front USB-C', () => expect(status(24, [mobo(), pcase({ usbCFront: false })])).toBe('pass'));
  it('pass: header', () => expect(status(24, [mobo({ usbCHeader: true }), pcase({ usbCFront: true })])).toBe('pass'));
  it('fail → note', () => expect(status(24, [mobo({ usbCHeader: false }), pcase({ usbCFront: true })])).toBe('note'));
  it('unknown: header not stated', () => expect(status(24, [mobo(), pcase({ usbCFront: true })])).toBe('unknown'));
  it('unknown: front ports not stated', () => expect(status(24, [mobo(), pcase()])).toBe('unknown'));
});

describe('rule 25: memory speed vs the CPU official speed', () => {
  const row = cpuRow('Ryzen 5 7600')!.memory.DDR5!;
  const two = row.sticks2!;
  it('pass: 2 sticks at the official speed', () => expect(status(25, [cpu(), ram({ speed: two })])).toBe('pass'));
  it('faster → note (XMP/EXPO)', () => expect(status(25, [cpu(), ram({ speed: two + 1 })])).toBe('note'));
  it('4 sticks use the 4-stick value (note if lower, else unknown)', () => {
    const expected = row.sticks4 === undefined ? 'unknown' : row.sticks4 < two ? 'note' : 'pass';
    expect(status(25, [cpu(), ram({ speed: two, modules: 4 })])).toBe(expected);
  });
  it('unknown: DDR4 kit on a DDR5-only row', () => expect(status(25, [cpu(), ram({ type: 'DDR4', speed: 3200 })])).toBe('unknown'));
  it('unknown: CPU not in the table', () => expect(status(25, [cpu({}, 'EPYC 4124P'), ram()])).toBe('unknown'));
  it('unknown: RAM without a module count', () => expect(status(25, [cpu(), ram({ modules: null })])).toBe('unknown'));
  it('unknown: RAM without a speed', () => expect(status(25, [cpu(), ram({ speed: null })])).toBe('unknown'));

  describe('with a real Intel row (no 4-stick value)', () => {
    const i5 = (f: Record<string, unknown> = {}) => cpu({ socket: 'LGA1700', ...f }, 'Core i5-14600K');
    it('pass: 2 sticks at the official speed', () => expect(status(25, [i5(), ram({ speed: 5600 })])).toBe('pass'));
    it('faster → note', () => expect(status(25, [i5(), ram({ speed: 6000 })])).toBe('note'));
    it('unknown: 4 sticks (not the 2-stick value)', () => expect(status(25, [i5(), ram({ speed: 5600, modules: 4 })])).toBe('unknown'));
    it('DDR4 kit at the official DDR4 speed → pass', () => expect(status(25, [i5(), ram({ type: 'DDR4', speed: 3200 })])).toBe('pass'));
  });
});

describe('rule 26: RAM–air-cooler clearance (always a note: not checked)', () => {
  it('note with an air cooler', () => expect(status(26, [cooler(), ram()])).toBe('note'));
  it('nothing with an AIO', () => expect(status(26, [cooler({ type: 'AIO', radiator: 240 }), ram()])).toBe('none'));
});

describe('every finding', () => {
  const build = [cpu({ socket: null, igpu: null }), mobo({ memory: null, ramSlots: null }), ram({ modules: 4 }), gpu({ lengthMm: null }), pcase({ maxBoard: null, size: null }), psu(650), hdd(), fan(120, 3), cooler({ sockets: null })];
  const found = evaluate(build);
  it('an unknown says "Δεν μπορέσαμε να ελέγξουμε…" and has basis "unknown"', () => {
    const unknowns = found.filter((f) => f.status === 'unknown');
    expect(unknowns.length).toBeGreaterThan(5);
    for (const f of unknowns) {
      expect(f.message.el.startsWith('Δεν μπορέσαμε να ελέγξουμε')).toBe(true);
      expect(f.message.en.startsWith("We couldn't check")).toBe(true);
      expect(f.basis).toBe('unknown');
    }
  });
  it('errors and warnings come with a fix, in Greek and English', () => {
    const all = [
      ...evaluate([cpu({ coolerIncluded: false, igpu: false }), mobo({ socket: 'AM4', memory: 'DDR4', ramSlots: 2 }), ram({ modules: 4 }), gpu({ lengthMm: 330 }), pcase({ maxBoard: 'Mini ITX' }), psu(400)]),
    ].filter((f) => f.status === 'error' || f.status === 'warning');
    expect(all.length).toBeGreaterThan(5);
    for (const f of all) expect(f.fix?.el && f.fix.en).toBeTruthy();
  });
});
