// The builder on the v2 engine (step 5 task 9; replaces v1's rules in builder.ts): the build as engine parts, which
// steps can be skipped, the build's status and the summary's "not checked yet" line. Types only from the engine: the
// findings come from the pick worker (candidates) or the engine's lazy chunk (the build, builderState.ts).
import type { Finding, Part, Resolution, RuleId, Use } from '../engine';
import { slotFields, slotModels, type Build } from './builderData';
import type { Model } from './data';
import { labelOfFinding, type Label } from './fitLabel';
import type { Text } from './i18n';
import { PART_FIELDS, SLOTS, type Slot } from './slots';
import type { BaseListing, StorageListing } from '../types';

/** The builder's in-memory build (rows loaded from the step files). */
export interface ActiveBuild {
  /** Exact loaded choices only; a pinned line without its listing is not checked using a sibling. */
  resolvedOffers?: Partial<Record<Slot | 'storage2', BaseListing | null>>;
  parts: Build;
  storage2?: Model<StorageListing>;
  fanQty: number;
  offers: Partial<Record<Slot | 'storage2', string>>;
  use: Use['kind'] | null;
  res: Resolution | null;
  budget: number | null;
}

/**
 * A builder model as an engine part: the step file's row carries every engine field (derive.ts builderRow writes the
 * model-wide values on it), so the part is the row's `PART_FIELDS` — the same fields pick mode's `toPart` copies.
 */
export function partOf(slot: Slot, m: Model<BaseListing>, quantity = 1, key = m.key): Part {
  const row = m.cheapest as unknown as Record<string, unknown>;
  const fields: Record<string, unknown> = {};
  for (const f of PART_FIELDS[slot]) fields[f] = row[f] ?? null;
  return { category: slot, key, name: m.chip, quantity, fields };
}

/** The existing adapters applied to one exact listing, without borrowing sibling measurements. */
export function fieldsForListing(slot: Slot, listing: BaseListing): Record<string, unknown> {
  const model = slotModels(slot, [listing] as never[])[0];
  const shared = slotFields(slot, model);
  const own = listing as unknown as Record<string, unknown>;
  return Object.fromEntries(PART_FIELDS[slot].map((f) => [f, f in shared ? shared[f] : own[f] ?? null]));
}

/** The build's parts in `SLOTS` order: fans with their quantity, the second drive a part of its own (key `<key>#2`). */
export function toParts(b: ActiveBuild): Part[] {
  const out = SLOTS.filter((s) => b.parts[s]).map((s) => partOf(s, b.parts[s] as never, s === 'fan' ? b.fanQty : 1));
  if (b.storage2) out.push(partOf('storage', b.storage2 as never, 1, `${b.storage2.key}#2`));
  return out.map((part) => {
    const line = part.category === 'storage' && part.key.endsWith('#2') ? 'storage2' : part.category as Slot;
    if (!b.offers[line]) return part;
    const listing = b.resolvedOffers?.[line];
    if (!listing) return { ...part, fields: {} };
    return { ...part, fields: fieldsForListing(part.category as Slot, listing) };
  });
}

/** The engine context the builder adds to the BIOS table (the worker adds that itself: a function can't be posted). */
export const engineUse = (b: Pick<ActiveBuild, 'use' | 'res'>): Use | undefined =>
  b.use ? (b.res ? { kind: b.use, res: b.res } : { kind: b.use }) : undefined;

/**
 * The build without its card and cooler: evaluated, it gives the CPU's own rule 11 / 12 findings that `optionalSlot`
 * reads, also when a card or cooler is chosen (a chosen cooler for an 8600G Box is still optional).
 */
export const withoutOptional = (parts: Part[]): Part[] => parts.filter((p) => p.category !== 'gpu' && p.category !== 'cooler');

/** A finding about the CPU alone (rules 11 and 12 with no cooler / card chosen). */
const alone = (findings: Finding[], rule: RuleId) => findings.find((f) => f.rule === rule && f.parts.length === 1);

/**
 * Can the step be skipped, and why (#8; both modes): the card when the CPU has graphics (rule 12), the cooler when the
 * CPU has one in the box (rule 11), fans always. `findings`: of the build `withoutOptional`; null while the engine
 * hasn't answered (then the card and cooler count as required). With no CPU yet the card is optional and the cooler is
 * not (as v1). Any other part is required.
 */
export function optionalSlot(slot: Slot, findings: Finding[] | null): { optional: boolean; why?: Text } {
  if (slot === 'fan') return { optional: true };
  if (!findings) return { optional: false };
  if (slot === 'gpu') {
    const f = alone(findings, 12);
    if (!f) return { optional: !findings.some((x) => x.rule === 12) };
    if (f.status === 'pass') return { optional: true, why: { el: 'Ο επεξεργαστής έχει ενσωματωμένα γραφικά: η κάρτα είναι προαιρετική.', en: 'The CPU has integrated graphics: a card is optional.' } };
    return { optional: false, why: f.message };
  }
  if (slot === 'cooler') {
    const f = alone(findings, 11);
    if (!f) return { optional: false };
    if (f.status === 'pass') return { optional: true, why: f.message };
    return { optional: false, why: f.message };
  }
  return { optional: false };
}

/** The parts still to choose (C8): every required slot without a part. */
export const missingSlots = (b: Build, findings: Finding[] | null): Slot[] =>
  SLOTS.filter((s) => !b[s] && !optionalSlot(s, findings).optional);

/**
 * The build's status (#18, C8): `missing` while required parts are missing (never "everything fits" for an unfinished
 * build), then `checking` while the engine hasn't answered (null findings: never "everything fits"), then errors, then
 * warnings, else ok; with the count of checks per label. Rules 26–30 are advice (notes): they never set the kind.
 */
export function buildStatus(
  findings: Finding[] | null,
  missing: Slot[],
): { kind: 'missing' | 'checking' | 'error' | 'warning' | 'ok'; counts: Record<Label, number> } {
  const counts: Record<Label, number> = { fits: 0, likely: 0, unverified: 0, check: 0, no: 0 };
  const fit = (findings ?? []).filter((f) => f.rule < 26);
  for (const f of fit) if (f.parts.length > 1) counts[labelOfFinding(f)]++;
  const errors = fit.some((f) => f.status === 'error');
  const warnings = fit.some((f) => f.status === 'warning');
  const kind = missing.length ? 'missing' : !findings ? 'checking' : errors ? 'error' : warnings ? 'warning' : 'ok';
  return { kind, counts };
}

/**
 * Checks whose fields no data has yet (`pick.NOT_IN_DATA`, audit M1): their unknowns are one summary line, not a note
 * each. Rule 24's unknown counts only when it is about the board's USB-C header (the one with a fix); the case's front
 * ports are known for half the cases, so that unknown stays a note of its own.
 */
const NOT_CHECKED: Partial<Record<RuleId, { name: Text; when?: (f: Finding) => boolean }>> = {
  7: { name: { el: 'πάχος κάρτας γραφικών', en: 'graphics card thickness' } },
  15: { name: { el: 'βύσμα ρεύματος κάρτας', en: "card's power connector" } },
  20: { name: { el: 'θέση M.2 PCIe 5.0', en: 'PCIe 5.0 M.2 slot' } },
  24: { name: { el: 'header USB-C μητρικής', en: "board's USB-C header" }, when: (f) => f.fix != null },
};

export const notCheckedYetFinding = (f: Finding): boolean => {
  const c = f.status === 'unknown' ? NOT_CHECKED[f.rule] : undefined;
  return !!c && (!c.when || c.when(f));
};

/** "Δεν ελέγχεται ακόμη: … / Not checked yet: …", or null. */
export function notCheckedYet(findings: Finding[]): { el: string; en: string } | null {
  const rules = [...new Set(findings.filter(notCheckedYetFinding).map((f) => f.rule))].sort((a, b) => a - b);
  if (!rules.length) return null;
  const names = rules.map((r) => NOT_CHECKED[r]!.name as { el: string; en: string });
  return { el: `Δεν ελέγχεται ακόμη: ${names.map((n) => n.el).join(', ')}`, en: `Not checked yet: ${names.map((n) => n.en).join(', ')}` };
}

/** The findings the summary and Review list (passes and the "not checked yet" ones left out), errors first. */
export function shownFindings(findings: Finding[]): Finding[] {
  const order = { error: 0, warning: 1, unknown: 2, note: 3, pass: 4 };
  const seen = new Set<string>();
  return findings
    .filter((f) => f.status !== 'pass' && !notCheckedYetFinding(f))
    .filter((f) => !seen.has(f.message.en) && !!seen.add(f.message.en))
    .sort((a, b) => order[a.status] - order[b.status]);
}

/** Rules 26–30: advice, shown as information whatever their level. */
export const isAdvice = (f: Finding): boolean => f.rule >= 26;

/** States of the engine and the checker, said in one line. */
export const ENGINE_TEXT = {
  checking: { el: 'Έλεγχος συμβατότητας…', en: 'Checking compatibility…' },
  unavailable: {
    el: 'Ο έλεγχος συμβατότητας δεν φόρτωσε· θα ξαναδοκιμάσει στην επόμενη αλλαγή.',
    en: "The compatibility check didn't load; it retries on your next change.",
  },
  checkerFailed: {
    el: 'Ο έλεγχος συμβατότητας δεν φόρτωσε: τα εξαρτήματα εμφανίζονται χωρίς ετικέτα συμβατότητας.',
    en: "The compatibility check didn't load: parts are shown without fit labels.",
  },
} satisfies Record<string, Text>;

export const MISSING: Record<Slot, Text> = {
  cpu: { el: 'Διάλεξε επεξεργαστή.', en: 'Pick a processor.' },
  mobo: { el: 'Διάλεξε μητρική.', en: 'Pick a motherboard.' },
  ram: { el: 'Διάλεξε μνήμη RAM.', en: 'Pick memory (RAM).' },
  gpu: { el: 'Διάλεξε κάρτα γραφικών.', en: 'Pick a graphics card.' },
  cooler: { el: 'Διάλεξε ψύκτρα.', en: 'Pick a cooler.' },
  storage: { el: 'Διάλεξε δίσκο (SSD).', en: 'Pick a drive (SSD).' },
  case: { el: 'Διάλεξε κουτί.', en: 'Pick a case.' },
  fan: { el: 'Διάλεξε ανεμιστήρες.', en: 'Pick fans.' },
  psu: { el: 'Διάλεξε τροφοδοτικό.', en: 'Pick a power supply.' },
};
