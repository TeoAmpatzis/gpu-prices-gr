// One HTML file per address (audit P3-009): crawlers and link previews that run no JavaScript get each page's own
// title, description, canonical address and preview tags. The file is index.html with a different <head>; the app
// starts from it exactly as from index.html, and vercel.json's rewrites stay as the fallback for any other address.
import { CATEGORY_LIST, INFO_PAGES } from './routes';
import { pageMeta, type Meta } from './pageMeta';
import type { ModelChunk } from '../types';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** index.html with `meta` in its head. Throws when a tag it must replace is missing, so a change to index.html can't silently stop this. */
export function withMeta(html: string, meta: Meta): string {
  const content = (selector: string, value: string) => {
    const tag = new RegExp(`(<meta ${selector} content=")[^"]*(")`);
    if (!tag.test(html)) throw new Error(`staticPages: index.html has no <meta ${selector}>`);
    html = html.replace(tag, (_, a: string, b: string) => a + esc(value) + b);
  };
  if (!/<title>[^<]*<\/title>/.test(html)) throw new Error('staticPages: index.html has no <title>');
  html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(meta.title)}</title>\n    <link rel="canonical" href="${esc(meta.canonical)}" />`);
  content('name="description"', meta.description);
  content('property="og:url"', meta.canonical);
  for (const p of ['property="og:title"', 'name="twitter:title"']) content(p, meta.title);
  for (const p of ['property="og:description"', 'name="twitter:description"']) content(p, meta.description);
  return html;
}

/** file name in dist → HTML, for every category, fixed page and model (the sitemap's addresses, Greek: the default language). */
export function staticPages(indexHtml: string, models: Record<string, ModelChunk[]>): Record<string, string> {
  const files: Record<string, string> = {};
  for (const page of [...CATEGORY_LIST, 'builder', 'parts', ...INFO_PAGES]) files[`${page}/index.html`] = withMeta(indexHtml, pageMeta(`/${page}`, 'el'));
  for (const cat of CATEGORY_LIST) {
    for (const chunk of models[cat] ?? []) {
      for (const e of Object.values(chunk.models)) {
        if (!e.listings.length) continue;
        const prices = e.listings.map((l) => l.price);
        const data = { name: e.chip, low: Math.min(...prices), high: Math.max(...prices), shops: new Set(e.listings.map((l) => l.source)).size };
        files[`${cat}/${e.slug}/index.html`] = withMeta(indexHtml, pageMeta(`/${cat}/${e.slug}`, 'el', data));
      }
    }
  }
  return files;
}
