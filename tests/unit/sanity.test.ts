// Suspect prices (design 2026-11-08 WS1): a listing far from the other listings of its own model is a probable
// wrong price. It must be flagged, the normal spread must not be, and a model with too few peers is never judged.
import { describe, expect, it } from 'vitest';
import { MIN_PEERS, PEER_HIGH, PEER_LOW, suspectListings } from '../../src/lib/sanity';

type L = { id: string; source: string; price: number; key: string };
const around = (key: string, centre: number, n: number): L[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${key}-${i}`, source: 'skroutz', price: centre * (0.92 + (0.16 * i) / Math.max(1, n - 1)), key }));
const run = (ls: L[]) => suspectListings(ls, (l) => l.key);
const id = (l: L) => `${l.source}\u0000${l.id}`;

describe('suspect prices', () => {
  it('flags a PSU class priced far under its peers (850W Platinum at 28.66 among ~140)', () => {
    const odd: L = { id: 'fsp', source: 'bestprice', price: 28.66, key: '850W Platinum' };
    const s = run([...around('850W Platinum', 140, 80), odd]);
    expect(s.get(id(odd))).toMatchObject({ rule: 'low', price: 28.66 });
    expect(s.size).toBe(1);
  });

  it('flags a 1200W Platinum at 29.42 among ~200', () => {
    const odd: L = { id: 'ptm', source: 'bestprice', price: 29.42, key: '1200W Platinum' };
    expect(run([...around('1200W Platinum', 200, 100), odd]).get(id(odd))?.rule).toBe('low');
  });

  it('flags a RAM kit priced far over its peers (4 GB at 464.96 among ~30)', () => {
    const odd: L = { id: 'ram', source: 'shopflix', price: 464.96, key: 'DDR4 4GB (1x4GB)' };
    expect(run([...around('DDR4 4GB (1x4GB)', 30, 30), odd]).get(id(odd))?.rule).toBe('high');
  });

  it('never judges a model with fewer than MIN_PEERS other listings', () => {
    const odd: L = { id: 'x', source: 'skroutz', price: 1, key: 'rare' };
    expect(MIN_PEERS).toBe(3);
    expect(run([...around('rare', 100, MIN_PEERS - 1), odd]).size).toBe(0);
    expect(run([...around('rare', 100, MIN_PEERS), odd]).size).toBe(1);
  });

  it('keeps the limits at 25% and 5x of the peer median', () => {
    expect([PEER_LOW, PEER_HIGH]).toEqual([0.25, 5]);
    const peers = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, source: 'skroutz', price: 100, key: 'm' }));
    const at = (price: number): L => ({ id: 't', source: 'skroutz', price, key: 'm' });
    expect(run([...peers, at(30)]).size).toBe(0);
    expect(run([...peers, at(24)]).size).toBe(1);
    expect(run([...peers, at(500)]).size).toBe(0);
    expect(run([...peers, at(501)]).size).toBe(1);
  });

  it('is deterministic and does not change its input', () => {
    const ls = [...around('a', 50, 12), { id: 'z', source: 'snif', price: 5, key: 'a' }];
    const copy = JSON.stringify(ls);
    expect([...run(ls).keys()]).toEqual([...run(ls).keys()]);
    expect(JSON.stringify(ls)).toBe(copy);
  });
});
