// Tests for the build store: localStorage `pcBuild` with engine fields and the data date (A7, A9 base).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// builderState -> paint.ts registers window listeners when imported; give node a window first.
vi.hoisted(() => {
  (globalThis as { window?: unknown }).window = { addEventListener: () => {}, removeEventListener: () => {} };
});
import { onBuildChange, readBuild, resolveKey, setPart, writeBuild } from '../../src/lib/buildStore';
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