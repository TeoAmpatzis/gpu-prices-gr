// Work on the main thread in idle slices (moved out of pickBuild.ts, which re-exports it, so the category pages'
// facet-count fallback can use it without the pick code). No imports.

/** Schedules `fn` when the browser is idle (a timer where requestIdleCallback is missing); returns a cancel. */
export type Schedule = (fn: () => void) => () => void;

export const idle: Schedule = (fn) => {
  const w = globalThis as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
  if (w.requestIdleCallback && w.cancelIdleCallback) {
    const id = w.requestIdleCallback(fn, { timeout: 200 });
    return () => w.cancelIdleCallback!(id);
  }
  const id = setTimeout(fn, 0);
  return () => clearTimeout(id);
};

/**
 * Runs `step` over `items` in slices of `size`, each in its own scheduled task (none before the first one is
 * scheduled), then `done`. The returned function cancels a run that is no longer wanted (build or data changed).
 */
export function runSliced<T>(items: T[], size: number, step: (slice: T[]) => void, done: () => void, schedule: Schedule = idle): () => void {
  let cancelled = false;
  let cancelNext = () => {};
  const next = (from: number) => {
    cancelNext = schedule(() => {
      if (cancelled) return;
      step(items.slice(from, from + size));
      if (cancelled) return;
      if (from + size < items.length) next(from + size);
      else done();
    });
  };
  next(0);
  return () => {
    cancelled = true;
    cancelNext();
  };
}
