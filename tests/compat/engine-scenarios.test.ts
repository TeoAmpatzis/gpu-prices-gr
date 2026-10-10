// The 64 Phase 0 scenarios through the v2 engine. Scenarios are never edited to fit the engine: what doesn't
// match is either a KNOWN GAP below (with the engine's and the scenario's answer and why), or a failure. A
// scenario "note" listed in EXPECTED_UNKNOWN must be the engine's unknown (data missing), not any note.
import { describe, expect, it } from 'vitest';
import { compare } from './engine-adapter';
import { loadScenarios, type Level } from './scenario';

interface Gap {
  engine: string;
  expected: Level;
  /** When the gap is about where the answer comes from (the level matches): the basis must stay this. */
  basis?: string;
  why: string;
}

/** Known gaps with today's data and tables (owner-approved list, 2026-10-10). Key: "<scenario>:R<rule>". */
export const KNOWN_GAPS: Record<string, Gap> = {
  'S59:R14': { engine: 'warning', expected: 'error', why: 'Η κάρτα δηλώνει 750 W και το τροφοδοτικό είναι ακριβώς 750 W· το σενάριο θέλει σφάλμα με τον τύπο του plan' },
  'S63:R14': { engine: 'unknown', expected: 'pass', why: "No graphics card, so v1's table has no figure; v1's 350 W baseline has no source, so it cannot support a pass (the scenario's 550 W pass comes from the plan's formula)." },
  'S01:R13': { engine: 'unknown', expected: 'pass', why: 'No BIOS table (chipset × CPU generation) exists yet.' },
  'S03:R13': { engine: 'unknown', expected: 'warning', why: 'No BIOS table (chipset × CPU generation) exists yet.' },
  'S04:R13': { engine: 'unknown', expected: 'pass', why: 'No BIOS table (chipset × CPU generation) exists yet.' },
  'S35:R21': { engine: 'error', expected: 'note', why: 'The case states 1 fan position but 6 included fans; only the validation layer (not in this step) would make that value unknown.' },
  'S62:R14': { engine: 'error', expected: 'error', basis: 'v1-estimate', why: "The error depends on v1's +100 W for a Ryzen 9, which has no source: with the card's stated 1000 W alone, the 1000 W PSU is a warning." },
  'S45:R26': { engine: 'note', expected: 'note', basis: 'unknown', why: 'A note without a basis: rule 26 (RAM–air-cooler clearance) always gives this note by its definition; nothing is checked.' },
};

/**
 * Expectations whose scenario "note" means "the data is missing" (owner, 2026-10-10). For these the engine
 * must answer unknown with basis unknown; a note built on an estimate does not count.
 */
export const EXPECTED_UNKNOWN = new Set([
  'S13:R19', 'S14:R6', 'S15:R10', 'S16:R3', 'S20:R6', 'S21:R9', 'S21:R21', 'S22:R8',
  'S30:R17', 'S30:R18', 'S30:R19', 'S46:R20', 'S49:R16',
]);

type Row = ReturnType<typeof compare>[number];
type Category = 'pass' | 'gap' | 'unknown' | 'v1-estimate' | 'note-no-basis' | 'failure';
const CATEGORIES: Category[] = ['pass', 'gap', 'unknown', 'v1-estimate', 'note-no-basis', 'failure'];

const key = (id: string, row: Row) => `${id}:R${row.rule}`;
const unknownOk = (row: Row) => row.expected === 'note' && row.engine === 'unknown' && row.basis === 'unknown';

/** One category per scenario, the first that applies in this order: failure, gap, unknown, v1-estimate, note-no-basis, pass. */
function categorise(id: string, rows: Row[]): Category {
  const at = (row: Row) => key(id, row);
  if (rows.some((r) => !KNOWN_GAPS[at(r)] && !(EXPECTED_UNKNOWN.has(at(r)) ? unknownOk(r) : r.matches))) return 'failure';
  if (rows.some((r) => KNOWN_GAPS[at(r)])) return 'gap';
  if (rows.some((r) => EXPECTED_UNKNOWN.has(at(r)))) return 'unknown';
  if (rows.some((r) => r.basis === 'v1-estimate')) return 'v1-estimate';
  if (rows.some((r) => r.engine === 'note' && r.basis === 'unknown')) return 'note-no-basis';
  return 'pass';
}

const all = loadScenarios().map((x) => x.scenario);
const results = all.map((s) => ({ s, rows: compare(s) }));

describe('engine × Phase 0 scenarios', () => {
  it.each(results.map((r) => [r.s.id, r] as const))('%s', (id, { rows }) => {
    for (const row of rows) {
      const gap = KNOWN_GAPS[key(id, row)];
      if (gap) {
        // A known gap must stay exactly as recorded: if the engine's answer changes, this list must be revisited.
        expect({ engine: row.engine, expected: row.expected, ...(gap.basis && { basis: row.basis }) }, `${id} R${row.rule} gap changed`)
          .toEqual({ engine: gap.engine, expected: gap.expected, ...(gap.basis && { basis: gap.basis }) });
      } else if (EXPECTED_UNKNOWN.has(key(id, row))) {
        expect({ engine: row.engine, basis: row.basis }, `${id} R${row.rule}: expected unknown (data missing) — ${row.message}`).toEqual({ engine: 'unknown', basis: 'unknown' });
      } else {
        expect(row.matches, `${id} R${row.rule}: expected ${row.expected}, engine ${row.engine} — ${row.message}`).toBe(true);
      }
    }
  });

  it('every known gap is a real expectation of a scenario', () => {
    const real = new Set(results.flatMap(({ s, rows }) => rows.map((r) => key(s.id, r))));
    expect(Object.keys(KNOWN_GAPS).filter((k) => !real.has(k))).toEqual([]);
  });

  it('every expected unknown is a real "note" expectation and not a known gap', () => {
    const notes = new Set(results.flatMap(({ s, rows }) => rows.filter((r) => r.expected === 'note').map((r) => key(s.id, r))));
    expect([...EXPECTED_UNKNOWN].filter((k) => !notes.has(k) || KNOWN_GAPS[k])).toEqual([]);
  });

  it('reports the totals, which add up to 64', () => {
    const by = Object.fromEntries(CATEGORIES.map((c) => [c, [] as string[]])) as Record<Category, string[]>;
    for (const { s, rows } of results) by[categorise(s.id, rows)].push(s.id);
    console.log(
      `[engine scenarios] ${all.length} scenarios: ` +
        CATEGORIES.map((c) => `${c} ${by[c].length}${by[c].length && c !== 'pass' ? ` (${by[c].join(', ')})` : ''}`).join(', ') + '.',
    );
    expect(by.failure).toEqual([]);
    expect(all.length).toBe(64);
    expect(CATEGORIES.reduce((n, c) => n + by[c].length, 0)).toBe(64);
  });
});
