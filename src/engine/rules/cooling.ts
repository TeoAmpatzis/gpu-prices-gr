// Rules about cooling: 11 CPU cooler in the box, 21 fan positions, 22 a case without fans, 23 fan headers.
import { TYPICAL_FAN_HEADERS } from '../tables';
import type { Build, Finding, Part } from '../types';
import { all, bool, F, finding, keys, list, msg, nOf, num, one, str, unknown } from '../util';

export function rule11(b: Build): Finding[] {
  const cpu = one(b, 'cpu');
  if (!cpu) return [];
  const cooler = one(b, 'cooler');
  if (cooler) return [finding(11, 'pass', 'stated', keys(cpu, cooler), msg('Υπάρχει ψύκτρα στο build.', "There's a cooler in the build."))];
  const boxed = bool(cpu, 'coolerIncluded');
  // `boxCooler`: the cooler the maker's page names (src/engine/data/cpuBox.ts, set at build time with coolerIncluded).
  const named = str(cpu, 'boxCooler');
  if (boxed === true && named) return [finding(11, 'pass', 'stated', keys(cpu),
    msg(`Ο επεξεργαστής έχει στο κουτί ${named}.`, `The CPU comes with an ${named} in the box.`))];
  if (boxed === true) return [finding(11, 'pass', 'stated', keys(cpu), msg('Ο επεξεργαστής έχει ψύκτρα στη συσκευασία.', 'The CPU comes with a cooler in the box.'))];
  if (boxed === false) return [finding(11, 'error', 'stated', keys(cpu),
    msg('Ο επεξεργαστής δεν έχει ψύκτρα στη συσκευασία και δεν υπάρχει ψύκτρα στο build.', "The CPU has no cooler in the box and there's no cooler in the build."),
    msg('Πρόσθεσε ψύκτρα.', 'Add a cooler.'))];
  return [finding(11, 'warning', 'unknown', keys(cpu),
    msg('Δεν ξέρουμε αν ο επεξεργαστής έχει ψύκτρα στη συσκευασία και δεν υπάρχει ψύκτρα στο build.', "We don't know whether the CPU comes with a cooler, and there's no cooler in the build."),
    msg('Έλεγξε τη συσκευασία στη σελίδα του επεξεργαστή, ή πρόσθεσε ψύκτρα.', "Check the packaging on the CPU's page, or add a cooler."))];
}

interface Mount { n: number; pos: string | null; size: number | null }

const fanCount = (f: Part) => (num(f, 'pack') ?? 1) * f.quantity;

export function rule21(b: Build): Finding[] {
  const pc = one(b, 'case'), fans = all(b, 'fan');
  if (!pc || !fans.length) return [];
  const ps = keys(pc, ...fans);
  const bySize = new Map<number | null, number>();
  for (const f of fans) bySize.set(num(f, 'size'), (bySize.get(num(f, 'size')) ?? 0) + fanCount(f));
  const n = [...bySize.values()].reduce((s, v) => s + v, 0), fn = nOf(n, F.fan);
  const mounts = list<Mount>(pc, 'fanMounts');
  if (mounts?.length) {
    const included = list<Mount>(pc, 'fansIncluded') ?? [];
    const short: string[] = [];
    for (const [size, want] of bySize) {
      if (size === null) return [unknown(21, ps, msg('τις θέσεις ανεμιστήρων: δεν ξέρουμε το μέγεθος των ανεμιστήρων.', "the fan positions: the fans' size isn't known."))];
      const free = mounts.filter((m) => m.size === size).reduce((s, m) => s + m.n, 0) - included.filter((m) => m.size === size).reduce((s, m) => s + m.n, 0);
      if (want > free) short.push(`${want} × ${size} mm / ${Math.max(free, 0)}`);
    }
    if (!short.length) return [finding(21, 'pass', 'maker-list', ps, msg(`${fn.el}: ο κατασκευαστής του κουτιού δηλώνει αρκετές θέσεις.`, `${fn.en}: the case maker lists enough positions.`))];
    return [finding(21, 'warning', 'maker-list', ps,
      msg(`Ο κατασκευαστής του κουτιού δηλώνει λιγότερες ελεύθερες θέσεις (${short.join(', ')}).`, `The case maker lists fewer free positions (${short.join(', ')}).`),
      msg('Έλεγξε τις θέσεις ανεμιστήρων στη σελίδα του κουτιού ή διάλεξε λιγότερους ανεμιστήρες.', "Check the fan positions on the case's page or choose fewer fans."))];
  }
  const slots = num(pc, 'fanSlots');
  if (slots !== null) {
    const fp = nOf(slots, F.fanPosition), pos = nOf(slots, F.position), max = nOf(slots, F.fanAcc);
    if (n > slots) return [finding(21, 'error', 'stated', ps,
      msg(`${fn.el}, το κουτί έχει ${fp.el}.`, `${fn.en}; the case has ${fp.en}.`),
      msg(`Διάλεξε έως ${max.el} ή κουτί με περισσότερες θέσεις.`, `Choose up to ${max.en} or a case with more positions.`))];
    if ([...bySize.keys()].every((s) => s === 120)) { const f120 = nOf(n, F.fan120); return [finding(21, 'note', 'estimate', ps,
      msg(`Πιθανότατα ${n === 1 ? 'χωράει' : 'χωράνε'}: ${f120.el}, το κουτί έχει ${pos.el} (χωρίς μεγέθη).`, `Probably ${n === 1 ? 'fits' : 'fit'}: ${f120.en}; the case has ${pos.en} (sizes not stated).`))]; }
  }
  return [unknown(21, ps, msg('αν χωράνε οι ανεμιστήρες: το κουτί δεν δηλώνει θέσεις ανά μέγεθος.', "whether the fans fit: the case doesn't state positions per size."),
    msg('Έλεγξε τις θέσεις ανεμιστήρων στη σελίδα του κουτιού.', "Check the fan positions on the case's page."))];
}

export function rule22(b: Build): Finding[] {
  const pc = one(b, 'case');
  if (!pc) return [];
  const fans = all(b, 'fan');
  if (fans.length) return [finding(22, 'pass', 'stated', keys(pc, ...fans), msg('Υπάρχουν ανεμιστήρες στο build.', 'There are fans in the build.'))];
  const included = list<Mount>(pc, 'fansIncluded');
  if (included && !included.length) return [finding(22, 'warning', 'stated', keys(pc),
    msg('Το κουτί έρχεται χωρίς ανεμιστήρες και δεν υπάρχουν ανεμιστήρες στο build.', "The case comes without fans and there are no fans in the build."),
    msg('Πρόσθεσε τουλάχιστον έναν ανεμιστήρα εισαγωγής μπροστά και έναν εξαγωγής πίσω.', 'Add at least one intake fan at the front and one exhaust fan at the back.'))];
  if (included?.length || bool(pc, 'hasFans') === true) return [finding(22, 'pass', 'stated', keys(pc), msg('Το κουτί έχει ανεμιστήρες.', 'The case has fans.'))];
  return [unknown(22, keys(pc), msg('αν το κουτί έχει ανεμιστήρες: δεν το δηλώνει.', "whether the case comes with fans: it doesn't say."),
    msg('Έλεγξε στη σελίδα του κουτιού· αν δεν έχει, πρόσθεσε ανεμιστήρες.', "Check on the case's page; if it has none, add fans."))];
}

export function rule23(b: Build): Finding[] {
  const fans = all(b, 'fan');
  if (!fans.length) return [];
  const mobo = one(b, 'mobo'), n = fans.reduce((s, f) => s + fanCount(f), 0), headers = num(mobo, 'fanHeaders');
  const ps = keys(mobo, ...fans);
  const fix = msg('Χρησιμοποίησε hub ή splitter ανεμιστήρων.', 'Use a fan hub or splitter.');
  const fn = nOf(n, F.fan);
  if (headers !== null) {
    const h = nOf(headers, F.header), fh = nOf(headers, F.fanHeader);
    if (n <= headers) return [finding(23, 'pass', 'stated', ps, msg(`${fn.el} σε ${h.el}.`, `${fn.en} on ${h.en}.`))];
    return [finding(23, 'note', 'stated', ps, msg(`${fn.el}, η μητρική έχει ${fh.el}.`, `${fn.en}; the board has ${fh.en}.`), fix)];
  }
  if (n <= TYPICAL_FAN_HEADERS) return [finding(23, 'pass', 'estimate', ps, msg(`${fn.el}: οι περισσότερες μητρικές έχουν αρκετά headers.`, `${fn.en}: most boards have enough headers.`))];
  return [finding(23, 'note', 'estimate', ps,
    msg(`${fn.el}: πολλές μητρικές έχουν 2–4 headers ανεμιστήρων (η δική σου δεν το δηλώνει).`, `${fn.en}: many boards have 2–4 fan headers (yours doesn't say).`), fix)];
}
