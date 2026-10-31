// Rules about power: 14 PSU wattage (maker figure + the plan's whole-build formula, owner's rule), 15 12V-2x6.
import { cpuPowerRow } from '../data/cpuPower';
import { gpuPowerRow } from '../data/gpuPower';
import { MARGIN, POWER, V1_GPU_PSU, V1_HIGH_END_CPU, V1_HIGH_END_EXTRA_W } from '../tables';
import type { Basis, Build, Finding, Msg, Part } from '../types';
import { all, bool, finding, keys, msg, num, one, str, unknown } from '../util';

/**
 * The recommended PSU by v1's rule: the larger of the card's stated minimum and v1's chip table, plus 100 W
 * for Ryzen 9 / Core i9 / Core Ultra 9. Null when there is no card or neither figure exists (v1's 350 W
 * for a build without a card has no source, so it is not used). Basis "stated" when the card's stated
 * minimum decides (at least the table's figure, no +100 W); "v1-estimate" when the table or the +100 W does.
 */
export function v1RecommendedPsu(gpu: Part | undefined, cpu: Part | undefined): { watts: number; cpuBump: boolean; basis: Basis } | null {
  if (!gpu) return null;
  const chip = str(gpu, 'chip');
  const stated = num(gpu, 'minPsu'), table = (chip && V1_GPU_PSU[chip]) || 0;
  const base = Math.max(stated ?? 0, table);
  if (!base) return null;
  const cpuBump = !!cpu && V1_HIGH_END_CPU.test(cpu.name);
  const basis: Basis = stated !== null && stated >= table && !cpuBump ? 'stated' : 'v1-estimate';
  return { watts: base + (cpuBump ? V1_HIGH_END_EXTRA_W : 0), cpuBump, basis };
}

export interface PowerPart { key: string; label: Msg; watts: number }

/** The CPU term of an AMD chip: its stated default TDP (AMD publishes no PPT). The label says so wherever it is shown. */
const TDP_LABEL = msg('TDP (η AMD δεν δίνει PPT)', 'TDP (AMD gives no PPT)');
export interface PowerEstimate {
  /** Per-part breakdown (card, CPU, board, RAM, drives, fans, pump). */
  parts: PowerPart[];
  /** Sum of `parts`; null when the card's board power, the CPU's power limit or a RAM part's stick count is unknown. */
  totalW: number | null;
  /** ⌈totalW × headroom / roundToW⌉ × roundToW. */
  formulaW: number | null;
  /** When the CPU's power is the only unknown (no CPU chosen, or a CPU without a power-limit row): the formula with the CPU term 0, a lower bound for the build; else null. */
  formulaWithoutCpuW: number | null;
  /** The larger of the card's own stated minimum PSU and the chip maker's system-power figure. */
  makerW: number | null;
  makerFrom: 'card' | 'chip' | null;
  /** What kept totalW null, for messages. */
  missing: Msg[];
}

/** The "no CPU yet" entry of `missing`: not a thing we don't know, so rule 14 words it on its own. */
const NO_CPU = msg('δεν έχεις διαλέξει ακόμα επεξεργαστή', 'no CPU is chosen yet');

/**
 * The plan's power formula (B4) for the whole build: (card board power + CPU power limit + board + 5 W per RAM
 * stick + 8 W per drive + 3 W per fan + 5 W AIO pump) × 1.3, rounded up to 50 W. The card and CPU figures come
 * from the maker-sourced tables; a figure that is not there makes the total unknown, never a guess. With no
 * card the card term is 0. Absent drives and fans count as 0.
 */
export function powerEstimate(b: Build): PowerEstimate {
  const parts: PowerPart[] = [], missing: Msg[] = [];
  const gpu = one(b, 'gpu'), cpu = one(b, 'cpu');
  let cpuUnknown = false;

  const chip = gpu ? str(gpu, 'chip') : null;
  const chipRow = chip ? gpuPowerRow(chip) : undefined;
  if (gpu) {
    if (chipRow?.boardPowerW !== undefined) parts.push({ key: 'gpu', label: msg('Κάρτα γραφικών', 'Graphics card'), watts: chipRow.boardPowerW });
    else missing.push(msg('την κατανάλωση της κάρτας (δεν υπάρχει επίσημη σελίδα για το τσιπ στις πηγές μας)', "the card's board power (the chip has no official page in our tables)"));
  }

  if (cpu) {
    const cpuName = str(cpu, 'chip') ?? cpu.name;
    const row = cpuPowerRow(cpuName);
    if (row) parts.push({ key: 'cpu', label: row.kind === 'TDP' ? TDP_LABEL : msg(`Επεξεργαστής (${row.kind})`, `CPU (${row.kind})`), watts: row.watts });
    else { cpuUnknown = true; missing.push(msg(`την ισχύ του επεξεργαστή (${cpuName}: δεν υπάρχει στις πηγές μας)`, `the CPU's power figure (${cpuName}: not in our tables)`)); }
  } else missing.push(NO_CPU);

  parts.push({ key: 'board', label: msg('Μητρική και υπόλοιπα', 'Motherboard and the rest'), watts: POWER.boardW });

  let sticks = 0, sticksKnown = true;
  for (const r of all(b, 'ram')) {
    const m = num(r, 'modules');
    if (m === null) sticksKnown = false; else sticks += m * r.quantity;
  }
  if (!sticksKnown) missing.push(msg('τον αριθμό των μονάδων μνήμης', 'the number of memory sticks'));
  else if (sticks) parts.push({ key: 'ram', label: msg(`Μνήμη (${sticks} μονάδες)`, `RAM (${sticks} sticks)`), watts: sticks * POWER.perStickW });

  const drives = all(b, 'storage').reduce((n, d) => n + d.quantity, 0);
  if (drives) parts.push({ key: 'storage', label: msg(`Δίσκοι (${drives})`, `Drives (${drives})`), watts: drives * POWER.perDriveW });

  const fans = all(b, 'fan').reduce((n, f) => n + (num(f, 'pack') ?? 1) * f.quantity, 0);
  if (fans) parts.push({ key: 'fan', label: msg(`Ανεμιστήρες (${fans})`, `Fans (${fans})`), watts: fans * POWER.perFanW });

  if (all(b, 'cooler').some((c) => str(c, 'type') === 'AIO')) parts.push({ key: 'pump', label: msg('Αντλία AIO', 'AIO pump'), watts: POWER.pumpW });

  const totalW = missing.length ? null : parts.reduce((s, p) => s + p.watts, 0);
  const roundUp = (x: number) => Math.ceil((x * POWER.headroom) / POWER.roundToW) * POWER.roundToW;
  const formulaW = totalW === null ? null : roundUp(totalW);
  // The CPU's power is the only unknown: the build needs at least this much whatever the CPU draws.
  const formulaWithoutCpuW = (!cpu || cpuUnknown) && missing.length === 1 ? roundUp(parts.reduce((s, p) => s + p.watts, 0)) : null;

  const cardW = gpu ? num(gpu, 'minPsu') : null, chipW = chipRow?.makerPsuW ?? null;
  const makerW = cardW === null && chipW === null ? null : Math.max(cardW ?? 0, chipW ?? 0);
  const makerFrom = makerW === null ? null : (cardW ?? 0) >= (chipW ?? 0) ? 'card' : 'chip';
  return { parts, totalW, formulaW, formulaWithoutCpuW, makerW, makerFrom, missing };
}

/**
 * Rule 14, the owner's rule: below the maker's figure = error; no maker figure and below the formula = error;
 * at/above the maker's figure but below the formula = warning; at/above the maker's figure with the formula at or
 * below it (or unknown) = pass (owner answer 8); when the formula decides, within +10% of it = warning (tight), else
 * pass. Both figures missing = unknown.
 */
export function rule14(b: Build): Finding[] {
  const psu = one(b, 'psu');
  if (!psu) return [];
  const gpu = one(b, 'gpu'), cpu = one(b, 'cpu'), watts = num(psu, 'watts');
  const e = powerEstimate(b);
  const { makerW, formulaW } = e;
  // The CPU is part of the finding only when its power limit went into the figure.
  const ps = keys(psu, gpu, e.parts.some((p) => p.key === 'cpu') ? cpu : undefined);
  const lower = e.formulaWithoutCpuW;
  if (watts !== null && makerW === null && formulaW === null && lower !== null && watts < lower) return [finding(14, 'error', 'estimate', ps,
    msg(`Τροφοδοτικό ${watts} W· ακόμα και χωρίς την ισχύ του επεξεργαστή η εκτίμηση για το build είναι ${lower} W.`,
      `${watts} W power supply; even without the CPU's power the estimate for the build is ${lower} W.`),
    msg(`Διάλεξε τροφοδοτικό τουλάχιστον ${lower} W.`, `Choose a power supply of at least ${lower} W.`))];
  if (watts === null) return [unknown(14, ps, msg(
    'αν φτάνει το τροφοδοτικό: δεν δηλώνει την ισχύ του (W).',
    "whether the power supply is enough: it doesn't state its wattage."),
    msg('Έλεγξε την ισχύ στη σελίδα του τροφοδοτικού.', "Check the wattage on the power supply's page."))];
  if (makerW === null && formulaW === null) return [unknown(14, ps, msg(
    'αν φτάνει το τροφοδοτικό: δεν υπάρχει προτεινόμενη ισχύς για αυτό το build (χωρίς κάρτα, ή κάρτα και επεξεργαστής χωρίς επίσημα στοιχεία).',
    "whether the power supply is enough: there's no recommended wattage for this build (no card, or a card and CPU without official figures)."),
    msg('Έλεγξε την προτεινόμενη ισχύ στις σελίδες του επεξεργαστή και της κάρτας.', "Check the recommended wattage on the CPU's and card's pages."))];

  // What kept the whole-build estimate out: "we don't know <noun phrase>" items, and the no-CPU case worded on its own.
  const unknownItems = e.missing.filter((m) => m !== NO_CPU);
  const reasons: Msg[] = [];
  if (unknownItems.length) reasons.push(msg(`δεν ξέρουμε ${unknownItems.map((m) => m.el).join(', ')}`, `we don't know ${unknownItems.map((m) => m.en).join(', ')}`));
  if (e.missing.includes(NO_CPU)) reasons.push(NO_CPU);
  const why = formulaW === null && reasons.length
    ? { el: ` Η εκτίμηση για όλο το build λείπει: ${reasons.map((m) => m.el).join('· ')}.`, en: ` The whole-build estimate is missing: ${reasons.map((m) => m.en).join('; ')}.` }
    : { el: '', en: '' };
  let f: Msg;
  if (makerW !== null && formulaW !== null) f = msg(`ο κατασκευαστής ζητά ${makerW} W, η εκτίμηση για όλο το build είναι ${formulaW} W`, `the maker asks for ${makerW} W; the estimate for the whole build is ${formulaW} W`);
  else if (makerW !== null) f = msg(`ο κατασκευαστής ζητά ${makerW} W`, `the maker asks for ${makerW} W`);
  else f = msg(`η εκτίμηση για όλο το build είναι ${formulaW} W`, `the estimate for the whole build is ${formulaW} W`);
  // An AMD CPU went into the estimate as its TDP: say so, with the label.
  const tdp = formulaW !== null ? e.parts.find((p) => p.key === 'cpu' && p.label === TDP_LABEL) : undefined;
  if (tdp) f = msg(`${f.el} (επεξεργαστής: ${tdp.watts} W, ${tdp.label.el})`, `${f.en} (CPU: ${tdp.watts} W, ${tdp.label.en})`);
  const need = Math.max(makerW ?? 0, formulaW ?? 0);

  if (makerW !== null && watts < makerW) return [finding(14, 'error', 'stated', ps,
    msg(`Τροφοδοτικό ${watts} W· ${f.el}.${why.el}`, `${watts} W power supply; ${f.en}.${why.en}`),
    msg(`Διάλεξε τροφοδοτικό τουλάχιστον ${need} W.`, `Choose a power supply of at least ${need} W.`))];
  if (makerW === null && formulaW !== null && watts < formulaW) return [finding(14, 'error', 'estimate', ps,
    msg(`Τροφοδοτικό ${watts} W· ${f.el}.`, `${watts} W power supply; ${f.en}.`),
    msg(`Διάλεξε τροφοδοτικό τουλάχιστον ${formulaW} W.`, `Choose a power supply of at least ${formulaW} W.`))];
  // CPU power unknown but a lower bound exists: the full formula is at least that, so reaching the maker's figure without it is level 4.
  if (formulaW === null && lower !== null && makerW !== null && watts < lower) return [finding(14, 'warning', 'estimate', ps,
    msg(`Τροφοδοτικό ${watts} W· φτάνει το νούμερο του κατασκευαστή αλλά όχι την εκτίμηση για όλο το build: ${f.el}· ακόμα και χωρίς την ισχύ του επεξεργαστή η εκτίμηση είναι ${lower} W.${why.el}`,
      `${watts} W power supply; it reaches the maker's figure but not the estimate for the whole build: ${f.en}; even without the CPU's power the estimate is ${lower} W.${why.en}`),
    msg(`Για περιθώριο διάλεξε τροφοδοτικό τουλάχιστον ${lower} W.`, `For headroom choose a power supply of at least ${lower} W.`))];
  if (makerW !== null && formulaW !== null && watts < formulaW) return [finding(14, 'warning', 'estimate', ps,
    msg(`Τροφοδοτικό ${watts} W· φτάνει το νούμερο του κατασκευαστή αλλά όχι την εκτίμηση για όλο το build: ${f.el}.`,
      `${watts} W power supply; it reaches the maker's figure but not the estimate for the whole build: ${f.en}.`),
    msg(`Για περιθώριο διάλεξε τροφοδοτικό τουλάχιστον ${formulaW} W.`, `For headroom choose a power supply of at least ${formulaW} W.`))];

  const basis: Basis = makerW !== null && (formulaW === null || makerW >= formulaW) ? 'stated' : 'estimate';
  // Owner answer 8: reaching the maker's figure when the whole-build formula is at or below it (or missing) is a
  // pass; the +10 % "tight" band applies only when the formula decides.
  if (basis === 'stated') return [finding(14, 'pass', basis, ps, msg(`Τροφοδοτικό ${watts} W· ${f.el}.${why.el}`, `${watts} W power supply; ${f.en}.${why.en}`))];
  const limit = Math.floor(need * (1 + MARGIN.psuShare)) + 1; // the smallest wattage that passes
  if (watts <= need * (1 + MARGIN.psuShare)) return [finding(14, 'warning', basis, ps,
    msg(`Οριακό: τροφοδοτικό ${watts} W· ${f.el}.${why.el}`, `Tight: ${watts} W power supply; ${f.en}.${why.en}`),
    msg(`Ένα τροφοδοτικό τουλάχιστον ${limit} W αφήνει περιθώριο για τις αιχμές.`, `A power supply of at least ${limit} W leaves room for spikes.`))];
  return [finding(14, 'pass', basis, ps, msg(`Τροφοδοτικό ${watts} W· ${f.el}.${why.el}`, `${watts} W power supply; ${f.en}.${why.en}`))];
}

const NEW_CONNECTOR = /12V-?2x6|12VHPWR|16-?pin/i;

export function rule15(b: Build): Finding[] {
  const gpu = one(b, 'gpu'), psu = one(b, 'psu');
  if (!gpu || !psu) return [];
  const ps = keys(gpu, psu), conn = str(gpu, 'powerConnector');
  if (!conn) return [unknown(15, ps, msg('το βύσμα ρεύματος της κάρτας: δεν το δηλώνει.', "the card's power connector: it isn't stated."))];
  if (!NEW_CONNECTOR.test(conn)) return [finding(15, 'pass', 'stated', ps, msg(`Η κάρτα θέλει ${conn}.`, `The card uses ${conn}.`))];
  const native = bool(psu, 'native12v2x6');
  if (native === true) return [finding(15, 'pass', 'stated', ps, msg('Το τροφοδοτικό έχει εγγενές καλώδιο 12V-2x6.', 'The power supply has a native 12V-2x6 cable.'))];
  if (native === false) return [finding(15, 'note', 'stated', ps,
    msg('Η κάρτα θέλει 12V-2x6 και το τροφοδοτικό δεν έχει εγγενές καλώδιο: χρειάζεται αντάπτορας (συνήθως στο κουτί της κάρτας).', 'The card needs 12V-2x6 and the power supply has no native cable: it needs an adapter (usually in the card\'s box).'),
    msg('Χρησιμοποίησε τον αντάπτορα της κάρτας ή διάλεξε τροφοδοτικό ATX 3.x με εγγενές καλώδιο.', "Use the card's adapter or choose an ATX 3.x power supply with a native cable."))];
  if (bool(psu, 'atx3') === true) return [finding(15, 'note', 'estimate', ps,
    msg('Πιθανότατα έχει εγγενές καλώδιο 12V-2x6: τα τροφοδοτικά ATX 3.x συνήθως το έχουν (εκτίμηση).', 'Probably has a native 12V-2x6 cable: ATX 3.x power supplies usually do (estimate).'),
    msg('Έλεγξε τα καλώδια στη σελίδα του τροφοδοτικού.', "Check the cables on the power supply's page."))];
  return [unknown(15, ps, msg('αν το τροφοδοτικό έχει εγγενές καλώδιο 12V-2x6 για την κάρτα.', 'whether the power supply has a native 12V-2x6 cable for the card.'),
    msg('Έλεγξε τα καλώδια στη σελίδα του τροφοδοτικού· αλλιώς χρειάζεται αντάπτορας.', "Check the cables on the power supply's page; otherwise it needs an adapter."))];
}
