// Tests for named saved builds (task 8, answer 12): localStorage `pcBuilds`, the active one mirrored to `pcBuild`.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readBuild, setPart, writeBuild } from '../../src/lib/buildStore';
import { MAX_BUILDS, NOT_STORED_TEXT, duplicateBuild, openBuild, readSavedBuilds, removeBuild, renameBuild, saveBuildAs } from '../../src/lib/savedBuilds';

function stubStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => void (data[k] = v),
    removeItem: (k: string) => void delete data[k],
  });
  return data;
}
const idOf = (r: ReturnType<typeof saveBuildAs>) => {
  if (!r.ok) throw new Error('not saved');
  return r.id;
};

beforeEach(() => void stubStorage());
afterEach(() => vi.unstubAllGlobals());

describe('named builds', () => {
  it('empty or broken storage reads as no builds', () => {
    expect(readSavedBuilds()).toEqual({ v: 1, active: null, builds: {} });
    stubStorage({ pcBuilds: '{bad' });
    expect(readSavedBuilds()).toEqual({ v: 1, active: null, builds: {} });
    stubStorage({ pcBuilds: JSON.stringify({ v: 9, active: 'x', builds: {} }) });
    expect(readSavedBuilds()).toEqual({ v: 1, active: null, builds: {} });
  });
  it('save as stores the current build and makes it active; rename and remove', () => {
    writeBuild({ parts: { cpu: { key: 'a' } }, fanQty: 2 });
    const id = idOf(saveBuildAs('Gaming'));
    const s = readSavedBuilds();
    expect(s.active).toBe(id);
    expect(s.builds[id]).toMatchObject({ name: 'Gaming', build: { parts: { cpu: { key: 'a' } }, fanQty: 2 } });
    expect(typeof s.builds[id].savedAt).toBe('string');
    renameBuild(id, 'Office');
    expect(readSavedBuilds().builds[id].name).toBe('Office');
    removeBuild(id);
    expect(readSavedBuilds()).toEqual({ v: 1, active: null, builds: {} });
    expect(readBuild().parts.cpu?.key).toBe('a'); // the current build stays
  });
  it('the active one follows every change of pcBuild, including a write from pick mode (setPart)', () => {
    const id = idOf(saveBuildAs('A'));
    setPart('gpu', { key: 'g' });
    expect(readSavedBuilds().builds[id].build.parts.gpu?.key).toBe('g');
  });
  it('open writes that build to pcBuild; the other build is left as saved', () => {
    writeBuild({ parts: { cpu: { key: 'a' } } });
    const a = idOf(saveBuildAs('A'));
    const b = idOf(saveBuildAs('B')); // B is active now: the next change goes to B, not A
    writeBuild({ parts: { cpu: { key: 'b' } }, storage2: { key: 's2' } });
    expect(readSavedBuilds().builds[a].build).toEqual({ parts: { cpu: { key: 'a' } } });
    openBuild(a);
    expect(readBuild()).toEqual({ parts: { cpu: { key: 'a' } } });
    expect(readSavedBuilds().active).toBe(a);
    expect(readSavedBuilds().builds[b].build.storage2?.key).toBe('s2');
  });
  it('open and duplicate keep savedAt when the build is unchanged; a real change bumps it', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-11-01T10:00:00Z'));
      writeBuild({ parts: { cpu: { key: 'a' } } });
      const a = idOf(saveBuildAs('A'));
      const b = idOf(saveBuildAs('B'));
      vi.setSystemTime(new Date('2026-11-01T11:00:00Z'));
      openBuild(a);
      expect(readSavedBuilds().builds[a].savedAt).toBe('2026-11-01T10:00:00.000Z');
      const c = idOf(duplicateBuild(b));
      expect(readSavedBuilds().builds[b].savedAt).toBe('2026-11-01T10:00:00.000Z');
      expect(readSavedBuilds().builds[c].savedAt).toBe('2026-11-01T11:00:00.000Z');
      vi.setSystemTime(new Date('2026-11-01T12:00:00Z'));
      setPart('gpu', { key: 'g' });
      expect(readSavedBuilds().builds[c].savedAt).toBe('2026-11-01T12:00:00.000Z');
    } finally {
      vi.useRealTimers();
    }
  });
  it('duplicate makes a copy with its own id and makes it active', () => {
    writeBuild({ parts: { cpu: { key: 'a' } } });
    const a = idOf(saveBuildAs('A'));
    const c = idOf(duplicateBuild(a));
    expect(c).not.toBe(a);
    const s = readSavedBuilds();
    expect(s.active).toBe(c);
    expect(s.builds[c].build).toEqual(s.builds[a].build);
    expect(s.builds[c].name).not.toBe('A');
  });
  it('the 31st build is refused with a message (el + en)', () => {
    expect(MAX_BUILDS).toBe(30);
    for (let i = 0; i < MAX_BUILDS; i++) idOf(saveBuildAs(`B${i}`));
    const r = saveBuildAs('one more');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toEqual({ el: expect.stringMatching(/30/), en: expect.stringMatching(/30/) });
    expect(Object.keys(readSavedBuilds().builds)).toHaveLength(MAX_BUILDS);
  });
  it('storage full: nothing throws, the save is reported as not stored', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
    });
    let r: ReturnType<typeof saveBuildAs> | undefined;
    expect(() => (r = saveBuildAs('A'))).not.toThrow();
    expect(r).toEqual({ ok: false, message: NOT_STORED_TEXT });
    expect(() => setPart('cpu', { key: 'a' })).not.toThrow();
    expect(openBuild('nope')).toBe(false);
    expect(renameBuild('nope', 'x')).toBe(false);
  });
});
