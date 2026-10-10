// Rules about what fits where: 5 board size, 6 card length, 7 card thickness, 8 air-cooler height,
// 9 AIO radiator, 10 cooler socket, 16 PSU size, 19 3.5" bays, 26 RAM–cooler clearance.
import { BOARD_BY_CASE_SIZE, BOARD_RANK, CHIP_ESTIMATE, MARGIN, MIN_AIR_COOLER_MM, type BoardSize } from '../tables';
import type { Build, Context, Finding } from '../types';
import { all, finding, fmtMm, keys, list, msg, num, one, str, unknown } from '../util';

const mmEl = (v: number) => fmtMm(v).replace('.', ',');
const rank = (s: string | null) => BOARD_RANK.indexOf(s as BoardSize);

export function rule5(b: Build): Finding[] {
  const mobo = one(b, 'mobo'), pc = one(b, 'case');
  if (!mobo || !pc) return [];
  const ps = keys(mobo, pc), board = str(mobo, 'formFactor');
  if (rank(board) < 0) return [unknown(5, ps, msg('αν χωράει η μητρική: το μέγεθός της δεν είναι γνωστό.', "whether the board fits: its size isn't known."))];
  const stated = str(pc, 'maxBoard');
  if (rank(stated) >= 0) {
    if (rank(board) <= rank(stated)) return [finding(5, 'pass', 'stated', ps, msg(`Μητρική ${board} σε κουτί έως ${stated}.`, `${board} board in a case that takes up to ${stated}.`))];
    return [finding(5, 'error', 'stated', ps,
      msg(`Το κουτί δέχεται μητρικές έως ${stated}, η μητρική είναι ${board}.`, `The case takes boards up to ${stated}; the board is ${board}.`),
      msg(`Διάλεξε κουτί για ${board} ή μικρότερη μητρική.`, `Choose a case for ${board} or a smaller board.`))];
  }
  const size = str(pc, 'size'), guess = size ? BOARD_BY_CASE_SIZE[size] : undefined;
  if (!guess) return [unknown(5, ps, msg('αν χωράει η μητρική: το κουτί δεν δηλώνει μέγεθος μητρικής.', "whether the board fits: the case doesn't state a board size."))];
  const fits = rank(board) <= rank(guess);
  return [finding(5, 'note', 'estimate', ps,
    msg(fits ? `Πιθανότατα χωράει: ένα ${size} συνήθως δέχεται έως ${guess} (το κουτί δεν το δηλώνει).` : `Πιθανότατα δεν χωράει: ένα ${size} συνήθως δέχεται έως ${guess} (το κουτί δεν το δηλώνει).`,
      fits ? `Probably fits: a ${size} usually takes up to ${guess} (the case doesn't state it).` : `Probably doesn't fit: a ${size} usually takes up to ${guess} (the case doesn't state it).`),
    msg('Έλεγξε το μέγεθος μητρικής στη σελίδα του κουτιού.', "Check the board size on the case's page."))];
}

export function rule6(b: Build, ctx: Context): Finding[] {
  const gpu = one(b, 'gpu'), pc = one(b, 'case');
  if (!gpu || !pc) return [];
  const ps = keys(gpu, pc), max = num(pc, 'gpuMaxMm'), len = num(gpu, 'lengthMm');
  if (max === null) return [unknown(6, ps, msg('αν χωράει η κάρτα: το κουτί δεν δηλώνει μέγιστο μήκος κάρτας.', "whether the card fits: the case doesn't state a maximum card length."))];
  if (len === null) {
    const chip = str(gpu, 'chip'), range = chip ? ctx.chipLengths?.[chip] : undefined;
    if (range && range.cards >= CHIP_ESTIMATE.cards && range.makers >= CHIP_ESTIMATE.makers) {
      if (range.max + CHIP_ESTIMATE.marginMm <= max) return [finding(6, 'note', 'estimate', ps,
        msg(`Πιθανότατα χωράει: οι κάρτες ${chip} που μετρήσαμε είναι έως ${mmEl(range.max)}, το κουτί δέχεται ${mmEl(max)}.`, `Probably fits: the ${chip} cards we measured are up to ${fmtMm(range.max)}; the case takes ${fmtMm(max)}.`))];
      if (range.min > max) return [finding(6, 'note', 'estimate', ps,
        msg(`Πιθανότατα δεν χωράει: οι κάρτες ${chip} που μετρήσαμε είναι από ${mmEl(range.min)}, το κουτί δέχεται ${mmEl(max)}.`, `Probably doesn't fit: the ${chip} cards we measured start at ${fmtMm(range.min)}; the case takes ${fmtMm(max)}.`),
        msg('Διάλεξε κάρτα με δηλωμένο μήκος ή μεγαλύτερο κουτί.', 'Choose a card with a stated length or a bigger case.'))];
    }
    return [unknown(6, ps, msg('αν χωράει η κάρτα: το μήκος της δεν είναι γνωστό.', "whether the card fits: its length isn't known."),
      msg(`Έλεγξε το μήκος της κάρτας· το κουτί δέχεται έως ${mmEl(max)}.`, `Check the card's length; the case takes up to ${fmtMm(max)}.`))];
  }
  if (len > max) return [finding(6, 'error', 'stated', ps,
    msg(`Η κάρτα είναι ${mmEl(len)}, το κουτί δέχεται έως ${mmEl(max)}.`, `The card is ${fmtMm(len)}; the case takes up to ${fmtMm(max)}.`),
    msg(`Διάλεξε κουτί με όριο τουλάχιστον ${mmEl(len)} ή μικρότερη κάρτα.`, `Choose a case that takes at least ${fmtMm(len)} or a shorter card.`))];
  if (max - len <= MARGIN.gpuMm) return [finding(6, 'warning', 'stated', ps,
    msg(`Χωράει οριακά: η κάρτα είναι ${mmEl(len)}, το κουτί δέχεται ${mmEl(max)}.`, `A tight fit: the card is ${fmtMm(len)}; the case takes ${fmtMm(max)}.`),
    msg('Έλεγξε ότι δεν εμποδίζουν μπροστινοί ανεμιστήρες ή radiator.', "Check that front fans or a radiator don't get in the way."))];
  return [finding(6, 'pass', 'stated', ps, msg(`Η κάρτα (${mmEl(len)}) χωράει (έως ${mmEl(max)}).`, `The card (${fmtMm(len)}) fits (up to ${fmtMm(max)}).`))];
}

export function rule7(b: Build): Finding[] {
  const gpu = one(b, 'gpu'), pc = one(b, 'case');
  if (!gpu || !pc) return [];
  const ps = keys(gpu, pc), slots = num(gpu, 'slots'), room = num(pc, 'expansionSlots');
  if (slots === null || room === null) return [unknown(7, ps, msg('το πάχος της κάρτας: δεν ξέρουμε τις θέσεις της κάρτας ή τις θέσεις επέκτασης του κουτιού.', "the card's thickness: its slots or the case's expansion slots aren't known."))];
  if (slots <= room) return [finding(7, 'pass', 'stated', ps, msg(`Κάρτα ${slots} θέσεων, το κουτί έχει ${room}.`, `A ${slots}-slot card; the case has ${room}.`))];
  return [finding(7, 'error', 'stated', ps,
    msg(`Η κάρτα πιάνει ${slots} θέσεις, το κουτί έχει ${room} θέσεις επέκτασης.`, `The card takes ${slots} slots; the case has ${room} expansion slots.`),
    msg('Διάλεξε λεπτότερη κάρτα ή κουτί με περισσότερες θέσεις επέκτασης.', 'Choose a thinner card or a case with more expansion slots.'))];
}

export function rule8(b: Build): Finding[] {
  const cooler = one(b, 'cooler'), pc = one(b, 'case');
  if (!cooler || !pc || str(cooler, 'type') !== 'Air') return [];
  const ps = keys(cooler, pc), h0 = num(cooler, 'heightMm'), max = num(pc, 'coolerMaxMm');
  const h = h0 !== null && h0 >= MIN_AIR_COOLER_MM ? h0 : null;
  if (h === null || max === null) return [unknown(8, ps, msg('αν χωράει η ψύκτρα: δεν ξέρουμε το ύψος της ή το όριο του κουτιού.', "whether the cooler fits: its height or the case's limit isn't known."),
    msg('Έλεγξε το ύψος της ψύκτρας και το μέγιστο ύψος του κουτιού.', "Check the cooler's height and the case's maximum."))];
  if (h > max) return [finding(8, 'error', 'stated', ps,
    msg(`Η ψύκτρα είναι ${mmEl(h)}, το κουτί δέχεται έως ${mmEl(max)}.`, `The cooler is ${fmtMm(h)}; the case takes up to ${fmtMm(max)}.`),
    msg(`Διάλεξε ψύκτρα έως ${mmEl(max)} ή μεγαλύτερο κουτί.`, `Choose a cooler of up to ${fmtMm(max)} or a bigger case.`))];
  if (max - h <= MARGIN.coolerMm) return [finding(8, 'warning', 'stated', ps,
    msg(`Χωράει οριακά: η ψύκτρα είναι ${mmEl(h)}, το κουτί δέχεται ${mmEl(max)}.`, `A tight fit: the cooler is ${fmtMm(h)}; the case takes ${fmtMm(max)}.`),
    msg('Το πλαϊνό πάνελ μπορεί να ακουμπά· έλεγξε τις διαστάσεις.', 'The side panel may touch it; check the measurements.'))];
  return [finding(8, 'pass', 'stated', ps, msg(`Η ψύκτρα (${mmEl(h)}) χωράει (έως ${mmEl(max)}).`, `The cooler (${fmtMm(h)}) fits (up to ${fmtMm(max)}).`))];
}

interface RadiatorPos { pos: string; sizes: number[] }

export function rule9(b: Build): Finding[] {
  const cooler = one(b, 'cooler'), pc = one(b, 'case');
  if (!cooler || !pc || str(cooler, 'type') !== 'AIO') return [];
  const ps = keys(cooler, pc), size = num(cooler, 'radiator');
  if (size === null) return [unknown(9, ps, msg("αν χωράει το ψυγείο: δεν ξέρουμε το μέγεθος του radiator.", "whether the radiator fits: its size isn't known."))];
  const maker = list<RadiatorPos>(pc, 'radiators');
  if (maker?.length) {
    const where = maker.filter((r) => r.sizes?.includes(size)).map((r) => r.pos);
    if (where.length) return [finding(9, 'pass', 'maker-list', ps, msg(`Radiator ${size} mm: ο κατασκευαστής του κουτιού το δέχεται (${where.join(', ')}).`, `${size} mm radiator: the case maker lists it (${where.join(', ')}).`))];
    return [finding(9, 'warning', 'maker-list', ps,
      msg(`Ο κατασκευαστής του κουτιού δεν αναφέρει θέση για radiator ${size} mm.`, `The case maker lists no position for a ${size} mm radiator.`),
      msg('Έλεγξε τις θέσεις radiator στη σελίδα του κουτιού ή διάλεξε μικρότερο ψυγείο.', "Check the radiator positions on the case's page or choose a smaller radiator."))];
  }
  if (size === 120 && str(pc, 'radiatorMounts')) return [finding(9, 'note', 'estimate', ps,
    msg('Πιθανότατα χωράει: το κουτί έχει θέσεις radiator και ένα 120 mm μπαίνει σχεδόν παντού.', 'Probably fits: the case has radiator positions and a 120 mm one fits almost anywhere.'))];
  return [unknown(9, ps, msg(`αν χωράει radiator ${size} mm: το κουτί δεν δηλώνει μεγέθη radiator.`, `whether a ${size} mm radiator fits: the case doesn't state radiator sizes.`),
    msg("Έλεγξε τις θέσεις radiator στη σελίδα του κουτιού.", "Check the radiator positions on the case's page."))];
}

export function rule10(b: Build): Finding[] {
  const cpu = one(b, 'cpu'), cooler = one(b, 'cooler');
  if (!cpu || !cooler) return [];
  const ps = keys(cpu, cooler), socket = str(cpu, 'socket'), sockets = str(cooler, 'sockets');
  if (!socket || !sockets) return [unknown(10, ps, msg('αν η ψύκτρα υποστηρίζει το socket: δεν το δηλώνει.', "whether the cooler supports the socket: it doesn't say."),
    msg("Έλεγξε τα υποστηριζόμενα sockets στη σελίδα της ψύκτρας.", "Check the supported sockets on the cooler's page."))];
  if (sockets.split(',').map((s) => s.trim()).includes(socket)) return [finding(10, 'pass', 'stated', ps, msg(`Η ψύκτρα υποστηρίζει ${socket}.`, `The cooler supports ${socket}.`))];
  return [finding(10, 'error', 'stated', ps,
    msg(`Η ψύκτρα δεν υποστηρίζει ${socket}.`, `The cooler doesn't support ${socket}.`),
    msg(`Διάλεξε ψύκτρα για ${socket}.`, `Choose a cooler for ${socket}.`))];
}

export function rule16(b: Build): Finding[] {
  const psu = one(b, 'psu'), pc = one(b, 'case');
  if (!psu || !pc) return [];
  const ps = keys(psu, pc), form = str(psu, 'formFactor'), takes = list<string>(pc, 'psuFormFactors');
  if (form && takes?.length) {
    if (takes.includes(form)) return [finding(16, 'pass', 'stated', ps, msg(`Το κουτί δέχεται τροφοδοτικό ${form}.`, `The case takes a ${form} power supply.`))];
    return [finding(16, 'error', 'stated', ps,
      msg(`Το κουτί δέχεται μόνο ${takes.join('/')}, το τροφοδοτικό είναι ${form}.`, `The case takes only ${takes.join('/')}; the power supply is ${form}.`),
      msg(`Διάλεξε τροφοδοτικό ${takes.join(' ή ')}.`, `Choose a ${takes.join(' or ')} power supply.`))];
  }
  const size = str(pc, 'size');
  if (size && /Tower$/.test(size)) return [finding(16, 'pass', 'estimate', ps, msg(`Ένα ${size} δέχεται κανονικό τροφοδοτικό ATX.`, `A ${size} takes a standard ATX power supply.`))];
  return [unknown(16, ps, msg('αν χωράει το τροφοδοτικό: το κουτί δεν δηλώνει τι μέγεθος τροφοδοτικού δέχεται.', "whether the power supply fits: the case doesn't state which size it takes."),
    msg('Έλεγξε στη σελίδα του κουτιού αν δέχεται ATX ή μόνο SFX.', "Check on the case's page whether it takes ATX or only SFX."))];
}

const is35 = (f: string | null) => !!f && /^3[.,]5/.test(f);

export function rule19(b: Build): Finding[] {
  const pc = one(b, 'case'), drives = all(b, 'storage');
  if (!pc || !drives.length) return [];
  const big = drives.filter((d) => is35(str(d, 'formFactor')));
  const ps = keys(pc, ...big), n = big.reduce((s, d) => s + d.quantity, 0);
  if (!n) return [finding(19, 'pass', 'stated', keys(pc), msg('Κανένας δίσκος 3.5".', 'No 3.5" drives.'))];
  const bays = num(pc, 'bays35');
  if (bays === null) return [unknown(19, ps, msg(`αν χωράνε ${n} δίσκοι 3.5": το κουτί δεν δηλώνει θέσεις δίσκων.`, `whether ${n} 3.5" drive(s) fit: the case doesn't state its drive bays.`),
    msg('Έλεγξε τις θέσεις 3.5" στη σελίδα του κουτιού.', `Check the 3.5" bays on the case's page.`))];
  if (n <= bays) return [finding(19, 'pass', 'stated', ps, msg(`${n} δίσκοι 3.5" σε ${bays} θέσεις.`, `${n} 3.5" drive(s) in ${bays} bays.`))];
  return [finding(19, 'error', 'stated', ps,
    msg(`${n} δίσκοι 3.5", το κουτί έχει ${bays} θέσεις.`, `${n} 3.5" drives; the case has ${bays} bays.`),
    msg('Διάλεξε κουτί με περισσότερες θέσεις 3.5" ή λιγότερους δίσκους.', 'Choose a case with more 3.5" bays or fewer drives.'))];
}

export function rule26(b: Build): Finding[] {
  const cooler = one(b, 'cooler'), rams = all(b, 'ram');
  if (!cooler || !rams.length || str(cooler, 'type') !== 'Air') return [];
  return [finding(26, 'note', 'unknown', keys(cooler, ...rams),
    msg('Ο χώρος ανάμεσα σε ψηλή μνήμη και μεγάλη ψύκτρα αέρα δεν ελέγχεται.', "The clearance between tall memory and a large air cooler isn't checked."),
    msg('Αν η μνήμη έχει ψηλές ψύκτρες, έλεγξε το ύψος που δέχεται η ψύκτρα πάνω από τις θέσεις μνήμης.', "If the memory has tall heat spreaders, check the cooler's RAM clearance."))];
}
