// Mouse specs and colours (plan Task 7): rows only for stated values, an explicit "no" is shown, and colours are
// offers of one model.
import { describe, expect, it } from 'vitest';
import { productSpecs } from '../../src/components/catalogue/specs';
import { mouseColours, mouseOffers } from '../../src/components/product/MouseColours';
import { CATEGORIES, type CategoryConfig } from '../../src/lib/categories';
import { groupModels } from '../../src/lib/data';
import { keySpecs } from '../../src/components/product/keySpecs';
import { specGroups, specsOf } from '../../src/ui/specs';
import type { BaseListing, MouseListing } from '../../src/types';

let n = 0;
const mouse = (o: Partial<MouseListing> = {}): MouseListing => ({
  id: `bestprice:${++n}`, source: 'bestprice', title: 'Acme One', url: `https://x/${n}`, price: 20, shopCount: 2,
  brand: 'Acme', chip: 'Acme One', scrapedAt: '2026-11-12T00:00:00Z',
  connection: null, dpi: null, pollingHz: null, buttons: null, rgb: null, gaming: null, bluetooth: null, rf: null,
  rechargeable: null, ergonomic: null, silent: null, colour: null, partNumber: null,
  ...o,
});
const rows = (ls: MouseListing[], lang: 'el' | 'en' = 'en') =>
  Object.fromEntries(specGroups('mouse', ls, lang).map((g) => [g.id, Object.fromEntries(g.items.map((i) => [i.label, i.value]))]));

const full = mouse({
  connection: 'both', dpi: 26000, pollingHz: 1000, buttons: 6, rgb: true, gaming: true, bluetooth: true, rf: true,
  rechargeable: true, ergonomic: false, silent: false,
});

describe('mouse spec groups', () => {
  it('a complete mouse shows every row in its group, in both languages', () => {
    expect(rows([full])).toEqual({
      general: { Maker: 'Acme', Use: 'Gaming', Buttons: '6', RGB: 'Yes', Silent: 'No', Ergonomic: 'No', DPI: '26,000', 'Polling rate': '1,000 Hz' },
      power: { Rechargeable: 'Yes' },
      connections: { Connection: 'Wireless and wired', Bluetooth: 'Yes', '2.4 GHz receiver': 'Yes' },
    });
    const el = rows([full], 'el');
    expect(el.general['Χρήση']).toBe('Gaming');
    expect(el.general['Αθόρυβο']).toBe('Όχι');
    expect(el.connections['Σύνδεση']).toBe('Ασύρματο και ενσύρματο');
    expect(el.power['Επαναφορτιζόμενο']).toBe('Ναι');
  });

  it('an unknown value has no row and an empty group is left out; office is an explicit false', () => {
    expect(rows([mouse()])).toEqual({ general: { Maker: 'Acme' } });
    expect(rows([mouse({ gaming: false })]).general.Use).toBe('Office');
    expect(rows([mouse({ rgb: false })]).general.RGB).toBe('No');
  });

  it('the spec line, the catalogue row and the header state only known values', () => {
    expect(specsOf('mouse', [mouse()], 'en').map((s) => s.value)).toEqual([null, null, null, null]);
    expect(specsOf('mouse', [full], 'en').map((s) => s.value)).toEqual(['Wireless and wired', '26,000 DPI', '1,000 Hz', '6 buttons']);
    expect(productSpecs('mouse', mouse(), 'en').map((s) => s.value)).toEqual([null, null, null, null]);
    expect(productSpecs('mouse', full, 'el').map((s) => s.value)).toEqual(['Ασύρματο και ενσύρματο', '26000', '1000 Hz', '6']);
    const cfg = CATEGORIES.mouse as unknown as CategoryConfig<BaseListing>;
    const model = (l: MouseListing) => groupModels([l as BaseListing], cfg)[0];
    expect(keySpecs(cfg, model(mouse()), 'en')).toEqual([]);
    expect(keySpecs(cfg, model(full), 'en').map((s) => [s.label, s.value])).toEqual([['Connection', 'Wireless and wired'], ['DPI', '26,000'], ['Hz', 1000], ['Buttons', 6]]);
  });
});

describe('mouse colours are offers of one model', () => {
  const black = mouse({ colour: 'black', price: 30 });
  const cheapBlack = mouse({ colour: 'black', price: 25 });
  const white = mouse({ colour: 'white', price: 35 });
  const unknown = mouse({ colour: null, price: 10 });
  const all = [black, cheapBlack, white, unknown];

  it('one choice per stated colour with its own lowest price; an unknown colour gets no choice', () => {
    expect(mouseColours(all)).toEqual([{ colour: 'black', price: 25 }, { colour: 'white', price: 35 }]);
    expect(mouseColours([unknown])).toEqual([]);
  });

  it('a colour keeps only its offers; All keeps every offer, the unknown ones included', () => {
    expect(mouseOffers(all, 'white')).toEqual([white]);
    expect(mouseOffers(all, 'black')).toEqual([black, cheapBlack]);
    expect(mouseOffers(all, null)).toEqual(all);
    expect(mouseOffers(all, null)).not.toBe(all);
  });

  it('colours never make another model', () => {
    const cfg = CATEGORIES.mouse as unknown as CategoryConfig<BaseListing>;
    expect(groupModels(all as BaseListing[], cfg)).toHaveLength(1);
  });
});
