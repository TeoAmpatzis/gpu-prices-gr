// The facet worker (step 4 task 3): counts a category page's filter options off the main thread. A module worker
// that Vite bundles on its own (`new Worker(new URL('./facets.worker.ts', import.meta.url), { type: 'module' })` in
// facetsClient.ts), started by the page's first request after its first paint. It fetches the category's list file
// itself (the page's URL, so the HTTP cache answers) and decodes it with the page's decoder (data.decodeList); the
// category rules are categoryRules.ts (no React). A request that a newer one of the same category has already
// replaced is skipped (the page drops its answer anyway).
import type { Category, ListFile } from '../types';
import { listUrl } from './columns';
import { createFacetHandler, type FacetAnswer, type FacetRequest } from './facets';

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<FacetRequest>) => void) | null;
  postMessage: (a: FacetAnswer) => void;
};

const newest = new Map<Category, number>();
const handle = createFacetHandler(
  (cat) =>
    fetch(listUrl(cat)).then((r) => {
      if (!r.ok) throw new Error(`${listUrl(cat)}: HTTP ${r.status}`);
      return r.json() as Promise<ListFile>;
    }),
  (req) => newest.get(req.cat) === req.id,
);

scope.onmessage = (e) => {
  const req = e.data;
  newest.set(req.cat, req.id);
  // A task later, so requests already queued behind this one are seen first.
  setTimeout(() => {
    if (newest.get(req.cat) !== req.id) return scope.postMessage({ id: req.id, ok: false, error: 'superseded' });
    void handle(req).then((a) => scope.postMessage(a));
  });
};
