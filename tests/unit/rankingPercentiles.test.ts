// The ranking's percentile uses binary searches; it must give exactly what the plain linear scan gave.
import { describe, expect, it } from 'vitest';
import { percentiles } from '../../src/lib/ranking';

function linear(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const n = values.length;
  return values.map((v) => {
    if (n < 2) return 1;
    let lo = 0;
    let hi = n - 1;
    while (lo < n && sorted[lo] < v) lo++;
    while (hi >= 0 && sorted[hi] > v) hi--;
    return (lo + hi) / 2 / (n - 1);
  });
}

describe('percentiles', () => {
  it('matches the linear scan on empty, single, tied and random input', () => {
    let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const cases = [[], [3], [2, 2], [1, 2, 3], [5, 5, 5, 1, 9, 9], Array.from({ length: 500 }, () => Math.floor(rnd() * 40)), Array.from({ length: 800 }, () => rnd() * 100)];
    for (const values of cases) expect(percentiles(values)).toEqual(linear(values));
  });
});
