// A part's fit label in the builder, from the v2 engine's findings (step 5 task 9; replaces v1's `rate`). Types only
// from the engine (no engine code), so the builder's chunk can use it while the engine runs in the pick worker.
import type { Finding, Part } from '../engine';
import type { Verdict } from './pickProtocol';
import type { Slot } from './slots';
import type { Text } from './i18n';

export type Label = 'fits' | 'likely' | 'unverified' | 'check' | 'no';

const RANK: Record<Label, number> = { fits: 0, likely: 1, unverified: 2, check: 3, no: 4 };

/** Rules that are advice (26 always a note, 27–30 balance for gaming): listed as notes, never a label. */
const advice = (f: Finding) => f.rule >= 26;

/**
 * Pass basis stated / maker-list → fits; pass or note on an estimate → likely; unknown → unverified; warning → check;
 * error → no (hidden only when pickHide says so). Any other note (stated) is information, not a fit problem.
 */
export function labelOfFinding(f: Finding): Label {
  switch (f.status) {
    case 'error': return 'no';
    case 'warning': return 'check';
    case 'unknown': return 'unverified';
    default: return f.basis === 'estimate' || f.basis === 'v1-estimate' ? 'likely' : 'fits';
  }
}

/** The findings that make a part's label: between it and another part, not advice. */
export const labelFindings = (findings: Finding[], key: string) =>
  findings.filter((f) => f.parts.includes(key) && f.parts.length > 1 && !advice(f));

/**
 * A part's label: its worst check against the other chosen parts (null when nothing was checked), the finding behind
 * it, and the other part that finding is about (#19: "fans" for a case whose only non-fit is the fan check; needs the
 * build's parts to name it).
 */
export function labelOf(findings: Finding[], key: string, parts: Part[] = []): { label: Label | null; worst?: Finding; other?: Slot } {
  let worst: Finding | undefined;
  for (const f of labelFindings(findings, key)) if (!worst || RANK[labelOfFinding(f)] > RANK[labelOfFinding(worst)]) worst = f;
  if (!worst) return { label: null };
  const otherKey = worst.parts.find((k) => k !== key);
  const other = parts.find((p) => p.key === otherKey)?.category as Slot | undefined;
  return { label: labelOfFinding(worst), worst, other };
}

/** A part's label with the reasons to show beside it (every non-fit finding's message). */
export interface Rating {
  fit: Label | null;
  reasons: Text[];
  other?: Slot;
}

export function ratingOf(findings: Finding[], key: string, parts: Part[] = []): Rating {
  const { label, other } = labelOf(findings, key, parts);
  const reasons = labelFindings(findings, key).filter((f) => labelOfFinding(f) !== 'fits').map((f) => f.message);
  return { fit: label, reasons, other };
}

/**
 * The one "not verified" reason of a step (#14): the most common unknown among the step's candidates, said once above
 * the cards instead of on each. Null when no candidate is unverified.
 */
export function stepReason(verdicts: Map<string, Verdict>): Text | null {
  const count = new Map<string, { n: number; text: Text }>();
  for (const [key, v] of verdicts) {
    for (const f of labelFindings(v.findings, key)) {
      if (f.status !== 'unknown') continue;
      const c = count.get(f.message.en) ?? { n: 0, text: f.message };
      c.n++;
      count.set(f.message.en, c);
    }
  }
  let best: { n: number; text: Text } | null = null;
  for (const c of count.values()) if (!best || c.n > best.n) best = c;
  return best?.text ?? null;
}

/** Labels shown on parts (written in full so Tailwind keeps the classes). */
export const LABEL_TEXT: Record<Label, Text> = {
  fits: { el: 'Χωράει', en: 'Fits' },
  likely: { el: 'Πιθανότατα χωράει', en: 'Likely fits' },
  unverified: { el: 'Χωρίς επιβεβαίωση', en: 'Fit not verified' },
  check: { el: 'Έλεγξε', en: 'Check' },
  no: { el: 'Ασύμβατο', en: 'Incompatible' },
};
