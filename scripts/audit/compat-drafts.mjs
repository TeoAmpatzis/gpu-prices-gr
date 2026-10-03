// Scenario drafts for scripts/audit/compat-freeze.mjs (Phase 0). Levels follow the plan's rules table.
const CPU_7600 = { category: 'cpu', key: 'Ryzen 5 7600|true' };
const CPU_9700X = { category: 'cpu', key: 'Ryzen 7 9700X|false' };
const CPU_9700X_BOX = { category: 'cpu', key: 'Ryzen 7 9700X|?' };
const CPU_14400F = { category: 'cpu', key: 'Core i5-14400F|false' };
const CPU_14600KF = { category: 'cpu', key: 'Core i5-14600KF|false' };
const CPU_9600X = { category: 'cpu', key: 'Ryzen 5 9600X|false' };
const CPU_5600X_BOX = { category: 'cpu', key: 'Ryzen 5 5600X|true' };
const CPU_14700K = { category: 'cpu', key: 'Core i7-14700K|false' };
const B650 = { category: 'mobo', key: 'gigabyteb650eagleax' };
const X870 = { category: 'mobo', key: 'asusprimex870pwifi' };
const B550 = { category: 'mobo', key: 'asusprimeb550plus' };
const B760_D4 = { category: 'mobo', key: 'asusprimeb760plusd4' };
const ITX_AM5 = { category: 'mobo', key: 'asusrogstrixb650eigamingwifi' };
const A620_2SLOT = { category: 'mobo', key: 'asrocka620mhdvm2' };
const X870_SLOTS_UNKNOWN = { category: 'mobo', key: 'asrockx870phantomgamingriptidewifi' };
const DDR5_2x16 = { category: 'ram', key: 'DDR5 32GB (2×16GB) 6000MHz Desktop' };
const DDR5_4x16 = { category: 'ram', key: 'DDR5 64GB (4×16GB) 6000MHz Desktop' };
const DDR5_2x32 = { category: 'ram', key: 'DDR5 64GB (2×32GB) 6000MHz Desktop' };
const DDR4_2x16 = { category: 'ram', key: 'DDR4 32GB (2×16GB) 3200MHz Desktop' };
const GPU_5080_340 = { category: 'gpu', key: 'bestprice:2160322211' };
const GPU_5070_SHORT = { category: 'gpu', key: 'bestprice:2160617918' };
const GPU_5070TI_UNKNOWN = { category: 'gpu', key: 'bestprice:2163242245' };
const GPU_5070TI_338 = { category: 'gpu', key: 'bestprice:2160396062' };
const KOLINK_MX = { category: 'case', key: 'kolinkobservatorymxmesh' };
const DK352 = { category: 'case', key: 'darkflashdk352plus' };
const TOWER300 = { category: 'case', key: 'thermaltakethetower300' };
const FOCUS_G = { category: 'case', key: 'fractaldesignfocusg' };
const LANCOOL207 = { category: 'case', key: 'lianlilancool207' };
const O11MINI_FLOW = { category: 'case', key: 'lianlio11dynamicminiv2flow' };
const SUGO16 = { category: 'case', key: 'silverstonesugo16cube' };
const SEALITE = { category: 'case', key: 'rampagesealite' };
const DART_PRO = { category: 'case', key: 'logicdartpro' };
const KOLINK_HF = { category: 'case', key: 'kolinkobservatoryhfmesh' };
const C365 = { category: 'case', key: 'darkflashc365' };
const SHARKOON_V1000 = { category: 'case', key: 'sharkoonv1000' };
const NHD15 = { category: 'cooler', key: 'noctuanhd15' };
const FREEZER8I = { category: 'cooler', key: 'arcticfreezer8i' };
const FERA5 = { category: 'cooler', key: 'endorfyfera5' };
const N11 = { category: 'cooler', key: 'intertechn11' };
const LF3_360 = { category: 'cooler', key: 'arcticliquidfreezeriiipro360' };
const LF3_240 = { category: 'cooler', key: 'arcticliquidfreezeriiipro240' };
const PSU_550 = { category: 'psu', key: '550W Bronze ATX' };
const PSU_600 = { category: 'psu', key: '600W Bronze ATX' };
const PSU_650 = { category: 'psu', key: '650W Gold ATX' };
const PSU_750 = { category: 'psu', key: '750W Gold ATX' };
const HDD35 = { category: 'storage', key: 'seagatebarracuda2tbhdd' };
const NVME5 = { category: 'storage', key: 'samsung9100pro1tbssd' };
const NVME4 = { category: 'storage', key: 'samsung990pro1tbssd' };
const SATA25 = { category: 'storage', key: 'crucialbx5001tbssd' };
const FAN120x3 = { category: 'fan', key: 'arcticp12pro120mm3' };
const FAN140x3 = { category: 'fan', key: 'havnh14140mm3' };
const FAN120x5 = { category: 'fan', key: 'arcticp12proln120mm5' };
const qty = (p, quantity) => ({ ...p, quantity });
const extra = (p, fields, note) => ({ ...p, override: fields, synthetic: Object.keys(fields), note });

export const DRAFTS = [
  // ---- The 14 examples of the plan's Phase 0 table ----
  {
    id: 'S01', slug: 'am5-b650-ddr5-midi-no-warnings',
    title: 'Ryzen 5 7600 (box cooler) + B650 + DDR5 2×16GB + Midi Tower ATX: no warnings',
    planExample: 'Ryzen 5 7600 + B650 + DDR5 2×16GB + Midi Tower ATX → Καμία προειδοποίηση',
    parts: [CPU_7600, B650, DDR5_2x16, KOLINK_MX],
    expected: [{ rule: 1, level: 'pass' }, { rule: 2, level: 'pass' }, { rule: 3, level: 'pass' }, { rule: 5, level: 'pass' }, { rule: 11, level: 'pass' }, { rule: 12, level: 'pass' }, { rule: 13, level: 'pass' }],
    why: 'AM5 CPU on an AM5 board, a 2-stick DDR5 kit on a 4-slot DDR5 board, an ATX board in a case that states ATX, a box cooler and integrated graphics, and a Ryzen 7000 on a 600-series board needs no BIOS update.',
  },
  {
    id: 'S02', slug: 'lga1700-ddr4-board-ddr5-kit',
    title: 'Core i5-14400F (LGA1700) + B760 DDR4 board + DDR5 kit: memory type error',
    planExample: 'Core i5 σε LGA1700 + μητρική LGA1700 DDR4 + DDR5 κιτ → Σφάλμα: τύπος μνήμης',
    parts: [CPU_14400F, B760_D4, DDR5_2x16],
    expected: [{ rule: 1, level: 'pass' }, { rule: 2, level: 'error' }],
    why: 'The socket matches, but a DDR4 board cannot take a DDR5 kit.',
  },
  {
    id: 'S03', slug: 'ryzen9000-b650-bios',
    title: 'Ryzen 7 9700X + B650: BIOS update warning',
    planExample: 'Ryzen 7 9700X + B650 → Προειδοποίηση: ίσως χρειάζεται ενημέρωση BIOS',
    parts: [CPU_9700X, B650],
    expected: [{ rule: 1, level: 'pass' }, { rule: 13, level: 'warning' }],
    why: 'A 600-series AMD board takes a Ryzen 9000 only with an updated BIOS (plan rule 13).',
  },
  {
    id: 'S04', slug: 'ryzen9000-x870-no-bios',
    title: 'Ryzen 7 9700X + X870: no BIOS warning',
    planExample: 'Ryzen 7 9700X + X870 → Καμία προειδοποίηση BIOS',
    parts: [CPU_9700X, X870],
    expected: [{ rule: 1, level: 'pass' }, { rule: 13, level: 'pass' }],
    why: '800-series boards support Ryzen 9000 out of the box.',
  },
  {
    id: 'S05', slug: 'no-igpu-no-gpu',
    title: 'CPU without integrated graphics and no graphics card: error',
    planExample: 'Επεξεργαστής χωρίς ενσωματωμένα γραφικά, χωρίς κάρτα γραφικών → Σφάλμα: δεν θα βγάζει εικόνα',
    parts: [CPU_14400F, B760_D4, DDR4_2x16, FERA5],
    expected: [{ rule: 1, level: 'pass' }, { rule: 2, level: 'pass' }, { rule: 10, level: 'pass' }, { rule: 12, level: 'error' }],
    why: 'An F-suffix Intel CPU has no integrated graphics, so without a card there is no picture; everything else fits.',
  },
  {
    id: 'S06', slug: 'kf-tray-no-cooler',
    title: 'Core i5-14600KF (Tray) with no cooler: error',
    planExample: 'Επεξεργαστής "F" ή "Tray" χωρίς ψύκτρα → Σφάλμα: λείπει ψύκτρα',
    parts: [CPU_14600KF, B760_D4, GPU_5070_SHORT],
    expected: [{ rule: 11, level: 'error' }, { rule: 12, level: 'pass' }],
    why: 'A K/KF CPU (and any Tray CPU) comes without a cooler and none is in the build; the graphics card covers the missing iGPU.',
  },
  {
    id: 'S07', slug: 'gpu-340-case-330',
    title: 'Graphics card 340 mm + case that takes 330 mm: error',
    planExample: 'Κάρτα 340 mm + κουτί με όριο 330 mm → Σφάλμα: δεν χωράει',
    parts: [GPU_5080_340, KOLINK_MX],
    expected: [{ rule: 6, level: 'error' }],
    why: 'The card is 10 mm longer than the case allows.',
  },
  {
    id: 'S08', slug: 'cooler-165-case-160',
    title: 'Air cooler 165 mm + case that takes 160 mm: error',
    planExample: 'Ψύκτρα αέρα 165 mm + κουτί με όριο 160 mm → Σφάλμα: δεν χωράει',
    parts: [NHD15, KOLINK_MX],
    expected: [{ rule: 8, level: 'error' }],
    why: 'The cooler is 5 mm taller than the case allows.',
  },
  {
    id: 'S09', slug: 'aio360-case-max280',
    title: 'AIO 360 mm + case whose maker lists radiators up to 280 mm: error',
    planExample: 'AIO 360 mm + κουτί που δέχεται μέχρι 280 mm → Σφάλμα: δεν χωράει το ψυγείο',
    parts: [LF3_360, FOCUS_G],
    expected: [{ rule: 9, level: 'error' }],
    why: 'Fractal lists front 120/140/240/280, top 120/240 and rear 120: no position takes a 360 mm radiator.',
  },
  {
    id: 'S10', slug: 'atx-board-itx-case',
    title: 'ATX board + Mini-ITX case: error',
    planExample: 'ATX μητρική + Mini-ITX κουτί → Σφάλμα: μέγεθος μητρικής',
    parts: [B650, TOWER300],
    expected: [{ rule: 5, level: 'error' }],
    why: 'The case states Mini ITX as its largest board; an ATX board does not fit.',
  },
  {
    id: 'S11', slug: 'four-sticks-two-slots',
    title: '4 RAM sticks + board with 2 slots: error',
    planExample: '4 στικ RAM + μητρική με 2 θέσεις → Σφάλμα: θέσεις μνήμης',
    parts: [A620_2SLOT, DDR5_4x16],
    expected: [{ rule: 2, level: 'pass' }, { rule: 3, level: 'error' }],
    why: 'DDR5 matches, but a 4-stick kit needs 4 slots and the board states 2.',
  },
  {
    id: 'S12', slug: 'rtx5080-psu550',
    title: 'RTX 5080 + 550 W power supply: error',
    planExample: 'RTX 5080 + τροφοδοτικό 550 W → Σφάλμα: ανεπαρκή watt',
    parts: [CPU_9700X, GPU_5080_340, PSU_550],
    expected: [{ rule: 14, level: 'error' }],
    why: 'The card maker asks for 850 W; plan formula (360 W TBP + 88 W PPT + 50 W board) × 1.3 = 649 → 650 W, max(850, 650) = 850 W; 550 W is far below.',
  },
  {
    id: 'S13', slug: 'hdd35-case-no-bay-data',
    title: '3.5" drive + case without drive bay data: note',
    planExample: 'Δίσκος 3.5" + κουτί χωρίς δεδομένα θέσεων → Σημείωση: έλεγξε θέση 3.5"',
    parts: [HDD35, KOLINK_MX],
    expected: [{ rule: 19, level: 'note' }],
    why: 'Drive bays are not in the data, so the 3.5" fit cannot be checked: a note, never a silent pass.',
  },
  {
    id: 'S14', slug: 'gpu-unknown-length-small-case',
    title: 'Graphics card with unknown length + small case: note',
    planExample: 'Κάρτα με άγνωστο μήκος + μικρό κουτί → Σημείωση: δεν επιβεβαιώθηκε',
    parts: [GPU_5070TI_UNKNOWN, TOWER300],
    context: { chipLengths: { 'RTX 5070 Ti': { cards: 18, makers: 8, min: 261, max: 360 } } },
    expected: [{ rule: 6, level: 'note' }],
    why: 'The card length is not stated and RTX 5070 Ti cards measure 261–360 mm against a 280 mm limit, so it can neither pass nor fail.',
  },
  // ---- Unknown values: a note, never a silent pass ----
  {
    id: 'S15', slug: 'cooler-sockets-unknown',
    title: 'Cooler whose sockets are not stated + AM5 CPU: note',
    parts: [CPU_9700X, N11],
    expected: [{ rule: 10, level: 'note' }],
    why: 'Socket support is unknown, so the rule cannot pass or fail.',
  },
  {
    id: 'S16', slug: 'ram-slots-unknown-4-sticks',
    title: 'Board with RAM slots not stated + 4-stick kit: note',
    parts: [X870_SLOTS_UNKNOWN, DDR5_4x16],
    expected: [{ rule: 2, level: 'pass' }, { rule: 3, level: 'note' }],
    why: 'DDR5 matches; whether the board has 4 slots is not stated.',
  },
  {
    id: 'S17', slug: 'ram-slots-unknown-2-sticks',
    title: 'Board with RAM slots not stated + 2-stick kit: pass',
    parts: [X870_SLOTS_UNKNOWN, DDR5_2x16],
    expected: [{ rule: 2, level: 'pass' }, { rule: 3, level: 'pass' }],
    why: 'Every desktop board has at least 2 DIMM slots, so a 2-stick kit is decidable even without the slot count (documented assumption).',
  },
  {
    id: 'S18', slug: 'box-cooler-unknown-no-cooler',
    title: 'Box CPU where a cooler in the box is not stated + no cooler: warning',
    parts: [CPU_9700X_BOX, X870],
    expected: [{ rule: 11, level: 'warning' }, { rule: 12, level: 'pass' }],
    why: 'Plan rule 11: an unknown box cooler is a warning, not an error.',
  },
  {
    id: 'S19', slug: 'case-board-size-estimated',
    title: 'Midi Tower that states no board size + ATX board: note (estimate)',
    parts: [B650, SEALITE],
    expected: [{ rule: 5, level: 'note' }],
    why: 'The largest board is only estimated from the case size, so the result is a note (plan rule 5).',
  },
  {
    id: 'S20', slug: 'case-gpu-max-unknown',
    title: 'Measured graphics card + case without a maximum card length: note',
    parts: [GPU_5070_SHORT, SEALITE],
    expected: [{ rule: 6, level: 'note' }],
    why: 'The case limit is unknown, so even a short card cannot be confirmed.',
  },
  {
    id: 'S21', slug: 'case-radiator-fans-unknown',
    title: 'AIO 240 and a 3-pack of fans in a case that states no radiator or fan positions: notes',
    parts: [LF3_240, FAN120x3, SEALITE],
    expected: [{ rule: 9, level: 'note' }, { rule: 21, level: 'note' }],
    why: 'Radiator and fan positions are not stated, so neither can be checked.',
  },
  {
    id: 'S22', slug: 'case-cooler-max-unknown',
    title: 'Air cooler 165 mm + case without a maximum cooler height: note',
    parts: [NHD15, DART_PRO],
    expected: [{ rule: 8, level: 'note' }],
    why: 'The case limit is unknown.',
  },
  // ---- Exact boundaries ----
  {
    id: 'S23', slug: 'gpu-equals-case-max',
    title: 'Graphics card 340 mm + case that takes exactly 340 mm: warning',
    parts: [GPU_5080_340, DK352],
    expected: [{ rule: 6, level: 'warning' }],
    why: 'It fits with 0 mm to spare; plan rule 6 warns within a 10 mm margin.',
  },
  {
    id: 'S24', slug: 'gpu-short-fits',
    title: 'Graphics card 241.5 mm + case that takes 330 mm: pass',
    parts: [GPU_5070_SHORT, KOLINK_MX],
    expected: [{ rule: 6, level: 'pass' }],
    why: '88.5 mm to spare.',
  },
  {
    id: 'S25', slug: 'psu-at-recommended',
    title: 'Power supply exactly at the recommended wattage (650 W): warning',
    parts: [CPU_7600, B650, DDR5_2x16, GPU_5070_SHORT, NVME4, PSU_650],
    expected: [{ rule: 14, level: 'warning' }],
    why: 'Plan formula: (250 W TBP + 88 W PPT + 50 + 2×5 + 8) × 1.3 = 528 → 550 W; card maker 650 W; recommended = 650 W, and 650 W is within +10% of it.',
  },
  {
    id: 'S26', slug: 'psu-below-recommended',
    title: 'Power supply just below the recommended wattage (600 W of 650 W): error',
    parts: [CPU_7600, B650, DDR5_2x16, GPU_5070_SHORT, NVME4, PSU_600],
    expected: [{ rule: 14, level: 'error' }],
    why: 'Recommended 650 W (see S25); 600 W is below it.',
  },
  {
    id: 'S27', slug: 'psu-above-margin',
    title: 'Power supply above the recommended wattage plus 10% (750 W of 650 W): pass',
    parts: [CPU_7600, B650, DDR5_2x16, GPU_5070_SHORT, NVME4, PSU_750],
    expected: [{ rule: 14, level: 'pass' }],
    why: '750 W > 650 W × 1.1 = 715 W.',
  },
  // ---- Quantities ----
  {
    id: 'S28', slug: 'two-ram-kits-four-slots',
    title: 'Two DDR5 2×16GB kits on a 4-slot board: pass',
    parts: [B650, qty(DDR5_2x16, 2)],
    expected: [{ rule: 2, level: 'pass' }, { rule: 3, level: 'pass' }],
    why: '4 sticks in 4 slots.',
  },
  {
    id: 'S29', slug: 'two-ram-kits-two-slots',
    title: 'Two DDR5 2×16GB kits on a 2-slot board: error',
    parts: [A620_2SLOT, qty(DDR5_2x16, 2)],
    expected: [{ rule: 3, level: 'error' }],
    why: '4 sticks, 2 slots.',
  },
  {
    id: 'S30', slug: 'several-drives',
    title: 'One NVMe SSD + two 3.5" HDDs on a B650 board in a Midi Tower: notes',
    parts: [B650, NVME4, qty(HDD35, 2), KOLINK_MX],
    expected: [{ rule: 17, level: 'note' }, { rule: 18, level: 'note' }, { rule: 19, level: 'note' }],
    why: 'M.2 slots, SATA ports and drive bays are not collected yet, so all three drive rules can only give notes.',
  },
  {
    id: 'S31', slug: 'two-fan-packs-fit',
    title: 'Two 3-packs of 120 mm fans in a case with 9 × 120 mm positions: pass',
    parts: [qty(FAN120x3, 2), O11MINI_FLOW],
    expected: [{ rule: 21, level: 'pass' }, { rule: 22, level: 'pass' }],
    why: 'Lian Li lists 120 mm positions top 3, side 2, bottom 3, rear 1 (9) and no fans included; 6 fans fit.',
  },
  // ---- Fans ----
  {
    id: 'S32', slug: 'fan-pack-fits-maker-data',
    title: 'One 3-pack of 120 mm fans in a case with 9 × 120 mm positions: pass',
    parts: [FAN120x3, O11MINI_FLOW],
    expected: [{ rule: 21, level: 'pass' }, { rule: 22, level: 'pass' }],
    why: 'Maker positions per size cover the pack.',
  },
  {
    id: 'S33', slug: 'fan-size-not-enough-positions',
    title: '3 × 140 mm fans in a case whose maker lists only 2 × 140 mm positions: error',
    parts: [FAN140x3, O11MINI_FLOW],
    expected: [{ rule: 21, level: 'error' }],
    why: 'Lian Li lists 140 mm only on top (2); the third 140 mm fan has no position.',
  },
  {
    id: 'S34', slug: 'fan-pack-more-than-shop-positions',
    title: '5-pack of 120 mm fans in a case whose shop page states 3 positions: error',
    parts: [FAN120x5, SHARKOON_V1000],
    expected: [{ rule: 21, level: 'error' }],
    why: 'Relative to the recorded fanSlots = 3 (shop spec; the real count was not checked, and fanSlots undercounts for some cases, see S35).',
  },
  {
    id: 'S35', slug: 'fan-data-contradictory',
    title: '3-pack of fans in a case whose data say 6 fans included but 1 position: note',
    parts: [FAN120x3, KOLINK_HF],
    expected: [{ rule: 21, level: 'note' }],
    why: 'The case’s own titles say it ships with 6 fans (3×140 + 3×120) while fanSlots = 1: contradictory data must give “not verified”, never “incompatible”.',
  },
  // ---- Board size, sockets, memory ----
  {
    id: 'S36', slug: 'itx-board-atx-case',
    title: 'Mini-ITX board + ATX case: pass',
    parts: [ITX_AM5, KOLINK_MX],
    expected: [{ rule: 5, level: 'pass' }],
    why: 'A case that takes ATX takes every smaller board.',
  },
  {
    id: 'S37', slug: 'am5-cpu-am4-board',
    title: 'AM5 CPU (Ryzen 5 9600X) + AM4 board: error',
    parts: [CPU_9600X, B550],
    expected: [{ rule: 1, level: 'error' }],
    why: 'AM5 ≠ AM4.',
  },
  {
    id: 'S38', slug: 'ddr5-kit-am4-ddr4-board',
    title: 'DDR5 kit + AM4 DDR4 board: error',
    parts: [B550, DDR5_2x16],
    expected: [{ rule: 2, level: 'error' }],
    why: 'DDR5 ≠ DDR4.',
  },
  // ---- Cooler, graphics ----
  {
    id: 'S39', slug: 'tray-cpu-no-cooler',
    title: 'Tray CPU (Ryzen 7 9700X Tray) with no cooler: error',
    parts: [CPU_9700X, X870],
    expected: [{ rule: 11, level: 'error' }, { rule: 12, level: 'pass' }],
    why: 'A Tray CPU never includes a cooler; the iGPU covers graphics.',
  },
  {
    id: 'S40', slug: 'box-cooler-no-igpu',
    title: 'Ryzen 5 5600X with box cooler, no cooler chosen, no graphics card: cooler pass, graphics error',
    parts: [CPU_5600X_BOX, B550],
    expected: [{ rule: 1, level: 'pass' }, { rule: 11, level: 'pass' }, { rule: 12, level: 'error' }],
    why: 'The box cooler is enough for rule 11, but a 5600X has no integrated graphics.',
  },
  {
    id: 'S41', slug: 'aio240-fits-focus-g',
    title: 'AIO 240 mm in a case that takes 240/280 at the front: pass',
    parts: [CPU_9700X, LF3_240, FOCUS_G],
    expected: [{ rule: 9, level: 'pass' }, { rule: 10, level: 'pass' }],
    why: 'Fractal lists 240 mm at the front and the top; the AIO lists AM5.',
  },
  {
    id: 'S42', slug: 'aio360-fits-lancool207',
    title: 'AIO 360 mm in a case that takes 360 mm on top: pass',
    parts: [LF3_360, LANCOOL207],
    expected: [{ rule: 9, level: 'pass' }],
    why: 'Lian Li lists top 240/280/360.',
  },
  {
    id: 'S43', slug: 'cooler-no-am5',
    title: 'Intel-only cooler (LGA1700/1851) + AM5 CPU: error',
    parts: [CPU_9700X, FREEZER8I],
    expected: [{ rule: 10, level: 'error' }],
    why: 'The cooler lists LGA1700 and LGA1851 only.',
  },
  {
    id: 'S44', slug: 'cooler-5mm-under-limit',
    title: 'Air cooler 155 mm + case that takes 160 mm: warning',
    parts: [CPU_9700X, FERA5, KOLINK_MX],
    expected: [{ rule: 8, level: 'warning' }, { rule: 10, level: 'pass' }],
    why: 'Fits with 5 mm to spare; plan rule 8 warns within 5 mm.',
  },
  {
    id: 'S45', slug: 'cooler-fits-ram-clearance-note',
    title: 'Air cooler 155 mm + case that takes 170 mm, with RAM: pass + clearance note',
    parts: [CPU_9700X, X870, DDR5_2x16, FERA5, C365],
    expected: [{ rule: 8, level: 'pass' }, { rule: 10, level: 'pass' }, { rule: 26, level: 'note' }],
    why: '15 mm to spare; RAM-to-cooler clearance is never checked, so plan rule 26 always adds a note.',
  },
  // ---- Storage ----
  {
    id: 'S46', slug: 'pcie5-drive',
    title: 'PCIe 5.0 SSD on a B650 board (M.2 generation not collected): note',
    parts: [B650, NVME5],
    expected: [{ rule: 20, level: 'note' }],
    why: 'Whether the board has a PCIe 5.0 M.2 slot is not in the data; the drive works either way, slower on Gen4.',
  },
  {
    id: 'S47', slug: 'pcie4-drive',
    title: 'PCIe 4.0 SSD on a B650 board: pass',
    parts: [B650, NVME4],
    expected: [{ rule: 20, level: 'pass' }],
    why: 'Rule 20 is only about PCIe 5.0 drives.',
  },
  // ---- Case fans ----
  {
    id: 'S48', slug: 'case-without-fans-none-added',
    title: 'Case that ships without fans + no fans in the build: warning',
    parts: [O11MINI_FLOW],
    expected: [{ rule: 22, level: 'warning' }],
    why: 'Lian Li states no fans are included; a build with no case fans has no airflow.',
  },
  // ---- Power supply and case ----
  {
    id: 'S49', slug: 'sff-case-atx-psu-unknown',
    title: 'SFF case (PSU size not stated) + ATX power supply: note',
    parts: [SUGO16, PSU_650],
    expected: [{ rule: 16, level: 'note' }],
    why: 'The PSU sizes the case takes are not collected, so it cannot pass or fail.',
  },
  // ---- Rules that need fields we do not collect yet (synthetic, for v2) ----
  {
    id: 'S50', slug: 'synthetic-sfx-only-case-atx-psu',
    title: 'Case that takes only SFX + ATX power supply: error (synthetic case)',
    parts: [
      { category: 'case', key: 'synthetic:sfx-only-case', name: 'Synthetic SFX-only ITX case', syntheticProduct: true, fields: { size: 'SFF / Cube', maxBoard: 'Mini ITX', gpuMaxMm: 320, coolerMaxMm: 70, psuFormFactors: ['SFX'] }, note: 'No collected field says which PSU sizes a case takes (plan: new field).' },
      PSU_650,
    ],
    expected: [{ rule: 16, level: 'error' }],
    why: 'An ATX unit does not fit a case that takes only SFX.',
  },
  {
    id: 'S51', slug: 'synthetic-board-max-memory',
    title: 'Two 2×32GB kits (128 GB) on a board with a 64 GB maximum: error (synthetic field)',
    parts: [extra(B650, { maxMemoryGB: 64 }, 'Real board, synthetic maximum (the real B650 Eagle AX takes more).'), qty(DDR5_2x32, 2)],
    expected: [{ rule: 3, level: 'pass' }, { rule: 4, level: 'error' }],
    why: '128 GB exceeds the board’s 64 GB maximum; 4 sticks fit its 4 slots.',
  },
  {
    id: 'S52', slug: 'synthetic-gpu-slots-case',
    title: '3.5-slot card + case with 2 expansion slots: error (synthetic fields)',
    parts: [extra(GPU_5080_340, { slots: 3.5 }, 'Synthetic thickness.'), extra(TOWER300, { expansionSlots: 2 }, 'Synthetic expansion-slot count.')],
    expected: [{ rule: 7, level: 'error' }],
    why: 'The card is thicker than the case’s expansion slots.',
  },
  {
    id: 'S53', slug: 'synthetic-12v2x6-adapter',
    title: '12V-2x6 card + power supply without a native 12V-2x6 cable: note (synthetic fields)',
    parts: [CPU_9700X, extra(GPU_5080_340, { powerConnector: '12V-2x6' }, 'Synthetic connector field.'), extra({ category: 'psu', key: '1000W Gold ATX' }, { native12v2x6: false, atx3: false }, 'Synthetic PSU fields.')],
    expected: [{ rule: 14, level: 'pass' }, { rule: 15, level: 'note' }],
    why: '1000 W covers the card; the cable needs the adapter that comes with the card.',
  },
  {
    id: 'S54', slug: 'synthetic-m2-slots',
    title: 'Two NVMe SSDs + board with 1 M.2 slot: error (synthetic field)',
    parts: [extra(A620_2SLOT, { m2Slots: 1 }, 'Synthetic M.2 count.'), qty(NVME4, 2)],
    expected: [{ rule: 17, level: 'error' }],
    why: 'Two M.2 drives, one M.2 slot.',
  },
  {
    id: 'S55', slug: 'synthetic-sata-ports',
    title: 'Three SATA SSDs + board with 2 SATA ports: error (synthetic field)',
    parts: [extra(A620_2SLOT, { sataPorts: 2 }, 'Synthetic SATA port count.'), qty(SATA25, 3)],
    expected: [{ rule: 18, level: 'error' }],
    why: 'Three SATA drives, two ports.',
  },
  {
    id: 'S56', slug: 'synthetic-fan-headers',
    title: 'Six case fans + board with 3 fan headers: note (synthetic field)',
    parts: [extra(B650, { fanHeaders: 3 }, 'Synthetic header count.'), qty(FAN120x3, 2), O11MINI_FLOW],
    expected: [{ rule: 21, level: 'pass' }, { rule: 23, level: 'note' }],
    why: 'The fans fit the case, but 6 fans on 3 headers need a hub or splitter.',
  },
  {
    id: 'S57', slug: 'synthetic-usb-c-header',
    title: 'Case with front USB-C + board without a USB-C header: note (synthetic fields)',
    parts: [extra(B650, { usbCHeader: false }, 'Synthetic.'), extra(KOLINK_MX, { usbCFront: true }, 'Synthetic.')],
    expected: [{ rule: 5, level: 'pass' }, { rule: 24, level: 'note' }],
    why: 'The front USB-C port will not work without a header.',
  },
  {
    id: 'S58', slug: 'ram-faster-than-official',
    title: 'DDR5-6000 kit with a Ryzen 5 7600 (official DDR5-5200): note',
    parts: [extra(CPU_7600, { officialMemMhz: 5200 }, 'Reference value: AMD lists DDR5-5200 for Ryzen 7000 (recalled, not fetched).'), B650, DDR5_2x16],
    expected: [{ rule: 2, level: 'pass' }, { rule: 25, level: 'note' }],
    why: '6000 MHz runs only with EXPO/XMP enabled.',
  },
  {
    id: 'S59', slug: 'psu-plan-formula-vs-card-maker',
    title: 'Core i7-14700K + RTX 5070 Ti + 750 W: error by the plan formula, pass by the card maker',
    parts: [CPU_14700K, B760_D4, DDR4_2x16, GPU_5070TI_338, NVME4, PSU_750],
    expected: [{ rule: 14, level: 'error' }],
    why: 'Plan formula: (300 W TBP + 253 W PL2 + 50 + 2×5 + 8) × 1.3 = 807 → 850 W > 750 W, although the card maker asks for 750 W.',
  },
  // ---- "Must pass" cases for rules 16 and 19 ----
  {
    id: 'S60', slug: 'atx-psu-midi-tower',
    title: 'ATX power supply in a Midi Tower: pass',
    parts: [PSU_650, KOLINK_MX],
    expected: [{ rule: 16, level: 'pass' }],
    why: 'Midi Tower cases take ATX power supplies (documented assumption until the case PSU-size field exists).',
  },
  {
    id: 'S61', slug: 'm2-drive-no-bay-needed',
    title: 'M.2 SSD + case without drive bay data: pass',
    parts: [NVME4, KOLINK_MX],
    expected: [{ rule: 19, level: 'pass' }],
    why: 'Rule 19 is about 3.5" drives; an M.2 drive sits on the board and needs no bay.',
  },
  // ---- More power supply builds (wattage comparison, v1 vs plan formula) ----
  {
    id: 'S62', slug: 'psu-9950x-5090-1000w',
    title: 'Ryzen 9 9950X + RTX 5090 + 4 sticks + 2 SSDs + 6 fans + 1000 W: error',
    parts: [{ category: 'cpu', key: 'Ryzen 9 9950X|false' }, X870, DDR5_4x16, { category: 'gpu', key: 'bestprice:2160340915' }, qty(NVME4, 2), qty(FAN120x3, 2), { category: 'psu', key: '1000W Gold ATX' }],
    expected: [{ rule: 14, level: 'error' }],
    why: 'Plan formula: (575 W TBP + 230 W PPT + 50 + 4×5 + 2×8 + 6×3) × 1.3 = 1182 → 1200 W; card maker 1000 W; 1000 W < 1200 W.',
  },
  {
    id: 'S63', slug: 'psu-14900k-igpu-550w',
    title: 'Core i9-14900K without a graphics card + 550 W: pass',
    parts: [{ category: 'cpu', key: 'Core i9-14900K|false' }, B760_D4, DDR4_2x16, NVME4, PSU_550],
    expected: [{ rule: 14, level: 'pass' }],
    why: 'Plan formula: (253 W PL2 + 50 + 2×5 + 8) × 1.3 = 417 → 450 W; 550 W > 450 W × 1.1.',
  },
  {
    id: 'S64', slug: 'psu-9800x3d-9070xt-750w',
    title: 'Ryzen 7 9800X3D + RX 9070 XT (card asks 850 W) + 750 W: error',
    parts: [{ category: 'cpu', key: 'Ryzen 7 9800X3D|false' }, X870, DDR5_2x16, { category: 'gpu', key: 'bestprice:2160485242' }, NVME4, PSU_750],
    expected: [{ rule: 14, level: 'error' }],
    why: 'Plan formula: (304 W TBP + 162 W PPT + 50 + 2×5 + 8) × 1.3 = 694 → 700 W; the card maker asks 850 W; 750 W < 850 W.',
  },
];
