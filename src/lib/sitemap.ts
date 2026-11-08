// sitemap.xml (an index) and one sitemap per category plus one for the fixed pages, from the built model chunks.
import { CATEGORY_LIST, INFO_PAGES } from './routes';
import { SITE } from './pageMeta';
import type { ModelChunk } from '../types';

const MAX_URLS = 50_000; // the sitemap protocol's limit per file
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const urlset = (paths: string[], lastmod: string) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
    .map((p) => `<url><loc>${esc(SITE + p)}</loc><lastmod>${lastmod}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`;

/** file name → XML. `models`: each category's model chunks (derive). */
export function sitemaps(models: Record<string, ModelChunk[]>, builtAt: string): Record<string, string> {
  const lastmod = builtAt.slice(0, 10);
  const files: Record<string, string> = {
    'sitemap-pages.xml': urlset(['/', ...CATEGORY_LIST.map((c) => `/${c}`), '/builder', ...INFO_PAGES.map((p) => `/${p}`)], lastmod),
  };
  for (const cat of CATEGORY_LIST) {
    const slugs = (models[cat] ?? []).flatMap((c) => Object.values(c.models).map((e) => `/${cat}/${e.slug}`)).sort();
    for (let i = 0, n = 1; i < slugs.length; i += MAX_URLS, n++) files[`sitemap-${cat}${n > 1 ? `-${n}` : ''}.xml`] = urlset(slugs.slice(i, i + MAX_URLS), lastmod);
  }
  const index = Object.keys(files).sort().map((f) => `<sitemap><loc>${SITE}/${f}</loc><lastmod>${lastmod}</lastmod></sitemap>`);
  files['sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${index.join('\n')}\n</sitemapindex>\n`;
  return files;
}
