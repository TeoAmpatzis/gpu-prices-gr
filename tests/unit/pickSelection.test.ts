import { expect, it, vi } from 'vitest';
vi.hoisted(() => { (globalThis as { window?: unknown }).window = { addEventListener: () => {}, removeEventListener: () => {} }; });
import { pickCandidates } from '../../src/lib/usePick';
import type { CategoryData } from '../../src/lib/data';

it('checks each exact source listing independently while retaining the canonical stored part key', () => {
  const listings = [
    { id: 'same', source: 'skroutz', chip: 'Board', title: 'Board', socket: 'AM5', memory: 'DDR5', formFactor: 'ATX', price: 80 },
    { id: 'same', source: 'bestprice', chip: 'Board', title: 'Board', socket: 'AM4', memory: 'DDR4', formFactor: 'ATX', price: 90 },
  ];
  const c = pickCandidates('mobo', { latest: { listings } } as unknown as CategoryData);
  expect([...c.parts.keys()]).toEqual(['bd1:skroutz:same', 'bd1:bestprice:same']);
  expect(c.parts.get('bd1:bestprice:same')?.fields).toMatchObject({ socket: 'AM4', memory: 'DDR4' });
  expect([...c.canonicalKeys.values()]).toEqual(['board', 'board']);
});
