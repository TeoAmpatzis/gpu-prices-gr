# Phase 2, step 1: matching experiment on the Phase 0 titles

Date: 2026-11-08. Branch `design/deals-rework`. Read-only analysis of `phase0-fixtures.json` (295 raw titles, first pages only, no prices). No repo code was written for this; the throwaway script lived in the scratchpad. This is a feasibility measure, not the reviewed matching test set the acceptance criteria require (that test set needs hand review and does not exist yet).

## Method

A rough extractor (brand list, Greek/Latin look-alike folding, "longest letters+digits token of 5+ characters" as the model code, size, resolution and refresh read from the title). Rows that are not monitors (a TV shelf, an interactive board) were dropped, leaving 293. Keys are `brand + code`. The extractor is deliberately simple, so the numbers below are indicative, not final.

## Results

| Source | Titles | Brand | Code (5+ chars) | Size | Resolution | Refresh |
|---|---|---|---|---|---|---|
| BestPrice | 48 | 48 | 40 | 48 | 48 | 48 |
| Skroutz | 180 | 175 | 114 | 149 | 180 | **0** |
| Snif | 55 | 53 | 52 | 43 | 1 | 21 |
| e-shop | 10 | 10 | 10 | 9 | 0 | 6 |

- 178 distinct brand+code keys; 15 appear in more than one source (the sample is only the first pages of each source, so this is not a real overlap rate).
- Of those 15, 11 agree on size, resolution and refresh; 4 conflict.

## What the 4 conflicts show

1. `Samsung S30GD`: BestPrice has a 24" and a 27" listing under the same code. The code is a **series**, not a model code; the size separates the models.
2. `AOC CQ32G4VE` (31.5 vs 32), `Dell AW3225QF` (31.6 vs 32), `Dell AW2726DM` (26.5 vs 27): the same product, but sources round the diagonal differently. A size compare must use a tolerance, or compare the pixel size and resolution instead.

So a key from brand+code alone would **falsely merge** the two S30GD sizes, and an exact size compare would **falsely split** the three rounding cases. Both lessons agree with the plan: discriminators must agree, and unknown never bridges.

## Findings

1. **Skroutz titles carry a series name, not a model code, for about a third of rows.** 66 of 180 have no usable code (`Dell IPS FHD 1920x1080`, `LG UltraGear VA HDR FHD`, `AOC IPS FHD 1920x1080`). Many others only carry a short series code (`G50F`, `G55C`, `A24i`, `G27i`) which my 5-character rule dropped. These identify a family and size, not an MPN.
2. **Skroutz titles never state the refresh rate** (0 of 180). *Corrected in step 2 below:* the Skroutz list cards carry a spec line ("Ρυθμός Ανανέωσης: 165Hz") that the first fixtures did not include; with it, refresh is present for 295 of 386 Skroutz rows (76%).
3. **BestPrice is the strongest source**: every title has size, resolution and refresh; 40 of 48 have a full code; the rest are Samsung Odyssey / Xiaomi series codes.
4. **Snif and e-shop** carry full codes (52/55, 10/10) but rarely the resolution (Snif 1/55) and sometimes none of the refresh.
5. Short series codes (3 to 5 characters) are real identity evidence when paired with size, resolution and panel, and are unsafe alone.

## Verdict on the riskiest assumption (FINAL_PLAN §8)

**Partly confirmed.** Titles alone give MPN-level identity for roughly 63% of Skroutz rows and about 83% of BestPrice rows, and the refresh coverage target (≥90%) is out of reach for Skroutz-only products. The ≥95% recall and zero-false-merge targets are not testable without the reviewed test set; this sample shows the failure shapes (series code, size rounding) but does not measure recall.

## Recommendation (needs the owner's decision)

Follow the plan's own fallback (§8): keep matching strict and change the launch rule, rather than loosen matching.

- A monitor model exists only when it has identity evidence: a full manufacturer code, or brand + series code + size bucket + resolution + panel that agree. Listings without that stay in the rejection report (visible there, not on the site).
- Skroutz is an **offer source**: a Skroutz listing joins a model only when its identity matches one already evidenced by BestPrice (or Snif/e-shop); it does not create models from series-less titles.
- The ≥90% spec-coverage target is measured on launched models (the plan wording), so BestPrice product-page specs carry refresh and panel; Skroutz-only rows never count as launched.
- Size compare uses a 0.5" tolerance plus resolution, never exact diagonal text.

Consequence: fewer monitors at launch (BestPrice-led), and the Skroutz share of offers depends on how many of its listings match. How many match is unmeasured: that is the next experiment.

## Step 2: proposed matching test set on fresh list pages (done 2026-11-08)

You accepted the recommendation ("whatever you suggest"). I fetched list pages only (no product pages): BestPrice 20 pages, Skroutz 8, Snif 8, 2.5 s apart. 36 requests, all HTTP 200, no blocks, nothing sent to a disabled operation. Output: `phase2-matching-testset.json` (listings with prices, plus the proposed labels).

| | BestPrice | Skroutz | Snif |
|---|---|---|---|
| Listings (after removing 4 non-monitors: 854) | 320 | 386 | 148 |
| Brand + model code (series codes of 3+ characters allowed) | 98% | 82% | 95% |
| Refresh rate present (title, or Skroutz list spec line) | 319 | 295 | 97 |

Strict rule used: key = brand + code; a listing joins a model only if size (within 0.6"), resolution and refresh do not disagree; a listing with an unknown size or resolution joins only when exactly one candidate fits, otherwise it is quarantined.

| Measure | Result |
|---|---|
| Models seen in more than one source (proposed true matches) | 113 |
| Same code kept apart by size/refresh (real different variants, e.g. Samsung S30GD 24" vs 27", Xiaomi G27i 2026 vs older) | 17 |
| Unknown-discriminator listings quarantined instead of guessed | 4 |
| Code pairs one or two characters apart, correctly kept separate (e.g. AW2725D / DF / DM / Q / QF) | 592 |
| Suffix variants left as review candidates, not merged (e.g. Dell P2425 vs P2425E, AOC 24G4ZR vs 24G4ZRE) | 9 |
| Listings with no usable identity (stay in the rejection report) | 81 (9.5%) |
| Skroutz listings that join a model evidenced by BestPrice or Snif | 85 of 386 |

Read-through of 30 random proposed matches: 0 false merges. One panel disagreement between sources (Lenovo T34WD40: VA on BestPrice, IPS on Skroutz) was correctly kept as one model with a field conflict.

**Honest limits.**
- The 85-of-386 Skroutz join rate is a **lower bound**: I fetched 8 of 45 Skroutz pages and 20 of about 50 BestPrice pages, and the lists are sorted differently, so most Skroutz rows had no chance to meet their BestPrice twin. The real rate needs a full list fetch (the same volume as one scrape run).
- **Recall is not measured.** My positives come from my own rule, so recall against them is circular. A true recall figure needs labels from an independent source (product page EAN/GTIN or MPN from BestPrice pages) or your spot-check of a sample.
- The negatives are mostly constructed (near-miss codes), which proves the rule does not over-merge but is a weak test of subtle real variants.
- Labels are mine, not yet reviewed by you.

## Step 3: full lists (done 2026-11-08, after "ok continue")

Fetched the rest of the lists, list pages only: BestPrice to page 50 (its 16-per-page cap, 800 products) and Skroutz pages 9 to 45. 68 more requests, all HTTP 200, no blocks. Snif stayed at the first 8 pages. `phase2-matching-testset.json` now holds the full set.

| Measure | Result |
|---|---|
| Listings (monitors after 4 non-monitors removed) | 3,110: BestPrice 800, Skroutz 2,162 (unique), Snif 148 |
| Brand + code | BestPrice 92%, Skroutz 76%, Snif 95%; 569 listings (18%) have no usable identity |
| Models (clusters) | 1,943: 467 seen in more than one source, 281 BestPrice-only, 1,140 Skroutz-only, 55 Snif-only |
| Skroutz listings that join a BestPrice/Snif-evidenced model | 474 of 2,162 (22%) |
| Same code kept apart by size/refresh | 90 buckets |
| Suffix variants left as review candidates | 64 |
| Unknown-discriminator listings quarantined | 11 |

Coverage of the four launch fields (diagonal, resolution, refresh, panel), per model:

| Group | Models | All four present |
|---|---|---|
| All | 1,943 | 1,500 (77%) |
| Seen in more than one source | 467 | 460 (98%) |
| BestPrice only | 281 | 280 (99%) |
| Skroutz only | 1,140 | 760 (66%) |
| Snif only | 55 | 0 (0%) |

**What this changes.**
1. The join rate is 22%, not a small-sample artefact: BestPrice carries only 800 products, Skroutz 2,162. Most Skroutz monitors have no BestPrice twin. My Step-1 recommendation ("Skroutz only adds offers to BestPrice-evidenced models") would drop about 78% of Skroutz and most of the catalogue. **Revised recommendation:** a Skroutz listing may create a model when its own list data (title plus the list spec line, still lists only) gives a full code and all four fields; 760 Skroutz-only models qualify. Otherwise it goes to the rejection report.
2. With that rule 1,500 models (77%) carry all four fields. The plan's ≥90% coverage target is worded "measured against a frozen sample of raw eligible listings **including normalization rejects**". If rejects count in the denominator, 77% fails the target; only enrichment (BestPrice product pages, later maker sites) can lift it, and Snif/e-shop titles alone never will. I have not decided that; it is the owner's call whether the target is on launched models or on all eligible listings.
3. Snif adds 55 models of its own and none are complete, so its value is offers for models the other two evidence.

**Unverified.** Skroutz states 2,696 products; I parsed 2,232 cards (2,162 unique) over 45 pages, and the last pages return 48 cards instead of 60. The missing ~460 are not explained (page cap, different sort, or my page range). Nothing here is recall: recall still needs independent labels.

## What the data says the normalizer must do

1. Sizes carry decimals ("24.07"", "21.45"", "37.52""); compare with a tolerance (31.5 vs 32, 26.5 vs 27, 31.6 vs 32 are one product).
2. Fold hyphens and colour suffixes consistently ("27U421A-B" = "27U421AB"); do not strip real variant letters (P2425 vs P2425E stay apart).
3. A revision token such as "2026" is a discriminator (Xiaomi G27i 2026: 200 Hz; older: 165 Hz).
4. Short series codes (G50F, S30GD, A24i) are only identity together with size; full manufacturer codes (AW2725DM, 27M2N3500NL) are identity on their own, and a size, panel or refresh disagreement under one full code should become a **field conflict**, not a split. This distinction is the main open design point and my next experiment.
5. Greek-prefixed Snif titles ("Οθόνη …") and the trailing shop codes (`/00`, `210-BMJC`) must be stripped before extracting the code.

## Next (not started)

1. Fetch the full Skroutz and BestPrice lists once to measure the real join rate (one run of list requests, about 100 pages, same polite client).
2. Independent recall check: BestPrice product pages for a sample of 60 models (EAN/MPN), or your spot-check of 60 proposed pairs.
3. Only then write `normalize_monitor.py` and the rest of Phase 2.

## Step 4: independent check with barcodes (done 2026-11-08)

The BestPrice product page carries the barcode (`gtin13` in its JSON-LD) and a structured spec list (size, maximum resolution, panel, refresh, response time, aspect). I fetched 214 product pages, one request every 2.5 s, all HTTP 200; 206 have a barcode. Pages chosen: both sides of every suffix-variant pair and size split, plus 40 random confirmed matches. The barcode does not depend on my title rule, so this is the first independent test.

| Check | Result |
|---|---|
| Suffix variants (P2425 vs P2425E, 24G4ZR vs 24G4ZRE ...) with BestPrice on both sides | 15 of 15 have **different** barcodes: they are different products and must stay apart. The other 49 pairs have BestPrice on one side only, so they stay unconfirmed review candidates. |
| Same-code buckets my rule split by size, refresh or revision | 15 of 15 with data on both sides have different barcodes: the splits were right. 75 had no BestPrice data on both sides. |
| Confirmed-match clusters that contain BestPrice barcodes | 116 tested; **5 contain two different barcodes** |
| BestPrice products sharing one barcode | 1 pair (Gigabyte M27Q2 "QD Ice" and "QD": BestPrice itself lists a colour variant twice) |
| Product pages missing a launch field | resolution 3, refresh 2, panel 1 of 214 |

**The 5 conflicts are real findings, not noise.**
- Four are **colour variants** with different barcodes: Lenovo Legion Pro 27Q-10 (Black/Silver), Samsung M5 M50F 27" (Black/White) and 32" (two barcodes), Gigabyte MO27Q2A (normal/ICE white).
- One is a **different panel**: Samsung ViewFinity S70H 32" is VA on one BestPrice product (€224.94) and IPS on another (€172.11), different barcodes. My rule compared size, resolution and refresh but not the panel, so it merged them. That is a true false merge.

**Rule changes from this:**
1. Panel type (IPS / VA / OLED / QD-OLED / TN) becomes a discriminator when both sides state it. A disagreement splits, as the plan says for panel.
2. Colour is not a model discriminator in the title; it is a variant attribute (barcode differs, price differs a little). Decision needed from you: one monitor page per model with colours as variants (my recommendation: shoppers compare price across colours, and titles from Skroutz/Snif rarely state the colour), or one page per colour. The plan says "materially different bundles stay separate" and does not mention colour.
3. Suffix variants (E, B, HE ...) are different products: never merge by prefix. Confirmed on 15 of 15.
4. Barcode is the strongest evidence where present: two BestPrice products with one barcode are one product; different barcodes under one code need the discriminator check above before they join.

**What this does not prove.** The barcode check only covers BestPrice products (Skroutz and Snif lists carry none), so cross-source recall is still unmeasured. A fully independent recall figure for Skroutz would need Skroutz product pages, which D2 forbids for monitors. The honest alternative is to report cross-source recall as "not independently measurable" and rely on the barcode-checked BestPrice matches plus the strict rule's design.

## Step 5: first code, `scraper/normalize_monitor.py` (done 2026-11-08)

Decisions taken (owner: "do what you recommend"): colour is a variant of one model, not a split; panel type is a discriminator.

`scraper/normalize_monitor.py` is a pure module (no I/O, not imported by the scrapers yet): `parse(title, specs)` gives brand, model code, size, pixel height, refresh, panel, colour, revision and a reject reason; `compatible` and `group` apply the strict rule. `scripts/checks/test_normalize_monitor.py` has 19 tests: real-title cases for each lesson above, plus a run over the whole matching test set that checks the result against the BestPrice barcodes (`phase2-ean-check.json`).

Run over the 3,114 test-set listings it gives 1,944 models (experiment: 1,943), 470 seen in more than one source (467), 474 Skroutz listings joined, 9 ambiguous, 573 without a usable identity (of which 7 are rejects: 3 not-monitor, 3 used, 1 bundle), and 1,525 models with all four launch fields (experiment: 1,500). The Samsung S70H panel false merge is gone; the 4 remaining models that mix two barcodes are colour variants.

Not done: `MonitorListing`, `Category("monitor")`, the rejection report file, scraper wiring, and everything in the UI. Recall for Skroutz and Snif against an independent source remains unmeasurable (D2).

## Step 6: wiring, three real monitor scrapes, hidden TypeScript side (2026-11-08)

Owner decisions (2026-11-08): the 90% target is read leniently (published monitors) with the strict figure reported next to it; the added request volume is approved; commit and push to GitHub are allowed, a Vercel deployment is not; TypeScript is done now, hidden.

**Python.** `MonitorListing`, `Category("monitor")` (`rejects=True`, `images=False`), `normalize_monitor.make_listing` / `settle`, `main.stage` (takes rejected listings out of `latest.json` into `rejected.json` with a reason), `capabilities`: Skroutz lists only for monitors; e-shop and Shopflix are not run for monitors and no longer reported as failed. `scripts/checks/test_normalize_monitor.py` has 38 tests.

**Three real monitor-only scrapes** (BestPrice 7 price slices, Skroutz, Snif; no shipping, no specs; 0 blocked requests each): the first found 12 bugs in my first version (an independent review found 8, the real data 4), all fixed with a regression test each. Runs 2 and 3, on the final code, gave identical results:

| Measure | Result |
|---|---|
| Listings scraped | Skroutz 2,691 · BestPrice 2,485 · Snif 1,134 |
| Accepted / rejected | 5,766 / 544 (no-identity 501, ambiguous 31, not-monitor 7, used 4, bundle 1) |
| Models | 3,456 (1,544 seen in more than one source) |
| Skroutz listings joined to another source | about 61% |
| Models with diagonal, resolution, refresh and panel | 2,903 (84%); strict, over all eligible listings: about 81% |
| Run time | about 6 minutes; requests per run: BestPrice 160, Skroutz 57, Snif 61 |

The 90% target is **not met** either way (84% / 81%). Under the lenient reading the published set is the 2,903 complete models, which is 100% by construction; the gap is the Snif-only and small-brand models whose titles omit refresh or panel. Raising it needs enrichment (BestPrice product pages, maker sites), which is not built.

**TypeScript, hidden.** `MonitorListing` type, minimal `MONITOR` config, entries in the per-category maps, `registry.monitor = { enabled: false, visible: false }`. `CATEGORY_IDS` is now the enabled categories, so with monitors disabled nothing in the build changes: all 2,923 files of `dist/data` are byte-identical to the build before Phase 1. With monitors enabled (tested locally) the data check passes, `monitor/list.v2.json` is 1.7 MB and the largest model chunk 5.5 KiB gzip; `searchFile` skips categories that are not visible (found by that test: monitors leaked into search).

**Not done.** The Phase 2 gate needs three consecutive eligible runs through the real workflows on `main`; the local runs are evidence, not that gate. Not built: BestPrice product-page parsing for monitors, the evidence cache, the field-conflict display, history alias migration, any visible UI (Phase 3). `public/data/monitor/` is local scrape output and is not committed.
