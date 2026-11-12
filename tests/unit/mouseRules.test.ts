// Mouse filters (plan Task 6): only stated values match, a dual-mode mouse is in both connection pills, and the
// pill counts use the same rule as the filter.
import { describe, expect, it } from 'vitest';
import { CATEGORIES, type CategoryConfig } from '../../src/lib/categories';
import { matchesGroup, MOUSE_RULES, mouseColourName, OTHER, RULES } from '../../src/lib/categoryRules';
import { filterCatalogue } from '../../src/lib/catalogueFilters';
import { defaultFilters, type Filters } from '../../src/lib/data';
import { facetCounts, optionsOf } from '../../src/lib/facets';
import { decodeFilters, encodeFilters } from '../../src/lib/filterUrl';
import { recommendedScores } from '../../src/lib/ranking';
import type { BaseListing, MouseListing } from '../../src/types';

let n = 0;
const mouse = (o: Partial<MouseListing> = {}): MouseListing => ({
  id: `bestprice:${++n}`, source: 'bestprice', title: 'Acme M1', url: `https://x/${n}`, price: 20, shopCount: 2,
  brand: 'Acme', chip: `Acme M${n}`, scrapedAt: '2026-11-12T00:00:00Z',
  connection: null, dpi: null, pollingHz: null, buttons: null, rgb: null, gaming: null, bluetooth: null, rf: null,
  rechargeable: null, ergonomic: null, silent: null, colour: null, partNumber: null,
  ...o,
});
const filter = (key: string) => MOUSE_RULES.extraFilters.find((f) => f.key === key)!;
const cfg = CATEGORIES.mouse;
const filters = (o: Partial<Filters>): Filters => ({ ...defaultFilters(cfg.groups), ...o });
const ids = (all: MouseListing[], f: Partial<Filters>) => filterCatalogue(all, filters(f), cfg).map((p) => p.listing.id).sort();

describe('mouse connection pills', () => {
  it('a dual-mode mouse is in both pills, an unknown connection in neither', () => {
    expect(matchesGroup(MOUSE_RULES, mouse({ connection: 'both' }), 'wired')).toBe(true);
    expect(matchesGroup(MOUSE_RULES, mouse({ connection: 'both' }), 'wireless')).toBe(true);
    expect(matchesGroup(MOUSE_RULES, mouse({ connection: 'wired' }), 'wireless')).toBe(false);
    expect(matchesGroup(MOUSE_RULES, mouse({ connection: null }), 'wired')).toBe(false);
    expect(MOUSE_RULES.group(mouse({ connection: null }))).toBe(OTHER);
  });

  it('the filter and the pill counts agree; both pills together list a row once; All keeps the unknown', () => {
    const all = [mouse({ connection: 'wired' }), mouse({ connection: 'wireless' }), mouse({ connection: 'both' }), mouse()];
    const [wired, wireless, both, unknown] = all.map((l) => l.id);
    expect(ids(all, {})).toEqual([wired, wireless, both, unknown].sort());
    expect(ids(all, { groups: ['wired'] })).toEqual([wired, both].sort());
    expect(ids(all, { groups: ['wireless'] })).toEqual([wireless, both].sort());
    expect(ids(all, { groups: ['wireless', 'wired'] })).toEqual([wired, wireless, both].sort());
    const counts = facetCounts(all, filters({}), cfg, {}, {}, optionsOf(cfg, all));
    expect(counts.groups).toEqual({ wireless: 2, wired: 2 });
  });

  it('other categories keep plain equality', () => {
    for (const rules of Object.values(RULES)) if (rules.id !== 'mouse') expect(rules.matchesGroup).toBeUndefined();
  });
});

describe('mouse spec filters match stated values only', () => {
  it('yes / no flags: an unknown value matches neither, an explicit false matches No', () => {
    for (const key of ['bluetooth', 'rf', 'rechargeable', 'rgb', 'silent', 'ergonomic'] as const) {
      const f = filter(key);
      expect(f.options([]).map((o) => o.value)).toEqual(['yes', 'no']);
      for (const v of ['yes', 'no']) expect(f.test(mouse({ [key]: null }), v)).toBe(false);
      expect(f.test(mouse({ [key]: true }), 'yes')).toBe(true);
      expect(f.test(mouse({ [key]: true }), 'no')).toBe(false);
      expect(f.test(mouse({ [key]: false }), 'no')).toBe(true);
      expect(f.test(mouse({ [key]: false }), 'yes')).toBe(false);
    }
  });

  it('use: office needs an explicit "not gaming"', () => {
    const use = filter('use');
    expect(use.test(mouse({ gaming: true }), 'gaming')).toBe(true);
    expect(use.test(mouse({ gaming: false }), 'office')).toBe(true);
    expect(use.test(mouse({ gaming: null }), 'office')).toBe(false);
    expect(use.test(mouse({ gaming: null }), 'gaming')).toBe(false);
  });

  it('thresholds: at least, never an unknown value', () => {
    expect(filter('dpi').test(mouse({ dpi: 1600 }), '1600')).toBe(true);
    expect(filter('dpi').test(mouse({ dpi: 1200 }), '1600')).toBe(false);
    expect(filter('dpi').test(mouse({ dpi: null }), '1600')).toBe(false);
    expect(filter('pollingHz').test(mouse({ pollingHz: 8000 }), '1000')).toBe(true);
    expect(filter('pollingHz').test(mouse({ pollingHz: null }), '125')).toBe(false);
    expect(filter('buttons').test(mouse({ buttons: 6 }), '6')).toBe(true);
    expect(filter('buttons').test(mouse({ buttons: null }), '2')).toBe(false);
  });

  it('colour: a white selection never shows the cheaper black offer of the same model', () => {
    const all = [mouse({ chip: 'Acme One', colour: 'black', price: 10 }), mouse({ chip: 'Acme One', colour: 'white', price: 15 }), mouse({ chip: 'Acme One', colour: null, price: 5 })];
    const shown = filterCatalogue(all, filters({ extra: { colour: 'white' } }), cfg);
    expect(shown.map((p) => p.listing.price)).toEqual([15]);
    expect(mouseColourName('black-red')).toEqual({ el: 'Μαύρο / Κόκκινο', en: 'Black / Red' });
    expect(mouseColourName('light-blue')).toEqual({ el: 'Ανοιχτό Μπλε', en: 'Light Blue' });
  });

  it('filters survive the address bar', () => {
    const f = filters({ groups: ['wireless'], extra: { use: 'gaming', bluetooth: 'no', dpi: '8000', colour: 'black' } });
    const back = decodeFilters(new URLSearchParams(encodeFilters(f, cfg)), cfg);
    expect(back.groups).toEqual(['wireless']);
    expect(back.extra).toEqual(f.extra);
  });
});

describe('mouse ranking', () => {
  it('a higher DPI does not change the recommended score', () => {
    const a = mouse({ chip: 'Acme A', dpi: 800 });
    const b = mouse({ chip: 'Acme B', dpi: 30000 });
    const models = filterCatalogue([a, b], filters({}), cfg).map((p) => p.family);
    const scores = recommendedScores(models, 'mouse', (cfg as unknown as CategoryConfig<BaseListing>).value);
    expect(scores.get(models[0].key)).toBe(scores.get(models[1].key));
  });
});
