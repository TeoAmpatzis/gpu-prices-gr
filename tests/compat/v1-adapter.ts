// Runs a compatibility scenario through the CURRENT v1 builder logic — the same functions the v1 UI
// calls (src/lib/builder.ts: slotModels, rate, buildNotes, buildStatus, requiredWatts) on the same row
// shape builder.json gives the browser — and maps v1's answers to the plan's levels.
//
// Mapping (documented in docs/audit-v1.md, "Compatibility scenario results"):
//   v1 check "Fits"                         → pass
//   v1 check "Likely fits" (an estimate)    → note   (plan: an estimate is said to be one; rule 5 "note if estimate")
//   v1 check "Fit not verified" (no data)   → note   (plan: unknown → "Δεν μπορέσαμε να ελέγξουμε…")
//   v1 check "Incompatible" (part hidden)   → error
//   v1 build note, level "error"            → error  (v1 has no warning level)
//   v1 build note, level "info"             → note, except the advice "the CPU comes with a cooler" → pass
// Verdict per expected rule: "correct" (same level), "wrong" (v1 answers differently), or "gap" (v1 has
// no such check, cannot hold the scenario's quantities, or the plan's level band — a margin warning —
// does not exist in v1). This adapter can be deleted once the v2 engine passes the scenarios (Phase 2).

import type { BaseListing } from '../../src/types';
import {
  FIT_LABEL,
  NO_CONTEXT,
  buildNotes,
  buildStatus,
  rate,
  requiredWatts,
  slotModels,
  type Build,
  type Fit,
  type FitContext,
  type Slot,
} from '../../src/lib/builder';
import type { Model } from '../../src/lib/data';
import { tr } from '../../src/lib/i18n';
import type { Level, Scenario, ScenarioPart } from './scenario';

/** Plan rules v1 has some check for, and what that check is. */
export const V1_CHECKS: Record<number, string> = {
  1: 'cpu–mobo check (socket)',
  2: 'mobo–ram check (memory type)',
  3: 'mobo–ram check (sticks vs stated slots)',
  5: 'mobo–case check (board size)',
  6: 'gpu–case check (card length)',
  8: 'cooler–case check (air cooler height)',
  9: 'cooler–case check (AIO radiator)',
  10: 'cpu–cooler check (sockets)',
  11: 'build note: CPU cooler',
  12: 'build note: integrated graphics',
  14: 'psu–gpu / psu–cpu check (recommended watts)',
  16: 'psu–case check (only: SFF case → not verified)',
  19: 'storage–case check (only: 3.5" → not verified)',
  20: 'build note: PCIe 5.0 drive',
  21: 'fan–case check',
};
/** Plan levels with a margin band v1 does not have (rule 6: ≤10 mm, rule 8: ≤5 mm, rule 14: ≤ +10%). */
const MARGIN_RULES = [6, 8, 14];
/** Categories whose quantity a rule depends on (v1 holds one model per category). */
const RULE_PARTS: Record<number, ScenarioPart['category'][]> = {
  1: ['cpu', 'mobo'],
  2: ['mobo', 'ram'],
  3: ['mobo', 'ram'],
  5: ['mobo', 'case'],
  6: ['gpu', 'case'],
  8: ['cooler', 'case'],
  9: ['cooler', 'case'],
  10: ['cpu', 'cooler'],
  11: ['cpu', 'cooler'],
  12: ['cpu', 'gpu'],
  14: ['cpu', 'gpu', 'psu'],
  16: ['psu', 'case'],
  19: ['storage', 'case'],
  20: ['storage'],
  21: ['fan', 'case'],
};
/** New fields a rule needs (not collected; only in synthetic parts). v1 cannot read them. */
const NEW_FIELDS: Record<number, string[]> = { 16: ['psuFormFactors'] };

const RANK: Record<Level, number> = { pass: 0, note: 1, warning: 2, error: 3 };
const fitLevel = (fit: Fit | null): Level | null =>
  fit == null ? null : fit === 'fits' ? 'pass' : fit === 'no' ? 'error' : 'note';
const en = (t: Parameters<typeof tr>[1]) => tr('en', t);
const label = (fit: Fit | null) => (fit == null ? '—' : fit === 'no' ? 'Incompatible' : en(FIT_LABEL[fit]));

/** The builder.json row v1 would have for this part. */
function rowOf(p: ScenarioPart): BaseListing {
  return {
    id: p.source?.id ?? p.key,
    source: (p.source?.site ?? 'skroutz') as BaseListing['source'],
    title: p.category === 'gpu' ? p.name : (p.source?.title ?? p.name),
    url: '',
    price: p.source?.price ?? 0,
    shopCount: null,
    brand: '',
    // Graphics cards keep the chip in their fields (their model name is the card title).
    chip: p.category === 'gpu' ? String(p.fields.chip) : p.name,
    scrapedAt: '',
    ...p.fields,
  } as BaseListing;
}

/** The v1 model for a part, built exactly as the browser builds it from builder.json. */
export function modelOf(p: ScenarioPart): Model<BaseListing> {
  const models = slotModels(p.category as Slot, [rowOf(p)] as never) as Model<BaseListing>[];
  if (models.length !== 1) throw new Error(`${p.key}: v1 grouped one row into ${models.length} models`);
  return models[0];
}

export const contextOf = (s: Scenario): FitContext =>
  s.context?.chipLengths ? { chips: new Map(Object.entries(s.context.chipLengths)) } : NO_CONTEXT;

export interface RuleResult {
  rule: number;
  expected: Level;
  /** v1's answer mapped to a plan level; null when v1 has nothing for it. */
  v1: Level | null;
  /** What v1 says, in its own words (English UI text). */
  v1Says: string;
  verdict: 'correct' | 'wrong' | 'gap';
  detail: string;
}

export interface ScenarioResult {
  id: string;
  title: string;
  /** What the v1 UI shows for the whole scenario build: each part's label, the notes, the status line. */
  ui: {
    parts: { category: string; name: string; label: string; reasons: string[] }[];
    notes: { level: 'error' | 'info'; text: string }[];
    status: Record<Fit, number>;
    requiredWatts: number | null;
    unexpressed: string[];
  };
  rules: RuleResult[];
  verdict: 'correct' | 'wrong' | 'not checked by v1';
}

const MISSING_NOTE = /^Pick /;

export function runScenario(s: Scenario): ScenarioResult {
  const ctx = contextOf(s);
  // v1 holds one part per category: the first of each, and quantities are lost.
  const build: Build = {};
  const unexpressed: string[] = [];
  const count: Partial<Record<string, number>> = {};
  for (const p of s.parts) {
    count[p.category] = (count[p.category] ?? 0) + p.quantity;
    if ((build as Record<string, unknown>)[p.category]) unexpressed.push(`second ${p.category} (${p.name}) dropped`);
    else (build as Record<string, unknown>)[p.category] = modelOf(p);
    if (p.quantity > 1) unexpressed.push(`${p.quantity} × ${p.name} counted once`);
  }
  const notes = buildNotes(build, ctx).map((n) => ({ level: n.level, text: en(n.text) }));
  const ui = {
    parts: (Object.keys(build) as Slot[]).map((slot) => {
      const m = build[slot]!;
      const r = rate(slot, m as never, build, ctx);
      return { category: slot, name: m.chip, label: label(r.fit), reasons: r.reasons.map(en) };
    }),
    notes,
    status: buildStatus(build, ctx),
    requiredWatts: requiredWatts(build),
    unexpressed,
  };

  // One rule at a time: v1's own pair check between the two parts the rule is about (rate() on a
  // build holding only the other part), or its build notes.
  const pair = (slot: Slot, other: Build) => {
    const m = build[slot];
    return m ? rate(slot, m as never, other, ctx) : null;
  };
  const noteMatching = (re: RegExp) => notes.find((n) => re.test(n.text));

  const evaluate = (rule: number): { v1: Level | null; says: string } => {
    const fromFit = (r: ReturnType<typeof pair>) =>
      r?.fit
        ? { v1: fitLevel(r.fit), says: [label(r.fit), r.reasons.map(en).join(' ')].filter(Boolean).join(': ') }
        : { v1: null, says: 'nothing' };
    switch (rule) {
      case 1:
        return build.cpu && build.mobo ? fromFit(pair('mobo', { cpu: build.cpu })) : { v1: null, says: 'nothing' };
      case 2:
      case 3: {
        if (!build.mobo || !build.ram) return { v1: null, says: 'nothing' };
        const r = pair('ram', { mobo: build.mobo })!;
        const reasons = r.reasons.map(en);
        const typeClash = reasons.some((x) => x.startsWith('The board takes'));
        if (rule === 2) return typeClash ? fromFit(r) : { v1: 'pass', says: 'memory type matches' };
        return typeClash ? { v1: null, says: 'not evaluated (the memory type clash comes first)' } : fromFit(r);
      }
      case 5:
        return build.mobo && build.case ? fromFit(pair('case', { mobo: build.mobo })) : { v1: null, says: 'nothing' };
      case 6:
        return build.gpu && build.case ? fromFit(pair('case', { gpu: build.gpu })) : { v1: null, says: 'nothing' };
      case 8:
      case 9: {
        if (!build.cooler || !build.case) return { v1: null, says: 'nothing' };
        const aio = (build.cooler.cheapest as unknown as { type: string }).type === 'AIO';
        if ((rule === 9) !== aio) return { v1: null, says: `not evaluated (the cooler is ${aio ? 'an AIO' : 'an air cooler'})` };
        return fromFit(pair('case', { cooler: build.cooler }));
      }
      case 10:
        return build.cpu && build.cooler ? fromFit(pair('cooler', { cpu: build.cpu })) : { v1: null, says: 'nothing' };
      case 11: {
        if (!build.cpu) return { v1: null, says: 'nothing' };
        if (build.cooler) return { v1: 'pass', says: 'a cooler is in the build: no cooler note' };
        const n = noteMatching(/cooler/i);
        if (!n) return { v1: 'pass', says: 'no cooler note' };
        return { v1: n.level === 'error' ? 'error' : /comes with a cooler/.test(n.text) ? 'pass' : 'note', says: `${n.level}: ${n.text}` };
      }
      case 12: {
        if (!build.cpu) return { v1: null, says: 'nothing' };
        const n = noteMatching(/integrated graphics/);
        return n ? { v1: n.level === 'error' ? 'error' : 'note', says: `${n.level}: ${n.text}` } : { v1: 'pass', says: 'no graphics note' };
      }
      case 14: {
        if (!build.psu || (!build.cpu && !build.gpu)) return { v1: null, says: 'nothing' };
        const r = pair('psu', { cpu: build.cpu, gpu: build.gpu });
        const out = fromFit(r);
        return { ...out, says: `${out.says} (v1 recommends ≥ ${requiredWatts({ cpu: build.cpu, gpu: build.gpu })} W)` };
      }
      case 16: {
        if (!build.psu || !build.case) return { v1: null, says: 'nothing' };
        const r = pair('psu', { case: build.case });
        return r?.fit ? fromFit(r) : { v1: 'pass', says: 'no PSU–case check (case is not SFF)' };
      }
      case 19: {
        if (!build.storage || !build.case) return { v1: null, says: 'nothing' };
        const r = pair('storage', { case: build.case });
        return r?.fit ? fromFit(r) : { v1: 'pass', says: 'no drive–case check (not a 3.5" drive)' };
      }
      case 20: {
        if (!build.storage) return { v1: null, says: 'nothing' };
        const n = noteMatching(/PCIe 5\.0/);
        return n ? { v1: 'note', says: `${n.level}: ${n.text}` } : { v1: 'pass', says: 'no PCIe 5.0 note' };
      }
      case 21:
        return build.fan && build.case ? fromFit(pair('fan', { case: build.case })) : { v1: null, says: 'nothing' };
      default:
        return { v1: null, says: 'v1 has no such check' };
    }
  };

  const rules: RuleResult[] = s.expected.map(({ rule, level }) => {
    const base = { rule, expected: level };
    if (!(rule in V1_CHECKS)) return { ...base, v1: null, v1Says: 'v1 has no such check', verdict: 'gap', detail: '' };
    const many = (RULE_PARTS[rule] ?? []).filter((c) => (count[c] ?? 0) > 1);
    if (many.length)
      return { ...base, v1: null, v1Says: '—', verdict: 'gap', detail: `v1 holds one ${many.join('/')}; the scenario has ${many.map((c) => count[c]).join('/')}` };
    const needs = (NEW_FIELDS[rule] ?? []).filter((f) => s.parts.some((p) => f in p.fields));
    if (needs.length) {
      const got = evaluate(rule);
      return { ...base, v1: got.v1, v1Says: got.says, verdict: 'gap', detail: `depends on ${needs.join(', ')}, a field v1 does not have` };
    }
    const got = evaluate(rule);
    if (got.v1 == null) return { ...base, v1: null, v1Says: got.says, verdict: 'gap', detail: 'v1 did not evaluate it for this build' };
    if (got.v1 === level) return { ...base, v1: got.v1, v1Says: got.says, verdict: 'correct', detail: '' };
    if (level === 'warning' && got.v1 === 'pass' && MARGIN_RULES.includes(rule))
      return { ...base, v1: got.v1, v1Says: got.says, verdict: 'gap', detail: 'v1 has no margin warning (it passes)' };
    const way = RANK[got.v1] < RANK[level] ? 'more lenient than the plan' : 'stricter than the plan';
    return { ...base, v1: got.v1, v1Says: got.says, verdict: 'wrong', detail: `v1 says ${got.v1}, plan says ${level}: ${way}` };
  });

  const verdict = rules.some((r) => r.verdict === 'wrong')
    ? 'wrong'
    : rules.some((r) => r.verdict === 'correct')
      ? 'correct'
      : 'not checked by v1';
  return {
    id: s.id,
    title: s.title,
    ui: { ...ui, notes: ui.notes.filter((n) => !MISSING_NOTE.test(n.text)) },
    rules,
    verdict,
  };
}
