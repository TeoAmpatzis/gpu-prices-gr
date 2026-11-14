# Mousepads: Phase 2 data review

Status: **local trial only**. Source: the isolated collection `local/mousepad/collection-20261114T093641Z` (git-ignored), re-normalized offline with the Phase 1 normalizer (`local/mousepad/replay.py`). Nothing was written to `public/data/`, nothing was pushed, no workflow ran.

The trial files themselves were produced by the first-cut normalizer, so their sizes below (`latest.json` 3.6 MB, `rejected.json` 7.1 MB) are an upper bound; the numbers in this document are from the final Phase 1 normalizer on the same raw titles.

## 1. Collection

| Source | Raw listings | Requests | Blocked | Errors | Time |
| --- | ---: | ---: | ---: | ---: | ---: |
| skroutz | 6,142 | 130 | 0 | 0 | 295 s |
| bestprice | 2,979 | 195 | 0 | 0 | 412 s |
| snif | 1,287 | 69 | 0 | 0 | 143 s |
| shopflix | 1,863 | 41 | 0 | 0 | 66 s |
| eshop | 238 | 25 | 0 | 0 | 48 s |
| **total** | **12,509** | 460 | 0 | 0 | max 412 s (sources run in parallel), sum 963 s |

Skroutz: three disjoint facet paths (Gaming, Standard, round), 6,142 collected against about 6,163 expected. BestPrice: 18 price slices, all under the 50-page cap by skipping exactly 10.80 EUR (the print-on-demand price). Shopflix: Koupakoupa excluded at the source (`shopflix_exclude`), which brings the list under Algolia's 1,000-hit limit.

## 2. What the normalizer keeps and rejects

| Source | Kept | custom-print | no-identity | not-mousepad | bundle | identity-conflict |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| skroutz | 1,901 | 3,286 | 945 | 6 | 3 | 1 |
| bestprice | 1,511 | 318 | 1,129 | 17 | 4 | 0 |
| snif | 506 | 249 | 20 | 499 | 3 | 10 |
| shopflix | 1,337 | 28 | 484 | 2 | 6 | 6 |
| eshop | 215 | 0 | 16 | 6 | 1 | 0 |
| **all** | **5,470** | **3,881** | **2,594** | **530** | **17** | **17** |

### custom-print (3,881): Print-on-demand pads and catalogue designs in fixed shapes

- skroutz 15.90: Bts Music Band 230mm Γκρι
- skroutz 11.80: Koupakoupa Τραπουλόχαρτα 230mm
- skroutz 11.80: Koupakoupa Στον Αγαπημένο Μου Οδηγό Σχολικού! 200mm
- skroutz 11.80: Koupakoupa Hocus Pocus 200mm
- skroutz 11.80: Koupakoupa Brawl Stars Leon 230mm Γκρι
- skroutz 11.80: Koupakoupa You Died | Dark Souls 230mm

### no-identity (2,594): No maker the normalizer can name

- skroutz 0.73: F2 240mm
- bestprice 23.27: Rick and Morty Dimension C-137 XXL
- shopflix 9.00: Gembird Gaming Mouse Pad 300mm με RGB Φωτισμό
- skroutz 21.90: Lexip Mouse Pad
- bestprice 133.28: Tl141892 Honey Large
- shopflix 9.72: Ven Core 2793-10009 Gaming Mouse Pad XXL (900mm) Γκρι

### not-mousepad (530): Mice, wrist rests, desk accessories

- snif 139.00: Logitech MX Master 4 Ασύρματο Ποντίκι - Graphite
- skroutz 30.69: Ergonomic Foam Mouse Wrist Pad Black Fellowes
- bestprice 12.36: Fellowes Wrist Support Silver
- snif 6.99: MediaRange MROS213 Ενσύρματο Ποντίκι - Μαύρο
- snif 21.22: White Shark Galahad Ενσύρματο Ποντίκι Ροζ
- snif 4.68: Trust TM-24657 Ενσύρματο Standard Ποντίκι Μαύρο

### bundle (17): Two products in one title

- bestprice 15.28: CREATE + *PRINT MOUSEPAD
- snif 35.90: HP 235 Ασύρματο Σετ Πληκτρολόγιο Ποντίκι (GR) - Γκρι
- shopflix 12.36: Mousepad Disney Σετ Mini Οπτικό Ποντίκι 240x200x3mm Μαύρο
- bestprice 5.90: Speedlink Silk & Crome + Ballchain Sl-6232-42
- shopflix 4.87: Mousepad Disney Cars Tp1002 με Ποντίκι Two Pack 135-0021
- skroutz 23.99: Sonic Dr Eggman Xl Desktop Mat + 1 Coaster 800x300x3mm

### identity-conflict (17): One part number, two names

- shopflix 54.90: Corsair Mm Extended Mouse Pad XXL (1220mm) Γκρι CH-941D0C5-WW
- shopflix 118.59: Razer Atlas Pro Gaming Mouse Pad Λευκό RZ02-05760200-R3M1
- snif 139.00: Mouse Pad Razer Atlas Pro Tempered Glass White RZ02-05760200-R3M1
- snif 57.90: Mouse Pad Razer Gigantus V2 Pro L Speed Black RZ02-05490900-R3M1
- skroutz 53.30: Razer RZ02-05490900-R3M1 Large 500mm Μαύρο
- snif 54.90: Mouse Pad Corsair MM Anti-Fray 3XL Υφασμάτινο Gaming Grey CH-941D0C5-WW

## 3. Models

5,470 kept listings settle to **3,432 models** (maker + model + size).

| Sources per model | Models |
| ---: | ---: |
| 1 | 2,319 |
| 2 | 823 |
| 3 | 217 |
| 4 | 68 |
| 5 | 5 |

## 4. How much is unknown

A field no title states stays `null`; it is never turned into `false`. Share of the kept listings that state the field:

| Field | Stated | Of which true |
| --- | ---: | ---: |
| size | 62.4% | |
| widthMm | 51.4% | |
| heightMm | 5.2% | |
| thicknessMm | 2.3% | |
| shape | 0.5% | |
| surface | 3.3% | |
| colour | 66.4% | |
| partNumber | 0.9% | |
| gaming | 53.0% | 35.9% |
| extended | 1.5% | 1.5% |
| rgb | 5.2% | 5.2% |
| wristRest | 3.2% | 3.2% |
| usbPort | 0.1% | 0.1% |
| wirelessCharging | 0.3% | 0.3% |
| antiSlip | 0.4% | 0.4% |
| stitchedEdges | 0.4% | 0.4% |

Size words: none stated 2,059, XXL 1,312, Medium 636, Large 535, XL 480, Small 370, XXXL 78.

Models with a size on at least one listing: 2,143 of 3,432. With a width in mm: 1,597. Models with more than one colour: 186.

Prices of kept listings: min 0.43, median 13.59, 95th percentile 54.90, max 373.96. No minimum price is applied.

Top makers: Razer 182, Sharkoon 175, Grupo Erik 157, SteelSeries 139, Gembird 126, Trust 122, Esperanza 120, Fellowes 112, Natec 97, VenCore 90, Genesis 89, Logitech 88.

## 5. Fifty random models (review for wrong merges)

- **Lexip Mouse Pad XXL** (4 listings, 1 sources)
    - Lexip XXL 800mm
    - Lexip Xxl
    - Lexip Xxl XXL 900mm Μαύρο
- **iTotal XL2552I** (2 listings, 2 sources)
    - I-Total XL2552I 240mm
    - I-Total XL2552I Mouse Pad 240mm
- **iTotal Xl2552d Cat 3d** (2 listings, 2 sources)
    - Mouse Pad I-total Xl2552d White Cat 3d 24x20
- **HyperX Fury Ultra Medium** (2 listings, 2 sources)
    - HyperX Fury Ultra RGB Medium 360mm Μαύρο
    - HyperX Fury Ultra RGB Black Medium
- **MARVO G52 Large** (2 listings, 2 sources)
    - Marvo G52 Large 450mm
    - Marvo G52 Gaming Mouse Pad Large 450mm
- **Motospeed P98 350.52mm Medium** (2 listings, 2 sources)
    - Motospeed P98 Medium 350.52mm Μαύρο
    - Motospeed P98 Gaming Mouse Pad Medium 350.52mm με RGB Φωτισμό Μαύρο
- **VenCore 2793-10029 XXL** (2 listings, 2 sources)
    - VenCore 2793-10029 XXL 900mm
    - VenCore 2793-10029 Gaming Mouse Pad XXL (900mm)
- **Genesis NDS-2278 Large** (2 listings, 2 sources)
    - Genesis NDS-2278 Large 400mm Μαύρο
    - Genesis NDS-2278 Gaming Mouse Pad Large 400mm Μαύρο
- **C-TECH GMP-01C-R** (2 listings, 2 sources)
    - C-TECH GMP-01C-R Κόκκινο
    - C-TECH GMP-01C-R Gaming Mouse Pad Κόκκινο
- **Konix Boruto: Naruto Next Generations** (2 listings, 2 sources)
    - Konix Boruto: Naruto Next Generations
    - Konix Boruto: Naruto Next Generations Mouse Pad
- **Cougar Arena X XXL** (3 listings, 3 sources)
    - Cougar Arena X XXL 1000mm Ροζ
    - Cougar Arena X Pink XXL
    - Mouse Pad Cougar Arena X Gaming XXL 1000mm Μαύρο
- **Defender Journey Beijing** (2 listings, 2 sources)
    - Defender Journey 240mm Beijing
    - Defender Journey Mouse Pad 240mm Beijing
- **MARVO G63 XXL** (2 listings, 2 sources)
    - Marvo G63 XXL 900mm Μπεζ
    - Mouse Pad Marvo G63 Gaming XXL 900mm Μπεζ
- **Defender Journey Venechia** (2 listings, 2 sources)
    - Defender Journey 240mm Venechia
    - Mousepad Defender Journey 240x190mm Venechia
- **Adata XTREMESAGA04-BKCWW XXL** (2 listings, 2 sources)
    - Adata XTREMESAGA04-BKCWW XXL 900mm Μαύρο
    - Adata XTREMESAGA04-BKCWW Mouse Pad XXL (900mm) Μαύρο
- **Durable 710310 XL** (2 listings, 2 sources)
    - Durable 710310 XL 650mm Γκρι
    - Durable 710310 Mouse Pad XL 650mm Γκρι
- **Disney Princesses 001** (2 listings, 2 sources)
    - Disney Princesses 001 229mm
    - Mouse Pad Disney Princesses 001 229mm
- **Inca IMP-020** (2 listings, 2 sources)
    - Inca IMP-020 270mm Μαύρο
    - Inca IMP-020 Mouse Pad 270mm Μαύρο
- **Xtrfy GP5 Tropical XL** (2 listings, 2 sources)
    - Xtrfy GP5 Tropical XL
    - Mouse Pad Xtrfy GP5 XL Tropical
- **Sades Frost Large** (3 listings, 3 sources)
    - Sades Frost Large 450mm Μαύρο
    - Sades Frost Large
    - Sades Frost Gaming Mouse Pad Large 450mm Μαύρο
- **Asus ROG Hone Ace XXL** (4 listings, 4 sources)
    - Asus ROG Hone Ace XXL XXL 900mm Μαύρο
    - Asus ROG Hone Ace Black XXL
    - Asus Rog Hone Ace Mousepad XXL Edition Μαύρο
- **Gembird GamePro Medium** (2 listings, 2 sources)
    - Gembird GamePro Medium 350mm
    - Gembird GamePro Gaming Mouse Pad Medium 350mm
- **Leitz Ergo Ergonomic Adjustable Pastel** (2 listings, 2 sources)
    - Leitz Mouse Pad Leitz Ergo Ergonomic Wrist Support Adjustable Pastel Gray
- **Endgame Gear GAMA-975 Large** (2 listings, 2 sources)
    - Endgame Gear GAMA-975 Large 490mm Μαύρο
    - Endgame Gear GAMA-975 Gaming Mouse Pad Large (490mm) Μαύρο
- **Grupo Erik Marvel Gamerverse Spider-Man XXL** (2 listings, 2 sources)
    - Grupo Erik Marvel Gamerverse Spider-Man XXL 800mm
    - Grupo Erik Marvel Gamerverse Spider-Man Gaming Mouse Pad XXL 800mm
- **Thermaltake MP-DCM-RGBHMS-02 Medium** (2 listings, 2 sources)
    - Thermaltake MP-DCM-RGBHMS-02 Medium 355mm
    - Thermaltake MP-DCM-RGBHMS-02 Gaming Mouse Pad Medium 355mm με RGB Φωτισμό
- **Speedlink Greek Flag SL-6242-FE02** (2 listings, 2 sources)
    - Speedlink Greek Flag SL-6242-FE02
    - SPEEDLINK SL-6242-FE02 SILKMOUSEPAD GREEK FLAG
- **Powerton WPEPE5-NB** (2 listings, 2 sources)
    - Powerton WPEPE5-NB 230mm Μπλε
    - Powerton WPEPE5-NB Mouse Pad (230mm) με Στήριξη Καρπού Μπλε
- **iTotal Cats** (2 listings, 2 sources)
    - I-Total Cats 240mm
    - I-Total Cats Mouse Pad 240mm
- **Paladone Playstation** (2 listings, 2 sources)
    - Paladone Playstation 240mm
    - Paladone Playstation Mouse Pad 240mm
- **Spacer Rubber Textile Material "sp-pad-game-b-bk"** (2 listings, 2 sources)
    - Gaming Mousepad Spacer Rubber Textile Material 900 X 300 X 3 Mm Black "sp-pad-game-b-bk"
- **Thermaltake Conkor Large** (2 listings, 2 sources)
    - Thermaltake Conkor Large 400mm
    - Thermaltake Conkor Gaming Mouse Pad Large 400mm
- **Aula F-X5 XXL** (3 listings, 3 sources)
    - Aula F-X5 XXL 800mm Μαύρο
    - Aula F-X5 RGB Black XXL
    - Aula F-X5 Gaming Mouse Pad XXL 800mm με RGB Φωτισμό Μαύρο
- **Sharkoon Skiller SGP30 Hex XXL** (4 listings, 4 sources)
    - Sharkoon Skiller SGP30 XXL 900mm Hex
    - Sharkoon Skiller SGP30 Hex Black XXL
    - Sharkoon Skiller SGP30 Gaming Mouse Pad XXL 900mm Hex
- **Speedlink VELLU Gel** (2 listings, 2 sources)
    - SpeedLink VELLU Gel Mousepad Black Μαύρο
    - Mouse Pad SpeedLink VELLU Gel Black
- **ERT Group WMPFRDS022 Medium** (2 listings, 2 sources)
    - ERT Group WMPFRDS022 Medium 320mm
    - ERT Group WMPFRDS022 Mouse Pad Medium 320mm
- **SureFire Silent Flight XL** (2 listings, 2 sources)
    - SureFire Silent Flight XL 680mm Μαύρο
    - SureFire Silent Flight Gaming Mouse Pad XL 680mm Μαύρο
- **Sharkoon 1337 V2 Medium** (7 listings, 4 sources)
    - Sharkoon 1337 RGB V2 Medium 360mm Μαύρο
    - Sharkoon 1337 V2 Medium 355mm Μαύρο
    - Sharkoon 1337 V2 Black Medium
- **Sharkoon Skiller Sgp40 D3** (2 listings, 2 sources)
    - Sharkoon Skiller Sgp40 D3
    - Sharkoon Skiller Sgp40 D3 Mouse Pad
- **Balloon Mouse Pad Large** (7 listings, 2 sources)
    - Balloon Large 400mm Μαύρο
    - Balloon Gaming Mouse Pad Large (400mm) Μαύρο
- **Sharkoon Skiller SGP30 Stone XXL** (3 listings, 3 sources)
    - Sharkoon Skiller SGP30 XXL 900mm Stone
    - Sharkoon Skiller SGP30 Stone Black XXL
    - Sharkoon Skiller SGP30 Gaming Mouse Pad XXL 900mm Stone
- **Balloon bal-SUB1004810** (2 listings, 2 sources)
    - Balloon bal-SUB1004810 230mm Μαύρο
    - Balloon bal-SUB1004810 Mouse Pad 230mm Μαύρο
- **MTK M2936 Small** (4 listings, 1 sources)
    - MTK M2936 Black Small
    - MTK M2936 Blue Small
    - MTK M2936 Red Small
- **Havit Stellarisforce-1** (3 listings, 3 sources)
    - Havit Stellarisforce-1 Gaming Mouse Pad
    - HAVIT STELLARISFORCE-1 GAMING MOUSEPAD 900X400X6 ΜΜ
- **Razer Atlas Pro Large** (2 listings, 1 sources)
    - Razer Atlas Pro White Large
    - Razer Atlas Pro Black Large
- **Canyon CND-CMP3 Medium** (2 listings, 2 sources)
    - Canyon CND-CMP3 Medium 350mm
    - Gaming Mouse Pad Canyon CND-CMP3 Medium 350mm
- **Sharkoon Skiller SGP30 Poly XXL** (3 listings, 3 sources)
    - Sharkoon Skiller SGP30 XXL 900mm Poly
    - Sharkoon Skiller SGP30 Poly XXL
    - Mouse Pad Sharkoon Skiller SGP30 Gaming XXL 900mm Poly
- **Legami Daisy Small** (2 listings, 1 sources)
    - Legami Daisy Small
    - Legami Daisy White Orange Small
- **Grupo Erik Dragon Ball Super Future Trunks Saga XXL** (2 listings, 2 sources)
    - Grupo Erik Dragon Ball Super Future Trunks Saga XXL 800mm
    - Grupo Erik Dragon Ball Super Future Trunks Saga Gaming Mouse Pad XXL 800mm
- **Cherry Xtrfy Gp5 Litus Gp5-xl-litus-blue XL** (2 listings, 2 sources)
    - Cherry Mousepad Xtrfy Gp5 Litus Xl Blue Gp5-xl-litus-blue

## 6. Findings that need a decision

1. **Generic series names merge different products.** `Sharkoon Skiller` (18 listings, prices 17.71 to 29.85) and `Esperanza Gel` are one model each because their titles state no size, dimension or code. The titles do not say they are different, so nothing is invented, but a buyer may see unlike pads under one model. Option: keep (current) or reject a group whose members state no size or dimension and whose prices differ by more than 3x.
2. **RGB and non-RGB of one name are one model.** `Verk Group XXL` holds a 6.50 EUR plain pad and a 13.50 EUR RGB one. Option: treat an explicit RGB statement as part of identity.
3. **Skroutz titles that omit the maker** (`XXL 900mm`). Tested recovering the maker from the URL slug and from the page's Product.name: together they recover only about a dozen listings, because the remaining titles name makers the table does not know or give a maker with no model. Not adopted; the Skroutz reader is unchanged.
4. **No-identity is large** (about 2,600 of 12,500): mostly licensed designs without a maker (`Fortnite Mouse Pad Kitsune`, `Lost Ark Mouse Pad Boss`, BestPrice 8.90 EUR). They are print-style catalogue goods; keeping them out is consistent with the custom-print decision, but it is a product decision.
5. **Part-number conflicts** (17 listings) are real disagreements between sources (`Anti-Fray 2XL` against `Extended XXL`), reported in `rejected.json`, not guessed.
6. **Skroutz capped at 100 pages** was avoided by three disjoint facet paths; if a path grows past 100 pages the reader raises, as designed.
7. **Data size**: `rejected.json` of the trial is 7.1 MB. Whether it is published (as for other categories) or kept out of the deploy needs a decision before release.

## 7. Decisions (owner, 2026-11-14: "go with the recommended")

| # | Decision |
| --- | --- |
| 1 | No slug recovery (measured: about 12 listings). Reader unchanged. |
| 2 | Generic names with no size or dimension stay one model; nothing is invented. |
| 3 | RGB is a feature of a model (filter), not part of identity. |
| 4 | Licensed designs with no maker stay rejected as `no-identity`. |
| 5 | `rejected.json` is published like mouse, headphones and monitor (monitor's is 5.4 MB today). |
| 6 | Phase 3 starts: the site scaffold, registry entry disabled and invisible. Workflow edits wait for the runtime report. |
