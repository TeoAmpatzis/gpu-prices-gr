
#### gpu — 95 models; most-listed quarter = 24 models with ≥ 17 listings; builder rows: 1567

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Chip | chip | filter, quick; 14 (table) | collected | 100.0% (95/95) | 100.0% (24/24) | 100.0% (1567/1567) |
| Board partner | partner | filter | collected | 100.0% (95/95) | 100.0% (24/24) | 100.0% (1567/1567) |
| VRAM | vram | filter, column | collected | 100.0% (95/95) | 100.0% (24/24) | 100.0% (1567/1567) |
| Τύπος μνήμης (memory type) | memType | filter | collected | 95.8% (91/95) | 100.0% (24/24) | 99.9% (1565/1567) |
| Μήκος (length) | lengthMm | 6; filter, column | collected | 58.9% (56/95) | 83.3% (20/24) | 80.2% (1257/1567) |
| Πάχος σε slots (thickness) | not collected | 7; filter | not collected | not collected | not collected | not collected |
| Προτεινόμενο τροφοδοτικό (recommended PSU) | minPsu (card page / maker) | 14; filter, column | collected | 62.1% (59/95) | 83.3% (20/24) | 71.7% (1124/1567) |
| Προτεινόμενο τροφοδοτικό, με πίνακα chip (PSU incl. chip table) | minPsu ?? GPU_PSU[chip] (builder gpuPsu) | 14 (what v1 uses) | derivable | 70.5% (67/95) | 83.3% (20/24) | 100.0% (1567/1567) |
| Βύσμα ρεύματος (power connector) | not collected | 15; filter, column | not collected | not collected | not collected | not collected |
| Αριθμός ανεμιστήρων (fan count) | not collected | filter | not collected | not collected | not collected | not collected |
| Χρώμα (colour) | not collected | filter | not collected | not collected | not collected | not collected |
| TBP (board power) | not collected (plan: per-chip table) | power estimate | not collected | not collected | not collected | not collected |

#### cpu — 409 models; most-listed quarter = 106 models with ≥ 5 listings; builder rows: 359

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Socket | socket | 1, 10, 13; filter, quick | collected | 97.1% (397/409) | 100.0% (106/106) | 100.0% (359/359) |
| Σειρά (series) | derivable from chip (cpuSeries) | filter | derivable | 99.8% (408/409) | 100.0% (106/106) | 99.4% (357/359) |
| Γενιά/αρχιτεκτονική (generation) | derivable from chip model number | 13, 25; filter | derivable | 89.5% (366/409) | 100.0% (106/106) | 99.4% (357/359) |
| Πυρήνες (cores) | cores | filter, column | collected | 95.4% (390/409) | 100.0% (106/106) | 98.9% (355/359) |
| Threads | not collected | filter, column | not collected | not collected | not collected | not collected |
| Συχνότητα boost (boost clock) | not collected | filter, column | not collected | not collected | not collected | not collected |
| TDP | tdp | filter, column | collected | 31.1% (127/409) | 83.0% (88/106) | 69.4% (249/359) |
| PPT/PL2 (real power limit) | not collected (plan: hand table per family) | power estimate, 14 | not collected | not collected | not collected | not collected |
| Ενσωματωμένα γραφικά (iGPU) | igpu (computed from the model number, never null) | 12; filter, quick, column | collected | 100.0% (409/409) | 100.0% (106/106) | 100.0% (359/359) |
| Ψύκτρα στο κουτί (cooler in box) | coolerIncluded | 11; filter, quick | collected | 91.4% (374/409) | 100.0% (106/106) | 57.1% (205/359) |
| Box/Tray | packaging | 11; filter | collected | 94.4% (386/409) | 100.0% (106/106) | 82.7% (297/359) |

#### mobo — 1172 models; most-listed quarter = 297 models with ≥ 4 listings; builder rows: 1023

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Socket | socket | 1, 13; filter, quick | collected | 97.3% (1140/1172) | 99.7% (296/297) | 100.0% (1023/1023) |
| Chipset | chipset | 13; filter, column | collected | 91.7% (1075/1172) | 98.7% (293/297) | 100.0% (1023/1023) |
| Form factor | formFactor (≠ 'Άλλο') | 5; filter, quick, column | collected | 99.8% (1170/1172) | 100.0% (297/297) | 100.0% (1023/1023) |
| Τύπος μνήμης (memory type) | memory | 2; filter, quick, column | collected | 92.3% (1082/1172) | 99.7% (296/297) | 100.0% (1023/1023) |
| Θέσεις RAM (RAM slots) | ramSlots | 3; filter | collected | 71.8% (842/1172) | 98.7% (293/297) | 75.6% (773/1023) |
| Μέγιστη μνήμη (max memory) | not collected | 4; filter | not collected | not collected | not collected | not collected |
| Θέσεις M.2 (M.2 slots) | not collected | 17, 20; filter, column | not collected | not collected | not collected | not collected |
| Θύρες SATA (SATA ports) | not collected | 18; filter | not collected | not collected | not collected | not collected |
| WiFi | wifi (from the title; false = title does not say WiFi) | filter, quick, column | title words | 45.2% (530/1172) | 47.8% (142/297) | 51.8% (530/1023) |
| Bluetooth | not collected | filter | not collected | not collected | not collected | not collected |
| USB-C header μπροστά (front USB-C header) | not collected | 24; filter | not collected | not collected | not collected | not collected |
| BIOS Flashback | not collected | 13; filter | not collected | not collected | not collected | not collected |
| Fan headers | not collected | 23 | not collected | not collected | not collected | not collected |

#### ram — 471 models; most-listed quarter = 120 models with ≥ 13 listings; builder rows: 239

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Τύπος (type) | type | 2; filter, quick | collected | 100.0% (471/471) | 100.0% (120/120) | 100.0% (239/239) |
| Συνολική χωρητικότητα (total capacity) | capacity | 4; filter | collected | 100.0% (471/471) | 100.0% (120/120) | 100.0% (239/239) |
| Διαμόρφωση κιτ (kit layout) | modules (+ capacity) | 3; filter, quick, column | collected | 100.0% (471/471) | 100.0% (120/120) | 100.0% (239/239) |
| Συχνότητα (speed) | speed | 25; filter, column | collected | 82.4% (388/471) | 77.5% (93/120) | 86.6% (207/239) |
| CL | cas | filter, column | collected | 52.4% (247/471) | 75.8% (91/120) | 56.9% (136/239) |
| Latency σε ns (latency in ns) | derivable: 2000 × cas / speed | filter | derivable | 50.7% (239/471) | 70.0% (84/120) | 56.1% (134/239) |
| XMP/EXPO | not collected | filter | not collected | not collected | not collected | not collected |
| Ύψος (height) | not collected | 26; filter | not collected | not collected | not collected | not collected |
| RGB | not collected (titles name it sometimes) | filter | not collected | not collected | not collected | not collected |
| Χρώμα (colour) | not collected | filter | not collected | not collected | not collected | not collected |
| €/GB | derivable: price / capacity | column, sort | derivable | 100.0% (471/471) | 100.0% (120/120) | 100.0% (239/239) |
| (builder) Desktop/Laptop/Server | formFactor (default Desktop when not stated) | builder: usable | collected | 100.0% (471/471) | 100.0% (120/120) | 100.0% (239/239) |

#### storage — 2219 models; most-listed quarter = 726 models with ≥ 3 listings; builder rows: 1322

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Τύπος (type) | media | filter, quick | collected | 100.0% (2219/2219) | 100.0% (726/726) | 100.0% (1322/1322) |
| Interface | iface | 17, 18; filter, column | collected | 97.7% (2169/2219) | 99.9% (725/726) | 98.0% (1296/1322) |
| Χωρητικότητα (capacity) | capacity | filter, quick, column | collected | 100.0% (2219/2219) | 100.0% (726/726) | 100.0% (1322/1322) |
| PCIe gen (NVMe only) | pcie | 20; filter | collected | 96.7% (832/860) | 99.4% (332/334) | 96.5% (670/694) |
| Form factor | formFactor | 17, 19; filter | collected | 99.5% (2209/2219) | 100.0% (726/726) | 100.0% (1322/1322) |
| DRAM (SSD only) | dram | filter | collected | 47.6% (723/1519) | 79.7% (433/543) | 2.6% (29/1125) |
| Ταχύτητες: ανάγνωση (read speed, SSD) | readMBs | filter, column | collected | 56.8% (863/1519) | 87.7% (476/543) | 13.4% (151/1125) |
| Ταχύτητες: εγγραφή (write speed, SSD) | writeMBs | filter | collected | 55.7% (846/1519) | 85.8% (466/543) | 13.2% (149/1125) |
| TBW (SSD only) | tbw | filter | collected | 19.7% (299/1519) | 39.6% (215/543) | 1.5% (17/1125) |
| Στροφές (RPM, HDD only) | rpm | filter | collected | 93.1% (652/700) | 99.5% (182/183) | 91.9% (181/197) |
| Κατηγορία χρήσης (usage tier) | tier | filter (segment) | collected | 100.0% (2219/2219) | 100.0% (726/726) | 100.0% (1322/1322) |
| (v1 only) Cache (HDD) | cacheMB | v1 card text | collected | 44.9% (314/700) | 88.0% (161/183) | 81.7% (161/197) |
| (v1 only) Heatsink (NVMe) | heatsink | v1 data | collected | 59.9% (515/860) | 87.7% (293/334) | 10.5% (73/694) |
| €/TB | derivable: price / capacity | column, sort | derivable | 100.0% (2219/2219) | 100.0% (726/726) | 100.0% (1322/1322) |

#### psu — 187 models; most-listed quarter = 47 models with ≥ 15 listings; builder rows: 139

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Watt | watts | 14; filter, quick, column | collected | 100.0% (187/187) | 100.0% (47/47) | 100.0% (139/139) |
| Πιστοποίηση 80+ (80 PLUS) | efficiency | filter, quick, column | collected | 69.5% (130/187) | 76.6% (36/47) | 71.2% (99/139) |
| Modular | modular | filter, column | collected | 86.6% (162/187) | 100.0% (47/47) | 41.0% (57/139) |
| Form factor (ATX/SFX) | formFactor — stated in title/URL (default ATX otherwise) | 16; filter; builder usable | collected (defaulted) | 72.2% (135/187) | 100.0% (47/47) | 55.4% (77/139) |
| ATX 3.x | not collected (title words "ATX 3.0/3.1", positive only) | filter, quick, column | title words | 18.2% (34/187) | 38.3% (18/47) | 21.6% (30/139) |
| Βύσμα 12V-2x6 (12V-2x6 connector) | not collected (title words, positive only) | 15; filter | title words | 5.3% (10/187) | 19.1% (9/47) | 6.5% (9/139) |
| Μήκος (length) | not collected | filter | not collected | not collected | not collected | not collected |
| €/W | derivable: price / watts | column, sort | derivable | 100.0% (187/187) | 100.0% (47/47) | 100.0% (139/139) |

#### case — 2588 models; most-listed quarter = 1005 models with ≥ 3 listings; builder rows: 2609

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Τύπος (type / size) | size (≠ 'Άλλο') | 5 (fallback); filter, quick, column | collected | 89.1% (2307/2588) | 99.2% (997/1005) | 87.7% (2289/2609) |
| Μητρικές που δέχεται (boards it takes) | maxBoard (stated) | 5; filter, quick | collected | 89.1% (2306/2588) | 99.8% (1003/1005) | 86.0% (2243/2609) |
| Max μήκος κάρτας (max GPU length) | gpuMaxMm | 6; filter, column | collected | 55.1% (1426/2588) | 96.7% (972/1005) | 26.5% (692/2609) |
| Max ύψος ψύκτρας (max cooler height) | coolerMaxMm | 8; filter, column | collected | 40.0% (1035/2588) | 91.4% (919/1005) | 14.8% (387/2609) |
| Radiators ανά θέση: μεγέθη (radiator sizes per position) | radiators (makers) | 9; filter | collected | 2.6% (67/2588) | 3.4% (34/1005) | 2.5% (66/2609) |
| Radiators ανά θέση: μόνο θέσεις (positions only) | radiatorMounts (shops) | 9 (fallback) | collected | 41.7% (1079/2588) | 76.2% (766/1005) | 19.2% (502/2609) |
| Θέσεις ανεμιστήρων ανά μέγεθος (fan positions per size) | fanMounts (makers) | 21 | collected | 2.6% (67/2588) | 3.5% (35/1005) | 2.6% (67/2609) |
| Θέσεις ανεμιστήρων, πλήθος (fan positions, count) | fanSlots | 21 (fallback) | collected | 51.4% (1329/2588) | 88.1% (885/1005) | 23.6% (615/2609) |
| Ανεμιστήρες στο κουτί (fans included) | fansIncluded (list or []) or hasFans | 22; filter, quick, column | collected | 18.9% (490/2588) | 34.3% (345/1005) | 5.7% (148/2609) |
| Θέσεις 3.5"/2.5" (drive bays) | not collected | 19; filter | not collected | not collected | not collected | not collected |
| Θέσεις επέκτασης (expansion slots) | not collected | 7 | not collected | not collected | not collected | not collected |
| Μορφή τροφοδοτικού (PSU form factor it takes) | not collected | 16 | not collected | not collected | not collected | not collected |
| Γυάλινο πλαϊνό (glass side) | window (from the title; false = not said) | filter | title words | 68.9% (1783/2588) | 86.5% (869/1005) | 68.3% (1782/2609) |
| USB-C μπροστά (front USB-C) | not collected | 24; filter | not collected | not collected | not collected | not collected |
| Χρώμα (colour) | not collected (colours merged by design) | filter | not collected | not collected | not collected | not collected |
| Mesh (quick filter) | title words "Mesh"/"Airflow"/"Flow" (positive only) | quick | title words | 5.4% (140/2588) | 6.8% (68/1005) | 5.5% (144/2609) |

#### fan — 2037 models; most-listed quarter = 970 models with ≥ 2 listings; builder rows: 1720

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Μέγεθος (size) | size | 21; filter, quick, column | collected | 100.0% (2037/2037) | 100.0% (970/970) | 100.0% (1720/1720) |
| Πλήθος στο πακέτο (pack) | pack | 21, 23; filter, quick, column | collected | 100.0% (2037/2037) | 100.0% (970/970) | 100.0% (1720/1720) |
| PWM/3-pin (connector) | connector (stated) | filter, quick, column | collected | 78.4% (1598/2037) | 91.6% (889/970) | 66.7% (1147/1720) |
| PWM (title word) | pwm (true = "PWM" in the title/URL; false = not said) | v1 filter | title words | 70.0% (1425/2037) | 82.6% (801/970) | 73.5% (1264/1720) |
| Airflow/static pressure (type) | fanType (maker series only) | filter | collected | 6.2% (126/2037) | 8.6% (83/970) | 6.2% (107/1720) |
| CFM | airflowCfm | filter | collected | 24.2% (492/2037) | 14.7% (143/970) | 13.4% (230/1720) |
| Static pressure (mmH2O) | pressureMm | filter | collected | 14.6% (298/2037) | 12.3% (119/970) | 9.7% (166/1720) |
| Θόρυβος (noise) | not collected | filter | not collected | not collected | not collected | not collected |
| RGB | rgb (from the title; false = not said) | filter | title words | 61.0% (1242/2037) | 67.4% (654/970) | 68.6% (1180/1720) |
| €/ανεμιστήρα (€/fan) | derivable: price / pack | column, sort | derivable | 100.0% (2037/2037) | 100.0% (970/970) | 100.0% (1720/1720) |

#### cooler — 2089 models; most-listed quarter = 984 models with ≥ 2 listings; builder rows: 2113

| Plan field | Our JSON field(s) | Used by | Status | All models | Most-listed quarter | Builder rows |
| --- | --- | --- | --- | --- | --- | --- |
| Τύπος (type) | type | 8, 9; filter, quick, column | collected | 100.0% (2089/2089) | 100.0% (984/984) | 100.0% (2113/2113) |
| Socket | sockets | 10; filter, quick, column | collected | 65.1% (1360/2089) | 91.3% (898/984) | 33.1% (699/2113) |
| Ύψος (height, air only) | heightMm | 8, 26; filter, column | collected | 49.8% (585/1174) | 78.5% (428/545) | 26.0% (314/1206) |
| Μέγεθος radiator (radiator, AIO only) | radiator | 9; filter, quick, column | collected | 100.0% (915/915) | 100.0% (439/439) | 100.0% (907/907) |
| Θόρυβος (noise) | not collected | filter | not collected | not collected | not collected | not collected |
| RGB | rgb (from the title; false = not said) | filter | title words | 61.2% (1279/2089) | 65.9% (648/984) | 54.9% (1160/2113) |
| Χρώμα (colour) | not collected | filter | not collected | not collected | not collected | not collected |
