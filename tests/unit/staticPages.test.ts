// Audit P3-009: every address gets its own title, description, canonical and preview tags without JavaScript.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { staticPages, withMeta } from '../../src/lib/staticPages';
import type { ModelChunk } from '../../src/types';

const index = readFileSync('index.html', 'utf8');
const entry = (chip: string, slug: string, prices: number[]) => ({ key: slug, slug, chip, listings: prices.map((price, i) => ({ price, source: i ? 'bestprice' : 'skroutz' })), history: [] });
const models = { gpu: [{ v: 1, builtAt: '', sources: {}, models: { a: entry('RTX 5070 12GB', 'rtx-5070-12gb', [650.5, 700]), b: entry('Gone', 'gone', []) } }] } as unknown as Record<string, ModelChunk[]>;
const pages = staticPages(index, models);

describe('per-address pages', () => {
  it('a model page names the model, its lowest price and its own address', () => {
    const html = pages['gpu/rtx-5070-12gb/index.html'];
    expect(html).toContain('<title>RTX 5070 12GB — BuildDraft.gr</title>');
    expect(html).toContain('<link rel="canonical" href="https://gpu-prices-gr.vercel.app/gpu/rtx-5070-12gb" />');
    expect(html).toContain('<meta property="og:url" content="https://gpu-prices-gr.vercel.app/gpu/rtx-5070-12gb" />');
    expect(html).toMatch(/<meta property="og:title" content="RTX 5070 12GB — BuildDraft.gr" \/>/);
    expect(html).toMatch(/<meta name="description" content="RTX 5070 12GB: χαμηλότερη τιμή 650,50 € σε 2 καταστήματα\./);
  });
  it('categories and fixed pages get a file, a model without offers does not', () => {
    for (const p of ['gpu', 'monitor', 'builder', 'privacy']) expect(pages[`${p}/index.html`]).toContain(`href="https://gpu-prices-gr.vercel.app/${p}"`);
    expect(pages['gpu/gone/index.html']).toBeUndefined();
    expect(pages['gpu/index.html']).not.toContain(index.match(/<title>[^<]*<\/title>/)![0]);
  });
  it('the rest of index.html is unchanged: same scripts, same length apart from the head values', () => {
    const html = pages['gpu/index.html'];
    expect(html.match(/<script[\s\S]*?<\/script>/g)).toEqual(index.match(/<script[\s\S]*?<\/script>/g));
    expect(html.slice(html.indexOf('</head>'))).toBe(index.slice(index.indexOf('</head>')));
  });
  it('names are escaped', () => {
    const html = withMeta(index, { title: 'A "27" <b> & co', description: 'd', canonical: 'https://x/y' });
    expect(html).toContain('<title>A &quot;27&quot; &lt;b&gt; &amp; co</title>');
    expect(html).toContain('content="A &quot;27&quot; &lt;b&gt; &amp; co"');
  });
  it('a missing tag in index.html is an error, not a silent skip', () => {
    expect(() => withMeta(index.replace('property="og:url"', 'property="og:x"'), { title: 't', description: 'd', canonical: 'c' })).toThrow(/og:url/);
  });
});
