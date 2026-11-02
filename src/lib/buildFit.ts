// The product page's "fits your build" (v2 step 4, task 8; docs/redesign-v2.md "Σελίδα προϊόντος" part 4): the
// model's builder candidates from its chunk (ModelEntry.parts: a graphics card per listing, a CPU per chip + cooler in
// the box, any other part the model), what the engine's verdict means for the page, and the add / replace action.
// Pure functions (no React); the check itself is useBuildCheck.ts, the same steps as pick mode.
import type { Finding, Part } from '../engine';
import type { BaseListing, ModelEntry } from '../types';
import { readBuild, setPart, type StoredBuild, type StoredPart } from './buildStore';
import { slotModels, usable, type Slot } from './builderData';
import { partOf, shownOffer, validStored } from './pickBuild';
import { hides } from './pickHide';
import { cpuVersion } from './slots';
import type { Verdict } from './pickProtocol';
import type { Text } from './text';

export interface FitCandidate {
  /** The builder's key (builder.slotModels): what "Add" saves. */
  key: string;
  /** The engine part: the chunk's fields under that key; a card's name is its title, as in pick mode (pick.toPart). */
  part: Part;
  /** The builder offers it (builder.usable: desktop parts); else no "Add" button. */
  offered: boolean;
  /** Its listings' ids (a card: its own listing; a CPU: its Box or Tray offers). */
  listings: string[];
}

/** The model's candidates, in the order of its cheapest listing (ModelEntry.listings is cheapest first). */
export function fitCandidates(slot: Slot, entry: Pick<ModelEntry, 'listings' | 'parts'>): FitCandidate[] {
  const parts = entry.parts;
  if (!parts) return [];
  const out: FitCandidate[] = [];
  for (const m of slotModels(slot, entry.listings as never[])) {
    const fields = Object.prototype.hasOwnProperty.call(parts, m.key) ? parts[m.key] : null;
    if (!fields) continue; // not in the chunk (built from the same listings, so never in practice)
    out.push({
      key: m.key,
      part: { category: slot, key: m.key, name: m.chip, quantity: 1, fields },
      offered: usable[slot](m as never),
      listings: (m.listings as BaseListing[]).map((l) => l.id),
    });
  }
  return out;
}

/**
 * The candidate the page's one button adds (every slot but graphics cards, whose button is per offer). The one the
 * build already holds when it is one of this model's and the check doesn't rule it out (a CPU saved as Tray stays
 * "in your build", never "replace it with itself"); else, as pick mode's row (pickBuild.shownOffer), the version of the
 * cheapest offer that the check doesn't rule out (a CPU's Box or Tray), else the cheapest. `listings` cheapest first;
 * `blocked` = the check rules this key out; `saved` = the key the build holds in this slot.
 */
export function mainCandidate(
  cands: FitCandidate[],
  listings: BaseListing[],
  blocked: (key: string) => boolean,
  saved?: string,
): FitCandidate | undefined {
  const mine = saved === undefined ? undefined : cands.find((c) => c.key === saved);
  if (mine && !blocked(mine.key)) return mine;
  const byListing = new Map<string, FitCandidate>();
  for (const c of cands) for (const id of c.listings) byListing.set(id, c);
  const own = listings.filter((l) => byListing.has(l.id));
  if (!own.length) return cands[0];
  return byListing.get(shownOffer(own, (id) => blocked(byListing.get(id)!.key)).id);
}

/**
 * 'fits': no error, no warning, nothing left unchecked; 'partly': no error or warning, but some checks couldn't be
 * made (notes, unknowns, or saved parts that couldn't be checked at all: "fits as far as we could check"); 'issues':
 * errors or warnings that don't rule it out; 'blocked': ruled out; 'alone': the build has nothing this part's rules
 * check against; 'unchecked': it has, but none of them could be checked (no longer available, chunk failed).
 */
export type FitState = 'checking' | 'timeout' | 'fits' | 'partly' | 'alone' | 'unchecked' | 'blocked' | 'issues';

export interface FitView {
  state: FitState;
  /** Errors and warnings, once each: the errors that rule it out first, then the other errors, then warnings. */
  findings: Finding[];
  /** Notes and unknowns (what couldn't be checked, estimates), once each. */
  notes: Finding[];
  /** The page may add it: not ruled out ("Only compatible" would hide it: no button, as in pick mode). */
  canAdd: boolean;
}

/**
 * What the engine's verdict means for one candidate. As in pick mode (PickView): an error that hides the candidate
 * (pickHide.hides: rule 14 only on a stated basis) rules it out — "Doesn't fit", no "Add"; other errors and warnings
 * are shown and it can be added. Unlike pick mode, the notes and unknowns are listed too, and plain "Fits" is said
 * only when none is left (redesign principle 1: never "compatible" when we don't know).
 */
export function fitView(
  status: 'loading' | 'checking' | 'ready' | 'timeout',
  verdict: Verdict | undefined,
  build: Part[],
  /** Saved parts this slot's rules read that couldn't be checked (useBuildCheck `missing` + `unchecked`). */
  gaps = false,
): FitView {
  if (status === 'timeout') return { state: 'timeout', findings: [], notes: [], canAdd: true };
  if (status !== 'ready' || !verdict) return { state: 'checking', findings: [], notes: [], canAdd: false };
  const seen = new Set<string>();
  const once = verdict.findings.filter((f) => f.status !== 'pass' && !seen.has(f.message.en) && seen.add(f.message.en));
  const rank = (f: Finding) => (hides(f, build) ? 0 : f.status === 'error' ? 1 : 2);
  const findings = once.filter((f) => f.status === 'error' || f.status === 'warning').sort((a, b) => rank(a) - rank(b));
  const notes = once.filter((f) => f.status === 'note' || f.status === 'unknown');
  const blocked = findings.some((f) => hides(f, build));
  const state: FitState = blocked
    ? 'blocked'
    : findings.length
      ? 'issues'
      : !build.length
        ? gaps
          ? 'unchecked'
          : 'alone'
        : notes.length || gaps
          ? 'partly'
          : 'fits';
  return { state, findings, notes, canAdd: !blocked };
}

export type SlotAction =
  | { kind: 'add' }
  | { kind: 'in-build' }
  /** `name`: the saved part's readable name when its stored data has one (a chip, or a readable key), else null. */
  | { kind: 'replace'; name: Text | null }
  /** The build holds the other version (Box / Tray) of this same CPU: "Switch to the Box version". */
  | { kind: 'switch'; name: Text; to: 'box' | 'tray' | null };

/** " (Box)" / " (χωρίς ψύκτρα)" after a CPU's name, from its key, in both languages; '' when the packaging isn't stated. */
export const versionSuffix = (key: string): Text => {
  const v = cpuVersion(key);
  return v === 'box' ? ' (Box)' : v === 'tray' ? { el: ' (χωρίς ψύκτρα)', en: ' (no cooler)' } : '';
};

/** A CPU's name with its version suffix, in both languages. */
export const withVersion = (name: string, key: string): Text => {
  const s = versionSuffix(key);
  return typeof s === 'string' ? name + s : { el: name + s.el, en: name + s.en };
};

/**
 * Add, replace, switch version or already there. The name of a part the build holds comes from its stored fields (a
 * CPU, board or card has `chip`; a CPU also gets its version, "Ryzen 7 7700 (Box)") or its key when the key is readable
 * (RAM "DDR5 32GB (2×16GB) 6000MHz Desktop", PSU "750W Gold ATX"); cases, coolers, fans and drives are saved under
 * letters-and-digits keys with no name, so they are named by slot.
 */
export function slotAction(stored: StoredBuild, slot: Slot, key: string): SlotAction {
  const cur = stored.parts[slot];
  if (!cur) return { kind: 'add' };
  if (cur.key === key) return { kind: 'in-build' };
  const fields = validStored(cur)?.fields ?? {};
  const chip = typeof fields.chip === 'string' && fields.chip.trim() ? fields.chip : null;
  if (slot === 'cpu') {
    const name = withVersion(chip ?? partOf(slot, cur.key, fields).name, cur.key);
    const same = cur.key.slice(0, cur.key.lastIndexOf('|')) === key.slice(0, key.lastIndexOf('|'));
    return same ? { kind: 'switch', name, to: cpuVersion(key) } : { kind: 'replace', name };
  }
  return { kind: 'replace', name: chip ?? (/\s/.test(cur.key) ? cur.key : null) };
}

/**
 * Saves the candidate into the build, exactly as pick mode's "Add to build" does (key, its engine fields, the page's
 * data date), so /builder restores it. Returns the part it replaced (another key in that slot), if any.
 */
export function addToBuild(slot: Slot, cand: FitCandidate, builtAt: string): StoredPart | null {
  const before = readBuild().parts[slot];
  setPart(slot, { key: cand.key, fields: cand.part.fields, builtAt });
  return before && before.key !== cand.key ? before : null;
}

/** The saved build has at least one part (the product page shows its fit section only then). */
export const hasParts = (b: StoredBuild): boolean => Object.keys(b.parts).length > 0;

export { cpuVersion };
