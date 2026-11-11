# Mouse data review — first full collection (Gate B)

Date: 2026-11-11. Mouse is still `enabled:false, visible:false`. Nothing here was published: no mouse data is in `public/data/`, and nothing was pushed to `main`.

**This report is for the owner's Gate B review.** The next step (hidden enablement, then Tasks 6–9) waits for that review.

## What was measured

- One isolated live collection of the three mouse sources on 2026-11-11 20:25 UTC: 322 list-page requests, 0 blocked, 0 errors. Only list pages were read: no product pages, shipping, price history, maker pages or photo downloads.
- The saved pages were then replayed **offline** through the current parsers and the normal pipeline (`local/mouse/replay_trial.py`, network blocked). The replay rebuilds exactly the live observations: the IDs and prices of all 7,929 observations equal the saved raw files.
- Every number below comes from the fourth replay (`local/mouse/collection-20261111T202540Z/replay-4/`), produced by `local/mouse/report.py`. The live run's own output used an older normalizer and is not the reviewed data.

## Result in short

| | Live run (old normalizer) | Replay 4 (current code) |
| --- | ---: | ---: |
| Accepted listings | 3,349 | 7,114 |
| Models | 2,454 | 5,037 |
| Rejected listings | 4,580 | 815 |
| of which no maker or model found | 4,475 | 707 |

- 903 models (18%) are on two or three sources. The rest are on one source: mice are a long-tail market with many small makers, and Snif's titles often differ from the other two.
- In the 50 random model groups below I found no false join. The groups are listed so the owner can check this.
- The 41 models with a very wide price range were checked: they are the same title at different shops (marketplace outliers such as one 636 € offer), not different products, with the exceptions listed under "Known limits".

## Parser changes made after the live run (all with tests from observed titles)

1. **Makers**: the 207 maker labels from the sources' own filters, plus 90 makers that open at least three otherwise unidentified titles (Weibo, Rampage, Xtrfy, Turtle Beach…), plus six spelling aliases where both spellings carry the same model codes (for example "Baracuda"/"Barracuda", "3D Connexion"/"3Dconnexion").
2. **Two maker names in one title**: the maker that opens the title wins and the other name stays in the model ("A4Tech Bloody R72", "Esperanza Titanum TM108"). Before, these 100+ listings were rejected.
3. **Colours**: 30 more colour names and shade words ("Light Grey", "Off-White", "Matte Black", Γαλάζιο, Μπεζ, Καφέ…). Before, such words stayed in the model name and split one model into several. A colour word inside a hyphenated code ("GD-BLACK") is left alone.
4. **Spelling of the same model**: models are grouped by letters and digits only, like every other category ("MW 2400" = "MW2400", "M815 Pro" = "M815-PRO"). The first version gave such pairs a `#2` name, which made 79 duplicate models. Marks that do name a different product are kept as words: "Yvi+" becomes "Yvi Plus", "Model O-" becomes "Model O Minus", "για Αριστερόχειρες" becomes "Left-Handed". **This replaces the plan's rule that punctuation variants never share a model**; the 79 observed pairs were the same product.
5. **Titles that state no connection**: they join the wired model of the same name only. Before, they also joined a wireless model when that was the only one, which put cheaper wired versions under wireless models (SteelSeries Prime at 20 € under Prime Wireless at 80 €). 79 models were joined this way; in 23 of them the title without a connection was over 30% cheaper. Now they stay a separate model named without a connection.
6. **Smaller fixes**: "RF-6300" is a model code, not a 2.4 GHz statement; "USB-C" stays in the name (Lenovo 400 USB-C is its own product); Snif's doubled "Logitech G G102"; part numbers of Razer, Corsair, Asus, Lenovo, HP/HyperX, Glorious and Endgame Gear are read as part numbers instead of staying in the name; a title whose only name is a part number uses it as the model; a "name" of more than eight words (a marketing sentence) is rejected.

## Known limits (not fixed; for the owner's decision)

- **707 listings (8.9%) have no usable identity.** About 310 start with a word seen only once or twice, about 100 have no maker at all ("Ασύρματο Μαύρο"), and about 120 name a known maker but no model ("Port Designs Ασύρματο Γαλάζιο"). They are kept in `rejected.json`, not shown.
- **A model named only by a generic word** groups unrelated products when a maker gives nothing else: "Equip Mini" has five BestPrice listings from 5 € to 636 €. A rule against this would also reject real one-word names (Logitech Pop, Razer Cobra).
- **A title with no connection beside a wireless model** is now a second model ("Glorious Model D" and "Glorious Model D Wireless"). Some of these are the same wireless product whose title omits the word (for example a colour variant on BestPrice). This is a duplicate entry, chosen over a wrong lowest price.
- **Same part number under two names rejects both** (20 listings, for example Logitech G Pro X Superlight 2 with and without "Lightspeed" in the name). This is the plan's rule; the storage category does the opposite (same part number = same product). Changing it would recover these few listings.
- **Colour and edition words not in the vocabulary** still stay in a name ("Stone Black", "Moonlight White", "Quartz"), which can split a model by colour.
- **Snif** matches the other sources less often (564 of its models are on Snif only): its titles carry part numbers and marketing words in many shapes.
- **Specifications are thin**: only what list titles and Skroutz's card line state. DPI is unknown for 75% of models, buttons for 72%, polling rate for 87%. Filters on these fields will show few products until a later phase reads product pages (not part of this release).
- The Skroutz gaming and office lists share **no** product ID, so the "gaming wins on overlap" rule had nothing to do in this collection.
- The five-product difference between BestPrice's advertised total (2,780) and the slices (2,775) is unexplained; the slices returned exactly 2,775 unique products.

## Checks

Run on 2026-11-11 after the last parser change:

- All 31 `scripts/checks/test_*.py` programs pass (mouse: 32 normalizer tests, 10 pipeline tests, the Skroutz collector tests).
- `npm run check` passes: 83 test files, 1,655 tests passed and 1 skipped, typecheck, lint and build green.
- Offline replay: IDs and prices of all 7,929 observations equal the saved raw files.
- **Not re-run**: the Playwright suite (`npm run e2e`). Its last full local run (322 passed) was at Gate A; since then only `scraper/normalize_mouse.py`, the Skroutz list reader's mouse branch and their tests changed, and mouse is disabled in the site. GitHub run 43092987454 (code at `8e71980`): `check` passed, the browser job still showed "in progress" when this was written. Run `npm run e2e` before any push.

## Not done yet

- `MIN_MODELS.mouse` is still the placeholder 1. It is set from the frontend's own model count only after this review (plan Task 5, step 5); the Python count is 5,037.
- No collection through GitHub Actions yet: the reviewed data is a local trial. The first Actions run needs the owner's yes and a push of this branch.
- Tasks 6–9 (filters, colour selector, derived-data tests, visible preview, release) have not started.

## Measured BestPrice price slices (preflight, 2026-11-11)

Parameters are cents. Each slice stays under BestPrice's cap of 50 pages / 800 products. Edge prices are inclusive on both sides (probed at 999/1000/1001 cents).

| Query | Products | Pages |
| --- | ---: | ---: |
| `max=499` | 445 | 28 |
| `min=500&max=699` | 400 | 25 |
| `min=700&max=999` | 504 | 32 |
| `min=1000&max=1999` | 711 | 45 |
| `min=2000&max=3999` | 389 | 25 |
| `min=4000&max=7999` | 154 | 10 |
| `min=8000` | 172 | 11 |
| **Sum** | **2,775** | **176** |

Runtime for the scheduled run: the three sources ran in parallel and the slowest (BestPrice) took 372 s, so mice add about 6 minutes to `scrape-shops` prices (measured 49 min 30 s in run 43067793455, timeout 90) and about 3.5 minutes of Skroutz list reading to `scrape.yml`.

## Source counts

| Source | List requests | Seconds (live) | Observations | Accepted | Rejected | Accepted % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| skroutz | 84 | 200 | 3996 | 3531 | 465 | 88.4 |
| bestprice | 176 | 372 | 2775 | 2551 | 224 | 91.9 |
| snif | 62 | 130 | 1158 | 1032 | 126 | 89.1 |
| **all** | 322 | 372 (parallel) | 7929 | 7114 | 815 | 89.7 |

## Models

5037 models from 7114 accepted listings: 83 on three sources, 820 on two, 4134 on one (skroutz only 2493, bestprice only 1077, snif only 564). 1189 models have more than one listing; 578 have more than one stated colour.
No model name carries a `#` collision suffix: True.
Candidate photo URLs: 5036 of 5037 models (100.0%).

Skroutz lists: gaming 1750 product IDs, office 2256, in both 0, union 4006 (cards with a usable price: 3996).
Snif stopped at page snif_mouse_p62.html: 0 product rows there, 0 not seen on earlier pages; 1158 product IDs in all.

## Fields: share that is unknown (null)

| Field | skroutz | bestprice | snif | all listings | models (every listing unknown) |
| --- | ---: | ---: | ---: | ---: | ---: |
| connection | 29% | 7% | 25% | 21% | 25% |
| colour | 21% | 5% | 10% | 14% | 13% |
| gaming | 0% | 55% | 44% | 26% | 30% |
| dpi | 64% | 99% | 74% | 78% | 75% |
| pollingHz | 80% | 100% | 87% | 88% | 87% |
| buttons | 59% | 99% | 80% | 76% | 72% |
| rgb | 75% | 100% | 74% | 84% | 81% |
| bluetooth | 85% | 74% | 91% | 82% | 86% |
| rf | 67% | 71% | 90% | 71% | 78% |
| rechargeable | 92% | 94% | 97% | 94% | 95% |
| ergonomic | 93% | 87% | 95% | 91% | 91% |
| silent | 99% | 98% | 96% | 98% | 98% |
| partNumber | 100% | 100% | 79% | 97% | 97% |

Values after sharing within a model (`Category.shared`); `colour` and `partNumber` are per listing and never shared.

Stated connection of accepted listings: wireless 4223, not stated 1466, wired 1392, both 33.

## Rejected listings

| Reason | skroutz | bestprice | snif | all |
| --- | ---: | ---: | ---: | ---: |
| no-identity | 434 | 207 | 66 | 707 |
| not-mouse | 19 | 13 | 43 | 75 |
| identity-conflict | 6 | 3 | 11 | 20 |
| bundle | 6 | 1 | 6 | 13 |

### no-identity: 20 of 707 (seed 20261111)

- skroutz: Pulsar Ασύρματο Λευκό
- skroutz: Techancy K33 Μαύρο
- skroutz: Πολύχρωμο
- bestprice: Racing Ασύρματο Ποντίκι Grey
- skroutz: wb-18-4 Μπλε
- skroutz: MZ-012 Ασύρματο Γκρι
- snif: Ποντίκι Alienware AW720M Tri Mode RGB Wireless Lunar Light 545-BBDO
- skroutz: Swiftpoint Λευκό
- bestprice: Dicota Ασύρματο Bluetooth Ποντίκι White
- bestprice: Ασύρματο Ποντίκι Υπολογιστή με Αντάπτορα 2.4 GHz
- bestprice: Car Porche Ασύρματο Ποντίκι Black
- bestprice: Ποντίκι Κάθετο Ασύρματο Εργονομικό με Bluetooth, , 2.4 GHz 800-1200 DPI, 7.5x12x6.5 cm
- skroutz: Ενσύρματο Vertical Μαύρο
- skroutz: Gamiac PA50 Μαύρο
- skroutz: Thunder Wolf V10 Luminous Aggravated Μαύρο
- bestprice: K201 Ενσύρματο Ποντίκι Blue
- skroutz: Ασύρματο Γκρι
- skroutz: KF18068 Ασύρματο Κόκκινο
- bestprice: G-303 Ασύρματο Ποντίκι Petrol
- snif: Nplay AIM 1.0 Gaming Ενσύρματο Ποντίκι - Μαύρο

### not-mouse: 20 of 75 (seed 20261111)

- snif: ZYKON P1 Gaming Mouse Pad Μαύρο
- snif: Ποντίκι Noozy GM-32 6D με Mouse pad Black
- skroutz: White Shark GM-9006 Marrok & Mousepad Λευκό
- bestprice: Apple Magic Trackpad USB-C 2024 Ασύρματο Bluetooth White
- snif: Ποντίκι Trust GXT 112 Wireless Illuminated Black + Mouse Pad 25070
- bestprice: Logitech Signature M650 Ασύρματο Bluetooth Ποντίκι Graphite + Mouse Pad
- bestprice: Apple Magic Trackpad 2022 Ασύρματο Bluetooth Black
- snif: Gaming Ενσύρματο Ποντίκι Logitech G G502 X με Mousepad G240 - Μαύρο
- snif: Marvo G909 ενσύρματο Gaming ποντίκι και Mousepad
- bestprice: Q8035 Mouse and Mouse Pad
- skroutz: Rebeltec Red Dragon & Mouse Pad Μαύρο
- snif: Sades MousePad Lightning
- skroutz: Apple Magic Trackpad (USB-C) Ασύρματο Touchpad
- snif: Presenter Logitech R500s Wireless Graphite 910-005843
- snif: DELOCK ασύρματο ποντίκι 12526, Οπτικό, USB-C receiver, 3-button, μαύρο
- skroutz: Spirit of Gamer Elite M10 & Mouse Pad Μαύρο
- skroutz: Xtrike Me GMP-505 & Mouse Pad Πράσινο
- skroutz: Apple Magic Trackpad Ασύρματο & Ενσύρματο Touchpad Λευκό
- snif: Meetion C011 RGB Gaming Ενσύρματο Ποντίκι + Mousepad Μαύρο
- snif: MOUSE PAD A4Tech MP-50RS RGB 358mm

### identity-conflict: 20 of 20 (seed 20261111)

- snif: Ποντίκι Logitech G PRO X Superlight 2 LightSpeed Black 910-006631
- snif: Ποντίκι HyperX Pulsefire Haste 2 RGB Black 6N0A7AA
- snif: Logitech Mouse G PRO X SUPERLIGHT 2 Black (910-006631)
- skroutz: Corsair Katar Pro Μαύρο
- skroutz: HyperX Pulsefire Haste 2
- bestprice: Contour Design RollerMouse Red Black
- snif: HP Wired Mouse 100 EURO - 6VY96AA
- snif: Logitech Mouse 910-006274 M650 Signature Business Gray
- skroutz: Logitech G502 X
- snif: Ποντίκι Logitech G502 X Black 910-006139
- skroutz: Logitech M185 (910-002237) Ασύρματο Mini Black/Red
- snif: Ποντίκι HP Travel Ενσύρματο G1K28AA
- skroutz: Corsair Scimitar RGB Elite Μαύρο
- snif: Ποντίκι Corsair Scimitar RGB Elite Black CH-9304211-EU
- skroutz: Genesis Krypton 660
- snif: Ποντίκι Logitech M185 Wireless Red 910-002237
- bestprice: HP G1K28AA Ενσύρματο Ποντίκι Black
- snif: Ποντίκι HP 100 Wired Black 6VY96AA
- bestprice: HP 100 Ενσύρματο Ποντίκι Black 6VY96AA
- snif: Ποντίκι Logitech Signature M650 Medium for Business Wireless Graphite 910-006274

### bundle: 13 of 13 (seed 20261111)

- skroutz: A4Tech Wired Optical Mouse Combo Ενσύρματο Mini Μαύρο
- skroutz: Thermaltake Talon Elite RGB Gaming Gear Combo Μαύρο
- skroutz: Thermaltake Talon X Gaming Gear Combo Μαύρο
- skroutz: Meetion C011 Combo Μαύρο
- bestprice: Lazerbuilt - Minions - Σετ ασύρματου ποντικιού και deskmat
- snif: Logitech MK250 Σετ Ασύρματο Bluetooth Μηχανικό Πληκτρολόγιο Μαύρο (US)
- skroutz: Mars Gaming MCPPRO Combo Μαύρο
- skroutz: Σετ Office Gift Ασύρματο Χρυσό
- snif: Element KB-145UMS Σετ Πληκτρολόγιο & Ποντίκι Ελληνικό
- snif: T'nB BUMWXCOAST SET WIRELESS OPTICAL MOUSE & MOUSE PAD COAST
- snif: Element KB-255WMS Ασύρματο Σετ Πληκτρολόγιο & Ποντίκι Ελληνικό
- snif: Gaming Set Defender Devourer MHP-006 Mouse + Headphones+ Mousepad
- snif: Spirit of Gamer Elite M10 Gaming Mouse + Pad Bundle Gaming Ενσύρματο Ποντίκι Μαύρο

## 50 random model groups (seed 20261111, model keys sorted)

**Gembird MUSG1** (1 listings, 1 sources)

- snif 7.90 € [?, black] Gembird USB Gaming Ποντίκι Μαύρο MUSG1

**Rapoo M300 Silent Wireless** (1 listings, 1 sources)

- skroutz 20.00 € [wireless, ?] Rapoo M300 Silent Ασύρματο

**Mars Gaming MMPRO** (1 listings, 1 sources)

- skroutz 39.90 € [?, ?] Mars Gaming MMPRO

**Speedlink Libera Wireless** (3 listings, 2 sources)

- bestprice 19.29 € [wireless, black] Speedlink Libera Ασύρματο Bluetooth Ποντίκι Black
- bestprice 19.29 € [wireless, white] Speedlink Libera Ασύρματο Bluetooth Ποντίκι White
- skroutz 19.91 € [wireless, ?] SpeedLink Libera Ασύρματο

**Omega OM06VB Wired** (1 listings, 1 sources)

- bestprice 3.90 € [wired, black] Omega OM06VB Ενσύρματο Ποντίκι Black

**Keychron M6-A1 Wireless** (1 listings, 1 sources)

- bestprice 46.51 € [wireless, black] Keychron M6-A1 Ασύρματο Bluetooth Ποντίκι Black

**Hama EWM-500 Wireless** (1 listings, 1 sources)

- skroutz 17.46 € [wireless, black] HAMA EWM-500 Ασύρματο Μαύρο

**A4Tech W90 Pro** (1 listings, 1 sources)

- skroutz 32.00 € [?, black] A4Tech W90 Pro Μαύρο

**HP DM10 Wireless** (3 listings, 2 sources)

- bestprice 13.98 € [wireless, grey] HP DM10 Ασύρματο Bluetooth Ποντίκι Grey
- bestprice 13.98 € [wireless, black] HP DM10 Ασύρματο Bluetooth Ποντίκι Black
- skroutz 13.98 € [wireless, ?] HP DM10 Ασύρματο

**MARVO Fit Lite** (1 listings, 1 sources)

- skroutz 33.73 € [?, ?] Marvo Fit Lite

**Trust Primo Mini Wired** (1 listings, 1 sources)

- bestprice 9.90 € [wired, red] Trust Primo Ενσύρματο Mini Ποντίκι Red

**Roccat Kone XP** (1 listings, 1 sources)

- skroutz 179.91 € [?, white] Roccat Kone XP Λευκό

**Indena G-536-E** (1 listings, 1 sources)

- skroutz 17.89 € [?, black] Indena G-536-E Μαύρο

**A4Tech FB10C Fstyle Stone Wireless** (1 listings, 1 sources)

- skroutz 14.04 € [wireless, black] A4Tech FB10C Fstyle Ασύρματο Stone Black

**Genius NX-7000SE Wireless** (1 listings, 1 sources)

- skroutz 18.90 € [wireless, black] Genius NX-7000SE Ασύρματο Μαύρο

**WLmouse Beast G Mini Wireless** (1 listings, 1 sources)

- skroutz 79.52 € [wireless, ?] WLmouse Beast G Mini Ασύρματο

**Element MS-30W Wired** (2 listings, 2 sources)

- bestprice 4.00 € [wired, white] Element MS-30W Ενσύρματο Ποντίκι White
- skroutz 7.90 € [wired, white] Element MS-30W Ενσύρματο Λευκό

**Nilox NXMOEVR01B Vertical Wireless** (1 listings, 1 sources)

- bestprice 29.90 € [wireless, black] Nilox NXMOEVR01B Ασύρματο Bluetooth Ποντίκι Vertical Black

**Evoluent VerticalMouse 4 Right Wired** (1 listings, 1 sources)

- skroutz 104.30 € [wired, grey] Evoluent VerticalMouse 4 Right Ενσύρματο Γκρι

**Targus Antimicrobial Wired** (1 listings, 1 sources)

- skroutz 18.90 € [wired, black] Targus Antimicrobial Ενσύρματο Μαύρο

**Xtrike Me GM-301** (1 listings, 1 sources)

- skroutz 6.00 € [?, black] Xtrike Me GM-301 Μαύρο

**Lenovo ThinkPad USB-C Wired** (2 listings, 2 sources)

- skroutz 13.61 € [wired, black] Lenovo ThinkPad USB-C Ενσύρματο Μαύρο
- bestprice 16.33 € [wired, black] Lenovo ThinkPad Wired USB-C Black

**Defender Accura MM-665 Wireless** (2 listings, 2 sources)

- bestprice 6.18 € [wireless, black] Defender Accura MM-665 Ασύρματο Bluetooth Ποντίκι Black
- skroutz 9.90 € [wireless, black] Defender Accura MM-665 Ασύρματο Μαύρο

**Modecom WM9.1 Wireless** (1 listings, 1 sources)

- skroutz 15.90 € [wireless, ?] Modecom WM9.1 Ασύρματο

**Trust Yvi Dual-Mode Mini Wireless** (1 listings, 1 sources)

- skroutz 67.15 € [wireless, grey] Trust Yvi Dual-Mode Ασύρματο Mini Γκρι

**iBox JAY PRO Wireless** (1 listings, 1 sources)

- bestprice 31.24 € [wireless, black] iBox Mouse JAY PRO Ασύρματο Ποντίκι Black

**Keychron M3 Mini Wireless** (4 listings, 3 sources)

- skroutz 53.48 € [wireless, ?] Keychron M3 Mini Ασύρματο
- bestprice 59.50 € [wireless, white] Keychron M3 Mini Ασύρματο Bluetooth Ποντίκι White
- snif 64.90 € [wireless, black] Keychron M3 Mini Ασύρματο Ποντίκι - Μαύρο
- snif 70.00 € [wireless, black] Keychron M3 Mini Gaming Ασύρματο Ποντίκι - Μαύρο

**Shintek FMOO-WBF-1S Mini Wireless** (1 listings, 1 sources)

- bestprice 21.89 € [wireless, ?] SHINTEK FMOO-WBF-1S Ασύρματο Mini Ποντίκι

**Platinet OM229M Wireless** (1 listings, 1 sources)

- skroutz 5.50 € [wireless, mint] Platinet Ασύρματο Mint

**Asus ROG Keris II Origin Moonlight Wireless** (1 listings, 1 sources)

- skroutz 113.98 € [wireless, white] Asus ROG Keris II Origin Ασύρματο Moonlight White

**Barracuda 6D BGM-031** (1 listings, 1 sources)

- snif 12.89 € [?, black-coral] Ποντίκι Baracuda Coral 6D RGB Black BGM-031

**Conceptronic DJEBBEL04B** (1 listings, 1 sources)

- skroutz 25.44 € [?, black] Conceptronic DJEBBEL04B Μαύρο

**MARVO M115** (1 listings, 1 sources)

- skroutz 14.50 € [?, black] Marvo M115 Μαύρο

**Total Gift Departures Wireless** (1 listings, 1 sources)

- skroutz 14.60 € [wireless, black] Total Gift Departures Ασύρματο Μαύρο

**Active Key AK-PMH12 Wired** (1 listings, 1 sources)

- skroutz 98.79 € [wired, white] Active Key AK-PMH12 Ενσύρματο Λευκό

**Defender Effect X MM-935 Wireless** (1 listings, 1 sources)

- skroutz 7.30 € [wireless, black] Defender Effect X MM-935 Ασύρματο Μαύρο

**Jokade JF001 Wired** (2 listings, 2 sources)

- skroutz 4.45 € [wired, black] Jokade JF001 Ενσύρματο Μαύρο
- bestprice 4.96 € [wired, black] Jokade JF001 Ενσύρματο Ποντίκι Black

**Corsair Katar Pro Xt Wired** (1 listings, 1 sources)

- snif 51.89 € [wired, black] Gaming Ενσύρματο Ποντίκι Corsair Katar Pro Xt 18000 DPI RGB - Μαύρο

**Fellowes Breyta Vertical Wireless** (1 listings, 1 sources)

- skroutz 83.33 € [wireless, beige] Fellowes Breyta Ασύρματο Vertical Μπεζ

**Redragon Deicide Lite Wireless** (1 listings, 1 sources)

- skroutz 20.61 € [wireless, black] Redragon Deicide Lite Ασύρματο Μαύρο

**Esperanza MX403 Apache** (1 listings, 1 sources)

- skroutz 8.43 € [?, ?] Esperanza MX403 Apache

**T'nB Rubby Wireless** (1 listings, 1 sources)

- skroutz 19.01 € [wireless, ?] T'nB Rubby Ασύρματο

**HP X1000 Wired** (1 listings, 1 sources)

- bestprice 8.60 € [wired, black] HP X1000 Ενσύρματο Ποντίκι Black

**BakkerElkhuizen Evoluent 4 Right Hand Small Mini Vertical Wireless** (1 listings, 1 sources)

- bestprice 90.96 € [wireless, black-brown] BakkerElkhuizen Evoluent 4 Right Hand Small Ασύρματο Mini Ποντίκι Εργονομικό Vertical Black Brown

**Razer Orochi V2Quartz Wireless** (1 listings, 1 sources)

- snif 89.34 € [wireless, ?] Razer Orochi V2Quartz Gaming Ασύρματο Ποντίκι

**Fantech Combat X8** (1 listings, 1 sources)

- skroutz 24.00 € [?, black] FanTech Combat X8 Μαύρο

**MSI Clutch GM41 Lightweight** (1 listings, 1 sources)

- skroutz 43.39 € [?, black] MSI Clutch GM41 Lightweight Μαύρο

**Trust Verto Ergonomic Wired** (1 listings, 1 sources)

- snif 28.90 € [wired, ?] Ενσύρματο ποντίκι TRUST Verto Ergonomic Mouse

**Kensington Pro Fit Retractable Mini Wired** (2 listings, 2 sources)

- bestprice 24.65 € [wired, black] Kensington Pro Fit Retractable Ενσύρματο Mini Ποντίκι Black
- skroutz 30.81 € [wired, black] Kensington Pro Fit Retractable Ενσύρματο Mini Μαύρο

**Keychron G1 8K Wireless** (1 listings, 1 sources)

- skroutz 80.03 € [wireless, ?] Keychron G1 8K Ασύρματο

## Widest price ranges inside one model (possible false joins)

41 models have a highest price at least three times the lowest. The fifteen widest:

- **Equip Mini** ×95.4: bestprice 6.67 € “Equip Mini Grey”; bestprice 636.22 € “Equip Mini Black”
- **Logitech M500 Wired** ×14.8: bestprice 10.40 € “Logitech M500 Ενσύρματο Ποντίκι Black”; skroutz 153.40 € “Logitech M500 Ενσύρματο”
- **NGS Flame Wired** ×13.9: bestprice 2.16 € “NGS Flame Ενσύρματο Ποντίκι Red”; bestprice 30.06 € “NGS Flame Ενσύρματο Ποντίκι Black”
- **iBox LORIINI IMOF008W Wireless** ×10.8: bestprice 3.05 € “iBox LORIINI IMOF008W Ασύρματο Ποντίκι Red”; bestprice 32.91 € “iBox LORIINI IMOF008W Ασύρματο Ποντίκι Grey”
- **Contour RollerMouse Pro3 Wired** ×6.6: bestprice 64.28 € “Contour Design RollerMouse Pro 3”; skroutz 426.07 € “Contour RollerMouse Pro3 Ενσύρματο Μαύρο”
- **Equip Mini Wireless** ×6.5: bestprice 5.38 € “Equip Optical Ασύρματο Mini Ποντίκι Blue”; bestprice 35.07 € “Equip Optical Ασύρματο Mini Ποντίκι Red”
- **Logitech M500s Wired** ×6.1: bestprice 29.90 € “Logitech M500s Ενσύρματο Ποντίκι Εργονομικό Black”; skroutz 183.48 € “Logitech M500s Ενσύρματο Μαύρο”
- **Gembird MUS-4B-01 Wired** ×5.9: bestprice 2.01 € “Gembird MUS-4B-01 Ενσύρματο Ποντίκι Black”; skroutz 11.87 € “Gembird MUS-4B-01 Ενσύρματο”
- **NGS Crew Wired** ×5.5: bestprice 6.03 € “NGS Crew Ενσύρματο Ποντίκι Red”; bestprice 32.98 € “NGS Crew Ενσύρματο Ποντίκι Grey”
- **Inca IWM-231RB Wireless** ×5.4: bestprice 4.93 € “Inca IWM-231RB Ασύρματο Ποντίκι Brown”; skroutz 26.72 € “Inca Ασύρματο Καφέ”
- **Inca IWM-243RS Wireless** ×5.0: bestprice 5.21 € “Inca IWM-243RS Ασύρματο Ποντίκι Black”; skroutz 26.04 € “Inca IWM-243RS Ασύρματο Μαύρο”
- **Modecom MC-M10S Wired** ×4.9: skroutz 6.90 € “Modecom MC-M10S Ενσύρματο Κόκκινο”; bestprice 33.52 € “Modecom MC-M10S Ενσύρματο Ποντίκι Black”
- **Manhattan Funk Wireless** ×4.6: bestprice 9.22 € “Manhattan Funk Ασύρματο Ποντίκι Transparent Black”; skroutz 42.32 € “Manhattan Funk Ασύρματο”
- **Genius DX-110 Wired** ×4.4: skroutz 5.20 € “Genius DX-110 Ενσύρματο”; bestprice 22.99 € “Genius DX-110 Ενσύρματο Ποντίκι Red”
- **Rebeltec Focus Wired** ×4.3: bestprice 2.06 € “Rebeltec Focus Ενσύρματο Ποντίκι Black”; skroutz 8.90 € “Rebeltec Focus Ενσύρματο Μαύρο”
