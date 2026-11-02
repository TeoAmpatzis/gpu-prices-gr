// The gate's 7 builds (step 5 task 16), from the 20/10 test drive (.superpowers/sdd/2026-10-20-builder-test-drive/work/
// builds.mjs), with the v2 picker's card text: "Name | specs | price | shop | … | Choose".
// Per part: `query` typed into the picker's search, `sort` (recommended / price / value), `pick` = regex on the card's
// text (first enabled match in shown order, "Show more" while needed), `fallbackQuery` / `fallback` when the named
// part isn't offered, `probe` = extra looks at the step (a screenshot and a check, nothing chosen), `skip` = no part.
// `expect`: the findings Review may show. Any error fails the run unless listed in `errors`; any warning fails unless its
// rule is in `warnings`; `need` = findings that must be there ({ rule, status }).
const P = (query, pick, more = {}) => ({ query, pick, ...more });

const A = {
  name: 'cheap gaming 700 €',
  use: 'gaming',
  budget: 700,
  parts: {
    cpu: P('7500F', '^Ryzen 5 7500F \\|'),
    mobo: P('B650', '\\| B650 · AM5 · (ATX|Micro ATX) ·', { sort: 'price' }),
    ram: P('DDR5 32GB', '^DDR5 32GB \\(2×16GB\\) 6000MHz', { sort: 'price' }),
    gpu: P('RTX 5060', 'RTX 5060(?! ?Ti)', { sort: 'price' }),
    cooler: P('Assassin', 'Assassin', { sort: 'price' }),
    storage: P('NV3 1TB', '^Kingston NV3 1TB \\|'),
    case: P('Montech XR', '^Montech XR'),
    // #4: under Recommended a unit without stated efficiency or a known maker is never first (Price sorts by price).
    psu: P('650W', '650W Gold', { sort: 'price', probe: [{ name: 'psu-recommended', query: '', sort: 'recommended', check: 'psuJunkNotFirst' }, { name: '650w-whole-number', query: '650W', check: 'none', re: '\\d650 ?W' }] }), // #32: 650W never finds 1650W
    fan: { skip: true },
  },
  expect: { warnings: [] },
};

const B = {
  name: 'mid gaming 1,300 €',
  use: 'gaming',
  budget: 1300,
  parts: {
    cpu: P('7800X3D', '^Ryzen 7 7800X3D \\|'),
    mobo: P('B650', '\\| B650 · AM5 · ATX ·', { sort: 'price' }),
    ram: P('DDR5 32GB', '^DDR5 32GB \\(2×16GB\\) 6000MHz', { sort: 'price' }),
    gpu: P('RTX 5070', 'RTX 5070(?! ?Ti)', { sort: 'price' }),
    cooler: P('Phantom Spirit', 'Phantom Spirit', { sort: 'price' }),
    storage: P('SN7100 1TB', 'SN7100 1TB', { sort: 'price', fallbackQuery: 'NV3 1TB', fallback: '^Kingston NV3 1TB \\|' }),
    case: P('XT Pro', 'Phanteks XT Pro', { fallbackQuery: 'Phanteks', fallback: 'Phanteks' }),
    psu: P('850W', '850W Gold', { sort: 'price' }),
    fan: P('P12 Pro', 'P12 Pro', { sort: 'price', fallbackQuery: 'P12', fallback: 'P12' }),
  },
  expect: { warnings: [] },
};

const C = {
  name: 'high-end 3,500 € Ryzen 9 + RTX 5090',
  use: 'gaming',
  budget: 3500,
  parts: {
    cpu: P('9950X3D', '^Ryzen 9 9950X3D \\|'),
    mobo: P('X870E', 'X870E', { sort: 'price' }),
    ram: P('DDR5 64GB', '^DDR5 64GB \\(2×32GB\\) (6000|6400)MHz', { sort: 'price', fallback: '^DDR5 64GB \\(2×32GB\\)' }),
    gpu: P('RTX 5090', '^(?!.*(Waterforce|Liquid|WB|Hybrid|Ice)).*RTX 5090', { sort: 'price' }),
    cooler: P('360', 'Liquid Freezer III.*360|AIO 360|360', { sort: 'price' }),
    storage: P('990 Pro 2TB', '990 Pro 2TB', { sort: 'price', fallbackQuery: '2TB', fallback: 'NVMe' }),
    case: P('O11 Dynamic EVO', 'O11 Dynamic EVO( \\||$)', {
      fallback: 'O11',
      // #9: the H9 Flow is offered with the 5090 (G1: its 200 mm figure is not trusted, so not verified, not hidden).
      // #12: the SG13 and 3200D RS as the data has them (recorded; fixes are Q-B1 overrides / G1, G2).
      probe: [{ name: 'h9flow', query: 'H9 Flow', check: 'someShown' }, { name: 'sg13', query: 'SG13' }, { name: '3200d', query: '3200D' }],
    }),
    // #3: a 1000 W unit is offered (rule 14 warning at most, never hidden).
    psu: P('1000W', '1000W (Gold|Platinum)', { sort: 'price', probe: [{ name: '1000w', query: '1000W', check: 'someShown' }] }),
    fan: { skip: true },
  },
  expect: { warnings: [14] },
};

const D = {
  name: 'Mini-ITX 1,200 €',
  use: 'gaming',
  budget: 1200,
  parts: {
    cpu: P('7600', '^Ryzen 5 7600 \\|', { sort: 'price' }),
    mobo: P('B650', '(B650E?-?I|B850-?I).*\\| B[68]50E? · AM5', { sort: 'price', fallbackQuery: 'ITX', fallback: 'AM5' }),
    ram: P('DDR5 32GB', '^DDR5 32GB \\(2×16GB\\) 6000MHz', { sort: 'price' }),
    gpu: P('RTX 5060', 'RTX 5060(?! ?Ti)', { sort: 'price' }),
    cooler: P('NH-L9', 'NH-L9a-AM5', { sort: 'price', fallback: 'NH-L9' }),
    storage: P('NV3 1TB', '^Kingston NV3 1TB \\|'),
    case: P('Terra', '^Fractal Design Terra'),
    // #1/#2: SFX units are offered; an ATX unit is never "fits" in the Terra.
    psu: P('SFX', '\\b(650|750|850)W.*· SFX', { sort: 'price', probe: [{ name: 'atx-in-terra', query: '650W', check: 'noAtxFits' }, { name: 'atx-in-terra-all', query: '650W', all: true, check: 'noAtxFits' }] }),
    fan: { skip: true },
  },
  expect: { warnings: [] },
};

const E = {
  name: 'everyday 500 €',
  use: 'everyday',
  budget: 500,
  parts: {
    // The Box version: AMD's pages for the 8600G state no cooler (task 3), so "not stated" — never faked as included.
    cpu: P('8600G', '^Ryzen 5 8600G \\|.*(cooler: not stated|ψύκτρα: δεν αναφέρεται)', { fallback: '^Ryzen 5 8600G \\|' }),
    mobo: P('A620', 'A620', { sort: 'price' }),
    ram: P('DDR5 16GB', '^DDR5 16GB \\(2×8GB\\)', { sort: 'price', fallback: '^DDR5 16GB' }),
    gpu: { skip: true },
    cooler: { skip: true },
    // #17: the first drive offered under Recommended is an SSD, not an HDD.
    storage: P('500GB', 'NVMe', { sort: 'price', probe: [{ name: 'first-drive-ssd', query: '', sort: 'recommended', check: 'firstNot', re: 'HDD|rpm' }] }),
    case: P('Air 100', 'Montech Air 100', { fallbackQuery: 'Montech', fallback: 'Montech' }),
    psu: P('550W', '550W (Bronze|Gold)', { sort: 'price', fallback: '550W' }),
    fan: { skip: true },
  },
  // Reconciliation (task 16 brief): no cooler chosen → rule 11 says the box cooler is unknown (a warning).
  expect: { warnings: [11], need: [{ rule: 11, status: 'warning' }] },
};

const F = {
  name: 'Intel creating 2,000 €',
  use: 'creating',
  budget: 2000,
  parts: {
    cpu: P('265K', '^Core Ultra 7 265K \\|', { sort: 'price' }),
    mobo: P('Z890', '\\| Z890 · LGA1851 · ATX ·', { sort: 'price', fallback: 'Z890' }),
    ram: P('DDR5 64GB', '^DDR5 64GB \\(2×32GB\\) (6400|6000|5600)MHz', { sort: 'price', fallback: '^DDR5 64GB \\(2×32GB\\)' }),
    gpu: P('5070 Ti', 'RTX 5070 ?Ti', { sort: 'price' }),
    cooler: P('Phantom Spirit', 'Phantom Spirit', { sort: 'price' }),
    storage: P('2TB', '(SN7100|990 Pro|NV3) 2TB', { sort: 'price', fallback: 'NVMe' }),
    case: P('North', '^Fractal Design North( \\||$| )', { fallback: 'North' }),
    psu: P('850W', '850W Gold', { sort: 'price' }),
    fan: { skip: true },
  },
  // Real margins (checked 02/11): Phantom Spirit 154 mm in a case taking 155 mm (rule 8, within 5 mm); 850 W = the
  // whole-build estimate, under its 10% headroom (rule 14). Both are true warnings, not wrong ones.
  expect: { warnings: [8, 14] },
};

const G = {
  name: 'AM4 900 €',
  use: 'gaming',
  budget: 900,
  parts: {
    cpu: P('5700X3D', '^Ryzen 7 5700X3D \\|', { fallbackQuery: '5800X3D', fallback: '5800X3D' }),
    // #11: the B550M-ITX/ac is not called Micro ATX.
    mobo: P('B550', '\\| B550 · AM4 · ATX ·', { sort: 'price', probe: [{ name: 'b550m-itx', query: 'B550M-ITX', check: 'none', re: 'Micro ATX' }] }),
    ram: P('DDR4 32GB', '^DDR4 32GB \\(2×16GB\\) (3600|3200)MHz', { sort: 'price' }),
    gpu: P('9060 XT', '9060 XT.*\\| 16GB', { sort: 'price' }),
    // #10: the Assassin X 120 Refined SE is offered on AM4 (G4: a title socket is not trusted → not verified).
    cooler: P('Assassin X 120', 'Assassin X 120', { sort: 'price', fallbackQuery: 'AK400', fallback: 'AK400', probe: [{ name: 'assassin-x120', query: 'Assassin X 120', check: 'someShown' }, { name: 'ak400', query: 'AK400' }] }), // #12: AK400 height recorded
    storage: P('NV3 1TB', '^Kingston NV3 1TB \\|'),
    case: P('XT View', 'Phanteks XT View', { fallbackQuery: 'Phanteks', fallback: 'Phanteks' }),
    psu: P('650W', '650W Gold', { sort: 'price' }),
    fan: { skip: true },
  },
  expect: { warnings: [] },
};

export const BUILDS = { a: A, b: B, c: C, d: D, e: E, f: F, g: G };

/** Every build × mode × width × language (56 runs); the e2e spec drives a subset. */
export const RUNS = Object.fromEntries(
  Object.keys(BUILDS).flatMap((build) =>
    ['guided', 'quick'].flatMap((mode) =>
      [1366, 360].flatMap((width) => ['el', 'en'].map((lang) => [`${build}-${mode}-${width}-${lang}`, { build, mode, width, lang }])),
    ),
  ),
);
