import { describe, expect, it } from 'vitest';
import { sitemaps } from '../../src/lib/sitemap';
import type { ModelChunk } from '../../src/types';

const chunk = (...slugs: string[]) => ({ models: Object.fromEntries(slugs.map((s) => [s, { slug: s }])) }) as unknown as ModelChunk;

describe('sitemaps', () => {
  const out = sitemaps({ gpu: [chunk('rtx-5060-ti', 'rx-9070'), chunk('arc-b570')], cpu: [chunk('ryzen-5-7600')] }, '2026-11-08T10:00:00Z');
  it('lists every model under its category and the fixed pages', () => {
    expect(out['sitemap-gpu.xml']).toContain('<loc>https://gpu-prices-gr.vercel.app/gpu/arc-b570</loc>');
    expect(out['sitemap-gpu.xml'].match(/<url>/g)).toHaveLength(3);
    expect(out['sitemap-cpu.xml']).toContain('/cpu/ryzen-5-7600');
    expect(out['sitemap-pages.xml']).toContain('<loc>https://gpu-prices-gr.vercel.app/</loc>');
  });
  it('the index points at every file', () => {
    for (const f of Object.keys(out).filter((k) => k !== 'sitemap.xml')) expect(out['sitemap.xml']).toContain(`/${f}</loc>`);
  });
});
