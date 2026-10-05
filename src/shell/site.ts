// What the site shell knows before any page's data loads: the build manifest (model counts per category,
// each source's last update) and, only when the search box is used, the search index.
import { useEffect, useState } from 'react';
import type { Text } from '../lib/i18n';
import { prepare, type PreparedIndex, type SearchIndexFile } from '../lib/search';
import { CATEGORY_LIST } from '../lib/routes';
import type { Category, Manifest, SourceName } from '../types';
import type { SourceTimes } from '../ui/nav';
import { isStale } from '../ui/PriceCell';
import { CATS } from './nav';
import { afterFirstPaint } from '../lib/paint';

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

export interface SiteInfo {
  builtAt: string;
  counts: Partial<Record<Category, number>>;
  /** Newest update of each source across the categories (the footer's line). */
  sources: SourceTimes;
  /** Source × category pairs older than 24 hours. */
  staleIn: { source: SourceName; category: Text; updatedAt: string }[];
  /** Each source's update in one category (the category page's line). */
  sourcesOf: (cat: Category) => SourceTimes;
}

function siteInfo(m: Manifest): SiteInfo {
  const counts: SiteInfo['counts'] = {};
  const sources: SourceTimes = {};
  const staleIn: SiteInfo['staleIn'] = [];
  for (const cat of CATEGORY_LIST) {
    const c = m.cats[cat];
    if (!c) continue;
    counts[cat] = c.models;
    for (const [s, meta] of Object.entries(c.sources ?? {}) as [SourceName, { updatedAt: string | null }][]) {
      if (!meta.updatedAt) continue;
      const prev = sources[s]?.updatedAt;
      if (!prev || meta.updatedAt > prev) sources[s] = { updatedAt: meta.updatedAt };
      if (isStale(meta.updatedAt)) staleIn.push({ source: s, category: CATS[cat].name, updatedAt: meta.updatedAt });
    }
  }
  return { builtAt: m.builtAt, counts, sources, staleIn, sourcesOf: (cat) => (m.cats[cat]?.sources ?? {}) as SourceTimes };
}

/**
 * The manifest as the shell uses it; null while loading (and if it can't load: the shell works without it).
 * Requested after the first paint (src/lib/paint.ts): the first frame doesn't need it (the counts' room is
 * reserved), and a request finished before that paint counts toward it in Lighthouse's phone simulation.
 */
export function useSite(): SiteInfo | null {
  const [info, setInfo] = useState<SiteInfo | null>(null);
  useEffect(() => {
    let live = true;
    const cancel = afterFirstPaint(() =>
      loadManifest().then(
        (m) => live && setInfo(siteInfo(m)),
        () => {},
      ),
    );
    return () => {
      live = false;
      cancel();
    };
  }, []);
  return info;
}

let indexPromise: Promise<PreparedIndex> | null = null;
/** The search index (/data/search.json), loaded on the first hover, focus or touch of a search box. */
export function loadSearchIndex(): Promise<PreparedIndex> {
  if (!indexPromise) {
    indexPromise = loadManifest()
      .then((m) => fetch(`/data/search.json?v=${encodeURIComponent(m.builtAt)}`))
      .then((r) => {
        if (!r.ok) throw new Error(`/data/search.json: HTTP ${r.status}`);
        return r.json() as Promise<SearchIndexFile>;
      })
      .then(prepare);
    indexPromise.catch(() => (indexPromise = null));
  }
  return indexPromise;
}
