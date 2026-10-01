// Build step: derives the site's small data files from the scraper's JSON in public/data
// (src/lib/derive.ts) and refuses to publish data that looks broken.
//
// - `vite build`: writes data/<cat>/list.json, data/<cat>/detail.json, data/builder(-extra).json and
//   data/manifest.json into dist after comparing the counts with the live site's manifest. If a
//   category is empty or lost more than derive.MAX_DROP of its models/listings, the build fails and
//   Vercel keeps serving the previous deployment. For a planned drop, tag the commit message with
//   [allow-data-drop] (scrape.yml input allow_data_drop does it) or set DATA_CHECK=off: the problems
//   are logged and the build publishes. DATA_CHECK_BASE overrides the live site address.
// - `vite` (dev): serves the same files from memory, re-derived when the scraper's files change.

import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import type { Category, History, Imported, Latest, Manifest } from './src/types';
import { CATEGORY_IDS } from './src/lib/categories';
import { builderFile, checkData, detailFile, listFile, manifest, type CategoryInput } from './src/lib/derive';

const DATA_DIR = join(process.cwd(), 'public', 'data');
const LIVE_SITE = 'https://gpu-prices-gr.vercel.app';

const readJson = <T>(path: string, fallback: T): T => {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw new Error(`${path}: ${(e as Error).message}`); // broken JSON must fail the build
  }
};

function readInputs(): Partial<Record<Category, CategoryInput>> {
  const out: Partial<Record<Category, CategoryInput>> = {};
  for (const cat of CATEGORY_IDS) {
    const latest = readJson<Latest | null>(join(DATA_DIR, cat, 'latest.json'), null);
    if (!latest) continue;
    out[cat] = {
      latest,
      history: readJson<History>(join(DATA_DIR, cat, 'history.json'), {}),
      imported: readJson<Imported>(join(DATA_DIR, cat, 'history_imported.json'), {}),
    };
  }
  return out;
}

/** Every derived file, by its path under the site root. */
function derive(builtAt: string): { files: Record<string, string>; manifest: Manifest } {
  const inputs = readInputs();
  const files: Record<string, string> = {};
  const latest: Partial<Record<Category, Latest>> = {};
  const history: Partial<Record<Category, History>> = {};
  for (const cat of CATEGORY_IDS) {
    const input = inputs[cat];
    if (!input) continue;
    latest[cat] = input.latest;
    history[cat] = input.history;
    files[`data/${cat}/list.json`] = JSON.stringify(listFile(cat, input, builtAt));
    files[`data/${cat}/detail.json`] = JSON.stringify(detailFile(input.latest));
  }
  const { file: builder, extra } = builderFile(latest, builtAt);
  files['data/builder.json'] = JSON.stringify(builder);
  files['data/builder-extra.json'] = JSON.stringify(extra);
  const m = manifest(latest, builder, builtAt, history);
  files['data/manifest.json'] = JSON.stringify(m);
  return { files, manifest: m };
}

async function liveManifest(): Promise<Manifest | null> {
  const base = process.env.DATA_CHECK_BASE || LIVE_SITE;
  try {
    const r = await fetch(`${base}/data/manifest.json`, { signal: AbortSignal.timeout(10_000) });
    return r.ok ? ((await r.json()) as Manifest) : null;
  } catch {
    return null; // offline or first deploy: checkData falls back to minimum counts
  }
}

const kb = (s: string) => `${(Buffer.byteLength(s) / 1024).toFixed(0)} KB`;

export default function dataFiles(): Plugin {
  let cache: { key: string; files: Record<string, string> } | null = null;
  // Dev: re-derive when any scraper file changed (its modification times are the cache key).
  const devFiles = () => {
    const key = CATEGORY_IDS.map((c) => {
      try {
        return statSync(join(DATA_DIR, c, 'latest.json')).mtimeMs;
      } catch {
        return 0;
      }
    }).join(',');
    if (cache?.key !== key) cache = { key, files: derive(new Date().toISOString()).files };
    return cache.files;
  };

  return {
    name: 'builddraft-data',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0].replace(/^\//, '');
        const body = path.startsWith('data/') ? devFiles()[path] : undefined;
        if (body === undefined) return next();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(body);
      });
    },
    async generateBundle() {
      const builtAt = new Date().toISOString();
      const { files, manifest: next } = derive(builtAt);
      // Deliberate overrides for planned data changes (e.g. merging duplicate products): the
      // problems are still listed in the build log, then published anyway.
      const override =
        process.env.DATA_CHECK === 'off'
          ? 'DATA_CHECK=off'
          : (process.env.VERCEL_GIT_COMMIT_MESSAGE ?? '').includes('[allow-data-drop]')
            ? 'commit tagged [allow-data-drop]'
            : null;
      const live = await liveManifest();
      const problems = checkData(next, live);
      if (problems.length && override) {
        this.warn(`${override}: publishing despite:\n  - ${problems.join('\n  - ')}`);
      } else if (problems.length) {
        this.error(`Data check failed, not publishing (the live site stays as it is):\n  - ${problems.join('\n  - ')}`);
      } else {
        this.info(live ? 'data check passed against the live manifest' : 'data check passed (no live manifest: minimum counts)');
      }
      for (const [fileName, source] of Object.entries(files)) this.emitFile({ type: 'asset', fileName, source });
      const sizes = Object.entries(files)
        .filter(([p]) => !p.endsWith('detail.json'))
        .map(([p, s]) => `${p.replace('data/', '')} ${kb(s)}`);
      this.info(`data files: ${sizes.join(', ')}`);
    },
  };
}
