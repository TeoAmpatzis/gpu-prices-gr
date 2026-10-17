// Asks for a category page's facet counts (step 4 task 3): in the facet worker when the browser can start one, else
// (no Worker, the worker failed to start, crashed, answered with an error or not within WORKER_TIMEOUT) on the main
// thread, one filter pass per idle task, as the pick checker does (pickChecker.ts). The newest request of a category
// wins: an older one resolves null at once and its answer is dropped. The page asks only after its first paint.
import type { Category } from '../types';
import { rulesOf } from './categoryRules';
import { loadData, type CategoryData, type Filters } from './data';
import { facetPasses, optionsOf, shownListings, type FacetAnswer, type FacetCounts, type FacetRequest } from './facets';
import { idle, runSliced, type Schedule } from './slices';

/** What the client needs of a Worker (a fake one in the tests). */
export interface FacetWorkerLike {
  postMessage(m: FacetRequest): void;
  terminate(): void;
  onmessage: ((e: { data: FacetAnswer }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onmessageerror?: ((e: unknown) => void) | null;
}

/** No answer in this time: the worker is given up and the main thread counts. */
export const WORKER_TIMEOUT = 10_000;

export interface FacetsClient {
  /**
   * The counts for `filters` on the page's list file `version` (its `builtAt`); `hidden` = pick mode's hidden
   * listing ids (not counted). Null when a newer request of the same category replaced this one (or, on the
   * main thread, the category's data could not be loaded: the page then shows no numbers).
   */
  request(cat: Category, filters: Filters, version: string, hidden?: string[] | null): Promise<FacetCounts | null>;
}

export interface FacetsClientOptions {
  makeWorker: (() => FacetWorkerLike) | null;
  /** The page's decoded data (the fallback counts on it; memoised, so already loaded). */
  loadMain?: (cat: Category) => Promise<CategoryData>;
  schedule?: Schedule;
  timeout?: number;
}

const options = new WeakMap<CategoryData, Record<string, { value: string }[]>>();

/** The fallback: the same passes as the worker, one per scheduled task. Returns a cancel. */
function countSliced(
  cat: Category,
  filters: Filters,
  hidden: string[] | null,
  load: (cat: Category) => Promise<CategoryData>,
  schedule: Schedule,
  done: (c: FacetCounts | null) => void,
): () => void {
  let cancelled = false;
  let cancelRun = () => {};
  load(cat).then(
    (data) => {
      if (cancelled) return;
      const cfg = rulesOf(cat);
      let opts = options.get(data);
      if (!opts) options.set(data, (opts = optionsOf(cfg, data.latest.listings)));
      const { counts, passes } = facetPasses(shownListings(data.latest.listings, hidden), filters, cfg, data.history, data.imported, opts);
      cancelRun = runSliced(passes, 1, (slice) => slice.forEach((p) => p()), () => done(counts), schedule);
    },
    () => {
      if (!cancelled) done(null);
    },
  );
  return () => {
    cancelled = true;
    cancelRun();
  };
}

export function createFacetsClient({ makeWorker, loadMain = loadData, schedule = idle, timeout = WORKER_TIMEOUT }: FacetsClientOptions): FacetsClient {
  let worker: FacetWorkerLike | null = null;
  let broken = makeWorker === null;
  let nextId = 0;
  /** Request id → what to do with the worker's answer (null: the worker failed). */
  const waiting = new Map<number, (a: FacetAnswer | null) => void>();
  /** Per category, how to end its newest request (a newer one ends it with null). */
  const current = new Map<Category, (c: FacetCounts | null) => void>();
  /**
   * Build mismatches per category and page version: the worker re-fetches its list file after the first; after a
   * second (its file is really of another build) that category and version count on the main thread only.
   */
  const mismatches = new Map<string, number>();
  const MAX_MISMATCHES = 2;

  const fail = () => {
    broken = true;
    worker?.terminate();
    worker = null;
    const calls = [...waiting.values()];
    waiting.clear();
    for (const c of calls) c(null);
  };
  const get = (): FacetWorkerLike | null => {
    if (broken) return null;
    if (!worker) {
      try {
        const w = makeWorker!();
        w.onmessage = (e) => {
          const c = waiting.get(e.data.id);
          if (!c) return; // superseded
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
    request(cat, filters, version, hidden = null) {
      current.get(cat)?.(null);
      return new Promise((resolve) => {
        const id = ++nextId;
        let done = false;
        let stopTimer = () => {};
        let cancelFallback = () => {};
        const finish = (c: FacetCounts | null) => {
          if (done) return;
          done = true;
          stopTimer();
          waiting.delete(id);
          cancelFallback();
          if (current.get(cat) === finish) current.delete(cat);
          resolve(c);
        };
        current.set(cat, finish);
        const fallback = () => {
          if (!done) cancelFallback = countSliced(cat, filters, hidden, loadMain, schedule, finish);
        };
        const versionKey = `${cat}\n${version}`;
        const w = (mismatches.get(versionKey) ?? 0) < MAX_MISMATCHES ? get() : null;
        if (!w) return fallback();
        const timer = setTimeout(() => {
          if (waiting.has(id)) fail();
        }, timeout);
        stopTimer = () => clearTimeout(timer);
        waiting.set(id, (a) => {
          stopTimer();
          if (a?.ok) return finish(a.counts);
          if (a?.mismatch) mismatches.set(versionKey, (mismatches.get(versionKey) ?? 0) + 1);
          fallback(); // the worker failed, or answered with an error (e.g. another build's list file)
        });
        try {
          w.postMessage({ id, cat, version, filters, hidden });
        } catch {
          fail(); // e.g. a value that can't be cloned: the main thread counts
        }
      });
    },
  };
}

/** The facet worker (a chunk of its own); null where the browser has no Worker (main-thread fallback). */
const makeWorker =
  typeof Worker === 'undefined'
    ? null
    : () => new Worker(new URL('./facets.worker.ts', import.meta.url), { type: 'module' }) as unknown as FacetWorkerLike;

/** The site's client: one worker for every category page, started by the first request. */
export const facetsClient = createFacetsClient({ makeWorker });
