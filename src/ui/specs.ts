// The spec line (plan, "Νέα ταυτότητα και design system"): the 3–5 specs that matter most in each
// category, always in the same order. A spec the data doesn't state is shown as "label —", never
// skipped, so the order stays the same from row to row. Values are the most common across a model's
// listings (as v1's builder takes them).
import type { Lang } from '../lib/i18n';
import { mostCommon } from '../lib/data';
import type {
  BaseListing,
  Category,
  CaseListing,
  CoolerListing,
  CpuListing,
  FanListing,
  GpuListing,
  MoboListing,
  MonitorListing,
  PsuListing,
  RamListing,
  StorageListing,
} from '../types';
import { num } from './strings';

export interface Spec {
  /** Shown before the value when the value alone would be unclear ("μήκος 300 mm"), and with "—". */
  label: string;
  value: string | null;
}

type L<T> = T[];
const pick = <T, V>(ls: L<T>, f: (l: T) => V | null | undefined) => mostCommon(ls.map(f));
const w = (lang: Lang, el: string, en: string) => (lang === 'el' ? el : en);
const mm = (lang: Lang, n: number | null) => (n == null ? null : `${num(lang, n)} mm`);
/** "μήκος 300 mm": a labelled value, or null when unknown. */
const labelled = (label: string, v: string | null) => (v == null ? null : `${label} ${v}`);

const SPECS: { [C in Category]: (ls: BaseListing[], lang: Lang) => Spec[] } = {
  gpu: (raw, lang) => {
    const ls = raw as L<GpuListing>;
    const vram = pick(ls, (l) => l.vram);
    const mem = pick(ls, (l) => l.memType);
    const psu = pick(ls, (l) => l.minPsu);
    return [
      { label: 'VRAM', value: vram == null ? null : `${vram} GB${mem ? ` ${mem}` : ''}` },
      { label: w(lang, 'μήκος', 'length'), value: labelled(w(lang, 'μήκος', 'length'), mm(lang, pick(ls, (l) => l.lengthMm))) },
      { label: w(lang, 'τροφοδοτικό', 'PSU'), value: psu == null ? null : `${w(lang, 'τροφοδοτικό', 'PSU')} ≥ ${num(lang, psu)} W` },
    ];
  },
  cpu: (raw, lang) => {
    const ls = raw as L<CpuListing>;
    const cores = pick(ls, (l) => l.cores);
    const igpu = pick(ls, (l) => l.igpu);
    const tdp = pick(ls, (l) => l.tdp);
    return [
      { label: w(lang, 'πυρήνες', 'cores'), value: cores == null ? null : `${cores} ${w(lang, 'πυρήνες', 'cores')}` },
      { label: 'socket', value: pick(ls, (l) => l.socket) },
      { label: w(lang, 'γραφικά', 'graphics'), value: igpu == null ? null : igpu ? w(lang, 'με γραφικά', 'with graphics') : w(lang, 'χωρίς γραφικά', 'no graphics') },
      { label: 'TDP', value: tdp == null ? null : `TDP ${tdp} W` },
    ];
  },
  mobo: (raw, lang) => {
    const ls = raw as L<MoboListing>;
    const form = pick(ls, (l) => l.formFactor);
    return [
      { label: 'socket', value: pick(ls, (l) => l.socket) },
      { label: 'chipset', value: pick(ls, (l) => l.chipset) },
      { label: w(lang, 'μέγεθος', 'size'), value: form && form !== 'Άλλο' ? form : null },
      { label: w(lang, 'μνήμη', 'memory'), value: pick(ls, (l) => l.memory) },
      { label: 'WiFi', value: ls.some((l) => l.wifi) ? 'WiFi' : w(lang, 'χωρίς WiFi', 'no WiFi') },
    ];
  },
  ram: (raw, lang) => {
    const ls = raw as L<RamListing>;
    const mods = pick(ls, (l) => l.modules);
    const cap = pick(ls, (l) => l.capacity);
    const speed = pick(ls, (l) => l.speed);
    const cl = pick(ls, (l) => l.cas);
    return [
      { label: w(lang, 'τύπος', 'type'), value: pick(ls, (l) => l.type) },
      { label: 'kit', value: mods && cap ? `${mods} × ${num(lang, cap / mods)} GB` : null },
      { label: w(lang, 'ταχύτητα', 'speed'), value: speed == null ? null : `${speed} MHz` },
      { label: 'CL', value: cl == null ? null : `CL${cl}` },
    ];
  },
  storage: (raw, lang) => {
    const ls = raw as L<StorageListing>;
    const media = pick(ls, (l) => l.media);
    const iface = pick(ls, (l) => l.iface);
    const pcie = pick(ls, (l) => l.pcie);
    const type = media === 'HDD' ? 'HDD' : iface === 'NVMe' ? `NVMe${pcie ? ` Gen${pcie}` : ''}` : iface ? `${iface} SSD` : 'SSD';
    if (media === 'HDD') {
      const rpm = pick(ls, (l) => l.rpm);
      const cache = pick(ls, (l) => l.cacheMB);
      return [
        { label: w(lang, 'τύπος', 'type'), value: type },
        { label: w(lang, 'μέγεθος', 'size'), value: pick(ls, (l) => l.formFactor) },
        { label: 'rpm', value: rpm == null ? null : `${num(lang, rpm)} rpm` },
        { label: 'cache', value: cache == null ? null : `${cache} MB cache` },
      ];
    }
    const read = pick(ls, (l) => l.readMBs);
    const dram = pick(ls, (l) => l.dram);
    return [
      { label: w(lang, 'τύπος', 'type'), value: type },
      { label: w(lang, 'μέγεθος', 'size'), value: pick(ls, (l) => l.formFactor) },
      { label: w(lang, 'ανάγνωση', 'read'), value: read == null ? null : `${num(lang, read)} MB/s` },
      { label: 'DRAM', value: dram == null ? null : dram ? 'DRAM' : w(lang, 'χωρίς DRAM', 'no DRAM') },
    ];
  },
  psu: (raw, lang) => {
    const ls = raw as L<PsuListing>;
    const eff = pick(ls, (l) => l.efficiency);
    const mod = pick(ls, (l) => l.modular);
    const MOD = { Full: w(lang, 'πλήρως αρθρωτό', 'fully modular'), Semi: w(lang, 'ημι-αρθρωτό', 'semi-modular'), Non: w(lang, 'μη αρθρωτό', 'non-modular') };
    return [
      { label: w(lang, 'ισχύς', 'power'), value: `${num(lang, pick(ls, (l) => l.watts) ?? 0)} W` },
      { label: w(lang, 'απόδοση', 'efficiency'), value: eff && eff !== 'Standard' ? `80 PLUS ${eff}` : null },
      { label: w(lang, 'καλώδια', 'cables'), value: mod ? MOD[mod] : null },
      { label: w(lang, 'μέγεθος', 'size'), value: pick(ls, (l) => l.formFactor) },
    ];
  },
  case: (raw, lang) => {
    const ls = raw as L<CaseListing>;
    const size = pick(ls, (l) => l.size);
    const board = pick(ls, (l) => l.maxBoard);
    return [
      { label: w(lang, 'μέγεθος', 'size'), value: size && size !== 'Άλλο' ? size : null },
      { label: w(lang, 'μητρική', 'board'), value: board ? w(lang, `έως ${board}`, `up to ${board}`) : null },
      { label: w(lang, 'κάρτα', 'card'), value: labelled(`${w(lang, 'κάρτα', 'card')} ≤`, mm(lang, pick(ls, (l) => l.gpuMaxMm))) },
      { label: w(lang, 'ψύκτρα', 'cooler'), value: labelled(`${w(lang, 'ψύκτρα', 'cooler')} ≤`, mm(lang, pick(ls, (l) => l.coolerMaxMm))) },
    ];
  },
  fan: (raw, lang) => {
    const ls = raw as L<FanListing>;
    const pack = pick(ls, (l) => l.pack);
    const conn = pick(ls, (l) => l.connector) ?? (ls.some((l) => l.pwm) ? '4-pin PWM' : null);
    return [
      { label: w(lang, 'μέγεθος', 'size'), value: mm(lang, pick(ls, (l) => l.size)) },
      { label: w(lang, 'τεμάχια', 'pack'), value: pack == null ? null : pack > 1 ? `× ${pack}` : w(lang, '1 τεμάχιο', 'single') },
      { label: w(lang, 'βύσμα', 'connector'), value: conn },
      { label: 'RGB', value: ls.some((l) => l.rgb) ? 'RGB' : w(lang, 'χωρίς RGB', 'no RGB') },
    ];
  },
  cooler: (raw, lang) => {
    const ls = raw as L<CoolerListing>;
    const aio = pick(ls, (l) => l.type) === 'AIO';
    const sockets = pick(ls, (l) => l.sockets)
      ?.split(',')
      .map((x) => x.trim())
      .filter((x) => /^(AM5|AM4|LGA1851|LGA1700)$/.test(x));
    return [
      { label: w(lang, 'τύπος', 'type'), value: aio ? 'AIO' : w(lang, 'Αέρα', 'Air') },
      aio
        ? { label: w(lang, 'ψυγείο', 'radiator'), value: labelled(w(lang, 'ψυγείο', 'radiator'), mm(lang, pick(ls, (l) => l.radiator))) }
        : { label: w(lang, 'ύψος', 'height'), value: labelled(w(lang, 'ύψος', 'height'), mm(lang, pick(ls, (l) => l.heightMm))) },
      { label: 'sockets', value: sockets?.length ? sockets.join(', ') : null },
    ];
  },
  monitor: (raw, lang) => {
    const ls = raw as L<MonitorListing>;
    const size = pick(ls, (l) => l.size);
    const height = pick(ls, (l) => l.height);
    const hz = pick(ls, (l) => l.hz);
    return [
      { label: w(lang, 'διαγώνιος', 'diagonal'), value: size == null ? null : `${num(lang, size)}"` },
      { label: w(lang, 'ανάλυση', 'resolution'), value: height == null ? null : `${height}p` },
      { label: w(lang, 'ανανέωση', 'refresh'), value: hz == null ? null : `${hz} Hz` },
    ];
  },
};

export const specsOf = (cat: Category, listings: BaseListing[], lang: Lang): Spec[] => SPECS[cat](listings, lang);

// ---- The product page's full specs (step 4, task 9): the same fields as the spec line above, plus the ones the
// line has no room for, in four groups. A value the data does not state is left out (never a "—" row), and so is
// a group left without rows. Values are the most common across the model's listings, as in the spec line.
export type SpecGroupId = 'general' | 'dimensions' | 'power' | 'connections';
export const SPEC_GROUP_ORDER: readonly SpecGroupId[] = ['general', 'dimensions', 'power', 'connections'];
export interface SpecGroup {
  id: SpecGroupId;
  items: { label: string; value: string; tag?: string }[];
}
type Row = [SpecGroupId, string, string | null | undefined, string?]; // group, label, value, tag ("estimate")
type Estimate = { min: number; max: number } | null | undefined;

const yesNo = (lang: Lang, v: boolean | null | undefined) => (v == null ? null : v ? w(lang, 'Ναι', 'Yes') : w(lang, 'Όχι', 'No'));
const POS = { front: ['μπροστά', 'front'], rear: ['πίσω', 'rear'], top: ['πάνω', 'top'], bottom: ['κάτω', 'bottom'], side: ['πλάι', 'side'] } as const;
const firstOf = <T, V>(ls: L<T>, f: (l: T) => V | null | undefined): V | null => {
  for (const l of ls) {
    const v = f(l);
    if (v != null && !(Array.isArray(v) && v.length === 0)) return v;
  }
  return null;
};

const FULL: { [C in Category]: (ls: BaseListing[], lang: Lang, est?: Estimate) => Row[] } = {
  gpu: (raw, lang, est) => {
    const ls = raw as L<GpuListing>;
    const vram = pick(ls, (l) => l.vram);
    const psu = pick(ls, (l) => l.minPsu);
    const len = pick(ls, (l) => l.lengthMm);
    // No measured length: the chip's range, marked as an estimate.
    const lenRow: Row =
      len != null || !est
        ? ['dimensions', w(lang, 'Μήκος', 'Length'), mm(lang, len)]
        : ['dimensions', w(lang, 'Μήκος', 'Length'), `≈ ${num(lang, est.min)}–${num(lang, est.max)} mm`, w(lang, 'εκτίμηση', 'estimate')];
    return [
      ['general', w(lang, 'Κατασκευαστής', 'Maker'), pick(ls, (l) => l.partner)],
      ['general', w(lang, 'Επεξεργαστής γραφικών', 'Graphics chip'), pick(ls, (l) => l.chip)],
      ['general', 'VRAM', vram == null ? null : `${vram} GB`],
      ['general', w(lang, 'Τύπος μνήμης', 'Memory type'), pick(ls, (l) => l.memType)],
      lenRow,
      ['power', w(lang, 'Ελάχιστο τροφοδοτικό', 'Minimum PSU'), psu == null ? null : `${num(lang, psu)} W`],
    ];
  },
  cpu: (raw, lang) => {
    const ls = raw as L<CpuListing>;
    const tdp = pick(ls, (l) => l.tdp);
    const cores = pick(ls, (l) => l.cores);
    return [
      ['general', w(lang, 'Πυρήνες', 'Cores'), cores == null ? null : String(cores)],
      ['general', w(lang, 'Συσκευασία', 'Packaging'), pick(ls, (l) => l.packaging)],
      ['general', w(lang, 'Ενσωματωμένα γραφικά', 'Integrated graphics'), yesNo(lang, pick(ls, (l) => l.igpu))],
      ['general', w(lang, 'Ψύκτρα στο κουτί', 'Cooler in the box'), yesNo(lang, pick(ls, (l) => l.coolerIncluded))],
      ['power', 'TDP', tdp == null ? null : `${num(lang, tdp)} W`],
      ['connections', 'Socket', pick(ls, (l) => l.socket)],
    ];
  },
  mobo: (raw, lang) => {
    const ls = raw as L<MoboListing>;
    const form = pick(ls, (l) => l.formFactor);
    const slots = pick(ls, (l) => l.ramSlots);
    const m2 = pick(ls, (l) => l.m2Slots);
    const gen = pick(ls, (l) => l.m2Gen);
    const sata = pick(ls, (l) => l.sataPorts);
    const maxMem = pick(ls, (l) => l.maxMemoryGB);
    return [
      ['general', 'Chipset', pick(ls, (l) => l.chipset)],
      ['general', w(lang, 'Μέγεθος', 'Form factor'), form && form !== 'Άλλο' ? form : null],
      ['general', 'WiFi', yesNo(lang, ls.some((l) => l.wifi))],
      ['general', 'BIOS Flashback', yesNo(lang, pick(ls, (l) => l.biosFlashback))],
      ['connections', 'Socket', pick(ls, (l) => l.socket)],
      ['connections', w(lang, 'Μνήμη', 'Memory'), pick(ls, (l) => l.memory)],
      ['connections', w(lang, 'Θέσεις RAM', 'RAM slots'), slots == null ? null : String(slots)],
      ['connections', w(lang, 'Μέγιστη μνήμη', 'Max memory'), maxMem == null ? null : `${num(lang, maxMem)} GB`],
      ['connections', w(lang, 'Θέσεις M.2', 'M.2 slots'), m2 == null ? null : `${m2}${gen ? ` (PCIe ${gen}.0)` : ''}`],
      ['connections', w(lang, 'Θύρες SATA', 'SATA ports'), sata == null ? null : String(sata)],
    ];
  },
  ram: (raw, lang) => {
    const ls = raw as L<RamListing>;
    const mods = pick(ls, (l) => l.modules);
    const cap = pick(ls, (l) => l.capacity);
    const speed = pick(ls, (l) => l.speed);
    const cl = pick(ls, (l) => l.cas);
    return [
      ['general', w(lang, 'Τύπος', 'Type'), pick(ls, (l) => l.type)],
      ['general', w(lang, 'Μορφή', 'Form factor'), pick(ls, (l) => l.formFactor)],
      ['general', w(lang, 'Σύνολο', 'Total'), cap == null ? null : `${num(lang, cap)} GB`],
      ['general', 'Kit', mods && cap ? `${mods} × ${num(lang, cap / mods)} GB` : null],
      ['general', w(lang, 'Ταχύτητα', 'Speed'), speed == null ? null : `${num(lang, speed)} MHz`],
      ['general', 'CL', cl == null ? null : `CL${cl}`],
    ];
  },
  storage: (raw, lang) => {
    const ls = raw as L<StorageListing>;
    const cap = pick(ls, (l) => l.capacity);
    const pcie = pick(ls, (l) => l.pcie);
    const rpm = pick(ls, (l) => l.rpm);
    const cache = pick(ls, (l) => l.cacheMB);
    const read = pick(ls, (l) => l.readMBs);
    const write = pick(ls, (l) => l.writeMBs);
    const tbw = pick(ls, (l) => l.tbw);
    const tier = pick(ls, (l) => l.tier);
    const TIER = { Consumer: w(lang, 'Οικιακός', 'Consumer'), NAS: 'NAS', Server: 'Server' };
    return [
      ['general', w(lang, 'Τύπος', 'Type'), pick(ls, (l) => l.media)],
      ['general', w(lang, 'Κατηγορία', 'Tier'), tier ? TIER[tier] : null],
      ['general', w(lang, 'Χωρητικότητα', 'Capacity'), cap == null ? null : cap >= 1000 ? `${num(lang, cap / 1000, 2)} TB` : `${num(lang, cap)} GB`],
      ['general', w(lang, 'Ανάγνωση', 'Read'), read == null ? null : `${num(lang, read)} MB/s`],
      ['general', w(lang, 'Εγγραφή', 'Write'), write == null ? null : `${num(lang, write)} MB/s`],
      ['general', 'DRAM', yesNo(lang, pick(ls, (l) => l.dram))],
      ['general', 'TBW', tbw == null ? null : `${num(lang, tbw)} TB`],
      ['general', w(lang, 'Ψύκτρα', 'Heatsink'), yesNo(lang, pick(ls, (l) => l.heatsink))],
      ['general', 'RPM', rpm == null ? null : num(lang, rpm)],
      ['general', w(lang, 'Μνήμη cache', 'Cache'), cache == null ? null : `${cache} MB`],
      ['dimensions', w(lang, 'Μέγεθος', 'Form factor'), pick(ls, (l) => l.formFactor)],
      ['connections', w(lang, 'Διεπαφή', 'Interface'), pick(ls, (l) => l.iface)],
      ['connections', 'PCIe', pcie == null ? null : `PCIe ${pcie}.0`],
    ];
  },
  psu: (raw, lang) => {
    const ls = raw as L<PsuListing>;
    const eff = pick(ls, (l) => l.efficiency);
    const mod = pick(ls, (l) => l.modular);
    const watts = pick(ls, (l) => l.watts);
    const MOD = { Full: w(lang, 'Πλήρως αρθρωτό', 'Fully modular'), Semi: w(lang, 'Ημι-αρθρωτό', 'Semi-modular'), Non: w(lang, 'Μη αρθρωτό', 'Non-modular') };
    return [
      ['general', w(lang, 'Απόδοση', 'Efficiency'), eff && eff !== 'Standard' ? `80 PLUS ${eff}` : null],
      ['general', w(lang, 'Καλώδια', 'Cables'), mod ? MOD[mod] : null],
      ['dimensions', w(lang, 'Μέγεθος', 'Form factor'), pick(ls, (l) => l.formFactor)],
      ['power', w(lang, 'Ισχύς', 'Power'), watts == null ? null : `${num(lang, watts)} W`],
    ];
  },
  case: (raw, lang) => {
    const ls = raw as L<CaseListing>;
    const size = pick(ls, (l) => l.size);
    const slots = pick(ls, (l) => l.fanSlots);
    const fans = firstOf(ls, (l) => l.fansIncluded);
    const rads = firstOf(ls, (l) => l.radiators);
    const posName = (p: keyof typeof POS | null) => (p ? w(lang, POS[p][0], POS[p][1]) : null);
    const fansText = fans?.map((f) => [`${f.n} ×${f.size ? ` ${f.size} mm` : ''}`, posName(f.pos)].filter(Boolean).join(' ')).join(', ');
    const radText = rads?.map((r) => `${posName(r.pos)} ${r.sizes.join('/')} mm`).join(', ');
    return [
      ['general', w(lang, 'Μέγεθος', 'Size'), size && size !== 'Άλλο' ? size : null],
      ['general', w(lang, 'Παράθυρο', 'Window'), yesNo(lang, pick(ls, (l) => l.window))],
      ['general', 'RGB', yesNo(lang, ls.some((l) => l.rgb))],
      ['general', w(lang, 'Ανεμιστήρες στο κουτί', 'Fans included'), fansText ?? (pick(ls, (l) => l.hasFans) ? w(lang, 'Ναι', 'Yes') : null)],
      ['dimensions', w(lang, 'Μέγιστη μητρική', 'Largest board'), pick(ls, (l) => l.maxBoard)],
      ['dimensions', w(lang, 'Μέγιστη κάρτα γραφικών', 'Longest graphics card'), mm(lang, pick(ls, (l) => l.gpuMaxMm))],
      ['dimensions', w(lang, 'Μέγιστη ψύκτρα CPU', 'Tallest CPU cooler'), mm(lang, pick(ls, (l) => l.coolerMaxMm))],
      ['connections', w(lang, 'Θέσεις ανεμιστήρων', 'Fan positions'), slots == null ? null : String(slots)],
      ['connections', w(lang, 'Θέσεις ψυγείου', 'Radiator mounts'), radText ?? pick(ls, (l) => l.radiatorMounts)],
    ];
  },
  fan: (raw, lang) => {
    const ls = raw as L<FanListing>;
    const pack = pick(ls, (l) => l.pack);
    const cfm = pick(ls, (l) => l.airflowCfm);
    const mmh = pick(ls, (l) => l.pressureMm);
    const type = pick(ls, (l) => l.fanType);
    return [
      ['general', w(lang, 'Μέγεθος', 'Size'), mm(lang, pick(ls, (l) => l.size))],
      ['general', w(lang, 'Τεμάχια', 'Pack'), pack == null ? null : String(pack)],
      ['general', w(lang, 'Τύπος', 'Type'), type == null ? null : type === 'airflow' ? w(lang, 'Ροή αέρα', 'Airflow') : w(lang, 'Στατική πίεση', 'Static pressure')],
      ['general', w(lang, 'Ροή αέρα', 'Airflow'), cfm == null ? null : `${num(lang, cfm, 1)} CFM`],
      ['general', w(lang, 'Στατική πίεση', 'Static pressure'), mmh == null ? null : `${num(lang, mmh, 2)} mmH₂O`],
      ['general', 'RGB', yesNo(lang, ls.some((l) => l.rgb))],
      ['connections', w(lang, 'Βύσμα', 'Connector'), pick(ls, (l) => l.connector) ?? (ls.some((l) => l.pwm) ? '4-pin PWM' : null)],
    ];
  },
  cooler: (raw, lang) => {
    const ls = raw as L<CoolerListing>;
    const aio = pick(ls, (l) => l.type) === 'AIO';
    const sockets = pick(ls, (l) => l.sockets)
      ?.split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    return [
      ['general', w(lang, 'Τύπος', 'Type'), aio ? 'AIO' : w(lang, 'Αέρα', 'Air')],
      ['general', 'RGB', yesNo(lang, ls.some((l) => l.rgb))],
      aio
        ? ['dimensions', w(lang, 'Ψυγείο', 'Radiator'), mm(lang, pick(ls, (l) => l.radiator))]
        : ['dimensions', w(lang, 'Ύψος', 'Height'), mm(lang, pick(ls, (l) => l.heightMm))],
      ['connections', 'Sockets', sockets?.length ? sockets.join(', ') : null],
    ];
  },
  monitor: (raw, lang) => {
    const ls = raw as L<MonitorListing>;
    const size = pick(ls, (l) => l.size);
    const height = pick(ls, (l) => l.height);
    const width = pick(ls, (l) => l.width);
    const hz = pick(ls, (l) => l.hz);
    return [
      ['general', w(lang, 'Διαγώνιος', 'Diagonal'), size == null ? null : `${num(lang, size)}"`],
      ['general', w(lang, 'Ανάλυση', 'Resolution'), height == null ? null : width == null ? `${height}p` : `${width} × ${height}`],
      ['general', w(lang, 'Ρυθμός ανανέωσης', 'Refresh rate'), hz == null ? null : `${hz} Hz`],
      ['general', 'Panel', pick(ls, (l) => l.panel)],
    ];
  },
};

/** The model's full specs in groups (general, dimensions, power, connections); empty values and groups are left out. */
export function specGroups(cat: Category, listings: BaseListing[], lang: Lang, estimate?: Estimate): SpecGroup[] {
  const rows = FULL[cat](listings, lang, estimate);
  return SPEC_GROUP_ORDER.map((id) => ({
    id,
    items: rows
      .filter((r): r is [SpecGroupId, string, string, string?] => r[0] === id && r[2] != null && r[2] !== '')
      .map((r) => ({ label: r[1], value: r[2], ...(r[3] ? { tag: r[3] } : {}) })),
  })).filter((g) => g.items.length > 0);
}
