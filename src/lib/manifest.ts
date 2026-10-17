// The build's /data/manifest.json (src/lib/derive.ts manifest): fetched once per visit, shared by the shell (counts,
// sources' update times, the search index's version) and the product pages (the build's `builtAt`). Kept apart from
// the shell so build code (derive.ts → modelData.ts) can import its users without React.
import type { Manifest } from '../types';

let manifestPromise: Promise<Manifest> | null = null;
/** The build's manifest.json, fetched once (a failure is forgotten, so the next call retries). */
export function loadManifest(): Promise<Manifest> {
  if (!manifestPromise) {
    manifestPromise = fetch('/data/manifest.json').then((r) => {
      if (!r.ok) throw new Error(`/data/manifest.json: HTTP ${r.status}`);
      return r.json() as Promise<Manifest>;
    });
    manifestPromise.catch(() => (manifestPromise = null));
  }
  return manifestPromise;
}
