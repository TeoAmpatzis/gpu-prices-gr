// Pick mode's view of the saved build (v2 step 3): stored fields validated before the engine sees them,
// refreshed when the page's data is newer (A7), missing keys kept as "no longer available" (A9), and the
// candidate check run in slices.
import { describe, expect, it } from 'vitest';
import { biosSupport, type Part } from '../../src/engine';
import type { StoredBuild } from '../../src/lib/buildStore';
import { checkAll } from '../../src/lib/pick';
import { applyRefresh, isPlainValue, isStale, partOf, planBuild, runSliced, validStored, type Schedule } from '../../src/lib/pickBuild';

const OLD = '2026-10-10T05:51:00.000Z';
const NOW = '2026-10-12T15:02:34.392Z';
const am5Board = { chip: 'X', chipset: 'B650', socket: 'AM5', formFactor: 'ATX', memory: 'DDR5', ramSlots: 4 };

describe('stored fields are validated (carried requirement 1)', () => {
  it('plain JSON values pass, nested lists of objects too (case fanMounts)', () => {
    expect(isPlainValue({ a: 'x', b: 1, c: true, d: null, e: [1, 'two'], f: [{ pos: 'front', size: 120, n: 3 }] })).toBe(true);
    expect(validStored({ key: 'k', fields: am5Board, builtAt: OLD })).toEqual({ fields: am5Board, builtAt: OLD });
  });
  it('anything else makes the part "no fields"', () => {
    const bad: unknown[] = [
      { f: () => 1 },
      { d: new Date() },
      { n: Number.NaN },
      { i: Infinity },
      { u: undefined },
      { m: new Map() },
      { deep: [[[[['too deep']]]]] },
      { s: Symbol('x') },
    ];
    for (const fields of bad) expect([fields, validStored({ key: 'k', fields: fields as Record<string, unknown>, builtAt: OLD })]).toEqual([fields, null]);
    expect(validStored({ key: 'k', fields: ['a'] as never, builtAt: OLD })).toBeNull();
    expect(validStored({ key: 'k', fields: 'AM5' as never, builtAt: OLD })).toBeNull();
    expect(validStored({ key: 'k', fields: am5Board, builtAt: 5 as never })).toBeNull();
    expect(validStored({ key: 'k', fields: am5Board })).toBeNull();
    expect(validStored({ key: 'k', builtAt: OLD })).toBeNull();
  });
});

describe('refresh decision (A7)', () => {
  it('older data or an unreadable date is stale; the same or newer is current', () => {
    expect(isStale(OLD, NOW)).toBe(true);
    expect(isStale(NOW, NOW)).toBe(false);
    expect(isStale('2026-10-13T00:00:00Z', NOW)).toBe(false);
    expect(isStale('yesterday', NOW)).toBe(true);
  });

  it('only the slots the page rules read; current fields ready, the rest fetched', () => {
    const stored: StoredBuild = {
      parts: {
        cpu: { key: 'Ryzen 5 7600|true', fields: { chip: 'Ryzen 5 7600', socket: 'AM5' }, builtAt: NOW }, // current
        ram: { key: 'ram-old', fields: { type: 'DDR5' }, builtAt: OLD }, // stale: fetched, old kept as fallback
        storage: { key: 'ssd-keys-only' }, // old build: keys only
        case: { key: 'case-bad', fields: { maxBoard: () => 'ATX' } as never, builtAt: NOW }, // invalid
        mobo: { key: 'own-slot' }, // the page's own slot: replaced by the candidates
        gpu: { key: 'gpu-x' }, // rules of the mobo page don't read the card
        psu: { key: 'psu-x' },
      },
    };
    const plan = planBuild(stored, 'mobo', NOW);
    expect(plan.ready.map((p) => [p.category, p.key, p.name])).toEqual([['cpu', 'Ryzen 5 7600|true', 'Ryzen 5 7600']]);
    expect(plan.refresh).toEqual({ ram: 'ram-old', storage: 'ssd-keys-only', case: 'case-bad' });
    expect(plan.fallback).toEqual({ ram: { type: 'DDR5' } });
  });

  it('fresh chunk fields replace the stored ones and are written back with the page date', () => {
    const plan = planBuild({ parts: { cpu: { key: 'c|true', fields: { socket: 'AM4' }, builtAt: OLD } } }, 'mobo', NOW);
    const r = applyRefresh(plan, { cpu: { 'c|true': { fields: { chip: 'Ryzen 5 7600', socket: 'AM5' } } } }, NOW);
    expect(r.parts).toEqual([{ category: 'cpu', key: 'c|true', name: 'Ryzen 5 7600', quantity: 1, fields: { chip: 'Ryzen 5 7600', socket: 'AM5' } }]);
    expect(r.writes).toEqual([{ slot: 'cpu', part: { key: 'c|true', fields: { chip: 'Ryzen 5 7600', socket: 'AM5' }, builtAt: NOW } }]);
    expect(r.missing).toEqual([]);
  });

  it('a saved part whose data changed is checked with the new values (real engine)', () => {
    // Saved as an AM4 board two days ago; today's data says AM5.
    const plan = planBuild({ parts: { mobo: { key: 'board', fields: { ...am5Board, socket: 'AM4' }, builtAt: OLD } } }, 'cpu', NOW);
    const r = applyRefresh(plan, { mobo: { board: { fields: am5Board } } }, NOW);
    const cpu = (key: string, socket: string): Part => ({ category: 'cpu', key, name: key, quantity: 1, fields: { chip: key, socket, igpu: true, coolerIncluded: true } });
    const res = checkAll(r.parts, 'cpu', [cpu('Ryzen 5 7600', 'AM5'), cpu('Ryzen 5 5600', 'AM4')], { bios: biosSupport });
    expect(res.get('Ryzen 5 7600')!.hide).toBe(false);
    expect(res.get('Ryzen 5 5600')!.hide).toBe(true);
    // With the stored (old) fields it would have been the other way round.
    const old = checkAll(plan.fallback.mobo ? [partOf('mobo', 'board', plan.fallback.mobo)] : [], 'cpu', [cpu('Ryzen 5 7600', 'AM5')], { bios: biosSupport });
    expect(old.get('Ryzen 5 7600')!.hide).toBe(true);
  });

  it('C-01 through the saved build: a PSU too small for the card never hides a CPU on /cpu?pick=1', () => {
    const stored: StoredBuild = {
      parts: {
        gpu: { key: 'skroutz:1', fields: { chip: 'RTX 5080', lengthMm: 340, minPsu: 850 }, builtAt: NOW },
        psu: { key: '550W Gold ATX', fields: { watts: 550, formFactor: 'ATX' }, builtAt: NOW },
        mobo: { key: 'board', fields: am5Board, builtAt: NOW },
      },
    };
    const plan = planBuild(stored, 'cpu', NOW);
    expect(plan.ready.map((p) => p.category).sort()).toEqual(['gpu', 'mobo', 'psu']);
    const cpu = (name: string): Part => ({ category: 'cpu', key: `${name}|true`, name, quantity: 1, fields: { chip: name, socket: 'AM5', igpu: true, coolerIncluded: true } });
    const res = checkAll(plan.ready, 'cpu', [cpu('Ryzen 5 7600'), cpu('Ryzen 9 9950X')], { bios: biosSupport });
    for (const v of res.values()) {
      expect(v.hide).toBe(false);
      expect(v.findings.some((f) => f.rule === 14 && f.status === 'error')).toBe(false);
    }
  });

  it('a key the data no longer has is missing (A9) and left out; nothing breaks', () => {
    const plan = planBuild({ parts: { cpu: { key: 'gone|true' }, ram: { key: 'kit' } } }, 'mobo', NOW);
    const r = applyRefresh(plan, { cpu: {}, ram: { kit: { fields: { type: 'DDR5' } } } }, NOW);
    expect(r.missing).toEqual([{ slot: 'cpu', key: 'gone|true' }]);
    expect(r.parts.map((p) => p.key)).toEqual(['kit']);
    expect(r.writes.map((w) => w.slot)).toEqual(['ram']);
  });

  it('a chunk that failed to load: old valid fields are used, nothing marked missing or saved', () => {
    const plan = planBuild({ parts: { cpu: { key: 'c|?', fields: { socket: 'AM5' }, builtAt: OLD }, ram: { key: 'kit' } } }, 'mobo', NOW);
    const r = applyRefresh(plan, { cpu: undefined, ram: undefined }, NOW);
    expect(r.parts.map((p) => [p.key, p.name])).toEqual([['c|?', 'c']]);
    expect(r.missing).toEqual([]);
    expect(r.writes).toEqual([]);
  });
});

describe('runSliced (carried requirement 3)', () => {
  /** A scheduler the test runs by hand. */
  function manual() {
    const queue: (() => void)[] = [];
    const schedule: Schedule = (fn) => {
      queue.push(fn);
      return () => {
        const i = queue.indexOf(fn);
        if (i >= 0) queue.splice(i, 1);
      };
    };
    const tick = () => queue.shift()?.();
    return { schedule, tick, pending: () => queue.length };
  }

  it('nothing runs synchronously; one slice per task, then done', () => {
    const m = manual();
    const seen: number[][] = [];
    let done = 0;
    runSliced([1, 2, 3, 4, 5, 6, 7], 3, (s) => seen.push(s), () => done++, m.schedule);
    expect(seen).toEqual([]);
    m.tick();
    expect(seen).toEqual([[1, 2, 3]]);
    m.tick();
    m.tick();
    expect(seen).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    expect(done).toBe(1);
    expect(m.pending()).toBe(0);
  });

  it('a cancelled run (build changed) does no more work and never finishes', () => {
    const m = manual();
    const seen: number[][] = [];
    let done = 0;
    const cancel = runSliced([1, 2, 3, 4], 2, (s) => seen.push(s), () => done++, m.schedule);
    m.tick();
    cancel();
    m.tick();
    expect(seen).toEqual([[1, 2]]);
    expect(done).toBe(0);
    expect(m.pending()).toBe(0);
  });

  it('an empty list finishes in its first task', () => {
    const m = manual();
    let done = 0;
    runSliced([], 300, () => {}, () => done++, m.schedule);
    expect(done).toBe(0);
    m.tick();
    expect(done).toBe(1);
  });
});
