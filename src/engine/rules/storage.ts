// Rules about drives on the board: 17 M.2 slots, 18 SATA ports (and M.2/SATA sharing), 20 PCIe 5.0 drives.
import type { Build, Finding, Part } from '../types';
import { all, finding, keys, msg, num, one, str, unknown } from '../util';

const isM2 = (d: Part) => /^M\.2/i.test(str(d, 'formFactor') ?? '');
/** A drive on a SATA cable (2.5"/3.5"); an M.2 SATA drive sits in an M.2 slot instead. */
const onSataPort = (d: Part) => str(d, 'iface') === 'SATA' && !isM2(d);
const count = (ds: Part[]) => ds.reduce((s, d) => s + d.quantity, 0);

export function rule17(b: Build): Finding[] {
  const mobo = one(b, 'mobo'), drives = all(b, 'storage');
  if (!mobo || !drives.length) return [];
  const m2 = drives.filter(isM2), n = count(m2), ps = keys(mobo, ...m2);
  if (!n) return [finding(17, 'pass', 'stated', keys(mobo), msg('Κανένας δίσκος M.2.', 'No M.2 drives.'))];
  const slots = num(mobo, 'm2Slots');
  if (slots === null) return [unknown(17, ps, msg(`αν χωράνε ${n} δίσκοι M.2: η μητρική δεν δηλώνει θέσεις M.2.`, `whether ${n} M.2 drive(s) fit: the board doesn't state its M.2 slots.`),
    msg('Έλεγξε τις θέσεις M.2 στη σελίδα της μητρικής.', "Check the M.2 slots on the board's page."))];
  if (n <= slots) return [finding(17, 'pass', 'stated', ps, msg(`${n} δίσκοι M.2 σε ${slots} θέσεις.`, `${n} M.2 drive(s) in ${slots} slots.`))];
  return [finding(17, 'error', 'stated', ps,
    msg(`${n} δίσκοι M.2, η μητρική έχει ${slots} θέσεις M.2.`, `${n} M.2 drives; the board has ${slots} M.2 slots.`),
    msg('Διάλεξε μητρική με περισσότερες θέσεις M.2 ή δίσκο SATA.', 'Choose a board with more M.2 slots or a SATA drive.'))];
}

export function rule18(b: Build): Finding[] {
  const mobo = one(b, 'mobo'), drives = all(b, 'storage');
  if (!mobo || !drives.length) return [];
  const sata = drives.filter(onSataPort), n = count(sata), ps = keys(mobo, ...sata);
  if (!n) return [finding(18, 'pass', 'stated', keys(mobo), msg('Κανένας δίσκος σε θύρα SATA.', 'No drives on SATA ports.'))];
  const ports = num(mobo, 'sataPorts');
  if (ports === null) return [unknown(18, ps, msg(`αν φτάνουν οι θύρες SATA για ${n} δίσκους: η μητρική δεν τις δηλώνει.`, `whether there are enough SATA ports for ${n} drive(s): the board doesn't state them.`),
    msg('Έλεγξε τις θύρες SATA στη σελίδα της μητρικής.', "Check the SATA ports on the board's page."))];
  if (n > ports) return [finding(18, 'error', 'stated', ps,
    msg(`${n} δίσκοι SATA, η μητρική έχει ${ports} θύρες SATA.`, `${n} SATA drives; the board has ${ports} SATA ports.`),
    msg('Διάλεξε μητρική με περισσότερες θύρες SATA ή λιγότερους δίσκους.', 'Choose a board with more SATA ports or fewer drives.'))];
  if (drives.some(isM2)) return [finding(18, 'note', 'stated', ps,
    msg(`${n} δίσκοι SATA σε ${ports} θύρες, μαζί με δίσκο M.2: σε πολλές μητρικές μια θέση M.2 κλείνει κάποιες θύρες SATA.`, `${n} SATA drive(s) in ${ports} ports, with an M.2 drive: on many boards an M.2 slot disables some SATA ports.`),
    msg('Έλεγξε στο εγχειρίδιο της μητρικής ποιες θύρες μοιράζονται.', "Check in the board's manual which ports are shared."))];
  return [finding(18, 'pass', 'stated', ps, msg(`${n} δίσκοι SATA σε ${ports} θύρες.`, `${n} SATA drive(s) in ${ports} ports.`))];
}

export function rule20(b: Build): Finding[] {
  const mobo = one(b, 'mobo'), drives = all(b, 'storage');
  if (!mobo || !drives.length) return [];
  const gen5 = drives.filter((d) => num(d, 'pcie') === 5);
  if (!gen5.length) return [finding(20, 'pass', 'stated', keys(mobo), msg('Κανένας δίσκος PCIe 5.0.', 'No PCIe 5.0 drives.'))];
  const ps = keys(mobo, ...gen5), gen = num(mobo, 'm2Gen');
  if (gen === null) return [unknown(20, ps, msg('αν η μητρική έχει θέση M.2 PCIe 5.0: δεν το δηλώνει. Αλλιώς ο δίσκος δουλεύει, πιο αργά.', "whether the board has a PCIe 5.0 M.2 slot: it doesn't say. Otherwise the drive works, more slowly."),
    msg('Έλεγξε τις θέσεις M.2 της μητρικής.', "Check the board's M.2 slots."))];
  if (gen >= 5) return [finding(20, 'pass', 'stated', ps, msg('Η μητρική έχει θέση M.2 PCIe 5.0.', 'The board has a PCIe 5.0 M.2 slot.'))];
  return [finding(20, 'note', 'stated', ps,
    msg(`Ο δίσκος είναι PCIe 5.0, η μητρική έχει θέσεις έως PCIe ${gen}.0: θα δουλεύει με ταχύτητα Gen${gen}.`, `The drive is PCIe 5.0; the board's slots go up to PCIe ${gen}.0: it will run at Gen${gen} speed.`),
    msg(`Ένας δίσκος PCIe ${gen}.0 κοστίζει λιγότερο για την ίδια ταχύτητα εδώ.`, `A PCIe ${gen}.0 drive costs less for the same speed here.`))];
}
