# Headphones & earphones: data review of the first collection

Status 2026-11-14 (updated): the owner dropped the 300 KB list-file limit, kept the 10 EUR floor and moved the peripherals into their own scrape workflow (`scrape-peripherals.yml`), so the two blockers below are resolved by decision; the numbers stay as measured. Earlier status: **the category could not be published as scoped.** Its list file is about twice the 300 KB limit and one scrape would use most of the 90-minute `scrape-shops` allowance. Section 6 lists the decisions the owner has to make. Nothing here was published, pushed or written to `public/data`; the category is still `enabled: false, visible: false`.

## 1. How the data was collected

An isolated local run, all five sources, with the real source readers (`local/headphones/collect_trial.py`, git-ignored, data in `local/headphones/collection-20261114T*/`). It patches only `main.DATA_DIR`, so no production file is touched. The first run lost Skroutz: its Bluetooth earbud list (c/435) is longer than the 80-page ceiling in `scraper/sources/skroutz.py`, so the reader refused the incomplete list (as designed). `MAX_PAGES` is now 100 (a ceiling only; no other category is near it). A second run read Skroutz alone and reused the other four sources' raw rows; the finished collection is that run. Everything after it was replayed offline from the saved pages and raw rows through the current normalizer (`local/headphones/replay.py`).

| Source | Raw rows | Requests | Time |
|---|---|---|---|
| BestPrice (30 price slices) | 12,222 | 777 | 1,628 s |
| Skroutz (5 lists) | 9,920 | 208 | 474 s |
| Shopflix (Algolia, 3 facets) | 9,357 | 119 | 216 s |
| e-shop.gr (2 lists) | 1,253 | 128 | 271 s |
| Snif (1 category) | 1,622 | 87 | 173 s |
| **Total** | **34,374** | 1,319 | |

No request was blocked and none failed. Skroutz c/435 took about 94 of its 100 allowed pages, so it has little room to grow; if it passes 100 the scrape keeps the previous Skroutz data and marks the source failed, and `MAX_PAGES` has to go up again.

## 2. Counts after normalization (replay of the same raw rows)

- **25,912 listings kept**: BestPrice 9,766, Shopflix 7,023, Skroutz 6,853, Snif 1,252, e-shop.gr 1,018.
- **8,462 rejected** (`rejected.json`): no-identity 6,251, below-floor 1,800, not-headphones 150, identity-conflict 132, accessory 97, bundle 32. 34,374 = 25,912 + 8,462.
- **11,713 models.** Listed on 1 source: 6,941; 2 sources: 2,365; 3: 2,044; 4: 339; 5: 24. About 41% of models are on two or more sources.
- **Photo candidates:** 11,200 of the 11,713 models (95.6%) have a candidate image URL. The photos themselves come from the images repository job after publication; none were downloaded here.
- **Brands:** the largest are Hoco (357 models), Remax (230), OTL (226), JBL (218), Awei (208), XO (195), Sennheiser (154), Philips (151), Sony (151), Razer (142).

### Why so many listings are rejected as `no-identity`

A listing needs a recognised maker and a model name. 6,251 titles have none: unbranded imports ("TWS68 with charging base", "P9 Pro Max", "K87 Bluetooth"), 5,687 of them from titles with no recognised maker (BestPrice 2,302, Skroutz 1,939, Shopflix 1,276, Snif 148, e-shop.gr 22) and 564 from a known maker with no model name (Shopflix 197, Skroutz 191, BestPrice 76, e-shop.gr 73, Snif 27). The brand list was extended from the first trial's 10,290 `no-identity` titles (every brand with five or more listings that is a real maker or label, such as Fineblue, GJBY, Guess, OTL, Monster, Celebrat), which brought it to this number. What is left is a long tail of makers with fewer than five listings each; adding them is cheap if the owner wants them (`SEEN_BRANDS` in `scraper/normalize_headphones.py`). They are unknown, not guessed.

### Rejects, by example (real titles)

- **identity-conflict (132):** the same part number under two names, or a wired-only and a wireless-only title for one name (for example "Acme Zed Ενσύρματα" against "Acme Zed Ασύρματα"). Both stay out rather than being merged wrongly. A title that says "both" (Bluetooth / 3.5 mm) no longer conflicts with either; that was a defect found in this review (505 conflicts before the fix, 132 after).
- **accessory (97):** "Poly Voyager Free 60 UC M + BT700 USB-A Adapter + Basic Charge Case", "Jabra Evolve 65 SE Mono MS w/Charging Stand", "ONIKUMA ΒΑΣΗ ΑΚΟΥΣΤΙΚΩΝ ST-2" (a stand), "Monster Clarity 200 Skin".
- **bundle (32):** "Mars Gaming Bundle Gaming Headset Over Ear Black", "Sennheiser IE 100 Pro Case Bundle", "Trust Tridox GXT790 3-in-1 Gaming Bundle", "Headset Kit Redragon HHA1 2in1 Combo".
- **not-headphones (150):** "JBL CHARGE ESSENTIAL 3 SE, BLUETOOTH SPEAKER", "V9 Bluetooth Handsfree Με Ενσωματωμένη Κάμερα Και Ηχεία", "Ακουστικά Astell&kern Luna Ενδώτια Ηχεία Hi-fi" (a 4,585 EUR in-ear monitor), radio-equipped sets.
- **below-floor (1,800):** the owner's 10 EUR floor ("TWS i7s Earbud … 7.28", "Rebeltec City … 7.89"). Decided again on every run, so a sale price can move a listing in or out.

## 3. Identity review

I read 50 random models that are on two or more sources (list in section 7). 46 are one product, named the same way by every source. The four that are not are in the defects below (the BT-02 name, "Sony New", Remax P3 and Komc G306). A sample of 50 cannot show a rare defect, so the checks in `scripts/checks/test_normalize_headphones.py` and `test_headphones_pipeline.py` hold what was found. Defects found, and what was done:

1. **`brand` stayed `Other` on a listing whose model had a known brand** (the row kept the brand it was first stored with). Fixed in `settle()`; it rewrites the row's brand from the title on every run. Test added.
2. **"BT-02" lost its prefix** (`Crystal Audio BT-02` became `Crystal Audio 02`, because the bare word "BT" is removed as noise). Fixed; test added. The sample below still shows the old name for that one model.
3. **Colours and finishes the colour table lacks stayed in the model name** ("Bose QuietComfort Over Ear Moonstone", "Fresh n Rebel Clam Core Over Ear Pastel", "Hoco W35 Max Joy Over Ear Sky"), and shop phrases did too ("με Αντοχή στον Ιδρώτα", "Quick Charge", "με σύνδεση"). One unnamed word after "Over/On/In Ear" is now cut, and those phrases are noise. Models: 13,917 → 11,713 on the same rows. A two-word tail ("Moonlit Gray", "Dragon Edition") is kept, because it may be an edition; a handful of colour names therefore still make an extra model.
4. **Known limits, not fixed** (all listed in `HEADPHONES_DESIGN.md` §9): Sony's colour-letter part numbers (WH-1000XM5B / XM5L / XM5P) are separate models; AirPods 3 MagSafe and Lightning share one model; where sources disagree on the form factor of one model (Remax P3: "In Ear" against "Open Ear"; Komc G306: "Over Ear" against "On Ear") the shared field takes the most common value; "Sony New" (from "Sony New Gold …") is a model named by a colour leftover.

## 4. How much of each spec the sources state

Share of the 11,713 models for which at least one listing states the value (everything else is unknown and shown as unknown):

| Field | Known | Field | Known |
|---|---|---|---|
| Product type | 93.8% | Microphone | 39.3% |
| Form factor | 90.5% | True wireless | 40.3% |
| Connection | 84.4% | Battery hours | 31.3% |
| Colour | 84.6% | Connector | 28.6% |
| Bluetooth | 55.0% | Charging case | 15.6% |
| Gaming | 15.4% | ANC | 10.5% |
| Part number | 0.6% | 2.4 GHz receiver | 0.4% |
| Foldable | 0.2% | Water resistance | 0.2% |
| Driver size, multipoint, spatial audio | 0.1% | Transparency | 0% |

Decisions taken from it: the sidebar filters keep type pills, connection, ANC, true wireless, microphone, gaming, Bluetooth, battery (minimum hours), maker and colour; the 2.4 GHz receiver and water-resistance filters were removed (under 0.5%). Spec rows for the sparse fields stay on the model page and show only when a source states them. Those fields, the connector, the part number and the shop title are left out of the list file (`LIST_SKIP_BY_CATEGORY` in `derive.ts`); the model page reads them from the model chunks.

## 5. Size and run time

**List file.** `dist/data/headphones/list.v2.json` for the 25.7k listings of this collection is **808 KB gzip**, or **597 KB** after the shop title and part number are left out of it (the title alone is 226 KB). The limit is 300 KB. The cost is per listing (about 23 bytes gzip each once the title is out: the id 4.6, the model name 3.4, the price 1.8, the per-model price history about 4), so only fewer listings help. Estimates by price floor, at that rate:

| Floor | Models | Listings | List file |
|---|---|---|---|
| 10 EUR (approved) | 11,713 | 25,912 | about 600 KB |
| 15 EUR | 10,384 | 22,076 | about 512 KB |
| 20 EUR | 8,513 | 17,575 | about 408 KB |
| 25 EUR | 7,114 | 14,525 | about 337 KB |
| **30 EUR** | **5,952** | **12,072** | **about 280 KB** |

Other cuts I measured do worse or hurt real products: keeping only models on two or more sources gives 14,440 listings (about 335 KB) but drops 6,941 single-source models, including every expensive single-shop pair.

**Run time.** BestPrice alone took 1,628 s (27 min), and sources run side by side inside a category, so the category costs about 27 min in `scrape-shops`. That job already took about 60 of its 90 minutes with mice, so headphones would bring it to about 87 of 90. Skroutz adds about 8 min to `scrape.yml`. A 30 EUR floor lets the BestPrice slices below 30 EUR be dropped (not measured, the cheap slices are the large ones).

**Test run, category made visible locally with this data (not committed):** `npm run build` 24 s with 34.5k per-address pages, JS entry 77.4 KB gzip, `tests/e2e/headphones.spec.ts` 4 of 4 passed, no horizontal overflow at 360 px or 1366 px.

## 6. Decisions needed from the owner before publishing

1. **List size (blocking).** Choose one: (a) raise the price floor to **30 EUR** (about 280 KB, about 5,950 models; recommended, because it also shortens the scrape and removes the unbranded cheap tail, but it drops legitimate 15 to 30 EUR earbuds); (b) a different floor from the table (nothing under 30 EUR fits); (c) a design change that is not small: a list of one row per model, with the offers loaded from the model chunk. Raising the 300 KB limit is not proposed.
2. **Run time (blocking).** Either the 30 EUR floor with its slices dropped, or a longer `scrape-shops` timeout, or headphones moved to their own workflow. Needs a measured run after the floor is chosen.
3. **Brand tail (optional).** The `no-identity` titles from small makers (section 2) can be shortened by adding names; no effect on size once the floor is 30.

When these are decided: set `PRICE_FLOOR` (one constant) and the BestPrice slices, re-collect once, set `MIN_MODELS.headphones` to half of the models of that collection (it is 5,800 now, from this collection's 11,713; with a 30 EUR floor it has to go down to about 3,000), then the publication steps in `HEADPHONES_DESIGN.md`.

## 7. The 50 sampled models

- **Baseus Bowie 35** (3 listings, 3 sources): bestprice “Baseus Bowie 35 Ακουστικά Bluetooth In Ear Ανθεκτικά στο Νερό Black”; shopflix “Baseus Bowie 35 In-ear Bluetooth Handsfree Ακουστικά με Αντοχή στον Ιδ”; skroutz “Baseus Bowie 35 In-ear Μαύρα”
- **Inca IGK-X8Y** (3 listings, 3 sources): bestprice “Inca IGK-X8Y Gaming Headset Over Ear Multicolor Grey”; shopflix “Inca IGK-X8Y Over Ear Gaming Headset με σύνδεση USB Γκρι”; skroutz “Inca IGK-X8Y Over Ear Γκρι”
- **XO BE42** (2 listings, 2 sources): shopflix “XO XO BE42 Ασύρματα Bluetooth On Ear Ακουστικά με 44 ώρες Λειτουργίας ”; skroutz “XO Bluetooth / USB-C με 44 ώρες Λειτουργίας Μαύρα XO BE42”
- **Soundcore AeroFit 2 Pro** (7 listings, 4 sources): bestprice “Anker Soundcore AeroFit 2 Pro Ακουστικά Bluetooth Open Ear Ανθεκτικά σ”; bestprice “Anker SoundCore AeroFit 2 Pro Ακουστικά Bluetooth Open Ear Violet”; bestprice “Anker SoundCore AeroFit 2 Pro Ακουστικά Bluetooth Open Ear Blue”
- **Techsuit Voicera CB3** (2 listings, 2 sources): shopflix “Techsuit Voicera CB3 In-ear Bluetooth Handsfree Ακουστικό Μαύρο”; skroutz “Techsuit Voicera (CB3) In-ear Μαύρα”
- **Devia Star E4** (4 listings, 3 sources): bestprice “Devia Star E4 Ακουστικά Bluetooth In Ear Black”; bestprice “Devia Star E4 Black Ακουστικά Bluetooth In Ear”; shopflix “Devia Star E4 In-ear Bluetooth Handsfree Ακουστικά με Θήκη Φόρτισης Μα”
- **Superlux HD-681** (3 listings, 3 sources): bestprice “Superlux HD-681 Ενσύρματα Ακουστικά Studio Over Ear Μαύρα Κόκκινα”; shopflix “Superlux HD-681 Ενσύρματα Over Ear Studio Ακουστικά Μαύρο”; skroutz “Superlux HD-681 3.5mm / 6.3mm”
- **Andowl Q700** (3 listings, 3 sources): bestprice “Andowl Q700 Ακουστικά Bluetooth In Ear Black”; shopflix “Andowl Q700 In-ear Bluetooth Handsfree Ακουστικά με Θήκη Φόρτισης Μαύρ”; skroutz “Andowl Q700 In-ear Μαύρα”
- **Remax Openbuds P8** (3 listings, 3 sources): bestprice “Remax Openbuds P8 Ακουστικά Bluetooth In Ear Beige”; shopflix “Remax Openbuds P8 Bluetooth Handsfree με Θήκη Φόρτισης Μπεζ”; skroutz “Remax Openbuds P8 Μπεζ”
- **Huawei FreeBuds SE 2** (3 listings, 3 sources): bestprice “Huawei FreeBuds SE 2 Ακουστικά Bluetooth Earbud Ανθεκτικά στο Νερό Bla”; shopflix “Huawei FreeBuds SE 2 Bluetooth Handsfree Ακουστικά με Θήκη Φόρτισης Μα”; skroutz “Huawei FreeBuds SE 2”
- **Redragon H540 Luna** (2 listings, 2 sources): bestprice “Redragon H540 Luna Gaming Headset Over Ear Black”; snif “Headset Redragon H540 Luna Black”
- **Fifine H13** (5 listings, 4 sources): bestprice “Fifine H13 Gaming Headset Over Ear Black”; bestprice “Fifine H13 Gaming Headset Over Ear White”; eshop “ΑΚΟΥΣΤΙΚΑ GAMING FIFINE H13 (ΜΑΥΡΟ)”
- **Apple AirPods Pro 2 με MagSafe ‑C** (2 listings, 2 sources): shopflix “Apple AirPods Pro 2 με MagSafe Charging Case USB‑C In-ear Bluetooth Ha”; skroutz “Apple AirPods Pro 2 με MagSafe Charging Case (USB‑C) In-ear Λευκά”
- **Razer BlackShark V2 HyperSpeed** (6 listings, 4 sources): bestprice “Razer BlackShark V2 HyperSpeed Ασύρματο Gaming Headset Over Ear Black”; bestprice “Razer BlackShark V2 HyperSpeed Ασύρματο Gaming Headset Over Ear White”; shopflix “Razer BlackShark V2 HyperSpeed Ασύρματο Over Ear Gaming Headset με σύν”
- **Vieta Pro Sweat** (9 listings, 3 sources): bestprice “Vieta Pro Sweat Sports Ακουστικά Bluetooth In Ear Ανθεκτικά στο Νερό B”; bestprice “Vieta Pro Sweat Sports Ακουστικά Bluetooth In Ear Ανθεκτικά στο Νερό B”; bestprice “Vieta Pro Sweat Sports Ακουστικά Bluetooth In Ear Ανθεκτικά στο Νερό W”
- **Onikuma T309** (2 listings, 2 sources): shopflix “Onikuma T309 In-ear Bluetooth Handsfree Ακουστικά με Θήκη Φόρτισης Μαύ”; skroutz “Onikuma T309 In-ear Μαύρα”
- **Philips TAK5500RT** (2 listings, 2 sources): shopflix “Philips TAK5500RT Ασύρματα / Ενσύρματα Παιδικά Over Ear Ακουστικά & Qu”; skroutz “Philips TAK5500RT Bluetooth / 3.5mm Navy Μπλε”
- **Jlab JBuds Mini** (2 listings, 2 sources): shopflix “Jlab JBuds Mini Bluetooth Handsfree με Αντοχή στον Ιδρώτα & Θήκη Φόρτι”; skroutz “Jlab JBuds Mini”
- **Hoco EW11** (3 listings, 3 sources): bestprice “Hoco EW11 Ακουστικά Bluetooth In Ear Black”; shopflix “Hoco EW11 In-ear Bluetooth Handsfree Ακουστικά με Θήκη Φόρτισης Μαύρο”; skroutz “Hoco EW11 In-ear Μαύρα”
- **HyperX Cloud Stinger 2** (6 listings, 3 sources): bestprice “HyperX Cloud Stinger 2 Gaming Headset Over Ear Black”; bestprice “HyperX Cloud Stinger 2 Ασύρματο Gaming Headset Over Ear Black”; shopflix “HyperX Cloud Stinger 2 Over Ear Gaming Headset με σύνδεση 3.5mm”
- **Samsung Galaxy Buds3 Pro** (5 listings, 3 sources): bestprice “Samsung Galaxy Buds 3 Pro Ακουστικά Bluetooth In Ear Ανθεκτικά στο Νερ”; bestprice “Samsung Galaxy Buds 3 Pro Ακουστικά Bluetooth In Ear Ανθεκτικά στο Νερ”; shopflix “Samsung Galaxy Buds3 Pro Bluetooth Handsfree Ακουστικά με Αντοχή στον ”
- **Ezra BW14** (2 listings, 2 sources): bestprice “Ezra BW14 Ασύρματα Bluetooth Ακουστικά On Ear Ασημί”; skroutz “Ezra BW14 Bluetooth / 3.5mm με 10 ώρες Λειτουργίας”
- **Ttec SoundBuddy 2** (2 listings, 2 sources): bestprice “Ttec SoundBuddy 2 Kids Ενσύρματα & Ασύρματα Bluetooth Παιδικά Ακουστικ”; shopflix “Ttec SoundBuddy 2 Kids Ασύρματα Headphones On-Ear Μπλε / Πορτοκαλί”
- **Xiaomi Redmi Buds 8 Active** (7 listings, 3 sources): bestprice “Xiaomi Redmi Buds 8 Active Ακουστικά Bluetooth In Ear Ανθεκτικά στο Νε”; bestprice “Xiaomi Redmi Buds 8 Active Ακουστικά Bluetooth In Ear Ανθεκτικά στο Νε”; bestprice “Xiaomi Redmi Buds 8 Active Ακουστικά Bluetooth In Ear Ανθεκτικά στο Νε”
- **Hoco Coolway Es53** (2 listings, 2 sources): shopflix “Hoco Coolway Es53 In-ear Bluetooth Handsfree Ακουστικά Μαύρο”; skroutz “Hoco Coolway Es53 In-ear Μαύρα”
- **OTL Sonic the Hedgehog Slide** (3 listings, 3 sources): eshop “OTL - SONIC THE HEDGEHOG SLIDE TWS EARPHONES”; shopflix “OTL Sonic the Hedgehog Slide In-ear Bluetooth Handsfree Ακουστικά με Θ”; skroutz “OTL Sonic the Hedgehog Slide In-ear Μπλε”
- **HP DHE-8002** (2 listings, 2 sources): bestprice “HP DHE-8002 Gaming Headset Over Ear Black”; skroutz “HP DHE-8002 Over Ear”
- **Philips TAH4105** (4 listings, 2 sources): bestprice “Philips TAH4105 Ενσύρματα Ακουστικά On Ear Λευκά”; bestprice “Philips TAH4105 Ενσύρματα Ακουστικά On Ear Μαύρα”; bestprice “Philips TAH4105 Ενσύρματα Ακουστικά On Ear Μπλε”
- **Sony New** (2 listings, 2 sources): shopflix “Sony New Gold Ασύρματο Over Ear Gaming Headset με σύνδεση USB / 3.5mm”; skroutz “Sony New Gold Ασύρματο Over Ear”
- **LDNIO T05** (3 listings, 3 sources): bestprice “Ldnio T05 Ακουστικά Bluetooth In Ear Black”; shopflix “Ldnio T05 In-ear Bluetooth Handsfree με Θήκη Φόρτισης Μαύρο”; skroutz “Ldnio T05 In-ear Μαύρα”
- **Denver BTH-107BU** (2 listings, 2 sources): shopflix “Denver BTH-107BU Ασύρματα Bluetooth Παιδικά On Ear Ακουστικά Μπλε”; skroutz “Denver Bluetooth Μπλε BTH-107BU”
- **Grado GT220** (2 listings, 2 sources): bestprice “Grado GT220 Ακουστικά Bluetooth In Ear Ανθεκτικά στο Νερό Black”; skroutz “Grado GT220 In-ear Μαύρα”
- **Xiaomi Mi True Earbuds Basic 2** (4 listings, 3 sources): bestprice “Xiaomi Mi True Wireless Earbuds Basic 2 Ακουστικά Bluetooth In Ear Ανθ”; shopflix “Xiaomi Mi True Wireless Earbuds Basic 2 Bluetooth Handsfree Ακουστικά ”; shopflix “Handsfree Ακουστικά Xiaomi Mi True Wireless Earbuds Basic 2 Bluetooth ”
- **Niceboy HIVE SpacePods** (2 listings, 2 sources): shopflix “Niceboy HIVE SpacePods In-ear Bluetooth Handsfree με Θήκη Φόρτισης Μπλ”; skroutz “Niceboy HIVE SpacePods In-ear Μπλε”
- **Gembird MHS-U-001** (2 listings, 2 sources): shopflix “Gembird MHS-U-001 Over Ear Gaming Headset με σύνδεση USB”; skroutz “Gembird MHS-U-001 Over Ear”
- **Sencor SEP 710BT BK** (2 listings, 2 sources): shopflix “Headphones Sencor SEP 710BT BK Ασύρματα / Ενσύρματα On Ear με 30 ώρες ”; skroutz “Sencor Bluetooth / 3.5mm με 30 ώρες Λειτουργίας Μαύρα SEP 710BT BK”
- **Razer BARRACUDA X Chroma** (8 listings, 4 sources): bestprice “Razer Barracuda X Chroma Ασύρματο Gaming Headset Over Ear Black”; bestprice “Razer Barracuda X Chroma Ασύρματο Gaming Headset Over Ear White”; shopflix “Razer Barracuda X Chroma Ασύρματο Over Ear Gaming Headset με σύνδεση B”
- **Ellietech BT105** (4 listings, 3 sources): bestprice “Ellietech BT105 Ακουστικά Bluetooth In Ear Black”; bestprice “Ellietech BT105 Ακουστικά Bluetooth In Ear White”; shopflix “Ellietech BT105 In-ear Bluetooth Handsfree Ακουστικά Μαύρο”
- **Belkin Soundform Immerse** (2 listings, 2 sources): bestprice “Belkin Soundform Immerse Ακουστικά Bluetooth In Ear White”; skroutz “Belkin Soundform Immerse In-ear”
- **Hoco ES79** (2 listings, 2 sources): bestprice “Hoco ES79 Ακουστικά Bluetooth Black”; skroutz “Hoco ES79 Bone Conduction Μαύρα”
- **GoGEN MAXISLECHYB** (3 listings, 3 sources): bestprice “GoGEN MAXISLECHYB Ενσύρματα Παιδικά Ακουστικά On Ear Μπλε Λευκά”; shopflix “GoGEN MAXISLECHYB Ενσύρματα Παιδικά On Ear Ακουστικά Μπλε”; skroutz “GoGEN MAXISLECHYB 3.5mm Μπλε”
- **Crystal Audio 02** (3 listings, 3 sources): bestprice “Crystal Audio BT-02 Ενσύρματα & Ασύρματα Bluetooth Ακουστικά On Ear Μα”; shopflix “Crystal Audio BT-02 On Ear Ακουστικά με 2 ώρες Λειτουργίας Μαύρο”; skroutz “Crystal Audio BT-02 Bluetooth / 3.5mm με 8 ώρες Λειτουργίας Μαύρα”
- **OTL Hello Kitty 3D Character** (4 listings, 4 sources): bestprice “OTL Hello Kitty 3D Character Ακουστικά Bluetooth In Ear”; eshop “OTL - HELLO KITTY 3D CHARACTER TWS EARPHONES”; shopflix “OTL Hello Kitty 3D Character In-ear Bluetooth Handsfree με Θήκη Φόρτισ”
- **Ugreen FitBuds WS213** (5 listings, 3 sources): bestprice “Ugreen FitBuds WS213 Ακουστικά Bluetooth Open Ear Ανθεκτικά στο Νερό B”; bestprice “Ugreen FitBuds WS213 Ακουστικά Bluetooth Open Ear White”; shopflix “Ugreen FitBuds WS213 Bluetooth Handsfree με Αντοχή στον Ιδρώτα & Θήκη ”
- **Genesis Neon 360** (3 listings, 3 sources): bestprice “Genesis Neon 360 Gaming Headset Over Ear Black Red”; shopflix “Gaming Headset Genesis Neon 360 Over Ear με Σύνδεση 3.5mm Jack Μαύρο”; skroutz “Genesis Neon 360 Over Ear”
- **Monster Mission 350** (3 listings, 3 sources): bestprice “Monster Mission 350 Ασύρματο Gaming Headset Over Ear Black”; shopflix “Monster Mission 350 Ασύρματο Over Ear Gaming Headset με σύνδεση Blueto”; skroutz “Monster Mission 350 Ασύρματο Over Ear”
- **Edifier X2s** (11 listings, 3 sources): bestprice “Edifier X2s Ακουστικά Bluetooth Earbud Ανθεκτικά στο Νερό Black”; bestprice “Edifier X2s Ακουστικά Bluetooth Earbud Ανθεκτικά στο Νερό Grey”; bestprice “Edifier X2s Ακουστικά Bluetooth Earbud Ανθεκτικά στο Νερό Pink”
- **Remax P3** (3 listings, 2 sources): bestprice “Remax P3 Ακουστικά Bluetooth In Ear White”; bestprice “Remax P3 Ακουστικά Bluetooth In Ear Black”; skroutz “Remax P3 Open Ear Λευκά”
- **Komc G306** (4 listings, 2 sources): bestprice “Komc G306 Gaming Headset Over Ear Brown Camo”; bestprice “Komc G306 Gaming Headset Over Ear Navy Camo”; skroutz “Komc G306 On Ear Brown Camouflage”
- **Gembird BHP-LED-01** (2 listings, 2 sources): shopflix “Gembird BHP-LED-01 Ασύρματα/Ενσύρματα Over Ear Ακουστικά με 4 ώρες Λει”; skroutz “Gembird BHP-LED-01 Bluetooth / 3.5mm με 4 ώρες Λειτουργίας Μαύρα”


## 8. Phone performance (2026-11-14)

Lighthouse mobile (slow-4G phone simulation) on the production build, `scripts/audit/lighthouse-baseline.mjs` (now also measures `/monitor` and `/mouse`). Headphones was built locally with this collection's data, category made visible only for the measurement.

| Page | Before | After |
|---|---|---|
| Headphones (25.9k listings, about 600 KB list file) | 82-83 (TBT 660-690 ms) | 91-92 (TBT 300-340 ms) |
| Mice | 93 (TBT 270 ms) | 96-98 |
| Monitors | 87 (LCP 3.9 s) | 92 (LCP 3.3 s) |
| Every other category, home, builder | 94-99 | unchanged |

Two changes. `percentiles()` in `src/lib/ranking.ts` scanned the sorted array linearly for each value (quadratic: about 100 million steps for 10,000 models); it now uses binary searches and gives the same numbers (`tests/unit/rankingPercentiles.test.ts` compares both on tied and random input). In the catalogue a shop title is shown on two lines at most (the full title is the link's tooltip and the model page): the three-line monitor titles made the first product the largest text on the first screen, so the page's LCP waited for the list download. The real time to the first product on a slow phone is unchanged by the second change; the data size is what sets it (monitors 263 KB, mice 327 KB, headphones about 600 KB), so the price-floor decision in section 6 still stands.
