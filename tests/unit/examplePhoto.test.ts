import { describe, expect, it } from 'vitest';
import { isExamplePhoto } from '../../src/lib/examplePhoto';

type L = { maker: string | null };
const withMaker = { before: [], after: [{ maker: (l: L) => l.maker }] } as never;
const m = (...makers: (string | null)[]) => ({ listings: makers.map((maker) => ({ maker })) }) as never;

describe('isExamplePhoto', () => {
  it('one maker in two spellings is one maker', () => expect(isExamplePhoto(withMaker, m('Be Quiet!', 'be quiet'))).toBe(false));
  it('two makers', () => expect(isExamplePhoto(withMaker, m('Asus', 'Gigabyte'))).toBe(true));
  it('unknown makers are ignored', () => expect(isExamplePhoto(withMaker, m('Asus', null))).toBe(false));
  it('no maker column', () => expect(isExamplePhoto({ before: [], after: [{}] } as never, m('Asus', 'Gigabyte'))).toBe(false));
});
