// Runs pick mode's candidate check (v2 step 3, task 6b): in the pick worker when the browser can start one, else
// (no Worker, the worker failed to start, crashed, answered with an error or not at all) on the main thread in
// idle slices, as before the worker. The page only applies the verdicts. The engine is not in the page's chunk:
// the worker bundles it, and the fallback loads it (pickCheck.ts) when it runs.
import type { Part, PartCategory } from '../engine';
import { idle, runSliced, SLICE, type Schedule } from './pickBuild';
import { toResults, toVerdicts, type CheckAnswer, type CheckRequest, type Verdict } from './pickProtocol';

/** What the checker needs of a Worker (a fake one in the tests). */
export interface WorkerLike {
  postMessage(m: CheckRequest): void;
  terminate(): void;
  onmessage: ((e: { data: CheckAnswer }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onmessageerror?: ((e: unknown) => void) | null;
}

/** No answer in this time: the worker is given up and the check runs on the main thread. */
export const WORKER_TIMEOUT = 10_000;

export interface Checker {
  /** Checks every candidate; `done` is called once with all verdicts, never after the returned cancel. */
  run(slot: PartCategory, build: Part[], candidates: Part[], done: (verdicts: Map<string, Verdict>) => void): () => void;
  /** Starts the worker early (its chunk downloads while the page prepares the candidates). */
  warm(): void;
  /** Stops the worker; a later `run` starts a new one. */
  dispose(): void;
}

/** The engine side of the main-thread fallback, loaded when the fallback first runs. */
const loadCheck = () => import('./pickCheck');

/**
 * The main-thread check in idle slices (the fallback), with the same trimmed verdicts as the worker's. If the
 * engine's chunk can't be loaded (twice), `done` gets no verdicts: the rows show, nothing hidden, never a page
 * stuck on its placeholders.
 */
export function checkSliced(
  slot: PartCategory,
  build: Part[],
  candidates: Part[],
  done: (verdicts: Map<string, Verdict>) => void,
  schedule: Schedule = idle,
  load: typeof loadCheck = loadCheck,
): () => void {
  let cancelled = false;
  let cancelRun = () => {};
  void load()
    .catch(() => load())
    .then(
      ({ checkAll, PICK_CTX }) => {
        if (cancelled) return;
        const map = new Map<string, Verdict>();
        cancelRun = runSliced(candidates, SLICE, (slice) => toVerdicts(toResults(checkAll(build, slot, slice, PICK_CTX)), map), () => done(map), schedule);
      },
      () => {
        if (!cancelled) done(new Map());
      },
    );
  return () => {
    cancelled = true;
    cancelRun();
  };
}

export function createChecker(
  makeWorker: (() => WorkerLike) | null,
  schedule: Schedule = idle,
  timeout: number = WORKER_TIMEOUT,
): Checker {
  let worker: WorkerLike | null = null;
  let broken = makeWorker === null;
  let nextId = 0;
  /** Request id → what to do with its answer (null: the worker failed). Cancelled requests are removed. */
  const waiting = new Map<number, (a: CheckAnswer | null) => void>();
  /** Requests the worker is still computing, cancelled ones included (it can't be interrupted). */
  const busy = new Set<number>();

  const stop = () => {
    worker?.terminate();
    worker = null;
    busy.clear();
  };
  const fail = () => {
    broken = true;
    stop();
    const calls = [...waiting.values()];
    waiting.clear();
    for (const c of calls) c(null);
  };
  const get = (): WorkerLike | null => {
    if (broken) return null;
    if (!worker) {
      try {
        const w = makeWorker!();
        w.onmessage = (e) => {
          busy.delete(e.data.id);
          const c = waiting.get(e.data.id);
          if (!c) return; // cancelled or replaced
          waiting.delete(e.data.id);
          c(e.data);
        };
        w.onerror = () => fail();
        w.onmessageerror = () => fail(); // an answer that can't be read
        worker = w;
      } catch {
        broken = true;
        return null;
      }
    }
    return worker;
  };

  return {
    run(slot, build, candidates, done) {
      // A newer run while the worker still computes only cancelled ones: start a fresh worker, so the old
      // computation doesn't delay this one (nor eat its timeout).
      if (busy.size > 0 && [...busy].every((id) => !waiting.has(id))) stop();
      let cancelled = false;
      let cancelFallback = () => {};
      const fallback = () => {
        if (!cancelled) cancelFallback = checkSliced(slot, build, candidates, (v) => !cancelled && done(v), schedule);
      };
      const w = get();
      if (!w) {
        fallback();
        return () => {
          cancelled = true;
          cancelFallback();
        };
      }
      const id = ++nextId;
      const timer = setTimeout(() => {
        if (waiting.has(id)) fail();
      }, timeout);
      waiting.set(id, (a) => {
        clearTimeout(timer);
        if (cancelled) return;
        if (a?.ok) done(toVerdicts(a.results));
        else fallback(); // the worker failed, or the engine threw there
      });
      try {
        w.postMessage({ id, slot, build, candidates });
        busy.add(id);
      } catch {
        fail(); // e.g. a value that can't be cloned: the main thread checks it
      }
      return () => {
        cancelled = true;
        waiting.delete(id);
        clearTimeout(timer);
        cancelFallback();
      };
    },
    warm() {
      get();
    },
    dispose() {
      waiting.clear();
      stop();
    },
  };
}
