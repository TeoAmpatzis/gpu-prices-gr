// Waiting for paints before starting big downloads (Phase 1). Lighthouse's phone simulation counts every
// download that finished before a paint as part of that paint's cost, even when it didn't block it; v1
// fetched its data after painting, and these keep v2's pages in that order:
//   afterFirstPaint   — the page's code and data start once the first frame (header, title) is on screen.
//   afterLargestPaint — the builder's builder.json starts once its step text (the page's largest paint)
//                       is on screen.
// Both are a few milliseconds later than starting at once, and never block anything.

let interacted = false;
// Browsers stop reporting largest paints after the first input (tap, click, key, scroll), so after it
// there is nothing to wait for.
for (const type of ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const) {
  window.addEventListener(type, () => (interacted = true), { capture: true, once: true, passive: true });
}

const supports = (type: string) => typeof PerformanceObserver !== 'undefined' && !!PerformanceObserver.supportedEntryTypes?.includes(type);

/** Calls `run` once (from a timer task); returns a cleanup that cancels it. */
function once(run: () => void) {
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    run();
  };
  return { go: () => window.setTimeout(go), cancel: () => (done = true) };
}

/**
 * Runs `run` once the browser has presented its first contentful paint (the Paint Timing entry; a
 * requestAnimationFrame callback runs before its frame is painted, so it isn't enough). Fallbacks: two
 * frames where paint timing is missing, and 3 s for a tab opened in the background (it doesn't paint
 * until shown). Returns a cleanup.
 */
export function afterFirstPaint(run: () => void): () => void {
  const o = once(run);
  const fallback = window.setTimeout(o.go, 3000);
  let observer: PerformanceObserver | undefined;
  if (supports('paint')) {
    observer = new PerformanceObserver((list) => {
      if (list.getEntries().some((e) => e.name === 'first-contentful-paint')) o.go();
    });
    observer.observe({ type: 'paint', buffered: true });
  } else {
    requestAnimationFrame(() => requestAnimationFrame(o.go));
  }
  return () => {
    o.cancel();
    clearTimeout(fallback);
    observer?.disconnect();
  };
}

/**
 * Runs `run` after the next largest-contentful-paint entry, i.e. once what was just rendered is on screen,
 * if it is now the page's largest element. After the first input, or where the entry type is missing,
 * two animation frames; and at most `cap` ms in any case (the new content may not be the largest).
 * Returns a cleanup.
 */
export function afterLargestPaint(run: () => void, cap = 500): () => void {
  const o = once(run);
  if (interacted || !supports('largest-contentful-paint')) {
    let frame = requestAnimationFrame(() => (frame = requestAnimationFrame(o.go)));
    return () => {
      o.cancel();
      cancelAnimationFrame(frame);
    };
  }
  const fallback = window.setTimeout(o.go, cap);
  const observer = new PerformanceObserver(o.go);
  observer.observe({ type: 'largest-contentful-paint' });
  return () => {
    o.cancel();
    clearTimeout(fallback);
    observer.disconnect();
  };
}
