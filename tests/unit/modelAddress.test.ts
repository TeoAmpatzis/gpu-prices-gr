// Model addresses (step 4, task 5): current slug -> entry, aliased old slug -> moved (no request), no entry -> gone.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deriveAliases, MODEL_ALIASES, MODEL_ALIAS_SLUGS, validateAliases, type AliasRecord } from '../../src/data/modelAliases';
import { resolveKey } from '../../src/lib/buildStore';
import { guardMoved, modelChunkOf, modelChunkPath, type ModelResolution } from '../../src/lib/modelData';
import { CATEGORY_LIST } from '../../src/lib/routes';

const BUILT = '2026-10-17T14:00:00.000Z';

async function setup(models: Record<string, unknown>, slug: string) {
  const requests: string[] = [];
  const files: Record<string, unknown> = {
    '/data/manifest.json': { builtAt: BUILT },
    [`/${modelChunkPath('gpu', modelChunkOf(slug))}?v=${BUILT}`]: { models },
  };
  vi.stubGlobal('fetch', async (url: string) => {
    requests.push(url);
    return { ok: url in files, status: url in files ? 200 : 404, json: async () => files[url] };
  });
  vi.resetModules();
  return { md: await import('../../src/lib/modelData'), requests };
}

afterEach(() => vi.unstubAllGlobals());

describe('resolveModel', () => {
  it('a current slug is ok with its entry', async () => {
    const entry = { key: 'RTX 5070 12GB', slug: 'rtx-5070-12gb' };
    const { md } = await setup({ 'rtx-5070-12gb': entry }, 'rtx-5070-12gb');
    expect(await md.resolveModel('gpu', 'rtx-5070-12gb')).toEqual({ kind: 'ok', entry });
  });

  it('an aliased old slug is moved to the new one, with no request', async () => {
    const { md, requests } = await setup({}, 'old-card');
    const r = await md.resolveModel('gpu', 'old-card', { 'old-card': 'new-card' });
    expect(r).toEqual({ kind: 'moved', slug: 'new-card' });
    expect(requests).toEqual([]);
  });

  it('a slug with no entry (delisted, or never a model) is gone', async () => {
    const { md } = await setup({ other: {} }, 'rtx-9999');
    expect(await md.resolveModel('gpu', 'rtx-9999', {})).toEqual({ kind: 'gone' });
  });

  it('an inherited property name is not a model', async () => {
    const { md } = await setup({}, 'constructor');
    expect(await md.resolveModel('gpu', 'constructor', {})).toEqual({ kind: 'gone' });
  });
});

describe('the shipped alias tables', () => {
  it('cover every category and are empty until the backend batches land', () => {
    for (const cat of CATEGORY_LIST) {
      expect(MODEL_ALIASES[cat]).toEqual({});
      expect(MODEL_ALIAS_SLUGS[cat]).toEqual({});
    }
  });
});

const rec = (a: string, b: string): AliasRecord => ({ oldKey: `K${a}`, oldSlug: a, newKey: `K${b}`, newSlug: b });

describe('validateAliases', () => {
  it('collapses chains so each old entry maps straight to its final target', () => {
    const out = validateAliases('gpu', [rec('a', 'b'), rec('b', 'c'), rec('x', 'c')]);
    expect(out.map((r) => [r.oldSlug, r.newSlug, r.newKey])).toEqual([['a', 'c', 'Kc'], ['b', 'c', 'Kc'], ['x', 'c', 'Kc']]);
  });
  it('derives both lookups from the one table', () => {
    const all = { ...Object.fromEntries(CATEGORY_LIST.map((c) => [c, []])), gpu: [rec('a', 'b'), rec('b', 'c')] } as never;
    const d = deriveAliases(all);
    expect(d.slugs.gpu).toEqual({ a: 'c', b: 'c' });
    expect(d.keys.gpu).toEqual({ Ka: 'Kc', Kb: 'Kc' });
  });
  it.each([
    ['an oldKey twice', [rec('a', 'b'), { ...rec('c', 'd'), oldKey: 'Ka' }], /key "Ka" appears twice/],
    ['an oldSlug twice', [rec('a', 'b'), { ...rec('c', 'd'), oldSlug: 'a' }], /slug "a" appears twice/],
    ['a key alias of itself', [{ ...rec('a', 'b'), newKey: 'Ka' }], /key "Ka" is an alias of itself/],
    ['a slug alias of itself', [rec('a', 'a')], /alias of itself/],
    ['a cycle A->B->A', [rec('a', 'b'), rec('b', 'a')], /cycle/],
    ['a longer cycle', [rec('a', 'b'), rec('b', 'c'), rec('c', 'a')], /cycle/],
  ])('rejects %s', (_n, records, msg) => {
    expect(() => validateAliases('gpu', records as AliasRecord[])).toThrow(msg);
  });
});

describe('resolveKey reads own properties only', () => {
  it('"constructor" is not an alias', () => {
    expect(resolveKey('gpu', 'constructor', new Set(['x']), {}).status).toBe('missing');
    expect(resolveKey('gpu', 'old', new Set(['new']), { old: 'new' })).toEqual({ key: 'new', status: 'renamed' });
  });
});

describe('ModelPage loop guard (guardMoved)', () => {
  /** What the page does: resolve, guard, and on `moved` replace the address and resolve again. */
  async function run(table: Record<string, string>, start: string) {
    const { md } = await setup({}, start);
    const visited = new Set<string>();
    let slug = start;
    let replaces = 0;
    for (; replaces < 20; ) {
      const res: ModelResolution = guardMoved(await md.resolveModel('gpu', slug, table), slug, visited);
      if (res.kind !== 'moved') return { res, replaces };
      slug = res.slug;
      replaces++;
    }
    return { res: null, replaces };
  }
  it('A->A ends in gone with no replace', async () => {
    expect(await run({ a: 'a' }, 'a')).toEqual({ res: { kind: 'gone' }, replaces: 0 });
  });
  it('A->B->A ends in gone after one replace', async () => {
    expect(await run({ a: 'b', b: 'a' }, 'a')).toEqual({ res: { kind: 'gone' }, replaces: 1 });
  });
  it('a normal alias still moves once, then the chain is forgotten', async () => {
    const visited = new Set<string>();
    expect(guardMoved({ kind: 'moved', slug: 'b' }, 'a', visited)).toEqual({ kind: 'moved', slug: 'b' });
    expect(guardMoved({ kind: 'gone' }, 'b', visited)).toEqual({ kind: 'gone' });
    expect(visited.size).toBe(0);
  });
});