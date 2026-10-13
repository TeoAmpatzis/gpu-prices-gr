// Task 6b: the pick worker's message protocol (pickProtocol.ts) and the checker that runs it in a worker or, when
// that can't work, on the main thread in idle slices (pickChecker.ts).
import { describe, expect, it, vi } from 'vitest';
import type { Part, PartCategory } from '../../src/engine';
import { answer, checkAll, PICK_CTX } from '../../src/lib/pickCheck';
import { checkSliced, createChecker, WORKER_TIMEOUT, type WorkerLike } from '../../src/lib/pickChecker';
import { PENDING_DEADLINE } from '../../src/lib/usePick';
import { shownFinding, toResults, toVerdicts, type CheckAnswer, type CheckRequest, type Verdict } from '../../src/lib/pickProtocol';
import type { Schedule } from '../../src/lib/pickBuild';

let n = 0;
const part = (category: PartCategory, fields: Record<string, unknown>, name = `${category}-${++n}`): Part => ({ category, key: name, name, quantity: 1, fields });
const cpu = part('cpu', { chip: 'Ryzen 5 7600', socket: 'AM5', igpu: true, coolerIncluded: true }, 'Ryzen 5 7600|true');
const card = part('gpu', { chip: 'RTX 5080', lengthMm: 330, minPsu: 850 }, 'card');
const psu = part('psu', { watts: 550, formFactor: 'ATX' }, 'psu550');
const boards = [
  part('mobo', { chip: 'B650 board', chipset: 'B650', socket: 'AM5', formFactor: 'ATX', memory: 'DDR5', ramSlots: 4 }, 'am5'),
  part('mobo', { chip: 'B550 board', chipset: 'B550', socket: 'AM4', formFactor: 'ATX', memory: 'DDR4', ramSlots: 4 }, 'am4'),
  part('mobo', { chip: 'Odd board', chipset: null, socket: null, formFactor: null, memory: null, ramSlots: null }, 'unknown'),
];
const build = [cpu, card, psu];
const req: CheckRequest = { id: 7, slot: 'mobo', build, candidates: boards };

/** checkAll's verdicts trimmed the way the protocol trims them. */
const expected = (candidates: Part[] = boards) => {
  const out = new Map<string, Verdict>();
  for (const [k, v] of checkAll(build, 'mobo', candidates, PICK_CTX)) out.set(k, { hide: v.hide, findings: v.findings.filter(shownFinding) });
  return out;
};
const now: Schedule = (fn) => {
  fn();
  return () => {};
};

/** A worker that answers like pick.worker.ts (structured clone both ways), after a microtask. */
function fakeWorker(reply: (r: CheckRequest) => CheckAnswer | 'crash' | 'silent' | 'unreadable' = answer) {
  const w: WorkerLike & { posted: CheckRequest[]; terminated: boolean } = {
    posted: [],
    terminated: false,
    onmessage: null,
    onerror: null,
    onmessageerror: null,
    postMessage(m) {
      const msg = structuredClone(m);
      w.posted.push(msg);
      queueMicrotask(() => {
        const a = reply(msg);
        if (a === 'crash') w.onerror?.(new Error('worker crashed'));
        else if (a === 'unreadable') w.onmessageerror?.(new Error('messageerror'));
        else if (a !== 'silent') w.onmessage?.({ data: structuredClone(a) });
      });
    },
    terminate() {
      w.terminated = true;
    },
  };
  return w;
}
const flush = () => new Promise((r) => setTimeout(r, 0));
/** Waits for the fallback (its engine chunk is a dynamic import) to call back. */
const called = (fn: ReturnType<typeof vi.fn>) => vi.waitFor(() => expect(fn).toHaveBeenCalled());

describe('protocol', () => {
  it('answer = checkAll, trimmed to errors and warnings, through structured clone', () => {
    const a = structuredClone(answer(req));
    expect(a.id).toBe(7);
    expect(a.ok).toBe(true);
    const v = toVerdicts((a as Extract<CheckAnswer, { ok: true }>).results);
    expect(v).toEqual(expected());
    expect(v.get('am4')?.hide).toBe(true); // AM4 board next to an AM5 CPU
    expect(v.get('am5')?.hide).toBe(false);
    expect([...v.values()].flatMap((x) => x.findings).every((f) => f.status === 'error' || f.status === 'warning')).toBe(true);
  });
  it('the pre-existing clash (PSU too small for the card) stays off the board rows (C-01)', () => {
    const v = toVerdicts(toResults(checkAll(build, 'mobo', boards, PICK_CTX)));
    for (const b of boards) expect(v.get(b.key)?.findings.some((f) => f.rule === 14)).toBe(false);
  });
  it('an engine error is an answer (ok: false), not a dead worker', () => {
    const bad = { ...req, candidates: [{ ...boards[0], fields: null as unknown as Record<string, unknown> }] };
    const a = answer(bad);
    expect(a.ok).toBe(false);
    expect(a.id).toBe(7);
  });
});

describe('checker', () => {
  it("the fallback's engine chunk fails to load twice: no verdicts, never a page left waiting", async () => {
    const done = vi.fn();
    const load = vi.fn(() => Promise.reject(new Error('offline')));
    checkSliced('mobo', build, boards, done, now, load as never);
    await called(done);
    expect(load).toHaveBeenCalledTimes(2);
    expect((done.mock.calls[0][0] as Map<string, Verdict>).size).toBe(0);
  });
  it('a cancelled fallback never calls back', async () => {
    const done = vi.fn();
    checkSliced('mobo', build, boards, done, now)();
    await flush();
    await flush();
    expect(done).not.toHaveBeenCalled();
  });
  it('worker: posts the parts once and hands over the same verdicts as the main thread', async () => {
    const w = fakeWorker();
    const c = createChecker(() => w, now);
    const done = vi.fn();
    c.run('mobo', build, boards, done);
    expect(done).not.toHaveBeenCalled(); // never synchronous: the page applies the answer later
    await flush();
    expect(w.posted).toHaveLength(1);
    expect(w.posted[0].candidates).toEqual(boards);
    expect(done).toHaveBeenCalledTimes(1);
    expect(done.mock.calls[0][0]).toEqual(expected());
  });
  it('no Worker in the browser: the main-thread fallback (idle slices) gives the same verdicts', async () => {
    const done = vi.fn();
    createChecker(null, now).run('mobo', build, boards, done);
    await called(done);
    expect(done).toHaveBeenCalledTimes(1);
    expect(done.mock.calls[0][0]).toEqual(expected());
  });
  it('the fallback runs in slices on the schedule given', async () => {
    const queued: (() => void)[] = [];
    const later: Schedule = (fn) => {
      queued.push(fn);
      return () => {};
    };
    const done = vi.fn();
    const many = Array.from({ length: 650 }, (_, i) => ({ ...boards[i % 3], key: `b${i}` }));
    checkSliced('mobo', build, many, done, later);
    await vi.waitFor(() => expect(queued).toHaveLength(1));
    while (queued.length) queued.shift()!();
    expect(done).toHaveBeenCalledTimes(1);
    expect((done.mock.calls[0][0] as Map<string, Verdict>).size).toBe(650);
  });
  it('a worker that cannot start: fallback', async () => {
    const done = vi.fn();
    createChecker(() => {
      throw new Error('blocked by CSP');
    }, now).run('mobo', build, boards, done);
    await called(done);
    expect(done.mock.calls[0][0]).toEqual(expected());
  });
  it('a worker that crashes: fallback now, and later runs skip the worker', async () => {
    const w = fakeWorker(() => 'crash');
    const make = vi.fn(() => w);
    const c = createChecker(make, now);
    const done = vi.fn();
    c.run('mobo', build, boards, done);
    await called(done);
    expect(w.terminated).toBe(true);
    expect(done.mock.calls[0][0]).toEqual(expected());
    const again = vi.fn();
    c.run('mobo', build, boards, again);
    await called(again);
    expect(again).toHaveBeenCalledTimes(1);
    expect(make).toHaveBeenCalledTimes(1);
  });
  it('an engine error in the worker (ok: false): fallback', async () => {
    const done = vi.fn();
    createChecker(() => fakeWorker((r) => ({ id: r.id, ok: false, error: 'boom' })), now).run('mobo', build, boards, done);
    await called(done);
    expect(done.mock.calls[0][0]).toEqual(expected());
  });
  it('a worker that never answers: fallback after the timeout', async () => {
    vi.useFakeTimers();
    try {
      const w = fakeWorker(() => 'silent');
      const done = vi.fn();
      createChecker(() => w, now, 1000).run('mobo', build, boards, done);
      await vi.advanceTimersByTimeAsync(999);
      expect(done).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(w.terminated).toBe(true);
      vi.useRealTimers();
      await called(done);
      expect(done.mock.calls[0][0]).toEqual(expected());
    } finally {
      vi.useRealTimers();
    }
  });
  it('a cancelled run never calls back; the next run gets its own answer', async () => {
    const w = fakeWorker();
    const c = createChecker(() => w, now);
    const first = vi.fn();
    const second = vi.fn();
    c.run('mobo', build, boards, first)();
    c.run('mobo', build, boards.slice(0, 1), second);
    await flush();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect([...(second.mock.calls[0][0] as Map<string, Verdict>).keys()]).toEqual(['am5']);
  });
  it('dispose stops the worker; a later run starts a new one', async () => {
    const workers: ReturnType<typeof fakeWorker>[] = [];
    const c = createChecker(() => {
      workers.push(fakeWorker());
      return workers.at(-1)!;
    }, now);
    c.warm();
    expect(workers).toHaveLength(1);
    c.dispose();
    expect(workers[0].terminated).toBe(true);
    const done = vi.fn();
    c.run('mobo', build, boards, done);
    await flush();
    expect(workers).toHaveLength(2);
    expect(done).toHaveBeenCalledTimes(1);
  });
  it('an answer the page cannot read (messageerror): fallback', async () => {
    const w = fakeWorker(() => 'unreadable');
    const done = vi.fn();
    createChecker(() => w, now).run('mobo', build, boards, done);
    await called(done);
    expect(w.terminated).toBe(true);
    expect(done.mock.calls[0][0]).toEqual(expected());
  });
  it('a value the browser cannot clone (DataCloneError): the main thread checks it', async () => {
    const odd = [{ ...boards[0], key: 'fn', fields: { ...boards[0].fields, note: () => 'not data' } }];
    const w = fakeWorker();
    const done = vi.fn();
    createChecker(() => w, now).run('mobo', build, odd, done);
    expect(w.posted).toHaveLength(0); // structuredClone threw before anything was sent
    expect(w.terminated).toBe(true);
    await called(done);
    expect(done.mock.calls[0][0]).toEqual(expected(odd));
  });
  it('a newer run while the worker still computes a cancelled one: a fresh worker, the old one stopped', async () => {
    const workers = [fakeWorker(() => 'silent'), fakeWorker()];
    const make = vi.fn(() => workers[make.mock.calls.length - 1]);
    const c = createChecker(make, now, 1000);
    const first = vi.fn();
    c.run('mobo', build, boards, first)(); // replaced while the worker is busy with it
    const second = vi.fn();
    c.run('mobo', build, boards, second);
    expect(workers[0].terminated).toBe(true);
    expect(make).toHaveBeenCalledTimes(2);
    await flush();
    expect(second).toHaveBeenCalledTimes(1);
    expect(second.mock.calls[0][0]).toEqual(expected());
    expect(workers[1].terminated).toBe(false); // answered by the worker, no fallback
    expect(first).not.toHaveBeenCalled();
  });
  it('a run still wanted is not dropped by a newer one (same worker, both answered)', async () => {
    const make = vi.fn(() => fakeWorker());
    const c = createChecker(make, now);
    const a = vi.fn();
    const b = vi.fn();
    c.run('mobo', build, boards, a);
    c.run('mobo', build, boards.slice(0, 1), b);
    await flush();
    expect(make).toHaveBeenCalledTimes(1);
    expect(a.mock.calls[0][0]).toEqual(expected());
    expect([...(b.mock.calls[0][0] as Map<string, Verdict>).keys()]).toEqual(['am5']);
  });
  it("a hung worker: the fallback's verdicts arrive well before the page's deadline (PENDING_DEADLINE)", async () => {
    expect(PENDING_DEADLINE).toBeGreaterThan(WORKER_TIMEOUT);
    vi.useFakeTimers();
    try {
      const done = vi.fn();
      // The real timeout and the real idle schedule (a timer here: no requestIdleCallback in Node).
      createChecker(() => fakeWorker(() => 'silent')).run('mobo', build, boards, done);
      let t = 0;
      while (!done.mock.calls.length && t < PENDING_DEADLINE) {
        await vi.advanceTimersByTimeAsync(100);
        t += 100;
      }
      expect(done).toHaveBeenCalledTimes(1);
      expect(t).toBeGreaterThanOrEqual(WORKER_TIMEOUT); // the worker was given up first
      expect(t).toBeLessThan(PENDING_DEADLINE - 2000); // and the fallback finished with time to spare
      expect(done.mock.calls[0][0]).toEqual(expected());
    } finally {
      vi.useRealTimers();
    }
  });
});
