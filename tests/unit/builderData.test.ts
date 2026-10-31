// Step 5 task 7: the builder's rows. Power supplies as products (real titles from public/data, 26/10), SFX / SFX-L,
// the spec-group fallback for old builds, one card per CPU, graphics card twins, the shipping-aware row and the junk
// coolers. The step files' equivalence with the full data is in builderFiles.test.ts.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { BaseListing, CoolerListing, CpuListing, GpuListing, Latest, PsuListing } from '../../src/types';
import {
  cpuCards,
  gpuTwinFallback,
  gpuTwinKey,
  junkCooler,
  psuForm,
  psuGroupFallback,
  psuGroupKey,
  rowListing,
  slotFallback,
  slotModels,
  twinsAgree,
  usable,
} from '../../src/lib/builderData';
import { isSfxL, psuProductKey, psuProductName, psuRowKey } from '../../src/lib/psuProduct';
import { candidateKey } from '../../src/lib/slots';
import { builderFiles, mergeTwins, withMakerTables, withPsuProducts } from '../../src/lib/derive';
import { fromColumns } from '../../src/lib/columns';
import { VALIDATION_MODE, validateLatest } from '../../src/data/validate';

const psu = (id: string, title: string, brand: string, watts: number, formFactor: PsuListing['formFactor'] = 'ATX', o: Partial<PsuListing> = {}): PsuListing => ({
  id, source: id.split(':')[0] as PsuListing['source'], title, brand, watts, formFactor, url: '', price: 100, shopCount: null,
  chip: `${watts}W`, scrapedAt: '', efficiency: null, modular: null, ...o,
});
const key = (title: string, brand: string, watts: number, ff: PsuListing['formFactor'] = 'ATX') => psuProductKey(psu('x:1', title, brand, watts, ff));

describe('PSU products from titles (owner answer 8)', () => {
  it('one product across the sites: Corsair RM850e (BestPrice, Shopflix, Skroutz)', () => {
    const k = key('Corsair RMe Series RM850e 850W', 'Corsair', 850);
    expect(k).toBe(key('Corsair RM850e 850W Μαύρο', 'Corsair', 850));
    expect(key('Corsair RM850e ATX3.1 850W Full Modular 80 Plus Gold', 'Corsair', 850)).toBe(key('Corsair RM850e 850W Μαύρο', 'Corsair', 850));
    expect(psuProductName(psu('x:1', 'Corsair RM850e 850W Μαύρο', 'Corsair', 850))).toBe('Corsair RM850e 850W');
  });
  it('MSI MAG A850GL with and without "PCIE5", e-shop.gr capitals and its shop words', () => {
    const k = key('MSI MAG A850GL 850W', 'MSI', 850);
    expect(key('MSI MAG A850GL PCIE5 850W', 'MSI', 850)).toBe(k);
    expect(key('MSI MAG A850GL PCIE5 UNIT 850W 20+4 PIN ATX ATX BLACK', 'MSI', 850)).toBe(k);
    // its white edition is another product
    expect(key('MSI MAG A850GL PCIE5 WHITE UNIT 850W 20+4 PIN ATX ATX 84 MONTHS GUARANTEE', 'MSI', 850)).not.toBe(k);
  });
  it('watts and form factor are part of the product', () => {
    expect(key('Asus ROG Thor III 1000W', 'Asus', 1000)).not.toBe(key('Asus ROG Thor III 1200W', 'Asus', 1200));
    expect(key('Sharkoon Rebel P20 1000W', 'Sharkoon', 1000, 'SFX')).not.toBe(key('Sharkoon Rebel P20 1000W', 'Sharkoon', 1000, 'ATX'));
  });
  it('maker spellings: "FSP/Fortron" and "FSP GROUP … FSP", "Be Quiet" and "BE QUIET!"', () => {
    expect(key('FSP/Fortron Vita BD 750W', 'FSP', 750)).toBe(key('FSP VITA BD 750W 80 PLUS BRONZE NO MODULAR ATX 3.1', 'FSP', 750));
    expect(key('FSP GROUP PPA16F0101 POWER SUPPLY UNIT HYDRO PTM PRO 1650W 80+ PLATINUM ATX 3.1', 'FSP', 1650)).toBe(key('FSP/Fortron Hydro PTM Pro 1650W', 'FSP', 1650));
    expect(key('BE QUIET PURE POWER 13 M 650W 80 PLUS GOLD FULL MODULAR', 'Be Quiet', 650)).toBe(key('Be Quiet Pure Power 13 M 650W', 'Be Quiet', 650));
  });
  it('wrong merges found by hand stay apart (50-product check)', () => {
    // a bare efficiency or "CM" after the wattage names another product
    expect(key('Be Quiet Straight Power 11 850W Platinum', 'Be Quiet', 850)).not.toBe(key('Be Quiet Straight Power 11 850W', 'Be Quiet', 850));
    expect(key('Be Quiet System Power 9 400W CM', 'Be Quiet', 400)).not.toBe(key('Be Quiet System Power 9 400W', 'Be Quiet', 400));
    // "Plus" outside "80 Plus", a revision, a "Gen2" and a white edition
    expect(key('Inter-Tech SL-500 Plus 500W', 'Inter-Tech', 500)).not.toBe(key('Inter-Tech SL-500 500W', 'Inter-Tech', 500));
    expect(key('LC-Power LC6750M rev. 3.1 750W Full Modular 80 Plus Gold', 'LC-Power', 750)).not.toBe(key('LC-Power LC6750M rev. 3.0 750W Μαύρο Full Modular 80 Plus Gold', 'LC-Power', 750));
    expect(key('Sharkoon Rebel P20 Gen2 1000W', 'Sharkoon', 1000)).not.toBe(key('Sharkoon Rebel P20 1000W', 'Sharkoon', 1000));
    expect(key('Thermaltake Toughpower XT 850W Λευκό', 'Thermaltake', 850)).not.toBe(key('Thermaltake Toughpower XT 850W Μαύρο', 'Thermaltake', 850));
    // the "80 Plus" badge still goes, and a series named after an efficiency stays ("MWE Gold" ≠ "MWE Bronze")
    expect(key('CoolerMaster MWE Gold V2 1250W Full Modular 80 Plus Gold', 'Cooler Master', 1250)).toBe(key('Cooler Master MWE Gold V2 1250W', 'Cooler Master', 1250));
    expect(key('Cooler Master MWE Bronze V2 650W', 'Cooler Master', 650)).not.toBe(key('Cooler Master MWE Gold V2 650W', 'Cooler Master', 650));
  });
  it('a Greek capital typed for a Latin one: "Chieftec VEGA Μ" (Greek Mu) = "Vega M"', () => {
    expect(key('Chieftec VEGA Μ 850W Μαύρο Full Modular 80 Plus Gold', 'Chieftec', 850)).toBe(key('Chieftec Vega M 850W', 'Chieftec', 850));
  });
  it('a model code when no series words: in the name, or Skroutz\'s in brackets', () => {
    expect(key('1STPLAYER 650W Full Wired 80 Plus Gold (PS-650AR)', '1stPlayer', 650)).toBe(key('1stPlayer PS-650AR 650W', '1stPlayer', 650));
    expect(key('FSP/Fortron FSP250-50FEB 250W Full Wired 80 Plus Silver', 'FSP', 250)).toBe('fsp|fsp25050feb|250|ATX|?');
    expect(key('Be Quiet SFX-L Power 600W Full Modular 80 Plus Gold', 'Be Quiet', 600, 'SFX')).toBe(key('BE QUIET! SFX-L POWER 600W', 'Be Quiet', 600, 'SFX'));
  });
  it('no series at all: a product of its own listing', () => {
    expect(psuProductKey(psu('shopflix:SF-104740350', 'Corsair 850W ATX Full Modular 80 Plus Gold', 'Corsair', 850))).toBe('id:shopflix:SF-104740350');
    expect(psuProductKey(psu('skroutz:1', 'FSP/Fortron Power Supply 450W Full Wired', 'FSP', 450))).toBe('id:skroutz:1');
    expect(psuProductKey(psu('shopflix:2', 'Asus 850W Μαύρο', 'Asus', 850))).toBe('id:shopflix:2');
  });
  it("candidateKey (the product page's first paint) is the product key", () => {
    const l = psu('bestprice:2164460756', 'Corsair RMe Series RM850e 850W', 'Corsair', 850);
    expect(candidateKey('psu', l, '850W ATX')).toBe(psuProductKey(l));
  });
});

describe('PSU form factors: ATX, SFX, SFX-L offered; TFX/Flex not (answer 8)', () => {
  const m = (ls: PsuListing[]) => slotModels('psu', ls)[0];
  it('SFX-L = an SFX unit with "SFX-L" in a title', () => {
    const loki = [psu('bestprice:2158252575', 'Asus ROG Loki SFX-L 1000W', 'Asus', 1000, 'SFX'), psu('shopflix:SF-10501494', 'Asus ROG Loki SFX-L 1000W Full Modular 80 Plus Platinum', 'Asus', 1000, 'SFX')];
    expect(isSfxL(loki[0])).toBe(true);
    expect(slotModels('psu', loki)).toHaveLength(1);
    expect(psuForm(m(loki))).toBe('SFX-L');
    expect(usable.psu(m(loki))).toBe(true);
  });
  it('ATX and SFX are offered, TFX and Flex are not', () => {
    expect(usable.psu(m([psu('a:1', 'Corsair SF750 750W Full Modular 80 Plus Platinum', 'Corsair', 750, 'SFX')]))).toBe(true);
    expect(usable.psu(m([psu('a:2', 'Corsair RM850e 850W', 'Corsair', 850, 'ATX')]))).toBe(true);
    expect(usable.psu(m([psu('a:3', 'Chieftec GPF-300P 300W', 'Chieftec', 300, 'TFX')]))).toBe(false);
    expect(usable.psu(m([psu('a:4', 'FSP/Fortron FSP400-50FDB 400W', 'FSP', 400, 'Flex')]))).toBe(false);
  });
  it('a product is named from a title not in capitals', () => {
    const ls = [psu('eshop:1', 'CORSAIR RM850E 850W FULLY MODULAR', 'Corsair', 850, 'ATX', { price: 90 }), psu('skroutz:2', 'Corsair RM850e ATX3.1 850W Full Modular 80 Plus Gold', 'Corsair', 850, 'ATX', { price: 99 })];
    expect(slotModels('psu', ls).map((x) => x.chip)).toEqual(['Corsair RM850e 850W']);
  });
});

describe('psuGroupFallback: a build saved as "650W Gold ATX" (old builds, v1 share links)', () => {
  const ls = [
    psu('a:1', 'Corsair RM650e 650W', 'Corsair', 650, 'ATX', { efficiency: 'Gold', price: 89 }),
    psu('a:2', 'Deepcool PN650M 650W', 'Deepcool', 650, 'ATX', { efficiency: 'Gold', price: 72 }),
    psu('a:3', 'Deepcool PL650D 650W', 'Deepcool', 650, 'ATX', { efficiency: 'Bronze', price: 50 }),
    psu('a:4', 'Corsair SF650 650W', 'Corsair', 650, 'SFX', { efficiency: 'Gold', price: 40 }),
  ];
  const models = slotModels('psu', ls);
  it('the group key of a listing is its category-page model', () => expect(psuGroupKey(ls[0])).toBe('650W Gold ATX'));
  it('→ the cheapest current product of that group', () => {
    expect(psuGroupFallback('650W Gold ATX', models)).toBe(psuProductKey(ls[1]));
    expect(slotFallback('psu', '650W Gold ATX', models as never)).toBe(psuProductKey(ls[1]));
  });
  it('no such group → null', () => expect(psuGroupFallback('1600W Titanium ATX', models)).toBeNull());
  it('every listing on main: the group key equals the category page\'s model key', () => {
    const latest = JSON.parse(readFileSync(join(process.cwd(), 'public/data/psu/latest.json'), 'utf8')) as Latest<PsuListing>;
    const bad = latest.listings.filter((l) => psuGroupKey(l) !== `${l.chip} ${l.formFactor}`);
    expect(bad.map((l) => l.id)).toEqual([]);
  });
});

describe('one card per CPU (finding #15)', () => {
  it('Ryzen 5 7600: its Box with cooler, Tray and unknown versions stay choices inside one card', () => {
    const cpu = (id: string, coolerIncluded: boolean | null, price: number, chip = 'Ryzen 5 7600'): CpuListing => ({
      id, source: 'skroutz', title: chip, url: '', price, shopCount: null, brand: 'AMD', chip, scrapedAt: '', cores: 6,
      socket: 'AM5', packaging: null, igpu: true, coolerIncluded,
    } as CpuListing);
    const models = slotModels('cpu', [cpu('a', false, 177), cpu('b', true, 175), cpu('c', null, 197), cpu('d', true, 300, 'Ryzen 7 7700')]);
    const cards = cpuCards(models);
    expect(cards.map((c) => c.chip)).toEqual(['Ryzen 5 7600', 'Ryzen 7 7700']);
    expect(cards[0].versions.map((v) => v.key)).toEqual(['Ryzen 5 7600|true', 'Ryzen 5 7600|false', 'Ryzen 5 7600|?']);
    expect(cards[0].versions.map((v) => v.cheapest.price)).toEqual([175, 177, 197]);
  });
});

const gpu = (id: string, title: string, price: number, o: Partial<GpuListing> = {}): GpuListing => ({
  id, source: id.split(':')[0] as GpuListing['source'], title, url: '', price, shopCount: null, brand: 'Intel', chip: 'Arc A380',
  vram: 6, partner: 'Sparkle', scrapedAt: '', ...o,
});

describe('graphics card twins (finding #16, owner answer 9)', () => {
  const elf = [gpu('bestprice:2159082229', 'Sparkle Arc A380 6GB GDDR6 ELF', 197.8), gpu('skroutz:46467832', 'Sparkle Arc A380 6GB ELF', 203.86, { shipping: 0, total: 203.02 }), gpu('shopflix:SF-105186851', 'Sparkle ARC A380 6GB GDDR6 ELF', 235.46)];
  it('same maker, chip, VRAM and short title on three sites → one twin key', () => {
    expect(new Set(elf.map(gpuTwinKey)).size).toBe(1);
  });
  it('another card of the maker, or the same name with a part number, is not a twin', () => {
    expect(gpuTwinKey(gpu('x:1', 'Sparkle Arc A380 6GB GDDR6 Genie', 150))).not.toBe(gpuTwinKey(elf[0]));
    const eagle = { partner: 'Gigabyte', chip: 'RTX 5070', vram: 12 };
    expect(gpuTwinKey(gpu('s:1', 'Gigabyte GeForce RTX 5070 12GB EAGLE OC SFF 12G', 990, eagle))).not.toBe(
      gpuTwinKey(gpu('n:1', 'Gigabyte GeForce RTX 5070 Eagle OC SFF 12GB GDDR7 GV-N5070EAGLE-OC-12GD', 1169, eagle)),
    );
  });
  it('twins that disagree stay apart: another memory type, another length, or a title that is only the maker', () => {
    const evo = { brand: 'NVIDIA' as const, partner: 'Asus', chip: 'GT 710', vram: 2 };
    const gt = [gpu('bestprice:1', 'Asus GeForce GT 710 2GB GDDR5 Evo', 60, { ...evo, lengthMm: 170 }), gpu('shopflix:2', 'Asus GeForce GT 710 2GB GDDR3 Evo', 55, evo)];
    expect(gpuTwinKey(gt[0])).toBe(gpuTwinKey(gt[1]));
    expect(twinsAgree(gt)).toBe(false);
    expect(mergeTwins(slotModels('gpu', gt))).toHaveLength(2);
    const pny = { brand: 'NVIDIA' as const, partner: 'PNY', chip: 'RTX 5070 Ti', vram: 16 };
    expect(twinsAgree([gpu('skroutz:60811441', 'PNY GeForce RTX 5070 Ti 16GB', 900, pny), gpu('bestprice:2162474063', 'PNY GeForce RTX 5070 Ti 16GB GDDR7', 950, pny)])).toBe(false);
    expect(twinsAgree([gpu('a:1', 'Sparkle Arc A380 6GB ELF', 1, { lengthMm: 180 }), gpu('b:1', 'Sparkle Arc A380 6GB GDDR6 ELF', 1, { lengthMm: 175 })])).toBe(false);
    expect(twinsAgree(elf)).toBe(true);
  });
  it('mergeTwins: one model, its row the cheapest; a saved twin id finds it', () => {
    const merged = mergeTwins(slotModels('gpu', elf));
    expect(merged).toHaveLength(1);
    expect(merged[0].key).toBe('bestprice:2159082229');
    expect(merged[0].listings).toHaveLength(3);
    const rows = [{ ...merged[0].cheapest, twins: 'skroutz:46467832,shopflix:SF-105186851' }];
    expect(gpuTwinFallback('shopflix:SF-105186851', slotModels('gpu', rows))).toBe('bestprice:2159082229');
    expect(gpuTwinFallback('skroutz:999', slotModels('gpu', rows))).toBeNull();
  });
});

describe('the row listing: cheapest incl. shipping where known (answer 11)', () => {
  it('a known total beats a cheaper price with a higher total; ship = the fee', () => {
    const a = gpu('a:1', 'A', 100, { shipping: 5, total: 105 });
    const b = gpu('b:1', 'B', 102, { shipping: 0, total: 102 });
    expect(rowListing([a, b])).toEqual({ listing: b, ship: 0 });
  });
  it('an unknown shipping competes with its price alone, and ship is null', () => {
    const a = gpu('a:1', 'A', 100, { shipping: 5, total: 105 });
    const c = gpu('c:1', 'C', 103);
    expect(rowListing([a, c]).listing.id).toBe('c:1');
    expect(rowListing([a, c]).ship).toBeNull();
  });
  it("a total that is another offer's (more than 2% from the price, data.ownTotal) is not used", () => {
    const a = gpu('bestprice:2164461300', 'A', 95.19, { shipping: 0, total: 169 });
    expect(rowListing([a])).toMatchObject({ listing: { id: 'bestprice:2164461300', total: null }, ship: null });
  });
  it('the real Sparkle Arc A380 ELF on Skroutz: total 203.02 with free delivery → ship 0, never negative', () => {
    expect(rowListing([gpu('skroutz:46467832', 'Sparkle Arc A380 6GB ELF', 203.86, { shipping: 0, total: 203.02 })]).ship).toBe(0);
  });
});

describe('junk coolers (finding #21)', () => {
  const cooler = (chip: string): CoolerListing => ({ id: 'x:1', source: 'skroutz', title: chip, url: '', price: 9, shopCount: null, brand: 'Xilence', chip, scrapedAt: '', type: 'Air', radiator: null, rgb: false } as CoolerListing);
  it('the accessory names are not offered (real: "Xilence μετατροπέας")', () => {
    for (const n of ['Xilence μετατροπέας', 'Noctua NM-AM5 mounting kit', 'Arctic LGA1700 bracket', 'Thermalright AM5 adapter', 'Cooler Master Βάση']) {
      expect(junkCooler(slotModels('cooler', [cooler(n)])[0])).toBe(true);
      expect(usable.cooler(slotModels('cooler', [cooler(n)])[0])).toBe(false);
    }
  });
  it('coolers stay', () => {
    for (const n of ['Thermalright Peerless Assassin 120 SE', 'Noctua NH-D15', 'Arctic Liquid Freezer III 360']) expect(usable.cooler(slotModels('cooler', [cooler(n)])[0])).toBe(true);
  });
});

describe('the step files on real data (validated, as the site)', () => {
  // as the site: validated, then the build-time tables (PSU products' attached efficiency)
  const read = <L extends BaseListing>(cat: string) => withMakerTables(cat as never, validateLatest(cat as never, JSON.parse(readFileSync(join(process.cwd(), 'public/data', cat, 'latest.json'), 'utf8')) as Latest<L>, VALIDATION_MODE).latest as never) as unknown as Latest<L>;
  const all = { psu: read<PsuListing>('psu'), gpu: read<GpuListing>('gpu') };
  const files = builderFiles(all as never, 'T');
  it('psu.json: one row per product, regrouped in the browser by its name (no title there)', () => {
    const rows = fromColumns<PsuListing>(files.slots.psu);
    const models = slotModels('psu', rows);
    expect(models).toHaveLength(rows.length);
    expect(rows.every((r) => r.title === '')).toBe(true);
    // keyed from its name (psuRowKey); a row whose name wouldn't give its key carries it (none today)
    const want = slotModels('psu', all.psu.listings as PsuListing[]).filter((m) => usable.psu(m)).map((m) => m.key);
    expect(models.map((m) => m.key).sort()).toEqual(want.sort());
    expect(models.every((m) => m.chip === m.cheapest.chip && /\d+W( (Diamond|Titanium|Platinum|Gold|Silver|Bronze|Standard))?$/.test(m.chip))).toBe(true);
    expect(rows.filter((r) => r.product != null).length).toBeLessThan(rows.length / 20);
    expect(new Set(rows.map((r) => r.formFactor))).toEqual(new Set(['ATX', 'SFX', 'SFX-L']));
    expect(rows.length).toBeGreaterThan(1500); // ≈ 2,400 products today (183 spec groups before)
  });
  it('gpu.json: twins merged (fewer rows than offered cards), each row names its other listings', () => {
    const rows = fromColumns<GpuListing>(files.slots.gpu);
    const twins = rows.filter((r) => r.twins);
    expect(twins.length).toBeGreaterThan(100);
    const ids = new Set(rows.map((r) => r.id));
    for (const r of twins) for (const id of r.twins!.split(',')) expect(ids.has(id)).toBe(false);
  });
  it('rows carry `ship` (null = not known); some are known', () => {
    for (const slot of ['psu', 'gpu'] as const) {
      const rows = fromColumns<{ ship: number | null }>(files.slots[slot]);
      expect(rows.every((r) => r.ship === null || r.ship >= 0)).toBe(true);
      expect(rows.some((r) => r.ship != null)).toBe(true);
    }
  });
});

// ---------- Task 7 fix round 1 (review task-7-review.md) ----------

const P = (id: string, title: string, brand: string, watts: number, efficiency: PsuListing['efficiency'], formFactor: PsuListing['formFactor'] = 'ATX', o: Partial<PsuListing> = {}) =>
  psu(id, title, brand, watts, formFactor, { efficiency, ...o });
const withProducts = (ls: PsuListing[]) => withPsuProducts({ updatedAt: '', sources: {}, listings: ls } as unknown as Latest).listings as unknown as PsuListing[];
const keysOf = (ls: PsuListing[]) => withProducts(ls).map((l) => psuProductKey(l));

describe('I1: the stated efficiency is part of a PSU product', () => {
  it('Asus Prime 750W Bronze and Gold are two products (one site lists both)', () => {
    const [bronze, gold, gold2] = keysOf([
      P('skroutz:59907912', 'Asus Prime 750W Full Wired 80 Plus Bronze', 'Asus', 750, 'Bronze'),
      P('skroutz:47841904', 'Asus Prime 750W Full Modular 80 Plus Gold', 'Asus', 750, 'Gold'),
      P('bestprice:2159010413', 'Asus Prime 750W', 'Asus', 750, 'Gold'),
    ]);
    expect(bronze).not.toBe(gold);
    expect(gold2).toBe(gold);
  });
  it('Corsair CX750: the old Bronze and the 2025 Cybenetics Gold (e-shop.gr) split', () => {
    const [b, g] = keysOf([
      P('eshop:PER.547440', 'CORSAIR CP-9020279-EU CX750 750W 80 PLUS BRONZE', 'Corsair', 750, 'Bronze'),
      P('eshop:PER.548175', 'CORSAIR CX750 750W ATX 3.1 LOW-NOISE CYBENETICS GOLD BLACK CP-9020326-EU', 'Corsair', 750, 'Gold'),
    ]);
    expect(b).not.toBe(g);
  });
  it('a listing with no efficiency joins the one efficiency its series states (NZXT C750: Bronze x3)', () => {
    const ks = keysOf([
      P('shopflix:SF-202530659', 'NZXT C750 750W Μαύρο', 'NZXT', 750, null),
      P('bestprice:2160280215', 'NZXT C750 750W', 'NZXT', 750, 'Bronze'),
      P('skroutz:46916044', 'NZXT C750 750W Full Wired 80 Plus Bronze', 'NZXT', 750, 'Bronze'),
      P('shopflix:SF-18048015', 'NZXT C750 750W Full Wired 80 Plus Bronze', 'NZXT', 750, 'Bronze'),
    ]);
    expect(ks[0]).toBe(ks[1]);
  });
  it('a series that states several efficiencies gives a listing with none no efficiency (review R1: Corsair CX550)', () => {
    const ks = keysOf([
      P('a:1', 'Corsair CX550 550W', 'Corsair', 550, 'Bronze'),
      P('a:2', 'Corsair CX550 550W', 'Corsair', 550, 'Bronze'),
      P('a:3', 'Corsair CX550 550W', 'Corsair', 550, 'Gold'),
      P('a:4', 'Corsair CX550 550W', 'Corsair', 550, null),
    ]);
    expect(ks[3]).not.toBe(ks[0]);
    expect(ks[3]).not.toBe(ks[2]);
    expect(ks[3].endsWith('|?')).toBe(true);
  });
  it('no stated efficiency in the series, or a tie: the listing stays its own (unknown-efficiency) product', () => {
    const none = keysOf([P('skroutz:29265653', 'Chieftec Value Series 400W Full Wired', 'Chieftec', 400, null), P('shopflix:SF-103151833', 'Chieftec Value Series 400W', 'Chieftec', 400, null)]);
    expect(none[0]).toBe(none[1]);
    expect(none[0].endsWith('|?')).toBe(true);
    const tie = keysOf([P('a:1', 'Asus TUF Gaming 850W', 'Asus', 850, 'Gold'), P('a:2', 'Asus TUF Gaming 850W', 'Asus', 850, 'Platinum'), P('a:3', 'Asus TUF Gaming 850W', 'Asus', 850, null)]);
    expect(new Set(tie).size).toBe(3);
  });
  it('the name says the efficiency, and a step-file row is keyed from its name', () => {
    const l = P('skroutz:47841904', 'Asus Prime 750W Full Modular 80 Plus Gold', 'Asus', 750, 'Gold');
    expect(psuProductName(l)).toBe('Asus Prime 750W Gold');
    expect(psuRowKey({ ...l, chip: 'Asus Prime 750W Gold' })).toBe(psuProductKey(l));
    const n = withProducts([P('shopflix:SF-202530659', 'NZXT C750 750W Μαύρο', 'NZXT', 750, null), P('bestprice:2160280215', 'NZXT C750 750W', 'NZXT', 750, 'Bronze')])[0];
    expect(n.productEfficiency).toBe('Bronze');
    expect(psuProductName(n)).toBe('NZXT C750 750W Bronze');
    expect(psuRowKey({ ...n, chip: 'NZXT C750 750W Bronze' })).toBe(psuProductKey(n));
  });
  it('psuGroupFallback finds Asus Prime Gold for "750W Gold ATX"', () => {
    const ls = withProducts([
      P('skroutz:59907912', 'Asus Prime 750W Full Wired 80 Plus Bronze', 'Asus', 750, 'Bronze', 'ATX', { price: 60 }),
      P('skroutz:47841904', 'Asus Prime 750W Full Modular 80 Plus Gold', 'Asus', 750, 'Gold', 'ATX', { price: 90 }),
    ]);
    expect(psuGroupFallback('750W Gold ATX', slotModels('psu', ls))).toBe(psuProductKey(ls[1]));
  });
});

describe('M1: shop words that must not split a PSU product', () => {
  const same = (a: string, b: string, brand: string, w: number, e: PsuListing['efficiency'], ff: PsuListing['formFactor'] = 'ATX') =>
    expect(psuProductKey(P('a:1', a, brand, w, e, ff))).toBe(psuProductKey(P('b:1', b, brand, w, e, ff)));
  it('English "Black" (real BestPrice titles) is a colour like "Μαύρο"', () => {
    same('Lian Li RS1000G Black 1000W', 'Lian Li RS1000G 1000W Full Modular 80 Plus Gold', 'Lian Li', 1000, 'Gold');
    same('Lian Li SX1200P Black 1200W', 'Lian Li SX1200P ATX3.1 1200W Μαύρο', 'Lian Li', 1200, 'Platinum');
    same('Lian Li SX1000P Black 1000W', 'Lian Li SX1000P 1000W Μαύρο', 'Lian Li', 1000, 'Platinum');
    same('Lian Li SP1000P Black 1000W', 'Lian Li SP1000P 1000W', 'Lian Li', 1000, 'Platinum', 'SFX');
    same('Chieftec Value Black 600W', 'Chieftec Value 600W Μαύρο', 'Chieftec', 600, 'Standard');
    same('Chieftec Value Black 700W', 'Chieftec Value 700W', 'Chieftec', 700, 'Standard');
    same('Armaggeddon Overclock Pro Black 350W', 'ARMAGGEDDON OVERCLOCK PRO PSU 350W BLACK OCPRO350B', 'Armaggeddon', 350, null);
    same('Segotep GM1000W Black 1000W Full Modular 80 Plus Gold', 'Segotep GM1000W 1000W', 'Segotep', 1000, 'Gold');
    same('CoolBox PowerLine Black 500W Full Wired', 'CoolBox PowerLine 500W', 'CoolBox', 500, null);
    same('Corsair CX Series CX550F RGB Black 550W', 'Corsair CX550F RGB 550W Μαύρο', 'Corsair', 550, 'Bronze');
  });
  it('"V2" = "V2.0" (Gigabyte UD1000GM PG5, e-shop.gr)', () => {
    same('GIGABYTE UD1000GM PG5 V2 1000W 80 PLUS GOLD FULL MODULAR PCIE 5.1 READY', 'GIGABYTE UD1000GM PG5 V2.0 1000W 80 PLUS GOLD FULLY MODULAR ATX 3.0 PCIE 5.0', 'Gigabyte', 1000, 'Gold');
  });
  it('white stays apart from black', () => {
    expect(psuProductKey(P('a:1', 'Lian Li RS1000G White 1000W', 'Lian Li', 1000, 'Gold'))).not.toBe(psuProductKey(P('b:1', 'Lian Li RS1000G Black 1000W', 'Lian Li', 1000, 'Gold')));
  });
});

describe('I2: a merged card keeps the measured values of any twin', () => {
  const rowsOf = (ls: GpuListing[]) => fromColumns<GpuListing>(builderFiles({ gpu: { updatedAt: '', sources: {}, listings: ls } } as never, 'T').slots.gpu);
  it('Afox GT 730 1GB LP: only Skroutz states 145 mm / 300 W; the merged row has them', () => {
    const afox = { brand: 'NVIDIA' as const, partner: 'Afox', chip: 'GT 730', vram: 1 };
    const rows = rowsOf([
      gpu('bestprice:1', 'AFOX GeForce GT 730 1GB GDDR3 LP', 40, afox),
      gpu('shopflix:2', 'Afox GeForce GT 730 1GB GDDR3 LP', 44, afox),
      gpu('skroutz:3', 'Afox GeForce GT 730 1GB LP', 48, { ...afox, lengthMm: 145, minPsu: 300 }),
    ]);
    expect(rows).toHaveLength(1);
    expect([rows[0].id, rows[0].lengthMm, rows[0].minPsu]).toEqual(['bestprice:1', 145, 300]);
  });
  it('Zotac GT 730 4GB Zone Edition: the stated length and the largest stated minimum PSU', () => {
    const z = { brand: 'NVIDIA' as const, partner: 'Zotac', chip: 'GT 730', vram: 4 };
    const rows = rowsOf([gpu('shopflix:1', 'Zotac GeForce GT 730 4GB GDDR3 Zone Edition', 70, { ...z, minPsu: 250 }), gpu('skroutz:2', 'Zotac GeForce GT 730 4GB Zone Edition', 80, { ...z, lengthMm: 145.79, minPsu: 300 })]);
    expect([rows[0].id, rows[0].lengthMm, rows[0].minPsu]).toEqual(['shopflix:1', 145.79, 300]);
  });
});

describe('M2: the shipping note shows the stored total', () => {
  it('a row carries the total of its own offer', () => {
    const rows = fromColumns<GpuListing>(builderFiles({ gpu: { updatedAt: '', sources: {}, listings: [gpu('skroutz:46467832', 'Sparkle Arc A380 6GB ELF', 203.86, { shipping: 0, total: 203.02, minPsu: 300 })] } } as never, 'T').slots.gpu);
    expect([rows[0].ship, rows[0].total]).toEqual([0, 203.02]);
  });
});
