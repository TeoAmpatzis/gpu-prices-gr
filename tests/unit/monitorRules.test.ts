import { describe, expect, it } from 'vitest';
import { MONITOR_RULES, OTHER } from '../../src/lib/categoryRules';
import type { MonitorListing } from '../../src/types';

const base: MonitorListing = {
  id: 'bestprice:1', source: 'bestprice', title: 'Dell U2724DE 27"', url: 'https://x/1', price: 300, shopCount: null,
  brand: 'Dell', chip: 'Dell U2724DE', code: 'U2724DE', size: 27, height: 1440, width: 2560, hz: 120, panel: 'IPS',
  colour: null, revision: null, scrapedAt: '2026-11-09T00:00:00Z',
} as MonitorListing;
const l = (o: Partial<MonitorListing>): MonitorListing => ({ ...base, ...o });
const filter = (key: string) => MONITOR_RULES.extraFilters.find((f) => f.key === key)!;

describe('monitor launch filters (title-derived values only)', () => {
  it('offers brand, resolution, refresh rate and panel, in that order', () => {
    expect(MONITOR_RULES.extraFilters.map((f) => f.key)).toEqual(['brand', 'res', 'hz', 'panel']);
  });

  it('groups by diagonal with the boundaries at 24.5, 27.5 and 32.5 inches', () => {
    const g = (size: number | null) => MONITOR_RULES.group(l({ size }));
    expect([g(24.5), g(24.6), g(27.5), g(27.6), g(32.5), g(32.6), g(34), g(null)]).toEqual(['≤24"', '25–27"', '25–27"', '28–32"', '28–32"', '34"+', '34"+', OTHER]);
  });

  it('resolution: names common heights, keeps the rest as Other, never matches an unknown height', () => {
    const res = filter('res');
    expect(res.options([]).map((o) => o.value)).toEqual(['fhd', 'wuxga', 'qhd', 'wqxga', '4k', '5k', 'other']);
    const hit = (height: number | null) => res.options([]).filter((o) => res.test(l({ height }), o.value)).map((o) => o.value);
    expect(hit(1080)).toEqual(['fhd']);
    expect(hit(1440)).toEqual(['qhd']);
    expect(hit(2160)).toEqual(['4k']);
    expect(hit(1200)).toEqual(['wuxga']);
    expect(hit(1024)).toEqual(['other']);
    expect(hit(null)).toEqual([]);
  });

  it('refresh rate: "at least" thresholds, an unknown rate is excluded', () => {
    const hz = filter('hz');
    expect(hz.options([]).map((o) => o.value)).toEqual(['60', '75', '100', '120', '144', '165', '240']);
    expect(hz.test(l({ hz: 165 }), '144')).toBe(true);
    expect(hz.test(l({ hz: 144 }), '144')).toBe(true);
    expect(hz.test(l({ hz: 120 }), '144')).toBe(false);
    expect(hz.test(l({ hz: null }), '60')).toBe(false);
  });

  it('panel: exact type, unknown never matches', () => {
    const panel = filter('panel');
    expect(panel.options([]).map((o) => o.value)).toEqual(['ips', 'va', 'tn', 'oled']);
    expect(panel.test(l({ panel: 'OLED' }), 'oled')).toBe(true);
    expect(panel.test(l({ panel: 'IPS' }), 'va')).toBe(false);
    expect(panel.test(l({ panel: null }), 'ips')).toBe(false);
  });
});
