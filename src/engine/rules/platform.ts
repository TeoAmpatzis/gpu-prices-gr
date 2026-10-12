// Rules about the CPU, board and memory: 1 socket, 2 memory type, 3 RAM slots, 4 max memory, 12 graphics,
// 13 BIOS, 24 front USB-C header, 25 memory speed.
import type { Build, Context, Finding } from '../types';
import { cpuRow, officialSpeed } from '../data/cpuMemory';
import { all, bool, finding, keys, msg, num, one, str, total, unknown } from '../util';

export function rule1(b: Build): Finding[] {
  const cpu = one(b, 'cpu'), mobo = one(b, 'mobo');
  if (!cpu || !mobo) return [];
  const ps = keys(cpu, mobo), c = str(cpu, 'socket'), m = str(mobo, 'socket');
  if (!c || !m) return [unknown(1, ps, msg('το socket: δεν το ξέρουμε για τον επεξεργαστή ή τη μητρική.', "the socket: it isn't known for the CPU or the board."))];
  if (c === m) return [finding(1, 'pass', 'stated', ps, msg(`Το socket ταιριάζει (${c}).`, `The socket matches (${c}).`))];
  return [finding(1, 'error', 'stated', ps,
    msg(`Ο επεξεργαστής θέλει socket ${c}, η μητρική έχει ${m}.`, `The CPU needs socket ${c}; the board has ${m}.`),
    msg(`Διάλεξε μητρική με socket ${c} ή επεξεργαστή για ${m}.`, `Choose a board with socket ${c} or a CPU for ${m}.`))];
}

export function rule2(b: Build): Finding[] {
  const mobo = one(b, 'mobo'), rams = all(b, 'ram');
  if (!mobo || !rams.length) return [];
  const board = str(mobo, 'memory');
  return rams.map((ram) => {
    const ps = keys(mobo, ram), type = str(ram, 'type');
    if (!board || !type) return unknown(2, ps, msg('τον τύπο μνήμης: δεν τον ξέρουμε για τη μητρική ή τη μνήμη.', "the memory type: it isn't known for the board or the memory."));
    if (board === type) return finding(2, 'pass', 'stated', ps, msg(`Ο τύπος μνήμης ταιριάζει (${type}).`, `The memory type matches (${type}).`));
    return finding(2, 'error', 'stated', ps,
      msg(`Η μητρική δέχεται ${board}, η μνήμη είναι ${type}.`, `The board takes ${board}; the memory is ${type}.`),
      msg(`Διάλεξε μνήμη ${board} ή μητρική για ${type}.`, `Choose ${board} memory or a board for ${type}.`));
  });
}

export function rule3(b: Build): Finding[] {
  const mobo = one(b, 'mobo'), rams = all(b, 'ram');
  if (!mobo || !rams.length) return [];
  const ps = keys(mobo, ...rams), sticks = total(rams, 'modules'), slots = num(mobo, 'ramSlots');
  if (sticks === null) return [unknown(3, ps, msg('τις θέσεις μνήμης: δεν ξέρουμε πόσα στικ έχει το κιτ.', "the memory slots: the kit's stick count isn't known."))];
  if (slots === null) {
    // Every desktop board has at least 2 slots, so up to 2 sticks always fit.
    if (sticks <= 2) return [finding(3, 'pass', 'estimate', ps, msg(`${sticks} στικ: κάθε μητρική έχει τουλάχιστον 2 θέσεις.`, `${sticks} sticks: every board has at least 2 slots.`))];
    return [unknown(3, ps, msg(`αν χωράνε ${sticks} στικ: η μητρική δεν δηλώνει θέσεις μνήμης.`, `whether ${sticks} sticks fit: the board doesn't state its memory slots.`),
      msg('Έλεγξε τις θέσεις μνήμης στη σελίδα της μητρικής.', "Check the memory slots on the board's page."))];
  }
  if (sticks <= slots) return [finding(3, 'pass', 'stated', ps, msg(`${sticks} στικ σε ${slots} θέσεις.`, `${sticks} sticks in ${slots} slots.`))];
  return [finding(3, 'error', 'stated', ps,
    msg(`${sticks} στικ μνήμης, η μητρική έχει ${slots} θέσεις.`, `${sticks} memory sticks; the board has ${slots} slots.`),
    msg(`Διάλεξε κιτ με έως ${slots} στικ ή μητρική με περισσότερες θέσεις.`, `Choose a kit of up to ${slots} sticks or a board with more slots.`))];
}

export function rule4(b: Build): Finding[] {
  const mobo = one(b, 'mobo'), rams = all(b, 'ram');
  if (!mobo || !rams.length) return [];
  const ps = keys(mobo, ...rams), gb = total(rams, 'capacity'), max = num(mobo, 'maxMemoryGB');
  if (gb === null || max === null) return [unknown(4, ps, msg('τη μέγιστη μνήμη: η μητρική δεν τη δηλώνει.', "the maximum memory: the board doesn't state it."))];
  if (gb <= max) return [finding(4, 'pass', 'stated', ps, msg(`${gb} GB μνήμης, η μητρική δέχεται έως ${max} GB.`, `${gb} GB of memory; the board takes up to ${max} GB.`))];
  return [finding(4, 'error', 'stated', ps,
    msg(`${gb} GB μνήμης, η μητρική δέχεται έως ${max} GB.`, `${gb} GB of memory; the board takes up to ${max} GB.`),
    msg(`Μείωσε τη μνήμη στα ${max} GB ή διάλεξε μητρική που δέχεται περισσότερη.`, `Reduce the memory to ${max} GB or choose a board that takes more.`))];
}

export function rule12(b: Build): Finding[] {
  const cpu = one(b, 'cpu');
  if (!cpu) return [];
  const gpu = one(b, 'gpu');
  if (gpu) return [finding(12, 'pass', 'stated', keys(cpu, gpu), msg('Υπάρχει κάρτα γραφικών.', 'There is a graphics card.'))];
  const igpu = bool(cpu, 'igpu');
  if (igpu === null) return [unknown(12, keys(cpu), msg('αν ο επεξεργαστής έχει ενσωματωμένα γραφικά.', 'whether the CPU has integrated graphics.'))];
  if (igpu) return [finding(12, 'pass', 'stated', keys(cpu), msg('Ο επεξεργαστής έχει ενσωματωμένα γραφικά.', 'The CPU has integrated graphics.'))];
  return [finding(12, 'error', 'stated', keys(cpu),
    msg('Ο επεξεργαστής δεν έχει ενσωματωμένα γραφικά και δεν υπάρχει κάρτα γραφικών: δεν θα βγάζει εικόνα.', "The CPU has no integrated graphics and there's no graphics card: there will be no picture."),
    msg('Πρόσθεσε κάρτα γραφικών ή διάλεξε επεξεργαστή με γραφικά.', 'Add a graphics card or choose a CPU with graphics.'))];
}

export function rule13(b: Build, ctx: Context): Finding[] {
  const cpu = one(b, 'cpu'), mobo = one(b, 'mobo');
  if (!cpu || !mobo) return [];
  const ps = keys(cpu, mobo), chipset = str(mobo, 'chipset');
  const verdict = chipset && ctx.bios ? ctx.bios(chipset, str(cpu, 'chip') ?? cpu.name) : undefined;
  const fix = msg('Έλεγξε τη λίστα υποστηριζόμενων επεξεργαστών στη σελίδα του κατασκευαστή της μητρικής.', "Check the supported CPU list on the board maker's page.");
  if (!verdict) return [unknown(13, ps, msg('αν η μητρική χρειάζεται ενημέρωση BIOS για αυτόν τον επεξεργαστή: ο κατασκευαστής δεν δίνει επίσημη δήλωση για αυτό το chipset και αυτή τη γενιά επεξεργαστή.', 'whether the board needs a BIOS update for this CPU: there is no official statement for this chipset and CPU generation.'), fix)];
  if (verdict === 'ok') return [finding(13, 'pass', 'stated', ps,
    msg('Ο κατασκευαστής δηλώνει αυτό το chipset συμβατό με αυτή τη γενιά επεξεργαστή.', 'The maker lists this chipset as compatible with this CPU generation.'),
    msg('Έλεγξε την έκδοση BIOS της μητρικής στη σελίδα του κατασκευαστή της.', "Check the board's BIOS version on the board maker's page."))];
  if (verdict === 'unsupported') return [finding(13, 'error', 'stated', ps,
    msg('Η μητρική δεν υποστηρίζει αυτόν τον επεξεργαστή.', "The board doesn't support this CPU."), msg('Διάλεξε άλλη μητρική ή επεξεργαστή.', 'Choose another board or CPU.'))];
  if (verdict === 'may-update') return [finding(13, 'note', 'stated', ps,
    msg('Η AMD σημειώνει ότι η υποστήριξη ίσως χρειάζεται ενημέρωση BIOS· έλεγξε τη λίστα επεξεργαστών της μητρικής.', "AMD notes that support may require a BIOS update; check the board's CPU list."))];
  if (verdict === 'not-listed') return [finding(13, 'warning', 'stated', ps,
    msg('Η AMD δηλώνει αυτόν τον συνδυασμό ως μη υποστηριζόμενο.', 'AMD lists this as not supported.'), fix)];
  const flashback = bool(mobo, 'biosFlashback');
  return [finding(13, 'warning', 'stated', ps,
    msg(flashback ? 'Η μητρική ίσως χρειάζεται ενημέρωση BIOS· έχει BIOS Flashback, άρα γίνεται χωρίς επεξεργαστή.' : 'Η μητρική ίσως χρειάζεται ενημέρωση BIOS για αυτόν τον επεξεργαστή.',
      flashback ? 'The board may need a BIOS update; it has BIOS Flashback, so it can be done without a CPU.' : 'The board may need a BIOS update for this CPU.'),
    fix)];
}

export function rule24(b: Build): Finding[] {
  const mobo = one(b, 'mobo'), pc = one(b, 'case');
  if (!mobo || !pc) return [];
  const ps = keys(mobo, pc), front = bool(pc, 'usbCFront');
  if (front === null) return [unknown(24, ps, msg('τη θύρα USB-C μπροστά: το κουτί δεν δηλώνει τις μπροστινές θύρες.', "the front USB-C port: the case doesn't state its front ports."))];
  if (!front) return [finding(24, 'pass', 'stated', ps, msg('Το κουτί δεν έχει USB-C μπροστά.', 'The case has no front USB-C.'))];
  const header = bool(mobo, 'usbCHeader');
  if (header === null) return [unknown(24, ps, msg('αν η μητρική έχει header για το USB-C μπροστά: δεν το δηλώνει.', "whether the board has a header for the front USB-C: it doesn't say."),
    msg('Έλεγξε στη σελίδα της μητρικής αν έχει header USB-C (Type-E).', "Check on the board's page for a USB-C (Type-E) header."))];
  if (header) return [finding(24, 'pass', 'stated', ps, msg('Η μητρική έχει header για το USB-C μπροστά.', 'The board has a header for the front USB-C.'))];
  return [finding(24, 'note', 'stated', ps,
    msg('Η μητρική δεν έχει header USB-C: η μπροστινή θύρα USB-C του κουτιού δεν θα λειτουργεί.', "The board has no USB-C header: the case's front USB-C port won't work."),
    msg('Αν τη χρειάζεσαι, διάλεξε μητρική με header USB-C.', 'If you need it, choose a board with a USB-C header.'))];
}

export function rule25(b: Build): Finding[] {
  const cpu = one(b, 'cpu'), rams = all(b, 'ram');
  if (!cpu || !rams.length) return [];
  const sticks = total(rams, 'modules');
  return rams.map((ram) => {
    const ps = keys(cpu, ram), speed = num(ram, 'speed'), type = str(ram, 'type');
    if (sticks === null || speed === null || (type !== 'DDR4' && type !== 'DDR5'))
      return unknown(25, ps, msg('την ταχύτητα μνήμης: δεν ξέρουμε την ταχύτητα, τον τύπο ή τον αριθμό στικ του κιτ.', "the memory speed: the kit's speed, type or stick count isn't known."));
    const cpuName = str(cpu, 'chip') ?? cpu.name;
    if (!cpuRow(cpuName))
      return unknown(25, ps, msg('την ταχύτητα μνήμης: ο επεξεργαστής δεν υπάρχει ακόμα στον πίνακα επίσημης υποστήριξης.', "the memory speed: the CPU isn't in the official-support table yet."));
    const official = officialSpeed(cpuName, type, sticks);
    if (!official) {
      const row = cpuRow(cpuName);
      return unknown(25, ps, row?.memory[type]
        ? msg(`την ταχύτητα μνήμης: η σελίδα του κατασκευαστή δεν δίνει επίσημη ταχύτητα για ${sticks} μονάδες.`, `the memory speed: the maker's page gives no official speed for ${sticks} sticks.`)
        : msg(`την ταχύτητα μνήμης: ο κατασκευαστής δεν δίνει επίσημη ταχύτητα ${type} για αυτόν τον επεξεργαστή.`, `the memory speed: the maker gives no official ${type} speed for this CPU.`));
    }
    const { mhz, sticks: n } = official;
    if (speed <= mhz) return finding(25, 'pass', 'stated', ps, msg(`${speed} MHz, μέσα στην επίσημη υποστήριξη (έως ${mhz} MHz με ${n} μονάδες).`, `${speed} MHz, within the official support (up to ${mhz} MHz with ${n} sticks).`));
    return finding(25, 'note', 'stated', ps,
      msg(`Η μνήμη (${speed} MHz) είναι πιο γρήγορη από την επίσημη υποστήριξη του επεξεργαστή (επίσημα έως ${mhz} MHz με ${n} μονάδες).`, `The memory (${speed} MHz) is faster than the CPU's official support (officially up to ${mhz} MHz with ${n} sticks).`),
      msg('Ενεργοποίησε το XMP/EXPO στο BIOS για να τρέξει στην ταχύτητά της.', 'Turn on XMP/EXPO in the BIOS for it to run at its speed.'));
  });
}
