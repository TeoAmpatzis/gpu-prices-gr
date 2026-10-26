// Build step: derives the site's small data files from the scraper's JSON in public/data
// (src/lib/derive.ts) and refuses to publish data that looks broken.
//
// - `vite build`: writes data/<cat>/list.v2.json, data/<cat>/detail.json, data/builder(-extra).json,
//   data/builder-<slot>.json (builder.LAZY_SLOTS: storage), data/<cat>/model/000…255.json (product pages) and
//   data/manifest.json into dist after comparing the counts with the live site's manifest. If a
//   category is empty or lost more than derive.MAX_DROP of its models/listings, or a current model is not
//   in exactly one model chunk, the build fails and Vercel keeps serving the previous deployment.
//   For a planned drop, tag the commit message with
//   [allow-data-drop] (scrape.yml input allow_data_drop does it) or set DATA_CHECK=off: the problems
//   are logged and the build publishes. DATA_CHECK_BASE overrides the live site address.
// - `vite` (dev): serves the same files from memory, re-derived when the scraper's files change.

import { existsSync, readdirSync, readFileSync, rmdirSync, rmSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';
import type { Category, History, Imported, Latest, Manifest, ModelChunk } from './src/types';
import { CATEGORY_IDS } from './src/lib/categories';
import { VALIDATION_MODE, validateLatest } from './src/data/validate';
import { conflicts } from './src/data/validate/conflicts';
import { compatFiles } from './src/lib/compatBuild';
import { builderFile, checkData, detailFile, listFile, manifest, modelChunks, searchFile, type CategoryInput, type ImageLookup } from './src/lib/derive';
import { photoId } from './src/lib/images';
import { aliasFile, type AliasSource, type SlugOf } from './src/data/modelAliases';
import { nameSlug } from './src/lib/slug';
import { modelChunkPath } from './src/lib/modelData';

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
      specs: readJson<Record<string, Record<string, unknown>>>(join(DATA_DIR, cat, 'specs.json'), {}), // build time only
    };
  }
  return out;
}

/** The images repo's index (scraper/images.py): photo id → {c: category, s: source, d: date}. */
const IMAGES_INDEX = 'https://teoampatzis.github.io/builddraft-images/index.json';

async function imageLookup(): Promise<{ lookup: ImageLookup; count: number }> {
  try {
    const r = await fetch(process.env.IMAGES_INDEX || IMAGES_INDEX, { signal: AbortSignal.timeout(10_000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const index = (await r.json()) as Record<string, { c: string }>;
    // The site's own photo id (images.photoId, = scraper/images.py model_id()), so build and browser can't drift.
    const lookup: ImageLookup = (cat, key) => {
      const id = photoId(cat, key);
      return index[id] ? `${cat}/${id}` : undefined;
    };
    return { lookup, count: Object.keys(index).length };
  } catch {
    return { lookup: () => undefined, count: 0 }; // no photos (category icons), the build still publishes
  }
}

/** main's alias file (scraper/model_aliases.json, read only): { <cat>: { old key: new key } }; none = no aliases. */
const ALIASES_PATH = join(process.cwd(), 'scraper', 'model_aliases.json');

/**
 * /data/aliases.json: the alias records with both address segments. A current model's slug is its own (the chunks';
 * a non-readable key's slug is not derivable from the key); any other key's is the key's form, which the lookups
 * (slug.slugLookup) match with every spelling of the address.
 */
export function aliasesJson(models: Partial<Record<Category, ModelChunk[]>>, builtAt: string, raw: AliasSource): string {
  const slugs = new Map<string, string>();
  for (const [cat, chunks] of Object.entries(models))
    for (const chunk of chunks) for (const e of Object.values(chunk.models)) slugs.set(`${cat}\0${e.key}`, e.slug);
  const slugOf: SlugOf = (cat, key, which) => {
    if (cat === 'gpu' || cat === 'cpu' || cat === 'ram' || cat === 'psu') return nameSlug(key);
    return (which === 'new' ? slugs.get(`${cat}\0${key}`) : undefined) ?? key.toLowerCase();
  };
  return JSON.stringify(aliasFile(raw, builtAt, slugOf));
}

/** Every derived file, by its path under the site root. */
export function derive(
  builtAt: string,
  image?: ImageLookup,
): { files: Record<string, string>; manifest: Manifest; models: Partial<Record<Category, ModelChunk[]>> } {
  const inputs = readInputs();
  const files: Record<string, string> = {};
  const latest: Partial<Record<Category, Latest>> = {};
  const history: Partial<Record<Category, History>> = {};
  const models: Partial<Record<Category, ModelChunk[]>> = {};
  const rejected: string[] = [];
  let rejectedTotal = 0;
  const conflicted: string[] = [];
  let conflictTotal = 0;
  for (const cat of CATEGORY_IDS) {
    const input = inputs[cat];
    if (!input) continue;
    const v = validateLatest(cat, input.latest, VALIDATION_MODE);
    if (v.rejections.length) {
      rejectedTotal += v.rejections.length;
      rejected.push(`${cat} ${v.rejections.length}`);
    }
    // Second pass: values one page states against another page, the model's listings or its size class.
    const c = conflicts(cat, v.latest, input.specs ?? {}, VALIDATION_MODE);
    conflictTotal += c.conflicts.length;
    if (c.conflicts.length) conflicted.push(`${cat} ${c.conflicts.length}`);
    const checked = c.latest;
    latest[cat] = checked;
    history[cat] = input.history;
    files[`data/${cat}/list.v2.json`] = JSON.stringify(listFile(cat, { ...input, latest: checked }, builtAt, image));
    files[`data/${cat}/detail.json`] = JSON.stringify(detailFile(checked));
    const chunks = modelChunks(cat, { ...input, latest: checked }, builtAt, image);
    chunks.forEach((chunk, n) => (files[modelChunkPath(cat, n)] = JSON.stringify(chunk)));
    models[cat] = chunks;
  }
  console.log(`[data] validation (${VALIDATION_MODE}): ${rejectedTotal ? `${rejectedTotal} value(s) out of range — ${rejected.join(', ')}` : 'none'}`);
  console.log(`[data] conflicts (${VALIDATION_MODE}): ${conflictTotal ? `${conflictTotal} value(s) unknown or corrected — ${conflicted.join(', ')}` : 'none'}`);
  const { file: builder, extra, lazy } = builderFile(latest, builtAt, image);
  files['data/builder.json'] = JSON.stringify(builder);
  files['data/builder-extra.json'] = JSON.stringify(extra);
  for (const [slot, file] of Object.entries(lazy)) files[`data/builder-${slot}.json`] = JSON.stringify(file);
  for (const [path, chunk] of Object.entries(compatFiles(latest, builtAt))) files[path] = JSON.stringify(chunk);
  files['data/aliases.json'] = aliasesJson(models, builtAt, readJson<AliasSource>(ALIASES_PATH, {}));
  files['data/search.json'] = JSON.stringify(searchFile(latest, builtAt));
  const m = manifest(latest, builder, builtAt, history, lazy);
  files['data/manifest.json'] = JSON.stringify(m);
  return { files, manifest: m, models };
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

/**
 * Vite copies public/ whole, raw scraper files included (per category latest.json, offers.json, specs.json,
 * image_urls.json, history.json, history_imported.json, and makers/*: ~170 MB, 2,700 files that nothing fetches:
 * the build derives everything the site reads). Removes from the build output every file under data/ that the
 * build did not generate itself (`keep`: the emitted data/ paths, manifest.json among them), then empty folders.
 * An allow-list of what the build emits, not a list of raw names: a new scraper file stays out without a change
 * here, and a generated file can never be removed. Never touches public/data; returns how many files it removed.
 */
export function pruneRawData(outDir: string, keep: ReadonlySet<string>): number {
  let n = 0;
  const walk = (dir: string, rel: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const path = `${rel}/${e.name}`;
      if (e.isDirectory()) {
        walk(join(dir, e.name), path);
        if (readdirSync(join(dir, e.name)).length === 0) rmdirSync(join(dir, e.name));
      } else if (!keep.has(path)) {
        rmSync(join(dir, e.name));
        n++;
      }
    }
  };
  const root = join(outDir, 'data');
  if (existsSync(root)) walk(root, 'data');
  return n;
}

const kb = (s: string) => `${(Buffer.byteLength(s) / 1024).toFixed(0)} KB`;

export default function dataFiles(): Plugin {
  let cache: { key: string; files: Record<string, string> } | null = null;
  let outDir = 'dist';
  let building = false;
  let generated = new Set<string>(); // the data/ paths this build emits (generateBundle)
  let devImages: ImageLookup | undefined;
  // Dev: re-derive when any scraper file changed (its modification times are the cache key).
  const devFiles = () => {
    const key = CATEGORY_IDS.map((c) => {
      try {
        return statSync(join(DATA_DIR, c, 'latest.json')).mtimeMs;
      } catch {
        return 0;
      }
    }).join(',');
    if (cache?.key !== key) cache = { key, files: derive(new Date().toISOString(), devImages).files };
    return cache.files;
  };

  return {
    name: 'builddraft-data',
    configResolved(c) {
      outDir = resolve(c.root, c.build.outDir);
      building = c.command === 'build';
    },
    // After the bundle is written (Vite has copied public/ whole): the raw scraper files stay out of dist.
    closeBundle() {
      if (!building || this.meta?.watchMode || generated.size === 0) return; // also called when dev/preview shut down
      console.log(`[data] raw scraper files left out of the build: ${pruneRawData(outDir, generated)} files`);
    },
    async configureServer(server) {
      devImages = (await imageLookup()).lookup;
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
      const images = await imageLookup();
      this.info(`product photos: ${images.count} in the images index`);
      const { files, manifest: next, models } = derive(builtAt, images.lookup);
      // Deliberate overrides for planned data changes (e.g. merging duplicate products): the
      // problems are still listed in the build log, then published anyway.
      const override =
        process.env.DATA_CHECK === 'off'
          ? 'DATA_CHECK=off'
          : (process.env.VERCEL_GIT_COMMIT_MESSAGE ?? '').includes('[allow-data-drop]')
            ? 'commit tagged [allow-data-drop]'
            : null;
      const live = await liveManifest();
      const problems = checkData(next, live, models);
      if (problems.length && override) {
        this.warn(`${override}: publishing despite:\n  - ${problems.join('\n  - ')}`);
      } else if (problems.length) {
        this.error(`Data check failed, not publishing (the live site stays as it is):\n  - ${problems.join('\n  - ')}`);
      } else {
        this.info(live ? 'data check passed against the live manifest' : 'data check passed (no live manifest: minimum counts)');
      }
      generated = new Set(Object.keys(files));
      for (const [fileName, source] of Object.entries(files)) this.emitFile({ type: 'asset', fileName, source });
      const sizes = Object.entries(files)
        .filter(([p]) => !p.endsWith('detail.json') && !p.startsWith('data/compat/') && !p.includes('/model/'))
        .map(([p, s]) => `${p.replace('data/', '')} ${kb(s)}`);
      this.info(`data files: ${sizes.join(', ')}`);
      // Product pages: the largest model chunk of each category (target: 40 KiB gzip at most), from the five
      // largest uncompressed ones (gzipping all 2,304 files would cost build time for a log line).
      const largest = Object.entries(models).map(([cat, chunks]) => {
        const texts = chunks.map((_, n) => files[modelChunkPath(cat, n)]).sort((a, b) => b.length - a.length);
        const gz = Math.max(...texts.slice(0, 5).map((t) => gzipSync(t).length));
        return `${cat} ${(gz / 1024).toFixed(1)} KiB`;
      });
      this.info(`model chunks, largest gzip: ${largest.join(', ')}`);
    },
  };
}
