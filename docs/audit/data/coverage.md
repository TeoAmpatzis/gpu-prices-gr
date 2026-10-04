
#### gpu — 97 models; most-listed quarter = 25 models with ≥ 15 listings; builder rows: 1567

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Chip | chip | filter, quick; 14 (table) | collected | 100.0% (97/97) | 100.0% (25/25) | 100.0% (1567/1567) |
| Board partner | partner | filter | collected | 100.0% (97/97) | 100.0% (25/25) | 100.0% (1567/1567) |
| VRAM | vram | filter, column | collected | 100.0% (97/97) | 100.0% (25/25) | 100.0% (1567/1567) |
| Τύπος μνήμης (memory type) | memType | filter | collected | 95.9% (93/97) | 100.0% (25/25) | 99.9% (1565/1567) |
| Μήκος (length) | lengthMm | 6; filter, column | collected | 55.7% (54/97) | 84.0% (21/25) | 80.2% (1257/1567) |
| Πάχος σε slots (thickness) | not collected | 7; filter | not collected | not collected | not collected | not collected |
| Προτεινόμενο τροφοδοτικό (recommended PSU) | minPsu (card page / maker) | 14; filter, column | collected | 52.6% (51/97) | 84.0% (21/25) | 71.7% (1124/1567) |
| Προτεινόμενο τροφοδοτικό, με πίνακα chip (PSU incl. chip table) | minPsu ?? GPU_PSU[chip] (builder gpuPsu) | 14 (what v1 uses) | derivable | 71.1% (69/97) | 84.0% (21/25) | 100.0% (1567/1567) |
| Βύσμα ρεύματος (power connector) | not collected | 15; filter, column | not collected | not collected | not collected | not collected |
| Αριθμός ανεμιστήρων (fan count) | not collected | filter | not collected | not collected | not collected | not collected |
| Χρώμα (colour) | not collected | filter | not collected | not collected | not collected | not collected |
| TBP (board power) | not collected (plan: per-chip table) | power estimate | not collected | not collected | not collected | not collected |

#### cpu — 421 models; most-listed quarter = 111 models with ≥ 5 listings; builder rows: 359

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Socket | socket | 1, 10, 13; filter, quick | collected | 97.6% (411/421) | 100.0% (111/111) | 100.0% (359/359) |
| Σειρά (series) | derivable from chip (cpuSeries) | filter | derivable | 99.8% (420/421) | 100.0% (111/111) | 99.4% (357/359) |
| Γενιά/αρχιτεκτονική (generation) | derivable from chip model number | 13, 25; filter | derivable | 89.5% (377/421) | 100.0% (111/111) | 99.4% (357/359) |
| Πυρήνες (cores) | cores | filter, column | collected | 96.4% (406/421) | 100.0% (111/111) | 98.9% (355/359) |
| Threads | not collected | filter, column | not collected | not collected | not collected | not collected |
| Συχνότητα boost (boost clock) | not collected | filter, column | not collected | not collected | not collected | not collected |
| TDP | tdp | filter, column | collected | 32.3% (136/421) | 92.8% (103/111) | 69.4% (249/359) |
| PPT/PL2 (real power limit) | not collected (plan: hand table per family) | power estimate, 14 | not collected | not collected | not collected | not collected |
| Ενσωματωμένα γραφικά (iGPU) | igpu (computed from the model number, never null) | 12; filter, quick, column | collected | 100.0% (421/421) | 100.0% (111/111) | 100.0% (359/359) |
| Ψύκτρα στο κουτί (cooler in box) | coolerIncluded | 11; filter, quick | collected | 89.3% (376/421) | 100.0% (111/111) | 57.1% (205/359) |
| Box/Tray | packaging | 11; filter | collected | 94.8% (399/421) | 100.0% (111/111) | 82.7% (297/359) |

#### mobo — 1215 models; most-listed quarter = 308 models with ≥ 4 listings; builder rows: 1023

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Socket | socket | 1, 13; filter, quick | collected | 97.4% (1183/1215) | 99.7% (307/308) | 100.0% (1023/1023) |
| Chipset | chipset | 13; filter, column | collected | 91.9% (1116/1215) | 98.4% (303/308) | 100.0% (1023/1023) |
| Form factor | formFactor (≠ 'Άλλο') | 5; filter, quick, column | collected | 99.8% (1213/1215) | 100.0% (308/308) | 100.0% (1023/1023) |
| Τύπος μνήμης (memory type) | memory | 2; filter, quick, column | collected | 92.6% (1125/1215) | 99.7% (307/308) | 100.0% (1023/1023) |
| Θέσεις RAM (RAM slots) | ramSlots | 3; filter | collected | 71.3% (866/1215) | 99.0% (305/308) | 75.6% (773/1023) |
| Μέγιστη μνήμη (max memory) | not collected | 4; filter | not collected | not collected | not collected | not collected |
| Θέσεις M.2 (M.2 slots) | not collected | 17, 20; filter, column | not collected | not collected | not collected | not collected |
| Θύρες SATA (SATA ports) | not collected | 18; filter | not collected | not collected | not collected | not collected |
| WiFi | wifi (from the title; false = title does not say WiFi) | filter, quick, column | title words | 45.3% (550/1215) | 48.7% (150/308) | 51.8% (530/1023) |
| Bluetooth | not collected | filter | not collected | not collected | not collected | not collected |
| USB-C header μπροστά (front USB-C header) | not collected | 24; filter | not collected | not collected | not collected | not collected |
| BIOS Flashback | not collected | 13; filter | not collected | not collected | not collected | not collected |
| Fan headers | not collected | 23 | not collected | not collected | not collected | not collected |

#### ram — 489 models; most-listed quarter = 126 models with ≥ 11 listings; builder rows: 239

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Τύπος (type) | type | 2; filter, quick | collected | 100.0% (489/489) | 100.0% (126/126) | 100.0% (239/239) |
| Συνολική χωρητικότητα (total capacity) | capacity | 4; filter | collected | 100.0% (489/489) | 100.0% (126/126) | 100.0% (239/239) |
| Διαμόρφωση κιτ (kit layout) | modules (+ capacity) | 3; filter, quick, column | collected | 100.0% (489/489) | 100.0% (126/126) | 100.0% (239/239) |
| Συχνότητα (speed) | speed | 25; filter, column | collected | 82.8% (405/489) | 79.4% (100/126) | 86.6% (207/239) |
| CL | cas | filter, column | collected | 51.7% (253/489) | 75.4% (95/126) | 56.9% (136/239) |
| Latency σε ns (latency in ns) | derivable: 2000 × cas / speed | filter | derivable | 50.1% (245/489) | 69.8% (88/126) | 56.1% (134/239) |
| XMP/EXPO | not collected | filter | not collected | not collected | not collected | not collected |
| Ύψος (height) | not collected | 26; filter | not collected | not collected | not collected | not collected |
| RGB | not collected (titles name it sometimes) | filter | not collected | not collected | not collected | not collected |
| Χρώμα (colour) | not collected | filter | not collected | not collected | not collected | not collected |
| €/GB | derivable: price / capacity | column, sort | derivable | 100.0% (489/489) | 100.0% (126/126) | 100.0% (239/239) |
| (builder) Desktop/Laptop/Server | formFactor (default Desktop when not stated) | builder: usable | collected | 100.0% (489/489) | 100.0% (126/126) | 100.0% (239/239) |

#### storage — 2346 models; most-listed quarter = 709 models with ≥ 3 listings; builder rows: 1322

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

#### psu — 186 models; most-listed quarter = 51 models with ≥ 14 listings; builder rows: 139

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Watt | watts | 14; filter, quick, column | collected | 100.0% (186/186) | 100.0% (51/51) | 100.0% (139/139) |
| Πιστοποίηση 80+ (80 PLUS) | efficiency | filter, quick, column | collected | 70.4% (131/186) | 76.5% (39/51) | 71.2% (99/139) |
| Modular | modular | filter, column | collected | 84.4% (157/186) | 100.0% (51/51) | 41.0% (57/139) |
| Form factor (ATX/SFX) | formFactor — stated in title/URL (default ATX otherwise) | 16; filter; builder usable | collected (defaulted) | 72.0% (134/186) | 100.0% (51/51) | 55.4% (77/139) |
| ATX 3.x | not collected (title words "ATX 3.0/3.1", positive only) | filter, quick, column | title words | 18.3% (34/186) | 41.2% (21/51) | 21.6% (30/139) |
| Βύσμα 12V-2x6 (12V-2x6 connector) | not collected (title words, positive only) | 15; filter | title words | 5.9% (11/186) | 19.6% (10/51) | 6.5% (9/139) |
| Μήκος (length) | not collected | filter | not collected | not collected | not collected | not collected |
| €/W | derivable: price / watts | column, sort | derivable | 100.0% (186/186) | 100.0% (51/51) | 100.0% (139/139) |

#### case — 2609 models; most-listed quarter = 982 models with ≥ 3 listings; builder rows: 2609

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
| Θέσεις 3.5"/2.5" (drive bays) | not collected | 19; filter | not collected | not collected | not collected | not collected |
| Θέσεις επέκτασης (expansion slots) | not collected | 7 | not collected | not collected | not collected | not collected |
| Μορφή τροφοδοτικού (PSU form factor it takes) | not collected | 16 | not collected | not collected | not collected | not collected |
| Γυάλινο πλαϊνό (glass side) | window (from the title; false = not said) | filter | title words | 68.3% (1782/2609) | 86.7% (851/982) | 68.3% (1782/2609) |
| USB-C μπροστά (front USB-C) | not collected | 24; filter | not collected | not collected | not collected | not collected |
| Χρώμα (colour) | not collected (colours merged by design) | filter | not collected | not collected | not collected | not collected |
| Mesh (quick filter) | title words "Mesh"/"Airflow"/"Flow" (positive only) | quick | title words | 5.5% (144/2609) | 6.8% (67/982) | 5.5% (144/2609) |

#### fan — 2005 models; most-listed quarter = 937 models with ≥ 2 listings; builder rows: 1720

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Μέγεθος (size) | size | 21; filter, quick, column | collected | 100.0% (2005/2005) | 100.0% (937/937) | 100.0% (1720/1720) |
| Πλήθος στο πακέτο (pack) | pack | 21, 23; filter, quick, column | collected | 100.0% (2005/2005) | 100.0% (937/937) | 100.0% (1720/1720) |
| PWM/3-pin (connector) | connector (stated) | filter, quick, column | collected | 66.1% (1326/2005) | 92.5% (867/937) | 66.7% (1147/1720) |
| PWM (title word) | pwm (true = "PWM" in the title/URL; false = not said) | v1 filter | title words | 69.5% (1393/2005) | 83.5% (782/937) | 73.5% (1264/1720) |
| Airflow/static pressure (type) | fanType (maker series only) | filter | collected | 6.3% (127/2005) | 8.9% (83/937) | 6.2% (107/1720) |
| CFM | airflowCfm | filter | collected | 11.9% (238/2005) | 12.3% (115/937) | 13.4% (230/1720) |
| Static pressure (mmH2O) | pressureMm | filter | collected | 8.3% (167/2005) | 10.4% (97/937) | 9.7% (166/1720) |
| Θόρυβος (noise) | not collected | filter | not collected | not collected | not collected | not collected |
| RGB | rgb (from the title; false = not said) | filter | title words | 60.9% (1222/2005) | 66.9% (627/937) | 68.6% (1180/1720) |
| €/ανεμιστήρα (€/fan) | derivable: price / pack | column, sort | derivable | 100.0% (2005/2005) | 100.0% (937/937) | 100.0% (1720/1720) |

#### cooler — 2113 models; most-listed quarter = 986 models with ≥ 2 listings; builder rows: 2113

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Τύπος (type) | type | 8, 9; filter, quick, column | collected | 100.0% (2113/2113) | 100.0% (986/986) | 100.0% (2113/2113) |
| Socket | sockets | 10; filter, quick, column | collected | 33.1% (699/2113) | 46.5% (458/986) | 33.1% (699/2113) |
| Ύψος (height, air only) | heightMm | 8, 26; filter, column | collected | 26.0% (314/1206) | 38.8% (212/547) | 26.0% (314/1206) |
| Μέγεθος radiator (radiator, AIO only) | radiator | 9; filter, quick, column | collected | 100.0% (907/907) | 100.0% (439/439) | 100.0% (907/907) |
| Θόρυβος (noise) | not collected | filter | not collected | not collected | not collected | not collected |
| RGB | rgb (from the title; false = not said) | filter | title words | 60.3% (1275/2113) | 65.4% (645/986) | 54.9% (1160/2113) |
| Χρώμα (colour) | not collected | filter | not collected | not collected | not collected | not collected |
