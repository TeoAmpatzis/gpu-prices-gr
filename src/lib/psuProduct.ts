// A power supply as a product (step 5 task 7, owner answer 8): maker + series words + watts, read from the shop's
// title at build time (the scraper has no product field). The category page /psu keeps its spec groups ("850W Gold
// ATX"); the builder, pick mode and the product page's "Add" offer these products. No imports, so the product page's
// first paint can compute a listing's builder key (slots.candidateKey) without the builder's code.
//
// The series is the title before its first wattage ("Corsair RM850e 850W …" → "RM850e"), without the maker, shop
// category words ("POWER SUPPLY", "Τροφοδοτικό"), colours other than white, efficiency badges ("80 Plus Gold",
// "Cybenetics Platinum"), cabling ("Full Modular"), standards (ATX 3.1, PCIe 5.1, 12V-2x6), sizes ("135mm") and long
// part numbers ("PPA10A4002", "CP-9020307-EU"). An efficiency word that is not part of a badge stays: it names a
// series ("Cooler Master MWE Gold 850 V2" ≠ "MWE Bronze V2"). A title with no series words left ("Corsair 850W Full
// Modular 80 Plus Gold") is a product of its own listing: two such offers can't be told apart, nor matched safely.

export interface PsuTitle {
  id: string;
  title: string;
  brand: string;
  watts: number;
  formFactor: string;
  /** The stated efficiency (80 PLUS / Cybenetics folded to one tier by the scraper); null = not stated. */
  efficiency?: string | null;
  /** Build time (derive.withPsuProducts): the efficiency of the product a listing with none stated belongs to. */
  productEfficiency?: string | null;
}

/** Letters and digits, lower case (Greek letters kept). */
const alnum = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/** A wattage: "850W", "850 W", "1000WATT", "235 Watt". */
const WATTS = /(^|[\s,(/-])(\d{3,4})\s*(?:w|watts?)(?=$|[\s,)/.-])/giu;
const MARK = ' \u0001 ';

const EFFICIENCY = new Set(['bronze', 'silver', 'gold', 'platinum', 'titanium', 'diamond', 'standard']);
/** Badge words; "Plus" only right after "80" ("Inter-Tech SL-500 Plus" is a product of its own). */
const BADGE = new Set(['80', '80plus', 'cybenetics', 'rating']);
/** Words that never name a series. */
const NOISE = new Set([
  'power', 'supply', 'unit', 'psu', 'series', 'edition', 'gaming', 'full', 'semi', 'non', 'modular', 'fully', 'wired',
  'atx', 'sfx', 'sfxl', 'tfx', 'flex', 'pcie', 'pci', 'e', 'gen', 'pin', 'black', 'grey', 'gray', 'with', 'for', 'and',
  'fan', 'low', 'noise', 'ultra', 'lownoise', 'ultralownoise', 'apfc', 'pfc', 'active', 'fortron', 'group', 'tt', 'ultralow',
]);
/** A standard or size token (PCIe Gen4/5 only: "Rebel P20 Gen2" is a revision): ATX3.1, PCIE5.1, Gen5, 12V-2x6, 20+4, 135mm, 12cm, 80+. */
const STANDARD = /^(atx\d(\.\d)?|pcie?\d(\.\d)?|pci-?e\d?(\.\d)?|gen\.?[45](\.\d)?|12v-?2x6|12\+4(pin)?|20\+4|24pin|\d+(mm|cm)|80\+)$/i;
/** A version number ("3.1") is a standard after ATX / PCIe / Gen / SFX ("ATX 3.1"), else a revision ("rev. 3.1"). */
const VERSION = /^\d\.\d$/;
const STANDARD_BEFORE = new Set(['atx', 'pcie', 'pci', 'e', 'gen', 'sfx', 'sfxl']);
/** A long shop part number (letters and ≥ 5 digits in ≥ 9 characters, or an "-EU" order code). */
const partNumber = (w: string) => {
  const a = alnum(w);
  return (a.length >= 9 && (a.match(/\d/g)?.length ?? 0) >= 5) || /-(eu|ww|uk)$/i.test(w);
};
/** Words that name a product only when nothing else does: "Be Quiet SFX-L Power 600W". */
const NAMED = new Set(['power', 'sfx', 'sfxl']);
/** Size words name a product only with an SFX word among them ("SFX-L Power"; "FSP Power Supply 450W" names none). */
const sfxName = (ws: string[]) => (ws.some((w) => alnum(w).startsWith('sfx')) ? ws : []);
const GREEK = /\p{Script=Greek}/u;
/** Greek capitals typed for Latin ones in a short word ("Chieftec VEGA Μ" with a Greek Mu). */
const LOOKALIKE: Record<string, string> = { Α: 'A', Β: 'B', Ε: 'E', Ζ: 'Z', Η: 'H', Ι: 'I', Κ: 'K', Μ: 'M', Ν: 'N', Ο: 'O', Ρ: 'P', Τ: 'T', Υ: 'Y', Χ: 'X' };
const latin = (w: string) => (w.length <= 3 && [...w].every((c) => c in LOOKALIKE) ? [...w].map((c) => LOOKALIKE[c]).join('') : w);
const COLOUR_WHITE = /^(white|λευκό|λευκο|λευκή|λευκη)$/iu;

/** The maker's name for a product: the listing's vendor, or the title's first word when the vendor is unknown. */
export function psuMaker(l: Pick<PsuTitle, 'brand' | 'title'>): string {
  return l.brand && l.brand !== 'Other' ? l.brand : (l.title.trim().split(/\s+/)[0] ?? '');
}

/** The series words, as written in the title (empty = none). */
export function psuSeries(l: Pick<PsuTitle, 'brand' | 'title'>): string[] {
  const maker = alnum(psuMaker(l));
  const [head, ...tail] = l.title.replace(/\([^)]*\)/g, ' ').replace(/[/,]/g, ' ').replace(WATTS, `$1${MARK}`).split(MARK);
  const words = (s: string) => s.split(/\s+/).filter(Boolean);
  // "V2.0" is "V2" (Gigabyte UD1000GM PG5 V2 / V2.0 on e-shop.gr); "rev. 2.0" stays a revision.
  const ws = words(head).map(latin).map((w) => w.replace(/^v(\d+)\.0$/i, 'V$1'));
  // The maker's words at the start ("Be Quiet!", "FSP/Fortron", "Cooler Master"); its name anywhere goes too.
  let i = 0;
  for (let acc = ''; i < ws.length; i++) {
    const next = acc + alnum(ws[i]);
    if (!next || !maker.startsWith(next)) break;
    acc = next;
    if (acc === maker) {
      i++;
      break;
    }
  }
  const pick = (rest: string[], o: { codes?: boolean; named?: boolean; tail?: boolean } = {}): string[] => {
    const out: string[] = [];
    rest.forEach((w, k) => {
      const a = alnum(w);
      if (!a || a === maker || (GREEK.test(w) && !COLOUR_WHITE.test(w))) return;
      if (COLOUR_WHITE.test(w)) return void out.push('White');
      if (o.named && NAMED.has(a)) return void out.push(w);
      if (NOISE.has(a) || BADGE.has(a) || STANDARD.test(w) || w === '-' || w === '&') return;
      if (a === 'plus' && alnum(rest[k - 1] ?? '') === '80') return;
      if (VERSION.test(w) && STANDARD_BEFORE.has(alnum(rest[k - 1] ?? ''))) return;
      if (partNumber(w) && !o.codes) return;
      if (EFFICIENCY.has(a)) {
        // "80 Plus Gold", "Gold 80+", "Cybenetics Platinum": a badge, not a series name.
        const near = [rest[k - 1], rest[k + 1]].filter((x): x is string => !!x);
        if (near.some((x) => BADGE.has(alnum(x)) || alnum(x) === 'plus' || x === '80+')) return;
      }
      out.push(w);
    });
    // A colour alone names no series (after the wattage it tells an edition apart).
    return !o.tail && out.every((w) => w === 'White') ? [] : out;
  };
  // BestPrice's family prefix "Corsair RMe Series RM850e": the word before "Series" goes when a model follows it
  // ("Lian Li RB Series 650W" keeps "RB").
  const rest = ws.slice(i).filter((_, k, all) => !(alnum(all[k + 1] ?? '') === 'series' && k + 2 < all.length && /\d/.test(all.slice(k + 2).join(''))));
  const brackets = [...l.title.matchAll(/\(([^)]*)\)/g)].map((x) => x[1]).filter((x) => !/^\s*\d{4}\s*$/.test(x));
  // The series words, plus what after the wattage tells two products apart: a bare efficiency ("Straight Power 11
  // 850W Platinum" is the Platinum one), "CM" (cable management: "System Power 9 400W CM"), the white editions
  // ("… 850W Λευκό", "GF A3 1200W GOLD SNOW"); the rest there is shop wording.
  const after = pick(words(tail.join(' ')), { tail: true }).filter((w) => EFFICIENCY.has(alnum(w)) || /^(cm|white|snow)$/i.test(w));
  const main = pick(rest);
  if (main.length) return [...main, ...after.filter((w) => !main.some((x) => alnum(x) === alnum(w)))];
  // Else a model code in the name ("FSP250-50FEB"); else Skroutz's code in brackets ("(PS-650AR)"); else words after
  // the wattage ("WHITE SHARK 850W ADMIRAL"); else a name made of size words ("SFX-L Power").
  for (const cand of [pick(rest, { codes: true }), pick(words(brackets.join(' ')), { codes: true }), pick(words(tail.join(' '))), sfxName(pick(rest, { named: true }))]) {
    if (cand.length) return cand;
  }
  return [];
}

/** The efficiency a product is: the listing's stated one, else the one derive.withPsuProducts attached (null = unknown). */
export const psuEfficiency = (l: Pick<PsuTitle, 'efficiency' | 'productEfficiency'>): string | null => l.efficiency ?? l.productEfficiency ?? null;

/**
 * Maker + series + watts + form factor ("corsair|rm850e|850|ATX"; SFX-L units are SFX by the scraper's form factor, so
 * a title that says "SFX-L" on one site only still matches), or "id:<listing id>" when the title names no series.
 * The series' products of every efficiency share it (derive.withPsuProducts counts their stated efficiencies).
 */
export function psuBaseKey(l: PsuTitle): string {
  const series = psuSeries(l).map(alnum).join('');
  return series ? `${alnum(psuMaker(l))}|${series}|${l.watts}|${l.formFactor}` : `id:${l.id}`;
}

/**
 * The builder's key of a power supply: its base key + its efficiency ("corsair|rm850e|850|ATX|Gold"; "?" = not stated
 * and not attached), since one series is sold at two efficiencies under one name (Asus Prime 750W Bronze and Gold, the
 * old CX750 Bronze and the 2025 CX750 Gold; review task 7 I1), or "id:<listing id>" when the title names no series.
 */
export function psuProductKey(l: PsuTitle): string {
  const base = psuBaseKey(l);
  return base.startsWith('id:') ? base : `${base}|${psuEfficiency(l) ?? '?'}`;
}

/** The product's name: maker + series + watts + efficiency ("Asus Prime 750W Gold"); a title in capitals keeps its words. */
export function psuProductName(l: PsuTitle): string {
  const eff = psuEfficiency(l);
  return [psuMaker(l), ...psuSeries(l), `${l.watts}W`, ...(eff ? [eff] : [])].join(' ');
}

/**
 * A builder step file row's product key from its name (the row's title is in the extra file; derive.builderFiles
 * writes `product` only on a row where this would differ): the name is maker + series + watts + efficiency, so its
 * words between the maker and the wattage are the series. A name with none is a product of its own listing.
 */
export function psuRowKey(r: { id: string; brand: string; chip: string; watts: number; formFactor: string; efficiency?: string | null; productEfficiency?: string | null }): string {
  const ws = r.chip.split(' ');
  const eff = psuEfficiency(r);
  let tail = ws.length;
  if (eff && ws[tail - 1] === eff) tail--;
  if (ws[tail - 1] === `${r.watts}W`) tail--;
  const maker = alnum(r.brand && r.brand !== 'Other' ? r.brand : ws[0]);
  let i = 0;
  for (let acc = ''; i < tail && acc !== maker; i++) acc += alnum(ws[i]);
  const series = alnum(ws.slice(i, tail).join(''));
  return series ? `${maker}|${series}|${r.watts}|${r.formFactor === 'SFX-L' ? 'SFX' : r.formFactor}|${eff ?? '?'}` : `id:${r.id}`;
}

/** SFX-L: an SFX unit whose title says so (22 listings on main, 25/10); the case rule (16) reads it. */
export const isSfxL = (l: { formFactor: string; title: string }) => l.formFactor === 'SFX' && /\bSFX-?L\b/i.test(l.title);
