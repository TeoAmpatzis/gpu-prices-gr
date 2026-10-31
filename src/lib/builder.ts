// PC builder: which parts can go together, from the specs the sites and makers state.
//
// Every check between two chosen parts gives one of four results (owner's rule, 2026-10-01):
//   fits        both measurements are known and they fit
//   likely      fits by an estimate with a safe margin (graphics chip lengths, board size by case size,
//               fan positions counted without their sizes, a 120 mm radiator where only positions are known)
//   unverified  a measurement is missing: shown, labelled "Fit not verified"
//   no          definitely doesn't fit: the only case where a part is hidden
// A part's label is its worst check against the parts already chosen. Parts the builder can't place
// at all (server/workstation parts, laptop RAM, non-ATX power supplies) are still left out.
// Measurements come from Skroutz/BestPrice product pages (scraper/specs.py) and makers' pages.

import { BOARD_BY_CASE_SIZE } from './categories';
import {
  ESTIMATE,
  NO_CONTEXT,
  boardFits,
  caseBoardStated,
  caseCoolerMax,
  caseFanMounts,
  caseFanSlots,
  caseFansIncluded,
  caseGpuMax,
  caseRadiatorSizes,
  caseRadiators,
  coolerHeight,
  coolerSockets,
  cpuCooler,
  cpuHasIgpu,
  cpuSocket,
  gpuLength,
  gpuPsu,
  gpuWaterCooled,
  moboForm,
  moboMemory,
  moboSlotsStated,
  moboSocket,
  usable,
  type FitContext,
  type SlotListing,
} from './builderData';
import type { Model } from './data';
import { tr, type Text } from './i18n';
import { SLOTS, type Slot } from './slots';
// Data shaping (usable, slotModels, fitContext, the part values) lives in builderData.ts since task 7; re-exported
// here until task 9 replaces this file's v1 rules with the engine.
export * from './builderData';
// SLOTS: in the order the guide walks through them (slots.ts, so the build store loads without this file).
export { SLOTS, type Slot } from './slots';
/** Parts a build can be finished without (the GPU needs an iGPU, the cooler a boxed one; see notes). */
export const OPTIONAL: Slot[] = ['gpu', 'cooler', 'fan'];

export type Build = { [S in Slot]?: Model<SlotListing[S]> };
type Note = { level: 'error' | 'info'; text: Text };

// ---------- Fit results ----------

export type Fit = 'fits' | 'likely' | 'unverified' | 'no';
const FIT_RANK: Record<Fit, number> = { fits: 0, likely: 1, unverified: 2, no: 3 };
const worse = (a: Fit, b: Fit): Fit => (FIT_RANK[b] > FIT_RANK[a] ? b : a);

/** One check between two parts; `why` explains anything short of "fits". */
interface Check {
  slots: [Slot, Slot];
  fit: Fit;
  why?: Text;
}
/** A part's standing against the parts already chosen; `fit` is null when nothing was checked. */
export interface Rating {
  fit: Fit | null;
  reasons: Text[];
}


/** Top-tier desktop CPUs draw well over their rated TDP under load; give them extra headroom. */
const HIGH_END_CPU = /^(Ryzen 9|Core i9|Core Ultra 9)\b/;
const NO_GPU_PSU = 350;

/** Smallest PSU the build should have, or null until a CPU or GPU is chosen. */
export function requiredWatts(b: Build): number | null {
  if (!b.cpu && !b.gpu) return null;
  const base = b.gpu ? (gpuPsu(b.gpu.cheapest) ?? NO_GPU_PSU) : NO_GPU_PSU;
  return base + (b.cpu && HIGH_END_CPU.test(b.cpu.chip) ? 100 : 0);
}



// ---------- Checks between two parts ----------

const W = {
  coolerSockets: { el: 'Δεν αναφέρονται τα socket της ψύκτρας.', en: "The cooler's sockets are not stated." },
  ramSlots: { el: 'Δεν αναφέρεται πόσες υποδοχές RAM έχει η μητρική.', en: "The board's number of RAM slots is not stated." },
  boardGuess: {
    el: 'Το μέγιστο μέγεθος μητρικής του κουτιού εκτιμάται από το μέγεθός του.',
    en: "The case's largest board size is estimated from the case size.",
  },
  boardUnknown: { el: 'Δεν αναφέρεται ποιες μητρικές χωράει το κουτί.', en: 'The board sizes the case takes are not stated.' },
  gpuMaxUnknown: {
    el: 'Δεν αναφέρεται το μέγιστο μήκος κάρτας γραφικών του κουτιού.',
    en: "The case's maximum graphics card length is not stated.",
  },
  gpuLengthUnknown: { el: 'Δεν αναφέρεται το μήκος της κάρτας γραφικών.', en: "The graphics card's length is not stated." },
  coolerHeightUnknown: {
    el: 'Δεν αναφέρεται το ύψος της ψύκτρας ή το μέγιστο ύψος ψύκτρας του κουτιού.',
    en: "The cooler's height or the case's maximum cooler height is not stated.",
  },
  radiatorUnknown: { el: 'Δεν αναφέρονται θέσεις ψυγείου στο κουτί.', en: 'The case states no radiator positions.' },
  fanSlotsUnknown: { el: 'Δεν αναφέρονται οι θέσεις ανεμιστήρων του κουτιού.', en: "The case's fan positions are not stated." },
  fanSizesUnknown: {
    el: 'Αναφέρεται μόνο ο αριθμός θέσεων ανεμιστήρων, όχι τα μεγέθη τους.',
    en: 'Only the number of fan positions is stated, not their sizes.',
  },
  fansTaken: {
    el: 'Κάποιες από αυτές τις θέσεις έχουν ήδη ανεμιστήρες του κουτιού.',
    en: 'Some of those positions already hold the case’s own fans.',
  },
  sffPsu: {
    el: 'Μικρά κουτιά (SFF) συχνά θέλουν τροφοδοτικό SFX· δεν αναφέρεται.',
    en: 'Small (SFF) cases often need an SFX power supply; not stated.',
  },
  bay35: {
    el: 'Έλεγξε ότι το κουτί έχει θέση για δίσκο 3.5″ (πολλά νέα κουτιά δεν έχουν)· οι θέσεις δίσκων δεν αναφέρονται εδώ.',
    en: 'Check that the case has a 3.5" drive bay (many new cases have none); drive bays are not listed here.',
  },
} satisfies Record<string, Text>;

const gpuEstimate = (chip: string, max: number, ctx: FitContext): Text | null => {
  const c = ctx.chips.get(chip);
  if (!c || max < c.max + ESTIMATE.marginMm) return null;
  return {
    el: `Εκτίμηση: οι ${c.cards} μετρημένες κάρτες ${chip} έχουν μήκος ${c.min}–${c.max} mm και το κουτί χωράει έως ${max} mm.`,
    en: `Estimate: the ${c.cards} measured ${chip} cards are ${c.min}–${c.max} mm long and the case takes up to ${max} mm.`,
  };
};

const tooManyFans = (pack: number, slots: number): Text => ({
  el: `${pack} ανεμιστήρες, το κουτί έχει ${slots} θέσεις.`,
  en: `${pack} fans; the case has ${slots} fan positions.`,
});

/** Every check between the parts of a complete or partial build. */
function checks(b: Build, ctx: FitContext): Check[] {
  const out: Check[] = [];
  const add = (slots: [Slot, Slot], fit: Fit, why?: Text) => out.push({ slots, fit, why });

  // A clash says why too: the guided builder shows clashing parts greyed out with the reason.
  const either = (slots: [Slot, Slot], ok: boolean, why: Text) => (ok ? add(slots, 'fits') : add(slots, 'no', why));

  if (b.cpu && b.mobo) {
    const [c, m] = [cpuSocket(b.cpu), moboSocket(b.mobo)];
    either(['cpu', 'mobo'], c === m, { el: `Socket ${c} ≠ μητρικής ${m}.`, en: `Socket ${c} ≠ the board's ${m}.` });
  }
  if (b.cpu && b.cooler) {
    const sockets = coolerSockets(b.cooler);
    const socket = cpuSocket(b.cpu) ?? '';
    if (!sockets.length) add(['cpu', 'cooler'], 'unverified', W.coolerSockets);
    else
      either(['cpu', 'cooler'], sockets.includes(socket), {
        el: `Η ψύκτρα δεν υποστηρίζει ${socket}.`,
        en: `The cooler doesn't support ${socket}.`,
      });
  }
  if (b.mobo && b.ram) {
    const sticks = b.ram.cheapest.modules;
    const slots = moboSlotsStated(b.mobo);
    const memory = moboMemory(b.mobo);
    if (memory !== b.ram.cheapest.type)
      add(['mobo', 'ram'], 'no', {
        el: `Η μητρική θέλει ${memory}, η μνήμη είναι ${b.ram.cheapest.type}.`,
        en: `The board takes ${memory}; this memory is ${b.ram.cheapest.type}.`,
      });
    else if (slots != null)
      either(['mobo', 'ram'], sticks <= slots, {
        el: `${sticks} τεμάχια, η μητρική έχει ${slots} υποδοχές.`,
        en: `${sticks} sticks; the board has ${slots} slots.`,
      });
    else add(['mobo', 'ram'], sticks <= 2 ? 'fits' : 'unverified', W.ramSlots);
  }
  if (b.mobo && b.case) {
    const stated = caseBoardStated(b.case);
    const form = moboForm(b.mobo);
    if (form === 'Άλλο') add(['mobo', 'case'], 'unverified', W.boardUnknown); // size unknown (the shops disagree)
    else if (stated)
      either(['mobo', 'case'], boardFits(form, stated), {
        el: `Μητρική ${form}, το κουτί χωράει έως ${stated}.`,
        en: `${form} board; the case takes up to ${stated}.`,
      });
    else if (b.case.cheapest.size !== 'Άλλο' && boardFits(form, BOARD_BY_CASE_SIZE[b.case.cheapest.size]))
      add(['mobo', 'case'], 'likely', W.boardGuess);
    else add(['mobo', 'case'], 'unverified', W.boardUnknown);
  }
  if (b.gpu && b.case) {
    const max = caseGpuMax(b.case);
    const len = gpuLength(b.gpu);
    if (max == null) add(['gpu', 'case'], 'unverified', W.gpuMaxUnknown);
    else if (len != null)
      either(['gpu', 'case'], len <= max, {
        el: `Κάρτα ${len} mm, το κουτί χωράει έως ${max} mm.`,
        en: `${len} mm card; the case takes up to ${max} mm.`,
      });
    else {
      const est = gpuWaterCooled(b.gpu.cheapest) ? null : gpuEstimate(b.gpu.cheapest.chip, max, ctx);
      add(['gpu', 'case'], est ? 'likely' : 'unverified', est ?? W.gpuLengthUnknown);
    }
  }
  if (b.cooler && b.case) {
    if (b.cooler.cheapest.type === 'AIO') {
      const size = b.cooler.cheapest.radiator;
      const sizes = caseRadiatorSizes(b.case);
      const mounts = caseRadiators(b.case);
      if (sizes && size != null) {
        // A position taking a 360 also takes a 240 or 120 (same fan width), not a 280 (140 mm fans).
        const width = (s: number) => (s % 140 === 0 && s % 120 !== 0 ? 140 : 120);
        const listed = [...new Set(sizes.flatMap((r) => r.sizes))].sort((a, b) => a - b);
        if (listed.some((s) => s === size || (width(s) === width(size) && s >= size))) add(['cooler', 'case'], 'fits');
        else
          // Not hidden: a maker's list read wrongly must never hide a part that fits.
          add(['cooler', 'case'], 'unverified', {
            el: `Ο κατασκευαστής του κουτιού αναφέρει ψυγεία ${listed.join('/')} mm· ψυγείο ${size} mm δεν αναφέρεται.`,
            en: `The case maker lists ${listed.join('/')} mm radiators; a ${size} mm one isn't listed.`,
          });
      } else if (mounts && size === 120)
        add(['cooler', 'case'], 'likely', {
          el: `Το κουτί έχει θέσεις ψυγείου (${mounts}) και κάθε θέση δέχεται 120 mm· τα μεγέθη δεν αναφέρονται.`,
          en: `The case has radiator positions (${mounts}) and any position takes 120 mm; sizes are not stated.`,
        });
      else if (mounts)
        add(['cooler', 'case'], 'unverified', {
          el: `Θέσεις ψυγείου: ${mounts}· δεν αναφέρεται αν χωράει ψυγείο ${size ?? ''} mm.`,
          en: `Radiator positions: ${mounts}; whether a ${size ?? ''} mm radiator fits is not stated.`,
        });
      else add(['cooler', 'case'], 'unverified', W.radiatorUnknown);
    } else {
      const h = coolerHeight(b.cooler);
      const max = caseCoolerMax(b.case);
      if (h == null || max == null) add(['cooler', 'case'], 'unverified', W.coolerHeightUnknown);
      else
        either(['cooler', 'case'], h <= max, {
          el: `Ψύκτρα ${h} mm, το κουτί χωράει έως ${max} mm.`,
          en: `${h} mm cooler; the case takes up to ${max} mm.`,
        });
    }
  }
  if (b.fan && b.case) {
    const { size, pack } = b.fan.cheapest;
    const mounts = caseFanMounts(b.case);
    const slots = caseFanSlots(b.case);
    if (mounts) {
      // Per position the maker lists alternatives ("3 × 120 or 2 × 140"); count this size only.
      const total = mounts.filter((f) => f.size === size).reduce((n, f) => n + f.n, 0);
      const taken = (caseFansIncluded(b.case) ?? []).filter((f) => f.size === size).reduce((n, f) => n + f.n, 0);
      if (pack <= total - taken) add(['fan', 'case'], 'fits');
      else if (pack <= total) add(['fan', 'case'], 'likely', W.fansTaken);
      // More fans than the maker lists positions for: hidden only if the shop's total count agrees.
      else if (slots != null && pack > slots) add(['fan', 'case'], 'no', tooManyFans(pack, slots));
      else
        add(['fan', 'case'], 'unverified', {
          el: `Ο κατασκευαστής αναφέρει ${total} θέσεις ${size} mm.`,
          en: `The maker lists ${total} positions for ${size} mm fans.`,
        });
    } else if (slots == null) add(['fan', 'case'], 'unverified', W.fanSlotsUnknown);
    else if (pack > slots) add(['fan', 'case'], 'no', tooManyFans(pack, slots));
    else add(['fan', 'case'], size === 120 ? 'likely' : 'unverified', W.fanSizesUnknown);
  }
  // Drive bays aren't in the data (owner: a separate task); M.2 and 2.5" drives go anywhere.
  if (b.storage && b.case && b.storage.cheapest.formFactor === '3.5"') add(['storage', 'case'], 'unverified', W.bay35);
  if (b.psu) {
    const watts = requiredWatts(b);
    if (watts != null) {
      const ok = b.psu.cheapest.watts >= watts;
      const why = {
        el: `Τροφοδοτικό ${b.psu.cheapest.watts} W, χρειάζεται τουλάχιστον ${watts} W.`,
        en: `${b.psu.cheapest.watts} W power supply; at least ${watts} W is needed.`,
      };
      if (b.gpu) either(['psu', 'gpu'], ok, why);
      if (b.cpu) either(['psu', 'cpu'], ok, why);
    }
    if (b.case?.cheapest.size === 'SFF / Cube') add(['psu', 'case'], 'unverified', W.sffPsu);
  }
  return out;
}

const worst = (cs: Check[]): Fit | null => (cs.length ? cs.reduce<Fit>((f, c) => worse(f, c.fit), 'fits') : null);
const reasonsOf = (cs: Check[]) => cs.filter((c) => c.fit !== 'fits' && c.why).map((c) => c.why!);

/** How part `m` for `slot` stands against the rest of the build (the slot's current part ignored). */
export function rate<S extends Slot>(slot: S, m: Model<SlotListing[S]>, build: Build, ctx: FitContext = NO_CONTEXT): Rating {
  const mine = checks({ ...build, [slot]: m }, ctx).filter((c) => c.slots.includes(slot));
  return { fit: worst(mine), reasons: reasonsOf(mine) };
}

// ---------- Rules ----------


/** Models for `slot` that can be offered and don't definitely clash with the rest of the build. */
export function candidates<S extends Slot>(
  slot: S,
  models: Model<SlotListing[S]>[],
  build: Build,
  ctx: FitContext = NO_CONTEXT,
): Model<SlotListing[S]>[] {
  const rest: Build = { ...build, [slot]: undefined };
  return models.filter((m) => usable[slot](m) && rate(slot, m, rest, ctx).fit !== 'no');
}

/** Every model `slot` can offer with its rating against the rest of the build, clashes included
 * (the guided builder shows them greyed out when "Only compatible" is off). */
export function rateAll<S extends Slot>(
  slot: S,
  models: Model<SlotListing[S]>[],
  build: Build,
  ctx: FitContext = NO_CONTEXT,
): { m: Model<SlotListing[S]>; rating: Rating }[] {
  const rest: Build = { ...build, [slot]: undefined };
  return models.filter((m) => usable[slot](m)).map((m) => ({ m, rating: rate(slot, m, rest, ctx) }));
}

/** How many checks between the chosen parts fit, are estimates, can't be verified or clash. */
export function buildStatus(b: Build, ctx: FitContext = NO_CONTEXT): Record<Fit, number> {
  const out: Record<Fit, number> = { fits: 0, likely: 0, unverified: 0, no: 0 };
  for (const c of checks(b, ctx)) out[c.fit]++;
  return out;
}


/** What is still missing, what doesn't fit, and what the builder couldn't verify; shown next to the total. */
export function buildNotes(b: Build, ctx: FitContext = NO_CONTEXT): Note[] {
  const notes: Note[] = [];
  for (const s of SLOTS) {
    if (b[s] || OPTIONAL.includes(s)) continue;
    notes.push({ level: 'error', text: MISSING[s] });
  }
  if (b.cpu && !b.gpu && !cpuHasIgpu(b.cpu)) {
    notes.push({
      level: 'error',
      text: {
        el: 'Ο επεξεργαστής δεν έχει ενσωματωμένα γραφικά: χρειάζεται κάρτα γραφικών.',
        en: 'The CPU has no integrated graphics: a graphics card is needed.',
      },
    });
  }
  if (b.cpu && !b.cooler) {
    const inBox = cpuCooler(b.cpu);
    notes.push(
      inBox
        ? {
            level: 'info',
            text: {
              el: 'Ο επεξεργαστής έχει ψύκτρα στο κουτί. Αρκεί για κανονική χρήση· για gaming/overclock μια καλύτερη βοηθά.',
              en: 'The CPU comes with a cooler. Fine for normal use; a better one helps for gaming/overclocking.',
            },
          }
        : {
            level: 'error',
            text:
              inBox === false
                ? { el: 'Ο επεξεργαστής δεν έχει ψύκτρα: διάλεξε μία.', en: 'The CPU has no cooler: pick one.' }
                : {
                    el: 'Δεν αναφέρεται αν ο επεξεργαστής έχει ψύκτρα: διάλεξε μία για σιγουριά.',
                    en: "It isn't stated whether the CPU includes a cooler: pick one to be safe.",
                  },
          },
    );
  }
  // Checks between the chosen parts: a clash (a saved build whose data changed) is an error; an
  // estimate or a missing measurement is explained.
  for (const c of checks(b, ctx)) {
    if (c.fit === 'no') {
      notes.push({ level: 'error', text: clash(c.slots) });
    } else if (c.fit !== 'fits' && c.why) {
      const label = FIT_LABEL[c.fit];
      notes.push({
        level: 'info',
        text: { el: `${tr('el', label)}: ${tr('el', c.why)}`, en: `${tr('en', label)}: ${tr('en', c.why)}` },
      });
    }
  }
  if (b.gpu && !b.case && gpuLength(b.gpu) != null) {
    notes.push({
      level: 'info',
      text: {
        el: `Η κάρτα γραφικών έχει μήκος ${gpuLength(b.gpu)} mm: κουτιά που σίγουρα δεν τη χωράνε δεν εμφανίζονται.`,
        en: `The graphics card is ${gpuLength(b.gpu)} mm long: cases that certainly can't fit it are hidden.`,
      },
    });
  }
  if (b.storage?.cheapest.pcie === 5) {
    notes.push({
      level: 'info',
      text: {
        el: 'Ο δίσκος είναι PCIe 5.0: για όλη την ταχύτητά του η μητρική χρειάζεται υποδοχή M.2 PCIe 5.0 (σε άλλη υποδοχή δουλεύει πιο αργά).',
        en: 'The drive is PCIe 5.0: the board needs a PCIe 5.0 M.2 slot for its full speed (it works more slowly in other slots).',
      },
    });
  }
  if (b.case && !caseFanMounts(b.case)) {
    const slots = caseFanSlots(b.case);
    if (slots != null) {
      notes.push({
        level: 'info',
        text: {
          el: `Το κουτί έχει ${slots} θέσεις ανεμιστήρων (κάποιες μπορεί να έχουν ήδη ανεμιστήρα).`,
          en: `The case has ${slots} fan positions (some may already have fans).`,
        },
      });
    }
  }
  return notes;
}

/** Labels shown on parts (picker, chosen parts) and in the notes. */
export const FIT_LABEL: Record<Exclude<Fit, 'no'>, Text> = {
  fits: { el: 'Χωράει', en: 'Fits' },
  likely: { el: 'Πιθανότατα χωράει', en: 'Likely fits' },
  unverified: { el: 'Χωρίς επιβεβαίωση', en: 'Fit not verified' },
};

const SLOT_NAME: Record<Slot, { el: string; en: string }> = {
  cpu: { el: 'επεξεργαστής', en: 'CPU' },
  mobo: { el: 'μητρική', en: 'motherboard' },
  ram: { el: 'μνήμη', en: 'memory' },
  gpu: { el: 'κάρτα γραφικών', en: 'graphics card' },
  cooler: { el: 'ψύκτρα', en: 'cooler' },
  storage: { el: 'δίσκος', en: 'drive' },
  case: { el: 'κουτί', en: 'case' },
  fan: { el: 'ανεμιστήρες', en: 'fans' },
  psu: { el: 'τροφοδοτικό', en: 'power supply' },
};
const clash = ([a, b]: [Slot, Slot]): Text => ({
  el: `Ασυμβατότητα: ${SLOT_NAME[a].el} και ${SLOT_NAME[b].el} δεν ταιριάζουν· άλλαξε ένα από τα δύο.`,
  en: `Incompatible: the ${SLOT_NAME[a].en} and the ${SLOT_NAME[b].en} don't go together; change one of them.`,
});

const MISSING: Record<Slot, Text> = {
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
