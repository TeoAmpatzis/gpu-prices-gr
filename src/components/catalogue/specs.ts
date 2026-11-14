import type { BaseListing, Category } from '../../types';
import type { Lang, Text } from '../../lib/i18n';
import { cpuThreads } from '../../lib/cpuThreads';

interface Spec {
  label: Text;
  value: string | null;
  hide?: boolean;
}
/** Read the selected listing only. Absent measurements stay absent, including unsupported source fields. */
export function productSpecs(cat: Category, listing: BaseListing, lang: Lang): Spec[] {
  const l = listing as unknown as Record<string, unknown>;
  const number = (key: string, unit = '') => (typeof l[key] === 'number' ? `${l[key]}${unit}` : null);
  const word = (key: string) => (typeof l[key] === 'string' && l[key] !== 'Άλλο' ? String(l[key]) : null);
  const yes = (key: string) => (typeof l[key] === 'boolean' ? (l[key] ? (lang === 'el' ? 'Ναι' : 'Yes') : lang === 'el' ? 'Όχι' : 'No') : null);
  const ratio = (key: string, divisor: number, unit: string) =>
    typeof l[key] === 'number' && Number(l[key]) > 0 ? `${(listing.price / (Number(l[key]) / divisor)).toFixed(2)} ${unit}` : null;
  const spec = (el: string, en: string, value: string | null, hide = false): Spec => ({ label: { el, en }, value, hide });
  switch (cat) {
    case 'headphones': {
      const form = { 'over-ear': ['Over-ear', 'Over-ear'], 'on-ear': ['On-ear', 'On-ear'], 'in-ear': ['In-ear', 'In-ear'], 'open-ear': ['Open-ear', 'Open-ear'], 'bone-conduction': ['Οστική αγωγή', 'Bone conduction'] }[String(l.formFactor)];
      const connection = { wireless: ['Ασύρματα', 'Wireless'], wired: ['Ενσύρματα', 'Wired'], both: ['Ασύρματα και ενσύρματα', 'Wireless and wired'] }[String(l.connection)];
      return [
        spec('Τύπος', 'Type', form ? form[lang === 'el' ? 0 : 1] : null),
        spec('Σύνδεση', 'Connection', connection ? connection[lang === 'el' ? 0 : 1] : null),
        spec('ANC', 'ANC', yes('anc')),
        spec('Αυτονομία', 'Battery', number('batteryHours', ' h'), true),
      ];
    }
    case 'mouse': {
      const connection = { wireless: ['Ασύρματο', 'Wireless'], wired: ['Ενσύρματο', 'Wired'], both: ['Ασύρματο και ενσύρματο', 'Wireless and wired'] }[String(l.connection)];
      return [
        spec('Σύνδεση', 'Connection', connection ? connection[lang === 'el' ? 0 : 1] : null),
        spec('DPI', 'DPI', number('dpi')),
        spec('Polling rate', 'Polling rate', number('pollingHz', ' Hz'), true),
        spec('Κουμπιά', 'Buttons', number('buttons')),
      ];
    }
    case 'gpu':
      return [
        spec('Μήκος', 'Length', number('lengthMm', ' mm')),
        spec('Προτεινόμενο PSU', 'Recommended PSU', number('minPsu', ' W'), true),
        spec('Βύσμα', 'Connector', null),
      ];
    case 'cpu':
      return [
        spec('Socket', 'Socket', word('socket')),
        spec('Πυρήνες / νήματα', 'Cores / threads', number('cores') ? `${number('cores')} / ${cpuThreads(String(l.chip), l.cores as number, [String(l.title ?? '')]) ?? '—'}` : null),
        spec('Boost', 'Boost', null),
        spec('TDP', 'TDP', number('tdp', ' W'), true),
        spec('Γραφικά', 'Graphics', yes('igpu'), true),
      ];
    case 'mobo':
      return [
        spec('Chipset', 'Chipset', word('chipset')),
        spec('Μέγεθος', 'Form', word('formFactor')),
        spec('Μνήμη', 'Memory', word('memory'), true),
        spec('M.2', 'M.2', number('m2Slots')),
        spec('WiFi', 'WiFi', yes('wifi'), true),
      ];
    case 'ram':
      return [
        spec('Kit', 'Kit', number('modules') && number('capacity') ? `${number('modules')} × ${Number(l.capacity) / Number(l.modules)} GB` : null),
        spec('Ταχύτητα', 'Speed', number('speed', ' MT/s')),
        spec('CL', 'CL', number('cas'), true),
        spec('€/GB', '€/GB', ratio('capacity', 1, '€/GB')),
      ];
    case 'storage':
      return [
        spec('Τύπος', 'Type', [word('iface') ?? word('media'), word('formFactor')].filter(Boolean).join(' · ') || null),
        spec('Χωρητικότητα', 'Capacity', number('capacity', ' GB')),
        spec('Ανάγνωση', 'Read speed', number('readMBs', ' MB/s'), true),
        spec('€/TB', '€/TB', ratio('capacity', 1000, '€/TB')),
      ];
    case 'case':
      return [
        spec('Μητρικές', 'Motherboards', word('maxBoard')),
        spec('Μέγιστο GPU', 'GPU maximum', number('gpuMaxMm', ' mm')),
        spec('Μέγιστο ψύκτρας', 'Cooler maximum', number('coolerMaxMm', ' mm'), true),
        spec('Ανεμιστήρες', 'Fans', Array.isArray(l.fansIncluded) ? String(l.fansIncluded.reduce((n: number, f: { n: number }) => n + f.n, 0)) : null),
      ];
    case 'psu':
      return [
        spec('Ισχύς', 'Wattage', number('watts', ' W')),
        spec('80+', '80+', word('efficiency')),
        spec('Καλωδίωση', 'Modular', word('modular'), true),
        spec('Πρότυπο', 'Standard', l.atx3 === true ? 'ATX 3.x' : null),
        spec('€/W', '€/W', ratio('watts', 1, '€/W')),
      ];
    case 'cooler':
      return [
        spec('Τύπος', 'Type', word('type')),
        spec('Ύψος / ψυγείο', 'Height / radiator', l.type === 'AIO' ? number('radiator', ' mm') : number('heightMm', ' mm')),
        spec('Θόρυβος', 'Noise', null, true),
      ];
    case 'monitor':
      return [
        spec('Διαγώνιος', 'Diagonal', number('size', '"')),
        spec('Ανάλυση', 'Resolution', typeof l.height === 'number' ? `${l.height}p` : null),
        spec('Ρυθμός ανανέωσης', 'Refresh rate', number('hz', ' Hz')),
        spec('Panel', 'Panel', word('panel')),
      ];
    case 'fan':
      return [
        spec('Μέγεθος', 'Size', number('size', ' mm')),
        spec('Συσκευασία', 'Pack', number('pack')),
        spec('Βύσμα', 'Connector', word('connector'), true),
        spec('Θόρυβος', 'Noise', null),
        spec('€/ανεμιστήρα', '€/fan', ratio('pack', 1, '€/fan')),
      ];
  }
}
