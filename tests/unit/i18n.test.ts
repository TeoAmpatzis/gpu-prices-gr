// Step 5 task 14: one plural helper for every count (#31), one price format in each language (#30), the board step's
// own guide text (#29), and the CPU version suffix in both languages (Task 3 deferred minor).
import { describe, expect, it } from 'vitest';
import { plural, type Forms } from '../../src/lib/i18n';
import { formatPrice, formatPriceRange, formatWhole } from '../../src/lib/format';
import { BUILDER, fill } from '../../src/ui/builderStrings';
import { GUIDE_STEPS } from '../../src/components/BuildGuide';
import { GUIDE_INDEX } from '../../src/lib/wizard';
import { versionSuffix } from '../../src/lib/buildFit';
import { includedText } from '../../src/lib/fanPlan';
import type { CaseListing } from '../../src/types';
import type { Model } from '../../src/lib/data';
import { evaluate, type Part, type PartCategory, type RuleId } from '../../src/engine';
import { ruleResult } from '../compat/engine-adapter';

const NBSP = '\u00a0';
const SLOT: Forms = { el: ['θέση', 'θέσεις'], en: ['slot', 'slots'] };

describe('plural', () => {
  it('takes the singular for 1 and the plural otherwise, in both languages', () => {
    expect(plural('el', 1, SLOT)).toBe(`1${NBSP}θέση`);
    expect(plural('el', 3, SLOT)).toBe(`3${NBSP}θέσεις`);
    expect(plural('el', 0, SLOT)).toBe(`0${NBSP}θέσεις`);
    expect(plural('en', 1, SLOT)).toBe(`1${NBSP}slot`);
    expect(plural('en', 2, SLOT)).toBe(`2${NBSP}slots`);
  });
  it('groups thousands the language way', () => {
    expect(plural('el', 1200, SLOT)).toBe(`1.200${NBSP}θέσεις`);
    expect(plural('en', 1200, SLOT)).toBe(`1,200${NBSP}slots`);
  });
});

describe('one price format (#30)', () => {
  it('prices: the euro sign after in Greek, before in English', () => {
    expect(formatPrice(22.02, 'el')).toBe(`22,02${NBSP}€`);
    expect(formatPrice(22.02, 'en')).toBe('€22.02');
  });
  it('whole euros (budgets)', () => {
    expect(formatWhole(1000, 'el')).toBe(`1.000${NBSP}€`);
    expect(formatWhole(1000, 'en')).toBe('€1,000');
  });
  it('ranges: one euro sign, on the language side', () => {
    expect(formatPriceRange(245, 315, 'el')).toBe(`245–315${NBSP}€`);
    expect(formatPriceRange(245, 315, 'en')).toBe('€245–315');
    expect(formatPriceRange(1200, 1500.4, 'el')).toBe(`1.200–1.500${NBSP}€`);
    expect(formatPriceRange(300, 300, 'en')).toBe('€300');
  });
  it('"€22.02 left" in English, the amount first; Greek keeps its order', () => {
    expect(fill(BUILDER.left.en, { x: formatPrice(22.02, 'en') })).toBe('€22.02 left');
    expect(fill(BUILDER.over.en, { x: formatPrice(5, 'en') })).toBe('€5.00 over');
    expect(fill(BUILDER.left.el, { x: formatPrice(22.02, 'el') })).toBe(`απομένουν 22,02${NBSP}€`);
  });
});

describe('the board step has its own guide text (#29)', () => {
  const board = GUIDE_STEPS[GUIDE_INDEX.mobo!].body;
  it('differs from the CPU step', () => expect(board).not.toEqual(GUIDE_STEPS[GUIDE_INDEX.cpu!].body));
  it('names chipset, size, M.2 and Wi-Fi in both languages', () => {
    for (const lang of ['el', 'en'] as const) {
      const s = typeof board === 'string' ? board : board[lang];
      for (const w of ['chipset', 'ATX', 'M.2', 'Wi-Fi']) expect(s).toContain(w);
    }
  });
});

describe('CPU version suffix in both languages (Task 3 minor)', () => {
  it('"no cooler" is Greek in Greek', () => {
    expect(versionSuffix('Ryzen 7 7700|false')).toEqual({ el: ' (χωρίς ψύκτρα)', en: ' (no cooler)' });
    expect(versionSuffix('Ryzen 7 7700|true')).toBe(' (Box)');
  });
});

describe('engine counts take the right form (#31)', () => {
  let k = 0;
  const part = (category: PartCategory, fields: Record<string, unknown>, quantity = 1): Part => ({ category, key: `${category}-${++k}`, name: category, quantity, fields });
  const mobo = (f: Record<string, unknown>) => part('mobo', { socket: 'AM5', formFactor: 'ATX', memory: 'DDR5', ...f });
  const msgOf = (rule: RuleId, parts: Part[]) => ruleResult(evaluate(parts, {}), rule)!.message;
  const ONE = /(^|\D)1[\s\u00a0](θέσεις|θέσεων|δίσκοι|δίσκους|στικ μνήμης|ανεμιστήρες|θύρες|μονάδες|headers)(?!\p{L})/u;
  const ONE_EN = /(^|\D)1[\s\u00a0](slots|drives|drive\(s\)|sticks|fans|ports|bays|positions)(?!\p{L})/u;
  // `\b` is ASCII-only in JS (never matches after a Greek letter), hence the Unicode letter lookahead above.
  it('the guards catch a wrong form', () => {
    expect('1 δίσκοι M.2 σε 1 θέσεις.').toMatch(ONE);
    expect('Περιλαμβάνει 1 ανεμιστήρες, το κουτί').toMatch(ONE);
    expect('1 θέση').not.toMatch(ONE);
    expect('1 fans').toMatch(ONE_EN);
  });
  const cases: [string, RuleId, Part[]][] = [
    ['rule 17: 1 M.2 drive in 1 slot', 17, [mobo({ m2Slots: 1 }), part('storage', { media: 'SSD', iface: 'NVMe', formFactor: 'M.2 2280' })]],
    ['rule 18: 1 SATA drive in 1 port', 18, [mobo({ sataPorts: 1 }), part('storage', { media: 'HDD', iface: 'SATA', formFactor: '3.5"' })]],
    ['rule 3: 1 stick in 1 slot', 3, [mobo({ ramSlots: 1 }), part('ram', { type: 'DDR5', capacity: 16, modules: 1 })]],
    ['rule 19: 1 3.5" drive in 1 bay', 19, [part('case', { size: 'Midi Tower', bays35: 1 }), part('storage', { media: 'HDD', iface: 'SATA', formFactor: '3.5"' })]],
    ['rule 21: 1 fan, case with 1 position', 21, [part('case', { size: 'Midi Tower', fanSlots: 1 }), part('fan', { size: 120, pack: 1 })]],
  ];
  for (const [name, rule, parts] of cases)
    it(name, () => {
      const m = msgOf(rule, parts);
      expect(m.el).not.toMatch(ONE);
      expect(m.en).not.toMatch(ONE_EN);
      expect(`${m.el} ${m.en}`).toMatch(/1\u00a0/);
    });
});

describe('case included fans count (#31)', () => {
  it('one fan of unknown size is singular', () => {
    const c = { listings: [{ fansIncluded: [{ n: 1, size: null, pos: null }] }] } as unknown as Model<CaseListing>;
    expect(includedText(c).text).toEqual({ el: `Περιλαμβάνει 1${NBSP}ανεμιστήρας`, en: `Includes 1${NBSP}fan` });
  });
});
