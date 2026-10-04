// Values the audit derives from names and titles (independently of the scraper's own parsers,
// except where noted as a copy of site code).

/** Copy of src/lib/categories.tsx `cpuSeries` ("Ryzen 7", "Core Ultra 5", "Xeon Gold"…); null = 'Άλλο'. */
export function cpuSeries(chip) {
  const xeon = chip.match(/^Xeon (Platinum|Gold|Silver|Bronze|w\d)/);
  if (xeon) return `Xeon ${xeon[1]}`;
  return chip.match(/^(Threadripper PRO|Threadripper|EPYC|Ryzen \d|Core Ultra \d|Core i\d|Core \d|Xeon|Athlon|Pentium|Celeron)/)?.[1] ?? null;
}

/**
 * CPU generation from the model number (audit heuristic): "Ryzen 9000", "Core 14th gen",
 * "Core Ultra Series 2", "EPYC gen 4", "Xeon Scalable gen 4"…; null when the name doesn't say.
 */
export function cpuGeneration(chip) {
  let m;
  if ((m = chip.match(/^Ryzen \d (?:PRO )?(\d)\d{3}/))) return `Ryzen ${m[1]}000`;
  if ((m = chip.match(/^Threadripper (?:PRO )?(\d)\d{3}/))) return `Threadripper ${m[1]}000`;
  if ((m = chip.match(/^EPYC \d{3}(\d)/))) return `EPYC gen ${m[1]}`;
  if ((m = chip.match(/^Core Ultra \d (\d)\d\d/))) return `Core Ultra Series ${m[1]}`;
  if ((m = chip.match(/^Core i\d-(\d{5})/))) return `Core ${m[1].slice(0, 2)}th gen`;
  if ((m = chip.match(/^Core i\d-(\d)\d{3}/))) return `Core ${m[1]}th gen`;
  if ((m = chip.match(/^Core \d (\d)\d\d/))) return `Core Series ${m[1]}`;
  if ((m = chip.match(/^Xeon (?:Platinum|Gold|Silver|Bronze) \d(\d)\d\d/))) return `Xeon Scalable gen ${m[1]}`;
  if ((m = chip.match(/^Xeon w\d-(\d)\d{3}/))) return `Xeon W-${m[1]}000`;
  if ((m = chip.match(/^Xeon E-(\d)(\d)\d\d/))) return `Xeon E-${m[1]}${m[2]}00`;
  if ((m = chip.match(/^(Pentium|Celeron) G(\d)\d{3}/))) return `${m[1]} G${m[2]}000`;
  if ((m = chip.match(/^Athlon (\d)\d{2,3}/))) return `Athlon ${m[1]}xx`;
  return null;
}

/** Copy of src/lib/categories.tsx `storageType`. */
export function storageType(l) {
  if (l.media === 'HDD') return 'HDD';
  if (l.iface === 'SAS') return 'SAS SSD';
  if (l.iface === 'NVMe' || (l.iface == null && /^M\.2/.test(l.formFactor ?? ''))) return 'NVMe';
  return 'SATA SSD';
}

// ---------- Title parsers (audit's own; deliberately simple) ----------

/** Capacities a title states, in GB (TB × 1000): "2TB", "1000GB", "1.92 TB". Ignores < 100 GB (cache, DRAM). */
export function titleCapacities(title) {
  const out = new Set();
  for (const m of title.matchAll(/(?<![\d.])(\d{1,3}(?:[.,]\d{1,2})?)\s?(TB|GB)\b/gi)) {
    const v = Number(m[1].replace(',', '.'));
    const gb = m[2].toUpperCase() === 'TB' ? Math.round(v * 1000) : v;
    if (gb >= 100) out.add(gb);
  }
  return [...out];
}

/** Same drive capacity allowing the usual marketing steps (1024 = 1000, 960 ≈ 1000, 1.92 TB ≈ 2 TB …). */
export function sameCapacity(a, b) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return hi / lo <= 1.1;
}

const MODULE_SIZES = new Set([1, 2, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256]);
/** RAM kit stated in a title: {modules, size} from "2x16GB", "(2 x 16GB)" or Shopflix's "(2x16)" / "… 2x32" without GB; or null. */
export function titleKit(title) {
  const m = title.match(/\b(\d{1,2})\s*[x×]\s*(\d{1,3})\s*(?:GB\b|(?=\s*\))|$)/i);
  return m && MODULE_SIZES.has(Number(m[2])) ? { modules: Number(m[1]), size: Number(m[2]) } : null;
}

/** Total RAM a title states first ("32GB …"), not counting the kit's module size. */
export function titleRamTotal(title) {
  const noKit = title.replace(/\b\d{1,2}\s*[x×]\s*\d{1,3}\s*GB\b/gi, ' ');
  const m = noKit.match(/\b(\d{1,4})\s*GB\b/i);
  return m ? Number(m[1]) : null;
}

/** RAM speeds a title states: "6000MHz", "6000 MT/s", "DDR5-6000", "PC5-48000" is ignored. */
export function titleRamSpeeds(title) {
  const out = new Set();
  for (const m of title.matchAll(/\b(\d{3,5})\s*(?:MHz|MT\/s)\b/gi)) out.add(Number(m[1]));
  for (const m of title.matchAll(/\bDDR[2-5]L?-(\d{3,5})\b/gi)) out.add(Number(m[1]));
  return [...out];
}

/** DDR types a title states ("DDR4", "DDR5"; e-shop's mobo "D4"/"D5" suffixes too when `short`). */
export function titleDdr(title, short = false) {
  const out = new Set();
  for (const m of title.matchAll(/\bDDR([2-5])L?\b/gi)) out.add(`DDR${m[1]}`);
  if (short) for (const m of title.matchAll(/(?:\b|[-_])D([45])\b/g)) out.add(`DDR${m[1]}`);
  return [...out];
}

/** Sockets a title states ("AM5", "LGA1700", "Socket 1700", "s1851"). */
export function titleSockets(text) {
  const out = new Set();
  for (const m of text.matchAll(/\b(?:s|socket[\s-]?)?(AM[2-5]\+?|sTR[X]?[45]|sWRX[89]|TR4|SP[356]|FM2\+?)\b/gi)) {
    const s = m[1].toUpperCase().replace(/^STR/, 'sTR').replace(/^SWRX/, 'sWRX');
    out.add(s);
  }
  for (const m of text.matchAll(/\b(?:FC)?LGA[\s-]?(\d{3,4})\b/gi)) out.add(`LGA${m[1]}`);
  for (const m of text.matchAll(/\bsocket[\s-]+(1[0-9]{3}|775|2011(?:-3)?|2066|3647|4189|4677|7529)\b/gi)) out.add(`LGA${m[1]}`);
  return [...out];
}

/** Board form factor a title states, largest-name-first like the scraper (E-ATX, Micro ATX, Mini ITX, ATX). */
export function titleBoard(text) {
  let t = ` ${text} `;
  const found = [];
  const rules = [
    [/\b(?:Extended[\s-]?ATX|E-?ATX|SSI[\s-]?EEB|EEB)\b/gi, 'E-ATX'],
    [/\b(?:Micro[\s-]?ATX|m-?ATX|uATX|MATX)\b/gi, 'Micro ATX'],
    [/\b(?:Mini[\s-]?ITX|ITX|Mini[\s-]?DTX)\b/gi, 'Mini ITX'],
    [/\bATX\b(?![\s-]?(?:3\.\d|12V|PSU|Power))/gi, 'ATX'],
  ];
  for (const [re, name] of rules) {
    if (re.test(t)) found.push(name);
    t = t.replace(re, ' ');
  }
  return found;
}

/** PSU form factors a title states. */
export function titlePsuForm(text) {
  const out = new Set();
  if (/\bSFX(-?L)?\b/i.test(text)) out.add('SFX');
  if (/\bTFX\b/i.test(text)) out.add('TFX');
  if (/\bFlex(-?ATX)?\b/i.test(text)) out.add('Flex');
  if (/\bATX\b/i.test(text.replace(/\b(?:Flex|Micro|Mini|m|E)[\s-]?ATX\b/gi, ' '))) out.add('ATX');
  return [...out];
}

/** Case sizes a title states (same phrases as the scraper's SIZES, checked separately). */
export function titleCaseSizes(text) {
  const out = new Set();
  if (/\b(Full|Ultra|Super|Big)[\s-]?Tower\b/i.test(text)) out.add('Full Tower');
  if (/\bMidi?[\s-]?Tower\b/i.test(text)) out.add('Midi Tower');
  if (/\b(Mini|Micro)[\s-]?Tower\b/i.test(text)) out.add('Mini Tower');
  if (/\b(Cube|SFF|Small Form Factor|HTPC)\b/i.test(text)) out.add('SFF / Cube');
  return [...out];
}

/** Part-number-like tokens in a title: letters + digits, ≥ 7 characters without separators. */
export function partNumbers(title) {
  const out = new Set();
  for (const raw of title.split(/[\s,;()[\]/|"']+/)) {
    const tok = raw.replace(/^[-.]+|[-.]+$/g, '');
    const bare = tok.replace(/[-.]/g, '');
    if (bare.length < 7 || bare.length > 24) continue;
    if (!/[a-z]/i.test(bare) || !/\d/.test(bare)) continue;
    // Spec-like tokens, not part numbers.
    if (/^\d+(GB|TB|MB|MHZ|MTS|MM|W|WATT|RPM|CM|GBPS|MBS)$/i.test(bare)) continue;
    if (/^(DDR\d|PCIE|GEN\d|NVME|GDDR|LGA|SOCKET|USB|WIFI|RTX|GTX|RX)\d*/i.test(bare) && !/[a-z]\d+[a-z]+\d/i.test(bare.slice(4))) continue;
    out.add(bare.toUpperCase());
  }
  return [...out];
}
