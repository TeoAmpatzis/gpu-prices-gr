// Step 5 task 11: which screen a builder address opens, the screens' addresses, the build's total (fans × quantity,
// second drive), the second drive / fan quantity / resolution written by the builder, and the placeholder fill.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// builderState -> paint.ts registers window listeners when imported; give node a window first.
vi.hoisted(() => {
  (globalThis as { window?: unknown }).window = { addEventListener: () => {}, removeEventListener: () => {} };
});
import { firstView, viewParams } from '../../src/lib/builderView';
import { readBuild, writeBuild } from '../../src/lib/buildStore';
import { writeSaved } from '../../src/lib/builderState';
import { fill } from '../../src/ui/builderStrings';

const q = (s: string) => new URLSearchParams(s);
const m = (key: string, price = 0) => ({ key, cheapest: { price } }) as never;

beforeEach(() => {
  const data: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => void (data[k] = v),
    removeItem: (k: string) => void delete data[k],
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('firstView', () => {
  it('an empty build opens the start screen, a saved one its part list', () => {
    expect(firstView(q(''), false)).toBe('start');
    expect(firstView(q(''), true)).toBe('quick');
  });
  it('the address decides: mode=quick, step=use, another step, a shared build', () => {
    expect(firstView(q('mode=quick'), false)).toBe('quick');
    expect(firstView(q('step=use'), true)).toBe('start');
    expect(firstView(q('step=case'), false)).toBe('guided');
    expect(firstView(q('cpu=a&use=gaming'), false)).toBe('guided');
    // use / budget alone are not a shared build.
    expect(firstView(q('use=gaming&budget=900'), false)).toBe('start');
  });
});

describe('viewParams', () => {
  it('writes one screen parameter and keeps the rest', () => {
    const p = q('mode=quick&cpu=a');
    viewParams(p, 'guided', 'cpu');
    expect(p.toString()).toBe('cpu=a&step=cpu');
    viewParams(p, 'start');
    expect(p.toString()).toBe('cpu=a&step=use');
    viewParams(p, 'quick');
    expect(p.toString()).toBe('cpu=a&mode=quick');
  });
});

describe('writeSaved: second drive, fan quantity, resolution', () => {
  it('writes them when given and keeps them when not', () => {
    writeBuild({ parts: { storage: { key: 's1' } }, storage2: { key: 'old' }, fanQty: 2, res: '1440p', offers: { storage2: 'x:1' } });
    writeSaved({ storage: m('s1') }, { use: 'gaming', budget: null });
    expect(readBuild()).toMatchObject({ storage2: { key: 'old' }, fanQty: 2, res: '1440p', offers: { storage2: 'x:1' } });
    writeSaved({ storage: m('s1') }, { use: 'gaming', budget: null, res: '4k' }, undefined, { storage2: m('new'), fanQty: 5 });
    const b = readBuild();
    expect(b).toMatchObject({ storage2: { key: 'new' }, fanQty: 5, res: '4k' });
    expect(b.offers?.storage2).toBeUndefined();
    writeSaved({ storage: m('s1') }, { use: 'everyday', budget: null, res: null }, undefined, { storage2: null });
    expect(readBuild().storage2).toBeUndefined();
    expect(readBuild().res).toBeUndefined();
  });
});

describe('fill', () => {
  it('replaces known placeholders and leaves unknown ones', () => {
    expect(fill('Βήμα {n}/{total} {x}', { n: 2, total: 9 })).toBe('Βήμα 2/9 {x}');
  });
});
