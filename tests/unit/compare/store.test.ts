import { describe, expect, it } from 'vitest';
import type { CompareRef } from '../../../src/lib/compare/refs';
import {
  addRef, clearGroup, emptyState, MAX_GROUPS, parseStored, readState, removeRef, replaceRef, setActive, STORAGE_KEY, writeState, type CompareState,
} from '../../../src/lib/compare/store';

const ref = (cat: CompareRef['cat'], slug: string, id?: string): CompareRef => ({ cat, slug, ...(id ? { selection: { source: 'skroutz' as const, id } } : {}) });

describe('compare state', () => {
  it('adds up to four per category and says so when full; nothing is evicted', () => {
    let s = emptyState();
    for (const n of ['a', 'b', 'c', 'd']) {
      const r = addRef(s, ref('gpu', n));
      expect(r.result).toBe('added');
      s = r.state;
    }
    const full = addRef(s, ref('gpu', 'e'));
    expect(full.result).toBe('full');
    expect(full.state).toBe(s);
    expect(s.groups.gpu!.map((r) => r.slug)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('rejects a duplicate, but a family and an exact listing of it are different items', () => {
    let s = addRef(emptyState(), ref('gpu', 'a')).state;
    expect(addRef(s, ref('gpu', 'a')).result).toBe('duplicate');
    const exact = addRef(s, ref('gpu', 'a', '1'));
    expect(exact.result).toBe('added');
    s = exact.state;
    expect(addRef(s, ref('gpu', 'a', '1')).result).toBe('duplicate');
  });

  it('keeps one group per category, at most three groups, and the newest one active', () => {
    let s = emptyState();
    for (const cat of ['gpu', 'cpu', 'ram'] as const) s = addRef(s, ref(cat, 'x')).state;
    expect(MAX_GROUPS).toBe(3);
    expect(Object.keys(s.groups)).toEqual(['gpu', 'cpu', 'ram']);
    expect(s.active).toBe('ram');
    const more = addRef(s, ref('psu', 'x'));
    expect(more.result).toBe('groups-full');
    expect(more.state).toBe(s);
    expect(addRef(s, ref('gpu', 'y')).result).toBe('added');
  });

  it('removes an item, drops an empty group and moves the active one', () => {
    let s = addRef(addRef(emptyState(), ref('gpu', 'a')).state, ref('cpu', 'b')).state;
    expect(s.active).toBe('cpu');
    s = removeRef(s, ref('cpu', 'b'));
    expect(s.groups.cpu).toBeUndefined();
    expect(s.active).toBe('gpu');
    s = removeRef(s, ref('gpu', 'a'));
    expect(s).toEqual(emptyState());
    expect(removeRef(s, ref('gpu', 'zzz'))).toBe(s);
  });

  it('clears one group, switches the active group only to one that exists, and replaces in place', () => {
    let s = addRef(addRef(addRef(emptyState(), ref('gpu', 'a')).state, ref('gpu', 'b')).state, ref('cpu', 'c')).state;
    expect(setActive(s, 'ram')).toBe(s);
    expect(setActive(s, 'gpu').active).toBe('gpu');
    s = replaceRef(s, ref('gpu', 'a'), ref('gpu', 'z'));
    expect(s.groups.gpu!.map((r) => r.slug)).toEqual(['z', 'b']);
    expect(replaceRef(s, ref('gpu', 'z'), ref('cpu', 'q'))).toBe(s); // never across categories
    expect(replaceRef(s, ref('gpu', 'z'), ref('gpu', 'b'))).toBe(s); // never onto an existing item
    s = clearGroup(s, 'gpu');
    expect(s.groups.gpu).toBeUndefined();
    expect(s.active).toBe('cpu');
  });
});

describe('compare persistence', () => {
  const good: CompareState = { v: 1, active: 'gpu', groups: { gpu: [ref('gpu', 'a'), ref('gpu', 'b', '7')] } };
  const memory = () => {
    const data = new Map<string, string>();
    return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) } as unknown as Storage & { data: Map<string, string> };
  };

  it('writes and reads back what it wrote', () => {
    const st = memory();
    expect(writeState(st, good)).toBe(true);
    expect(JSON.parse(st.data.get(STORAGE_KEY)!).v).toBe(1);
    expect(readState(st)).toEqual(good);
  });

  it('tolerates corrupt, foreign and future data by starting empty', () => {
    for (const text of ['', '{', 'null', '[]', '"x"', '{"v":2,"active":"gpu","groups":{"gpu":["gpu:a"]}}', '{"v":1}', '{"v":1,"groups":5}']) {
      expect(parseStored(text), text).toEqual(emptyState());
    }
  });

  it('drops invalid, duplicate, misfiled and surplus entries but keeps the valid ones', () => {
    const text = JSON.stringify({
      v: 1, active: 'cpu',
      groups: {
        gpu: ['gpu:a', 'gpu:a', 'cpu:b', 'bad', 5, 'gpu:c', 'gpu:d', 'gpu:e', 'gpu:f'],
        cpu: [], monitor: ['monitor:x'], toString: ['gpu:z'], ram: ['ram:a'], psu: ['psu:a'], fan: ['fan:a'],
      },
    });
    const s = parseStored(text);
    expect(s.groups.gpu!.map((r) => r.slug)).toEqual(['a', 'c', 'd', 'e']);
    expect(Object.keys(s.groups)).toEqual(['gpu', 'ram', 'psu']);
    expect(s.active).toBe('gpu');
  });

  it('survives blocked storage: reads empty, writes report failure', () => {
    const blocked = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } } as unknown as Storage;
    expect(readState(blocked)).toEqual(emptyState());
    expect(writeState(blocked, good)).toBe(false);
    expect(readState(undefined)).toEqual(emptyState());
    expect(writeState(undefined, good)).toBe(false);
  });
});
