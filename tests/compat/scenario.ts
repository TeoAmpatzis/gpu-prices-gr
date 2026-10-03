// Compatibility scenarios (v2 Phase 0): an engine-independent format, one JSON file per scenario in
// tests/compat/scenarios/. Expected results use the rule numbers (1–26) and levels of the plan's rules
// table (docs/redesign-v2.md, "Κανόνες συμβατότητας"). They become the v2 regression suite in Phase 2.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type Level = 'error' | 'warning' | 'note' | 'pass';
export const LEVELS: Level[] = ['error', 'warning', 'note', 'pass'];
export type PartCategory = 'cpu' | 'mobo' | 'ram' | 'gpu' | 'cooler' | 'storage' | 'case' | 'fan' | 'psu';
export const CATEGORIES: PartCategory[] = ['cpu', 'mobo', 'ram', 'gpu', 'cooler', 'storage', 'case', 'fan', 'psu'];

export interface ScenarioPart {
  category: PartCategory;
  /** The v1 builder's model key (what a share link carries); "synthetic:…" for made-up products. */
  key: string;
  /** The category page's model key (src/lib/categories.tsx modelKey); null for synthetic products. */
  modelKey: string | null;
  name: string;
  quantity: number;
  /** True when the product or some of its fields are made up (see syntheticFields and note). */
  synthetic: boolean;
  syntheticFields?: string[];
  /** Where the real product came from when the scenario was written (null for synthetic products). */
  source: { site: string; id: string; title: string; price: number } | null;
  /** The field values the rules read, as they were in the data when the scenario was written. */
  fields: Record<string, unknown>;
  note?: string;
}

export interface Expectation {
  rule: number;
  level: Level;
}

export interface Scenario {
  id: string;
  title: string;
  /** The row of the plan's Phase 0 example table this scenario implements, if any. */
  planExample?: string;
  parts: ScenarioPart[];
  /** v1's measured length range per graphics chip (used for "Likely fits" estimates), when it matters. */
  context?: { chipLengths?: Record<string, { cards: number; makers: number; min: number; max: number }> };
  expected: Expectation[];
  why: string;
  capturedFrom: { builtAt: string; files: string };
}

export const SCENARIO_DIR = fileURLToPath(new URL('./scenarios', import.meta.url));

export function loadScenarios(dir = SCENARIO_DIR): { file: string; scenario: Scenario }[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((file) => ({ file, scenario: JSON.parse(readFileSync(join(dir, file), 'utf8')) as Scenario }));
}

/** Format problems of one scenario (an empty list = valid). */
export function validate(s: Scenario): string[] {
  const out: string[] = [];
  if (!/^S\d{2,}$/.test(s.id)) out.push(`bad id ${s.id}`);
  if (!s.title?.trim()) out.push('no title');
  if (!s.why?.trim()) out.push('no why');
  if (!s.parts?.length) out.push('no parts');
  if (!s.expected?.length) out.push('no expected results');
  for (const p of s.parts ?? []) {
    if (!CATEGORIES.includes(p.category)) out.push(`bad category ${p.category}`);
    if (!p.key) out.push('part without key');
    if (!(Number.isInteger(p.quantity) && p.quantity >= 1)) out.push(`${p.key}: bad quantity`);
    if (!p.fields || typeof p.fields !== 'object') out.push(`${p.key}: no fields`);
    if (p.synthetic !== Boolean(p.syntheticFields?.length || p.key.startsWith('synthetic:')))
      out.push(`${p.key}: synthetic flag does not match syntheticFields/key`);
    if (!p.synthetic && !p.source) out.push(`${p.key}: real product without source`);
  }
  const seen = new Set<number>();
  for (const e of s.expected ?? []) {
    if (!(Number.isInteger(e.rule) && e.rule >= 1 && e.rule <= 26)) out.push(`bad rule ${e.rule}`);
    if (!LEVELS.includes(e.level)) out.push(`rule ${e.rule}: bad level ${e.level}`);
    if (seen.has(e.rule)) out.push(`rule ${e.rule} listed twice`);
    seen.add(e.rule);
  }
  return out;
}
