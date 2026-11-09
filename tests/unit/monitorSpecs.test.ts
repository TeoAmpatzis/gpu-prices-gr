import { describe, expect, it } from 'vitest';
import { specGroups } from '../../src/ui/specs';
import type { MonitorListing } from '../../src/types';

const base = {
  id: 'bestprice:1', source: 'bestprice', title: 'Samsung G50F 27"', url: 'u', price: 300, shopCount: 1, scrapedAt: '2026-11-09',
  brand: 'Samsung', chip: 'Samsung G50F', code: 'G50F', size: null, height: null, width: null, hz: null, panel: null, colour: null, revision: null,
} as unknown as MonitorListing;
const mon = (o: Partial<MonitorListing> = {}): MonitorListing => ({ ...base, ...o }) as MonitorListing;
const items = (ls: MonitorListing[], id: string, lang: 'en' | 'el' = 'en') => specGroups('monitor', ls, lang).find((g) => g.id === id)?.items ?? [];
const value = (ls: MonitorListing[], group: string, label: string, lang: 'en' | 'el' = 'en') => items(ls, group, lang).find((i) => i.label === label)?.value;

const full = mon({
  size: 27, height: 1440, width: 2560, hz: 180, panel: 'IPS',
  pgResponseMs: 1, pgNits: 300, pgContrast: 1000, pgHdr: true, pgCurved: false, pgUltrawide: false, pgAspect: '16:9', pgVesa: '100x100',
  pgConnectors: ['HDMI', 'DisplayPort'], pgFeatures: ['FreeSync', 'G-Sync'], pgEnergy: 'E',
});

describe('monitor spec groups', () => {
  it('shows title values and page values in their groups, in both languages', () => {
    expect(value([full], 'general', 'Diagonal')).toBe('27"');
    expect(value([full], 'general', 'Resolution')).toBe('2560 × 1440');
    expect(value([full], 'general', 'Refresh rate')).toBe('180 Hz');
    expect(value([full], 'general', 'Response time')).toBe('1 ms');
    expect(value([full], 'general', 'Brightness')).toBe('300 cd/m²');
    expect(value([full], 'general', 'Contrast')).toBe('1,000:1');
    expect(value([full], 'general', 'HDR')).toBe('Yes');
    expect(value([full], 'general', 'Curved')).toBe('No');
    expect(value([full], 'general', 'Aspect ratio')).toBe('16:9');
    expect(value([full], 'dimensions', 'VESA mount')).toBe('100x100');
    expect(value([full], 'power', 'Energy class')).toBe('E');
    expect(value([full], 'connections', 'Ports')).toBe('HDMI, DisplayPort');
    expect(value([full], 'connections', 'Features')).toBe('FreeSync, G-Sync');
    expect(value([full], 'general', 'Ανάλυση', 'el')).toBe('2560 × 1440');
    expect(value([full], 'general', 'Καμπυλωτή', 'el')).toBe('Όχι');
    expect(value([full], 'connections', 'Θύρες', 'el')).toBe('HDMI, DisplayPort');
  });

  it('a value the page alone states is tagged as such; one the title states is not', () => {
    const pageOnly = mon({ pgSize: 27, pgHz: 144, pgPanel: 'VA', pgHeight: 1440, pgWidth: 2560 });
    const rows = items([pageOnly], 'general');
    expect(rows.find((i) => i.label === 'Diagonal')).toEqual({ label: 'Diagonal', value: '27"', tag: 'from the shop page' });
    expect(rows.find((i) => i.label === 'Refresh rate')?.tag).toBe('from the shop page');
    expect(rows.find((i) => i.label === 'Panel')).toMatchObject({ value: 'VA', tag: 'from the shop page' });
    expect(items([full], 'general').find((i) => i.label === 'Diagonal')?.tag).toBeUndefined();
  });

  it('the title wins when both state a value (the page value is not shown in its place)', () => {
    const both = mon({ size: 27, pgSize: 32, hz: 165, pgHz: 144 });
    expect(value([both], 'general', 'Diagonal')).toBe('27"');
    expect(value([both], 'general', 'Refresh rate')).toBe('165 Hz');
  });

  it('leaves out what is unknown: no empty rows, no empty groups, explicit false still shows', () => {
    const none = specGroups('monitor', [mon()], 'en');
    expect(none).toEqual([]);
    const flatOnly = specGroups('monitor', [mon({ pgCurved: false })], 'en');
    expect(flatOnly).toEqual([{ id: 'general', items: [{ label: 'Curved', value: 'No' }] }]);
  });

  it('uses the most common value across the listings and ignores listings that say nothing', () => {
    const a = mon({ pgHdr: true }), b = mon({ id: 'x:2', pgHdr: true }), c = mon({ id: 'x:3', pgHdr: false }), d = mon({ id: 'x:4' });
    expect(value([a, b, c, d], 'general', 'HDR')).toBe('Yes');
  });
});
