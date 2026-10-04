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
};

export const specsOf = (cat: Category, listings: BaseListing[], lang: Lang): Spec[] => SPECS[cat](listings, lang);
