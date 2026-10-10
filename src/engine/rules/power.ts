// Rules about power: 14 PSU wattage (v1's estimate until the plan's TBP/PPT formula has tables), 15 12V-2x6.
import { MARGIN, V1_GPU_PSU, V1_HIGH_END_CPU, V1_HIGH_END_EXTRA_W } from '../tables';
import type { Basis, Build, Finding, Part } from '../types';
import { bool, finding, keys, msg, num, one, str, unknown } from '../util';

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

export function rule14(b: Build): Finding[] {
  const psu = one(b, 'psu');
  if (!psu) return [];
  const gpu = one(b, 'gpu'), cpu = one(b, 'cpu'), watts = num(psu, 'watts');
  const rec = v1RecommendedPsu(gpu, cpu);
  const ps = keys(psu, gpu, rec?.cpuBump ? cpu : undefined);
  if (!rec || watts === null) return [unknown(14, keys(psu, gpu, cpu), msg(
    'αν φτάνει το τροφοδοτικό: δεν υπάρχει προτεινόμενη ισχύς για αυτό το build (χωρίς κάρτα, ή κάρτα χωρίς στοιχεία).',
    "whether the power supply is enough: there's no recommended wattage for this build (no card, or a card without figures)."),
    msg('Έλεγξε την προτεινόμενη ισχύ στις σελίδες του επεξεργαστή και της κάρτας.', "Check the recommended wattage on the CPU's and card's pages."))];
  const why = rec.cpuBump ? { el: ' (με +100 W για τον επεξεργαστή)', en: ' (with +100 W for the CPU)' } : { el: '', en: '' };
  const est = rec.basis === 'v1-estimate' ? { el: ' Εκτίμηση v1.', en: ' v1 estimate.' } : { el: '', en: '' };
  if (watts < rec.watts) return [finding(14, 'error', rec.basis, ps,
    msg(`Τροφοδοτικό ${watts} W, προτείνονται τουλάχιστον ${rec.watts} W${why.el}.${est.el}`, `${watts} W power supply; at least ${rec.watts} W is recommended${why.en}.${est.en}`),
    msg(`Διάλεξε τροφοδοτικό τουλάχιστον ${rec.watts} W.`, `Choose a power supply of at least ${rec.watts} W.`))];
  if (watts <= rec.watts * (1 + MARGIN.psuShare)) return [finding(14, 'warning', rec.basis, ps,
    msg(`Οριακό: τροφοδοτικό ${watts} W, προτείνονται ${rec.watts} W${why.el}.${est.el}`, `Tight: ${watts} W power supply; ${rec.watts} W is recommended${why.en}.${est.en}`),
    msg(`Ένα τροφοδοτικό πάνω από ${Math.ceil(rec.watts * (1 + MARGIN.psuShare))} W αφήνει περιθώριο για τις αιχμές.`, `A power supply above ${Math.ceil(rec.watts * (1 + MARGIN.psuShare))} W leaves room for spikes.`))];
  return [finding(14, 'pass', rec.basis, ps,
    msg(`Τροφοδοτικό ${watts} W, προτείνονται ${rec.watts} W${why.el}.${est.el}`, `${watts} W power supply; ${rec.watts} W is recommended${why.en}.${est.en}`))];
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
