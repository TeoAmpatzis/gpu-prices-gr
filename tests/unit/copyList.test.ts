// Copy list (#27) and the chosen-offer fallback (Review Focus 5): one line per part "Category: <title> — <price> —
// <shop> — <URL of the listing used>", the variant the buyer chose, the PSU named by maker + model, and a chosen offer
// that is gone falls back to the model's cheapest with a notice while the total stays the sum of the shown prices.
import { describe, expect, it } from 'vitest';
import { resolveLine } from '../../src/lib/builderOffers';
import { copyListText, lineNotice, lineTitle, linesTotal } from '../../src/lib/copyList';
import type { AnyModel } from '../../src/lib/builderState';
import type { BaseListing, PsuListing } from '../../src/types';
import { formatPrice } from '../../src/lib/format';
import { tr } from '../../src/lib/i18n';

const eur = (n: number) => formatPrice(n, 'en');

const listing = (id: string, title: string, price: number, fields: object = {}): BaseListing => ({
  id, source: 'skroutz', title, url: `https://example.com/${id}`, price, shopCount: null, brand: 'Montech', chip: 'Montech XR', scrapedAt: '', ...fields,
});
// A builder row: the model's distinct titles joined, the row listing's own title first (derive.builderRow).
const row = (own: BaseListing, ...others: BaseListing[]): BaseListing => ({ ...own, title: [own, ...others].map((l) => l.title).join(' | ') });
const model = (key: string, chip: string, cheapest: BaseListing): AnyModel => ({ key, chip, cheapest, listings: [cheapest], maxPrice: cheapest.price }) as AnyModel;

const black = listing('skroutz:1', 'Montech XR Gaming Midi Tower Black', 79);
const white = listing('bestprice:2', 'Montech XR Gaming Midi Tower White', 85, { source: 'bestprice' });
const xr = model('montechxr', 'Montech XR', row(black, white));

const psuRow = listing('skroutz:9', 'Corsair RM850e (2023) 850W Full Modular | CORSAIR RM850E 850W', 119, {
  brand: 'Corsair', chip: 'Corsair RM850e 850W', watts: 850, efficiency: 'Gold', modular: 'Full', formFactor: 'ATX', atx3: true,
} as Partial<PsuListing>);
const psu = model('corsair rm850e 850w', 'Corsair RM850e 850W', psuRow);

const opts = { lang: 'en' as const, date: '01/11/2026', link: 'https://builddraft.gr/builder?v=2&case=montechxr' };

describe('Copy list names the variant and the PSU maker + model (#27, task 12 review #4)', () => {
  it('the chosen white Montech XR, not the cheapest black one', () => {
    const chosen = resolveLine('case', xr, 1, white.id, [black, white]);
    const text = copyListText([chosen], opts);
    expect(text).toContain('Case: Montech XR Gaming Midi Tower White — ');
    expect(text).not.toContain('Black');
    expect(text).toContain(white.url);
  });

  it('with no chosen offer, the row listing\'s own title (black), not every title joined', () => {
    const line = resolveLine('case', xr, 1);
    expect(lineTitle(line, 'en')).toBe('Montech XR Gaming Midi Tower Black');
    expect(copyListText([line], opts)).not.toContain('White');
  });

  it('the PSU line names maker + model and the picker card\'s specs, in both languages', () => {
    const line = resolveLine('psu', psu, 1);
    expect(lineTitle(line, 'en')).toBe('Corsair RM850e 850W · 850 W · 80+ Gold · ATX · ATX 3.x · Fully modular');
    expect(lineTitle(line, 'el')).toContain('Corsair RM850e 850W');
    expect(lineTitle(line, 'el')).toContain('Πλήρως αρθρωτό');
    const noEff = resolveLine('psu', model('x', 'Akyga AK-B1 500W', { ...psuRow, efficiency: null, modular: null, atx3: null } as BaseListing), 1);
    expect(lineTitle(noEff, 'en')).toContain('no stated efficiency');
    expect(copyListText([line], opts)).toMatch(/^Power supply: Corsair RM850e 850W · 850 W .* — \S+ — Skroutz — https:\/\/example\.com\/skroutz:9$/m);
    expect(copyListText([line], opts)).toContain(`— ${eur(119)} — Skroutz`);
  });

  it('fans: quantity × the pack, the line price is quantity × price', () => {
    const fan = model('arcticp12', 'Arctic P12 120mm ×5', listing('skroutz:5', 'Arctic P12 PWM PST 5-pack', 30, { chip: 'Arctic P12 120mm ×5' }));
    const text = copyListText([resolveLine('fan', fan, 2)], opts);
    expect(text).toContain(`Case fans: 2 × Arctic P12 PWM PST 5-pack — ${eur(60)}`);
  });

  it('header, total, date and share link', () => {
    const lines = [resolveLine('case', xr, 1), resolveLine('psu', psu, 1)];
    const text = copyListText(lines, opts).split('\n');
    expect(text[0]).toBe('BuildDraft.gr · My build');
    expect(text).toContain(`Total: ${eur(198)}`);
    expect(text.some((l) => l.includes('01/11/2026'))).toBe(true);
    expect(text[text.length - 1]).toBe(opts.link);
  });
});

describe('a chosen offer that is gone (Review Focus 5)', () => {
  it('keeps fallback estimates internal; Copy list shows the unresolved request without a purchase URL', () => {
    // The offers loaded, but the chosen listing is no longer among them.
    const gone = resolveLine('case', xr, 1, 'shopflix:gone', [black, white]);
    expect(gone.status).toBe('missing');
    expect(gone.offer.id).toBe(black.id);
    expect(gone.total).toBe(0);
    expect(tr('en', lineNotice(gone) ?? '')).toMatch(/no longer/i);
    const p = resolveLine('psu', psu, 1);
    const lines = [gone, p];
    expect(linesTotal(lines)).toBe(119);
    const text = copyListText(lines, opts);
    expect(text).toContain('shopflix:gone');
    expect(text).not.toContain(black.url);
    expect(text).not.toContain('Black');
    expect(text).toContain(`Total: ${eur(119)}`);
  });

  it('while the chosen offer loads the line says so (pending), and a found one has no notice', () => {
    expect(tr('en', lineNotice(resolveLine('case', xr, 1, white.id)) ?? '')).toMatch(/loading/i);
    expect(lineNotice(resolveLine('case', xr, 1, white.id, [black, white]))).toBeNull();
    expect(lineNotice(resolveLine('case', xr, 1))).toBeNull();
  });
});
