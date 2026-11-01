import { describe, expect, it } from 'vitest';
import { pickerMatches } from '../../src/lib/search';
import { fanShortfall, planPackOrder } from '../../src/lib/fanPlan';

describe('picker search', () => {
  it.each(['650W', '32GB', '1TB', '120mm'])('matches whole unit quantities: %s', (query) => {
    expect(pickerMatches(`Product ${query}`, query)).toBe(true);
    expect(pickerMatches(`Product 1${query}`, query)).toBe(false);
    expect(pickerMatches(`Product ${query.replace(/(\d)([a-z])/i, '$1 $2')}`, query)).toBe(true);
  });
  it('matches several words without requiring their order', () => {
    expect(pickerMatches('Corsair RM650 650 W Gold', 'gold 650W')).toBe(true);
  });
});

describe('fan plan packs', () => {
  const plan = { add: [{ pos: 'front' as const, n: 2, size: 120 }, { pos: 'rear' as const, n: 1, size: 120 }], total: 3, high: false, aio: false, sizesKnown: true, topUnknown: false };
  it('ranks packs of the plan size first without hiding other sizes', () => {
    const sizes = plan.add.map((a) => a.size);
    expect(planPackOrder(sizes, 120)).toBe(0);
    expect(planPackOrder(sizes, 140)).toBe(1);
  });
  it('counts packs and reports only a real shortfall', () => {
    expect(fanShortfall(plan, 1, 2)).toBe(1);
    expect(fanShortfall(plan, 3, 1)).toBe(0);
    expect(fanShortfall(plan, 2, 2)).toBe(0);
  });
});
