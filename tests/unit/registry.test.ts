import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATEGORIES, CATEGORY_IDS } from '../../src/lib/categories';
import { REGISTRY, slotOf, type Category } from '../../src/lib/registry';
import { SLOT_OF } from '../../src/lib/pick';
import { SLOTS } from '../../src/lib/slots';
import { CATEGORY_LIST, matchRoute } from '../../src/lib/routes';
import { isComparable } from '../../src/lib/compare/refs';
import { GROUPS } from '../../src/shell/nav';
import { photoId } from '../../src/lib/images';

const text = (path: string) => readFileSync(path, 'utf8');
const ids = Object.keys(REGISTRY) as Category[];

describe('category registry', () => {
  it('agrees with the mouse image pipeline on the shared photo identity vector', () => {
    expect(photoId('mouse', 'logitechm171wireless')).toBe('9656df6b22f8');
  });

  it('publishes mice as a peripheral (2026-11-12) and keeps them outside the PC builder', () => {
    const mouse = 'mouse' as Category;
    expect(REGISTRY).toHaveProperty('mouse', { domain: 'peripherals', enabled: true, visible: true });
    expect(slotOf(mouse)).toBeNull();
    expect(SLOTS).not.toContain(mouse);
    expect(SLOT_OF).not.toHaveProperty(mouse);
    expect(CATEGORY_IDS).toContain(mouse);
    expect(CATEGORY_LIST).toEqual(['gpu', 'cpu', 'mobo', 'ram', 'storage', 'psu', 'case', 'fan', 'cooler', 'monitor', 'mouse']);
    expect(GROUPS.at(-1)!.cats).toEqual(['monitor', 'mouse']);
    expect(matchRoute('/mouse')).not.toEqual({ kind: 'notFound' });
    expect(matchRoute('/mouse/logitech-m171')).not.toEqual({ kind: 'notFound' });
    expect(isComparable(mouse)).toBe(true);
  });

  it('lists the same categories as the site config', () => {
    expect(Object.keys(CATEGORIES).sort()).toEqual([...ids].sort());
  });

  it('builds data only for the categories the registry has switched on', () => {
    expect([...CATEGORY_IDS].sort()).toEqual(ids.filter((id) => REGISTRY[id].enabled).sort());
  });

  it('agrees with the scraper on the category ids', () => {
    const py = text('scraper/category_ids.py').match(/CATEGORY_IDS\s*=\s*\(([^)]*)\)/);
    expect(py).not.toBeNull();
    const scraper = [...py![1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]);
    expect([...scraper].sort()).toEqual([...ids].sort());
  });

  it('agrees with the scraper config and the live-site check', () => {
    const categoriesPy = text('scraper/categories.py');
    for (const id of ids) expect(categoriesPy).toContain(`    "${id}": Category(`);
    const siteCheck = text('scripts/checks/site-check.mjs').match(/const CATS = \[([^\]]*)\]/);
    // The live check browses the published categories only: a hidden one (monitor, until Phase 3) is not on the site yet.
    expect([...siteCheck![1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]).sort()).toEqual(ids.filter((id) => REGISTRY[id].visible).sort());
  });

  it('gives every builder part a slot and nothing else', () => {
    for (const id of ids) {
      const slot = slotOf(id);
      if (REGISTRY[id].domain === 'components') expect(slot).toBe(id); // the nine are identical
      else expect(slot).toBeNull();
    }
    expect([...SLOTS].sort()).toEqual(ids.filter((id) => slotOf(id) !== null).sort());
    expect(SLOT_OF).toEqual(Object.fromEntries(ids.filter((id) => slotOf(id) !== null).map((id) => [id, id])));
  });

  it('publishes only categories the code supports', () => {
    for (const id of ids) if (REGISTRY[id].visible) expect(REGISTRY[id].enabled).toBe(true);
  });
});
