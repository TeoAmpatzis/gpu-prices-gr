// Renamed model keys from main's alias file (step 5, task 1): the build step, the lazy loader, and the three places
// that use the lookups (saved builds, share links, product-page addresses).
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { aliasFile, deriveAliases, type AliasSource, type SlugOf } from '../../src/data/modelAliases';
import { aliasOf, fallbackFor, fallbackKeys, resolveKey } from '../../src/lib/buildStore';
import { fetchOutcomes, outcomeOf } from '../../src/lib/pickBuild';
import { CATEGORY_LIST } from '../../src/lib/routes';
import { nameSlug } from '../../src/lib/slug';
import type { Category } from '../../src/types';
import { aliasesJson } from '../../vite-plugin-data';

const BUILT = '2026-10-25T10:00:00.000Z';
const mainsFile = JSON.parse(readFileSync('scraper/model_aliases.json', 'utf8')) as AliasSource;
const slugOf: SlugOf = (_cat, key) => nameSlug(key);

afterEach(() => vi.unstubAllGlobals());

describe("main's scraper/model_aliases.json", () => {
  const file = aliasFile(mainsFile, BUILT, slugOf);
  const count = Object.values(mainsFile).reduce((n, o) => n + Object.keys(o ?? {}).length, 0);

  it('becomes validated records for every category', () => {
    expect(Object.keys(file.cats).sort()).toEqual([...CATEGORY_LIST].sort());
    expect(Object.values(file.cats).reduce((n, r) => n + r.length, 0)).toBe(count);
    expect(count).toBeGreaterThan(0);
  });

  // The RAM keys main's 28 aliases point at, frozen (the live data changes with every scrape, and main may alias to a
  // key that does not exist yet).
  const frozen = new Set(JSON.parse(readFileSync('tests/fixtures/ram-alias-targets.json', 'utf8')) as string[]);

  it('every old key resolves to a key that is no longer an alias, and (frozen RAM keys) to a current key', () => {
    let resolved = 0;
    for (const cat of CATEGORY_LIST) {
      const olds = new Set(file.cats[cat].map((r) => r.oldKey));
      for (const r of file.cats[cat]) {
        expect(olds.has(r.newKey), `${cat} ${r.oldKey}`).toBe(false);
        if (cat === 'ram' && frozen.has(r.newKey)) {
          expect(resolveKey('ram', r.oldKey, frozen, Object.fromEntries(file.cats.ram.map((x) => [x.oldKey, x.newKey])))).toEqual({
            key: r.newKey,
            status: 'renamed',
          });
          resolved++;
        }
      }
    }
    expect(resolved).toBeGreaterThan(0);
  });
});

describe('aliasFile (the build step)', () => {
  it('fails the build on a cycle, a duplicate slug and an alias to itself', () => {
    expect(() => aliasFile({ case: { aa: 'bb', bb: 'aa' } }, BUILT, slugOf)).toThrow(/cycle/);
    expect(() => aliasFile({ case: { aa: 'aa' } }, BUILT, slugOf)).toThrow(/itself/);
    expect(() => aliasFile({ case: { 'A-A': 'x', 'a a': 'y' } }, BUILT, slugOf)).toThrow(/appears twice/);
    expect(() => aliasFile({ case: { aa: 3 as unknown as string } }, BUILT, slugOf)).toThrow(/not a key/);
  });
  it('a rename that keeps the slug (case or punctuation only) keeps the key record and has no slug redirect', () => {
    const f = aliasFile({ cpu: { 'Core i5 14600KF': 'Core i5-14600KF' } }, BUILT, slugOf);
    expect(f.cats.cpu).toEqual([
      { oldKey: 'Core i5 14600KF', oldSlug: 'core-i5-14600kf', newKey: 'Core i5-14600KF', newSlug: 'core-i5-14600kf' },
    ]);
    const d = deriveAliases(f.cats);
    expect(d.keys.cpu).toEqual({ 'Core i5 14600KF': 'Core i5-14600KF' });
    expect(d.slugs.cpu).toEqual({});
  });
  it('warns, without failing, about a category that is not one of ours', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const f = aliasFile({ coolers: { a: 'b' } } as unknown as AliasSource, BUILT, slugOf);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('coolers');
    expect(Object.keys(f.cats).sort()).toEqual([...CATEGORY_LIST].sort());
    warn.mockRestore();
  });
  it('collapses chains and treats a missing category as none', () => {
    const f = aliasFile({ fan: { a: 'b', b: 'c' } }, BUILT, slugOf);
    expect(f.cats.fan.map((r) => [r.oldKey, r.newKey, r.newSlug])).toEqual([
      ['a', 'c', 'c'],
      ['b', 'c', 'c'],
    ]);
    expect(f.cats.gpu).toEqual([]);
    expect(f.v).toBe(1);
  });
  it("aliases.json gives a current model's own slug as the new address (a case key has no hyphens)", () => {
    const models = { cooler: [{ models: { newcooler: { key: 'newcooler', slug: 'new-cooler' } } }] } as never;
    const out = JSON.parse(
      aliasesJson(models, BUILT, { cooler: { oldcooler: 'newcooler' }, ram: { 'DDR4 8GB (1×8GB) Desktop': 'DDR4 8GB (1×8GB) 3200MHz Desktop' } }),
    );
    expect(out.cats.cooler).toEqual([{ oldKey: 'oldcooler', oldSlug: 'oldcooler', newKey: 'newcooler', newSlug: 'new-cooler' }]);
    expect(out.cats.ram[0].oldSlug).toBe('ddr4-8gb-1x8gb-desktop');
    expect(out.builtAt).toBe(BUILT);
  });
});

describe('loadAliases (the lazy loader)', () => {
  it("fetches the build's file once, derives both lookups, and retries after a failure", async () => {
    const file = aliasFile({ cooler: { oldcooler: 'newcooler' } }, BUILT, (_c, k, w) => (w === 'new' ? 'new-cooler' : k));
    const urls: string[] = [];
    let fail = true;
    vi.stubGlobal('fetch', async (url: string) => {
      urls.push(url);
      return { ok: !fail, status: fail ? 503 : 200, json: async () => file };
    });
    vi.resetModules();
    const { loadAliases } = await import('../../src/lib/aliases');
    await expect(loadAliases(BUILT)).rejects.toThrow(/503/);
    fail = false;
    const a = await loadAliases(BUILT);
    expect(a.keys.cooler).toEqual({ oldcooler: 'newcooler' });
    expect(a.slugs.cooler).toEqual({ oldcooler: 'new-cooler' });
    await loadAliases(BUILT);
    expect(urls).toEqual([`/data/aliases.json?v=${BUILT}`, `/data/aliases.json?v=${BUILT}`]);
  });
});

describe('resolveKey fallbacks', () => {
  it('a CPU saved as chip|? becomes chip|true when only that exists, else chip|false', () => {
    const f = (known: string[]) => resolveKey('cpu', 'Ryzen 5 7600|?', new Set(known), undefined, fallbackFor(new Set(known)));
    expect(f(['Ryzen 5 7600|true'])).toEqual({ key: 'Ryzen 5 7600|true', status: 'renamed' });
    expect(f(['Ryzen 5 7600|false'])).toEqual({ key: 'Ryzen 5 7600|false', status: 'renamed' });
    expect(f(['Ryzen 5 7600|true', 'Ryzen 5 7600|false']).key).toBe('Ryzen 5 7600|true');
    expect(f(['Ryzen 7 7700|true'])).toEqual({ key: 'Ryzen 5 7600|?', status: 'missing' });
  });
  it('an unknown key with no alias and no fallback is missing; a known key never asks the fallback', () => {
    const never = vi.fn(() => 'x');
    expect(resolveKey('case', 'gone', new Set(['x']), {}, () => null).status).toBe('missing');
    expect(resolveKey('case', 'here', new Set(['here']), {}, never).status).toBe('ok');
    expect(never).not.toHaveBeenCalled();
  });
  it('an alias that points nowhere is not rescued by the fallback', () => {
    expect(resolveKey('cpu', 'c|?', new Set(['c|true']), { 'c|?': 'also-gone' }, fallbackFor(new Set(['c|true'])))).toEqual({
      key: 'c|?',
      status: 'missing',
    });
  });
  it('a CPU alias keyed by chip (main) renames chip|suffix and keeps the suffix', () => {
    const table = { 'Core i5-14600KF': 'Core i5-14600K2' };
    const known = new Set(['Core i5-14600K2|true']);
    expect(aliasOf('cpu', table, 'Core i5-14600KF|true')).toBe('Core i5-14600K2|true');
    expect(aliasOf('cooler', table, 'Core i5-14600KF|true')).toBeUndefined();
    expect(resolveKey('cpu', 'Core i5-14600KF|true', known, table, fallbackFor(known))).toEqual({
      key: 'Core i5-14600K2|true',
      status: 'renamed',
    });
    // an old `|?` key under a renamed chip still finds the new chip's real row
    expect(resolveKey('cpu', 'Core i5-14600KF|?', known, table, fallbackFor(known)).key).toBe('Core i5-14600K2|true');
  });
  it('fallbackKeys is only for a CPU key with an unknown cooler', () => {
    expect(fallbackKeys('cpu', 'Ryzen 5 7600|?')).toEqual(['Ryzen 5 7600|true', 'Ryzen 5 7600|false']);
    expect(fallbackKeys('cpu', 'Ryzen 5 7600|true')).toEqual([]);
    expect(fallbackKeys('case', 'a|?')).toEqual([]);
  });
});

describe('saved builds follow renames (pickBuild)', () => {
  const rowsOf = (...keys: string[]) => Object.fromEntries(keys.map((k) => [k, { fields: { k } }]));
  const aliasesOf = (keys: Partial<Record<Category, Record<string, string>>>) => async () => ({ keys, slugs: {} }) as never;

  it('outcomeOf renames through the table or the fallback among the rows', () => {
    expect(outcomeOf('cooler', 'old', rowsOf('new'), { old: 'new' })).toEqual({ key: 'new', fields: { k: 'new' } });
    expect(outcomeOf('cpu', 'c|?', rowsOf('c|false'))).toEqual({ key: 'c|false', fields: { k: 'c|false' } });
    expect(outcomeOf('cooler', 'old', rowsOf('other'))).toBe('missing');
  });

  it('a renamed cooler key (other chunk) is loaded under its new key; the alias file is fetched only for an unknown key', async () => {
    const asked: string[][] = [];
    const load = async (_s: string, keys: string[]) => {
      asked.push(keys);
      return rowsOf(...keys.filter((k) => k === 'newcooler' || k === 'cur'));
    };
    const aliases = vi.fn(aliasesOf({ cooler: { oldcooler: 'newcooler' } }));
    const got = await fetchOutcomes(
      [
        { slot: 'cooler', key: 'cur' },
        { slot: 'cooler', key: 'oldcooler' },
        { slot: 'cooler', key: 'nowhere' },
      ],
      BUILT,
      load as never,
      aliases,
    );
    expect(got[`${BUILT}\ncooler\ncur`]).toEqual({ key: 'cur', fields: { k: 'cur' } });
    expect(got[`${BUILT}\ncooler\noldcooler`]).toEqual({ key: 'newcooler', fields: { k: 'newcooler' } });
    expect(got[`${BUILT}\ncooler\nnowhere`]).toBe('missing');
    expect(aliases).toHaveBeenCalledTimes(2); // the two unknown keys, not 'cur'
    expect(asked).toContainEqual(['newcooler']);
  });

  it('a renamed CPU chip (alias keyed by chip) is loaded under its new key', async () => {
    const load = async (_s: string, keys: string[]) => rowsOf(...keys.filter((k) => k === 'New Chip|false'));
    const got = await fetchOutcomes([{ slot: 'cpu', key: 'Old Chip|false' }], BUILT, load as never, aliasesOf({ cpu: { 'Old Chip': 'New Chip' } }));
    expect(got[`${BUILT}\ncpu\nOld Chip|false`]).toEqual({ key: 'New Chip|false', fields: { k: 'New Chip|false' } });
  });

  it('a CPU saved as chip|? finds chip|true / chip|false even when the alias file is unreachable', async () => {
    const load = async (_s: string, keys: string[]) => rowsOf(...keys.filter((k) => k === 'Ryzen 5 7600|true'));
    const got = await fetchOutcomes([{ slot: 'cpu', key: 'Ryzen 5 7600|?' }], BUILT, load as never, async () => {
      throw new Error('offline');
    });
    expect(got[`${BUILT}\ncpu\nRyzen 5 7600|?`]).toEqual({ key: 'Ryzen 5 7600|true', fields: { k: 'Ryzen 5 7600|true' } });
  });

  it('an unreachable alias file leaves the unknown key missing, and a failing chunk stays failed', async () => {
    const offline = async () => {
      throw new Error('offline');
    };
    const got = await fetchOutcomes([{ slot: 'case', key: 'gone' }], BUILT, (async () => ({})) as never, offline);
    expect(got[`${BUILT}\ncase\ngone`]).toBe('missing');
    const failing = (async () => {
      throw new Error('503');
    }) as never;
    const failed = await fetchOutcomes([{ slot: 'case', key: 'gone' }], BUILT, failing, offline);
    expect(failed[`${BUILT}\ncase\ngone`]).toBe('failed');
  });
});

describe('product-page addresses follow renames (modelData.resolveModel)', () => {
  it('an unknown address is moved to the new one by the alias file, loaded only then; a current one never loads it', async () => {
    const requests: string[] = [];
    const entry = { key: 'newcooler', slug: 'new-cooler' };
    vi.stubGlobal('fetch', async (url: string) => {
      requests.push(url);
      const body = url.startsWith('/data/manifest.json')
        ? { builtAt: BUILT }
        : url.startsWith('/data/aliases.json')
          ? aliasFile({ cooler: { oldcooler: 'newcooler' } }, BUILT, (_c, k, w) => (w === 'new' ? 'new-cooler' : k))
          : { builtAt: BUILT, models: { newcooler: entry }, sources: {} };
      return { ok: true, status: 200, json: async () => body };
    });
    vi.resetModules();
    const md = await import('../../src/lib/modelData');
    expect(await md.resolveModel('cooler', 'new-cooler')).toMatchObject({ kind: 'ok' });
    expect(requests.some((u) => u.startsWith('/data/aliases.json'))).toBe(false);
    // The old address, in a spelling the old name may have had as a slug (hyphenated or not).
    expect(await md.resolveModel('cooler', 'old-cooler')).toEqual({ kind: 'moved', slug: 'new-cooler' });
    expect(requests.filter((u) => u.startsWith('/data/aliases.json'))).toEqual([`/data/aliases.json?v=${BUILT}`]);
    expect(await md.resolveModel('cooler', 'never-existed')).toEqual({ kind: 'gone' });
  });
});
