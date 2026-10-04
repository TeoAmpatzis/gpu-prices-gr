# Data quality audit — BuildDraft.gr v1 data (v2 Phase 0, part B3)

2026-10-03 · branch `v2` · read-only audit of the committed data

**Data audited:** `public/data/<cat>/latest.json` (snapshot `updatedAt` 2026-10-03 11:42–12:30 UTC, data commit `d1dcaab` "chore(data): update prices 2026-10-03 12:52"), the spec caches (`specs.json`), `public/data/makers/*.json`, and a build of the derived files from the same data (`builder.json`, `builder-storage.json`, `builder-extra.json`, `manifest.json`, built 2026-10-03T18:51Z). No network requests, no scraper run, nothing in `src/`, `scraper/` or `public/` changed.

**Reproduce:** `node scripts/audit/data-quality/run-all.mjs` (checks that the audit groups models exactly like the site — model counts equal `manifest.json` for all 9 categories — then writes everything in `docs/audit/data/`). The tables below are copied verbatim from `docs/audit/data/report-tables.md`, which the scripts generate. The hand-judged spot-check verdicts are in `docs/audit/data/spotcheck-verdicts.json`.

**Severity scale (from the brief):** S1 = the site tells the user something false that could cost them money (says compatible when it isn't, wrong price, wrong spec used in a check) · S2 = a feature does not work · S3 = usability · S4 = cosmetic. Severities below are suggestions. "Verified" = traced in `scraper/` or `src/` code; "hypothesis" = consistent with the data but not traced (often because the cause is on a shop's page, which this audit could not open).

## Summary — what is most wrong, by how much it can mislead a buyer or the PC builder

1. **Air coolers measured at 21–28 mm (S1).** 72 listings (26 models) of tower coolers carry `heightMm` 21–28 mm — a fan's thickness, not the cooler's height (e.g. Alpenfoehn Brocken 4: 27 mm, Deepcool AK400 G2: 25 mm, Thermalright Assassin Spirit 120 Vision: 25.6 mm). 22 of the builder's 314 air-cooler rows that have a height (7.0%) are under 30 mm, so the builder rates them "fits" against every case that states a limit (rule 8). Verified: `scraper/specs.py` `parse_cooler` reads the product page's "Ύψος" field verbatim; that those pages put a fan height there is a hypothesis (23 raw spec-cache entries < 30 mm: 18 from Skroutz pages, 5 from BestPrice pages).
2. **GPU "minimum PSU" that is really the card's power draw (S1).** 12 builder GPU rows have `minPsu` 130–300 W where the chip maker recommends 400–750 W (PNY RTX 5050: 130 W, MSI RTX 5060 Shadow: 145 W, Sparkle Arc B570: 170 W, PNY RTX 5060 Ti: 180 W, Acer RX 9070: 245 W, PNY RTX 5070 Ti: 300 W). The builder uses `minPsu` before its chip table (`src/lib/builder.ts` `gpuPsu`), so it would accept a 300–450 W power supply for these cards (rule 14). Verified: `specs.py` reads Skroutz's "Ελάχιστη Ισχύς Τροφοδοτικού"; hypothesis: those Skroutz pages hold the board power there (the values equal the chips' board power).
3. **RAM kits filed as single sticks (S1).** 113 listings in 42 RAM models (almost all Shopflix titles such as "Kingston Fury Beast RGB DDR5 32GB 6000MHz (2x16)") are filed as one module (e.g. "DDR5 32GB (1×32GB) 6000MHz"); 31 of the builder's 239 RAM rows contain such a listing. The builder's slot check (rule 3) uses the cheapest listing's `modules`, so a 4×8 kit filed as 1×32GB passes a 2-slot board; the €/GB comparison also mixes kits with single sticks. Verified: `scraper/normalize_ram.py` `KIT` needs "GB" after the module size.
4. **Wrong memory generation or server memory offered as desktop RAM (S1).** DDR5 kits whose shop titles say "DDR4" (G.Skill Trident Z5 `F5-6000…`, ADATA Lancer Blade `AX5U6000…`, Lexar `LD5S…`) are filed as DDR4: 2 builder rows ("DDR4 16GB (1×16GB) 6000MHz", "DDR4 64GB (2×32GB) 6000MHz") pass the DDR4-board check (rule 2). Heuristically, 31 listings classified Desktop have registered/ECC server part numbers (Micron `MTA…72P…`, Kingston `KSM…R`, Samsung `M393…`); 2 are a builder row's own listing and 30 sit in spec models the builder offers. Verified: the type comes from the title first and the form factor defaults to Desktop (`normalize_ram.py`); the RDIMM list is a part-number heuristic.
5. **Motherboards: DDR4/DDR5 variants merged and E-ATX boards offered as ATX (S1).** 6 board models (33 listings; 5 offered by the builder) mix DDR4 and DDR5 listings, e.g. "ASRock H610M-HDV/M.2+ D5" with the DDR4 "H610M-HDV/M.2" — verified: `normalize_mobo.py` removes "D5" and `productKey` drops "+". 2 builder rows are E-ATX boards labelled ATX (Asus ROG Maximus Z890 Extreme WiFi, ASRock X870E Taichi Lite WiFi — Shopflix "Extended ATX" titles), so the builder says they fit ATX cases (rule 5). 3 Mini-ITX boards (ASRock A520M-ITX/ac, B550M-ITX/ac) are labelled Micro ATX — verified: the chipset's "M" suffix wins over the stated size — which hides them for ITX cases (S2).
6. **Storage key collision 2.4TB = 24TB (S1, server tier only).** "Toshiba Enterprise 2.4TB" (10k rpm SAS, 690.90 €) and "Toshiba Enterprise 24TB" (1,316.17 €) are one model, which shows the 2.4TB price. Verified: `productKey` / `model_key` keep only `[a-z0-9]`, so the decimal point disappears. Only 1 collision exists today; 1.2/12, 1.6/16, 1.8/18 TB can collide the same way.
7. **CPU cooler in the box marked "no" for "with cooler" packs (S2, false and can cost an unneeded cooler).** 41 listings (32 models) have `coolerIncluded = false` while the title/URL says "Tray με ψύκτρα", "Tray with Fan" or `…-me-psyktra`; 21 of the builder's 359 CPU rows. Verified: `specs.py` `apply` sets `false` for any Tray listing without a stated value. 154 of the 359 CPU rows have an unknown cooler-in-box (the builder shows them as separate rows). The brief's rule "Tray must be false" does not hold in this market: 6 Skroutz "Tray με ψύκτρα" listings are correctly `true`.
8. **Cases: the builder takes the smaller "largest board" when sites disagree (S2).** In 19 case models the listings disagree on `maxBoard` and the most common value — the one the builder uses — is the smaller (e.g. Thermaltake The Tower 300: Skroutz says Micro ATX and ATX, the 27 other listings Mini ITX; the maker lists Micro ATX — general knowledge). The builder then hides boards that fit. 129 case models also disagree on the size label (Midi vs Mini Tower), which is the board-size fallback (rule 5) and the size filter.
9. **Duplicate models split one product's prices (S2).** Coolers: 236 models (317 listings) keep Shopflix words such as "Τριπλού Ανεμιστήρα 120mm"; 165 of them have a twin without those words (the Asus ROG Strix LC III 360 is spread over 6 models). Verified: `productKey` drops Greek letters but keeps "120mm". Similar splits from word order (68 groups across categories), filler words, part numbers kept in the name, and e-shop leftovers ("Be Quiet PSU DARK BASE PRO 901"). A buyer can miss the cheapest offer of a product. 11 cooler models also mix Air and AIO listings (Shopflix slug "udropsuxe" is not in the water-word list), and the builder checks the cheapest listing's type.
10. **Skroutz family cards: the title names another product than the price and link (S2).** 38 PSU listings (e.g. title "MSI MPG A1000GS" linked to the A1250GS and filed as 1250 W), 36 storage, 8 RAM, 3 cooler, 2 fan, 1 GPU listing. The spec usually follows the link (watts from the URL when the title has none); the title shown follows the card. For AIOs the radiator from the card's spec line then contradicts the title (22 models such as "1STPLAYER Mothra MT360 240"). Verified in `scraper/sources/skroutz.py`.
11. **RAM speed (S2/S3).** 1,063 Shopflix listings say "με Ταχύτητα 3600" but get no speed (the parser reads only "MHz", "MT/s" or the Skroutz slug), so they sit in 84 "no speed" models (1,234 listings) instead of their spec model. Implausible speeds (coordinator's check): 81 listings / 28 models are under 1,333 or over 10,000 MHz, but 79 of them are normal DDR2/DDR3 speeds; by DDR type, 14 listings / 10 models are wrong: **60000 MHz** (e-shop's own title says "60000MHZ"; the parser has no range check — verified; it is a builder row "DDR5 64GB (2×32GB) 60000MHz", 1,637.32 €), DDR5 at 2400/2800 MHz (7 listings: the I/O clock of DDR5-4800/5600 written as the speed, in Skroutz URLs such as "Tachytita-2800" and in some BestPrice/Shopflix titles; hypothesis for the shops' data), DDR2 at 1600 and DDR3 at 667 MHz (1 listing each, probably the other generation), and DDR4 at 5600/6000 MHz (DDR5 kits, item 4).
12. **GPU phantom models (S3).** "RTX 5070 16GB" (2 Snif listings whose part number says `-12GD`), "RTX 5070 Ti 12GB" (1 Snif listing, part `-16GD`) and "RX 9070 12GB" (1 Shopflix listing) are chip/VRAM combinations that do not exist. The builder picks cards per listing, so only the label and the VRAM filter are wrong.
13. **Storage variants merged (S2).** 43 models mix SATA and SAS listings (mostly Server tier, which the builder leaves out), 30 mix form factors (M.2 vs U.2 vs 2.5"), 16 mix RPM (WD Purple 8TB 5400/7200). 8 models the builder offers mix interface or form factor (WD Blue SA510 2.5" and M.2).
14. **Prices far below the model median (S1 if the listing is a mismatch, can't tell offline).** RAM 14 listings (11 are the model's displayed price), storage 2, cases 2 (Nanoxia Deep Silence 9 White at 54.27 € vs a 248.95 € median; Armaggeddon Nimitz TR5000 at 18.70 € vs 79.90 €). GPU, CPU, mobo, PSU, fans, coolers: none.
15. **Coverage.** Builder-critical clearances stay thin: case max GPU length 26.5% of case models (39.6% of the most-listed quarter), max cooler height 14.8%, radiator sizes per position 2.5%, fan positions per size 2.6%, fans in the box 5.7%; cooler sockets 33.1%, air-cooler height 26.0%. GPU length is known for 80.2% of the builder's card rows. Many plan fields are not collected at all (threads, boost clock, M.2 slots, SATA ports, max memory, BIOS Flashback, USB-C header, GPU thickness and power connector, PSU ATX 3.x / 12V-2x6 / length, case drive bays / expansion slots / PSU form factor / front USB-C, noise, colour, RAM height and XMP/EXPO).
16. **Freshness: fine (S4).** Every source's last successful scrape is under 24 h old at "now" (2026-10-03T19:22:54Z). Skroutz failed in the latest run for 7 of 9 categories; its kept data is 6.6–10.1 h older than the snapshot.

Spot-check error rates (20 random listings per category, identity/key fields vs title, URL and spec cache): GPU 0/20, CPU 3/20, mobo 0/20, RAM 2/20, storage 2/20, PSU 1/20, cases 2/20, fans 2/20, coolers 5/20 — 95% Wilson intervals are wide (e.g. 0–16.1% for 0/20, 11.2–46.9% for 5/20); see section 4.

## 1. Coverage per field

**How it is counted.** Models are grouped exactly like the site (`modelKey` in `src/lib/categories.tsx`; counts equal `manifest.json`). A model "has" a field when any of its listings has a non-null value (`formFactor`/`size` "Άλλο" counts as unknown). "Most-listed quarter" = models with at least as many listings as the model at rank ⌈N/4⌉ (ties included; cutoff stated per category). "Builder rows" = the rows of `builder.json` / `builder-storage.json` (GPU: one row per card listing; CPU: one row per chip × cooler-in-box; others: one per model, carrying the values the builder uses — most common socket, board size, measurements…, else the cheapest listing's value). Fields limited to a type (DRAM, TBW, RPM, PCIe, air-cooler height, AIO radiator) are counted over that type only. "title words" = a yes/no flag set only when the title says so (false means "not said"), so its share is how often titles mention it, not coverage. "derivable" = computed by the audit from other fields. Coverage counts values, right or wrong (the 25 mm cooler heights count as "known").

**Against the plan's "Δεδομένα σήμερα" column:** rule 1 socket — CPU 97.6% of models / 100% of builder rows, boards 97.4% / 100% (plan: 98–100%) ✓; rule 2 board memory type 92.6% of models, 100% of builder rows (plan: 97%); rule 3 RAM slots 71.3% / 75.6% of builder rows (plan: 75%) ✓; rule 5 stated largest board 86.0% of case models (plan: 70% — now higher); rule 6 card length 80.2% of builder card rows, case GPU clearance 26.5% of case models, 39.6% of the most-listed quarter (plan: cards 77%, cases 14%, popular 43%); rule 8 air-cooler height 26.0%, case cooler clearance 14.8% (plan: ~15%); rule 9 radiator sizes 2.5%, positions only 19.2% (plan: 3%); rule 10 cooler sockets 33.1% (plan: ~15%); rule 11 cooler in the box 89.3% of CPU models but 57.1% of builder rows (plan: 52%); rule 21 fan positions per size 2.6%, total count 23.6% (plan: 3%); rule 22 fans in the box 5.7% (plan: 2%).

**Plan filters under the plan's 30% threshold** (all models): cases — max GPU length 26.5%, max cooler height 14.8%, radiator sizes 2.5% / positions 19.2%, fan positions 2.6% / count 23.6%, fans in the box 5.7%; coolers — air height 26.0%; fans — airflow/static-pressure type 6.3%, CFM 11.9%, static pressure 8.3%; storage — DRAM 1.8%, read speed 9.4%, write speed 9.3%, TBW 1.0% (of SSD models); PSU — ATX 3.x 18.3% and 12V-2x6 5.9% (title words only, positive mentions).

### GPU
97 models; most-listed quarter = 25 models with ≥ 15 listings; builder rows: 1567.

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Chip | chip | filter, quick; 14 (table) | collected | 100.0% (97/97) | 100.0% (25/25) | 100.0% (1567/1567) |
| Board partner | partner | filter | collected | 100.0% (97/97) | 100.0% (25/25) | 100.0% (1567/1567) |
| VRAM | vram | filter, column | collected | 100.0% (97/97) | 100.0% (25/25) | 100.0% (1567/1567) |
| Τύπος μνήμης (memory type) | memType | filter | collected | 95.9% (93/97) | 100.0% (25/25) | 99.9% (1565/1567) |
| Μήκος (length) | lengthMm | 6; filter, column | collected | 55.7% (54/97) | 84.0% (21/25) | 80.2% (1257/1567) |
| Πάχος σε slots (thickness) | not collected | 7; filter | not collected | — | — | — |
| Προτεινόμενο τροφοδοτικό (recommended PSU) | minPsu (card page / maker) | 14; filter, column | collected | 52.6% (51/97) | 84.0% (21/25) | 71.7% (1124/1567) |
| Προτεινόμενο τροφοδοτικό, με πίνακα chip (PSU incl. chip table) | minPsu ?? GPU_PSU[chip] (builder gpuPsu) | 14 (what v1 uses) | derivable | 71.1% (69/97) | 84.0% (21/25) | 100.0% (1567/1567) |
| Βύσμα ρεύματος (power connector) | not collected | 15; filter, column | not collected | — | — | — |
| Αριθμός ανεμιστήρων (fan count) | not collected | filter | not collected | — | — | — |
| Χρώμα (colour) | not collected | filter | not collected | — | — | — |
| TBP (board power) | not collected (plan: per-chip table) | power estimate | not collected | — | — | — |

GPU models are chip + VRAM, so "all models" means "at least one card of the chip is measured"; the builder-row column (per card) is the one the checks use.

### CPU
421 models; most-listed quarter = 111 models with ≥ 5 listings; builder rows: 359.

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Socket | socket | 1, 10, 13; filter, quick | collected | 97.6% (411/421) | 100.0% (111/111) | 100.0% (359/359) |
| Σειρά (series) | derivable from chip (cpuSeries) | filter | derivable | 99.8% (420/421) | 100.0% (111/111) | 99.4% (357/359) |
| Γενιά/αρχιτεκτονική (generation) | derivable from chip model number | 13, 25; filter | derivable | 89.5% (377/421) | 100.0% (111/111) | 99.4% (357/359) |
| Πυρήνες (cores) | cores | filter, column | collected | 96.4% (406/421) | 100.0% (111/111) | 98.9% (355/359) |
| Threads | not collected | filter, column | not collected | — | — | — |
| Συχνότητα boost (boost clock) | not collected | filter, column | not collected | — | — | — |
| TDP | tdp | filter, column | collected | 32.3% (136/421) | 92.8% (103/111) | 69.4% (249/359) |
| PPT/PL2 (real power limit) | not collected (plan: hand table per family) | power estimate, 14 | not collected | — | — | — |
| Ενσωματωμένα γραφικά (iGPU) | igpu (computed from the model number, never null) | 12; filter, quick, column | collected | 100.0% (421/421) | 100.0% (111/111) | 100.0% (359/359) |
| Ψύκτρα στο κουτί (cooler in box) | coolerIncluded | 11; filter, quick | collected | 89.3% (376/421) | 100.0% (111/111) | 57.1% (205/359) |
| Box/Tray | packaging | 11; filter | collected | 94.8% (399/421) | 100.0% (111/111) | 82.7% (297/359) |

### Motherboards
1215 models; most-listed quarter = 308 models with ≥ 4 listings; builder rows: 1023.

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Socket | socket | 1, 13; filter, quick | collected | 97.4% (1183/1215) | 99.7% (307/308) | 100.0% (1023/1023) |
| Chipset | chipset | 13; filter, column | collected | 91.9% (1116/1215) | 98.4% (303/308) | 100.0% (1023/1023) |
| Form factor | formFactor (≠ 'Άλλο') | 5; filter, quick, column | collected | 99.8% (1213/1215) | 100.0% (308/308) | 100.0% (1023/1023) |
| Τύπος μνήμης (memory type) | memory | 2; filter, quick, column | collected | 92.6% (1125/1215) | 99.7% (307/308) | 100.0% (1023/1023) |
| Θέσεις RAM (RAM slots) | ramSlots | 3; filter | collected | 71.3% (866/1215) | 99.0% (305/308) | 75.6% (773/1023) |
| Μέγιστη μνήμη (max memory) | not collected | 4; filter | not collected | — | — | — |
| Θέσεις M.2 (M.2 slots) | not collected | 17, 20; filter, column | not collected | — | — | — |
| Θύρες SATA (SATA ports) | not collected | 18; filter | not collected | — | — | — |
| WiFi | wifi (from the title; false = title does not say WiFi) | filter, quick, column | title words | 45.3% (550/1215) | 48.7% (150/308) | 51.8% (530/1023) |
| Bluetooth | not collected | filter | not collected | — | — | — |
| USB-C header μπροστά (front USB-C header) | not collected | 24; filter | not collected | — | — | — |
| BIOS Flashback | not collected | 13; filter | not collected | — | — | — |
| Fan headers | not collected | 23 | not collected | — | — | — |

### RAM
489 models; most-listed quarter = 126 models with ≥ 11 listings; builder rows: 239.

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Τύπος (type) | type | 2; filter, quick | collected | 100.0% (489/489) | 100.0% (126/126) | 100.0% (239/239) |
| Συνολική χωρητικότητα (total capacity) | capacity | 4; filter | collected | 100.0% (489/489) | 100.0% (126/126) | 100.0% (239/239) |
| Διαμόρφωση κιτ (kit layout) | modules (+ capacity) | 3; filter, quick, column | collected | 100.0% (489/489) | 100.0% (126/126) | 100.0% (239/239) |
| Συχνότητα (speed) | speed | 25; filter, column | collected | 82.8% (405/489) | 79.4% (100/126) | 86.6% (207/239) |
| CL | cas | filter, column | collected | 51.7% (253/489) | 75.4% (95/126) | 56.9% (136/239) |
| Latency σε ns (latency in ns) | derivable: 2000 × cas / speed | filter | derivable | 50.1% (245/489) | 69.8% (88/126) | 56.1% (134/239) |
| XMP/EXPO | not collected | filter | not collected | — | — | — |
| Ύψος (height) | not collected | 26; filter | not collected | — | — | — |
| RGB | not collected (titles name it sometimes) | filter | not collected | — | — | — |
| Χρώμα (colour) | not collected | filter | not collected | — | — | — |
| €/GB | derivable: price / capacity | column, sort | derivable | 100.0% (489/489) | 100.0% (126/126) | 100.0% (239/239) |
| (builder) Desktop/Laptop/Server | formFactor (default Desktop when not stated) | builder: usable | collected | 100.0% (489/489) | 100.0% (126/126) | 100.0% (239/239) |

### Storage
2346 models; most-listed quarter = 709 models with ≥ 3 listings; builder rows: 1322.

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Τύπος (type) | media | filter, quick | collected | 100.0% (2346/2346) | 100.0% (709/709) | 100.0% (1322/1322) |
| Interface | iface | 17, 18; filter, column | collected | 97.9% (2296/2346) | 99.9% (708/709) | 98.0% (1296/1322) |
| Χωρητικότητα (capacity) | capacity | filter, quick, column | collected | 100.0% (2346/2346) | 100.0% (709/709) | 100.0% (1322/1322) |
| PCIe gen (NVMe only) | pcie | 20; filter | collected | 96.0% (938/977) | 99.7% (336/337) | 96.5% (670/694) |
| Form factor | formFactor | 17, 19; filter | collected | 99.6% (2337/2346) | 100.0% (709/709) | 100.0% (1322/1322) |
| DRAM (SSD only) | dram | filter | collected | 1.8% (29/1641) | 5.4% (29/536) | 2.6% (29/1125) |
| Ταχύτητες: ανάγνωση (read speed, SSD) | readMBs | filter, column | collected | 9.4% (155/1641) | 12.1% (65/536) | 13.4% (151/1125) |
| Ταχύτητες: εγγραφή (write speed, SSD) | writeMBs | filter | collected | 9.3% (153/1641) | 11.9% (64/536) | 13.2% (149/1125) |
| TBW (SSD only) | tbw | filter | collected | 1.0% (17/1641) | 3.2% (17/536) | 1.5% (17/1125) |
| Στροφές (RPM, HDD only) | rpm | filter | collected | 93.5% (659/705) | 99.4% (172/173) | 91.9% (181/197) |
| Κατηγορία χρήσης (usage tier) | tier | filter (segment) | collected | 100.0% (2346/2346) | 100.0% (709/709) | 100.0% (1322/1322) |
| (v1 only) Cache (HDD) | cacheMB | v1 card text | collected | 45.1% (318/705) | 89.0% (154/173) | 81.7% (161/197) |
| (v1 only) Heatsink (NVMe) | heatsink | v1 data | collected | 7.5% (73/977) | 8.0% (27/337) | 10.5% (73/694) |
| €/TB | derivable: price / capacity | column, sort | derivable | 100.0% (2346/2346) | 100.0% (709/709) | 100.0% (1322/1322) |

### PSU
186 models; most-listed quarter = 51 models with ≥ 14 listings; builder rows: 139.

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Watt | watts | 14; filter, quick, column | collected | 100.0% (186/186) | 100.0% (51/51) | 100.0% (139/139) |
| Πιστοποίηση 80+ (80 PLUS) | efficiency | filter, quick, column | collected | 70.4% (131/186) | 76.5% (39/51) | 71.2% (99/139) |
| Modular | modular | filter, column | collected | 84.4% (157/186) | 100.0% (51/51) | 41.0% (57/139) |
| Form factor (ATX/SFX) | formFactor — stated in title/URL (default ATX otherwise) | 16; filter; builder usable | collected (defaulted) | 72.0% (134/186) | 100.0% (51/51) | 55.4% (77/139) |
| ATX 3.x | not collected (title words "ATX 3.0/3.1", positive only) | filter, quick, column | title words | 18.3% (34/186) | 41.2% (21/51) | 21.6% (30/139) |
| Βύσμα 12V-2x6 (12V-2x6 connector) | not collected (title words, positive only) | 15; filter | title words | 5.9% (11/186) | 19.6% (10/51) | 6.5% (9/139) |
| Μήκος (length) | not collected | filter | not collected | — | — | — |
| €/W | derivable: price / watts | column, sort | derivable | 100.0% (186/186) | 100.0% (51/51) | 100.0% (139/139) |

PSU builder rows carry the cheapest listing's `modular`/`efficiency` (spec models mix makers), hence the lower builder-row share for "Modular" (41.0%).

### Cases
2609 models; most-listed quarter = 982 models with ≥ 3 listings; builder rows: 2609.

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Τύπος (type / size) | size (≠ 'Άλλο') | 5 (fallback); filter, quick, column | collected | 88.9% (2319/2609) | 99.2% (974/982) | 87.7% (2289/2609) |
| Μητρικές που δέχεται (boards it takes) | maxBoard (stated) | 5; filter, quick | collected | 86.0% (2243/2609) | 99.7% (979/982) | 86.0% (2243/2609) |
| Max μήκος κάρτας (max GPU length) | gpuMaxMm | 6; filter, column | collected | 26.5% (692/2609) | 39.6% (389/982) | 26.5% (692/2609) |
| Max ύψος ψύκτρας (max cooler height) | coolerMaxMm | 8; filter, column | collected | 14.8% (387/2609) | 36.5% (358/982) | 14.8% (387/2609) |
| Radiators ανά θέση: μεγέθη (radiator sizes per position) | radiators (makers) | 9; filter | collected | 2.5% (66/2609) | 3.7% (36/982) | 2.5% (66/2609) |
| Radiators ανά θέση: μόνο θέσεις (positions only) | radiatorMounts (shops) | 9 (fallback) | collected | 19.2% (502/2609) | 30.5% (300/982) | 19.2% (502/2609) |
| Θέσεις ανεμιστήρων ανά μέγεθος (fan positions per size) | fanMounts (makers) | 21 | collected | 2.6% (67/2609) | 3.8% (37/982) | 2.6% (67/2609) |
| Θέσεις ανεμιστήρων, πλήθος (fan positions, count) | fanSlots | 21 (fallback) | collected | 23.6% (615/2609) | 33.8% (332/982) | 23.6% (615/2609) |
| Ανεμιστήρες στο κουτί (fans included) | fansIncluded (list or []) or hasFans | 22; filter, quick, column | collected | 5.7% (148/2609) | 7.2% (71/982) | 5.7% (148/2609) |
| Θέσεις 3.5"/2.5" (drive bays) | not collected | 19; filter | not collected | — | — | — |
| Θέσεις επέκτασης (expansion slots) | not collected | 7 | not collected | — | — | — |
| Μορφή τροφοδοτικού (PSU form factor it takes) | not collected | 16 | not collected | — | — | — |
| Γυάλινο πλαϊνό (glass side) | window (from the title; false = not said) | filter | title words | 68.3% (1782/2609) | 86.7% (851/982) | 68.3% (1782/2609) |
| USB-C μπροστά (front USB-C) | not collected | 24; filter | not collected | — | — | — |
| Χρώμα (colour) | not collected (colours merged by design) | filter | not collected | — | — | — |
| Mesh (quick filter) | title words "Mesh"/"Airflow"/"Flow" (positive only) | quick | title words | 5.5% (144/2609) | 6.8% (67/982) | 5.5% (144/2609) |

### Fans
2005 models; most-listed quarter = 937 models with ≥ 2 listings; builder rows: 1720.

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Μέγεθος (size) | size | 21; filter, quick, column | collected | 100.0% (2005/2005) | 100.0% (937/937) | 100.0% (1720/1720) |
| Πλήθος στο πακέτο (pack) | pack | 21, 23; filter, quick, column | collected | 100.0% (2005/2005) | 100.0% (937/937) | 100.0% (1720/1720) |
| PWM/3-pin (connector) | connector (stated) | filter, quick, column | collected | 66.1% (1326/2005) | 92.5% (867/937) | 66.7% (1147/1720) |
| PWM (title word) | pwm (true = "PWM" in the title/URL; false = not said) | v1 filter | title words | 69.5% (1393/2005) | 83.5% (782/937) | 73.5% (1264/1720) |
| Airflow/static pressure (type) | fanType (maker series only) | filter | collected | 6.3% (127/2005) | 8.9% (83/937) | 6.2% (107/1720) |
| CFM | airflowCfm | filter | collected | 11.9% (238/2005) | 12.3% (115/937) | 13.4% (230/1720) |
| Static pressure (mmH2O) | pressureMm | filter | collected | 8.3% (167/2005) | 10.4% (97/937) | 9.7% (166/1720) |
| Θόρυβος (noise) | not collected | filter | not collected | — | — | — |
| RGB | rgb (from the title; false = not said) | filter | title words | 60.9% (1222/2005) | 66.9% (627/937) | 68.6% (1180/1720) |
| €/ανεμιστήρα (€/fan) | derivable: price / pack | column, sort | derivable | 100.0% (2005/2005) | 100.0% (937/937) | 100.0% (1720/1720) |

### Coolers
2113 models; most-listed quarter = 986 models with ≥ 2 listings; builder rows: 2113.

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Τύπος (type) | type | 8, 9; filter, quick, column | collected | 100.0% (2113/2113) | 100.0% (986/986) | 100.0% (2113/2113) |
| Socket | sockets | 10; filter, quick, column | collected | 33.1% (699/2113) | 46.5% (458/986) | 33.1% (699/2113) |
| Ύψος (height, air only) | heightMm | 8, 26; filter, column | collected | 26.0% (314/1206) | 38.8% (212/547) | 26.0% (314/1206) |
| Μέγεθος radiator (radiator, AIO only) | radiator | 9; filter, quick, column | collected | 100.0% (907/907) | 100.0% (439/439) | 100.0% (907/907) |
| Θόρυβος (noise) | not collected | filter | not collected | — | — | — |
| RGB | rgb (from the title; false = not said) | filter | title words | 60.3% (1275/2113) | 65.4% (645/986) | 54.9% (1160/2113) |
| Χρώμα (colour) | not collected | filter | not collected | — | — | — |

## 2. Grouping problems

**Heuristics** (`scripts/audit/data-quality/grouping.mjs`):

- *Duplicates (one product, several models)* — for named products (boards, cases, fans, coolers, storage): (1) the same name tokens in another order; (2) the same tokens after dropping filler/colour words (Gaming, Edition, Case, PC, CPU, Cooler, Fan, Black, White, BK, WH, ATX, Midi, Tower, Extended…; storage keeps SSD/HDD apart); (3) the same model name under different vendor names (low confidence: Antec P12 and Arctic P12 are different fans); (4) Greek words left in the name (the key drops Greek letters but keeps "120mm"); (5) the same part number (title token with letters and digits, ≥ 7 characters, in at most 3 models, not part of every model's own name, not shared by different capacities/packs/radiators) in titles of different models.
- *Wrong merges (different products or contradicting facts in one model)* — per category: title capacity / kit / VRAM / pack / radiator / speed / DDR type that contradicts the model; listings of one model that disagree on interface, form factor, RPM, PCIe generation, socket, cores, memory type, board size, cooler type, connector or cooler-in-box; chip + VRAM combinations a GPU is not sold with; one part number filed under different spec models (RAM, PSU, GPU); Skroutz cards whose title names another product than the URL slug.
- **Merges by design, not counted as errors:** RAM and PSU models are specs across makers (CL, modularity, makers differ inside a model); CPU Box and Tray share a model on the category page (the builder splits by cooler-in-box); case colours and RGB/glass variants share a model (`normalize_case.py` NOISE); GPU memory-type variants of old chips share a chip + VRAM model; listings without a stated speed (RAM) or efficiency (PSU) form their own "spec not stated" model. They are listed with "By design = yes".

Counts overlap between checks (a model can appear in several), so they are not summed. Each table's "Listings" = listings in the flagged groups (for title checks: the flagged listings only). The "20 worst examples" per category take the high-confidence wrong merges first, round-robin over the checks, biggest first; titles over 120 characters are cut.

### GPU
| Kind | Check | By design | Confidence | Groups | Models | Listings | Root cause |
| --- | --- | --- | --- | --- | --- | --- | --- |
| wrong-merge | same part number filed under different chip/VRAM models |  | medium | 1 | 2 | 3 | hypothesis: a shop title with the wrong VRAM (Snif "GV-N507TWF3OC-16GD … RTX 5070 Ti 12GB"). |
| wrong-merge | title states another VRAM size than the model |  | high | 0 | 0 | 0 |  |
| wrong-merge | part number's VRAM (e.g. Gigabyte …-12GD) differs from the model's VRAM |  | high | 2 | 2 | 2 | verified: normalize.py takes VRAM from the title text ("16GB"), which some shops write wrongly; the part number disagrees. |
| wrong-merge | chip + VRAM combination that the chip is not sold with (phantom model) |  | high | 3 | 3 | 4 | verified: the model key is chip + VRAM from the title (src/lib/categories.tsx GPU.modelKey); a shop title with the wrong VRAM makes its own model. |
| wrong-merge | memory type differs between listings (GDDR4/GDDR5 variants share a chip + VRAM model) | yes | medium | 9 | 9 | 152 |  |
| wrong-merge | Skroutz card title names another product than its link (family cards) |  | medium | 1 | 1 | 1 | verified: scraper/sources/skroutz.py takes the title from the card link’s title attribute and the price from the JSON-LD entry of the linked variant; for family cards the two name different variants. |

- Phantom chip + VRAM models (S3): 3 models / 4 listings (RTX 5070 16GB, RTX 5070 Ti 12GB, RX 9070 12GB). The reference VRAM table is the audit's (chip makers' published configurations, from general knowledge). Two of them are contradicted by the card's own part number in the title (Gigabyte `-12GD` / `-16GD`). Root cause verified: the model key is chip + the VRAM stated in the title.

<details><summary>20 worst examples — GPU</summary>

| # | Check | Model key(s) (listings) | Why | Listings (source: title — €) |
| --- | --- | --- | --- | --- |
| 1 | chip + VRAM combination that the chip is not sold with (phantom model) | RTX 5070 16GB (2) | RTX 5070 is sold with 12 GB | snif: Gigabyte GeForce RTX 5070 Gaming 16GB GDDR7 OC GV-N5070GAMING-OC-12GD — 1179<br>snif: Gigabyte GeForce RTX 5070 Gaming 16GB OC — 1847 |
| 2 | part number's VRAM (e.g. Gigabyte …-12GD) differs from the model's VR… | RTX 5070 16GB (2) | part number VRAM | snif: Gigabyte GeForce RTX 5070 Gaming 16GB GDDR7 OC GV-N5070GAMING-OC-12GD — 1179 |
| 3 | same part number filed under different chip/VRAM models | RTX 5070 Ti 16GB (93)<br>RTX 5070 Ti 12GB (1) | part number GVN507TWF3OC16GD | shopflix: Gigabyte GeForce RTX 5070 Ti VGA GV-N507TWF3OC-16GD/16GB/GDDR7 — 1633.58<br>snif: GIGABYTE VGA GV-N507TWF3OC-16GD , 16GB , GDDR7 — 1699<br>snif: Gigabyte VGA GV-N507TWF3OC-16GD GeForce RTX 5070 Ti 12GB — 1802.31 |
| 4 | Skroutz card title names another product than its link (family cards) | — | missing from slug: g210; filed as GT 210 | skroutz: Biostar GeForce GT 210 1GB Ver. G210 — 45.76 |
| 5 | chip + VRAM combination that the chip is not sold with (phantom model) | RTX 5070 Ti 12GB (1) | RTX 5070 Ti is sold with 16 GB | snif: Gigabyte VGA GV-N507TWF3OC-16GD GeForce RTX 5070 Ti 12GB — 1802.31 |
| 6 | part number's VRAM (e.g. Gigabyte …-12GD) differs from the model's VR… | RTX 5070 Ti 12GB (1) | part number VRAM | snif: Gigabyte VGA GV-N507TWF3OC-16GD GeForce RTX 5070 Ti 12GB — 1802.31 |
| 7 | chip + VRAM combination that the chip is not sold with (phantom model) | RX 9070 12GB (1) | RX 9070 is sold with 16 GB | shopflix: Asus Radeon RX 9070 12GB GDDR6 Prime OC — 739.74 |

</details>

### CPU
| Kind | Check | By design | Confidence | Groups | Models | Listings | Root cause |
| --- | --- | --- | --- | --- | --- | --- | --- |
| duplicate | chip names equal apart from spaces/hyphens/case |  | high | 0 | 0 | 0 |  |
| duplicate | same part number in the titles of different models |  | medium | 0 | 0 | 0 | hypothesis: names cut differently per site (e-shop/Snif titles keep the part number or extra words, Skroutz/BestPrice drop them). |
| wrong-merge | socket differs between listings |  | high | 1 | 1 | 2 |  |
| wrong-merge | core count differs between listings |  | high | 3 | 3 | 10 |  |
| wrong-merge | TDP differs between listings |  | medium | 3 | 3 | 22 |  |
| wrong-merge | cooler-in-box differs between listings with the same packaging |  | high | 6 | 6 | 47 | verified (scraper/specs.py apply): a Tray listing without a stated value gets coolerIncluded=false, but shops sell "Tray με ψύκτρα" / "Tray with Fan" packs that do include one. |
| wrong-merge | Box and Tray in one model | yes | medium | 128 | 128 | 821 |  |
| wrong-merge | Skroutz card title names another product than its link (family cards) |  | medium | 0 | 0 | 0 | verified: scraper/sources/skroutz.py takes the title from the card link’s title attribute and the price from the JSON-LD entry of the linked variant; for family cards the two name different variants. |

- Cooler-in-box differing inside one packaging (S2): 6 models / 47 listings — "Tray" and "Tray με ψύκτρα" listings of e.g. Ryzen 5 9600 / 8400F / 5500F share chip + packaging, and Tray listings without a page value are set to "no cooler". Core counts (S3): 3 models (Core i9-13900KF: one BestPrice listing 16 cores vs 24; EPYC 9334: 64 vs 32; Ryzen 3 4300G: Snif 6 vs 4); the page shows the most common value, which is right for the i9 and the Ryzen 3 but wrong for the EPYC 9334 (64 shown; it has 32 cores — general knowledge). Socket (S3): Xeon 6756E LGA4710 vs LGA4677 (server, not in the builder). TDP (S4): e.g. Core i5-14400 65 W vs 148 W (turbo power stored as TDP).

<details><summary>20 worst examples — CPU</summary>

| # | Check | Model key(s) (listings) | Why | Listings (source: title — €) |
| --- | --- | --- | --- | --- |
| 1 | cooler-in-box differs between listings with the same packaging | Ryzen 7 7700 (12) |  | bestprice: AMD Ryzen 7 7700 Tray — 180.9<br>skroutz: AMD Ryzen 7 7700 3.8GHz — 205.28<br>shopflix: AMD Ryzen 7 7700 3.8GHz 8 Πυρήνων για Socket AM5 σε Tray με Ψύκτρα — 210.48<br>shopflix: AMD Ryzen 7 7700 3.8GHz — 215.13<br>… +4 more |
| 2 | core count differs between listings | Core i9-13900KF (4) | cores: 16 / 24 | bestprice: Intel Core i9-13900KF Tray — 433.06<br>skroutz: Intel Core i9-13900KF 2.2GHz — 440.91<br>shopflix: Intel Core i9-13900KF 2.2GHz 24 Πυρήνων για Socket 1700 Tray — 441.94<br>shopflix: Intel Core i9-13900KF 2.2GHz 24 Πυρήνων για Socket 1700 σε Κουτί — 762.9 |
| 3 | socket differs between listings | Xeon 6756E (2) | socket: LGA4710 / LGA4677 | bestprice: Intel Xeon 6756E Tray — 3195.62<br>skroutz: Intel Xeon 6756E 1.8GHz Tray — 3778.16 |
| 4 | TDP differs between listings | Core Ultra 7 265 (9) | tdp: 182 / 65 | bestprice: Intel Core Ultra 7 265 Box — 351<br>bestprice: Intel Core Ultra 7 265 Tray — 369.94<br>shopflix: Intel Ultra 7 265 2.4GHz 20 Πυρήνων για Socket 1851 Tray — 369.95<br>skroutz: Intel Ultra 7 265 2.4GHz Tray — 384.38<br>… +4 more |
| 5 | cooler-in-box differs between listings with the same packaging | Ryzen 5 8400F (10) |  | eshop: AMD RYZEN 5 8400F 4.2 GHZ 16 MB L3 — 86.9<br>bestprice: AMD Ryzen 5 8400F Tray — 90.34<br>shopflix: AMD Ryzen 5 8400F 4.2GHz 6 Πυρήνων για Socket AM5 Tray — 94.77<br>skroutz: AMD Ryzen 5 8400F 4.2GHz — 96.6<br>… +4 more |
| 6 | core count differs between listings | EPYC 9334 (3) | cores: 32 / 64 | bestprice: AMD Epyc 9334 Tray — 1496.07<br>skroutz: AMD Epyc 9334 3.7GHz Tray — 1710.97<br>shopflix: AMD Epyc 9334 3.7GHz 64 Πυρήνων για Socket SP5 Tray — 2099.85 |
| 7 | TDP differs between listings | Core i5-14400 (8) | tdp: 65 / 148 | bestprice: Intel Core i5-14400 Tray — 147.5<br>shopflix: Intel Core i5-14400 1.8GHz — 165.75<br>skroutz: Intel Core i5-14400 2.50GHz Tray — 170.23<br>skroutz: Intel Core i5-14400 1.8GHz — 172.38<br>… +4 more |
| 8 | cooler-in-box differs between listings with the same packaging | Ryzen 5 9600 (8) |  | bestprice: AMD Ryzen 5 9600 Box — 179.99<br>bestprice: AMD Ryzen 5 9600 Tray — 201.5<br>skroutz: AMD Ryzen 5 9600 3.8GHz — 208.32<br>eshop: AMD RYZEN 5 9600 3.8GHZ 6-CORES 32MB L3 65W BOXED — 209.9<br>… +4 more |
| 9 | core count differs between listings | Ryzen 3 4300G (3) | cores: 4 / 6 | bestprice: AMD Ryzen 3 4300G Box — 86.5<br>skroutz: AMD Ryzen 3 4300G 3.8GHz Tray — 114.9<br>snif: AMD CPU Ryzen 3 4300G, 3.9GHz, 6 Cores, AM4, 6MB, Wraith Stealth cooler — 142.72 |
| 10 | TDP differs between listings | Pentium G6405 (5) | tdp: 58 / 35 | bestprice: Intel Pentium Gold G6405 Box — 74.9<br>shopflix: Intel Pentium Dual Core G6405 4.1GHz 2 Πυρήνων για Socket 1200 σε Κουτί με Ψύκτρα — 74.9<br>skroutz: Intel Pentium Dual Core G6405 4.1GHz — 78<br>skroutz: Intel Pentium Dual Core Gold G6405 4.1GHz Tray — 87.9<br>… +1 more |
| 11 | cooler-in-box differs between listings with the same packaging | Ryzen 5 7400 (6) |  | bestprice: AMD Ryzen 5 7400 Box — 131.6<br>bestprice: AMD Ryzen 5 7400 Tray — 133.14<br>skroutz: AMD Ryzen 5 7400 4.3GHz — 141.93<br>shopflix: AMD Ryzen 5 7400 4.3GHz — 146.29<br>… +2 more |
| 12 | cooler-in-box differs between listings with the same packaging | Ryzen 7 7700X3D (6) |  | skroutz: AMD Ryzen 7 7700X3D 4GHz — 285.45<br>bestprice: AMD Ryzen 7 7700X3D Tray — 285.45<br>shopflix: AMD Ryzen 7 7700X3D 4GHz — 285.5<br>bestprice: AMD Ryzen 7 7700X3D Box — 331.72<br>… +2 more |
| 13 | cooler-in-box differs between listings with the same packaging | Ryzen 5 5500F (5) |  | bestprice: AMD Ryzen 5 5500F Tray — 85.32<br>skroutz: AMD Ryzen 5 5500F 3GHz — 93.8<br>bestprice: AMD Ryzen 5 5500F Box — 96<br>skroutz: AMD Ryzen 5 5500F 3GHz Tray — 110.94<br>… +1 more |

</details>

### Motherboards
| Kind | Check | By design | Confidence | Groups | Models | Listings | Root cause |
| --- | --- | --- | --- | --- | --- | --- | --- |
| duplicate | same words in a different order |  | high | 22 | 44 | 82 | hypothesis: sites write the name in a different word order; model keys keep the order (productKey). |
| duplicate | same name apart from filler/colour words (Gaming, Edition, Case, Black, White…) |  | medium | 23 | 47 | 68 | hypothesis: a filler or colour word survives the normalizer on one site only. |
| duplicate | same model name under different vendor names (needs review: some are different products) |  | low | 6 | 13 | 31 | hypothesis: vendor spelling (Alpenfoehn/Alpenfohn), rebrands (SilentiumPC/Endorfy, Natec/Genesis) or a wrong vendor on one site. |
| duplicate | Greek words left in the model name (e.g. Shopflix "Τριπλού Ανεμιστήρα 120mm", Greek capitals typed for Latin ones) |  | high | 0 | 0 | 0 | verified: productKey (src/lib/categories.tsx) / model_key (scraper/names.py) keep only [a-z0-9], so Greek words vanish but their "120mm" stays and changes the key; normalize_cooling.py does not cut Shopflix’s "Διπλού/Τριπλού Ανεμιστήρα 120mm" phrase, and normalize_case.py does not convert Greek capitals typed for Latin ones ("ΑΧ61") as normalize_mobo.py does. |
| duplicate | same part number in the titles of different models |  | medium | 1 | 2 | 2 | hypothesis: names cut differently per site (e-shop/Snif titles keep the part number or extra words, Skroutz/BestPrice drop them). |
| wrong-merge | DDR4 and DDR5 listings in one board model |  | high | 6 | 6 | 33 | verified for "…/M.2+ D5" vs "…/M.2" (ASRock): scraper/normalize_mobo.py removes e-shop’s "D5" and "+" from names, so the DDR5 and DDR4 boards get one key; others are a wrong spec on one site (hypothesis). |
| wrong-merge | some titles say WiFi, others do not, and the model name has no WiFi |  | medium | 1 | 1 | 2 | hypothesis: a WiFi and a non-WiFi board share a key when one site drops the word, or one site leaves it out of the title. |
| wrong-merge | WiFi flag differs between listings (all titles of the model) |  | low | 4 | 4 | 16 |  |
| wrong-merge | socket differs between listings |  | high | 4 | 4 | 18 |  |
| wrong-merge | board size differs between listings |  | medium | 41 | 41 | 142 | verified (normalize_mobo.py): a board whose title states no size gets the chipset’s M/I suffix, else "ATX" by default; e-shop sizes are ignored as unreliable, so "ROG STRIX B850-I … RETAIL" (no suffix on B850) becomes ATX, and "A520M-ITX" becomes Micro ATX from the "M" |
| wrong-merge | RAM slot count differs between listings |  | medium | 1 | 1 | 3 |  |
| wrong-merge | Skroutz card title names another product than its link (family cards) |  | medium | 0 | 0 | 0 | verified: scraper/sources/skroutz.py takes the title from the card link’s title attribute and the price from the JSON-LD entry of the linked variant; for family cards the two name different variants. |

- DDR4 + DDR5 in one board (S1, see summary item 5). Board size disagreements (41 models) come mostly from e-shop titles without a size (default ATX) and from the chipset-suffix rule; the page and builder use the most common value, which is wrong when the wrong value is the majority (A520M-ITX/ac: Micro ATX 2 of 3). Shopflix "Extended ATX" titles also leave "Extended" in the name, splitting boards ("asusrogmaximusz890extremewifiextended").

<details><summary>20 worst examples — Motherboards</summary>

| # | Check | Model key(s) (listings) | Why | Listings (source: title — €) |
| --- | --- | --- | --- | --- |
| 1 | DDR4 and DDR5 listings in one board model | asrockh610mhdvm2 (8) | memory: DDR5 / DDR4; model shows DDR5 | bestprice: Asrock H610M-HDV/M.2+ D5 — 54.69<br>shopflix: ASRock H610M-HDV / M.2+ D5 Micro ATX με Intel 1700 Socket — 58.99<br>skroutz: ASRock H610M-HDV/M.2+ D5 — 58.99<br>eshop: ASROCK H610M-HDV/M.2+ D5 RETAIL — 62.5<br>… +4 more |
| 2 | socket differs between listings | asusprimeb840macsm (6) | socket: AM4 / AM5 | bestprice: Asus Prime B840M-A-CSM — 89<br>skroutz: Asus PRIME B840M-A-CSM — 95.5<br>shopflix: Asus Prime B840M-A-Csm/Am5/MATX — 100.69<br>snif: Asus Prime B840M-A-CSM Micro-ATX sAM5 90MB1J10-M0EAYC — 198.9<br>… +2 more |
| 3 | same words in a different order | asustufb650plusgamingwifi (1)<br>asustufgamingb650pluswifi (5) |  | eshop: ASUS TUF B650-PLUS GAMING WIFI (AM5) RETAIL — 166.9<br>shopflix: Asus TUF Gaming B650-Plus WiFi ATX — 165<br>bestprice: Asus TUF Gaming B650-Plus WiFi — 165.38<br>skroutz: Asus TUF Gaming B650-PLUS WIFI — 167.46<br>… +2 more |
| 4 | board size differs between listings | asrockb860lightningwifi (6) | formFactor: Micro ATX / ATX | skroutz: ASRock B860 Lightning WiFi — 198.43<br>eshop: ASROCK B860 LIGHTNING WIFI — 216.9<br>shopflix: ASRock B860 Lightning WiFi Micro ATX με Intel 1851 Socket — 218.28<br>bestprice: Asrock B860 Lightning WiFi — 232.92<br>… +2 more |
| 5 | RAM slot count differs between listings | asrockromed4id2t (3) | ramSlots: 4 / 2 | bestprice: Asrock ROMED4ID-2T — 735<br>skroutz: ASRock ROMED4ID-2T — 771.75<br>shopflix: ASRock ROMED4ID-2T Mini ITX με AMD Socket — 1300.9 |
| 6 | some titles say WiFi, others do not, and the model name has no WiFi | gigabyteb550mds3hacr2 (2) |  | bestprice: Gigabyte B550M DS3H AC R2 — 96.53<br>shopflix: Gigabyte B550M DS3H AC R2 Micro ATX Motherboard with Wi-Fi, AMD AM4 Socket — 104.72 |
| 7 | same name apart from filler/colour words (Gaming, Edition, Case, Blac… | asrockb860challengerwhitewifi (1)<br>asrockb860challengerwifi (3)<br>asrockb860challengerwifiwhite (2) |  | bestprice: Asrock B860 Challenger White WiFi — 153.17<br>bestprice: Asrock B860 Challenger WiFi — 141.12<br>skroutz: ASRock B860 Challenger WiFi — 161.49<br>shopflix: ASRock B860 Challenger WiFi Motherboard ATX με Intel 1851 Socket 90-MXBUC0-A0UAYZ — 161.5<br>… +2 more |
| 8 | same part number in the titles of different models | asrockam5d4id2tbcm (1)<br>asrockknoll3 (2) | part number AM5D4ID2T | bestprice: Asrock AM5D4ID-2T/BCM — 865.46<br>shopflix: ASRock Knoll3 Motherboard Mini ITX με AMD AM5 Socket AM5D4ID-2T/BCM — 691.26 |
| 9 | WiFi flag differs between listings (all titles of the model) | asrockb860mchallengerwifi (5) | wifi: true / false | bestprice: Asrock B860M Challenger WiFi — 146.02<br>shopflix: ASRock B860M Challenger Wi Fi Motherboard Micro ATX με Intel 1851 Socket 90-MXBUP0-A0UAYZ — 153.14<br>skroutz: ASRock B860M Challenger WiFi — 153.14<br>shopflix: ASRock B860M Challenger Wi Fi Motherboard Micro ATX με Intel 1851 Socket 90-MXBUQ0-A0UAYZ — 160.78<br>… +1 more |
| 10 | same model name under different vendor names (needs review: some are … | asrockh810mh (3)<br>gigabyteh810mh (5) |  | bestprice: Asrock H810M-H — 67.37<br>skroutz: ASRock H810M-H — 70.48<br>shopflix: ASRock H810M-H Micro ATX με Intel 1851 Socket — 76.99<br>bestprice: Gigabyte H810M H — 82.44<br>… +4 more |
| 11 | DDR4 and DDR5 listings in one board model | asrockh610mh2m2 (7) | memory: DDR5 / DDR4; model shows DDR5 | skroutz: ASRock H610M-H2/M.2 D5 — 55.03<br>bestprice: Asrock H610M-H2/M.2 D5 — 55.21<br>bestprice: Asrock H610M-H2/M.2 — 57.48<br>eshop: ASROCK H610M-H2/M.2 D5 LGA1700 RETAIL — 59.9<br>… +3 more |
| 12 | socket differs between listings | asusprowsw890esagese (5) | socket: LGA4710 / LGA1851 | bestprice: Asus Pro WS W890E-Sage SE — 915.31<br>skroutz: Asus PRO WS W890E-SAGE SE — 1115.49<br>shopflix: Asus PRO WS W890E-SAGE SE Motherboard SSI EEB με Intel Socket 90MB1MW0-M0EAY0 — 1115.49<br>skroutz: Asus Pro WS W890E-SAGE SE — 1462.4<br>… +1 more |
| 13 | same words in a different order | msigamingplusz790wifi (1)<br>msiz790gamingpluswifi (5) |  | snif: MSI Gaming Plus Z790 WIFI Socket 1700, DDR5 — 266<br>bestprice: MSI Z790 Gaming Plus WiFi — 198.3<br>eshop: MSI Z790 GAMING PLUS WIFI D5 RETAIL — 204.9<br>skroutz: MSI Z790 Gaming Plus Wi-Fi — 226.4<br>… +2 more |
| 14 | board size differs between listings | asusrogstrixb650eigamingwifi (5) | formFactor: Mini ITX / ATX | skroutz: Asus ROG Strix B650E-I Gaming Wi-Fi — 245<br>shopflix: Asus ROG Strix B650E-I Gaming Wi-Fi Mini ITX με AMD AM5 Socket — 273.26<br>shopflix: Asus ROG Strix B650E-I Gaming Wi-Fi Mini ITX με AMD AM5 Socket — 274.16<br>eshop: ASUS ROG STRIX B650E-I GAMING WIFI RETAIL — 299<br>… +1 more |
| 15 | same name apart from filler/colour words (Gaming, Edition, Case, Blac… | asrockb860mchallengerwifi (5)<br>asrockb860mchallengerwifiwhite (1) |  | bestprice: Asrock B860M Challenger WiFi — 146.02<br>shopflix: ASRock B860M Challenger Wi Fi Motherboard Micro ATX με Intel 1851 Socket 90-MXBUP0-A0UAYZ — 153.14<br>skroutz: ASRock B860M Challenger WiFi — 153.14<br>shopflix: ASRock B860M Challenger Wi Fi Motherboard Micro ATX με Intel 1851 Socket 90-MXBUQ0-A0UAYZ — 160.78<br>… +2 more |
| 16 | WiFi flag differs between listings (all titles of the model) | asrockx870challengerwifi (5) | wifi: true / false | bestprice: Asrock X870 Challenger WiFi — 229.32<br>shopflix: ASRock X870 Challenger Wi Fi Motherboard ATX με AMD AM5 Socket 90-MXBUK0-A0UAYZ — 239.64<br>skroutz: ASRock X870 Challenger WiFi — 239.64<br>shopflix: ASRock X870 Challenger Wi Fi Motherboard ATX με AMD AM5 Socket 90-MXBUL0-A0UAYZ — 249.67<br>… +1 more |
| 17 | same model name under different vendor names (needs review: some are … | gigabyteb840mgamingpluswifi6e (3)<br>msib840mgamingpluswifi6e (4) |  | bestprice: Gigabyte B840M Gaming Plus WiFi6E — 125.2<br>shopflix: Gigabyte B840M Gaming Plus WIFI6E Motherboard Micro ATX με AMD AM5 Socket — 148.59<br>skroutz: Gigabyte B840M Gaming Plus WIFI6E — 154.39<br>bestprice: MSI B840M Gaming Plus WiFi6E — 126.42<br>… +3 more |
| 18 | DDR4 and DDR5 listings in one board model | asusprimeb840macsm (6) | memory: DDR4 / DDR5; model shows DDR5 | bestprice: Asus Prime B840M-A-CSM — 89<br>skroutz: Asus PRIME B840M-A-CSM — 95.5<br>shopflix: Asus Prime B840M-A-Csm/Am5/MATX — 100.69<br>snif: Asus Prime B840M-A-CSM Micro-ATX sAM5 90MB1J10-M0EAYC — 198.9<br>… +2 more |
| 19 | socket differs between listings | asusprimeh610ma (4) | socket: LGA1700 / AM5 | bestprice: Asus Prime H610M-A — 119.83<br>skroutz: Asus PRIME H610M-A — 130.46<br>shopflix: Asus PRIME H610M-A Motherboard ATX με AMD AM5 Socket 90MB1MJ0-M0EAY0 — 130.46<br>snif: Asus Prime H610M-A Micro ATX με LGA1700 Socket — 167 |
| 20 | same words in a different order | asrocksteellegendwifix870 (2)<br>asrockx870steellegendwifi (3) |  | shopflix: ASRock Steel Legend WiFi X870 ATX με AMD AM5 Socket — 248.16<br>skroutz: ASRock Steel Legend WiFi X870 — 249.35<br>bestprice: Asrock X870 Steel Legend WiFi — 226.18<br>eshop: ASROCK X870 STEEL LEGEND WIFI AM5 D5 RETAIL — 255.9<br>… +1 more |

</details>

### RAM
| Kind | Check | By design | Confidence | Groups | Models | Listings | Root cause |
| --- | --- | --- | --- | --- | --- | --- | --- |
| duplicate | same part number in a spec model and its "spec not stated" twin (speed / efficiency missing on one listing) | yes | medium | 14 | 25 | 34 | verified: normalize_ram.py reads the speed only from "MHz"/"MT/s" or the Skroutz slug "Tachytita-N"; Shopflix titles say "με Ταχύτητα 3600" and get no speed. |
| wrong-merge | same part number filed under different form factors (Desktop/Laptop/Server or ATX/SFX) |  | medium | 54 | 86 | 133 | verified: normalize_ram.py defaults to Desktop when neither the slug nor the title says SO-DIMM/ECC/Registered (e-shop "SO-DIMM" vs Snif titles without it). |
| wrong-merge | same part number filed under different specs (capacity, kit, speed, watts or efficiency differ) |  | high | 27 | 51 | 66 | verified: normalize_ram.py KIT needs "GB" after the module size, so Shopflix "(2x16)" is read as one 32GB stick; plus title typos (Snif "KF560C36BWEA-32 … (2x16GB)"). |
| wrong-merge | title states another kit / total capacity than the model |  | high | 42 | 42 | 113 | verified: normalize_ram.py takes the first "N×SIZE GB" in title+URL; a title whose total and kit disagree ("128GB (2X4GB)") is filed by the kit. |
| wrong-merge | title states another speed than the model |  | high | 0 | 0 | 0 |  |
| wrong-merge | DDR type contradicts the title or the part number (G.Skill F4-/F5-, ADATA AX4/AX5) |  | high | 2 | 2 | 3 | verified: normalize_ram.py takes the type from the title first; shops sometimes write "DDR4" for a DDR5 kit (part number F5-…). |
| wrong-merge | CL differs between listings of one spec model | yes | medium | 109 | 109 | 4377 |  |
| duplicate | speed not stated: listings fall into a separate "no speed" model | yes | medium | 84 | 84 | 1234 |  |
| wrong-merge | Skroutz card title names another product than its link (family cards) |  | medium | 8 | 4 | 8 | verified: scraper/sources/skroutz.py takes the title from the card link’s title attribute and the price from the JSON-LD entry of the linked variant; for family cards the two name different variants. |

- Kit layout wrong (S1, summary item 3) and DDR type wrong (S1, item 4). "Same part number filed under different form factors" (54 groups): one site's title says SO-DIMM/ECC and another's doesn't, so one kit sits in a Desktop and a Laptop/Server model (S2 for laptop kits offered as desktop RAM; the builder offers only Desktop DDR4/DDR5). Root causes verified in `normalize_ram.py` (KIT, SPEED, default Desktop).

<details><summary>20 worst examples — RAM</summary>

| # | Check | Model key(s) (listings) | Why | Listings (source: title — €) |
| --- | --- | --- | --- | --- |
| 1 | title states another kit / total capacity than the model | DDR4 16GB (1×16GB) 3200MHz Desktop (223) | title kit | shopflix: Kingston Fury Impact DDR4 16GB 3200MHz 2x16 — 261.01<br>shopflix: Kingston Fury Renegate DDR4 16GB 3200Mhz (2x8) — 270.3<br>shopflix: Patriot Viper Steel RGB DDR4 16GB 3200MHz 2x16 — 315.35 |
| 2 | same part number filed under different specs (capacity, kit, speed, w… | DDR5 32GB (1×32GB) 6000MHz Desktop (62)<br>DDR5 32GB (2×16GB) 6000MHz Desktop (313) | part number KF560C36BWEA32 | eshop: KINGSTON KF560C36BWEA-32 FURY BEAST WHITE RGB 32GB DDR5 6000MHZ CL36 AMD EXPO — 845.22<br>snif: Kingston Fury Beast RGB KF560C36BWEA-32 DDR5 6000MHz (2x16GB) — 941.53 |
| 3 | DDR type contradicts the title or the part number (G.Skill F4-/F5-, A… | DDR4 64GB (2×32GB) 6000MHz Desktop (2) | DDR type | bestprice: G.Skill Trident Z5 RGB 64GB (2X32GB) DDR4 RAM 6000MHz C36 White F5-6000J3636F32GX2-TZ5RW — 1234.9<br>bestprice: G.Skill Trident Z5 RGB 64GB (2X32GB) DDR4 RAM 6000MHz C30 White F5-6000J3040G32GX2-TZ5RW — 1636.36 |
| 4 | same part number filed under different form factors (Desktop/Laptop/S… | DDR4 16GB (1×16GB) 3200MHz Desktop (223)<br>DDR4 16GB (1×16GB) 3200MHz Laptop (134) | part number TED416G3200C22S01 | snif: TeamGroup Elite TED416G3200C22-S01 DDR4 3200MHz (1x16GB) — 132.16<br>eshop: TEAMGROUP TED416G3200C22-S01 ELITE 16GB SO-DIMM DDR4 3200MHZ — 122.02 |
| 5 | Skroutz card title names another product than its link (family cards) | — | missing from slug: psd38g13332; filed as DDR3 4GB (1×4GB) 1333MHz | skroutz: Patriot PSD38G13332 DDR3 — 30.45 |
| 6 | title states another kit / total capacity than the model | DDR5 16GB (1×16GB) 5600MHz Desktop (132) | title kit | shopflix: Kingston Fury Beast RGB DDR5 16GB 5600MHz 2x8 — 358.2<br>shopflix: G.Skill Ripjaws S5 DDR5 16GB 5600MHz 2x16 — 699.05 |
| 7 | same part number filed under different specs (capacity, kit, speed, w… | DDR4 16GB (1×16GB) 3200MHz Desktop (223)<br>DDR4 16GB (2×8GB) 3200MHz Desktop (125) | part number IRX3200D464L16SA | eshop: GOODRAM IRDM X 16GB DDR4 3200MHZ CL16 BLACK IR-X3200D464L16SA/8G — 65.5<br>eshop: GOODRAM IRDM X 16GB DDR4 3200MHZ CL16 IR-X3200D464L16SA/16G — 136.65<br>bestprice: GoodRam 16GB (1X16GB) DDR4 RAM 3200MHz C16 IR-X3200D464L16SA/16G — 154.2<br>bestprice: GoodRam IRDM X 16GB (2X8GB) DDR4 RAM 3200MHz IR-X3200D464L16SA/16GDC — 131.35 |
| 8 | DDR type contradicts the title or the part number (G.Skill F4-/F5-, A… | DDR4 16GB (1×16GB) 6000MHz Desktop (1) | DDR type | skroutz: Adata XPG Lancer Blade 16GB DDR4 — 350.18 |
| 9 | same part number filed under different form factors (Desktop/Laptop/S… | DDR4 8GB (1×8GB) Laptop (69)<br>DDR4 8GB (1×8GB) 3200MHz Desktop (171)<br>DDR4 8GB (1×8GB) 3200MHz Laptop (100) | part number AFSD48PH1P | shopflix: Afox DDR4 με Module 1x8GB και Ταχύτητα 3200 για Laptop Κωδικός: AFSD48PH1P — 100.69<br>bestprice: AFOX 8GB (1X8GB) DDR4 RAM 3200MHz AFSD48PH1P — 52.6<br>skroutz: Afox 8GB DDR4 AFSD48PH1P — 71.48 |
| 10 | Skroutz card title names another product than its link (family cards) | — | missing from slug: psd38g16002h; filed as DDR3 8GB (1×8GB) 1600MHz | skroutz: Patriot PSD38G16002H DDR3 — 31.19 |
| 11 | title states another kit / total capacity than the model | DDR5 32GB (1×32GB) 5600MHz Desktop (119) | title kit | shopflix: Kingston Fury Beast RGB DDR5 32GB 5600MHz (2x16) — 574.47<br>shopflix: G.Skill Trident Z5 RGB DDR5 32GB 5600MHz 2x16 — 846.8<br>shopflix: G.Skill Ripjaws S5 DDR5 32GB 5600MHz 2x16 — 891.13<br>shopflix: G.Skill Ripjaws S5 F5-5600J4040C16GX2-RS5K DIMM 5600MHz DDR5 32GB για Desktop (2x16) — 995.9<br>… +1 more |
| 12 | same part number filed under different specs (capacity, kit, speed, w… | DDR3 8GB (1×8GB) 1600MHz Desktop (103)<br>DDR4 8GB (1×8GB) 2400MHz Desktop (45)<br>DDR4 8GB (1×8GB) 2666MHz Desktop (72) | part number GOOD8GB | shopflix: Good8GB DDR3 1600MHz GR1600S364L11/8G 8GB — 55.25<br>shopflix: Good8GB 2400MHz DImm DDR4 CL17 GR2400D464L17S/8G 8GB — 100.9<br>shopflix: Good8GB 2666MHz DImm DDR4 CL19 GR2666D464L19S/8G 8GB — 88.9 |
| 13 | same part number filed under different form factors (Desktop/Laptop/S… | DDR4 8GB (1×8GB) 3200MHz Desktop (171)<br>DDR4 8GB (1×8GB) 3200MHz Laptop (100) | part number SP008GBSFU320X02 | eshop: SILICON POWER 8GB DDR4 3200MHZ CL22 SP008GBSFU320X02 — 56.88<br>eshop: SILICON POWER 8GB SO-DIMM DDR4 3200MHZ CL22 SP008GBSFU320X02 — 53.65<br>skroutz: Silicon Power 8GB DDR4 SP008GBSFU320X02 — 61.08<br>snif: SILICON POWER μνήμη DDR4 SODimm SP008GBSFU320X02, 8GB, 3200MHz, CL22 — 82.97 |
| 14 | Skroutz card title names another product than its link (family cards) | — | missing from slug: psd34g16002s; filed as DDR3 8GB (1×8GB) 1600MHz | skroutz: Patriot PSD34G16002S DDR3 — 31.86 |
| 15 | title states another kit / total capacity than the model | DDR3 8GB (1×8GB) 1600MHz Desktop (103) | title kit | shopflix: G.Skill Ripjaws DDR3 8GB 1600MHz (2x4) — 131.19 |
| 16 | same part number filed under different specs (capacity, kit, speed, w… | DDR4 16GB (1×16GB) 2666MHz Laptop (48)<br>DDR4 16GB (1×16GB) 3200MHz Laptop (134)<br>DDR5 16GB (1×16GB) 4800MHz Laptop (37) | part number HSDIMMS1 | skroutz: Hikvision 16GB DDR4 HS-DIMM-S1(STD)/HSC416S26Z1/HIKER/W — 198.59<br>skroutz: Hikvision 16GB DDR4 HS-DIMM-S1(STD)/HSC416S32Z1/HIKER/W — 139.75<br>skroutz: Hikvision 16GB DDR5 HS-DIMM-S1(STD)/HSC516S48Z1/HIKER/W — 301.91 |
| 17 | same part number filed under different form factors (Desktop/Laptop/S… | DDR4 16GB (1×16GB) 3200MHz Desktop (223)<br>DDR4 16GB (1×16GB) 3200MHz Server (22) | part number MTA18ASF2G72PDZ3G2R1TI | bestprice: Micron 16GB (1X16GB) DDR4 RAM 3200MHz MTA18ASF2G72PDZ-3G2R1TI — 96.52<br>snif: Micron MTA18ASF2G72PDZ-3G2R1TI DDR4 3200 MHz (1x16GB) — 96.52<br>shopflix: Micron MTA18ASF2G72PDZ-3G2R1TI DDR4 16GB 3200Mhz — 96.52<br>skroutz: Micron 16GB DDR4 MTA18ASF2G72PDZ-3G2R1TI — 100 |
| 18 | Skroutz card title names another product than its link (family cards) | — | missing from slug: 2x8gb; filed as DDR4 16GB (2×8GB) 3000MHz | skroutz: Corsair Vengeance Rgb Pro 16GB DDR4 με 2 Modules 2x8GB — 211.05 |
| 19 | title states another kit / total capacity than the model | DDR4 32GB (1×32GB) 3200MHz Desktop (103) | title kit | shopflix: Crucial Pro DDR4 32GB 3200MHz (2x16) — 282.35<br>shopflix: G.Skill Aegis Ddr4 3200Mhz F4-3200C16D-32Gis 32GB Kit (2x16) — 290.42<br>shopflix: Corsair Vengeance RGB Pro DDR4 32GB 3200MHz (2x16) — 354.26<br>shopflix: Corsair Vengeance DDR4 32GB 3200MHz (2x16) — 389.03<br>… +1 more |
| 20 | same part number filed under different specs (capacity, kit, speed, w… | DDR4 32GB (1×32GB) 3200MHz Desktop (103)<br>DDR4 32GB (2×16GB) 3200MHz Desktop (106) | part number F43200C16D32GIS | shopflix: G.Skill Aegis Ddr4 3200Mhz F4-3200C16D-32Gis 32GB Kit (2x16) — 290.42<br>snif: G.Skill Aegis F4-3200C16D-32GIS DDR4 3200MHz (2x16GB) — 140<br>eshop: G.SKILL F4-3200C16D-32GIS 32GB (2X16GB) DDR4 3200MHZ AEGIS DUAL KIT — 271.57 |

</details>

### Storage
| Kind | Check | By design | Confidence | Groups | Models | Listings | Root cause |
| --- | --- | --- | --- | --- | --- | --- | --- |
| duplicate | same words in a different order |  | high | 8 | 16 | 44 | hypothesis: sites write the name in a different word order; model keys keep the order (productKey). |
| duplicate | same name apart from filler/colour words (Gaming, Edition, Case, Black, White…) |  | medium | 17 | 35 | 65 | hypothesis: a filler or colour word survives the normalizer on one site only. |
| duplicate | same model name under different vendor names (needs review: some are different products) |  | low | 21 | 48 | 105 | hypothesis: vendor spelling (Alpenfoehn/Alpenfohn), rebrands (SilentiumPC/Endorfy, Natec/Genesis) or a wrong vendor on one site. |
| duplicate | Greek words left in the model name (e.g. Shopflix "Τριπλού Ανεμιστήρα 120mm", Greek capitals typed for Latin ones) |  | high | 0 | 0 | 0 | verified: productKey (src/lib/categories.tsx) / model_key (scraper/names.py) keep only [a-z0-9], so Greek words vanish but their "120mm" stays and changes the key; normalize_cooling.py does not cut Shopflix’s "Διπλού/Τριπλού Ανεμιστήρα 120mm" phrase, and normalize_case.py does not convert Greek capitals typed for Latin ones ("ΑΧ61") as normalize_mobo.py does. |
| duplicate | same part number in the titles of different models |  | medium | 118 | 237 | 276 | hypothesis: names cut differently per site (e-shop/Snif titles keep the part number or extra words, Skroutz/BestPrice drop them). |
| wrong-merge | title states another capacity than the model |  | high | 0 | 0 | 0 |  |
| wrong-merge | two capacities in one model (key collision: "2.4TB" and "24TB" both become "24tb") |  | high | 1 | 1 | 4 | verified: productKey (src/lib/categories.tsx) and model_key (scraper/names.py) drop the decimal point, so 2.4TB = 24TB, 1.2TB = 12TB, 1.6TB = 16TB. |
| wrong-merge | interface differs between listings (SATA vs SAS, SATA vs NVMe) |  | high | 43 | 43 | 209 | verified: the model is vendor + series + capacity (normalize_storage.py), so SATA and SAS versions of one HDD series (Exos, Ultrastar) share it. |
| wrong-merge | form factor differs between listings (M.2 vs U.2 / 2.5") |  | high | 30 | 30 | 112 |  |
| wrong-merge | PCIe generation differs between listings |  | medium | 22 | 22 | 83 |  |
| wrong-merge | RPM differs between listings (e.g. WD Purple 8TB 5400 and 7200 rpm) |  | high | 16 | 16 | 114 |  |
| wrong-merge | Skroutz card title names another product than its link (family cards) |  | medium | 36 | 36 | 36 | verified: scraper/sources/skroutz.py takes the title from the card link’s title attribute and the price from the JSON-LD entry of the linked variant; for family cards the two name different variants. |

- 2.4TB/24TB key collision (S1, summary item 6). SATA/SAS (S2): the builder leaves Server-tier drives out, so its exposure is the 8 offered models in the builder-impact table (section 3). Part-number duplicates (118 groups) are mostly names cut differently per site (WD "Black SN850X" vs "SN850X BLACK", "Seagate Exos E 7E10" vs "EXOS 7E10") and heatsink/no-heatsink variants filed together or apart (S3).

<details><summary>20 worst examples — Storage</summary>

| # | Check | Model key(s) (listings) | Why | Listings (source: title — €) |
| --- | --- | --- | --- | --- |
| 1 | interface differs between listings (SATA vs SAS, SATA vs NVMe) | seagateexos7e104tbhdd (13) | Server: SATA / SAS | eshop: HDD SEAGATE ST4000NM000B EXOS 7E10 ENTERPRISE 4TB 3.5'' SATA3 — 301.79<br>shopflix: HDD Σκληρός Δίσκος Seagate Exos 7E10 4TB 3.5" SATA III 7200rpm για NAS / Server / Καταγραφικό — 307.89<br>shopflix: HDD Σκληρός Δίσκος Seagate Exos 7E10 4TB 3.5" SATA III 7200rpm για NAS / Server / Καταγραφικό — 307.95<br>skroutz: Seagate Exos 7E10 4TB 3.5" 7200rpm ST4000NM000B — 311.73<br>… +4 more |
| 2 | RPM differs between listings (e.g. WD Purple 8TB 5400 and 7200 rpm) | westerndigitalpurple6tbhdd (13) | rpm: 5400 / 5700 | bestprice: Western Digital Purple 6TB HDD Σκληρός Δίσκος 3.5" Sata 3 5400rpm με 256MB Cache — 198.68<br>eshop: HDD WESTERN DIGITAL WD64PURZ PURPLE SURVEILLANCE 6TB 3.5" SATA3 — 280.86<br>skroutz: Western Digital Purple 3.5" 5400rpm — 304.89<br>shopflix: HDD Σκληρός Δίσκος Western Digital Purple 6TB 3.5" SATA III 5400rpm με 256MB Cache για Desktop — 313.96<br>… +4 more |
| 3 | form factor differs between listings (M.2 vs U.2 / 2.5") | samsungpm9a3960gbssd (8) | formFactor: M.2 2280 / U.2 | shopflix: SSD Samsung Pm9a3 960GB Blade PCI Express 4.0 Bulk — 779.51<br>skroutz: Samsung Pm9a3 960GB U.2 MZQL2960HCJR-00A07 — 779.54<br>bestprice: Samsung PM9A3 SSD 960GB U.2 PCI Express 4.0 — 834<br>skroutz: Samsung PM9A3 960GB M.2 — 876.78<br>… +4 more |
| 4 | two capacities in one model (key collision: "2.4TB" and "24TB" both b… | toshibaenterprise24tbhdd (4) |  | skroutz: Toshiba Enterprise Performance 2.4TB 3.5" 10000rpm AL15SEB24EQ — 690.9<br>shopflix: Toshiba Enterprise Performance 2.4TB HDD Σκληρός Δίσκος 3.5" SAS 3.0 10000rpm με 128MB Cache για Server — 737.08<br>skroutz: Toshiba Enterprise 24TB 3.5" 7200rpm MG11SCA24TE — 1316.17<br>shopflix: Toshiba Enterprise 24TB HDD Σκληρός Δίσκος 3.5" SAS 3.0 7200rpm για Desktop — 1478.1 |
| 5 | same words in a different order | westerndigitalblacksn850xheatsink1tbssd (6)<br>westerndigitalsn850xblackheatsink1tbssd (1) |  | bestprice: Western Digital Black SN850X With Heatsink SSD 1TB M.2 NVMe PCI Express 4.0 — 224.18<br>shopflix: Western Digital Black SN850X With Heatsink SSD Σκληρός Δίσκος 1TB M.2 NVMe PCI Express 4.0 — 249.48<br>skroutz: Western Digital Black SN850X With Heatsink M.2 WDST2XHE — 253.58<br>shopflix: Western Digital Black SN850X With Heatsink SSD Σκληρός Δίσκος 1TB M.2 NVMe PCI Express 4.0 — 295.31<br>… +3 more |
| 6 | PCIe generation differs between listings | lenovothinkpad512gbssd (7) | pcie: 3 / 4 | skroutz: Lenovo ThinkPad M.2 — 431.75<br>skroutz: Lenovo ThinkPad 512GB M.2 4XB0T83221 — 433.51<br>skroutz: Lenovo ThinkPad M.2 — 437.5<br>shopflix: Lenovo ThinkPad SSD Σκληρός Δίσκος 512GB M.2 NVMe PCI Express 3.0 — 556.9<br>… +3 more |
| 7 | Skroutz card title names another product than its link (family cards) | — | missing from slug: 20927dehd6g2l; filed as Dell 400-ATIN 600GB 2.5" | skroutz: Dell 600GB 2.5" 15000rpm 400-ATIN 209-27-DEHD6G2L — 182.26 |
| 8 | same part number in the titles of different models | seagateexos7e104tbhdd (13)<br>seagateexose7e104tbhdd (3) | part number ST4000NM001B | skroutz: Seagate Exos 7E10 4TB 3.5" 7200rpm ST4000NM001B — 370.72<br>shopflix: Seagate Exos 7E10 4TB HDD Σκληρός Δίσκος 3.5" SAS 3.0 7200rpm με 256MB Cache για NAS / Server / Καταγραφικό ST4000NM001B — 569.9<br>bestprice: Seagate Exos E 7E10 4TB HDD Σκληρός Δίσκος 3.5" SAS 3 7200rpm με 256MB Cache ST4000NM001B — 363 |
| 9 | same name apart from filler/colour words (Gaming, Edition, Case, Blac… | westerndigitalblacksn850x1tbssd (4)<br>westerndigitalsn850x1tbssd (2)<br>westerndigitalsn850xblack1tbssd (1) |  | skroutz: Western Digital Black SN850X W/o Heatsink 1TB M.2 WDS100T2X0E — 198.79<br>bestprice: Western Digital Black SN850X SSD 1TB M.2 NVMe PCI Express 4.0 — 205.8<br>shopflix: Western Digital Black SN850X W/o Heatsink SSD Σκληρός Δίσκος 1TB M.2 NVMe PCI Express 4.0 — 239.93<br>shopflix: Western Digital Black SN850X W/o Heatsink SSD Σκληρός Δίσκος 1TB M.2 NVMe PCI Express 4.0 — 245<br>… +3 more |
| 10 | same model name under different vendor names (needs review: some are … | axisenterprise4tbhdd (3)<br>hpenterprise4tbhdd (8)<br>seagateenterprise4tbhdd (1)<br>synologyenterprise4tbhdd (1)<br>toshibaenterprise4tbhdd (1) |  | skroutz: Axis Enterprise 4TB 3.5" 02471-001 — 1642.91<br>bestprice: Axis Enterprise 4TB HDD Σκληρός Δίσκος 3.5" Sata 3 — 1642.91<br>shopflix: Axis Enterprise 4TB HDD Σκληρός Δίσκος 3.5" SATA III για Server / Καταγραφικό 02471-001 — 1692.5<br>skroutz: HP Enterprise 4TB 3.5" 7200rpm 872487-B21 — 574.88<br>… +10 more |
| 11 | interface differs between listings (SATA vs SAS, SATA vs NVMe) | westerndigitalultrastardchc58022tbhdd (11) | Server: SATA / SAS | bestprice: Western Digital Ultrastar DC HC580 22TB HDD Σκληρός Δίσκος 3.5" SATA 3 7200rpm με 512MB Cache — 932.31<br>eshop: HDD WESTERN DIGITAL ULTRASTAR DC HC580 22TB 7200RPM 512CACHE DATA CENTER 3.5'' SATA 3 6GB/S 0F62785 — 956.22<br>bestprice: Western Digital Ultrastar DC HC580 22TB HDD Σκληρός Δίσκος 3.5" SAS 512rpm με 512MB Cache 0F62791 — 1062.64<br>eshop: HDD WESTERN DIGITAL ULTRASTAR DC HC580 22TB 7200RPM 512CACHE DATA CENTER 3.5'' SAS 12GB/S 0F62791 — 1067.81<br>… +4 more |
| 12 | RPM differs between listings (e.g. WD Purple 8TB 5400 and 7200 rpm) | westerndigitalpurple8tbhdd (12) | rpm: 5400 / 7200 | bestprice: Western Digital Purple 8TB HDD Σκληρός Δίσκος 3.5" SATA 3 5400rpm με 256MB Cache WD85PURZ — 372.05<br>eshop: HDD WESTERN DIGITAL WD85PURZ PURPLE SURVEILLANCE 8TB 3.5'' SATA3 — 382.93<br>skroutz: Western Digital Purple 3.5" 5400rpm — 393.86<br>shopflix: Western Digital Purple 8TB HDD Σκληρός Δίσκος 3.5" SATA III 5400rpm με 256MB Cache — 398.88<br>… +4 more |
| 13 | form factor differs between listings (M.2 vs U.2 / 2.5") | hpenterprise480gbssd (6) | formFactor: 2.5" / 3.5" | shopflix: SSD HP Enterprise 480GB 2.5'' SATA III — 1672.9<br>shopflix: SSD HP Enterprise 480GB 3.5'' SATA III — 1724.9<br>shopflix: SSD HP Enterprise 480GB 2.5'' SATA III — 1791.9<br>shopflix: SSD HP Enterprise 480GB 2.5'' SATA III — 1829.9<br>… +2 more |
| 14 | same words in a different order | samsung870evo500gbssd (5)<br>samsungevo870500gbssd (1) |  | bestprice: Samsung 870 Evo SSD 500GB 2.5" Sata 3 — 186.41<br>eshop: SSD SAMSUNG MZ-77E500B/EU 870 EVO SERIES 500GB 2.5'' SATA3 — 186.51<br>shopflix: Samsung 870 Evo SSD Σκληρός Δίσκος 500GB 2.5'' SATA III — 187.44<br>skroutz: Samsung 870 Evo 2.5'' — 189.05<br>… +2 more |
| 15 | PCIe generation differs between listings | corsairmp600elite1tbssd (6) | pcie: 3 / 4 | skroutz: Corsair MP600 Elite 1TB M.2 CSSD-F1000GBMP600EHS — 255.79<br>shopflix: Corsair MP600 Elite SSD Σκληρός Δίσκος 1TB M.2 NVMe PCI Express 3.0 — 255.79<br>bestprice: Corsair Force MP600 Elite SSD 1TB M.2 NVMe PCI Express 4.0 — 442.57<br>eshop: SSD CORSAIR MP600 ELITE 1TB NVME PCIE GEN4 X4 M.2 SSD CSSD-F1000GBMP600ENH — 503.96<br>… +2 more |
| 16 | Skroutz card title names another product than its link (family cards) | — | missing from slug: 695510b21; filed as HP Enterprise 4TB | skroutz: HP Enterprise 4TB 3.5" 7200rpm 695510-B21 — 582.78 |
| 17 | same part number in the titles of different models | crucialp3101tbssd (9)<br>crucialp310heatsink1tbssd (2) | part number CT1000P310SSD5 | skroutz: Crucial P310 Gen4 1TB M.2 CT1000P310SSD5 — 172.41<br>snif: Δίσκος SSD Crucial P310 1TB PCIe Gen4 NVMe 2280 M.2 with Heatsink CT1000P310SSD5 — 189 |
| 18 | same name apart from filler/colour words (Gaming, Edition, Case, Blac… | westerndigitalblacksn81004tbssd (2)<br>westerndigitalsn81004tbssd (3) |  | bestprice: Western Digital Black SN8100 SSD 4TB M.2 NVMe PCI Express 5.0 — 763.46<br>eshop: SSD WESTERN DIGITAL BLACK SN8100 4TB NVME PCI GEN5 X4 M.2 2280 WDS400T1X0M — 1067.04<br>skroutz: Western Digital SN8100 4TB M.2 WDS400T1X0M — 752.23<br>shopflix: SSD Σκληρός Δίσκος Western Digital SN8100 4TB M.2 NVMe PCI Express 5.0 — 854.04<br>… +1 more |
| 19 | same model name under different vendor names (needs review: some are … | axisenterprise8tbhdd (2)<br>hpenterprise8tbhdd (6)<br>synologyenterprise8tbhdd (3)<br>toshibaenterprise8tbhdd (2) |  | skroutz: Axis Enterprise 8TB 3.5" 7200rpm 02472-001 — 2458.66<br>shopflix: Axis Enterprise 8TB HDD Σκληρός Δίσκος 3.5" SATA III 7200rpm για Καταγραφικό 02472-001 — 2551.28<br>skroutz: HP Enterprise 8TB 3.5" 7200rpm 820032-001 — 574.96<br>skroutz: HP Enterprise 8TB 3.5" 7200rpm 819201-B21 — 577.48<br>… +9 more |
| 20 | interface differs between listings (SATA vs SAS, SATA vs NVMe) | seagateexosx2424tbhdd (10) | Server: SATA / SAS | bestprice: Seagate Exos X24 24TB HDD Σκληρός Δίσκος 3.5" SATA 3 7200rpm — 1068.05<br>eshop: HDD SEAGATE ST24000NM005H EXOS X24 24TB 512 CACHE 3.5'' SAS SED 12GB/S — 1119.53<br>eshop: HDD SEAGATE ST24000NM007H EXOS X24 24TB 3.5'' 512 CACHE SAS 12GB/S — 1136.16<br>eshop: HDD SEAGATE ST24000NM002H EXOS X24 24TB 512 CACHE 3.5'' SATA 6GB/S — 1147.4<br>… +4 more |

</details>

### PSU
| Kind | Check | By design | Confidence | Groups | Models | Listings | Root cause |
| --- | --- | --- | --- | --- | --- | --- | --- |
| duplicate | same part number in a spec model and its "spec not stated" twin (speed / efficiency missing on one listing) | yes | medium | 13 | 22 | 48 | verified: normalize_psu.py leaves the efficiency out of the chip when a title does not state it (Shopflix "Corsair RM1000e 1000W Μαύρο"). |
| wrong-merge | same part number filed under different form factors (Desktop/Laptop/Server or ATX/SFX) |  | medium | 10 | 20 | 30 | verified for LC300SFX: normalize_psu.py FORM needs "SFX" as a separate word, so "LC300SFX" stays ATX (the default); others: one site’s spec line says TFX/SFX, the rest default to ATX (hypothesis). |
| wrong-merge | same part number filed under different specs (capacity, kit, speed, watts or efficiency differ) |  | high | 24 | 37 | 77 | verified for Skroutz family cards: the title names one unit (e.g. "MSI MPG A1000GS") while the link/price is another (A1250GS, 1250W) and normalize_psu.py takes the watts from the title, else from the URL; some e-shop titles carry another unit’s part number (hypothesis: shop error). |
| wrong-merge | modularity differs between listings of one spec model | yes | medium | 47 | 47 | 3090 |  |
| duplicate | efficiency not stated: listings fall into a separate "<W>W" model | yes | medium | 55 | 55 | 781 |  |
| wrong-merge | Skroutz card title names another product than its link (family cards) |  | medium | 38 | 20 | 38 | verified: scraper/sources/skroutz.py takes the title from the card link’s title attribute and the price from the JSON-LD entry of the linked variant; for family cards the two name different variants. |

- Same part number under different watts/efficiency (S2): 24 groups — mostly Skroutz family cards (title of one unit, watts of the linked one) and e-shop titles carrying another unit's part number. Under different form factors (S2): 10 groups — e.g. "LC-Power LC300SFX" filed as ATX because "SFX" is inside the part number; the builder offers only ATX units, so an SFX unit can be offered as ATX.

<details><summary>20 worst examples — PSU</summary>

| # | Check | Model key(s) (listings) | Why | Listings (source: title — €) |
| --- | --- | --- | --- | --- |
| 1 | same part number filed under different specs (capacity, kit, speed, w… | 650W Bronze ATX (190)<br>850W Gold ATX (408) | part number PRO850G | skroutz: ASRock Pro-850G Full Wired — 46.5<br>bestprice: Asrock Pro-850G 850W — 84.28<br>shopflix: ASRock Pro-850G 850W Μαύρο — 100.92 |
| 2 | Skroutz card title names another product than its link (family cards) | — | missing from slug: eg1200; filed as 1000W Gold | skroutz: Lian Li EG1200 Full Modular 80 Plus Gold — 146.13 |
| 3 | same part number filed under different form factors (Desktop/Laptop/S… | 1000W Platinum ATX (103)<br>1000W Platinum SFX (18) | part number TPFX1000 | shopflix: Thermalright TPFX-1000 1000W Μαύρο — 164.35<br>skroutz: Thermalright TPFX-1000 1000W Full Modular 80 Plus Platinum — 155 |
| 4 | same part number filed under different specs (capacity, kit, speed, w… | 650W Gold ATX (123)<br>850W Gold ATX (408) | part number A850GLS | skroutz: MSI MAG A850GLS PCIE5 Full Modular 80 Plus Gold — 122.58<br>bestprice: MSI MAG A850GLS 850W — 149.72<br>shopflix: MSI MAG A850GLS PCIE5 850W Μαύρο Full Modular — 165.33 |
| 5 | Skroutz card title names another product than its link (family cards) | — | missing from slug: a1200pls; filed as 1000W Platinum | skroutz: MSI MAG A1200PLS PCIE5 Full Modular 80 Plus Platinum — 238.17 |
| 6 | same part number filed under different form factors (Desktop/Laptop/S… | 850W Platinum ATX (82)<br>850W Platinum SFX (20) | part number SP0850P | eshop: LIAN LI SP0850P BLACK - 850W 80+ PLATINUM PSU - 10 YEARS WARRANTY - 12V-2X6 - JAPANESE CAPACITORS — 139.76<br>eshop: LIAN LI SP0850P WHITE - 850W 80+ PLATINUM PSU - 10 YEARS WARRANTY - 12V-2X6 - JAPANESE CAPACITORS — 141.46<br>snif: Lian Li SP0850P 80 Plus Platinum 850W Black G9P.SP0850P.B000.EU — 153.7<br>snif: Lian Li SP0850P 80 Plus Platinum 850W White G9P.SP0850P.W000.EU — 157.5<br>… +2 more |
| 7 | same part number filed under different specs (capacity, kit, speed, w… | 650W Gold ATX (123)<br>750W Gold ATX (364) | part number CP9020325EU | eshop: CORSAIR CX650 650W ATX 3.1 LOW-NOISE CYBENETICS GOLD BLACK CP-9020325-EU — 65.9<br>eshop: CORSAIR CX750 750W ATX 3.1 LOW-NOISE CYBENETICS GOLD BLACK CP-9020325-EU — 71.9 |
| 8 | Skroutz card title names another product than its link (family cards) | — | missing from slug: a1000gs; filed as 1250W Gold | skroutz: MSI MPG A1000GS PCIE5 Full Modular 80 Plus Gold — 229.97 |
| 9 | same part number filed under different form factors (Desktop/Laptop/S… | 400W ATX (32)<br>400W Bronze TFX (1) | part number GPF400P | skroutz: Chieftec Smart Series GPF-400P 400W Full Wired — 42.91<br>shopflix: Chieftec Smart Series GPF-400P 400W Γκρι Full Wired — 56.17<br>bestprice: Chieftec GPF-400P 400W — 49.88 |
| 10 | same part number filed under different specs (capacity, kit, speed, w… | 1300W Gold ATX (8)<br>850W Gold ATX (408) | part number PG1300G | bestprice: Asrock Phantom Gaming PG-1300G 1300W — 157.55<br>shopflix: ASRock Phantom Gaming PG-1300G 1300W Μαύρο — 202.31<br>skroutz: ASRock Phantom Gaming PG-1300G Full Modular 80 Plus Gold — 117.84 |
| 11 | Skroutz card title names another product than its link (family cards) | — | missing from slug: gpf350p; filed as 300W Bronze | skroutz: Chieftec GPF-350P Full Wired 80 Plus Bronze — 38.42 |
| 12 | same part number filed under different form factors (Desktop/Laptop/S… | 300W ATX (13)<br>300W SFX (6) | part number LC300SFX | shopflix: LC-Power LC300SFX 300W Full Wired — 48.58<br>snif: 300w Lc-power Lc300sfx V3.21 — 85.51<br>skroutz: LC-Power LC300SFX 300W Full Wired — 48.58 |
| 13 | same part number filed under different specs (capacity, kit, speed, w… | 1000W Gold ATX (253)<br>1000W Platinum ATX (103) | part number A1000PL | bestprice: MSI Pro A1000PL 1000W — 301.42<br>skroutz: MSI PRO A1000PL PCIE5 1000W Full Modular 80 Plus Platinum — 119<br>shopflix: MSI PRO A1000PL PCIE5 1000W Μαύρο — 243.9 |
| 14 | Skroutz card title names another product than its link (family cards) | — | missing from slug: a500nh; filed as 300W Standard | skroutz: MSI Mag A500N-H Full Wired 80 Plus Standard — 27.07 |
| 15 | same part number filed under different form factors (Desktop/Laptop/S… | 300W ATX (13)<br>300W TFX (4) | part number AKT1300 | shopflix: Akyga 300W Μαύρο Full Wired (AK-T1-300) — 47.9<br>bestprice: Akyga AK-T1-300 300W — 36<br>skroutz: Akyga 300W Full Wired (AK-T1-300) — 43.49 |
| 16 | same part number filed under different specs (capacity, kit, speed, w… | 550W Bronze ATX (110)<br>650W Bronze ATX (190) | part number A650BNL | skroutz: MSI MAG A650BNL Full Wired 80 Plus Bronze — 44.89<br>bestprice: MSI MAG A650BNL 650W — 59.1<br>bestprice: MSI A650BNL White 650W — 69.99<br>shopflix: MSI MAG A650BNL 650W Μαύρο Full Wired 80 Plus Bronze — 79.67<br>… +1 more |
| 17 | Skroutz card title names another product than its link (family cards) | — | missing from slug: akb1500; filed as 420W | skroutz: Akyga AK-B1-500 Full Wired — 20.95 |
| 18 | same part number filed under different form factors (Desktop/Laptop/S… | 300W Bronze ATX (7)<br>300W Bronze TFX (9) | part number GPF300P | shopflix: Chieftec 300W Full Wired 80 Plus Bronze GPF-300P — 45.07<br>shopflix: Chieftec 300W Γκρι Full Wired 80 Plus Bronze (GPF-300P) — 57.9<br>bestprice: Chieftec GPF-300P 300W — 35.41 |
| 19 | same part number filed under different specs (capacity, kit, speed, w… | 1000W Gold ATX (253)<br>1250W Gold ATX (22) | part number A1000GS | bestprice: MSI MPG A1000GS 1000W — 131.54<br>shopflix: MSI MPG A1000GS PCIE5 1000W Μαύρο Full Modular 80 Plus Gold — 131.6<br>eshop: MSI MPG A1000GS 1000W PCIE5 80+ GOLD — 211.9<br>skroutz: MSI MPG A1000GS PCIE5 Full Modular 80 Plus Gold — 229.97 |
| 20 | Skroutz card title names another product than its link (family cards) | — | missing from slug: pb500; filed as 450W Bronze | skroutz: Gigabyte PB500 Full Wired 80 Plus Bronze — 36.23 |

</details>

### Cases
| Kind | Check | By design | Confidence | Groups | Models | Listings | Root cause |
| --- | --- | --- | --- | --- | --- | --- | --- |
| duplicate | same words in a different order |  | high | 10 | 20 | 50 | hypothesis: sites write the name in a different word order; model keys keep the order (productKey). |
| duplicate | same name apart from filler/colour words (Gaming, Edition, Case, Black, White…) |  | medium | 57 | 116 | 306 | hypothesis: a filler or colour word survives the normalizer on one site only. |
| duplicate | same model name under different vendor names (needs review: some are different products) |  | low | 7 | 14 | 45 | hypothesis: vendor spelling (Alpenfoehn/Alpenfohn), rebrands (SilentiumPC/Endorfy, Natec/Genesis) or a wrong vendor on one site. |
| duplicate | Greek words left in the model name (e.g. Shopflix "Τριπλού Ανεμιστήρα 120mm", Greek capitals typed for Latin ones) |  | high | 8 | 8 | 12 | verified: productKey (src/lib/categories.tsx) / model_key (scraper/names.py) keep only [a-z0-9], so Greek words vanish but their "120mm" stays and changes the key; normalize_cooling.py does not cut Shopflix’s "Διπλού/Τριπλού Ανεμιστήρα 120mm" phrase, and normalize_case.py does not convert Greek capitals typed for Latin ones ("ΑΧ61") as normalize_mobo.py does. |
| duplicate | same part number in the titles of different models |  | medium | 9 | 18 | 26 | hypothesis: names cut differently per site (e-shop/Snif titles keep the part number or extra words, Skroutz/BestPrice drop them). |
| wrong-merge | case size differs between listings (sites label it differently) |  | medium | 129 | 129 | 692 |  |
| wrong-merge | largest board differs between listings |  | medium | 40 | 40 | 262 |  |
| wrong-merge | product pages (spec cache) disagree on the largest board |  | medium | 4 | 4 | 21 |  |
| wrong-merge | Skroutz card title names another product than its link (family cards) |  | medium | 0 | 0 | 0 | verified: scraper/sources/skroutz.py takes the title from the card link’s title attribute and the price from the JSON-LD entry of the linked variant; for family cards the two name different variants. |

- Size label disagreements (129 models, S3) and largest-board disagreements (40 models; 19 where the builder uses the smaller value, S2). Filler-word duplicates (57 groups) include the ATX/Midi/"The"/e-shop-category leftovers ("Darkflash DS900WS ATX ΠΕΡΙΠΤΩΣΗ ΥΠΟΛΟΓΙΣΤΗ…", "Thermaltake Tower 300" vs "The Tower 300").

<details><summary>20 worst examples — Cases</summary>

| # | Check | Model key(s) (listings) | Why | Listings (source: title — €) |
| --- | --- | --- | --- | --- |
| 1 | same words in a different order | asusap201prime (2)<br>asusprimeap201 (8) |  | eshop: ASUS AP201 PRIME CASE TG GAMING MINI TOWER BLACK — 82.95<br>snif: ASUS AP201 Prime - Μαύρο — 92.73<br>bestprice: Asus Prime AP201 Black Gaming Micro Tower — 70.16<br>bestprice: Asus Prime AP201 Tempered Glass Black Gaming Micro Tower — 75.6<br>… +6 more |
| 2 | Greek words left in the model name (e.g. Shopflix "Τριπλού Ανεμιστήρα… | darkflashleo (5) | Greek words in the name (no twin found) | eshop: DARKFLASH ΚΟΥΤΙ ΥΠΟΛΟΓΙΣΤΗ LEO (ΜΑΥΡΟ) — 27.83<br>skroutz: Darkflash LEO Gaming Midi Tower με Πλαϊνό Παράθυρο — 28.97<br>bestprice: Darkflash Leo Black Gaming Midi Tower με Πλαϊνό Παράθυρο — 28.97<br>snif: darkFlash Leo — 32.9<br>… +1 more |
| 3 | case size differs between listings (sites label it differently) | fractaldesignpopair (19) | size: Midi Tower / Mini Tower | bestprice: Fractal Design Pop Air TG Black Midi Tower RGB με Πλαϊνό Παράθυρο — 79.33<br>bestprice: Fractal Design Pop Air Black Midi Tower RGB — 82.26<br>skroutz: Fractal Design Pop Air Gaming Mini Tower με Πλαϊνό Παράθυρο — 88.33<br>shopflix: Fractal Design Pop Air Gaming Mini Tower με Πλαϊνό Παράθυρο Black TG Clear Tint — 92.84<br>… +4 more |
| 4 | largest board differs between listings | thermaltakethetower300 (29) | maxBoard: Micro ATX / Mini ITX / ATX | skroutz: Thermaltake The Tower 300 Gaming Micro Tower με Πλαϊνό Παράθυρο — 130.39<br>bestprice: Thermaltake The Tower 300 Black Micro Tower με Πλαϊνό Παράθυρο — 138.67<br>bestprice: Thermaltake The Tower 300 Limestone Micro Tower με Πλαϊνό Παράθυρο — 143.35<br>bestprice: Thermaltake The Tower 300 White Micro Tower με Πλαϊνό Παράθυρο — 150.69<br>… +4 more |
| 5 | product pages (spec cache) disagree on the largest board | darkflashc275p (6) | eshop:- skroutz:Mini ITX eshop:- bestprice:Micro ATX bestprice:- shopflix:- | eshop: DARKFLASH C275P COMPUTER CASE WITHOUT FANS (WHITE) — 26.6<br>skroutz: Darkflash C275P Midi Tower — 27<br>eshop: DARKFLASH C275P COMPUTER CASE WITHOUT FANS (BLACK) — 27<br>bestprice: Darkflash C275P Black Micro Tower με Πλαϊνό Παράθυρο — 32.55<br>… +2 more |
| 6 | same name apart from filler/colour words (Gaming, Edition, Case, Blac… | thermaltakethetower300 (29)<br>thermaltaketower300 (1) |  | skroutz: Thermaltake The Tower 300 Gaming Micro Tower με Πλαϊνό Παράθυρο — 130.39<br>bestprice: Thermaltake The Tower 300 Black Micro Tower με Πλαϊνό Παράθυρο — 138.67<br>bestprice: Thermaltake The Tower 300 Limestone Micro Tower με Πλαϊνό Παράθυρο — 143.35<br>bestprice: Thermaltake The Tower 300 White Micro Tower με Πλαϊνό Παράθυρο — 150.69<br>… +5 more |
| 7 | same part number in the titles of different models | armaggeddonfullatx (4)<br>armaggeddonultro2spyder (5) | part number ULTRO2SPYDER | eshop: ARMAGGEDDON FULL ATX GAMING PC CASE ULTRO 2 SPYDER ULTRO2-SPYDER — 299<br>skroutz: Armaggeddon ULTRO2-SPYDER Gaming Full Tower με Πλαϊνό Παράθυρο — 314.76<br>shopflix: Armaggeddon ULTRO2-SPYDER Gaming Full Tower με Πλαϊνό Παράθυρο Μαύρο — 319.29 |
| 8 | same model name under different vendor names (needs review: some are … | montechair100 (5)<br>silentwareair100 (5) |  | bestprice: Montech Air 100 ARGB White Gaming Mini Tower RGB με Πλαϊνό Παράθυρο — 48.49<br>bestprice: Montech Air 100 ARGB Black Gaming Mini Tower RGB με Πλαϊνό Παράθυρο — 51<br>shopflix: Montech AIR 100 ARGB Gaming Mini Tower με Πλαϊνό Παράθυρο Μαύρο — 60.1<br>shopflix: Montech AIR 100 ARGB Gaming Mini Tower με Πλαϊνό Παράθυρο Λευκό — 69.32<br>… +6 more |
| 9 | same words in a different order | nzxth52024flow (1)<br>nzxth5flow2024 (8) |  | skroutz: NZXT H5 (2024) Flow Gaming Midi Tower με Πλαϊνό Παράθυρο — 117.8<br>bestprice: NZXT H5 Flow 2024 Black Midi Tower με Πλαϊνό Παράθυρο — 70.31<br>eshop: NZXT H5 FLOW 2024 MIDI TOWER WHITE WINDOW CC-H52FW-01 — 79.9<br>bestprice: NZXT H5 Flow 2024 White Gaming Midi Tower RGB με Πλαϊνό Παράθυρο — 80.65<br>… +5 more |
| 10 | Greek words left in the model name (e.g. Shopflix "Τριπλού Ανεμιστήρα… | antec61elite (1) | Greek words in the name (no twin found) | bestprice: Antec ΑΧ61 Elite Black Midi Tower RGB με Πλαϊνό Παράθυρο — 77.9 |
| 11 | case size differs between listings (sites label it differently) | asusproartpa602 (17) | size: Midi Tower / Full Tower | bestprice: Asus ProArt PA602 Metal Panel Wood Edition Black Midi Tower — 199.9<br>bestprice: Asus ProArt PA602 Window Wood Edition Black Gaming Midi Tower με Πλαϊνό Παράθυρο — 218.73<br>bestprice: Asus ProArt PA602 Gaming Midi Tower με Πλαϊνό Παράθυρο — 228.12<br>shopflix: Asus ProArt PA602 Gaming Midi Tower με Πλαϊνό Παράθυρο Μαύρο — 241.81<br>… +4 more |
| 12 | largest board differs between listings | fractaldesignpopair (19) | maxBoard: ATX / Micro ATX | bestprice: Fractal Design Pop Air TG Black Midi Tower RGB με Πλαϊνό Παράθυρο — 79.33<br>bestprice: Fractal Design Pop Air Black Midi Tower RGB — 82.26<br>skroutz: Fractal Design Pop Air Gaming Mini Tower με Πλαϊνό Παράθυρο — 88.33<br>shopflix: Fractal Design Pop Air Gaming Mini Tower με Πλαϊνό Παράθυρο Black TG Clear Tint — 92.84<br>… +4 more |
| 13 | product pages (spec cache) disagree on the largest board | chieftecscorpioniii (5) | bestprice:E-ATX bestprice:- skroutz:ATX bestprice:- skroutz:- | bestprice: Chieftec Scorpion III White Gaming Midi Tower με Πλαϊνό Παράθυρο — 94.45<br>bestprice: Chieftec Scorpion III Gaming Midi Tower με Πλαϊνό Παράθυρο — 115.02<br>skroutz: Chieftec Scorpion III Gaming Midi Tower με Πλαϊνό Παράθυρο — 115.22<br>bestprice: Chieftec Scorpion III Black Gaming Midi Tower RGB με Πλαϊνό Παράθυρο — 117.97<br>… +1 more |
| 14 | same name apart from filler/colour words (Gaming, Edition, Case, Blac… | darkflashds900wd (11)<br>darkflashds900wdatx (2) |  | bestprice: Darkflash DS900WD White Midi Tower με Πλαϊνό Παράθυρο — 59.52<br>bestprice: Darkflash DS900WD Black Midi Tower με Πλαϊνό Παράθυρο — 59.52<br>bestprice: Darkflash DS900WD with Fans Black Midi Tower με Πλαϊνό Παράθυρο — 61.5<br>shopflix: Darkflash DS900WD Midi Tower Μαύρο + 4 ανεμιστήρες DS900WD — 61.72<br>… +6 more |
| 15 | same part number in the titles of different models | armaggeddonmicroatx (4)<br>armaggeddondfduplex2chrw (2) | part number DFDUPLEX2CHRW | eshop: ARMAGGEDDON MICRO ATX CASE WITH 3X CHROMA FANS DEEPFREEZE DUPLEX 2 CHROMA WHITE DF-DUPLEX2-CHRW — 55.9<br>shopflix: Armaggeddon DF-DUPLEX2-CHRW Gaming Micro Tower με Πλαϊνό Παράθυρο Λευκό — 49.5<br>skroutz: Armaggeddon DF-DUPLEX2-CHRW Gaming Micro Tower με Πλαϊνό Παράθυρο — 49.55 |
| 16 | same model name under different vendor names (needs review: some are … | antecp30air (4)<br>zalmanp30air (5) |  | shopflix: Antec P30 AIR Gaming Midi Tower με Πλαϊνό Παράθυρο Μαύρο — 81.02<br>bestprice: Antec P30 Air Black Midi Tower με Πλαϊνό Παράθυρο — 81.02<br>skroutz: Antec P30 AIR Gaming Midi Tower με Πλαϊνό Παράθυρο — 101.07<br>skroutz: Antec P30 AIR Gaming Midi Tower με Πλαϊνό Παράθυρο — 101.07<br>… +5 more |
| 17 | same words in a different order | corsair4500xframersr (2)<br>corsairframe4500xrsr (5) |  | bestprice: Corsair 4500X Frame RS-R Black Gaming Midi Tower RGB με Πλαϊνό Παράθυρο — 169.9<br>bestprice: Corsair 4500X Frame RS-R White Gaming Midi Tower RGB με Πλαϊνό Παράθυρο — 171.5<br>skroutz: Corsair Frame 4500X RS-R ARGB Gaming Midi Tower με Πλαϊνό Παράθυρο — 171.9<br>shopflix: Corsair Frame 4500X RS-R ARGB Gaming Midi Tower με Πλαϊνό Παράθυρο Μαύρο — 172.4<br>… +3 more |
| 18 | Greek words left in the model name (e.g. Shopflix "Τριπλού Ανεμιστήρα… | antec90 (1) | Greek words in the name (no twin found) | bestprice: Antec ΑΧ90 Black Gaming Midi Tower RGB με Πλαϊνό Παράθυρο — 89.9 |
| 19 | case size differs between listings (sites label it differently) | adatainvaderx (13) | size: Midi Tower / Full Tower | bestprice: Adata Invader X White Gaming Midi Tower με Πλαϊνό Παράθυρο — 58.78<br>skroutz: Adata Invader X Gaming Midi Tower με Πλαϊνό Παράθυρο — 65.53<br>skroutz: Adata Invader X Gaming Midi Tower με Πλαϊνό Παράθυρο — 69.81<br>shopflix: Adata Invader X Midi Tower με Πλαϊνό Παράθυρο Μαύρο — 76.9<br>… +4 more |
| 20 | largest board differs between listings | nzxth9flow (16) | maxBoard: E-ATX / ATX | shopflix: NZXT H9 Flow Midi Tower με Πλαϊνό Παράθυρο Μαύρο — 135.87<br>shopflix: NZXT H9 Flow Gaming Midi Tower με Πλαϊνό Παράθυρο Λευκό — 142.46<br>bestprice: NZXT H9 Flow RGB Black Gaming Midi Tower RGB με Πλαϊνό Παράθυρο — 151.48<br>skroutz: NZXT H9 Flow Gaming Midi Tower με Πλαϊνό Παράθυρο — 152.9<br>… +4 more |

</details>

### Fans
| Kind | Check | By design | Confidence | Groups | Models | Listings | Root cause |
| --- | --- | --- | --- | --- | --- | --- | --- |
| duplicate | same words in a different order |  | high | 7 | 14 | 30 | hypothesis: sites write the name in a different word order; model keys keep the order (productKey). |
| duplicate | same name apart from filler/colour words (Gaming, Edition, Case, Black, White…) |  | medium | 27 | 54 | 104 | hypothesis: a filler or colour word survives the normalizer on one site only. |
| duplicate | same model name under different vendor names (needs review: some are different products) |  | low | 8 | 16 | 43 | hypothesis: vendor spelling (Alpenfoehn/Alpenfohn), rebrands (SilentiumPC/Endorfy, Natec/Genesis) or a wrong vendor on one site. |
| duplicate | Greek words left in the model name (e.g. Shopflix "Τριπλού Ανεμιστήρα 120mm", Greek capitals typed for Latin ones) |  | high | 11 | 11 | 12 | verified: productKey (src/lib/categories.tsx) / model_key (scraper/names.py) keep only [a-z0-9], so Greek words vanish but their "120mm" stays and changes the key; normalize_cooling.py does not cut Shopflix’s "Διπλού/Τριπλού Ανεμιστήρα 120mm" phrase, and normalize_case.py does not convert Greek capitals typed for Latin ones ("ΑΧ61") as normalize_mobo.py does. |
| duplicate | same part number in the titles of different models |  | medium | 8 | 16 | 16 | hypothesis: names cut differently per site (e-shop/Snif titles keep the part number or extra words, Skroutz/BestPrice drop them). |
| wrong-merge | title states another pack size than the model ("3in1", "Twin Pack", "2 X 140MM") |  | high | 19 | 19 | 21 | verified: normalize_cooling.py PACK reads "3τμχ"/"tmch", "pcs", "-Pack", "x Fans" and Dual/Triple; "3IN1", "Twin Pack" and "2 X 140MM" are not read, and a title that states two counts ("Triple Pack … 2τμχ") keeps the first match. |
| wrong-merge | 3-pin and 4-pin PWM listings in one model |  | medium | 45 | 45 | 211 | verified: normalize_cooling.py FAN_CUT ends the name at the size ("140mm") or "με", so words after it ("PWM", "High-Speed") never reach the key and the 3-pin and PWM versions of a series share a model; some hits are one site stating "3-Pin" for a PWM fan (hypothesis). |
| wrong-merge | Skroutz card title names another product than its link (family cards) |  | medium | 2 | 2 | 2 | verified: scraper/sources/skroutz.py takes the title from the card link’s title attribute and the price from the JSON-LD entry of the linked variant; for family cards the two name different variants. |

- Pack size wrong (S2): 19 models / 21 listings ("3IN1", "Twin Pack", "2 X 140MM" read as 1) — wrong €/fan and a wrong count in the fan-position check (rule 21). 3-pin and PWM versions in one model (S3): 45 models.

<details><summary>20 worst examples — Fans</summary>

| # | Check | Model key(s) (listings) | Why | Listings (source: title — €) |
| --- | --- | --- | --- | --- |
| 1 | title states another pack size than the model ("3in1", "Twin Pack", "… | nzxtf140140mm (12) | title pack | snif: NZXT F140 RGB 140mm Twin Pack White RF-R14DF-W1 — 70<br>snif: NZXT F140 RGB 140mm Twin Pack Black RF-R14DF-B1 — 75 |
| 2 | same words in a different order | bequietsilentwingspro4120mm (5)<br>bequietsilentwings4pro120mm (2) |  | bestprice: Be Quiet Silent Wings Pro 4 Case Fan 120mm με Σύνδεση 4-Pin PWM — 27.88<br>eshop: BE QUIET! FAN SILENT WINGS PRO 4 120MM PWM BL098 30 — 29.65<br>bestprice: Be Quiet Silent Wings Pro 4 Case Fan 120mm με Σύνδεση 4-Pin PWM White — 31.38<br>snif: Be Quiet! Silent Wings Pro 4 120mm PWM Black BL098 — 33.7<br>… +3 more |
| 3 | Greek words left in the model name (e.g. Shopflix "Τριπλού Ανεμιστήρα… | lianliunifanslreverselcd120mm (2) | Greek words in the name (no twin found) | shopflix: Lian Li Unifan SL Reverse Ασύρματο LCD Οθόνη 120mm Μαύρο — 33.48<br>shopflix: Lian Li Unifan SL Reverse Ασύρματο LCD Οθόνη 120mm Λευκό — 67.9 |
| 4 | 3-pin and 4-pin PWM listings in one model | bequietpurewings3140mm (14) | connector: 4-pin PWM / 3-pin | skroutz: Be Quiet Pure Wings 3 Case Fan 140mm — 10.5<br>bestprice: Be Quiet Pure Wings 3 Case Fan 140mm με Σύνδεση 4-Pin PWM — 11.26<br>eshop: BE QUIET PURE WINGS 3 140MM PWM HIGH-SPEED WHITE — 11.38<br>eshop: BE QUIET PURE WINGS 3 140MM PWM HIGH-SPEED 4PIN BL109 — 11.61<br>… +4 more |
| 5 | Skroutz card title names another product than its link (family cards) | — | missing from slug: rgb140; filed as NZXT Aer RGB140 140mm ×2 | skroutz: NZXT Aer RGB140 Triple Pack Case Fan 2τμχ — 76.93 |
| 6 | same name apart from filler/colour words (Gaming, Edition, Case, Blac… | thermaltakect120120mm2 (15)<br>thermaltakect120pc120mm2 (1) |  | bestprice: Thermaltake CT120 Case Fan 120mm με Σύνδεση 4-Pin PWM 2τμχ White — 18.05<br>bestprice: Thermaltake CT120 Case Fan 120mm με Σύνδεση 4-Pin PWM 2τμχ — 19.04<br>bestprice: Thermaltake CT120 Case Fan 120mm ARGB με Σύνδεση 3-Pin 4-Pin PWM 2τμχ Black — 20.41<br>bestprice: Thermaltake CT120 Case Fan 120mm ARGB με Σύνδεση 3-Pin 4-Pin PWM 2τμχ White — 23.76<br>… +5 more |
| 7 | same part number in the titles of different models | nzxtf140duo140mm (9)<br>nzxtrfd14sfb1f140duo140mm (1) | part number RFD14SFB1 | snif: NZXT F140 RGB Duo 140mm Black RF-D14SF-B1 — 24.35<br>eshop: NZXT RF-D14SF-B1 FAN F140 RGB DUO BLACK — 21.5 |
| 8 | same model name under different vendor names (needs review: some are … | marvofn10120mm (6)<br>scorpionfn10120mm (2) |  | bestprice: Marvo FN10 Case Fan 120mm με Σύνδεση 3-Pin 4-Pin PWM Green — 4.91<br>shopflix: Marvo FN10 120mm με Πράσινο LED & Σύνδεση 3-Pin/4-Pin Molex 1τμχ Πράσινο — 5.16<br>bestprice: Marvo FN10 Case Fan 120mm με Σύνδεση 3-Pin 4-Pin PWM Red — 6.5<br>bestprice: Marvo FN10 Case Fan 120mm με Σύνδεση 3-Pin 4-Pin PWM Blue — 6.9<br>… +4 more |
| 9 | title states another pack size than the model ("3in1", "Twin Pack", "… | corsairml140pro140mm (4) | title pack | eshop: CORSAIR ML140 PRO RGB LED 140MM PWM PREMIUM MAGNETIC LEVITATION FAN TWIN PACK WITH LIGHTING NODE PRO — 80.9 |
| 10 | same words in a different order | bequietsilentwingspro4140mm (5)<br>bequietsilentwings4pro140mm (2) |  | bestprice: Be Quiet Silent Wings Pro 4 Case Fan 140mm με Σύνδεση 4-Pin PWM White — 27.84<br>bestprice: Be Quiet Silent Wings Pro 4 Case Fan 140mm με Σύνδεση 4-Pin PWM — 30.42<br>eshop: BE QUIET! FAN SILENT WINGS PRO 4 140MM PWM BL099 24 — 32.26<br>snif: Be Quiet! Silent Wings Pro 4 140mm PWM Black BL099 — 33.8<br>… +3 more |
| 11 | Greek words left in the model name (e.g. Shopflix "Τριπλού Ανεμιστήρα… | coolermastersickleflowedge120cooling120mm (1) | Greek words in the name (no twin found) | eshop: COOLER MASTER SICKLEFLOW EDGE 120ΜΜ COOLING FAN ARGB WHITE — 12.9 |
| 12 | 3-pin and 4-pin PWM listings in one model | bequietsilentwings4140mm (10) | connector: 4-pin PWM / 3-pin | bestprice: Be Quiet Silent Wings 4 Case Fan 140mm με Σύνδεση 4-Pin PWM — 22.22<br>eshop: BE QUIET! FAN SILENT WINGS 4 140MM PWM HIGH-SPEED BL — 22.91<br>bestprice: Be Quiet Silent Wings 4 Case Fan 140mm με Σύνδεση 4-Pin PWM White — 23.27<br>eshop: BE QUIET! FAN SILENT WINGS 4 140MM PWM BL096 1100RP — 23.29<br>… +4 more |
| 13 | Skroutz card title names another product than its link (family cards) | — | missing from slug: rfu36; filed as NZXT RFU36 360mm | skroutz: NZXT RFU36 Case Fan 360mm — 60.29 |
| 14 | same name apart from filler/colour words (Gaming, Edition, Case, Blac… | bequietcoolerpurewings3120mm (2)<br>bequietpurewings3120mm (10) |  | shopflix: Be Quiet Cooler Pure Wings 3 120mm με Σύνδεση 4-Pin PWM — 10.5<br>skroutz: Be Quiet Cooler Pure Wings 3 Case Fan 120mm — 11.12<br>bestprice: Be Quiet Pure Wings 3 Case Fan 120mm με Σύνδεση 4-Pin PWM BL105 — 10.07<br>bestprice: Be Quiet Pure Wings 3 Case Fan 120mm με Σύνδεση 4-Pin PWM White — 10.3<br>… +6 more |
| 15 | same part number in the titles of different models | arcticp14140mm (5)<br>arcticp14pwmpst0db140mm (4) | part number ACFAN00239A | snif: Arctic P14 ARGB 140mm PWM PST Black ACFAN00239A — 10.95<br>shopflix: Arctic P14 PWM PST A-RGB 0dB 140mm με Σύνδεση 4-Pin (ACFAN00239A) — 35.9 |
| 16 | same model name under different vendor names (needs review: some are … | antecp12120mm (4)<br>arcticp12120mm (3) |  | skroutz: Antec P12 Case Fan 120mm — 11.9<br>bestprice: Antec P12 Case Fan 120mm ARGB με Σύνδεση 3-Pin 4-Pin PWM Black — 11.9<br>snif: Antec P12 120mm ARGB PWM Reverse Black — 11.9<br>shopflix: Antec P12 120mm με ARGB Φωτισμό & Σύνδεση 3-Pin / 4-Pin PWM — 11.9<br>… +3 more |
| 17 | title states another pack size than the model ("3in1", "Twin Pack", "… | lianliunislinfflex120mm (4) | title pack | bestprice: Lian Li UNI FAN SL-INF Flex Case Fan 120mm White 3 Τεμάχια — 90.3 |
| 18 | same words in a different order | lianliunitlwirelesslcd120mm3 (2)<br>lianliunitllcdwireless120mm3 (2) |  | shopflix: Lian Li UNI FAN TL Wireless LCD 120mm με ARGB Φωτισμό 3τμχ Λευκό — 121.4<br>skroutz: Lian Li UNI FAN TL Wireless LCD Case Fan 120mm — 125.26<br>bestprice: Lian Li Uni Fan TL LCD Wireless Case Fan 120mm ARGB με Σύνδεση 4-Pin PWM 9-Pin (USB 2.0) 3τμχ White — 124.51<br>bestprice: Lian Li Uni Fan TL LCD Wireless Case Fan 120mm ARGB με Σύνδεση 4-Pin PWM 9-Pin (USB 2.0) 3τμχ Black — 126 |
| 19 | Greek words left in the model name (e.g. Shopflix "Τριπλού Ανεμιστήρα… | darkflashpcd1120x120120mm (1) | Greek words in the name (no twin found) | eshop: DARKFLASH ΑΝΕΜΙΣΤΗΡΑΣ PC D1 LED 120X120 (ΜΑΥΡΟ) — 4.79 |
| 20 | 3-pin and 4-pin PWM listings in one model | bequietsilentwings4120mm (8) | connector: 4-pin PWM / 3-pin | bestprice: Be Quiet Silent Wings 4 Case Fan 120mm με Σύνδεση 4-Pin PWM — 21.18<br>eshop: BE QUIET! FAN SILENT WINGS 4 120MM PWM BL093 4 PIN — 22.09<br>bestprice: Be Quiet Silent Wings 4 Case Fan 120mm με Σύνδεση 4-Pin PWM White — 22.62<br>shopflix: Be Quiet Silent Wings 4 Case Fan 120mm με Σύνδεση 4-Pin PWM BL093 — 22.9<br>… +4 more |

</details>

### Coolers
| Kind | Check | By design | Confidence | Groups | Models | Listings | Root cause |
| --- | --- | --- | --- | --- | --- | --- | --- |
| duplicate | same words in a different order |  | high | 21 | 42 | 70 | hypothesis: sites write the name in a different word order; model keys keep the order (productKey). |
| duplicate | same name apart from filler/colour words (Gaming, Edition, Case, Black, White…) |  | medium | 27 | 56 | 122 | hypothesis: a filler or colour word survives the normalizer on one site only. |
| duplicate | same model name under different vendor names (needs review: some are different products) |  | low | 8 | 16 | 39 | hypothesis: vendor spelling (Alpenfoehn/Alpenfohn), rebrands (SilentiumPC/Endorfy, Natec/Genesis) or a wrong vendor on one site. |
| duplicate | Greek words left in the model name (e.g. Shopflix "Τριπλού Ανεμιστήρα 120mm", Greek capitals typed for Latin ones) |  | high | 236 | 398 | 695 | verified: productKey (src/lib/categories.tsx) / model_key (scraper/names.py) keep only [a-z0-9], so Greek words vanish but their "120mm" stays and changes the key; normalize_cooling.py does not cut Shopflix’s "Διπλού/Τριπλού Ανεμιστήρα 120mm" phrase, and normalize_case.py does not convert Greek capitals typed for Latin ones ("ΑΧ61") as normalize_mobo.py does. |
| duplicate | same part number in the titles of different models |  | medium | 12 | 23 | 25 | hypothesis: names cut differently per site (e-shop/Snif titles keep the part number or extra words, Skroutz/BestPrice drop them). |
| wrong-merge | air and AIO listings in one model |  | high | 11 | 11 | 40 | verified: normalize_cooling.py WATER (Υδρόψυξη, Ydropsyxi, AIO, Liquid, Water, Hydro) decides AIO; Shopflix titles without those words and its slug spelling "udropsuxe" ("NZXT Kraken Elite 240 RGB με Διπλού Ανεμιστήρα") make an AIO "Air"; the builder checks the cheapest listing’s type (src/lib/builder.ts) |
| wrong-merge | AIO title names another radiator size than the model |  | high | 22 | 22 | 23 | verified: normalize_cooling.py takes the radiator first from the Skroutz card spec line "(2x120mm)", which describes the linked variant, while the card title names another (family card: "1STPLAYER Mothra MT360" linked to a 2-fan version); the radiator is then appended to the name ("… MT360 240") |
| wrong-merge | product pages disagree on the cooler height by more than 5 mm |  | medium | 1 | 1 | 3 |  |
| wrong-merge | Skroutz card title names another product than its link (family cards) |  | medium | 3 | 3 | 3 | verified: scraper/sources/skroutz.py takes the title from the card link’s title attribute and the price from the JSON-LD entry of the linked variant; for family cards the two name different variants. |

- Greek-word splits (S2, summary item 9); Air/AIO in one model (S2): the builder checks the cheapest listing's type, so an AIO whose cheapest listing is "Air" gets the air-height check (unknown → "Fit not verified") instead of the radiator check — no false "fits", but no radiator check either.

<details><summary>20 worst examples — Coolers</summary>

| # | Check | Model key(s) (listings) | Why | Listings (source: title — €) |
| --- | --- | --- | --- | --- |
| 1 | air and AIO listings in one model | deepcoollm360 (6) | cheapest is AIO | bestprice: Deepcool LM360 White 120mm ARGB για Socket 1200 / 1700 / 1851 / AM4 / AM5 / 115x — 79.32<br>bestprice: Deepcool LM360 Black 120mm ARGB για Socket 1200 / 1700 / 1851 / AM4 / AM5 / 115x — 83.54<br>skroutz: Deepcool LM360 — 89.9<br>skroutz: Deepcool LM360 Socket AM4/AM5/1200/1700 — 95.59<br>… +2 more |
| 2 | AIO title names another radiator size than the model | endorfynavisf360240 (2) | title radiator | skroutz: Endorfy Navis F360 — 81.63<br>skroutz: Endorfy Navis F360 ARGB — 85.49 |
| 3 | Greek words left in the model name (e.g. Shopflix "Τριπλού Ανεμιστήρα… | asusrogstrixlciii360120mm (5)<br>asusrogstrixlciii360 (5) | a Greek-free twin model exists | shopflix: Asus ROG Strix LC III 360 Τριπλού Ανεμιστήρα 120mm για Socket AM4/AM5/1700/1200 με ARGB Φωτισμό Λευκό — 140.72<br>shopflix: Asus ROG Strix LC III 360 ARGB Τριπλού Ανεμιστήρα 120mm για Socket AM4/AM5/1700/1200 — 186.52<br>shopflix: Asus Rog Strix LC III 360 Επεξεργαστή Τριπλού Ανεμιστήρα 120mm για Socket AM4/AM5/1700/1200/115x με ARGB Φωτισμό Λευκό — 217.74<br>shopflix: Asus ROG Strix LC III 360 Τριπλού Ανεμιστήρα 120mm για Socket AM4/AM5/1700/1200 Μαύρο — 222.43<br>… +6 more |
| 4 | same words in a different order | nzxtkraken240elite (3)<br>nzxtkrakenelite240 (5) |  | shopflix: NZXT Kraken 240 Elite RGB Υδρόψυξη AIO CPU με 2 Ανεμιστήρες 120mm Λευκό — 163.97<br>skroutz: NZXT Kraken 240 Elite RGB — 165.47<br>skroutz: NZXT Kraken 240 Elite — 249.17<br>bestprice: NZXT Kraken Elite 240 White 120mm RGB για Socket 115x / AM4 / TR4 / 1200 / sTRX4 / 1700 / AM5 — 163.97<br>… +4 more |
| 5 | product pages disagree on the cooler height by more than 5 mm | deepcoolak500g2 (3) | bestprice:159 bestprice:- skroutz:25 | bestprice: Deepcool AK500 G2 White — 40.4<br>bestprice: Deepcool AK500 G2 Black — 49.02<br>skroutz: Deepcool AK500 G2 Socket 1851/1700/AM5 — 54.23 |
| 6 | Skroutz card title names another product than its link (family cards) | — | missing from slug: 115x; filed as Manhattan 140034 | skroutz: Manhattan 140034 Socket 115x — 25 |
| 7 | same name apart from filler/colour words (Gaming, Edition, Case, Blac… | deepcoolag620g2 (8)<br>deepcoolag620g2wh (1) |  | skroutz: Deepcool AG620 G2 Socket 1700/AM5/AM4/1851 — 37.04<br>bestprice: Deepcool AG620 G2 Black — 39.2<br>skroutz: Deepcool AG620 G2 — 39.89<br>shopflix: Deepcool AG620 G2 Ψύκτρα Επεξεργαστή για Socket 1700/1851/AM4/AM5 — 40.11<br>… +5 more |
| 8 | same part number in the titles of different models | arcticalpine17compactintel (2)<br>arcticalpine17for (1) | part number ACALP00040A | eshop: ARCTIC ALPINE 17 COMPACT INTEL CPU COOLER ACALP00040A — 7.15<br>snif: Arctic Alpine 17 for socket 1700 ACALP00040A — 7.05 |
| 9 | same model name under different vendor names (needs review: some are … | endorfyfortis5 (10)<br>silentiumpcfortis5 (3) |  | bestprice: Endorfy Fortis 5 — 30.41<br>bestprice: Endorfy Fortis 5 Black — 34.36<br>bestprice: Endorfy Fortis 5 ARGB — 38.26<br>skroutz: Endorfy Fortis 5 ARGB Socket AM4/AM5/1200/115x/1700 — 44.41<br>… +7 more |
| 10 | air and AIO listings in one model | nzxtkrakenelite240 (5) | cheapest is AIO | bestprice: NZXT Kraken Elite 240 White 120mm RGB για Socket 115x / AM4 / TR4 / 1200 / sTRX4 / 1700 / AM5 — 163.97<br>bestprice: NZXT Kraken Elite 240 Black 120mm για Socket 115x / AM4 / TR4 / 1200 / sTRX4 / 1700 / AM5 — 249.17<br>shopflix: NZXT Kraken Elite 240 RGB με Διπλού Ανεμιστήρα — 262.9<br>shopflix: NZXT Kraken Elite 240 RGB με Διπλού Ανεμιστήρα — 281<br>… +1 more |
| 11 | AIO title names another radiator size than the model | 1stplayermothramt360240 (1) | title radiator | skroutz: 1STPLAYER Mothra MT360 — 79.21 |
| 12 | Greek words left in the model name (e.g. Shopflix "Τριπλού Ανεμιστήρα… | arcticliquidfreezeriiipro360120mm (3)<br>arcticliquidfreezeriiipro360 (6) | a Greek-free twin model exists | shopflix: Arctic Liquid Freezer III Pro 360 Τριπλού Ανεμιστήρα 120mm για Socket AM4/AM5/1700 — 72.89<br>shopflix: Arctic Liquid Freezer III Pro 360 A-RGB Τριπλού Ανεμιστήρα 120mm για Socket AM4/AM5/1700 — 82.7<br>shopflix: Arctic Liquid Freezer III Pro 360 A-RGB Τριπλού Ανεμιστήρα 120mm για Socket AM4/AM5/1700 Λευκό — 85.93<br>bestprice: Arctic Liquid Freezer III Pro 360 Black 120mm για Socket 1700 / 1851 / AM4 / AM5 — 71.09<br>… +5 more |
| 13 | same words in a different order | corsairicuelinktitan360rx (5)<br>corsairicuelinktitanrx360 (1) |  | bestprice: Corsair iCue Link Titan 360 RX White 120mm RGB για Socket 1700 / 1851 / AM4 / AM5 — 139.9<br>bestprice: Corsair iCue Link Titan 360 RX Black 120mm RGB για Socket 1700 / 1851 / AM4 / AM5 — 139.9<br>skroutz: Corsair ICUE LINK TITAN 360 RX RGB — 162.23<br>skroutz: Corsair ICUE LINK TITAN 360 RX RGB — 193.9<br>… +2 more |
| 14 | Skroutz card title names another product than its link (family cards) | — | missing from slug: pf360argb; filed as SilverStone PF360-ARGB (v2) v2 | skroutz: Silverstone PF360-ARGB (v2) v2 — 147.31 |
| 15 | same name apart from filler/colour words (Gaming, Edition, Case, Blac… | deepcoolmystique240 (6)<br>deepcoolmystique240wh (2) |  | bestprice: Deepcool Mystique 240 Black 120mm για Socket 115x / AM4 / 1200 / 1700 / AM5 — 79.9<br>bestprice: Deepcool Mystique 240 120mm ARGB για Socket 115x / 1200 / 1700 — 83.2<br>skroutz: Deepcool Mystique 240 — 87.6<br>eshop: DEEPCOOL MYSTIQUE 240 — 138<br>… +4 more |
| 16 | same part number in the titles of different models | arcticliquidfreezeriiipro360allinonecpuwatercooler (2)<br>arcticliquidfreezeriiipro360mmacfre00184a (1) | part number ACFRE00184A | eshop: ARCTIC LIQUID FREEZER III PRO 360 ALL-IN-ONE CPU WATER COOLER WITH A-RGB BLACK ACFRE00184A — 77.75<br>snif: Arctic Liquid Freezer III Pro 360mm ARGB Black ACFRE00184A — 84.2 |
| 17 | same model name under different vendor names (needs review: some are … | alpenfoehnbrocken4max (6)<br>alpenfohnbrocken4max (1) |  | bestprice: Alpenfoehn Brocken 4 Max ARGB White — 50.37<br>bestprice: Alpenfoehn Brocken 4 Max ARGB Black — 53.69<br>shopflix: Alpenfoehn Brocken 4 Max Διπλού Ανεμιστήρα για Socket AM4 / AM5 / 1200 / 115x / 1700 — 64.11<br>skroutz: Alpenfoehn Brocken 4 Max Socket AM4/AM5/1200/115x/1700 — 78.61<br>… +3 more |
| 18 | air and AIO listings in one model | nzxtkrakenelite240v2 (5) | cheapest is AIO | bestprice: NZXT Kraken Elite 240 V2 Black RGB για Socket 115x / 1200 / 1700 / 1851 / AM4 / AM5 — 198.5<br>skroutz: NZXT Kraken Elite 240 v2 — 199.4<br>shopflix: NZXT Kraken Elite 240 v2 Διπλού Ανεμιστήρα για Socket AM4/AM5/1700/1200/115x με RGB Φωτισμό Μαύρο — 199.4<br>bestprice: NZXT Kraken Elite 240 V2 120mm για Socket 115x / 1200 / 1700 / 1851 / AM4 / AM5 — 215.28<br>… +1 more |
| 19 | AIO title names another radiator size than the model | asusrogryuoiv360v2240 (1) | title radiator | skroutz: Asus ROG Ryuo IV 360 ARGB v2 — 369.49 |
| 20 | Greek words left in the model name (e.g. Shopflix "Τριπλού Ανεμιστήρα… | lianligalahadiilcd360120mm (3)<br>lianligalahadiilcd360 (6) | a Greek-free twin model exists | shopflix: Lian Li GALAHAD II LCD 360 Τριπλού Ανεμιστήρα 120mm για Socket AM4 / AM5 / 1700 / 1200 / 115x με ARGB Φωτισμό Λευκό — 155.4<br>shopflix: Lian Li GALAHAD II LCD 360 Τριπλού Ανεμιστήρα 120mm για Socket AM4 / AM5 / 1700 / 1200 / 115x με ARGB Φωτισμό Μαύρο — 209.85<br>shopflix: Lian Li GALAHAD II LCD 360 Τριπλού Ανεμιστήρα 120mm για Socket 1200 με ARGB Φωτισμό Λευκό — 259.8<br>bestprice: Lian Li Galahad II LCD 360 White 120mm ARGB για Socket 115x / AM4 / 1200 / 1700 / AM5 — 151.2<br>… +5 more |

</details>

## 3. Implausible values

Thresholds are the brief's. "In builder rows" = flagged listings that are a builder row's own (cheapest) listing; the builder-impact table below counts the rows whose *used* value is affected (builder rows carry model-level values for some fields).

| Category | Check | Listings | Models | In builder rows | Rule of thumb | Note / root cause |
| --- | --- | --- | --- | --- | --- | --- |
| gpu | lengthMm < 120 or > 400 | 1 | 1 | 1 |  |  |
| case | gpuMaxMm < 150 or > 500 | 32 | 7 | 6 |  |  |
| case | coolerMaxMm > 250 (and < 30, extra) | 0 | 0 | 0 |  |  |
| cooler | air cooler heightMm > 200 (and < 30, extra) | 72 | 26 | 22 |  |  |
| cooler | spec cache (raw product page) air cooler height < 30 or > 200 | 23 | 23 | 11 |  | Raw values before sharing; when sites disagree, scraper/main.py SAFER keeps the larger height, so a too-small raw value is usually hidden. |
| psu | watts < 300 or > 2000 | 74 | 22 | 20 |  | The scraper accepts 150–3000 W (normalize_psu.py MIN_WATTS/MAX_WATTS). Small TFX/Flex/SFX units below 300 W are real products. |
| ram | capacity ≠ modules × per-module size (chip vs fields, or title kit/total vs fields) | 10 | 9 | 3 |  | verified: scraper/normalize_ram.py sets capacity = modules × size from the first "N×SIZE GB" in title + URL, so the fields always agree with each other; disagreements come from titles whose total and kit differ, or kits written without "GB" ("Kit (2x16)"). |
| ram | speed < 1333 or > 10000 MHz (coordinator rule) | 81 | 28 | 1 |  | Most hits are real DDR2/DDR3 speeds (400–1066 MHz); see the type-aware check. |
| ram | speed outside the range of its DDR type (DDR2 400–1066, DDR3 800–3100, DDR4 1600–5333, DDR5 4000–10000) | 14 | 10 | 4 |  | verified: normalize_ram.py SPEED accepts any 3–5 digit number before MHz/MT/s (or Skroutz "Tachytita-N") with no range check. 60000 MHz: the e-shop title itself says "60000MHZ". DDR5 2400/2800: Skroutz URL "Tachytita-2800" (half the data rate, the I/O clock) for DDR5-5600 laptop kits. DDR4 6000/5600: the title says DDR4 for a DDR5 kit (part F5-/AX5U/LD5S). |
| gpu | listing price < 25% of its model’s median listing price (models with ≥ 3 listings) | 0 | 0 | 0 |  | 70 models checked; 0 of the hits are the model’s own (cheapest) price shown on the category page. |
| cpu | listing price < 25% of its model’s median listing price (models with ≥ 3 listings) | 0 | 0 | 0 |  | 251 models checked; 0 of the hits are the model’s own (cheapest) price shown on the category page. |
| mobo | listing price < 25% of its model’s median listing price (models with ≥ 3 listings) | 0 | 0 | 0 |  | 541 models checked; 0 of the hits are the model’s own (cheapest) price shown on the category page. |
| ram | listing price < 25% of its model’s median listing price (models with ≥ 3 listings) | 14 | 11 | 2 |  | 287 models checked; 11 of the hits are the model’s own (cheapest) price shown on the category page. |
| storage | listing price < 25% of its model’s median listing price (models with ≥ 3 listings) | 2 | 2 | 0 |  | 709 models checked; 2 of the hits are the model’s own (cheapest) price shown on the category page. |
| psu | listing price < 25% of its model’s median listing price (models with ≥ 3 listings) | 0 | 0 | 0 |  | 122 models checked; 0 of the hits are the model’s own (cheapest) price shown on the category page. |
| case | listing price < 25% of its model’s median listing price (models with ≥ 3 listings) | 2 | 2 | 2 |  | 982 models checked; 2 of the hits are the model’s own (cheapest) price shown on the category page. |
| fan | listing price < 25% of its model’s median listing price (models with ≥ 3 listings) | 0 | 0 | 0 |  | 448 models checked; 0 of the hits are the model’s own (cheapest) price shown on the category page. |
| cooler | listing price < 25% of its model’s median listing price (models with ≥ 3 listings) | 0 | 0 | 0 |  | 487 models checked; 0 of the hits are the model’s own (cheapest) price shown on the category page. |
| gpu | minPsu more than 100 W below or 300 W above the chip table (builder GPU_PSU) | 33 | 8 | 33 |  | The builder uses the card’s minPsu first (src/lib/builder.ts gpuPsu), so a too-low value lowers the PSU the builder asks for. |
| case | maxBoard implausible for the size (SFF/Cube ≥ ATX, Mini Tower E-ATX, Full Tower ≤ mATX, Midi Tower Mini ITX) | 50 | 31 | 20 | yes | Rule of thumb: some cubes do take ATX boards and some "Midi" cases are ITX-only; candidates, not verified against the maker. verified: normalize_case.py max_board takes the largest board named anywhere in title + spec line, so "supports Mini-ITX/mATX/ATX" or a size word for another product can raise it. |
| mobo | ramSlots outside {2, 4, 8}, or Mini ITX with > 2 | 26 | 14 | 0 |  | 12/16/24 slots are real on server/workstation boards (not offered by the builder). |
| cpu | igpu contradicts the model-number rule (Intel F/KF none; Ryzen 1000–5000 non-G none; 7000/9000 non-F yes; 8000F/7500F/7400F none; G yes) | 0 | 0 | 0 | yes | igpu is itself computed from the model number (normalize_cpu.py has_igpu), so this mainly re-checks that rule. |
| cpu | Tray with coolerIncluded = true | 6 | 6 | 6 | yes | Greek shops sell "Tray με ψύκτρα" / "Tray with Fan" packs, so some of these are real; the brief’s rule "Tray must be false" does not hold for them. |
| cpu | coolerIncluded = true for a chip whose retail box has no cooler (Intel K/KF, Ryzen 7000/9000 X/X3D) | 0 | 0 | 0 | yes |  |
| cpu | coolerIncluded = false but the title/URL says "with cooler" (με ψύκτρα / me-psyktra / with Fan) | 41 | 32 | 12 | yes | verified: scraper/specs.py apply sets coolerIncluded=false for any Tray listing without a stated value; BestPrice/Shopflix "Tray με ψύκτρα" listings have no product-page value. |
| cpu | coolerIncluded = true but the Skroutz/BestPrice URL names the package without "με ψύκτρα" | 0 | 0 | 0 | yes |  |

Notes per check:

- **GPU length < 120 / > 400 mm:** 1 listing (PNY GT 730 2GB, 115 mm) — plausible for a low-profile card. No error found.
- **Case GPU clearance < 150 / > 500 mm:** 32 listings / 7 models — Fractal Define 7 XL (530 mm) and Meshify 3 XL (512 mm) are XL cases where such values are plausible; Akyga AK-302-01 (145 mm) is a small case. Likely correct, not verified against the makers.
- **Air-cooler height:** see summary item 1 (S1). No height > 200 mm; no case cooler clearance > 250 mm or < 30 mm.
- **PSU watts < 300 / > 2000:** 74 listings / 22 models — real small TFX/SFX/OEM units (180–280 W) and real 2050/2200 W units (Silverstone HELA 2050R, Seasonic Prime PX 2200). No error found.
- **RAM capacity ≠ modules × size:** the fields always agree with each other (verified: capacity is computed as modules × size); 10 listings / 9 models have a title whose total and kit disagree ("G.Skill Trident Z5 RGB 128GB (2X4GB) … F5-6400J3644F64GX2" filed as 8GB, "G.Skill Ripjaws V 256GB (8X16GB)" filed as 128GB). The 113 kit misreads are in section 2.
- **RAM speed:** see summary item 11.
- **Price < 25% of the model median:** see summary item 14. The RAM hits are mostly old server/laptop memory whose models mix very different listings (e.g. "1GB DDR2 RAM03" at 1.89 €).
- **GPU minPsu vs the builder's chip table:** 33 listings / 8 models flagged; 21 are RTX 3050 6GB cards at 300 W, which matches NVIDIA's figure for the 6GB card (the table's 550 W is the 8GB card's; the table does not tell VRAM variants apart). The other 12 are the S1 problem of summary item 2.
- **Case largest board vs size (rule of thumb):** 50 listings / 31 models — e.g. "Chieftec CI-02B-OP Cube" / "Chieftec Visio" cubes stated as ATX (some cubes do take ATX), "Armaggeddon Tessaraxx Core 1 Full Tower" stated as Micro ATX. Candidates only.
- **Board RAM slots:** 26 listings / 14 models outside {2, 4, 8} or Mini ITX with > 2: server boards with 12/16/24 slots (real, not offered by the builder) and 2 Mini ITX server boards stated with 4 (ASRock AM5D4ID-2T/BCM, ROMED4ID-2T) — plausible for those boards (SO-DIMM/server layouts), not verified.
- **CPU integrated graphics:** 0 contradictions with the model-number rule (the scraper computes `igpu` with the same rule, `normalize_cpu.py has_igpu`).
- **CPU cooler-in-box (rule-of-thumb checks):** 0 Intel K/KF or Ryzen 7000/9000 X/X3D listings claim a cooler; 6 Tray listings say "cooler included" — these are Skroutz "Tray με ψύκτρα" products, so the brief's "Tray must be false" does not hold; 41 listings say "no cooler" against a "with cooler" title/URL (summary item 7).

<details><summary>Examples for every check with hits (first 20 each)</summary>

**gpu — lengthMm < 120 or > 400** (1 listings, first 1)

| Source | Value | Title | Context |
| --- | --- | --- | --- |
| skroutz | 115 | PNY GeForce GT 730 2GB | specCache: 115 |

**case — gpuMaxMm < 150 or > 500** (32 listings, first 20)

| Source | Value | Title | Context |
| --- | --- | --- | --- |
| bestprice | 145 | Akyga AK-302-01 AK-302-01BL Mini Tower |  |
| bestprice | 530 | Fractal Design Define 7 XL Full Tower |  |
| shopflix | 530 | Fractal Design Define 7 XL Midi Tower Μαύρο |  |
| skroutz | 530 | Fractal Design Define 7 XL Midi Tower |  |
| eshop | 512 | FRACTAL DESIGN MESHIFY 3 XL AMBIENCE PRO RGB LIGHT TINT GAMING MIDI TOWER |  |
| eshop | 512 | FRACTAL DESIGN MESHIFY 3 XL AMBIENCE PRO RGB LIGHT TINT GAMING MIDI TOWER |  |
| bestprice | 512 | Fractal Design Meshify 3 XL Solid Black Full Tower |  |
| bestprice | 512 | Fractal Design Meshify 3 XL TG Light Tint Black Gaming Full Tower με Πλαϊνό Παράθυρο |  |
| bestprice | 512 | Fractal Design Meshify 3 XL Light Tint Black Gaming Full Tower RGB με Πλαϊνό Παράθυρο |  |
| skroutz | 512 | Fractal Design Meshify 3 XL Solid Midi Tower |  |
| skroutz | 512 | Fractal Design Meshify 3 XL TG Light Tint Gaming Midi Tower με Πλαϊνό Παράθυρο |  |
| skroutz | 512 | Fractal Design Meshify 3 XL RGB Clear Tint Gaming Midi Tower με Πλαϊνό Παράθυρο |  |
| skroutz | 512 | Fractal Design Meshify 3 XL RGB TG Clear Tint Gaming Midi Tower με Πλαϊνό Παράθυρο |  |
| shopflix | 512 | Fractal Design Meshify 3 XL RGB Clear Tint Gaming Midi Tower με Πλαϊνό Παράθυρο Λευκό |  |
| skroutz | 512 | Fractal Design Meshify 3 XL RGB Light Tint Gaming Midi Tower με Πλαϊνό Παράθυρο |  |
| bestprice | 512 | Fractal Design Meshify 3 XL Clear Tint White Gaming Full Tower RGB με Πλαϊνό Παράθυρο |  |
| shopflix | 512 | Fractal Design Meshify 3 XL TG Light Tint Gaming Midi Tower με Πλαϊνό Παράθυρο Μαύρο |  |
| shopflix | 512 | Fractal Design Meshify 3 XL Solid Gaming Midi Tower Μαύρο |  |
| skroutz | 512 | Fractal Design Meshify 3 XL Ambience Pro RGB Clear Tint Gaming Midi Tower με Πλαϊνό Παράθυρο |  |
| bestprice | 512 | Fractal Design Meshify 3 XL Ambience Pro Light Tint Black Gaming Full Tower RGB με Πλαϊνό Παράθυρο |  |

**cooler — air cooler heightMm > 200 (and < 30, extra)** (72 listings, first 20)

| Source | Value | Title | Context |
| --- | --- | --- | --- |
| skroutz | 26 | Akasa AK-CC7122BP01 Socket 775/1200/115x |  |
| shopflix | 26 | Akasa AK-CC7122BP01 Low Profile για Socket 775 / 1200 / 115x Ασημί |  |
| shopflix | 26 | Akasa AK-CC7122BP01 Low Profile για Socket 775 / 1200 / 115x Ασημί |  |
| skroutz | 21 | Akasa AK-CC7129BP01 Socket 775/1200/115x |  |
| shopflix | 21 | Akasa AK-CC7129BP01 Low Profile για Socket 775 / 1200 / 115x Ασημί |  |
| shopflix | 21 | Akasa AK-CC7129BP01 Low Profile για Socket 775 / 1200 / 115x Ασημί |  |
| bestprice | 27 | Alpenfoehn Brocken 4 ARGB Black |  |
| bestprice | 27 | Alpenfoehn Brocken 4 ARGB White |  |
| skroutz | 27 | Alpenfoehn Brocken 4 Socket AM4/AM5/1200/115x/1700 |  |
| shopflix | 27 | Alpenfoehn Brocken 4 για Socket AM4 / AM5 / 1200 / 115x / 1700 |  |
| shopflix | 27 | Alpenfoehn Brocken 4 για Socket AM4 / AM5 / 1200 / 115x / 1700 με ARGB Φωτισμό Λευκή |  |
| shopflix | 27 | Alpenfoehn Brocken 4 MAX Ψύκτρα Επεξεργαστή με ARGB Φωτισμό για Socket AM4 / AM5 / 1200 / 115x / 1700 |  |
| shopflix | 27 | Alpenfoehn Brocken 4 MAX για Socket AM4 / AM5 / 1200 / 115x / 1700 με ARGB Φωτισμό Λευκή |  |
| bestprice | 27 | Alpenfoehn Brocken 4 Max ARGB White |  |
| bestprice | 27 | Alpenfoehn Brocken 4 Max ARGB Black |  |
| skroutz | 27 | Alpenfoehn Brocken 4 Max Socket AM4/AM5/1200/115x/1700 |  |
| shopflix | 27 | Alpenfoehn Brocken 4 Max Διπλού Ανεμιστήρα για Socket AM4 / AM5 / 1200 / 115x / 1700 |  |
| bestprice | 25 | Armaggeddon Blizzard 1 White |  |
| bestprice | 25 | Armaggeddon Blizzard 1 Black |  |
| skroutz | 25 | Armaggeddon Blizzard 1 Socket AM4/AM5/1200/115x/1700 |  |

**cooler — spec cache (raw product page) air cooler height < 30 or > 200** (23 listings, first 20)

| Source | Value | Title | Context |
| --- | --- | --- | --- |
| skroutz | 26 | Akasa AK-CC7122BP01 Socket 775/1200/115x | latestHeightMm: 26 |
| skroutz | 21 | Akasa AK-CC7129BP01 Socket 775/1200/115x | latestHeightMm: 21 |
| skroutz | 27 | Alpenfoehn Brocken 4 Socket AM4/AM5/1200/115x/1700 | latestHeightMm: 27 |
| skroutz | 27 | Alpenfoehn Brocken 4 Max Socket AM4/AM5/1200/115x/1700 | latestHeightMm: 27 |
| skroutz | 25 | Armaggeddon Blizzard 1 Socket AM4/AM5/1200/115x/1700 | latestHeightMm: 25 |
| skroutz | 25 | Armaggeddon Blizzard 2 Socket AM4/AM5/1200/115x/1700 | latestHeightMm: 25 |
| skroutz | 25 | Armaggeddon Blizzard 3 Socket AM4/AM5/1200/115x | latestHeightMm: 25 |
| skroutz | 25 | Deepcool AK400 G2 Socket AM5/1700/1851 | latestHeightMm: 25 |
| skroutz | 25 | Deepcool AK500 G2 Socket 1851/1700/AM5 | latestHeightMm: 159 |
| bestprice | 28.5 | Dynatron K199 | latestHeightMm: 28.5 |
| skroutz | 27.5 | Inter-Tech A-18 Socket AM4 | latestHeightMm: 27.5 |
| skroutz | 28.4 | Inter-Tech A-41 Socket SP3/TR4/sTRX4 | latestHeightMm: 28.4 |
| skroutz | 13 | Inter-Tech A-45 Socket AM4/AM5 | latestHeightMm: 13 |
| skroutz | 28.5 | Inter-Tech K-199 Socket 115x | latestHeightMm: 28.5 |
| skroutz | 28 | Inter-Tech Q-3 Socket 1700 | latestHeightMm: 28 |
| skroutz | 28 | Inter-Tech Q-5 Socket 1700 | latestHeightMm: 28 |
| bestprice | 25 | LC-Power LC-CC-120-RGB | latestHeightMm: 25 |
| bestprice | 25 | Silverstone AR09-115XP | latestHeightMm: 25 |
| bestprice | 25 | Silverstone AR09-115XS | latestHeightMm: 25 |
| bestprice | 25 | Soeyi CLA902 | latestHeightMm: 25 |

**psu — watts < 300 or > 2000** (74 listings, first 20)

| Source | Value | Title | Context |
| --- | --- | --- | --- |
| skroutz | 180 | FSP/Fortron FFSP180-50FEB 180W Full Wired |  |
| shopflix | 180 | FSP/Fortron FFSP180-50FEB 180W |  |
| skroutz | 180 | Lenovo 180W Full Wired 80 Plus Bronze (00PC774) |  |
| skroutz | 200 | Akyga 200W Full Wired (AK-I1-200) |  |
| eshop | 2050 | SILVERSTONE HELA HA2050R-PM 2050W BLACK |  |
| bestprice | 2050 | Silverstone Hela 2050R 2050W |  |
| shopflix | 2050 | Silverstone HELA 2050R Platinum 2050W Μαύρο Full Modular |  |
| bestprice | 2200 | Seasonic Prime PX 2200W |  |
| skroutz | 2200 | Seasonic PRIME PX ATX3.1 2024 2200W Full Modular 80 Plus Platinum |  |
| shopflix | 2200 | Seasonic Prime PX ATX3.1 2024 |  |
| skroutz | 2200 | Asus PRO-WS-2200P 2200W Full Modular 80 Plus Platinum |  |
| shopflix | 2200 | Asus PRO-WS-2200P 2200W Μαύρο |  |
| bestprice | 2200 | Asus Pro WS 2200W |  |
| snif | 220 | 504965-001 Power Supply For HP Desktop Power Supply unit PSU 504965-001 PC8044 220W HP-D2201C0 |  |
| skroutz | 230 | Spacer 450 230W Full Wired |  |
| snif | 235 | DELL D235PS-00 235 Watt Power Supply For Optiplex 380 Sff |  |
| snif | 235 | Dell Optiplex 780 960 SFF 235W Power Supply L235P-01 FR610 PS-5231-5DF-LF 0FR610 |  |
| snif | 240 | LENOVO 54Y8897 ACBEL PCB020 240W POWER SUPPLY FOR THINKCENTRE M92P PC |  |
| snif | 240 | PS-6241-02&#8203;HD 240W For HP RP5000 Power Supply |  |
| snif | 240 | HP D10-240P1A - 240W Power Supply For HP Elite 8000, 8100, 8200 SFF, Pro 6000 SFF |  |

**ram — capacity ≠ modules × per-module size (chip vs fields, or title kit/total vs fields)** (10 listings, first 10)

| Source | Value | Title | Context |
| --- | --- | --- | --- |
| bestprice | 8×16GB = 128GB | G.Skill Ripjaws V 256GB (8X16GB) DDR4 RAM 3600MHz Black | why: title says 256GB total and 8×16GB |
| shopflix | 1×16GB = 16GB | Kingston Fury Impact DDR4 16GB 3200MHz 2x16 | why: title kit 2×16GB |
| shopflix | 1×16GB = 16GB | Patriot Viper Steel RGB DDR4 16GB 3200MHz 2x16 | why: title kit 2×16GB |
| shopflix | 1×16GB = 16GB | TeamGroup T-Force Vulcan Z DDR4 16GB 3600MHz 2x16 | why: title kit 2×16GB |
| shopflix | 32GB | Desktop GSkill Trident Z RGB 64GB DDR4 3200MHz | why: title says 64GB |
| shopflix | 2×32GB = 64GB | TeamGroup T-Create Expert 32GB DDR4 3600MHz (2x32GB) | why: title says 32GB total and 2×32GB |
| bestprice | 2×64GB = 128GB | G.Skill Ripjaws S5 1GB (2X64GB) DDR5 RAM 6000MHz C34 Black | why: title says 1GB total and 2×64GB |
| shopflix | 1×16GB = 16GB | G.Skill Ripjaws S5 DDR5 16GB 5600MHz 2x16 | why: title kit 2×16GB |
| bestprice | 1×64GB = 64GB | Kingston 16GB (1X64GB) DDR5 RAM 5600MHz C46 KVR56U46BD8-64 | why: title says 16GB total and 1×64GB |
| bestprice | 2×4GB = 8GB | G.Skill Trident Z5 RGB 128GB (2X4GB) DDR5 RAM 6400MHz C36 Black F5-6400J3644F64GX2-TZ5RK | why: title says 128GB total and 2×4GB |

**ram — speed < 1333 or > 10000 MHz (coordinator rule)** (81 listings, first 20)

| Source | Value | Title | Context |
| --- | --- | --- | --- |
| snif | 667 | 16GB (8GBx2) Dell Micron PC2-5300F 667mhz FBD ECC DDR2 Server Ram SNP9F035CK2/16G | type: DDR2 |
| bestprice | 667 | Dell Micron 16GB (2X8GB) DDR2 RAM 667MHz | type: DDR2 |
| skroutz | 400 | 1GB DDR2 1-RAM0003 | type: DDR2 |
| shopflix | 533 | SODIMM DDR2 1GB 533 MHz | type: DDR2 |
| skroutz | 667 | 1GB DDR2 RAM03 | type: DDR2 |
| shopflix | 667 | - Ram Memory 1GB DDR2 667 MHz Laptop SODIMM (Κωδ. 1-RAM0004) | type: DDR2 |
| skroutz | 667 | Kingston 1GB DDR2 KFJ-FPC218/1G | type: DDR2 |
| skroutz | 667 | 1GB DDR2 SZ100437 | type: DDR2 |
| bestprice | 667 | Hynix 1GB (1X1GB) DDR2 RAM 667MHz SoDimm HYMP512S64CP8-Y5AB-C | type: DDR2 |
| skroutz | 667 | HP Enterprise 1GB DDR2 | type: DDR2 |
| bestprice | 800 | GoodRam 1GB (1X1GB) DDR2 RAM 800MHz SoDimm | type: DDR2 |
| snif | 800 | GoodRam 1GB (1X1GB) DDR2 800MHz SoDimm | type: DDR2 |
| skroutz | 800 | Kingston ValueRAM 1GB DDR2 | type: DDR2 |
| bestprice | 800 | Kingston 1GB (1X1GB) DDR2 RAM 800MHz SoDimm KVR800D2S6/1G | type: DDR2 |
| shopflix | 800 | - Ram Memory 1GB DDR2 800 MHz Laptop SODIMM (Κωδ. 1-RAM0006) | type: DDR2 |
| bestprice | 800 | Samsung 1GB (1X1GB) DDR2 RAM 800MHz | type: DDR2 |
| bestprice | 800 | Hynix 1GB (1X1GB) DDR2 RAM 800MHz SoDimm | type: DDR2 |
| bestprice | 800 | Samsung 1GB (1X1GB) DDR2 RAM 800MHz SoDimm | type: DDR2 |
| skroutz | 400 | MicroMemory DDR2 2GB DDR2 | type: DDR2 |
| shopflix | 533 | - Ram Memory 2GB DDR2 533 MHz Laptop SODIMM (Κωδ. 1-RAM0007) | type: DDR2 |

**ram — speed outside the range of its DDR type (DDR2 400–1066, DDR3 800–3100, DDR4 1600–5333, DDR5 4000–10000)** (14 listings, first 14)

| Source | Value | Title | Context |
| --- | --- | --- | --- |
| skroutz | 1600 | Dell 4GB DDR2 1WT39 | type: DDR2; titleSays: null; url: https://www.skroutz.gr/s/53886650/Dell-DDR2-me-Module-1x4GB-kai-Tachytita-1600-gia-Server… |
| bestprice | 667 | Corsair 2GB (1X2GB) DDR3 RAM 667MHz SoDimm | type: DDR3; titleSays: 667MHz; url: https://www.bestprice.gr/item/2152702796/corsair-2gb-ddr3-ram-667mhz-sodimm.html |
| skroutz | 6000 | Adata XPG Lancer Blade 16GB DDR4 | type: DDR4; titleSays: null; url: https://www.skroutz.gr/s/61788396/adata-xpg-lancer-blade-ddr4-me-module-1x16gb-kai-tachyt… |
| bestprice | 6000 | G.Skill Trident Z5 RGB 64GB (2X32GB) DDR4 RAM 6000MHz C36 White F5-6000J3636F32GX2-TZ5RW | type: DDR4; titleSays: 6000MHz; url: https://www.bestprice.gr/item/2159382238/g-skill-trident-z5-rgb-64gb-ddr4-ram-6000mhz-c36… |
| bestprice | 6000 | G.Skill Trident Z5 RGB 64GB (2X32GB) DDR4 RAM 6000MHz C30 White F5-6000J3040G32GX2-TZ5RW | type: DDR4; titleSays: 6000MHz; url: https://www.bestprice.gr/item/2159382237/g-skill-trident-z5-rgb-64gb-ddr4-ram-6000mhz-c30… |
| skroutz | 5600 | Lexar 8GB DDR4 LD5S08G56C46ST-BGS | type: DDR4; titleSays: null; url: https://www.skroutz.gr/s/62826559/lexar-ddr4-me-module-1x8gb-kai-tachytita-5600-gia-lapto… |
| skroutz | 2800 | Corsair Vengeance 24GB DDR5 | type: DDR5; titleSays: null; url: https://www.skroutz.gr/s/63368834/corsair-vengeance-ddr5-me-module-1x24gb-kai-tachytita-2… |
| skroutz | 2400 | Adata 32GB DDR5 AD5S480032G-S | type: DDR5; titleSays: null; url: https://www.skroutz.gr/s/40527055/Adata-DDR5-me-Module-1x32GB-kai-Tachytita-2400-gia-Lapt… |
| bestprice | 2400 | HP 32GB (1X32GB) DDR5 RAM 2400MHz C40 P64339-B21 | type: DDR5; titleSays: 2400MHz; url: https://www.bestprice.gr/item/2160758270/hp-32gb-ddr5-ram-2400mhz-c40-p64339-b21.html |
| skroutz | 2400 | HP Dual Rank 32GB DDR5 | type: DDR5; titleSays: null; url: https://www.skroutz.gr/s/57724317/HP-Dual-Rank-DDR5-me-Module-1x32GB-kai-Tachytita-2400-g… |
| skroutz | 2800 | Corsair Vengeance 32GB DDR5 | type: DDR5; titleSays: null; url: https://www.skroutz.gr/s/58722757/Corsair-Vengeance-DDR5-me-Module-1x32GB-kai-Tachytita-2… |
| shopflix | 2800 | Corsair Vengeance DDR5 32GB (1x32GB) 2800MHz SODIMM Laptop Memory Module | type: DDR5; titleSays: 2800MHz; url: https://shopflix.gr/p/SF-107113129/corsair-vengeance-ddr5-32gb-1x32gb-2800mhz-sodimm-lapt… |
| skroutz | 2800 | Crucial 64GB DDR5 MTC40F2046S1RC56BD1 | type: DDR5; titleSays: null; url: https://www.skroutz.gr/s/56046125/Crucial-DDR5-me-Module-1x64GB-kai-Tachytita-2800-gia-Se… |
| eshop | 60000 | G.SKILL F5-6000J3238G32GX2-TZ5S TRIDENT Z5 64GB (2X32GB) DDR5 60000MHZ CL32 DUAL KIT | type: DDR5; titleSays: 60000MHZ; url: https://www.e-shop.gr/ram-gskill-f5-6000j3238g32gx2-tz5s-trident-z5-64gb-2x32gb-ddr5-6000… |

**ram — listing price < 25% of its model’s median listing price (models with ≥ 3 listings)** (14 listings, first 14)

| Source | Value | Title | Context |
| --- | --- | --- | --- |
| skroutz | 1.89 | 1GB DDR2 RAM03 | modelMedian: 19.535; ratio: 0.097; isModelPrice: true; modelListings: 4 |
| skroutz | 80 | OWC 32GB DDR3 OWC1333D3MPE32G | modelMedian: 569.69; ratio: 0.14; isModelPrice: true; modelListings: 3 |
| skroutz | 25.34 | Samsung 8GB DDR3L M392B1G73BH0-YK0 | modelMedian: 165.7; ratio: 0.153; isModelPrice: true; modelListings: 13 |
| skroutz | 25.34 | Hynix PC3L-12800R 8GB DDR3 | modelMedian: 165.7; ratio: 0.153; isModelPrice: false; modelListings: 13 |
| shopflix | 18.83 | GoodRAM 4GB DDR4 με Ταχύτητα 2666 για Laptop | modelMedian: 100.4; ratio: 0.188; isModelPrice: true; modelListings: 12 |
| shopflix | 813.89 | Kingston Fury Impact DDR5 64GB 4800MHz 2x32 | modelMedian: 4116.64; ratio: 0.198; isModelPrice: true; modelListings: 9 |
| skroutz | 25.34 | Hynix 8GB DDR3 HMT31GR7BFR4A-H9 | modelMedian: 125.9; ratio: 0.201; isModelPrice: true; modelListings: 3 |
| skroutz | 249 | Dell Poweredge 16GB DDR5 | modelMedian: 1214.02; ratio: 0.205; isModelPrice: true; modelListings: 6 |
| shopflix | 31 | Dell 4GB DDR3 UDIMM 1600MHz ECC A7303660 (1x4) | modelMedian: 149.4; ratio: 0.207; isModelPrice: true; modelListings: 14 |
| skroutz | 32.35 | Hynix 4GB DDR3 | modelMedian: 149.4; ratio: 0.217; isModelPrice: false; modelListings: 14 |
| skroutz | 62.96 | HP 8GB DDR4 W127009501 | modelMedian: 283.9; ratio: 0.222; isModelPrice: true; modelListings: 6 |
| skroutz | 282.42 | Integral 16GB DDR5 IN5T16GNHRBX | modelMedian: 1214.02; ratio: 0.233; isModelPrice: false; modelListings: 6 |
| shopflix | 239.63 | Integral DDR5 με Module 1x16GB & Ταχύτητα 4800 για Server | modelMedian: 1014.87; ratio: 0.236; isModelPrice: true; modelListings: 11 |
| snif | 45.99 | Corsair Vengeance LPX CMK16GX4M1A2400C14 DDR4 2400MHz (1x16GB) | modelMedian: 188.02; ratio: 0.245; isModelPrice: true; modelListings: 42 |

**storage — listing price < 25% of its model’s median listing price (models with ≥ 3 listings)** (2 listings, first 2)

| Source | Value | Title | Context |
| --- | --- | --- | --- |
| skroutz | 109.24 | Micron 5400 Pro 480GB 2.5'' MTFDDAK480TGA-1BC1ZABYYT | modelMedian: 1420.47; ratio: 0.077; isModelPrice: true; modelListings: 4 |
| skroutz | 77.36 | HP Enterprise 900GB 2.5" 10000rpm 619291-B21 | modelMedian: 399.18; ratio: 0.194; isModelPrice: true; modelListings: 3 |

**case — listing price < 25% of its model’s median listing price (models with ≥ 3 listings)** (2 listings, first 2)

| Source | Value | Title | Context |
| --- | --- | --- | --- |
| bestprice | 54.27 | Nanoxia Deep Silence 9 White Gaming Midi Tower RGB με Πλαϊνό Παράθυρο | modelMedian: 248.95; ratio: 0.218; isModelPrice: true; modelListings: 3 |
| bestprice | 18.7 | Armaggeddon Nimitz TR5000 Black Gaming Midi Tower με Πλαϊνό Παράθυρο | modelMedian: 79.9; ratio: 0.234; isModelPrice: true; modelListings: 3 |

**gpu — minPsu more than 100 W below or 300 W above the chip table (builder GPU_PSU)** (33 listings, first 20)

| Source | Value | Title | Context |
| --- | --- | --- | --- |
| skroutz | 170 | Sparkle ARC B570 10GB GUARDIAN LUNA OC | table: 500; chip: Arc B570; specCache: 170 |
| bestprice | 170 | Sparkle Arc B570 10GB GDDR6 Luna Guardian OC | table: 500; chip: Arc B570; specCache: null |
| bestprice | 300 | Gainward GeForce RTX 3050 6GB GDDR6 StormX | table: 550; chip: RTX 3050; specCache: null |
| bestprice | 300 | MSI GeForce RTX 3050 6GB GDDR6 Ventus 2X E OC | table: 550; chip: RTX 3050; specCache: null |
| bestprice | 300 | Gigabyte GeForce RTX 3050 6GB GDDR6 Windforce OC v2 | table: 550; chip: RTX 3050; specCache: null |
| skroutz | 300 | Gainward GeForce RTX 3050 6GB StormX | table: 550; chip: RTX 3050; specCache: 300 |
| eshop | 300 | MSI GEFORCE RTX 3050 VENTUS 2X E 6GB OC | table: 550; chip: RTX 3050; specCache: null |
| skroutz | 300 | MSI GeForce RTX 3050 6GB Ventus 2X E 6G OC | table: 550; chip: RTX 3050; specCache: 300 |
| eshop | 300 | GIGABYTE GEFORCE RTX 3050 WINDFORCE OC V2 6G NVIDIA 6 GB GDDR6 | table: 550; chip: RTX 3050; specCache: null |
| shopflix | 300 | Gigabyte GeForce RTX 3050 6GB GDDR6 Windforce OC v2 | table: 550; chip: RTX 3050; specCache: null |
| skroutz | 300 | Gigabyte GeForce RTX 3050 | table: 550; chip: RTX 3050; specCache: null |
| shopflix | 300 | MSI GeForce RTX 3050 6GB GDDR6 LP E 6G OC | table: 550; chip: RTX 3050; specCache: null |
| skroutz | 300 | MSI GeForce RTX 3050 6GB LP E 6G OC | table: 550; chip: RTX 3050; specCache: null |
| skroutz | 300 | Palit GeForce RTX 3050 6GB StormX (Refresh) | table: 550; chip: RTX 3050; specCache: 300 |
| shopflix | 300 | MSI GeForce RTX 3050 6GB GDDR6 Ventus 2X OC | table: 550; chip: RTX 3050; specCache: null |
| bestprice | 300 | MSI GeForce RTX 3050 6GB GDDR6 Ventus 2X OC | table: 550; chip: RTX 3050; specCache: null |
| skroutz | 300 | MSI GeForce RTX 3050 6GB Ventus 2X 6G OC | table: 550; chip: RTX 3050; specCache: null |
| bestprice | 300 | MSI GeForce RTX 3050 6GB GDDR6 Gaming X | table: 550; chip: RTX 3050; specCache: null |
| snif | 300 | GIGABYTE VGA GV-N3050WF2OCV2-6GD, 6GB , GDDR6 | table: 550; chip: RTX 3050; specCache: null |
| shopflix | 300 | MSI GeForce RTX 3050 6GB GDDR6 Ventus 2X E 6G OC | table: 550; chip: RTX 3050; specCache: null |

**case — maxBoard implausible for the size (SFF/Cube ≥ ATX, Mini Tower E-ATX, Full Tower ≤ mATX, Midi Tower Mini ITX)** (50 listings, first 20)

| Source | Value | Title | Context |
| --- | --- | --- | --- |
| bestprice | Micro ATX | Armaggeddon Tessaraxx Core 1 Gaming Full Tower RGB με Πλαϊνό Παράθυρο | size: Full Tower |
| bestprice | ATX | Chieftec CI-02B-OP Cube | size: SFF / Cube |
| skroutz | ATX | Chieftec CI-02B-OP Cube | size: SFF / Cube |
| shopflix | ATX | Chieftec CI-02B-OP Cube Μαύρο | size: SFF / Cube |
| skroutz | ATX | Chieftec Visio Air Cube με Πλαϊνό Παράθυρο | size: SFF / Cube |
| skroutz | ATX | Chieftec Visio Air GM-30B-M-OP Cube με Πλαϊνό Παράθυρο | size: SFF / Cube |
| shopflix | ATX | Chieftec Visio Air GM-30B-M-OP Cube με Πλαϊνό Παράθυρο Μαύρο | size: SFF / Cube |
| bestprice | ATX | Chieftec Visio Air Mesh Black Cube με Πλαϊνό Παράθυρο | size: SFF / Cube |
| bestprice | ATX | Chieftec Visio Black Gaming Cube RGB με Πλαϊνό Παράθυρο | size: SFF / Cube |
| bestprice | ATX | Chieftec Visio White Gaming Cube RGB με Πλαϊνό Παράθυρο | size: SFF / Cube |
| skroutz | ATX | Chieftec Visio GM-30B-TG-OP Cube με Πλαϊνό Παράθυρο | size: SFF / Cube |
| shopflix | ATX | Chieftec Visio GM-30B-TG-OP Gaming Cube με Πλαϊνό Παράθυρο Μαύρο | size: SFF / Cube |
| skroutz | ATX | Chieftec Visio GM-30W-TG-OP Cube με Πλαϊνό Παράθυρο | size: SFF / Cube |
| shopflix | ATX | Chieftec Visio GM-30W-TG-OP Gaming Cube με Πλαϊνό Παράθυρο Λευκό | size: SFF / Cube |
| skroutz | Mini ITX | Darkflash C275P Midi Tower | size: Midi Tower |
| shopflix | Mini ITX | Darkflash C275P Midi Tower Μαύρο | size: Midi Tower |
| shopflix | E-ATX | Darkflash C280 Gaming Mini Tower με Πλαϊνό Παράθυρο Λευκό | size: Mini Tower |
| shopflix | E-ATX | Darkflash C280 Gaming Mini Tower με Πλαϊνό Παράθυρο & ARGB Φωτισμό Μαύρο +7 Fans | size: Mini Tower |
| skroutz | E-ATX | Darkflash C280 Gaming Mini Tower με Πλαϊνό Παράθυρο | size: Mini Tower |
| shopflix | E-ATX | Darkflash C280 Gaming Mini Tower με Πλαϊνό Παράθυρο & ARGB Φωτισμό Μαύρο + 7 Fans | size: Mini Tower |

**mobo — ramSlots outside {2, 4, 8}, or Mini ITX with > 2** (26 listings, first 20)

| Source | Value | Title | Context |
| --- | --- | --- | --- |
| bestprice | 4 | Asrock AM5D4ID-2T/BCM | formFactor: Mini ITX; socket: AM5 |
| bestprice | 12 | Asrock GENOA2D24G-2L+ | formFactor: ATX; socket: SP5 |
| bestprice | 4 | Asrock ROMED4ID-2T | formFactor: Mini ITX; socket: SP3 |
| skroutz | 16 | ASRock SP2C741D16-2T | formFactor: E-ATX; socket: LGA4677 |
| bestprice | 16 | Asrock SP2C741D16-2T | formFactor: E-ATX; socket: LGA4677 |
| bestprice | 16 | Asrock TURIN2D16-2T | formFactor: E-ATX; socket: SP5 |
| bestprice | 24 | Asrock TURIN2D24G-2L+/500W | formFactor: ATX; socket: SP5 |
| bestprice | 12 | Asus K14PA-U12 | formFactor: E-ATX; socket: SP5 |
| skroutz | 12 | Asus K14PA-U12 | formFactor: E-ATX; socket: SP5 |
| shopflix | 12 | Asus K14PA-U12 Motherboard SSI CEB with AMD SP5 Socket | formFactor: E-ATX; socket: SP5 |
| bestprice | 16 | Asus Z13PE-D16 | formFactor: E-ATX; socket: LGA4677 |
| bestprice | 12 | Gigabyte MA34-CP0 | formFactor: E-ATX; socket: LGA7529 |
| skroutz | 12 | Gigabyte MA34-CP0 | formFactor: E-ATX; socket: LGA4677 |
| shopflix | 12 | Gigabyte MA34-CP0 Motherboard Extended ATX με Intel LGA4677 Socket | formFactor: E-ATX; socket: LGA4677 |
| skroutz | 16 | Gigabyte MS73-HB1 | formFactor: E-ATX; socket: LGA4677 |
| bestprice | 16 | Gigabyte MS73-HB1 | formFactor: E-ATX; socket: LGA4677 |
| skroutz | 16 | Gigabyte MZ32-AR0 SoC | formFactor: E-ATX; socket: SP3 |
| bestprice | 16 | Gigabyte MZ32-AR0 | formFactor: E-ATX; socket: SP3 |
| bestprice | 24 | Gigabyte MZ33-AR0 | formFactor: E-ATX; socket: SP5 |
| skroutz | 24 | Gigabyte MZ33-AR0 SoC | formFactor: E-ATX; socket: SP5 |

**cpu — Tray with coolerIncluded = true** (6 listings, first 6)

| Source | Value | Title | Context |
| --- | --- | --- | --- |
| skroutz | true | AMD Ryzen 5 5500F 3GHz Tray | url: https://www.skroutz.gr/s/69684968/amd-ryzen-5-5500f-3ghz-epexergastis-6-pyrinon-gia-socke… |
| skroutz | true | AMD Ryzen 5 7400 4.3GHz | url: https://www.skroutz.gr/s/65625732/amd-ryzen-5-7400-4-3ghz-epexergastis-6-pyrinon-gia-sock… |
| skroutz | true | AMD Ryzen 5 8400F 4.2GHz Tray | url: https://www.skroutz.gr/s/62543834/amd-ryzen-5-8400f-4-2ghz-epexergastis-6-pyrinon-gia-soc… |
| skroutz | true | AMD Ryzen 5 9600 3.8GHz Tray | url: https://www.skroutz.gr/s/59759262/amd-ryzen-5-9600-3-8ghz-epexergastis-6-pyrinon-gia-sock… |
| skroutz | true | AMD Ryzen 7 7700 SR1 3.8GHz Tray | url: https://www.skroutz.gr/s/65949440/amd-ryzen-7-7700-sr1-3-8ghz-epexergastis-8-pyrinon-gia-… |
| skroutz | true | AMD Ryzen 7 7700X3D 4GHz | url: https://www.skroutz.gr/s/68823531/amd-ryzen-7-7700x3d-4ghz-epexergastis-8-pyrinon-gia-soc… |

**cpu — coolerIncluded = false but the title/URL says "with cooler" (με ψύκτρα / me-psyktra / with Fan)** (41 listings, first 20)

| Source | Value | Title | Context |
| --- | --- | --- | --- |
| skroutz | false | AMD Athlon 200GE 3.2GHz Tray | packaging: Tray; url: https://www.skroutz.gr/s/64210871/amd-athlon-200ge-3-2ghz-epexergastis-2-pyrinon-gia-sock… |
| shopflix | false | AMD Athlon 200GE 3.2GHz | packaging: Tray; url: https://shopflix.gr/p/SF-201023823/amd-athlon-200ge-3-2ghz-epexergastes-2-purenon-gia-soc… |
| shopflix | false | AMD Athlon 3000G 3.50GHz 2 Πυρήνων για Socket AM4 σε Tray με Ψύκτρα | packaging: Tray; url: https://shopflix.gr/p/SF-105879190/epexergasths-amd-athlon-3000g-3-50ghz-2-purhnon-gia-so… |
| skroutz | false | Intel Celeron Dual Core G3930 2.9GHz Tray | packaging: Tray; url: https://www.skroutz.gr/s/25546686/Intel-Celeron-Dual-Core-G3930-2-9GHz-Epexergastis-2-Pyr… |
| skroutz | false | Intel Celeron Dual Core G5905 3.5GHz | packaging: Tray; url: https://www.skroutz.gr/s/68464521/intel-celeron-dual-core-g5905-3-5ghz-epexergastis-2-pyr… |
| bestprice | false | Intel Core i3-14100 Tray | packaging: Tray; url: https://www.bestprice.gr/item/2159328492/intel-core-i3-14100-tray-epexergastis-4-pyrinon-… |
| bestprice | false | Intel Core i3-14100F Tray | packaging: Tray; url: https://www.bestprice.gr/item/2159328490/intel-core-i3-14100f-tray-epexergastis-4-pyrinon… |
| bestprice | false | Intel Core i7-14700F Tray | packaging: Tray; url: https://www.bestprice.gr/item/2159328491/intel-core-i7-14700f-tray-epexergastis-20-pyrino… |
| shopflix | false | Intel Pentium Dual Core G7400 3.7GHz 2 Πυρήνων για Socket 1700 σε Tray με Ψύκτρα | packaging: Tray; url: https://shopflix.gr/p/SF-101782282/epexergasths-intel-pentium-dual-core-g7400-3-7ghz-2-pu… |
| shopflix | false | AMD Ryzen 5 5500 3.6GHz 6 Πυρήνων για Socket AM4 σε Tray με Ψύκτρα | packaging: Tray; url: https://shopflix.gr/p/SF-106036248/epexergastes-amd-ryzen-5-5500-3-6ghz-6-purenon-gia-soc… |
| bestprice | false | AMD Ryzen 5 5500F Tray | packaging: Tray; url: https://www.bestprice.gr/item/2164526117/amd-ryzen-5-5500f-tray-epexergastis-6-pyrinon-gi… |
| shopflix | false | AMD Ryzen 5 5600XT 3.7GHz 6 Πυρήνων για Socket AM4 σε Tray με Ψύκτρα | packaging: Tray; url: https://shopflix.gr/p/SF-106100150/epexergasths-amd-ryzen-5-5600xt-3-7ghz-6-purhnon-gia-s… |
| bestprice | false | AMD Ryzen 5 7400 Tray | packaging: Tray; url: https://www.bestprice.gr/item/2163692308/amd-ryzen-5-7400-tray-epexergastis-6-pyrinon-gia… |
| shopflix | false | AMD Ryzen 5 7400 4.3GHz | packaging: Tray; url: https://shopflix.gr/p/SF-202448053/amd-ryzen-5-7400-4-3ghz-epexergastes-6-purenon-gia-soc… |
| bestprice | false | AMD Ryzen 5 7500F Tray with Fan | packaging: Tray; url: https://www.bestprice.gr/item/2159837283/amd-ryzen-5-7500f-tray-with-fan-epexergastis-6-p… |
| skroutz | false | AMD Ryzen 5 7600 3.8GHz Tray | packaging: Tray; url: https://www.skroutz.gr/s/54360505/AMD-Ryzen-5-7600-3-8GHz-Epexergastis-6-Pyrinon-gia-Sock… |
| bestprice | false | AMD Ryzen 5 7600 Tray With Fan | packaging: Tray; url: https://www.bestprice.gr/item/2158245471/amd-ryzen-5-7600-tray-with-fan-epexergastis-6-py… |
| bestprice | false | AMD Ryzen 5 8400F Tray with Fan | packaging: Tray; url: https://www.bestprice.gr/item/2160654022/amd-ryzen-5-8400f-tray-with-fan-epexergastis-6-p… |
| shopflix | false | AMD Ryzen 5 8500G 3.5GHz | packaging: Tray; url: https://shopflix.gr/p/SF-102689095/amd-ryzen-5-8500g-3-5ghz-epexergastes-6-purenon-gia-so… |
| bestprice | false | AMD Ryzen 5 8500G Tray | packaging: Tray; url: https://www.bestprice.gr/item/2163743014/amd-ryzen-5-8500g-tray-epexergastis-6-pyrinon-gi… |

</details>

### Problems that reach the builder's checks

| Slot | Problem reaching the builder | Rows | Examples (chip — value) |
| --- | --- | --- | --- |
| cooler | air cooler rows with heightMm < 40 (a tower cooler measured as 21–28 mm passes every case height check) | 28 | Akasa AK-CC7122BP01 — 26<br>Akasa AK-CC7129BP01 — 21<br>Alpenfoehn Brocken 4 — 27<br>Alpenfoehn Brocken 4 Max — 27 |
| cooler | models mixing Air and AIO listings: the type the builder uses (cheapest listing) | 11 | Antec VORTEX LUM 240 — cheapest AIO; listings AIO/AIO/Air<br>Arctic Freezer III Pro 240 Διπλού Ανεμιστήρα — cheapest Air; listings Air/AIO<br>Deepcool LM360 — cheapest AIO; listings AIO/AIO/AIO/Air/Air/AIO<br>Deepcool MAELSTROM 240T — cheapest Air; listings Air/AIO |
| gpu | GPU rows whose minPsu is > 100 W under the chip table (RTX 3050 6GB excluded: its 300 W is NVIDIA’s figure) | 12 | Arc B570 — 170 W (table 500 W)<br>Arc B570 — 170 W (table 500 W)<br>RTX 5050 — 130 W (table 550 W)<br>RTX 5050 — 130 W (table 550 W) |
| mobo | board rows whose titles say Extended ATX / E-ATX but formFactor is smaller | 2 | ASRock X870E Taichi Lite WiFi Extended — ATX<br>Asus Rog Maximus Z890 Extreme WiFi Extended — ATX |
| mobo | board rows whose titles say ITX but formFactor is not Mini ITX | 3 | ASRock A520M — Micro ATX<br>ASRock A520M-ITX/AC — Micro ATX<br>ASRock B550M-ITX/ac — Micro ATX |
| mobo | offered board models that mix DDR4 and DDR5 listings (the row shows one memory type, the cheapest listing may be the other board) | 5 | ASRock H610M-H2/M.2 — row memory DDR5; cheapest listing DDR5<br>ASRock H610M-HDV/M.2 — row memory DDR5; cheapest listing DDR5<br>Asus Prime B840M-A-CSM — row memory DDR5; cheapest listing DDR4<br>Asus Prime B860-Plus WiFi — row memory DDR5; cheapest listing DDR5 |
| ram | RAM rows whose title part number says another DDR generation (G.Skill F4-/F5-, ADATA AX4/AX5, Lexar LD4/LD5) | 1 | DDR4 64GB (2×32GB) 6000MHz — DDR4 |
| ram | Desktop-classified RAM listings whose part number is a registered/ECC server DIMM (Micron MTA…72P, Kingston KSM…R, Samsung M393, Hynix HMA…R) — heuristic; counts listings: 2 are a builder row’s own (cheapest) listing, 30 sit in spec models the builder offers | 31 | DDR3 16GB (1×16GB) 1600MHz — category page only<br>DDR4 16GB (1×16GB) 3200MHz — in an offered model<br>DDR4 16GB (1×16GB) 3200MHz — in an offered model<br>DDR4 16GB (1×16GB) 3200MHz — in an offered model |
| ram | RAM rows where one of the model’s titles states another kit layout with the same total (e.g. "2x16" filed as 1×32GB) | 31 | DDR4 128GB (1×128GB) 3200MHz — 1 × 128GB<br>DDR4 16GB (1×16GB) 2400MHz — 1 × 16GB<br>DDR4 16GB (1×16GB) 2666MHz — 1 × 16GB<br>DDR4 16GB (1×16GB) 3000MHz — 1 × 16GB |
| storage | offered drive models mixing interfaces or form factors | 8 | Kioxia Exceria G3 2TB — NVMe · M.2 2280/PCIe card<br>Philips Ultra Speed 480GB — SATA · 2.5"/M.2 2280<br>Philips Ultra Speed 960GB — SATA · 2.5"/M.2 2280<br>Transcend 420S 480GB M.2 — SATA · M.2 2280/M.2 2242 |
| case | cases whose listings disagree on the largest board and the builder uses the smaller (most common) value | 19 | Adata XPG Battlecruiser — uses ATX; listings ATX/E-ATX<br>Aerocool Trinity Mini v3 — uses Micro ATX; listings Micro ATX/ATX<br>Asus Prime AP202 — uses Micro ATX; listings Micro ATX/ATX<br>Chieftec Hunter — uses ATX; listings ATX/E-ATX |
| cpu | CPU rows with cooler-in-box unknown (a separate row next to the known one) | 154 | Athlon 3000G — Box<br>Celeron G5905 — Box<br>Celeron G5920 — Box<br>Core Ultra 5 225 — Box |
| cpu | CPU rows saying "no cooler in the box" while the URL/title says "with cooler" | 21 | Athlon 200GE — Tray<br>Athlon 3000G — Tray<br>Celeron G3930 — Tray<br>Celeron G5905 — Tray |

## 4. Identity fields that contradict the title

### Regex pass over all listings

The audit's own title parsers (`scripts/audit/data-quality/derive.mjs`) look for a stated socket ("AM5", "LGA1700", "Socket 1700", "s1851"), DDR type ("DDR4", and e-shop's "D4"/"D5" for boards), board size (E-ATX before Micro ATX before Mini ITX before ATX), PSU form factor and case size, and compare with the stored field. "Field empty" = the title states a value but the field is null/"Άλλο".

| Category | Field | Listings | Title states a value | Contradictions | By source | Field empty although title states it |
| --- | --- | --- | --- | --- | --- | --- |
| cpu | socket | 1487 | 337 | 0 | {} | 3 |
| mobo | socket | 3008 | 696 | 0 | {} | 7 |
| mobo | memory type | 3008 | 473 | 0 | {} | 7 |
| ram | memory type | 6578 | 6575 | 0 | {} | 0 |
| mobo | form factor | 3008 | 959 | 11 | {"eshop":3,"shopflix":7,"snif":1} | 0 |
| psu | form factor | 3972 | 330 | 0 | {} | 0 |
| case | size | 6893 | 6237 | 0 | {} | 1 |

All 11 contradictions are board sizes (S1 for the 2 E-ATX boards labelled ATX that the builder offers; S2 for ITX boards labelled Micro ATX):

| Category | Field | Source | Our value | Title says | Title |
| --- | --- | --- | --- | --- | --- |
| mobo | form factor | eshop | Micro ATX | Mini ITX | ASROCK A520M ITX AC RETAIL |
| mobo | form factor | shopflix | Micro ATX | Mini ITX | ASRock A520M-ITX / ac Mini ITX με AMD AM4 Socket |
| mobo | form factor | snif | Micro ATX | Mini ITX | Asrock A520M-ITX/ac AMD A520 Mini ITX με Socket AMD AM4 |
| mobo | form factor | shopflix | Micro ATX | Mini ITX | ASRock B550M-ITX / ac Mini ITX με AMD AM4 Socket |
| mobo | form factor | eshop | Micro ATX | Mini ITX | ASROCK B550M-ITX/AC RETAIL |
| mobo | form factor | shopflix | ATX | E-ATX | ASRock TRX50 WS Extended ATX με AMD sTR5 Socket |
| mobo | form factor | shopflix | ATX | E-ATX | ASRock W790 WS Extended ATX R2.0 με Intel LGA4677 Socket |
| mobo | form factor | shopflix | ATX | E-ATX | ASRock X870E Taichi Lite Wi-Fi Extended ATX με AMD AM5 Socket |
| mobo | form factor | shopflix | ATX | E-ATX | Asus Rog Maximus Z890 Extreme WiFi Extended ATX με Intel 1851 Socket |
| mobo | form factor | eshop | Micro ATX | ATX | GIGABYTE H610M K V2 D5 ATX |
| mobo | form factor | shopflix | ATX | E-ATX | Gigabyte TRX50 Aero D Wi-Fi Extended ATX με AMD sTR5 Socket |

The low "title states" shares for CPU sockets (337 of 1,487) and PSU form factors (330 of 3,972) are because BestPrice's category tail ("… για Socket AM5", "Τροφοδοτικό Υπολογιστή ATX 3.1 …") is cut from the stored titles; the scraper read it before cutting, so these fields cannot be re-checked from the stored title alone.

### Spot check: 20 random listings per category

Listings sampled uniformly per category (sorted by id, seeded RNG `mulberry32(20261003 + category index)`), judged by hand against the title, the URL and the spec-cache entry. Fields judged: the identity/key fields shown in each sample (socket, memory type, form factor/size; and chip/VRAM, capacity/interface, kit, watts, pack, cooler type/radiator, cooler-in-box, sockets, height). **error** = a field (or the model name, when it splits the listing from its product) contradicts the title, URL or spec cache; **missing** = the title states a value but the field is empty (not an error); **unclear** = cannot be judged from the title/URL/spec cache. A few verdicts use general hardware knowledge and say so (e.g. a Micron `MTA36ASF…72PZ` part number is an ECC registered DIMM).

| Category | Sampled | Errors | Error rate | 95% Wilson interval | Missing (title states, field empty) | Unclear |
| --- | --- | --- | --- | --- | --- | --- |
| gpu | 20 | 0 | 0.0% | 0.0–16.1% | 0 | 0 |
| cpu | 20 | 3 | 15.0% | 5.2–36.0% | 2 | 0 |
| mobo | 20 | 0 | 0.0% | 0.0–16.1% | 0 | 0 |
| ram | 20 | 2 | 10.0% | 2.8–30.1% | 4 | 0 |
| storage | 20 | 2 | 10.0% | 2.8–30.1% | 0 | 0 |
| psu | 20 | 1 | 5.0% | 0.9–23.6% | 0 | 2 |
| case | 20 | 2 | 10.0% | 2.8–30.1% | 0 | 2 |
| fan | 20 | 2 | 10.0% | 2.8–30.1% | 0 | 1 |
| cooler | 20 | 5 | 25.0% | 11.2–46.9% | 3 | 1 |

**How confident:** 20 samples per category is a coarse check. With 0 errors in 20 the true error rate can still be up to ~16%; with 5 in 20 it lies roughly between 11% and 47%. The intervals overlap across most categories, so the ranking between categories is not reliable; what the samples do show is *which kinds* of errors occur (CPU cooler-in-box, cooler names/sockets/heights, RAM kits, family-card titles), and those are counted over all listings in sections 2–3.

<details><summary>Spot-check samples and verdicts — GPU</summary>

| # | Source | Title | Key fields | Spec cache | Verdict |
| --- | --- | --- | --- | --- | --- |
| 1 | skroutz | MSI GeForce RTX 5060 8GB Ventus 2X OC White | chip=RTX 5060, vram=8, partner=MSI, memType=GDDR7, lengthMm=197, minPsu=550 | lengthMm=197, minPsu=550 | ok |
| 2 | skroutz | MSI Radeon RX 580 8GB Armor OC | chip=RX 580, vram=8, partner=MSI, memType=GDDR5, lengthMm=269, minPsu=500 | lengthMm=269, minPsu=500 | ok |
| 3 | shopflix | Zotac GeForce RTX 5060 8GB GDDR7 Twin Edge Plus | chip=RTX 5060, vram=8, partner=Zotac, memType=GDDR7, lengthMm=220.5, minPsu=550 |  | ok |
| 4 | shopflix | MSI GeForce RTX 3050 6GB GDDR6 Ventus 2X OC | chip=RTX 3050, vram=6, partner=MSI, memType=GDDR6, lengthMm=189, minPsu=300 |  | ok: minPsu 300: NVIDIA lists 300 W for the RTX 3050 6GB (general knowledge); the builder's chip table says 550 (8GB model) |
| 5 | skroutz | Gigabyte GeForce RTX 5070 Ti 16GB Eagle OC Ice SFF | chip=RTX 5070 Ti, vram=16, partner=Gigabyte, memType=GDDR7, lengthMm=304, minPsu=750 | lengthMm=304, minPsu=750 | ok |
| 6 | bestprice | Palit GeForce RTX 5070 12GB GDDR7 Infinity 3 Black | chip=RTX 5070, vram=12, partner=Palit, memType=GDDR7, lengthMm=291.9 | lengthMm=291.9, minPsu=null | ok |
| 7 | shopflix | Zotac GeForce RTX 3060 12GB GDDR6 Twin Edge OC | chip=RTX 3060, vram=12, partner=Zotac, memType=GDDR6, lengthMm=224.1, minPsu=600 |  | ok |
| 8 | skroutz | MSI GeForce RTX 4060 Ti 16GB Ventus 2X Black OC | chip=RTX 4060 Ti, vram=16, partner=MSI, memType=GDDR6, lengthMm=199, minPsu=550 |  | ok |
| 9 | bestprice | XFX Radeon RX 9070 16GB GDDR6 Swift OC White 90mm Fan | chip=RX 9070, vram=16, partner=XFX, memType=GDDR6, lengthMm=290 | lengthMm=290, minPsu=null | ok |
| 10 | eshop | SAPPHIRE AMD RADEON RX9060 XT GAMING OC NITRO+ 16GB GDDR6 RETAIL | chip=RX 9060 XT, vram=16, partner=Sapphire, memType=GDDR6 |  | ok: length not known (missing, title does not state it) |
| 11 | snif | GIGABYTE VGA GV-N5080AORUS M-16GD, 16GB , GDDR7 | chip=RTX 5080, vram=16, partner=Gigabyte, memType=GDDR7, lengthMm=360, minPsu=850 |  | ok: chip decoded from the Gigabyte part number GV-N5080… |
| 12 | snif | Gigabyte GeForce RTX 5070 Eagle OC ICE SFF 12GB GDDR7 GV-N5070EAGLEOC-ICE-12GD | chip=RTX 5070, vram=12, partner=Gigabyte, memType=GDDR7, lengthMm=290, minPsu=750 |  | ok |
| 13 | shopflix | Gigabyte GeForce RTX 5060 Ti 16GB GDDR7 EAGLE MAX OC | chip=RTX 5060 Ti, vram=16, partner=Gigabyte, memType=GDDR7, lengthMm=281, minPsu=650 |  | ok |
| 14 | shopflix | XFX Radeon RX 9070 16GB GDDR6 OC White Triple Fan Gaming Edition | chip=RX 9070, vram=16, partner=XFX, memType=GDDR6, lengthMm=325, minPsu=800 |  | ok |
| 15 | bestprice | PowerColor Radeon RX 9070 XT 16GB GDDR6 Hellhound Resonance Edition | chip=RX 9070 XT, vram=16, partner=PowerColor, memType=GDDR6, lengthMm=340 | lengthMm=340, minPsu=null | ok |
| 16 | bestprice | PNY Quadro RTX 4000 SFF 20GB GDDR6 | chip=RTX 4000 (Pro), vram=20, partner=PNY, memType=GDDR6 |  | ok: chip label 'RTX 4000 (Pro)' covers both the Turing Quadro RTX 4000 and the RTX 4000 SFF Ada (20GB); separated only by VRAM |
| 17 | shopflix | Gigabyte GeForce RTX 5060 8GB GDDR7 Eagle MAX OC | chip=RTX 5060, vram=8, partner=Gigabyte, memType=GDDR7, lengthMm=281, minPsu=550 |  | ok |
| 18 | shopflix | Gigabyte GeForce RTX 5060 Ti 8GB GDDR7 Eagle OC | chip=RTX 5060 Ti, vram=8, partner=Gigabyte, memType=GDDR7, lengthMm=215, minPsu=650 |  | ok |
| 19 | shopflix | ASRock Radeon RX 9070 XT 16GB GDDR6 Steel Legend | chip=RX 9070 XT, vram=16, partner=ASRock, memType=GDDR6, lengthMm=298, minPsu=800 |  | ok |
| 20 | bestprice | Sparkle Arc A310 4GB GDDR6 Omni View | chip=Arc A310, vram=4, partner=Sparkle, memType=GDDR6, lengthMm=152.6, minPsu=350 |  | ok |

</details>

<details><summary>Spot-check samples and verdicts — CPU</summary>

| # | Source | Title | Key fields | Spec cache | Verdict |
| --- | --- | --- | --- | --- | --- |
| 1 | skroutz | AMD Epyc 7643 2.6GHz Tray | chip=EPYC 7643, socket=SP3, cores=48, packaging=Tray, igpu=false, coolerIncluded=false |  | ok |
| 2 | skroutz | Intel Xeon Silver 4514Y 2GHz Tray | chip=Xeon Silver 4514Y, socket=LGA4677, cores=16, packaging=Tray, igpu=false, coolerIncluded=false |  | ok |
| 3 | snif | AMD Ryzen 7 7700X 4.5 GHz Six Core 32 MB L3 | chip=Ryzen 7 7700X, socket=AM5, cores=8, igpu=true, tdp=105 |  | ok: title says 'Six Core'; cores = 8 is right (shared from other listings) |
| 4 | bestprice | Intel Core i5 14500T Tray | chip=Core i5-14500T, socket=LGA1700, cores=14, packaging=Tray, igpu=true, coolerIncluded=false |  | ok |
| 5 | bestprice | AMD Ryzen 5 7400 Tray | chip=Ryzen 5 7400, socket=AM5, cores=6, packaging=Tray, igpu=true, coolerIncluded=false, tdp=65 |  | error: coolerIncluded=false but the BestPrice URL says '…-tray-…-me-psyktra' (with cooler) |
| 6 | bestprice | Intel Xeon w5-2465X Tray | chip=Xeon w5-2465X, socket=LGA4677, cores=16, packaging=Tray, igpu=false, coolerIncluded=false |  | ok |
| 7 | skroutz | Intel Core i7-13700 2.1GHz Tray | chip=Core i7-13700, socket=LGA1700, cores=16, packaging=Tray, igpu=true, coolerIncluded=false |  | ok |
| 8 | shopflix | Intel Core i5-12400F 2.5GHz 6 Πυρήνων για Socket 1700 σε Κουτί με Ψύκτρα | chip=Core i5-12400F, socket=LGA1700, cores=6, igpu=false, tdp=65 |  | missing: title 'σε Κουτί με Ψύκτρα' (box with cooler): packaging and coolerIncluded null |
| 9 | eshop | INTEL CORE I7-14700K 3.4GHZ LGA1700 - BOX | chip=Core i7-14700K, socket=LGA1700, cores=20, packaging=Box, igpu=true, tdp=125 |  | ok: coolerIncluded null (K box has none: unknown, not wrong) |
| 10 | bestprice | AMD Epyc 4464P Tray | chip=EPYC 4464P, socket=AM5, cores=12, packaging=Tray, igpu=false, coolerIncluded=false |  | ok |
| 11 | shopflix | AMD Ryzen 5 5500 3.6GHz 6 Πυρήνων για Socket AM4 σε Tray με Ψύκτρα | chip=Ryzen 5 5500, socket=AM4, cores=6, packaging=Tray, igpu=false, coolerIncluded=false, tdp=65 |  | error: coolerIncluded=false but the title says 'σε Tray με Ψύκτρα' (tray with cooler) |
| 12 | bestprice | Intel Core i5-12600K Tray | chip=Core i5-12600K, socket=LGA1700, cores=10, packaging=Tray, igpu=true, coolerIncluded=false, tdp=125 |  | ok |
| 13 | bestprice | AMD Ryzen 9 Pro 7945 Tray | chip=Ryzen 9 PRO 7945, socket=AM5, cores=12, packaging=Tray, igpu=true, coolerIncluded=false |  | error: coolerIncluded=false but the BestPrice URL says '…-tray-…-me-psyktra' |
| 14 | shopflix | Intel Core i5-12400 2.5GHz 6 Πυρήνων για Socket 1700 Tray | chip=Core i5-12400, socket=LGA1700, cores=6, packaging=Tray, igpu=true, coolerIncluded=false, tdp=65 |  | ok |
| 15 | shopflix | AMD Ryzen 7 Pro 8700G 4.2GHz | chip=Ryzen 7 PRO 8700G, socket=AM5, cores=8, packaging=Tray, igpu=true, coolerIncluded=false |  | ok |
| 16 | shopflix | AMD Ryzen 9 7900X3D 4.4GHz 12 Πυρήνων για Socket AM5 Tray | chip=Ryzen 9 7900X3D, socket=AM5, cores=12, packaging=Tray, igpu=true, coolerIncluded=false, tdp=120 |  | ok |
| 17 | shopflix | Intel Xeon E-2356G 3.2GHz 6 Πυρήνων για Socket 1200 Tray | chip=Xeon E-2356G, socket=LGA1200, cores=6, packaging=Tray, igpu=true, coolerIncluded=false |  | ok |
| 18 | snif | Intel Core i9-14900 1.5 GHz | chip=Core i9-14900, socket=LGA1700, cores=24, igpu=true, tdp=219 |  | ok: tdp 219 is the turbo power (PL2), not the 65 W base TDP |
| 19 | shopflix | Intel Core i9-14900 2GHz 24 Πυρήνων για Socket 1700 σε Κουτί με Ψύκτρα | chip=Core i9-14900, socket=LGA1700, cores=24, igpu=true, tdp=219 |  | missing: title 'σε Κουτί με Ψύκτρα': packaging and coolerIncluded null |
| 20 | bestprice | AMD Ryzen Threadripper Pro 9995WX Box | chip=Threadripper PRO 9995WX, socket=sTR5, cores=96, packaging=Box, igpu=false, tdp=350 |  | ok |

</details>

<details><summary>Spot-check samples and verdicts — Motherboards</summary>

| # | Source | Title | Key fields | Spec cache | Verdict |
| --- | --- | --- | --- | --- | --- |
| 1 | shopflix | Asus ROG Strix B650E-I Gaming Wi-Fi Mini ITX με AMD AM5 Socket | chip=Asus ROG Strix B650E-I Gaming WiFi, chipset=B650E, socket=AM5, formFactor=Mini ITX, memory=DDR5, wifi=true, ramSlots=2 |  | ok |
| 2 | bestprice | Biostar B650MS2-E | chip=Biostar B650MS2-E, chipset=B650, socket=AM5, formFactor=Micro ATX, memory=DDR5, wifi=false, ramSlots=2 |  | ok |
| 3 | bestprice | Gigabyte B850 AORUS Elite WiFi7 Ice | chip=Gigabyte B850 AORUS Elite WiFi 7 Ice, chipset=B850, socket=AM5, formFactor=ATX, memory=DDR5, wifi=true, ramSlots=4 |  | ok |
| 4 | snif | Maxsun Challenger B760M-N D5 Socket 1700, DDR5 | chip=Maxsun Challenger B760M-N, chipset=B760, socket=LGA1700, formFactor=Micro ATX, memory=DDR5, wifi=false |  | ok |
| 5 | skroutz | Gigabyte H610M S2H V2 rev. 1.0 | chip=Gigabyte H610M S2H V2, chipset=H610, socket=LGA1700, formFactor=Micro ATX, memory=DDR5, wifi=false, ramSlots=2 |  | ok: DDR5 not stated in the title (cannot be confirmed from title/URL) |
| 6 | eshop | ASUS TUF GAMING B650E-PLUS WIFI RETAIL | chip=Asus TUF GAMING B650E-PLUS WiFi, chipset=B650E, socket=AM5, formFactor=ATX, memory=DDR5, wifi=true, ramSlots=4 |  | ok |
| 7 | bestprice | Gigabyte X870 Aorus Stealth Ice | chip=Gigabyte X870 Aorus Stealth Ice, chipset=X870, socket=AM5, formFactor=ATX, memory=DDR5, wifi=false, ramSlots=4 |  | ok: wifi=false only means the title does not say WiFi (X870 boards have WiFi 7: general knowledge) |
| 8 | bestprice | Gigabyte B850M Force | chip=Gigabyte B850M Force, chipset=B850, socket=AM5, formFactor=Micro ATX, memory=DDR5, wifi=false, ramSlots=2 |  | ok |
| 9 | bestprice | MSI B550-A Pro | chip=MSI B550-A Pro, chipset=B550, socket=AM4, formFactor=ATX, memory=DDR4, wifi=false, ramSlots=4 |  | ok |
| 10 | skroutz | Gigabyte B760 Gaming X WIFI6E GEN5 | chip=Gigabyte B760 Gaming X WiFi 6E GEN5, chipset=B760, socket=LGA1700, formFactor=ATX, memory=DDR5, wifi=true, ramSlots=4 |  | ok |
| 11 | eshop | ASUS PRIME B860M-A WIFI LGA1851 D5 RETAIL | chip=Asus PRIME B860M-A WiFi, chipset=B860, socket=LGA1851, formFactor=Micro ATX, memory=DDR5, wifi=true, ramSlots=4 |  | ok |
| 12 | bestprice | MSI MPG B860I Edge TI WiFi | chip=MSI MPG B860I Edge TI WiFi, chipset=B860, socket=LGA1851, formFactor=Mini ITX, memory=DDR5, wifi=true, ramSlots=2 |  | ok |
| 13 | shopflix | Asus Prime B760M-A WIFI II Motherboard Micro ATX με Intel 1700 Socket 90MB1NF0-M0EAY0 | chip=Asus Prime B760M-A WiFi II, chipset=B760, socket=LGA1700, formFactor=Micro ATX, memory=DDR5, wifi=true, ramSlots=4 |  | ok |
| 14 | bestprice | MSI Pro Z890-P WiFi | chip=MSI Pro Z890-P WiFi, chipset=Z890, socket=LGA1851, formFactor=ATX, memory=DDR5, wifi=true, ramSlots=4 |  | ok |
| 15 | bestprice | Gigabyte MC13-LE1 | chip=Gigabyte MC13-LE1, socket=AM5, formFactor=Micro ATX, memory=DDR5, wifi=false, ramSlots=4 |  | ok |
| 16 | bestprice | Asrock A620AM-P WIFI | chip=ASRock A620AM-P WiFi, chipset=A620, socket=AM5, formFactor=Micro ATX, memory=DDR5, wifi=true, ramSlots=2 |  | ok |
| 17 | bestprice | Asus TUF Gaming X870E-Plus WiFi7 | chip=Asus TUF Gaming X870E-Plus WiFi 7, chipset=X870E, socket=AM5, formFactor=ATX, memory=DDR5, wifi=true, ramSlots=4 |  | ok |
| 18 | bestprice | Gigabyte B760M DS3H WiFi6E GEN5 | chip=Gigabyte B760M DS3H WiFi 6E GEN5, chipset=B760, socket=LGA1700, formFactor=Micro ATX, memory=DDR5, wifi=true, ramSlots=4 |  | ok |
| 19 | bestprice | Asrock X870E Challenger WiFi | chip=ASRock X870E Challenger WiFi, chipset=X870E, socket=AM5, formFactor=ATX, memory=DDR5, wifi=true, ramSlots=4 |  | ok |
| 20 | eshop | ASROCK B860M PRO RS WIFI MICRO-ATX | chip=ASRock B860M PRO RS WiFi, chipset=B860, socket=LGA1851, formFactor=Micro ATX, memory=DDR5, wifi=true, ramSlots=4 |  | ok |

</details>

<details><summary>Spot-check samples and verdicts — RAM</summary>

| # | Source | Title | Key fields | Spec cache | Verdict |
| --- | --- | --- | --- | --- | --- |
| 1 | skroutz | 2 Power 8GB DDR4 MEM9603A | chip=DDR4 8GB (1×8GB) 3200MHz, type=DDR4, capacity=8, modules=1, speed=3200, formFactor=Desktop |  | ok |
| 2 | bestprice | Kingston 16GB (1X16GB) DDR4 3200MHz SoDimm KTH-PN432E/16G | chip=DDR4 16GB (1×16GB) 3200MHz, type=DDR4, capacity=16, modules=1, speed=3200, formFactor=Laptop |  | ok |
| 3 | shopflix | G.Skill Trident Z5 DDR5 32GB 2x16 | chip=DDR5 32GB (1×32GB), type=DDR5, capacity=32, modules=1, formFactor=Desktop |  | error: title 'DDR5 32GB 2x16' but model DDR5 32GB (1×32GB): the kit '2x16' without 'GB' is not read |
| 4 | bestprice | Corsair Vengeance 32GB (2X16GB) DDR5 RAM 4800MHz C40 Black | chip=DDR5 32GB (2×16GB) 4800MHz, type=DDR5, capacity=32, modules=2, speed=4800, cas=40, formFactor=Desktop |  | ok |
| 5 | skroutz | 8GB DDR3 1-RAM0017 | chip=DDR3 8GB (1×8GB) 1333MHz, type=DDR3, capacity=8, modules=1, speed=1333, formFactor=Laptop |  | ok |
| 6 | snif | G.Skill Aegis F4-2666C19D-32GIS DDR4 2666MHz (2x16GB) | chip=DDR4 32GB (2×16GB) 2666MHz, type=DDR4, capacity=32, modules=2, speed=2666, cas=19, formFactor=Desktop |  | ok |
| 7 | snif | SILICON POWER μνήμη DDR4 UDIMM XPOWER Zenith 2x 16GB, RGB, 3200MHz, CL16 | chip=DDR4 32GB (2×16GB) 3200MHz, type=DDR4, capacity=32, modules=2, speed=3200, cas=16, formFactor=Desktop |  | ok |
| 8 | bestprice | Kingston Fury Beast 32GB (2X16GB) DDR5 RAM 6000MHz C36 | chip=DDR5 32GB (2×16GB) 6000MHz, type=DDR5, capacity=32, modules=2, speed=6000, cas=36, formFactor=Desktop |  | ok |
| 9 | shopflix | Kingston Fury Beast 16GB DDR4 με Ταχύτητα 3600 για Desktop | chip=DDR4 16GB (1×16GB), type=DDR4, capacity=16, modules=1, formFactor=Desktop |  | missing: title 'με Ταχύτητα 3600': speed null |
| 10 | shopflix | CoreParts 4GB DDR3 με Ταχύτητα 1600 για Desktop | chip=DDR3 4GB (1×4GB), type=DDR3, capacity=4, modules=1, formFactor=Desktop |  | missing: title 'με Ταχύτητα 1600': speed null |
| 11 | bestprice | Micron 64GB (1X64GB) DDR4 RAM 3200MHz MTA36ASF8G72PZ-3G2R | chip=DDR4 64GB (1×64GB) 3200MHz, type=DDR4, capacity=64, modules=1, speed=3200, formFactor=Desktop |  | error: formFactor Desktop, but the part number MTA36ASF8G72PZ is an ECC registered DIMM (server) — judged from the part number (general knowledge), not the title text |
| 12 | bestprice | Adata XPG Lancer Blade 16GB (2X8GB) DDR5 RAM 5600MHz C46 Black | chip=DDR5 16GB (2×8GB) 5600MHz, type=DDR5, capacity=16, modules=2, speed=5600, cas=46, formFactor=Desktop |  | ok |
| 13 | shopflix | G.Skill Ripjaws M5 RGB DDR5 32GB RAM με 2x16GB Modules & Ταχύτητα 6800 για Desktop | chip=DDR5 32GB (2×16GB), type=DDR5, capacity=32, modules=2, formFactor=Desktop |  | missing: title 'Ταχύτητα 6800': speed null |
| 14 | skroutz | Kingston Fury Renegade 24GB DDR5 | chip=DDR5 24GB (1×24GB) 8000MHz, type=DDR5, capacity=24, modules=1, speed=8000, cas=38, formFactor=Desktop |  | ok |
| 15 | eshop | SILICON POWER 4GB DDR4 2666MHZ CL19 SP004GBLFU266X02 | chip=DDR4 4GB (1×4GB) 2666MHz, type=DDR4, capacity=4, modules=1, speed=2666, cas=19, formFactor=Desktop |  | ok |
| 16 | shopflix | Kingston 64GB DDR5 με Ταχύτητα 5600 για Server | chip=DDR5 64GB (1×64GB), type=DDR5, capacity=64, modules=1, formFactor=Server |  | missing: title 'με Ταχύτητα 5600': speed null |
| 17 | skroutz | TeamGroup Elite DDR3L | chip=DDR3 8GB (1×8GB) 1600MHz, type=DDR3, capacity=8, modules=1, speed=1600, cas=11, formFactor=Laptop |  | ok |
| 18 | snif | Ram Kingston Fury Beast 16GB (2x8GB) DDR4-3200MHz CL16 KF432C16BBK2/16 Black | chip=DDR4 16GB (2×8GB) 3200MHz, type=DDR4, capacity=16, modules=2, speed=3200, cas=16, formFactor=Desktop |  | ok |
| 19 | bestprice | Adata XPG Lancer Blade 32GB (2X16GB) DDR5 RAM 6000MHz C30 White | chip=DDR5 32GB (2×16GB) 6000MHz, type=DDR5, capacity=32, modules=2, speed=6000, cas=30, formFactor=Desktop |  | ok |
| 20 | bestprice | GoodRam IRDM 16GB (1X16GB) DDR5 RAM 7600MHz C36 Black | chip=DDR5 16GB (1×16GB) 7600MHz, type=DDR5, capacity=16, modules=1, speed=7600, cas=36, formFactor=Desktop |  | ok |

</details>

<details><summary>Spot-check samples and verdicts — Storage</summary>

| # | Source | Title | Key fields | Spec cache | Verdict |
| --- | --- | --- | --- | --- | --- |
| 1 | skroutz | Fujitsu 8TB 3.5" 7200rpm PY-BH8T7E6 | chip=Fujitsu PY-BH8T7E6 8TB, media=HDD, iface=SATA, formFactor=3.5", capacity=8000, tier=Server, rpm=7200 |  | ok |
| 2 | shopflix | Corsair MP600 Elite SSD Σκληρός Δίσκος 1TB M.2 NVMe PCI Express 3.0 | chip=Corsair MP600 Elite 1TB, media=SSD, iface=NVMe, pcie=3, formFactor=M.2 2280, capacity=1000, tier=Consumer, dram=false, readMBs=7000 |  | error: pcie 3 (the Shopflix title says PCI Express 3.0) with readMBs 7000, impossible on PCIe 3.0; other sites list the MP600 Elite as PCIe 4.0 |
| 3 | bestprice | SanDisk Plus SSD 2TB 2.5" Sata 3 | chip=SanDisk Plus 2TB, media=SSD, iface=SATA, formFactor=2.5", capacity=2000, tier=Consumer |  | ok |
| 4 | shopflix | Origin Storage Tlc830 SSD Σκληρός Δίσκος 1TB | chip=Origin Storage Tlc830 1TB, media=SSD, capacity=1000, tier=Consumer |  | ok: interface and form factor unknown (title does not state them) |
| 5 | bestprice | Samsung PM9D3a SSD 15.4TB U.2 NVMe PCI Express 5.0 | chip=Samsung PM9D3a 15.4TB, media=SSD, iface=NVMe, pcie=5, formFactor=U.2, capacity=15400, tier=Server |  | ok |
| 6 | eshop | SSD WESTERN DIGITAL WDS500G3B0B BLUE SA510 500GB M.2 2280 SATA 3 | chip=Western Digital BLUE SA510 500GB M.2, media=SSD, iface=SATA, formFactor=M.2 2280, capacity=500, tier=Consumer |  | ok |
| 7 | bestprice | Synology SAT5220 SSD 960GB 2.5" Sata 3 | chip=Synology SAT5220 960GB, media=SSD, iface=SATA, formFactor=2.5", capacity=960, tier=NAS |  | ok |
| 8 | skroutz | Fujitsu 512GB 2.5'' S26462-F4625-L514 | chip=Fujitsu S26462-F4625-L514 512GB, media=SSD, iface=SATA, formFactor=2.5", capacity=512, tier=Server |  | ok |
| 9 | bestprice | TeamGroup GX2 SSD 512GB 2.5" Sata 3 | chip=TeamGroup GX2 512GB, media=SSD, iface=SATA, formFactor=2.5", capacity=512, tier=Consumer |  | ok |
| 10 | shopflix | Hiksemi Wave SSD Σκληρός Δίσκος 1TB M.2 NVMe PCI Express 3.0 | chip=Hiksemi Wave 1TB, media=SSD, iface=NVMe, pcie=3, formFactor=M.2 2280, capacity=1000, tier=Consumer |  | ok |
| 11 | bestprice | Seagate SkyHawk 6TB HDD Σκληρός Δίσκος 3.5" Sata 3 5400rpm με 256MB Cache | chip=Seagate SkyHawk 6TB, media=HDD, iface=SATA, formFactor=3.5", capacity=6000, tier=NAS, rpm=5400 |  | ok |
| 12 | bestprice | Dell 345-BGSY SSD 960GB 2.5" SATA 3 | chip=Dell 345-BGSY 960GB, media=SSD, iface=SATA, formFactor=2.5", capacity=960, tier=Server |  | ok |
| 13 | bestprice | OWC Aura SSD 4TB M.2 NVMe PCI Express 3.0 | chip=Owc Aura 4TB, media=SSD, iface=NVMe, pcie=3, formFactor=M.2 2280, capacity=4000, tier=Consumer |  | ok |
| 14 | snif | Δίσκος SSD Kioxia Exceria 480GB 2.5" Sata III LTC10Z480GG8 | chip=Kioxia Exceria 480GB, media=SSD, iface=SATA, formFactor=2.5", capacity=480, tier=Consumer |  | ok |
| 15 | shopflix | HDD Σκληρός Δίσκος Seagate BarraCuda 20TB 3.5" SATA III 7200rpm με 512MB Cache για Desktop | chip=Seagate BarraCuda 20TB, media=HDD, iface=SATA, formFactor=3.5", capacity=20000, tier=Consumer, rpm=7200 |  | ok |
| 16 | shopflix | Western Digital Black SN850X με Heatsink SSD Σκληρός Δίσκος 2TB M.2 NVMe PCI Express 4.0 | chip=Western Digital Black SN850X Heatsink 2TB, media=SSD, iface=NVMe, pcie=4, formFactor=M.2 2280, capacity=2000, tier=Consumer |  | ok |
| 17 | bestprice | Western Digital Blue 4TB HDD Σκληρός Δίσκος 3.5" SATA 3 5400rpm με 128MB Cache WD40EZZX | chip=Western Digital Blue 4TB, media=HDD, iface=SATA, formFactor=3.5", capacity=4000, tier=Consumer, rpm=5400 |  | ok |
| 18 | skroutz | Lenovo 512GB M.2 FRU01FR511 | chip=Lenovo FRU01FR511 512GB, media=SSD, iface=NVMe, pcie=3, formFactor=M.2 2280, capacity=512, tier=Server |  | error: Lenovo FRU01FR511 (ThinkPad laptop M.2 part) has tier Server; the 2026-10-03 OEM-laptop-M.2 rule drops it from the next scrape on |
| 19 | eshop | SSD SAMSUNG PM9A3 960GB PCIE GEN4 X4 NVME 2.5 INCH U.2 DATA CENTER MZQL2960HCJR | chip=Samsung PM9A3 960GB, media=SSD, iface=NVMe, pcie=4, formFactor=U.2, capacity=960, tier=Server |  | ok |
| 20 | skroutz | CoreParts 512GB M.2 W125837128 | chip=CoreParts W125837128 512GB, media=SSD, formFactor=M.2 2280, capacity=512, tier=Consumer |  | ok: interface unknown (title does not state it) |

</details>

<details><summary>Spot-check samples and verdicts — PSU</summary>

| # | Source | Title | Key fields | Spec cache | Verdict |
| --- | --- | --- | --- | --- | --- |
| 1 | snif | Lenovo Thinkcentre M57 M58 280W Power Supply PC7071 | chip=280W, watts=280, formFactor=ATX |  | unclear: Lenovo ThinkCentre OEM unit: formFactor ATX is the default, the title does not state it |
| 2 | shopflix | Cougar CGR GEXP-850 850W Μαύρο Full Modular 80 Plus Gold | chip=850W Gold, watts=850, efficiency=Gold, modular=Full, formFactor=ATX |  | ok |
| 3 | bestprice | Silverstone ST50F-ES230 500W White | chip=500W Standard, watts=500, efficiency=Standard, formFactor=ATX |  | ok |
| 4 | bestprice | Deepcool PF600X 600W | chip=600W Bronze, watts=600, efficiency=Bronze, formFactor=ATX |  | ok |
| 5 | skroutz | Xilence Performance C+ XN420 650W Full Wired 80 Plus Standard | chip=650W Standard, watts=650, efficiency=Standard, modular=Non, formFactor=ATX |  | ok |
| 6 | bestprice | Chieftec Polaris Pro 1300W | chip=1300W Platinum, watts=1300, efficiency=Platinum, formFactor=ATX |  | ok |
| 7 | eshop | MSI MAG A850GL 850W II 80+ GOLD | chip=850W Gold, watts=850, efficiency=Gold, formFactor=ATX |  | ok |
| 8 | eshop | THERMALTAKE SMART BM2 650W SEMI MODULAR 80 PLUS BRONZE | chip=650W Bronze, watts=650, efficiency=Bronze, modular=Semi, formFactor=ATX |  | ok |
| 9 | skroutz | APNX DELUXE G1 850 850W | chip=850W, watts=850, formFactor=ATX |  | ok |
| 10 | snif | Armaggeddon Voltron VG500 Full Wired 500W 80+ Bronze - Μαύρο | chip=500W Bronze, watts=500, efficiency=Bronze, modular=Non, formFactor=ATX |  | ok |
| 11 | eshop | ARMAGGEDDON PSU VOLTRON GOLD 80+ RATING 500W VG500 | chip=500W Gold, watts=500, efficiency=Gold, formFactor=ATX |  | unclear: e-shop 'VOLTRON GOLD 80+ RATING' → Gold; Snif lists the same VG500 as 80+ Bronze |
| 12 | eshop | THERMALTAKE SMART BM3 BRONZE 850W - TT PREMIUM EDITION | chip=850W Bronze, watts=850, efficiency=Bronze, formFactor=ATX |  | ok |
| 13 | shopflix | Deepcool PF750X 750W Μαύρο | chip=750W Bronze, watts=750, efficiency=Bronze, modular=Non, formFactor=ATX |  | ok |
| 14 | skroutz | MSI MAG A650BNL Full Wired 80 Plus Bronze | chip=550W Bronze, watts=550, efficiency=Bronze, modular=Non, formFactor=ATX |  | error: Skroutz title 'MSI MAG A650BNL' (650 W unit) but watts 550 from the link (A550BNL): family card, title names another variant |
| 15 | bestprice | Deepcool PN750M 750W | chip=750W Gold, watts=750, efficiency=Gold, formFactor=ATX |  | ok |
| 16 | eshop | CORSAIR RM1000X 1000W FULLY MODULAR CYBENETICS GOLD CERTIFIED CP-9020271-EU | chip=1000W Gold, watts=1000, efficiency=Gold, formFactor=ATX |  | ok |
| 17 | eshop | GIGABYTE GP-P650SS 650W 80 PLUS SILVER NO MODULAR ATX 3.1 COMPATIBLE | chip=650W Silver, watts=650, efficiency=Silver, formFactor=ATX |  | ok |
| 18 | shopflix | Enermax Revolution D.F. 2 rev. 2.0 1200W Μαύρο | chip=1200W Gold, watts=1200, efficiency=Gold, modular=Full, formFactor=ATX |  | ok |
| 19 | shopflix | FSP/Fortron Vita BD 750W Μαύρο Full Wired 80 Plus Bronze | chip=750W Bronze, watts=750, efficiency=Bronze, modular=Non, formFactor=ATX |  | ok |
| 20 | skroutz | Akyga 250W Full Wired (AK-T1-250) | chip=250W, watts=250, modular=Non, formFactor=TFX |  | ok |

</details>

<details><summary>Spot-check samples and verdicts — Cases</summary>

| # | Source | Title | Key fields | Spec cache | Verdict |
| --- | --- | --- | --- | --- | --- |
| 1 | bestprice | Thermaltake View 170 TG Pink Gaming Micro Tower RGB με Πλαϊνό Παράθυρο | chip=Thermaltake View 170, size=Mini Tower, maxBoard=Micro ATX, gpuMaxMm=340, coolerMaxMm=160, fanSlots=5, window=true |  | ok |
| 2 | shopflix | Montech Sky Two Gaming Midi Tower με RGB Φωτισμό Μαύρο | chip=Montech Sky Two, size=Midi Tower, maxBoard=ATX, gpuMaxMm=400, coolerMaxMm=168, fanSlots=6, window=true |  | ok |
| 3 | bestprice | Chieftec CM-25B-OP Midi Tower | chip=Chieftec CM-25B-OP, size=Midi Tower, maxBoard=ATX, window=false |  | ok |
| 4 | bestprice | Deepcool CG530U 4F Black Midi Tower RGB με Πλαϊνό Παράθυρο | chip=Deepcool CG530U 4F, size=Midi Tower, maxBoard=ATX, window=true |  | ok |
| 5 | shopflix | Darkflash DS900G Gaming Midi Tower με Πλαϊνό Παράθυρο Λευκό | chip=Darkflash DS900G, size=Midi Tower, maxBoard=ATX, gpuMaxMm=425, coolerMaxMm=170, fanSlots=9, window=true |  | ok |
| 6 | bestprice | Hyte Y40 White Gaming Midi Tower με Πλαϊνό Παράθυρο | chip=HYTE Y40, size=Midi Tower, maxBoard=ATX, gpuMaxMm=422, coolerMaxMm=183, fanSlots=7, window=true |  | ok |
| 7 | skroutz | Geometric Future M2 The ARK Mini Tower | chip=Geometric Future M2 The ARK, size=Mini Tower, maxBoard=Micro ATX, window=true |  | ok |
| 8 | eshop | BE QUIET PSU DARK BASE PRO 901 BLACK | chip=Be Quiet PSU DARK BASE PRO 901, size=Άλλο, window=false |  | error: name 'Be Quiet PSU DARK BASE PRO 901' keeps e-shop's 'PSU' word: a separate model from 'Be Quiet Dark Base Pro 901' (6 listings) |
| 9 | eshop | DARKFLASH DS900WS ATX ΠΕΡΙΠΤΩΣΗ ΥΠΟΛΟΓΙΣΤΗ ΧΩΡΙΣ ΑΝΕΜΙΣΤΗΡΕΣ (ΜΑΥΡΟ) | chip=Darkflash DS900WS ATX ΠΕΡΙΠΤΩΣΗ ΥΠΟΛΟΓΙΣΤΗ ΧΩΡΙΣ ΑΝΕΜΙΣΤΗΡΕΣ, size=Άλλο, maxBoard=ATX, window=false |  | error: name keeps 'ATX ΠΕΡΙΠΤΩΣΗ ΥΠΟΛΟΓΙΣΤΗ ΧΩΡΙΣ ΑΝΕΜΙΣΤΗΡΕΣ': key darkflashds900wsatx, separate from darkflashds900ws (10 listings); 'without fans' not read into fansIncluded |
| 10 | bestprice | Inter-Tech C-3 Saphir Gaming Midi Tower RGB με Πλαϊνό Παράθυρο | chip=Inter-Tech C-3 Saphir, size=Midi Tower, maxBoard=ATX, window=true |  | ok |
| 11 | shopflix | Lian Li A3 Mini Tower Λευκό | chip=Lian Li A3, size=Mini Tower, maxBoard=Micro ATX, gpuMaxMm=415, fanSlots=10, window=false |  | ok |
| 12 | shopflix | Powertech PT-1098 Mini Tower με Ενσωματωμένο Τροφοδοτικό / Προεγκατεστημένους Ανεμιστήρες Μαύρο | chip=Powertech PT-1098, size=Mini Tower, maxBoard=Mini ITX, window=false |  | unclear: maxBoard Mini ITX for a Mini Tower; not stated in the title |
| 13 | skroutz | Sharkoon VK2 RGB Gaming Midi Tower με Πλαϊνό Παράθυρο | chip=Sharkoon VK2, size=Midi Tower, maxBoard=Micro ATX, gpuMaxMm=350, coolerMaxMm=160, fanSlots=7, window=true |  | unclear: maxBoard Micro ATX for a Midi Tower; not stated in the title |
| 14 | bestprice | Fractal Design Pop 2 Air Midi Tower | chip=Fractal Design Pop 2 Air, size=Midi Tower, maxBoard=ATX, gpuMaxMm=416, coolerMaxMm=170, fanSlots=7, window=true | gpuMaxMm=416, coolerMaxMm=null, fanSlots=7, radiatorMounts=Πίσω, Άνω, maxBoard=ATX | ok |
| 15 | bestprice | Antec C3 Black Midi Tower RGB με Πλαϊνό Παράθυρο | chip=Antec C3, size=Midi Tower, maxBoard=ATX, gpuMaxMm=415, coolerMaxMm=160, fanSlots=8, window=true |  | ok |
| 16 | snif | Cougar Purity Mini - Μαύρο | chip=Cougar Purity Mini, size=Άλλο, window=false |  | ok: size unknown (title does not state it) |
| 17 | snif | Armaggeddon Tessaraxx Core 13 Air - Λευκό | chip=Armaggeddon Tessaraxx Core 13 Air, size=Άλλο, maxBoard=E-ATX, gpuMaxMm=330, coolerMaxMm=162, fanSlots=7, window=true |  | ok: size unknown (title does not state it) |
| 18 | bestprice | Zalman Chronix V2 White Gaming Midi Tower RGB με Πλαϊνό Παράθυρο | chip=Zalman Chronix V2, size=Midi Tower, maxBoard=ATX, window=true |  | ok |
| 19 | shopflix | Xigmatek NYX II Gaming Mini Tower με Πλαϊνό Παράθυρο Μαύρο | chip=Xigmatek NYX II, size=Mini Tower, maxBoard=Micro ATX, window=true |  | ok |
| 20 | skroutz | Thermaltake Core P8 TG Gaming Full Tower με Πλαϊνό Παράθυρο | chip=Thermaltake Core P8, size=Full Tower, maxBoard=E-ATX, window=true |  | ok |

</details>

<details><summary>Spot-check samples and verdicts — Fans</summary>

| # | Source | Title | Key fields | Spec cache | Verdict |
| --- | --- | --- | --- | --- | --- |
| 1 | shopflix | Ekwb FPT 140 D-RGB με Σύνδεση 4-Pin PWM Λευκό | chip=EKWB FPT 140 D-RGB 140mm, size=140, pack=1, connector=4-pin PWM, pwm=true, rgb=false |  | error: rgb=false but the title says D-RGB |
| 2 | shopflix | Preyon Eagle Eye Case Fan 120mm με ARGB Φωτισμό 3τμχ | chip=Preyon Eagle Eye 120mm ×3, size=120, pack=3, pwm=false, rgb=true |  | ok |
| 3 | eshop | NOCTUA NF-A9X14 PWM CHROMAX.BLACK.SWAP 92MM | chip=Noctua NF-A9X14 PWM CHROMAX. .SWAP 92mm, size=92, pack=1, pwm=true, rgb=false |  | ok |
| 4 | bestprice | StarTech FAN7X15TX3 Case Fan 70mm με Σύνδεση 3-Pin | chip=StarTech FAN7X15TX3 70mm, size=70, pack=1, connector=3-pin, pwm=false, rgb=false |  | ok |
| 5 | skroutz | Mars Gaming MFSI4KIT Case Fan 120mm | chip=Mars Gaming MFSI4KIT 120mm, size=120, pack=1, pwm=false, rgb=true | connector=null, airflowCfm=null, pressureMm=2.03 | unclear: 'MFSI4KIT' may be a 4-fan kit; pack 1 |
| 6 | skroutz | Thermaltake CT140 EX Case Fan 3τμχ Πράσινο | chip=Thermaltake CT140 EX 140mm ×3, size=140, pack=3, connector=4-pin PWM, pwm=true, rgb=true |  | ok |
| 7 | bestprice | Noctua NF-A12x25 G2 LS-PWM LS-PWM Case Fan 120mm με Σύνδεση 4-Pin PWM | chip=Noctua NF-A12x25 G2 LS-PWM LS-PWM 120mm, size=120, pack=1, connector=4-pin PWM, pwm=true, rgb=false |  | ok |
| 8 | shopflix | White Shark ARGB Pulsar 120mm με Σύνδεση 4-Pin Molex | chip=White Shark Pulsar 120mm, size=120, pack=1, connector=4-pin PWM, pwm=true, rgb=true |  | error: connector '4-pin PWM' but the title says '4-Pin Molex' (a power plug, not PWM) |
| 9 | bestprice | Deepcool FL14R Case Fan 140mm ARGB με Σύνδεση 3-Pin 4-Pin PWM Black | chip=Deepcool FL14R 140mm, size=140, pack=1, connector=4-pin PWM, pwm=true, rgb=true |  | ok |
| 10 | bestprice | Be Quiet Pure Wings 2 Case Fan 120mm με Σύνδεση 4-Pin PWM | chip=Be Quiet Pure Wings 2 120mm, size=120, pack=1, connector=4-pin PWM, pwm=true, rgb=false |  | ok |
| 11 | shopflix | Noctua NF-A8 ULN 80mm με Σύνδεση 3-Pin Καφέ | chip=Noctua NF-A8 ULN 80mm, size=80, pack=1, connector=3-pin, pwm=false, rgb=false |  | ok |
| 12 | bestprice | NZXT F140P Case Fan 140mm με Σύνδεση 4-Pin PWM Black | chip=NZXT F140P 140mm, size=140, pack=1, connector=4-pin PWM, pwm=true, rgb=false |  | ok |
| 13 | skroutz | Thermaltake Luna 14 LED Case Fan 140mm Κόκκινο | chip=Thermaltake Luna 14 140mm, size=140, pack=1, pwm=false, rgb=true |  | ok |
| 14 | bestprice | Arctic F12 Case Fan 120mm με Σύνδεση 4-Pin PWM 5τμχ | chip=Arctic F12 120mm ×5, size=120, pack=5, connector=4-pin PWM, pwm=true, rgb=false |  | ok |
| 15 | shopflix | Be Quiet Pure Wings 3 Reverse Case Fan 120mm 3τμχ | chip=Be Quiet Pure Wings 3 Reverse 120mm ×3, size=120, pack=3, connector=4-pin PWM, pwm=true, rgb=false |  | ok |
| 16 | shopflix | Cougar Apolar 120 με ARGB Φωτισμό & Σύνδεση 3-Pin / 4-Pin PWM Λευκό | chip=Cougar Apolar 120 120mm, size=120, pack=1, connector=4-pin PWM, pwm=true, rgb=true |  | ok |
| 17 | bestprice | Noctua NF-F120 Case Fan 120mm με Σύνδεση 4-Pin PWM | chip=Noctua NF-F120 120mm, size=120, pack=1, connector=4-pin PWM, pwm=true, rgb=false |  | ok |
| 18 | bestprice | Cougar Apolar 120 Reverse Case Fan 120mm ARGB με Σύνδεση 3-Pin 4-Pin PWM White | chip=Cougar Apolar 120 Reverse 120mm, size=120, pack=1, connector=4-pin PWM, pwm=true, rgb=true |  | ok |
| 19 | bestprice | Montech AX120 Case Fan 120mm ARGB με Σύνδεση 3-Pin 4-Pin PWM 3τμχ Black | chip=Montech AX120 120mm ×3, size=120, pack=3, connector=4-pin PWM, pwm=true, rgb=true |  | ok |
| 20 | eshop | ARCTIC P12 PRESSURE-OPTIMISED 120MM CASE FAN VALUE PACK 5PCS | chip=Arctic P12 PRESSURE-OPTIMISED 120mm ×5, size=120, pack=5, pwm=false, rgb=false |  | ok |

</details>

<details><summary>Spot-check samples and verdicts — Coolers</summary>

| # | Source | Title | Key fields | Spec cache | Verdict |
| --- | --- | --- | --- | --- | --- |
| 1 | eshop | ASUS ROG STRIX LC III 360 COOLING | chip=Asus ROG STRIX LC III 360 COOLING, type=AIO, radiator=360, rgb=false |  | error: name keeps 'COOLING': key asusrogstrixlciii360cooling, one of 6 models for the ROG Strix LC III 360 |
| 2 | skroutz | Supermicro SNK-P0094AP4 Socket AM5 | chip=Supermicro SNK-P0094AP4, type=Air, rgb=false |  | missing: title 'Socket AM5', sockets null |
| 3 | shopflix | ASRock Challenger 360 Digital Υδρόψυξη Επεξεργαστή Τριπλού Ανεμιστήρα 120mm για Socket AM4/AM5/1700… | chip=ASRock Challenger 360 Digital, type=AIO, radiator=360, sockets=AM4,AM5,LGA1700,LGA1851, rgb=true |  | ok |
| 4 | bestprice | GAMDIAS Chione P3-240U 120mm ARGB για Socket AM2 / AM2+ / AM3 / AM3+ / FM1 / FM2 / 2011 / 2066 / 20… | chip=Gamdias Chione P3-240U, type=AIO, radiator=240, sockets=AM2,AM2+,AM3,AM3+,FM1,FM2,FM2+,LGA1150,LGA1151,LGA1155,LGA1156,LGA1200,LGA1700,LGA1851,LGA2011,LGA2011-3,TR4, rgb=true |  | error: sockets lack AM4/AM5/LGA2066 although the BestPrice title lists them |
| 5 | bestprice | Arctic Freezer 34 eSports Black/White | chip=Arctic Freezer 34 eSports, type=Air, sockets=AM4,AM5,LGA1150,LGA1151,LGA1155,LGA1200,LGA2011,LGA2011-3,LGA2066, heightMm=157, rgb=false | sockets=AM4,AM5,LGA1150,LGA1151,LGA1155,LGA1200,LGA2011,LGA2011-3,LGA2066, heightMm=157 | ok |
| 6 | skroutz | Deepcool Assassin 4S Green Nvidia Limited Edition Socket AM4/AM5/1200/115x/1700 | chip=Deepcool Assassin 4S Nvidia Limited, type=Air, sockets=AM4,AM5,LGA1150,LGA1151,LGA1155,LGA1156,LGA1200,LGA1700,LGA1851,LGA2011-3,LGA2066, heightMm=164, rgb=false | sockets=AM4,AM5,LGA1150,LGA1151,LGA1155,LGA1156,LGA1200,LGA1700,LGA1851,LGA2011-3,LGA2066, heightMm=164 | ok |
| 7 | shopflix | Thermaltake Toughliquid 240 ARGB Sync Διπλού Ανεμιστήρα 120mm για Socket AM4/1200/115x | chip=Thermaltake Toughliquid 240 Sync Διπλού Ανεμιστήρα 120mm, type=AIO, radiator=240, rgb=true |  | error: name keeps 'Διπλού Ανεμιστήρα 120mm': key …240sync120mm, separate from 'Thermaltake ToughLiquid 240 Sync' (2 listings); sockets null although the title lists them |
| 8 | skroutz | Deepcool LE500 Marrs | chip=Deepcool LE500 Marrs 240, type=AIO, radiator=240, rgb=true |  | ok |
| 9 | skroutz | APNX AP1-V Socket AM4/AM5/1200/115x/1700 | chip=Apnx AP1-V, type=Air, rgb=true |  | missing: title lists sockets, sockets null |
| 10 | shopflix | Arctic Liquid Freezer III Pro 280 A-RGB Υδρόψυξη AIO CPU με 2 Ανεμιστήρες 140mm | chip=Arctic Liquid Freezer III Pro 280, type=AIO, radiator=280, sockets=AM4,AM5,LGA1700,LGA1851, rgb=true |  | ok |
| 11 | bestprice | Noctua NH-L9a-AM5 Chromax Black | chip=Noctua NH-L9a-AM5, type=Air, sockets=AM5, heightMm=37, rgb=false |  | ok |
| 12 | skroutz | Silverstone SST-XE02-4677 Socket 4677 | chip=SilverStone SST-XE02-4677, type=Air, rgb=false |  | missing: title 'Socket 4677', sockets null |
| 13 | bestprice | Noctua NH-U12A Chromax Black | chip=Noctua NH-U12A, type=Air, sockets=AM2,AM2+,AM3,AM3+,AM4,AM5,FM1,FM2,FM2+,LGA1150,LGA1151,LGA1155,LGA1156,LGA1700,LGA1851,LGA2011,LGA2066, heightMm=158, rgb=false |  | ok |
| 14 | snif | Arctic Freezer 8A Black ACFRE00161A | chip=Arctic Freezer 8A ACFRE00161A, type=Air, rgb=false |  | error: name keeps the part number ACFRE00161A: separate from 'Arctic Freezer 8A' (3 listings) |
| 15 | eshop | DEEPCOOL AK400 DIGITAL SE CPU COOLER 12CM FAN BLACK | chip=Deepcool AK400 DIGITAL SE, type=Air, sockets=AM4,AM5,LGA1150,LGA1151,LGA1155,LGA1156,LGA1200,LGA1700,LGA1851, heightMm=157, rgb=false |  | ok |
| 16 | skroutz | NZXT T120 RGB Socket AM4/AM5/1200/115x/1700 | chip=NZXT T120, type=Air, sockets=AM4,AM5,LGA1150,LGA1151,LGA1155,LGA1156,LGA1200,LGA1700,LGA1851, heightMm=159, rgb=true |  | ok |
| 17 | skroutz | Deepcool LS720 SE | chip=Deepcool LS720 SE 360, type=AIO, radiator=360, rgb=true |  | ok |
| 18 | eshop | FORCE CPU COOLER G6 245W | chip=FORCE G6 245W, type=Air, rgb=false |  | unclear: 'FORCE CPU COOLER G6 245W': nothing to check |
| 19 | shopflix | Thermalright Assassin Spirit 120 Vision για Socket 115x / 1200 / 1700 / 1851 με ARGB Φωτισμό Λευκό | chip=Thermalright Assassin Spirit 120 Vision, type=Air, sockets=AM4,AM5,LGA1150,LGA1151,LGA1155,LGA1156,LGA1200,LGA1700,LGA1851, heightMm=25.6, rgb=true |  | error: heightMm 25.6 for a tower cooler (Assassin Spirit 120 Vision is ~154 mm: general knowledge); 25 mm is a fan thickness |
| 20 | skroutz | Arctic Freezer 8i CO Socket 1700/1851 | chip=Arctic Freezer 8i CO, type=Air, sockets=LGA1700,LGA1851, heightMm=110, rgb=false | sockets=LGA1700,LGA1851, heightMm=110 | ok |

</details>

## 5. Freshness

`ok` and `count` are latest.json `sources[name]` from the latest run; "Last success" is `sources[name].updatedAt`, which the scraper keeps from the previous run when a source fails (verified: `scraper/main.py` lines 221–231, failed sources keep their previous listings and `updatedAt`). Ages are measured from the last success to the snapshot (latest.json `updatedAt`) and to "now".

"Now" used: 2026-10-03T19:28:32.873Z (the time the script ran).

| Category | Source | ok (last run) | count | Last success (sources.updatedAt) | scrapedAt oldest … newest | Age at snapshot (h) | Age now (h) | > 24 h now |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| gpu | skroutz | false | 500 | 2026-10-03T05:50:36+00:00 | 2026-10-03T05:50:36+00:00 | 6.6 | 13.6 | no |
| gpu | bestprice | true | 535 | 2026-10-03T12:27:41+00:00 | 2026-10-03T12:27:41+00:00 | 0 | 7 | no |
| gpu | snif | true | 113 | 2026-10-03T12:27:41+00:00 | 2026-10-03T12:27:41+00:00 | 0 | 7 | no |
| gpu | shopflix | true | 441 | 2026-10-03T12:27:41+00:00 | 2026-10-03T12:27:41+00:00 | 0 | 7 | no |
| gpu | eshop | true | 176 | 2026-10-03T12:27:41+00:00 | 2026-10-03T12:27:41+00:00 | 0 | 7 | no |
| cpu | skroutz | false | 418 | 2026-10-03T05:52:33+00:00 | 2026-10-03T05:52:33+00:00 | 6.6 | 13.6 | no |
| cpu | bestprice | true | 469 | 2026-10-03T12:30:52+00:00 | 2026-10-03T12:30:52+00:00 | 0 | 7 | no |
| cpu | snif | true | 88 | 2026-10-03T12:30:52+00:00 | 2026-10-03T12:30:52+00:00 | 0 | 7 | no |
| cpu | shopflix | true | 409 | 2026-10-03T12:30:52+00:00 | 2026-10-03T12:30:52+00:00 | 0 | 7 | no |
| cpu | eshop | true | 103 | 2026-10-03T12:30:52+00:00 | 2026-10-03T12:30:52+00:00 | 0 | 7 | no |
| mobo | skroutz | true | 827 | 2026-10-03T11:59:12+00:00 | 2026-10-03T11:59:12+00:00 | 0 | 7.5 | no |
| mobo | bestprice | true | 845 | 2026-10-03T11:59:12+00:00 | 2026-10-03T11:59:12+00:00 | 0 | 7.5 | no |
| mobo | snif | true | 184 | 2026-10-03T11:59:12+00:00 | 2026-10-03T11:59:12+00:00 | 0 | 7.5 | no |
| mobo | shopflix | true | 779 | 2026-10-03T11:59:12+00:00 | 2026-10-03T11:59:12+00:00 | 0 | 7.5 | no |
| mobo | eshop | true | 373 | 2026-10-03T11:59:12+00:00 | 2026-10-03T11:59:12+00:00 | 0 | 7.5 | no |
| ram | skroutz | false | 2041 | 2026-10-03T01:42:53+00:00 | 2026-10-03T01:42:53+00:00 | 10.1 | 17.8 | no |
| ram | bestprice | true | 1759 | 2026-10-03T11:51:32+00:00 | 2026-10-03T11:51:32+00:00 | 0 | 7.6 | no |
| ram | snif | true | 370 | 2026-10-03T11:51:32+00:00 | 2026-10-03T11:51:32+00:00 | 0 | 7.6 | no |
| ram | shopflix | true | 1831 | 2026-10-03T11:51:32+00:00 | 2026-10-03T11:51:32+00:00 | 0 | 7.6 | no |
| ram | eshop | true | 577 | 2026-10-03T11:51:32+00:00 | 2026-10-03T11:51:32+00:00 | 0 | 7.6 | no |
| storage | skroutz | false | 1763 | 2026-10-03T05:44:39+00:00 | 2026-10-03T05:44:39+00:00 | 6.6 | 13.7 | no |
| storage | bestprice | true | 1352 | 2026-10-03T12:21:45+00:00 | 2026-10-03T12:21:45+00:00 | 0 | 7.1 | no |
| storage | snif | true | 140 | 2026-10-03T12:21:45+00:00 | 2026-10-03T12:21:45+00:00 | 0 | 7.1 | no |
| storage | shopflix | true | 1235 | 2026-10-03T12:21:45+00:00 | 2026-10-03T12:21:45+00:00 | 0 | 7.1 | no |
| storage | eshop | true | 549 | 2026-10-03T12:21:45+00:00 | 2026-10-03T12:21:45+00:00 | 0 | 7.1 | no |
| psu | skroutz | false | 1098 | 2026-10-03T01:51:46+00:00 | 2026-10-03T01:51:46+00:00 | 9.8 | 17.6 | no |
| psu | bestprice | true | 1189 | 2026-10-03T11:42:28+00:00 | 2026-10-03T11:42:28+00:00 | 0 | 7.8 | no |
| psu | snif | true | 241 | 2026-10-03T11:42:28+00:00 | 2026-10-03T11:42:28+00:00 | 0 | 7.8 | no |
| psu | shopflix | true | 1145 | 2026-10-03T11:42:28+00:00 | 2026-10-03T11:42:29+00:00 | 0 | 7.8 | no |
| psu | eshop | true | 299 | 2026-10-03T11:42:28+00:00 | 2026-10-03T11:42:28+00:00 | 0 | 7.8 | no |
| case | skroutz | true | 2115 | 2026-10-03T12:04:16+00:00 | 2026-10-03T12:04:16+00:00 | 0 | 7.4 | no |
| case | bestprice | true | 2048 | 2026-10-03T12:04:16+00:00 | 2026-10-03T12:04:16+00:00 | 0 | 7.4 | no |
| case | snif | true | 260 | 2026-10-03T12:04:16+00:00 | 2026-10-03T12:04:16+00:00 | 0 | 7.4 | no |
| case | shopflix | true | 1938 | 2026-10-03T12:04:16+00:00 | 2026-10-03T12:04:16+00:00 | 0 | 7.4 | no |
| case | eshop | true | 532 | 2026-10-03T12:04:16+00:00 | 2026-10-03T12:04:16+00:00 | 0 | 7.4 | no |
| fan | skroutz | false | 1143 | 2026-10-03T05:22:05+00:00 | 2026-10-03T05:22:05+00:00 | 6.8 | 14.1 | no |
| fan | bestprice | true | 1353 | 2026-10-03T12:10:58+00:00 | 2026-10-03T12:10:58+00:00 | 0 | 7.3 | no |
| fan | snif | true | 168 | 2026-10-03T12:10:58+00:00 | 2026-10-03T12:10:58+00:00 | 0 | 7.3 | no |
| fan | shopflix | true | 980 | 2026-10-03T12:10:58+00:00 | 2026-10-03T12:10:58+00:00 | 0 | 7.3 | no |
| fan | eshop | true | 368 | 2026-10-03T12:10:58+00:00 | 2026-10-03T12:10:58+00:00 | 0 | 7.3 | no |
| cooler | skroutz | false | 1343 | 2026-10-03T05:39:34+00:00 | 2026-10-03T05:39:34+00:00 | 6.6 | 13.8 | no |
| cooler | bestprice | true | 1224 | 2026-10-03T12:16:31+00:00 | 2026-10-03T12:16:31+00:00 | 0 | 7.2 | no |
| cooler | snif | true | 185 | 2026-10-03T12:16:31+00:00 | 2026-10-03T12:16:31+00:00 | 0 | 7.2 | no |
| cooler | shopflix | true | 1002 | 2026-10-03T12:16:31+00:00 | 2026-10-03T12:16:31+00:00 | 0 | 7.2 | no |
| cooler | eshop | true | 304 | 2026-10-03T12:16:31+00:00 | 2026-10-03T12:16:31+00:00 | 0 | 7.2 | no |

- **No source/category is older than 24 h** at "now" (oldest: RAM and PSU Skroutz data, 17.7 h and 17.5 h).
- **Skroutz failed in the latest run for 7 of 9 categories** (GPU, CPU, RAM, storage, PSU, fans, coolers; only boards and cases succeeded). Its kept listings are 6.6–10.1 h older than the snapshot. History only records sources with `ok = true` (verified: `main.py` `fresh`), so these categories' history for this run has no Skroutz point. Severity S4 now; it becomes S2 if it persists past 24 h (the plan's rule "price older than 24 h is marked").
- `scrapedAt` is the run time of each source (oldest = newest for every source), not a per-listing check time, so it cannot show which individual prices are stale. The shipping totals have their own `checked` time in `offers.json` (not audited here).

## Method and limits

- **Inputs:** only the committed files listed at the top and the pre-built derived files; no network, no scraper run. The live site may already hold a newer scrape. The `v2` branch's `public/data` equals data commit `d1dcaab` (2026-10-03 12:52 UTC).
- **Grouping:** `MODEL_KEY` in `scripts/audit/data-quality/lib.mjs` mirrors `modelKey` in `src/lib/categories.tsx`; `run-all.mjs` stops if the model counts differ from `manifest.json` (they match: 97 / 421 / 1,215 / 489 / 2,346 / 186 / 2,609 / 2,005 / 2,113).
- **Heuristics:** every title parser in `derive.mjs` is simple and was tuned by looking at its hits; counts are what those parsers find, not a complete census. Part-number, vendor-name and filler-word duplicate checks have false positives (e.g. Noctua "NF-P14r Redux-1500" and "NF-P14s Redux-1500" share a series token); they are labelled medium/low confidence and their examples should be read, not just counted. The RDIMM part-number list, the GPU VRAM table and statements such as "RTX 3050 6GB needs 300 W" come from general hardware knowledge, not from pages fetched in this audit.
- **Root causes:** "verified" means the mechanism was traced in the named file/function in this repo; anything that depends on what a shop's page says is a hypothesis, because no page was opened.
- **Severity:** suggestions using the brief's S1–S4 scale; S1 was used where a wrong value can make the builder say "fits" for parts that may not fit, or show a wrong price/spec as the model's own.
- **Spot check:** one person-equivalent judgement per sample, 20 per category; Wilson 95% intervals; see section 4 for what the sample can and cannot show.
- **Not done:** no comparison with makers' or shops' live pages (no network); no audit of `offers.json` shipping totals, `history.json` or `history_imported.json` contents beyond what the checks above use; no check of fields the plan wants but the data does not have (they are listed as "not collected").
