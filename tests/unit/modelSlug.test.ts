// Stable model addresses (step 4, task 13): one canonical spelling per model, chosen from all its listings, and a
// lookup form that every spelling of the model (and any letter case) shares.
import { describe, expect, it } from 'vitest';
import { modelSlug, slugLookup } from '../../src/lib/slug';

const l = (chip: string, price: number, media?: string) => ({ chip, price, ...(media ? { media } : {}) });
const model = (key: string, ls: ReturnType<typeof l>[]) => {
  const sorted = [...ls].sort((a, b) => a.price - b.price);
  return { key, chip: sorted[0].chip, cheapest: sorted[0], listings: sorted };
};

describe('slugLookup', () => {
  it('graphics cards, processors, memory, power supplies: the slug in lower case', () => {
    expect(slugLookup('gpu', 'RTX-5070-12GB')).toBe('rtx-5070-12gb');
    expect(slugLookup('ram', 'ddr5-32gb-2x16gb-6000mhz-desktop')).toBe('ddr5-32gb-2x16gb-6000mhz-desktop');
    expect(slugLookup('psu', '850W-Gold-ATX')).toBe('850w-gold-atx');
    expect(slugLookup('cpu', 'Ryzen-7-9800X3D')).toBe('ryzen-7-9800x3d');
  });
  it('boards, drives, cases, fans, coolers: letters and digits only (the key\'s form), any spelling', () => {
    for (const cat of ['mobo', 'storage', 'case', 'fan', 'cooler']) {
      expect(slugLookup(cat, 'aerocool-cs-111')).toBe('aerocoolcs111');
      expect(slugLookup(cat, 'Aerocool-CS111')).toBe('aerocoolcs111');
    }
    expect(slugLookup('mobo', 'msi-mag-b650-tomahawk-wifi')).toBe(slugLookup('mobo', 'msi-mag-b650-tomahawk-wi-fi'));
  });
});

describe('modelSlug: the canonical spelling', () => {
  it('is the most common spelling of the listings, not the cheapest one', () => {
    const m = model('aerocoolcs111', [l('Aerocool CS111', 100), l('Aerocool CS-111', 110), l('Aerocool CS-111', 120)]);
    expect(modelSlug('case', m)).toBe('aerocool-cs-111');
  });
  it('does not move when prices move', () => {
    const a = model('aerocoolcs111', [l('Aerocool CS111', 100), l('Aerocool CS-111', 110), l('Aerocool CS-111', 120)]);
    const b = model('aerocoolcs111', [l('Aerocool CS111', 130), l('Aerocool CS-111', 110), l('Aerocool CS-111', 90)]);
    expect(modelSlug('case', a)).toBe(modelSlug('case', b));
  });
  it('a tie goes to the alphabetically smallest spelling, whatever the order', () => {
    const one = model('xy1', [l('X Y1', 10), l('X-Y-1', 20)]);
    const two = model('xy1', [l('X Y1', 20), l('X-Y-1', 10)]);
    expect(modelSlug('fan', one)).toBe('x-y-1');
    expect(modelSlug('fan', two)).toBe('x-y-1');
  });
  it('drives add their media, as the key does', () => {
    const m = model('samsung990pro2tbssd', [l('Samsung 990 Pro 2TB', 150, 'SSD'), l('Samsung 990 PRO 2TB', 160, 'SSD')]);
    expect(modelSlug('storage', m)).toBe('samsung-990-pro-2tb-ssd');
  });
  it('graphics cards, processors, memory, power supplies: the key, whatever the listings say', () => {
    const m = model('RTX 5070 12GB', [l('RTX 5070', 500), l('GeForce RTX 5070', 510)]);
    expect(modelSlug('gpu', m)).toBe('rtx-5070-12gb');
  });
  it('a model given without its listings uses its cheapest one (as before)', () => {
    expect(modelSlug('case', { key: 'k', chip: 'Aerocool CS111', cheapest: l('Aerocool CS111', 1) })).toBe('aerocool-cs111');
  });
});
