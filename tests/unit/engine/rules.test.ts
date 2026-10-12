// Every rule of the engine (1–26) with a pass, a fail and an unknown case where the rule has them.
// Rules 23 and 26 are notes by design (no "unknown"); rule 13 reads the BIOS lookup from the context:
// small injected lookups test every verdict, the real official table (biosSupport) is tested on pairs read from BIOS.
import { describe, expect, it } from 'vitest';
import { evaluate, powerEstimate, type Context, type Part, type PartCategory, type RuleId } from '../../../src/engine';
import { ruleResult } from '../../compat/engine-adapter';
import { CPU_MEMORY, cpuRow } from '../../../src/engine/data/cpuMemory';
import { BIOS, biosSupport } from '../../../src/engine';
import { cpuPowerRow } from '../../../src/engine/data/cpuPower';
import { gpuPowerRow } from '../../../src/engine/data/gpuPower';
import { MARGIN, POWER } from '../../../src/engine/tables';

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

describe('rule 13: BIOS (injected lookup)', () => {
  const bios: Context['bios'] = (chipset, name) => (chipset === 'B650' && /9\d00X/.test(name) ? 'update' : chipset === 'X870' ? 'ok' : chipset === 'A320' ? 'unsupported' : undefined);
  const r9 = (chipset: string) => [cpu({}, 'Ryzen 7 9700X'), mobo({ chipset })];
  it('unknown without a lookup', () => expect(status(13, r9('B650'))).toBe('unknown'));
  it('pass (with a table)', () => expect(status(13, r9('X870'), { bios })).toBe('pass'));
  it('update → warning (with a table)', () => expect(status(13, r9('B650'), { bios })).toBe('warning'));
  it('fail (with a table)', () => expect(status(13, r9('A320'), { bios })).toBe('error'));
  it('unknown when the table has no row', () => expect(status(13, r9('B850'), { bios })).toBe('unknown'));
});

describe('rule 13: BIOS (the real official table)', () => {
  // Pairs are read from BIOS, not hard-coded: the first row of a verdict and a CPU of its generation.
  const pair = (verdict: 'ok' | 'update' | 'unsupported') => {
    for (const row of BIOS.filter((r) => r.verdict === verdict)) {
      const model = CPU_MEMORY.flatMap((c) => c.models.map((m) => ({ m, g: c.generation }))).find((c) => c.g === row.generation && biosSupport(row.chipsets[0], c.m) === verdict);
      if (model) return { chipset: row.chipsets[0], cpuName: model.m };
    }
    return undefined;
  };
  const run = (p: { chipset: string; cpuName: string }, mf: Record<string, unknown> = {}) =>
    ruleResult(evaluate([cpu({}, p.cpuName), mobo({ chipset: p.chipset, ...mf })], { bios: biosSupport }), 13)!;

  it('ok pair → pass, worded as what the maker lists (no claim about a BIOS update)', () => {
    const p = pair('ok')!; expect(p).toBeDefined();
    const f = run(p);
    expect(f.status).toBe('pass');
    expect(f.message.en).toBe('The maker lists this chipset as compatible with this CPU generation.');
    expect(f.message.el).toBe('Ο κατασκευαστής δηλώνει αυτό το chipset συμβατό με αυτή τη γενιά επεξεργαστή.');
    expect(f.fix?.en).toMatch(/BIOS version/);
    expect(f.fix?.el).toMatch(/BIOS/);
  });
  it('update pair → warning, Flashback wording when the board has it', () => {
    const p = pair('update')!; expect(p).toBeDefined();
    expect(run(p).status).toBe('warning');
    expect(run(p, { biosFlashback: false }).message.en).not.toMatch(/Flashback/);
    expect(run(p, { biosFlashback: true }).message.en).toMatch(/Flashback/);
  });
  // The table has no 'unsupported' row today (AMD's lists say they are not exhaustive); the verdict is covered by the injected lookup above.
  it('no unsupported row exists today', () => expect(pair('unsupported')).toBeUndefined());
  it('a pair with no official statement → unknown with the new wording', () => {
    const f = run({ chipset: 'B650', cpuName: 'Ryzen 5 7600' });
    expect(f.status).toBe('unknown');
    expect(f.message.en).toMatch(/no official statement for this chipset and CPU generation/);
    expect(f.message.en).not.toMatch(/no .*table yet/);
  });
  it('an unknown CPU name → unknown', () => expect(run({ chipset: 'X870', cpuName: 'Ryzen 99 0000X' }).status).toBe('unknown'));
});

describe("rule 14: PSU vs the maker figure and the whole-build estimate (owner's rule)", () => {
  const msgEl = (parts: Part[]) => ruleResult(evaluate(parts, {}), 14)?.message.el ?? '';
  const I7 = 'Core i7-14700K'; // Intel: a PL2 row, so the formula exists
  const pl2 = cpuPowerRow(I7)!.watts;
  const g70 = gpuPowerRow('RTX 5070')!;
  const g90 = gpuPowerRow('RTX 5090')!;
  const intel = (name = I7) => cpu({ socket: 'LGA1700' }, name);
  const roundUp = (w: number) => Math.ceil((w * POWER.headroom) / POWER.roundToW) * POWER.roundToW;
  // Base build: Intel CPU + RTX 5070 (card minPsu 650), one RAM kit of 2 sticks, one drive, no fans.
  const base = (w: number, card: Part = gpu()) => [intel(), card, ram(), drive(), psu(w)];
  const est = powerEstimate(base(1000));
  const formula = est.formulaW!;
  const maker = est.makerW!;

  it('numbers come from the tables', () => {
    expect(est.totalW).toBe(g70.boardPowerW! + pl2 + POWER.boardW + 2 * POWER.perStickW + POWER.perDriveW);
    expect(formula).toBe(roundUp(est.totalW!));
    expect(maker).toBe(Math.max(650, g70.makerPsuW!));
    expect(maker).toBeLessThan(formula); // the levels below need this gap
  });
  it('level 1: neither figure -> unknown (AMD CPU, no card)', () => expect(status(14, [cpu(), psu(550)])).toBe('unknown'));
  it('level 1: unknown card chip without minPsu, AMD CPU -> unknown', () =>
    expect(status(14, [cpu(), gpu({ chip: 'Unknown X', minPsu: null }), psu(550)])).toBe('unknown'));
  it('level 2: below the maker figure -> error, stated', () => {
    const parts = base(maker - 50);
    expect([status(14, parts), basis(14, parts)]).toEqual(['error', 'stated']);
    expect(msgEl(parts)).toContain(`${maker} W`);
  });
  it('level 3: no maker figure (no card), below the formula -> error, estimate', () => {
    const parts = [intel(), ram(), drive(), psu(300)];
    const e = powerEstimate(parts);
    expect([e.makerW, e.formulaW]).toEqual([null, roundUp(pl2 + POWER.boardW + 2 * POWER.perStickW + POWER.perDriveW)]);
    expect([status(14, parts), basis(14, parts)]).toEqual(['error', 'estimate']);
  });
  it('level 3 edge: exactly at the formula is not an error (tight warning)', () => {
    const f = powerEstimate([intel(), ram(), drive(), psu(300)]).formulaW!;
    const parts = [intel(), ram(), drive(), psu(f)];
    expect(status(14, parts)).toBe('warning');
    expect(msgEl(parts)).toContain('Οριακό');
    expect(status(14, [intel(), ram(), drive(), psu(f - 50)])).toBe('error');
  });
  it('level 5 at watts == formula says "Tight", level 4 says it reaches the maker figure', () => {
    expect(msgEl(base(formula))).toContain('Οριακό');
    expect(msgEl(base(formula))).not.toContain('φτάνει το νούμερο');
    expect(msgEl(base(maker))).toContain('φτάνει το νούμερο');
    expect(msgEl(base(maker))).not.toContain('Οριακό');
  });
  it('fix text names the smallest passing wattage', () => {
    const limit = Math.floor(formula * (1 + MARGIN.psuShare)) + 1;
    const r = ruleResult(evaluate(base(formula), {}), 14)!;
    expect(r.fix?.en).toContain(`at least ${limit} W`);
    expect(status(14, base(limit))).toBe('pass');
    expect(status(14, base(limit - 1))).toBe('warning');
  });
  it('no CPU yet and no maker figure: error only when even card + board is too much for the PSU', () => {
    const arc = gpu({ chip: 'Arc A750', minPsu: null });
    const lower = powerEstimate([arc, psu(300)]).formulaWithoutCpuW!;
    expect(lower).toBe(roundUp(gpuPowerRow('Arc A750')!.boardPowerW! + POWER.boardW));
    expect([status(14, [arc, psu(lower - 50)]), basis(14, [arc, psu(lower - 50)])]).toEqual(['error', 'estimate']);
    expect(msgEl([arc, psu(lower - 50)])).toContain('χωρίς την ισχύ του επεξεργαστή');
    expect(status(14, [arc, psu(lower)])).toBe('unknown');
    // a maker figure present: the lower bound is not used, and with a CPU it is null
    expect(powerEstimate([gpu(), psu(300)]).formulaW).toBeNull();
    expect(powerEstimate([intel(), arc, psu(300)]).formulaWithoutCpuW).toBeNull();
  });
  it('a CPU without a power-limit row (AMD): the lower bound still gives an error, the CPU not in the finding', () => {
    const arc = gpu({ chip: 'Arc A750', minPsu: null }), amd = cpu({}, 'Ryzen 5 7600');
    const lower = powerEstimate([arc, amd, psu(300)]).formulaWithoutCpuW!;
    expect(lower).toBe(roundUp(gpuPowerRow('Arc A750')!.boardPowerW! + POWER.boardW));
    const low = [arc, amd, psu(300)];
    expect([status(14, low), basis(14, low)]).toEqual(['error', 'estimate']);
    expect(ruleResult(evaluate(low, {}), 14)!.parts).not.toContain(amd.key);
    expect(status(14, [arc, amd, psu(450)])).toBe('unknown');
  });
  it('the CPU is in the finding parts only when its row went into the figure', () => {
    const amd = cpu({}, 'Ryzen 5 7600'), il = intel();
    const keysOf = (parts: Part[]) => ruleResult(evaluate(parts, {}), 14)!.parts;
    expect(keysOf([amd, gpu(), psu(500)])).not.toContain(amd.key);
    expect(keysOf([il, gpu(), psu(maker - 50)])).toContain(il.key);
  });
  it('level 4 with a lower bound: maker figure reached, CPU power unknown, lower bound not -> warning, estimate', () => {
    // Arc A750 has a board-power row but no maker PSU figure; the card states 300 W. AMD CPU: no power-limit row.
    const arc = gpu({ chip: 'Arc A750', minPsu: 300 }), amd = cpu({}, 'Ryzen 5 7600');
    const parts = (w: number) => [arc, amd, ram(), drive(), fan(120, 3, 2), psu(w)];
    const e = powerEstimate(parts(300));
    expect([e.makerW, e.formulaW]).toEqual([300, null]);
    const lower = e.formulaWithoutCpuW!;
    expect(lower).toBeGreaterThan(300);
    expect([status(14, parts(300)), basis(14, parts(300))]).toEqual(['warning', 'estimate']);
    expect(msgEl(parts(300))).toContain('φτάνει το νούμερο του κατασκευαστή');
    expect(msgEl(parts(300))).toContain(`${lower} W`);
    expect(msgEl(parts(300))).toContain('χωρίς την ισχύ του επεξεργαστή');
    expect(ruleResult(evaluate(parts(300), {}), 14)!.message.en).toContain("even without the CPU's power");
    expect(status(14, parts(299))).toBe('error'); // below the maker figure
    expect(status(14, parts(lower))).not.toBe('error');
    expect(msgEl(parts(lower))).not.toContain('φτάνει το νούμερο');
  });
  it('estimate-missing text reads after "we don\'t know" (AMD CPU, maker figure only)', () => {
    const parts = [cpu({}, 'Ryzen 5 7600'), gpu(), psu(2000)];
    const r = ruleResult(evaluate(parts, {}), 14)!;
    expect(r.message.en).toBe(`2000 W power supply; the maker asks for ${maker} W. The whole-build estimate is missing: we don't know the CPU's power limit (Ryzen 5 7600: no official page in our tables).`);
    expect(r.message.el).toBe(`Τροφοδοτικό 2000 W· ο κατασκευαστής ζητά ${maker} W. Η εκτίμηση για όλο το build λείπει: δεν ξέρουμε το όριο ισχύος του επεξεργαστή (Ryzen 5 7600: καμία επίσημη σελίδα στις πηγές μας).`);
  });
  it('estimate-missing text for the no-CPU case stands on its own', () => {
    const r = ruleResult(evaluate([gpu(), psu(2000)], {}), 14)!;
    expect(r.message.en).toBe(`2000 W power supply; the maker asks for ${maker} W. The whole-build estimate is missing: no CPU is chosen yet.`);
    expect(r.message.el).toBe(`Τροφοδοτικό 2000 W· ο κατασκευαστής ζητά ${maker} W. Η εκτίμηση για όλο το build λείπει: δεν έχεις διαλέξει ακόμα επεξεργαστή.`);
  });
  it('estimate-missing text: unknown card power and stick count are accusative noun phrases', () => {
    const r = ruleResult(evaluate([intel(), gpu({ chip: 'Unknown X' }), ram({ modules: null }), psu(2000)], {}), 14)!;
    expect(r.message.en).toContain("we don't know the card's board power (the chip has no official page in our tables), the number of memory sticks.");
    expect(r.message.el).toContain('δεν ξέρουμε την κατανάλωση της κάρτας (δεν υπάρχει επίσημη σελίδα για το τσιπ στις πηγές μας), τον αριθμό των μονάδων μνήμης.');
  });
  it("unknown when the PSU's own wattage is not stated says so", () => {
    const r = ruleResult(evaluate([intel(), gpu(), psu(0, { watts: null })], {}), 14)!;
    expect(r.status).toBe('unknown');
    expect(r.message.en).toContain("doesn't state its wattage");
    expect(r.message.el).toContain('δεν δηλώνει την ισχύ του');
  });
  it('level 4: at the maker figure but below the formula -> warning, estimate', () => {
    for (const w of [maker, formula - 50]) {
      const parts = base(w);
      expect([status(14, parts), basis(14, parts)]).toEqual(['warning', 'estimate']);
    }
    expect(msgEl(base(maker))).toContain(`${formula} W`);
  });
  it('level 5: at/above both figures, within +10% of the larger -> warning (tight)', () => {
    expect(status(14, base(formula))).toBe('warning');
    expect(status(14, base(Math.floor(formula * (1 + MARGIN.psuShare))))).toBe('warning');
  });
  it('level 5: above +10% -> pass', () => expect(status(14, base(Math.floor(formula * (1 + MARGIN.psuShare)) + 1))).toBe('pass'));
  it('level 5 basis: estimate when the formula is the larger, stated when the maker figure decides', () => {
    expect(basis(14, base(10000))).toBe('estimate');
    const amd = [cpu({}, 'Ryzen 5 7600'), gpu({ chip: 'RTX 5090', minPsu: 1000 }), psu(2000)];
    const e = powerEstimate(amd);
    expect([e.formulaW, e.makerW]).toEqual([null, Math.max(1000, g90.makerPsuW!)]);
    expect([status(14, amd), basis(14, amd)]).toEqual(['pass', 'stated']);
  });
  it("owner's example, level 5: 9950X (no AMD PPT row, so no formula) + RTX 5090 + 1000 W -> warning", () => {
    const parts = [cpu({}, 'Ryzen 9 9950X'), mobo(), ram({ modules: 4 }), gpu({ chip: 'RTX 5090', minPsu: 1000 }), drive({}, 2), fan(120, 3, 2), psu(1000)];
    const e = powerEstimate(parts);
    expect([e.formulaW, e.makerW, e.makerFrom]).toEqual([null, 1000, 'card']);
    expect(status(14, parts)).toBe('warning');
    expect(status(14, [...parts.slice(0, -1), psu(950)])).toBe('error');
  });
  it('a card chip not in the table: formula null, maker figure from the card minPsu only', () => {
    const parts = base(700, gpu({ chip: 'Unknown X', minPsu: 650 }));
    const e = powerEstimate(parts);
    expect([e.totalW, e.formulaW, e.makerW, e.makerFrom]).toEqual([null, null, 650, 'card']);
    expect(e.missing.length).toBeGreaterThan(0);
    expect(status(14, parts)).toBe('warning'); // 700 <= 650 * 1.1 = 715
    expect(msgEl(parts)).toContain('650');
  });
  it('makerFrom: chip when the chip table is larger, card on a tie or when it is larger', () => {
    expect(powerEstimate([gpu({ chip: 'RTX 5070', minPsu: 300 })]).makerFrom).toBe('chip');
    expect(powerEstimate([gpu({ chip: 'RTX 5070', minPsu: g70.makerPsuW })]).makerFrom).toBe('card');
    expect(powerEstimate([gpu({ chip: 'RTX 5070', minPsu: 2000 })]).makerFrom).toBe('card');
    expect(powerEstimate([gpu({ chip: 'RTX 5070', minPsu: null })]).makerW).toBe(g70.makerPsuW);
  });
  it('no card: card term 0, maker figure null, formula from CPU + rest', () => {
    const e = powerEstimate([intel(), ram(), psu(500)]);
    expect(e.makerW).toBeNull();
    expect(e.parts.some((p) => p.key === 'gpu')).toBe(false);
    expect(e.totalW).toBe(pl2 + POWER.boardW + 2 * POWER.perStickW);
  });
  it('the breakdown sums to totalW', () => {
    const parts = [intel(), mobo(), ram({ modules: 2 }, 2), gpu(), cooler({ type: 'AIO' }), drive({}, 3), fan(120, 3, 2), psu(1000)];
    const e = powerEstimate(parts);
    expect(e.parts.reduce((s, p) => s + p.watts, 0)).toBe(e.totalW);
    expect(e.parts.map((p) => p.key)).toEqual(['gpu', 'cpu', 'board', 'ram', 'storage', 'fan', 'pump']);
  });
  it('quantities: RAM kits x modules, drives, fans pack x quantity, AIO pump', () => {
    const w = (extra: Part[]) => powerEstimate([intel(), gpu(), ...extra]).totalW!;
    const none = w([]);
    expect(w([ram({ modules: 2 }, 2)]) - none).toBe(4 * POWER.perStickW);
    expect(w([drive({}, 3)]) - none).toBe(3 * POWER.perDriveW);
    expect(w([fan(120, 3, 2)]) - none).toBe(6 * POWER.perFanW);
    expect(w([cooler({ type: 'AIO' })]) - none).toBe(POWER.pumpW);
    expect(w([cooler({ type: 'Air' })]) - none).toBe(0);
  });
  it('a RAM part without modules: total unknown', () => {
    const e = powerEstimate([intel(), gpu(), ram({ modules: null })]);
    expect([e.totalW, e.formulaW]).toEqual([null, null]);
    expect(e.missing.length).toBeGreaterThan(0);
  });
  it('an AMD CPU has no power-limit row: total unknown, reason listed', () => {
    const e = powerEstimate([cpu(), gpu()]);
    expect([e.totalW, e.formulaW]).toEqual([null, null]);
    expect(e.missing.length).toBeGreaterThan(0);
  });
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
  it('4 sticks use the 4-stick value (Ryzen 5 7600: 4-stick speed below the 2-stick one → note)', () => {
    expect(row.sticks4).toBeDefined();
    expect(row.sticks4!).toBeLessThan(two);
    expect(status(25, [cpu(), ram({ speed: two, modules: 4 })])).toBe('note');
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
