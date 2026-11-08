import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromColumns } from '../../src/lib/columns';
import { builderFiles } from '../../src/lib/derive';
import { SLOTS, slotModels, usable as builderUsable, type Slot } from '../../src/lib/builderData';
import { PART_FIELDS, SLOT_OF, slotOf, toPart, usable } from '../../src/lib/pick';
import { VALIDATION_MODE, validateLatest } from '../../src/data/validate';
import { CATEGORY_IDS } from '../../src/lib/categories';
import type { BaseListing, Category, Latest } from '../../src/types';

const validated: Partial<Record<Category, Latest>> = {};
for (const cat of CATEGORY_IDS) {
  const raw = JSON.parse(readFileSync(`public/data/${cat}/latest.json`, 'utf8')) as Latest;
  validated[cat] = validateLatest(cat, raw, VALIDATION_MODE).latest;
}
const built = builderFiles(validated, '2026-10-12T00:00:00Z');
const rowsOf = (slot: Slot): Record<string, unknown>[] =>
  fromColumns<Record<string, unknown>>(built.slots[slot]);
const modelsOf = (slot: Slot) => slotModels(slot, (validated[slot as Category]?.listings ?? []) as never[]);
const sample = <T,>(xs: T[], n: number) => xs.filter((_, i) => i % Math.max(1, Math.floor(xs.length / n)) === 0).slice(0, n);

describe('pick parts', () => {
  it('SLOT_OF is the identity for the nine categories', () => {
    for (const c of CATEGORY_IDS) expect(slotOf(c)).toBe(c);
    expect(Object.keys(SLOT_OF).sort()).toEqual([...CATEGORY_IDS].sort());
  });

  for (const slot of SLOTS) {
    it(`${slot}: toPart fields equal the builder row, usable matches the builder`, () => {
      const rows = new Map(rowsOf(slot).map((r) => [r.id as string, r]));
      const models = modelsOf(slot);
      const offered = models.filter((m) => rows.has(m.cheapest.id));
      expect(offered.length).toBeGreaterThan(0);
      for (const m of sample(offered, 20)) {
        const part = toPart(slot, m as never);
        const row = rows.get(m.cheapest.id)!;
        expect(part.category).toBe(slot);
        expect(part.key).toBe(m.key);
        expect(part.quantity).toBe(1);
        expect(part.name).toBeTruthy();
        for (const f of PART_FIELDS[slot]) expect([f, part.fields[f] ?? null]).toEqual([f, row[f] ?? null]);
      }
      for (const m of sample(models, 60)) {
        expect(usable(slot, m as never)).toBe(builderUsable[slot](m as never));
      }
    });
  }

  it('keys: cards per listing id, CPUs chip|cooler', () => {
    const g = modelsOf('gpu')[0];
    expect(toPart('gpu', g as never).key).toBe(g.cheapest.id);
    expect(toPart('gpu', g as never).fields.chip).toBe((g.cheapest as BaseListing).chip);
    const c = modelsOf('cpu')[0];
    expect(toPart('cpu', c as never).key).toMatch(/\|(true|false|\?)$/);
  });

  it('the comparison is not vacuous: the main fields are present on real parts', () => {
    const main: [Slot, string][] = [
      ['cpu', 'socket'], ['mobo', 'socket'], ['mobo', 'ramSlots'], ['ram', 'type'], ['gpu', 'lengthMm'], ['gpu', 'chip'],
      ['cooler', 'sockets'], ['case', 'gpuMaxMm'], ['case', 'fansIncluded'], ['case', 'radiators'], ['psu', 'watts'],
      ['fan', 'size'], ['storage', 'iface'],
    ];
    for (const [slot, f] of main) {
      const n = modelsOf(slot).filter((m) => toPart(slot, m as never).fields[f] != null).length;
      expect([slot, f, n > 0]).toEqual([slot, f, true]);
    }
  });
});
