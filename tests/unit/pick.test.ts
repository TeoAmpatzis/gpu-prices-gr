import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { biosSupport, evaluate, type Context, type Finding, type Part, type PartCategory } from '../../src/engine';
import { SLOTS, slotModels, type Slot } from '../../src/lib/builder';
import {
  CATEGORY_RULE_SLOTS, HIDE_RULES, hides, NEVER_HIDE_WHEN_MISSING, NOT_IN_DATA, PART_FIELDS, toPart, usable,
} from '../../src/lib/pick';
import { checkAll, hidingErrors } from '../../src/lib/pickCheck';
import { VALIDATION_MODE, validateLatest } from '../../src/data/validate';
import { conflicts } from '../../src/data/validate/conflicts';
import { CATEGORY_IDS } from '../../src/lib/categories';
import { withMakerTables } from '../../src/lib/derive';
import type { Category, Latest } from '../../src/types';

// One loader for the latest.json of every category as the build checks it (vite-plugin-data `derive`): validated,
// then the conflicts pass over the shops' spec pages (G1–G4, e.g. cooler `socketsTitle`), then the makers' tables
// (box coolers, case PSU sizes).
let loaded: Partial<Record<Category, Latest>> | undefined;
function validatedData(): Partial<Record<Category, Latest>> {
  if (!loaded) {
    loaded = {};
    for (const c of CATEGORY_IDS) {
      const v = validateLatest(c, JSON.parse(readFileSync(`public/data/${c}/latest.json`, 'utf8')) as Latest, VALIDATION_MODE).latest;
      const specsPath = `public/data/${c}/specs.json`;
      const specs = existsSync(specsPath) ? (JSON.parse(readFileSync(specsPath, 'utf8')) as Record<string, Record<string, unknown>>) : {};
      loaded[c] = withMakerTables(c, conflicts(c, v, specs, VALIDATION_MODE).latest);
    }
  }
  return loaded;
}

let n = 0;
const part = (category: PartCategory, fields: Record<string, unknown>, name: string = category): Part => ({ category, key: `${category}-${++n}`, name, quantity: 1, fields });
const ctx: Context = { bios: biosSupport };
const rules = (fs: { rule: number }[]) => fs.map((f) => f.rule);

const card = part('gpu', { chip: 'RTX 5080', lengthMm: 340, minPsu: 850 });
const small = part('psu', { watts: 550, formFactor: 'ATX' });
const board = part('mobo', { socket: 'AM5', chipset: 'B650', formFactor: 'ATX', memory: 'DDR5', ramSlots: 4 });
const cpu = (socket: string, name: string, extra: Record<string, unknown> = {}) => part('cpu', { socket, igpu: true, coolerIncluded: true, chip: name, ...extra }, name);

describe('hide rules', () => {
  it('the set is exactly 1, 2, 3, 5, 6, 8, 10, 14, 16', () => {
    expect([...HIDE_RULES].sort((a, b) => a - b)).toEqual([1, 2, 3, 5, 6, 8, 10, 14, 16]);
  });
  it('a CPU for another socket is hidden (rule 1)', () => {
    expect(rules(hidingErrors([board], cpu('LGA1700', 'Core i5-12400F'), ctx))).toEqual([1]);
  });
  it('a RAM of the wrong type is hidden (rule 2)', () => {
    expect(rules(hidingErrors([board], part('ram', { type: 'DDR4', modules: 2, capacity: 32 }), ctx))).toEqual([2]);
  });
  it('a board too large for the case is hidden (rule 5)', () => {
    const pc = part('case', { maxBoard: 'Mini ITX' });
    expect(rules(hidingErrors([pc], board, ctx))).toEqual([5]);
  });
  it('a card longer than the case allows is hidden (rule 6)', () => {
    const pc = part('case', { gpuMaxMm: 300 });
    expect(rules(hidingErrors([pc], card, ctx))).toEqual([6]);
  });
  it('rule 14 hides with a stated basis (maker figure) and not on an estimate', () => {
    const weak = part('psu', { watts: 350, formFactor: 'ATX' });
    const stated = hidingErrors([card, weak], part('mobo', { socket: 'AM5' }), ctx);
    expect(evaluate([card, weak], ctx).some((f) => f.rule === 14 && f.status === 'error')).toBe(true); // already there
    expect(stated).toEqual([]); // not the board's doing
    // PSU candidate: the card's own figure (stated) says 850 W
    expect(rules(hidingErrors([card], weak, ctx))).toEqual([14]);
    // estimate basis: a CPU's power limit alone, no card
    const estimate = hidingErrors([weak], cpu('LGA1700', 'Core i9-14900K'), ctx);
    expect(estimate.map((f) => [f.rule, f.basis])).toEqual([]);
  });
  it('rule 14 with a stated basis is only kept when the finding says stated', () => {
    const weak = part('psu', { watts: 350, formFactor: 'ATX' });
    const c = cpu('LGA1700', 'Core i9-14900K');
    const raw = evaluate([weak, c], ctx).filter((f) => f.rule === 14 && f.status === 'error');
    expect(raw.map((f) => f.basis)).toEqual(['estimate']);
    expect(hidingErrors([weak], c, ctx)).toEqual([]);
  });
  it('rule 21 is shown, not hidden', () => {
    const pc = part('case', { fanSlots: 2 });
    const fans = part('fan', { size: 120, pack: 3 });
    expect(evaluate([pc, fans], ctx).some((f) => f.rule === 21 && f.status === 'error')).toBe(true);
    expect(hidingErrors([pc], fans, ctx)).toEqual([]);
  });
  it('warnings, notes and unknown never hide', () => {
    const ok = part('case', { size: 'Midi Tower' });
    const candidate = part('mobo', { socket: null, formFactor: null, memory: null });
    const build = [ok, cpu('AM5', 'Ryzen 5 7600')];
    // the engine does say something about it (unknowns / warnings), and none of it hides
    const said = evaluate([...build, candidate], ctx).filter((f) => f.parts.includes(candidate.key));
    expect(said.some((f) => f.status === 'unknown' || f.status === 'warning')).toBe(true);
    expect(said.some((f) => f.status === 'error')).toBe(false);
    expect(hidingErrors(build, candidate, ctx)).toEqual([]);
  });
  it('rule 13 not-listed (a warning) does not hide a board', () => {
    const c = cpu('AM5', 'Ryzen 5 7600');
    const b = part('mobo', { socket: 'AM5', chipset: 'A620', formFactor: 'ATX', memory: 'DDR5' });
    const bios = () => 'not-listed' as const;
    const f = evaluate([c, b], { bios }).filter((x) => x.rule === 13);
    expect(f.map((x) => x.status)).toEqual(['warning']);
    expect(hidingErrors([c], b, { bios })).toEqual([]);
  });
  it('rule 13 unsupported is an error but not in the hide set: shown, not hidden', () => {
    const c = cpu('AM5', 'Ryzen 5 7600');
    const b = part('mobo', { socket: 'AM5', chipset: 'A620', formFactor: 'ATX', memory: 'DDR5' });
    const bios = () => 'unsupported' as const;
    expect(hidingErrors([c], b, { bios })).toEqual([]);
  });
});

describe('rules 11 and 12', () => {
  it('the constant names the missing part', () => {
    expect(NEVER_HIDE_WHEN_MISSING).toEqual({ 11: 'cooler', 12: 'gpu' });
  });
  it('a CPU with no cooler in the box does not hide with no cooler in the build (K/KF/X)', () => {
    const k = cpu('LGA1700', 'Core i7-14700K', { coolerIncluded: false });
    const b = part('mobo', { socket: 'LGA1700', formFactor: 'ATX', memory: 'DDR5' });
    expect(evaluate([b, k], ctx).some((f) => f.rule === 11 && f.status === 'error')).toBe(true);
    expect(hidingErrors([b], k, ctx)).toEqual([]);
  });
  it('a CPU with no integrated graphics does not hide with no card (F)', () => {
    const f = cpu('LGA1700', 'Core i5-12400F', { igpu: false });
    expect(evaluate([f], ctx).some((x) => x.rule === 12 && x.status === 'error')).toBe(true);
    expect(hidingErrors([], f, ctx)).toEqual([]);
    const intel = part('mobo', { socket: 'LGA1700', chipset: 'B660', formFactor: 'ATX', memory: 'DDR5', ramSlots: 4 });
    expect(hidingErrors([intel], f, ctx)).toEqual([]);
  });
  it('with the other part present the engine passes 11/12 (nothing to hide)', () => {
    const f = cpu('LGA1700', 'Core i5-12400F', { igpu: false });
    expect(evaluate([card, f], ctx).filter((x) => x.rule === 12).map((x) => x.status)).toEqual(['pass']);
    expect(hidingErrors([card], f, ctx).filter((x) => x.rule === 12)).toEqual([]);
  });
  it('a faked 11/12 error with the other part present follows HIDE_RULES (not in it: not hidden); missing part: never', () => {
    const fake = (rule: 11 | 12): Finding => ({ rule, status: 'error', basis: 'stated', parts: ['x'], message: { el: '', en: '' } });
    const cooler = part('cooler', { type: 'Air' });
    expect(HIDE_RULES.has(11)).toBe(false);
    expect(HIDE_RULES.has(12)).toBe(false);
    expect(hides(fake(11), [cooler])).toBe(false);
    expect(hides(fake(12), [card])).toBe(false);
    expect(hides(fake(11), [])).toBe(false);
    expect(hides(fake(12), [])).toBe(false);
  });
  it('hides() follows the set for other rules: rule 1 error hides, 14 estimate does not, 14 stated does, warning never', () => {
    const f = (rule: number, status: Finding['status'], basis: Finding['basis']): Finding => ({ rule: rule as Finding['rule'], status, basis, parts: ['x'], message: { el: '', en: '' } });
    expect(hides(f(1, 'error', 'stated'), [])).toBe(true);
    expect(hides(f(14, 'error', 'estimate'), [])).toBe(false);
    expect(hides(f(14, 'error', 'stated'), [])).toBe(true);
    expect(hides(f(1, 'warning', 'stated'), [])).toBe(false);
    expect(hides(f(21, 'error', 'stated'), [])).toBe(false);
  });
});

describe('C-01', () => {
  it('a PSU too small for the card does not hide ordinary or top-tier CPUs', () => {
    for (const name of ['Ryzen 5 7600', 'Ryzen 9 9950X', 'Ryzen 7 9800X3D']) {
      expect(hidingErrors([card, small, board], cpu('AM5', name), ctx)).toEqual([]);
    }
    expect(evaluate([card, small], ctx).some((f) => f.rule === 14 && f.status === 'error')).toBe(true);
  });
  it('the candidate PSU itself is hidden when too small for the card', () => {
    expect(rules(hidingErrors([card, board], small, ctx))).toEqual([14]);
  });
});

describe('checkAll', () => {
  it('returns hide + all the candidate\'s own findings per key', () => {
    const wrong = cpu('LGA1700', 'Core i5-12400F');
    const right = cpu('AM5', 'Ryzen 5 7600');
    const out = checkAll([board], 'cpu', [wrong, right], ctx);
    expect(out.get(wrong.key)?.hide).toBe(true);
    expect(out.get(right.key)?.hide).toBe(false);
    expect(out.get(wrong.key)?.findings.some((f) => f.rule === 1 && f.status === 'error')).toBe(true);
    expect(out.get(right.key)?.findings.some((f) => f.status === 'error')).toBe(false);
  });
  it('C-01 row: a pre-existing PSU error is not shown as the CPU\'s own (RTX 5080 + 550 W + AM5 board)', () => {
    const c = cpu('AM5', 'Ryzen 5 7600');
    const out = checkAll([card, small, board], 'cpu', [c], ctx).get(c.key)!;
    expect(out.hide).toBe(false);
    expect(evaluate([card, small, board, c], ctx).some((f) => f.rule === 14 && f.status === 'error' && f.parts.includes(c.key))).toBe(true); // the engine names it
    expect(out.findings.some((f) => f.rule === 14 && f.status === 'error')).toBe(false);
    expect(out.findings.every((f) => f.status !== 'error')).toBe(true);
  });
  it('a candidate\'s own errors are in its findings (PSU too small for the card)', () => {
    const out = checkAll([card, board], 'psu', [small], ctx).get(small.key)!;
    expect(out.hide).toBe(true);
    expect(out.findings.filter((f) => f.status === 'error').map((f) => f.rule)).toEqual([14]);
  });
  it('hide equals hidingErrors for every candidate (one shared evaluation of the base build)', () => {
    const psus = [small, part('psu', { watts: 1000, formFactor: 'ATX' }), part('psu', { watts: 350, formFactor: 'ATX' })];
    const out = checkAll([card, board], 'psu', psus, ctx);
    for (const p of psus) expect(out.get(p.key)?.hide).toBe(hidingErrors([card, board], p, ctx).length > 0);
  });
  it('replaces the part of the slot: the build without it', () => {
    const old = cpu('LGA1700', 'Core i5-12400F');
    const right = cpu('AM5', 'Ryzen 5 7600');
    const out = checkAll([board, old], 'cpu', [right], ctx);
    expect(out.get(right.key)?.hide).toBe(false);
  });
  it('the candidate\'s findings include warnings and notes (for the row)', () => {
    const right = cpu('AM5', 'Ryzen 5 7600', { igpu: null }); // rule 12 can't tell: an unknown names it
    const out = checkAll([board], 'cpu', [right], ctx);
    const rule1 = out.get(right.key)!.findings.filter((f) => f.rule === 1);
    expect(rule1.map((f) => f.status)).toEqual(['pass']);
    expect(out.get(right.key)!.findings.filter((f) => f.rule === 12).map((f) => f.status)).toEqual(['unknown']);
  });
});

// The rule files (every .ts in src/engine/rules): function bodies by name, so helpers a rule calls are followed.
const RULES_DIR = 'src/engine/rules';
const ruleFiles = readdirSync(RULES_DIR).filter((f) => f.endsWith('.ts'));
const sources = new Map(ruleFiles.map((f) => [f, readFileSync(`${RULES_DIR}/${f}`, 'utf8')]));
const bodies = new Map<string, string>();
for (const src of sources.values()) {
  for (const m of src.matchAll(/(?:export )?function (\w+)\([^)]*\)[^{]*\{([\s\S]*?)\n\}\n/g)) bodies.set(m[1], m[2]);
}
const directSlots = (body: string) => new Set([...body.matchAll(/\b(?:one|all)\(b, '(\w+)'\)/g)].map((u) => u[1]));
/** Slots read by helpers (functions of the rule files) a body calls, transitively. */
function helperSlots(body: string, seen = new Set<string>()): Set<string> {
  const out = new Set<string>();
  for (const c of body.matchAll(/\b(\w+)\(/g)) {
    const h = bodies.get(c[1]);
    if (!h || seen.has(c[1])) continue;
    seen.add(c[1]);
    for (const s of directSlots(h)) out.add(s);
    for (const s of helperSlots(h, seen)) out.add(s);
  }
  return out;
}

describe('CATEGORY_RULE_SLOTS', () => {
  // A rule's own slots (one/all in its body) need each other's parts, and the slots its helpers read (rule 14's
  // `powerEstimate`: ram, storage, fan, cooler) are needed by the rule's own slots' pages.
  const SLOT_NAMES = ['cpu', 'mobo', 'ram', 'gpu', 'cooler', 'storage', 'case', 'fan', 'psu'];
  const pairs = new Set<string>();
  for (const [name, body] of bodies) {
    if (!/^rule\d+$/.test(name)) continue;
    const own = directSlots(body);
    const everything = new Set([...own, ...helperSlots(body)]);
    for (const a of own) for (const b of everything) if (a !== b) pairs.add(`${a}>${b}`);
  }
  it('has an entry per slot, all valid slots, no self-reference', () => {
    expect(Object.keys(CATEGORY_RULE_SLOTS).sort()).toEqual([...SLOT_NAMES].sort());
    for (const [s, list] of Object.entries(CATEGORY_RULE_SLOTS)) {
      for (const o of list) { expect(SLOT_NAMES).toContain(o); expect(o).not.toBe(s); }
    }
  });
  it('the scan follows helpers: rule 14 reaches ram, storage, fan and cooler through powerEstimate', () => {
    expect(bodies.has('powerEstimate')).toBe(true);
    expect(helperSlots(bodies.get('rule14')!)).toEqual(new Set(['gpu', 'cpu', 'ram', 'storage', 'fan', 'cooler']));
    for (const a of ['cpu', 'gpu', 'psu']) for (const b of ['ram', 'storage', 'fan', 'cooler']) expect(pairs.has(`${a}>${b}`)).toBe(true);
  });
  it('covers every slot pair the rules read together (own reads and helpers)', () => {
    expect(pairs.size).toBeGreaterThan(20);
    for (const p of pairs) {
      const [a, b] = p.split('>');
      expect([p, CATEGORY_RULE_SLOTS[a as Slot].includes(b as Slot)]).toEqual([p, true]);
    }
  });
  it('lists nothing the rules never pair (the table is no wider than the code)', () => {
    for (const [a, list] of Object.entries(CATEGORY_RULE_SLOTS)) {
      for (const b of list) expect([`${a}>${b}`, pairs.has(`${a}>${b}`)]).toEqual([`${a}>${b}`, true]);
    }
  });
});

describe('field guard: every field a rule reads is carried by toPart or has no value in the data (NOT_IN_DATA)', () => {
  const CATEGORY_OF_VAR: Record<string, PartCategory> = {
    cpu: 'cpu', mobo: 'mobo', ram: 'ram', rams: 'ram', r: 'ram', gpu: 'gpu', cooler: 'cooler', c: 'cooler',
    drives: 'storage', d: 'storage', big: 'storage', gen5: 'storage', fans: 'fan', f: 'fan', pc: 'case', psu: 'psu',
  };
  const reads: { cat: PartCategory; field: string; where: string }[] = [];
  for (const [file, src] of sources) {
    for (const m of src.matchAll(/\b(?:num|str|bool|total|list)(?:<[^>]*>)?\(\s*([A-Za-z0-9_]+)\s*,\s*'([A-Za-z0-9]+)'/g)) {
      const cat = CATEGORY_OF_VAR[m[1]];
      expect([`${file}: variable ${m[1]} for field ${m[2]}`, cat !== undefined]).toEqual([`${file}: variable ${m[1]} for field ${m[2]}`, true]);
      reads.push({ cat, field: m[2], where: file });
    }
  }
  const readSet = new Map(reads.map((r) => [`${r.cat}.${r.field}`, r]));
  /** Listings of the category with a non-null value for the field (v2's validated data). */
  const valueCount = (cat: PartCategory, field: string) =>
    ((validatedData()[cat as Category]?.listings ?? []) as unknown as Record<string, unknown>[]).filter((l) => l[field] != null).length;

  it('finds the reads (the scan is not vacuous)', () => {
    expect(reads.length).toBeGreaterThan(50);
    expect(reads).toContainEqual({ cat: 'mobo', field: 'm2Slots', where: 'storage.ts' });
    expect(readSet.has('psu.atx3')).toBe(true);
  });
  it('each is in PART_FIELDS for its category or on NOT_IN_DATA', () => {
    for (const { cat, field, where } of reads) {
      const ok = PART_FIELDS[cat].includes(field) || NOT_IN_DATA[cat].includes(field);
      expect([`${where}: ${cat}.${field}`, ok]).toEqual([`${where}: ${cat}.${field}`, true]);
    }
  });
  it('a read field with no value in any listing is on NOT_IN_DATA; a listed one has none', () => {
    for (const { cat, field } of readSet.values()) {
      const listed = NOT_IN_DATA[cat].includes(field);
      const count = valueCount(cat, field);
      expect([`${cat}.${field} listed=${listed}`, listed ? count === 0 : count > 0]).toEqual([`${cat}.${field} listed=${listed}`, true]);
    }
  });
  it('every NOT_IN_DATA entry is a field a rule reads', () => {
    for (const slot of SLOTS) for (const field of NOT_IN_DATA[slot]) expect([`${slot}.${field}`, readSet.has(`${slot}.${field}`)]).toEqual([`${slot}.${field}`, true]);
  });
});
describe('performance', () => {
  it('checkAll over every usable case with a full build', () => {
    const validated = validatedData();
    const pick = (slot: Slot) => {
      const ms = slotModels(slot, (validated[slot as Category]?.listings ?? []) as never[]).filter((m) => usable(slot, m as never));
      return toPart(slot, ms[Math.floor(ms.length / 3)] as never);
    };
    const build = (['cpu', 'mobo', 'ram', 'gpu', 'cooler', 'psu', 'storage', 'fan'] as Slot[]).map(pick);
    const cases = slotModels('case', (validated.case?.listings ?? []) as never[]).filter((m) => usable('case', m as never)).map((m) => toPart('case', m as never));
    const times: number[] = [];
    let out = new Map();
    for (let i = 0; i < 5; i++) {
      const t = performance.now();
      out = checkAll(build, 'case', cases, ctx);
      times.push(performance.now() - t);
    }
    times.sort((a, b) => a - b);
    console.log(`checkAll: ${cases.length} cases, median ${times[2].toFixed(1)} ms (all: ${times.map((x) => x.toFixed(1)).join(', ')})`);
    expect(out.size).toBe(cases.length);
  });
});
