// Tests for share links v2 (task 8): /builder?v=2&cpu=…&n.cpu=…, old links decode as version 1.
import { describe, expect, it } from 'vitest';
import { decodeShare, encodeShare, goneParts } from '../../src/lib/share';
import { legacyTarget } from '../../src/lib/routes';
import type { StoredBuild } from '../../src/lib/buildStore';

const params = (path: string) => new URLSearchParams(path.slice(path.indexOf('?') + 1));

describe('encodeShare / decodeShare', () => {
  const build: StoredBuild = {
    parts: { cpu: { key: 'Ryzen 7 7700|true' }, gpu: { key: 'skroutz:123' }, storage: { key: 's1' }, fan: { key: 'f' } },
    storage2: { key: 's2' },
    fanQty: 3,
    offers: { cpu: 'bestprice:9', storage2: 'shopflix:4' },
    use: 'gaming',
    res: '4k',
    budget: 2500,
  };
  const names = { cpu: 'AMD Ryzen 7 7700', gpu: 'Palit RTX 5070 & Co', storage2: 'WD Blue 1TB' };

  it('round-trips every field and the names; engine fields stay out of the link', () => {
    const withFields: StoredBuild = {
      ...build,
      parts: { ...build.parts, cpu: { key: 'Ryzen 7 7700|true', fields: { socket: 'AM5' }, builtAt: 'T' } },
    };
    const link = encodeShare(withFields, names);
    expect(link.startsWith('/builder?v=2&')).toBe(true);
    expect(link).not.toContain('AM5');
    expect(decodeShare(params(link))).toEqual({ build, names, version: 2 });
  });
  it('null without any part', () => {
    expect(decodeShare(new URLSearchParams('mode=quick&use=gaming'))).toBeNull();
  });
  it('a v1 link (/#builder?…) decodes as version 1; its "gaming" opens as 1080p (question 6)', () => {
    const target = legacyTarget('/', '#builder?cpu=Ryzen+5+5600&gpu=skroutz%3A1&use=gaming&budget=900');
    expect(decodeShare(params(target!))).toEqual({
      build: { parts: { cpu: { key: 'Ryzen 5 5600' }, gpu: { key: 'skroutz:1' } }, use: 'gaming', res: '1080p', budget: 900 },
      names: {},
      version: 1,
    });
  });
  it('a v2 address without v=2 decodes as version 1; bad values are dropped', () => {
    expect(decodeShare(new URLSearchParams('cpu=a&use=mining&budget=-5&fanQty=99&res=8k'))).toEqual({
      build: { parts: { cpu: { key: 'a' } } },
      names: {},
      version: 1,
    });
  });
});

describe('goneParts (finding #22: a part the data no longer has is named, never dropped silently)', () => {
  const isGone = (slot: string, key: string) => slot === 'gpu' && key === 'skroutz:old';
  it('a v1 link with a gone GPU listing names it by slot and key', () => {
    const d = decodeShare(params('/builder?cpu=a&gpu=skroutz%3Aold'))!;
    expect(goneParts(d.build, d.names, isGone)).toEqual([{ slot: 'gpu', key: 'skroutz:old' }]);
  });
  it('a v2 link names it from n.<slot>; the second drive is checked against the storage step', () => {
    const d = decodeShare(params(encodeShare({ parts: { gpu: { key: 'skroutz:old' } }, storage2: { key: 'x' } }, { gpu: 'Old card' })))!;
    expect(goneParts(d.build, d.names, (s, k) => isGone(s, k) || (s === 'storage' && k === 'x'))).toEqual([
      { slot: 'gpu', key: 'skroutz:old', name: 'Old card' },
      { slot: 'storage2', key: 'x' },
    ]);
  });
});
