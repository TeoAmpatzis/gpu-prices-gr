import { describe, expect, it } from 'vitest';
import { pageMeta, productJsonLd } from '../../src/lib/pageMeta';

const data = { name: 'RTX 5060 Ti 8GB', low: 379.9, high: 449, shops: 4 };

describe('pageMeta', () => {
  it('a model page names the model, the lowest price and the shop count', () => {
    const m = pageMeta('/gpu/rtx-5060-ti-8gb?x=1#y', 'en', data);
    expect(m.title).toContain('RTX 5060 Ti 8GB');
    expect(m.title).toContain('BuildDraft.gr');
    expect(m.description).toContain('379.90');
    expect(m.description).toContain('4 shops');
    expect(m.canonical).toBe('https://gpu-prices-gr.vercel.app/gpu/rtx-5060-ti-8gb');
  });
  it('home, categories and info pages each differ', () => {
    const paths = ['/', '/gpu', '/cpu', '/mobo', '/ram', '/storage', '/psu', '/case', '/fan', '/cooler', '/about'];
    for (const lang of ['el', 'en'] as const) {
      const descs = paths.map((p) => pageMeta(p, lang).description);
      expect(new Set(descs).size).toBe(paths.length);
      expect(new Set(paths.map((p) => pageMeta(p, lang).title)).size).toBe(paths.length);
    }
  });
  it('canonical has no query string or trailing slash; home is the bare site', () => {
    expect(pageMeta('/gpu/?cat=1', 'el').canonical).toBe('https://gpu-prices-gr.vercel.app/gpu');
    expect(pageMeta('/', 'el').canonical).toBe('https://gpu-prices-gr.vercel.app/');
  });
  it('JSON-LD carries lowPrice and offerCount', () => {
    const ld = productJsonLd(pageMeta('/gpu/x', 'en', data), data) as { offers: { lowPrice: number; offerCount: number } };
    expect(ld.offers.lowPrice).toBe(379.9);
    expect(ld.offers.offerCount).toBe(4);
  });
});
