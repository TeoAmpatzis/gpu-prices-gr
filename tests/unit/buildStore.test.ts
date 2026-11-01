// Tests for the build store: localStorage `pcBuild` with engine fields and the data date (A7, A9 base).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// builderState -> paint.ts registers window listeners when imported; give node a window first.
vi.hoisted(() => {
  (globalThis as { window?: unknown }).window = { addEventListener: () => {}, removeEventListener: () => {} };
});
import { onBuildChange, readBuild, resolveKey, setPart, writeBuild } from '../../src/lib/buildStore';
import { SLOTS } from '../../src/lib/slots';
import { decodeShare } from '../../src/lib/share';
import { clearShareParams, followSavedBuild, writeSaved } from '../../src/lib/builderState';

function stubStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => void (data[k] = v),
    removeItem: (k: string) => void delete data[k],
  });
  return data;
}
const raw = (data: Record<string, string>) => JSON.parse(data.pcBuild ?? '{}') as Record<string, unknown>;
const model = (key: string) => ({ key }) as never;

beforeEach(() => void stubStorage());
afterEach(() => vi.unstubAllGlobals());

describe('readBuild / writeBuild', () => {
  it('reads an old file (keys only)', () => {
    stubStorage({ pcBuild: JSON.stringify({ cpu: 'a', gpu: 'b', use: 'gaming', budget: 900 }) });
    expect(readBuild()).toEqual({ parts: { cpu: { key: 'a' }, gpu: { key: 'b' } }, use: 'gaming', budget: 900 });
  });
  it('round-trips fields and builtAt, keys stay at the top level', () => {
    const data = stubStorage();
    const b = { parts: { cpu: { key: 'a', fields: { socket: 'AM5' }, builtAt: 'T1' }, ram: { key: 'r' } }, budget: 500 };
    writeBuild(b);
    expect(readBuild()).toEqual(b);
    expect(raw(data)).toMatchObject({ cpu: 'a', ram: 'r', budget: 500, compat: { cpu: { fields: { socket: 'AM5' }, builtAt: 'T1' } } });
    expect((raw(data).compat as object) && 'ram' in (raw(data).compat as object)).toBe(false);
  });
  it('keeps keys the data no longer has', () => {
    stubStorage({ pcBuild: JSON.stringify({ cpu: 'gone-model' }) });
    expect(readBuild().parts.cpu?.key).toBe('gone-model');
  });
  it('ignores compat for a slot whose key is missing or malformed', () => {
    stubStorage({ pcBuild: JSON.stringify({ cpu: 'a', compat: { gpu: { fields: {}, builtAt: 'x' }, cpu: 5 } }) });
    expect(readBuild().parts).toEqual({ cpu: { key: 'a' } });
  });
  it('unavailable or broken storage gives an empty build and does not throw', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
    });
    expect(readBuild()).toEqual({ parts: {} });
    expect(() => writeBuild({ parts: { cpu: { key: 'a' } } })).not.toThrow();
    expect(() => setPart('cpu', { key: 'a' })).not.toThrow();
    stubStorage({ pcBuild: '{not json' });
    expect(readBuild()).toEqual({ parts: {} });
  });
});

describe('setPart / onBuildChange', () => {
  it('sets and clears a part and notifies listeners until removed', () => {
    stubStorage({ pcBuild: JSON.stringify({ cpu: 'a', use: 'gaming' }) });
    const fn = vi.fn();
    const off = onBuildChange(fn);
    setPart('gpu', { key: 'g', builtAt: 'T' });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('tab');
    expect(readBuild()).toEqual({ parts: { cpu: { key: 'a' }, gpu: { key: 'g', builtAt: 'T' } }, use: 'gaming' });
    setPart('cpu', null);
    expect(readBuild().parts.cpu).toBeUndefined();
    expect(fn).toHaveBeenCalledTimes(2);
    off();
    setPart('cpu', { key: 'b' });
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it('listens to the window storage event when a window exists and removes it', () => {
    const add = vi.fn();
    const remove = vi.fn();
    vi.stubGlobal('window', { addEventListener: add, removeEventListener: remove });
    const fn = vi.fn();
    const off = onBuildChange(fn);
    expect(add).toHaveBeenCalledWith('storage', expect.any(Function));
    const handler = add.mock.calls[0][1] as (e: { key: string | null }) => void;
    handler({ key: 'other' });
    expect(fn).not.toHaveBeenCalled();
    handler({ key: 'pcBuild' });
    handler({ key: null }); // storage.clear()
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn.mock.calls).toEqual([['other-tab'], ['other-tab']]);
    off();
    expect(remove).toHaveBeenCalledWith('storage', handler);
  });
});

describe('builderState.writeSaved keeps compat', () => {
  it('keeps fields for unchanged slots and drops them for changed or removed ones', () => {
    const data = stubStorage();
    writeBuild({
      parts: {
        cpu: { key: 'a', fields: { x: 1 }, builtAt: 'T' },
        gpu: { key: 'g', fields: { y: 2 }, builtAt: 'T' },
        ram: { key: 'r', fields: { z: 3 }, builtAt: 'T' },
      },
    });
    writeSaved({ cpu: model('a'), gpu: model('g2') }, { use: 'gaming', budget: null });
    expect(readBuild()).toEqual({
      parts: { cpu: { key: 'a', fields: { x: 1 }, builtAt: 'T' }, gpu: { key: 'g2' } },
      use: 'gaming',
    });
    expect(Object.keys(raw(data).compat as object)).toEqual(['cpu']);
  });
  it('writes the same file shape as before when there is no compat', () => {
    const data = stubStorage();
    writeSaved({ cpu: model('a') }, { use: null, budget: 700 });
    expect(raw(data)).toEqual({ cpu: 'a', budget: 700 });
  });
});

describe('resolveKey', () => {
  const known = new Set(['new-key', 'same']);
  it('ok when the data has the key', () => expect(resolveKey('cpu', 'same', known)).toEqual({ key: 'same', status: 'ok' }));
  it('renamed through the alias list', () =>
    expect(resolveKey('cpu', 'old', known, { old: 'new-key' })).toEqual({ key: 'new-key', status: 'renamed' }));
  it('missing when no alias, or the alias points nowhere', () => {
    expect(resolveKey('cpu', 'old', known)).toEqual({ key: 'old', status: 'missing' });
    expect(resolveKey('cpu', 'old', known, { old: 'also-gone' })).toEqual({ key: 'old', status: 'missing' });
  });
  it('a slot fallback is asked only for an unknown key with no alias', () => {
    const fb = (_s: unknown, k: string) => (k === 'chip|?' ? 'same' : null);
    expect(resolveKey('cpu', 'chip|?', known, undefined, fb)).toEqual({ key: 'same', status: 'renamed' });
    expect(resolveKey('cpu', 'other|?', known, undefined, fb)).toEqual({ key: 'other|?', status: 'missing' });
    expect(resolveKey('cpu', 'same', known, undefined, () => 'new-key')).toEqual({ key: 'same', status: 'ok' });
  });
});

describe('builderState.followSavedBuild (the open builder and outside changes)', () => {
  const base = { ownWrite: false, changed: true, shared: false, source: 'tab' as const };
  it('follows a part added in this tab (a pick page); over a shared link it makes the build the user\'s own', () => {
    expect(followSavedBuild(base)).toBe('follow');
    expect(followSavedBuild({ ...base, shared: true })).toBe('own');
  });
  it('follows another tab, except while a shared link is on screen (kept until the user edits it)', () => {
    expect(followSavedBuild({ ...base, source: 'other-tab' })).toBe('follow');
    expect(followSavedBuild({ ...base, source: 'other-tab', shared: true })).toBe('ignore');
  });
  it('ignores its own saves and changes of compat fields only', () => {
    expect(followSavedBuild({ ...base, ownWrite: true })).toBe('ignore');
    expect(followSavedBuild({ ...base, changed: false })).toBe('ignore');
    expect(followSavedBuild({ ...base, changed: false, source: 'other-tab', shared: true })).toBe('ignore');
  });
  it('"own" clears the share parameters from the builder address (the same path as editing a shared build)', () => {
    let url = '/builder?mode=quick&cpu=Ryzen+7+7700%7Ctrue&mobo=b&use=gaming&budget=900';
    const loc = () => new URL(url, 'http://x');
    vi.stubGlobal('location', {
      get pathname() { return loc().pathname; },
      get search() { return loc().search; },
    });
    vi.stubGlobal('history', { state: null, replaceState: (_s: unknown, _t: string, next: string) => void (url = next) });
    expect(followSavedBuild({ ...base, shared: true })).toBe('own');
    clearShareParams();
    expect(url).toBe('/builder?mode=quick');
  });
});
describe('build store v2 (task 8): second drive, fan quantity, chosen shops, resolution', () => {
  const full = {
    parts: { cpu: { key: 'c', fields: { socket: 'AM5' }, builtAt: 'T' }, storage: { key: 's1' }, fan: { key: 'f' } },
    storage2: { key: 's2', fields: { iface: 'SATA' }, builtAt: 'T' },
    fanQty: 3,
    offers: { cpu: 'skroutz:1', storage2: 'bestprice:2' },
    use: 'gaming' as const,
    res: '1440p' as const,
    budget: 1200,
  };
  it('round-trips every field', () => {
    const data = stubStorage();
    writeBuild(full);
    expect(readBuild()).toEqual(full);
    expect(raw(data)).toMatchObject({ storage2: 's2', fanQty: 3, res: '1440p', compat: { storage2: { fields: { iface: 'SATA' } } } });
  });
  it('setPart keeps storage2, fanQty and the other lines\' shops; the changed line drops its old shop', () => {
    stubStorage();
    writeBuild(full);
    setPart('cpu', { key: 'c2' });
    const b = readBuild();
    expect(b.storage2).toEqual(full.storage2);
    expect(b.fanQty).toBe(3);
    expect(b.offers).toEqual({ storage2: 'bestprice:2' });
    expect(b.res).toBe('1440p');
  });
  it('unknown keys of the file round-trip; bad values are dropped', () => {
    const data = stubStorage({ pcBuild: JSON.stringify({ cpu: 'a', future: { x: 1 }, fanQty: 40, use: 'mining', res: '8k', offers: { cpu: 5, ram: 'r:1', nope: 'x' } }) });
    expect(readBuild()).toEqual({ parts: { cpu: { key: 'a' } }, offers: { ram: 'r:1' } });
    setPart('gpu', { key: 'g' });
    expect(raw(data)).toMatchObject({ cpu: 'a', gpu: 'g', future: { x: 1 } });
  });
  it('storage full: writes and setPart do not throw', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => { throw new DOMException('full', 'QuotaExceededError'); },
    });
    // The open builder keeps the build in memory: listeners are still told, nothing throws.
    const fn = vi.fn();
    const off = onBuildChange(fn);
    expect(() => writeBuild(full)).not.toThrow();
    expect(() => setPart('cpu', { key: 'a' })).not.toThrow();
    expect(() => writeSaved({ cpu: model('a') }, { use: null, budget: null })).not.toThrow();
    expect(fn).toHaveBeenCalledTimes(3);
    off();
  });
  it('builderState.writeSaved keeps the second drive, fan quantity, shops and resolution', () => {
    stubStorage();
    writeBuild(full);
    writeSaved({ cpu: model('c'), storage: model('s1'), fan: model('f') }, { use: null, budget: 900 });
    const b = readBuild();
    expect(b).toMatchObject({ storage2: full.storage2, fanQty: 3, offers: full.offers, res: '1440p', budget: 900 });
    expect(b.use).toBeUndefined();
  });
  it('a share link never overwrites the saved build until the user changes something; the first edit saves the link build', () => {
    const data = stubStorage({ pcBuild: JSON.stringify({ cpu: 'mine', gpu: 'my-gpu', budget: 700 }) });
    const before = data.pcBuild;
    // The builder opens /builder?v=2&… : the link is decoded and shown, the saved build is not touched.
    const link = decodeShare(new URLSearchParams('v=2&cpu=theirs&n.cpu=Their+CPU&storage2=x&fanQty=2&o.cpu=s%3A1&use=gaming&res=4k'))!;
    expect(data.pcBuild).toBe(before);
    expect(followSavedBuild({ ownWrite: false, changed: true, shared: true, source: 'other-tab' })).toBe('ignore');
    // One edit (a GPU picked) writes the link's build, with its second drive, fans, shop and resolution.
    writeSaved({ cpu: model('theirs'), gpu: model('g') }, { use: 'gaming', budget: null }, link.build);
    expect(readBuild()).toEqual({
      parts: { cpu: { key: 'theirs' }, gpu: { key: 'g' } },
      storage2: { key: 'x' },
      fanQty: 2,
      offers: { cpu: 's:1' },
      use: 'gaming',
      res: '4k',
    });
  });
  it('clearShareParams removes v2 link parameters (names, shops, second drive) and keeps the rest', () => {
    let url = '/builder?mode=quick&v=2&cpu=a&n.cpu=A&o.cpu=s%3A1&storage2=x&fanQty=2&res=4k&use=gaming&budget=9';
    vi.stubGlobal('location', {
      get pathname() { return new URL(url, 'http://x').pathname; },
      get search() { return new URL(url, 'http://x').search; },
    });
    vi.stubGlobal('history', { state: null, replaceState: (_s: unknown, _t: string, next: string) => void (url = next) });
    clearShareParams();
    expect(url).toBe('/builder?mode=quick');
  });
  it('the slots run case, psu, fan (one order everywhere, finding #28)', () => {
    expect(SLOTS.slice(-3)).toEqual(['case', 'psu', 'fan']);
  });
});
