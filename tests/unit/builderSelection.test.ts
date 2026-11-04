import { expect, it, vi } from 'vitest';
vi.hoisted(() => {
  (globalThis as { window?: unknown }).window = { addEventListener: () => {}, removeEventListener: () => {} };
});
import { stepCandidates, type AnyModel } from '../../src/lib/builderState';
import { resolveLine } from '../../src/lib/builderOffers';
import { slotModels } from '../../src/lib/builderData';
import type { MoboListing } from '../../src/types';
import { checkAll } from '../../src/lib/pickCheck';

const row = { id: 'base', source: 'skroutz', title: 'AM5 board', url: '', price: 99, chip: 'Board', brand: 'ASUS', socket: 'AM5', memory: 'DDR5', formFactor: 'ATX', chipset: 'B650', shopCount: 1, scrapedAt: '', ramSlots: 4 } as MoboListing;
const exact = { ...row, id: 'exact', title: 'AM4 board', socket: 'AM4', memory: 'DDR4', chipset: 'B550', price: 149 } as MoboListing;
const family = slotModels('mobo', [row])[0] as AnyModel;

it('checks the selected exact row instead of the canonical sibling, including excluded families', () => {
  const resolved = resolveLine('mobo', family, 1, 'exact', [row, exact]);
  for (const catalogue of [[family], []]) {
    const [selected] = stepCandidates('mobo', catalogue, resolved);
    expect(selected.model.cheapest).toMatchObject({ socket: 'AM4', memory: 'DDR4', price: 149 });
    expect(selected.part.fields).toMatchObject({ socket: 'AM4', memory: 'DDR4' });
    const verdict = checkAll([{ category: 'cpu', key: 'cpu', name: 'AM5 CPU', quantity: 1, fields: { socket: 'AM5' } }], 'mobo', [selected.part], {}).get(family.key);
    expect(verdict?.hide).toBe(true);
  }
});

it('keeps an unresolved selection visible but unchecked without sibling fields', () => {
  const resolved = resolveLine('mobo', family, 1, 'gone', []);
  const [selected] = stepCandidates('mobo', [], resolved);
  expect(selected.model.key).toBe(family.key);
  expect(selected.part.fields).toEqual({});
  const verdict = checkAll([{ category: 'cpu', key: 'cpu', name: 'AM5 CPU', quantity: 1, fields: { socket: 'AM5' } }], 'mobo', [selected.part], {}).get(family.key);
  expect(verdict?.hide).toBe(false);
  expect(verdict?.findings.some((f) => f.status === 'unknown')).toBe(true);
});
