// Case fans in the guided builder: what a case includes, and how many fans of which size the build
// should have where (front intake, rear and top exhaust).
//
// Recommendation (owner-approved plan, 2026-10-02): at least 2 front intake + 1 rear exhaust; a
// high-power build gets 3 front + 1 rear + 2 top exhaust (when the case has top positions); with an
// AIO the radiator brings its own fans and takes the top. The case's included fans count towards it.
// Sizes: what the case's maker lists per position (140 mm at the front when it takes as many), else
// 120 mm, which every position takes.

import type { CaseFans, CaseListing, CasePosition } from '../types';
import type { Model } from './data';
import {
  caseFanMounts,
  caseFansIncluded,
  gpuPsu,
  requiredWatts,
  type Build,
} from './builder';
import type { Text } from './i18n';

export const POS_NAME: Record<CasePosition, { el: string; en: string }> = {
  front: { el: 'μπροστά', en: 'front' },
  rear: { el: 'πίσω', en: 'rear' },
  top: { el: 'πάνω', en: 'top' },
  bottom: { el: 'κάτω', en: 'bottom' },
  side: { el: 'πλάι', en: 'side' },
};

/** "Includes fans" without a count (BestPrice's "Προεγκατεστημένοι Ανεμιστήρες"). */
export const caseHasFans = (c: Model<CaseListing>) => c.listings.some((l) => l.hasFans);

const sum = (fs: CaseFans[]) => fs.reduce((n, f) => n + f.n, 0);
const join = (parts: string[], el: boolean) =>
  parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} ${el ? 'και' : 'and'} ${parts[parts.length - 1]}`;

/** "Includes 3 × 120 mm: 2 front, 1 rear" / "No fans included" (only when the maker says so) / "not stated". */
export function includedText(c: Model<CaseListing>): { text: Text; known: boolean } {
  const inc = caseFansIncluded(c);
  if (inc && inc.length === 0) return { text: { el: 'Χωρίς ανεμιστήρες', en: 'No fans included' }, known: true };
  if (inc && inc.length) {
    const sizes = [...new Set(inc.map((f) => f.size))];
    const one = sizes.length === 1 ? sizes[0] : null;
    const placed = inc.every((f) => f.pos);
    const text = (el: boolean): string => {
      const pos = (f: CaseFans) => (el ? POS_NAME[f.pos!].el : POS_NAME[f.pos!].en);
      // "3 × 120 mm: 2 front, 1 rear" | "3: 2 × 160 mm front, 1 × 140 mm rear" | "3 fans" | "2 × 160 mm and 1 × 140 mm"
      if (one && placed) return `${sum(inc)} × ${one} mm: ${inc.map((f) => `${f.n} ${pos(f)}`).join(', ')}`;
      if (one) return `${sum(inc)} × ${one} mm`;
      if (placed && sizes.every(Boolean)) return `${sum(inc)}: ${inc.map((f) => `${f.n} × ${f.size} mm ${pos(f)}`).join(', ')}`;
      if (sizes.every(Boolean)) return join(sizes.map((s) => `${sum(inc.filter((f) => f.size === s))} × ${s} mm`), el);
      return `${sum(inc)} ${el ? 'ανεμιστήρες' : 'fans'}`;
    };
    return { text: { el: `Περιλαμβάνει ${text(true)}`, en: `Includes ${text(false)}` }, known: true };
  }
  if (caseHasFans(c)) return { text: { el: 'Περιλαμβάνει ανεμιστήρες (δεν αναφέρεται πόσους)', en: 'Includes fans (number not stated)' }, known: true };
  return { text: { el: 'Ανεμιστήρες στο κουτί: δεν αναφέρεται', en: 'Fans in the box: not stated' }, known: false };
}

/** Build that needs more airflow: a ≥ 750 W recommendation, a top CPU or a TDP of 125 W and up. */
export function highPower(b: Build): boolean {
  const watts = requiredWatts(b) ?? 0;
  const gpu = b.gpu ? (gpuPsu(b.gpu.cheapest) ?? 0) : 0;
  const cpu = b.cpu ? /^(Ryzen 9|Core i9|Core Ultra 9)\b/.test(b.cpu.chip) || (b.cpu.cheapest.tdp ?? 0) >= 125 : false;
  return watts >= 750 || gpu >= 750 || cpu;
}

type Want = { pos: 'front' | 'rear' | 'top'; n: number };

export interface FanPlan {
  /** Fans to add per position, with the size to buy. */
  add: { pos: 'front' | 'rear' | 'top'; n: number; size: number }[];
  total: number;
  high: boolean;
  aio: boolean;
  /** The case's maker lists positions per size; else sizes are the safe 120 mm. */
  sizesKnown: boolean;
  /** No top positions known while a high-power build would use them. */
  topUnknown: boolean;
}

/** How many fans to add where, for the build's case (or a case of unknown layout when none is chosen). */
export function fanPlan(b: Build): FanPlan {
  const high = highPower(b);
  const aio = b.cooler?.cheapest.type === 'AIO';
  const mounts = b.case ? caseFanMounts(b.case) : null;
  const inc = b.case ? (caseFansIncluded(b.case) ?? []) : [];
  const want: Want[] = [
    { pos: 'front', n: high ? 3 : 2 },
    { pos: 'rear', n: 1 },
    // With an AIO the radiator (and its fans) goes on top.
    { pos: 'top', n: high && !aio ? 2 : 0 },
  ];
  const posMounts = (pos: CasePosition) => (mounts ?? []).filter((m) => m.pos === pos);
  const hasTop = mounts ? posMounts('top').length > 0 : false;
  // Included fans without a position count at the front first, then the rear.
  let loose = inc.filter((f) => !f.pos).reduce((n, f) => n + f.n, 0);
  const add: FanPlan['add'] = [];
  for (const w of want) {
    if (w.pos === 'top' && (!mounts || !hasTop)) continue;
    const here = posMounts(w.pos);
    const most = (size: number) => Math.max(0, ...here.filter((m) => m.size === size).map((m) => m.n));
    // The size: the included fans' size where the case already has some (a front that takes "3 × 120
    // or 2 × 140" and holds 2 × 140 is full); else 140 mm at the front when the case takes as many
    // 140s; else 120 mm, which fits every position (or the only size the maker lists there).
    const there = inc.find((f) => f.pos === w.pos && f.size);
    let size = 120;
    if (there) size = there.size!;
    else if (here.length && w.pos === 'front' && most(140) >= w.n) size = 140;
    else if (here.length && most(120) === 0) size = here[0].size ?? 120;
    // No more than the position takes (when the maker says).
    const need = here.length ? Math.min(w.n, most(size)) : w.n;
    let have = inc.filter((f) => f.pos === w.pos).reduce((n, f) => n + f.n, 0);
    if (w.pos !== 'top' && loose > 0) {
      const take = Math.min(loose, Math.max(0, need - have));
      have += take;
      loose -= take;
    }
    if (need - have > 0) add.push({ pos: w.pos, n: need - have, size });
  }
  return {
    add,
    total: add.reduce((n, a) => n + a.n, 0),
    high,
    aio,
    sizesKnown: !!mounts,
    topUnknown: high && !aio && !hasTop,
  };
}

/** "Add 2 × 140 mm front intake and 1 × 120 mm rear exhaust." */
export function planText(p: FanPlan): Text {
  const role = (pos: string, el: boolean) =>
    pos === 'front' ? (el ? 'εισαγωγή μπροστά' : 'front intake') : pos === 'rear' ? (el ? 'εξαγωγή πίσω' : 'rear exhaust') : el ? 'εξαγωγή πάνω' : 'top exhaust';
  const items = (el: boolean) => p.add.map((a) => `${a.n} × ${a.size} mm ${role(a.pos, el)}`);
  const lead = p.high
    ? { el: 'Σύνθεση υψηλής ισχύος: ', en: 'High-power build: ' }
    : { el: '', en: '' };
  if (p.total === 0)
    return {
      el: `${lead.el}${p.high ? 'οι' : 'Οι'} ανεμιστήρες του κουτιού καλύπτουν την πρόταση.`,
      en: `${lead.en}${p.high ? 'the' : 'The'} case's own fans cover the recommendation.`,
    };
  const top = p.topUnknown
    ? { el: ' (και 2 εξαγωγής πάνω, αν το κουτί έχει θέσεις εκεί)', en: ' (and 2 top exhaust, if the case has positions there)' }
    : { el: '', en: '' };
  const add = { el: p.high ? 'πρόσθεσε' : 'Πρόσθεσε', en: p.high ? 'add' : 'Add' };
  return {
    el: `${lead.el}${add.el} ${join(items(true), true)}${top.el}.`,
    en: `${lead.en}${add.en} ${join(items(false), false)}${top.en}.`,
  };
}
