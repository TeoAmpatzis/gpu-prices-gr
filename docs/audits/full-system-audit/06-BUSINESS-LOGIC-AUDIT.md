# 06 — Business logic audit

Business logic here means: which prices are shown, which are called deals, how models are ranked, what the compatibility engine says, and what the automatic builder suggests. All of it runs at build time (`src/lib/derive.ts`, `vite-plugin-data.ts`) or in the browser.

What held up under test: the compatibility engine (6,000 random builds, no crash, no malformed message, deterministic, PSU rule monotonic), offer ordering, sort stability, filter/URL round trips, price + shipping = total on the product page. Details in `03-PLAYWRIGHT-TEST-RESULTS.md` section 5.

---

## [P2-001] Deals of exactly 7% are computed but never shown

- **Category:** Business logic
- **Severity:** P2
- **Confidence:** High
- **Status:** Confirmed
- **Affected files:** `src/lib/data.ts:126-131`, `src/lib/deals.ts:11`, `src/lib/deals.ts:55`, `src/lib/catalogueFilters.ts:80`, `src/lib/catalogueFilters.ts:100`, `src/components/catalogue/ProductList.tsx:47`, `src/components/product/ProductHeader.tsx:50`
- **Affected functionality:** Deal badge on lists and product pages, "Deals only" filter, "Best deals" sort.
- **Problem:** The build marks a model as a deal when its price is at least 7% under the 30-day median. The page then re-checks with `pct >= DEAL_THRESHOLD * 100`. In JavaScript `0.07 * 100` is `7.000000000000001`, so a rounded 7 fails the test.
- **Evidence:** `node -e "console.log(0.07*100, 7 >= 0.07*100)"` prints `7.000000000000001 false`. Running the real modules over the built data: 1,031 models flagged, 993 shown, **38 dropped** (cpu 3, mobo 3, storage 1, psu 1, case 11, fan 12, cooler 7). Browser test E14: Core i7-14700K (€339.58, reference €366.14, `dealPct` 7) shows no badge on `/cpu?q=14700K`, none on `/cpu/core-i7-14700k`, and `/cpu?q=14700K&sale=1` returns 0 products.
- **Steps to reproduce:** Open `/cpu?q=14700K&sale=1` on a build of data commit `ca61231`.
- **Expected behavior:** The model appears with a "−7%" badge.
- **Actual behavior:** No badge; the filter hides it.
- **Root cause:** Floating-point product compared with an integer; the threshold is checked twice with two different formulas (`deals.ts:55` uses the price, `data.ts:131` uses the rounded percent).
- **Recommended solution:** In `saleOf`, trust the build's flag: return the deal when `cheapest.dealPct` is set, and stop re-testing the threshold. Add a unit test at exactly 7%.
- **Alternative solutions:** Compare with an integer constant (`DEAL_PERCENT = 7`).
- **Regression risks:** Low. 38 more badges appear.
- **Verification plan:** Unit test for a price at 93.0% and 92.6% of the reference; re-run the vite-node count (flagged must equal shown).
- **Estimated effort:** Small

---

## [P2-002] The home page's "Largest recent price drops" promotes prices that are almost certainly wrong

- **Category:** Business logic / data trust
- **Severity:** P2
- **Confidence:** High that the section shows them; medium that each price is wrong (the shops were not opened)
- **Status:** Confirmed
- **Affected files:** `src/lib/homeFile.ts:21-34`, `src/lib/homeFile.ts:57`, `src/lib/priceSummary.ts:46-60`, `src/lib/sanity.ts:11`, `src/lib/sanity.ts:46`, `src/lib/dips.ts`
- **Affected functionality:** First screen of the site.
- **Problem:** The section takes every model whose latest daily low is under its 90-day median, sorts by percent, and shows the top five. There is no upper limit on the percent. The biggest "drops" are therefore the most likely scraping or listing errors.
- **Evidence:** Built `dist/data/home.json` and the rendered home page (2026-11-10):

  | Model | Source | 90-day median | Now | Shown |
  |---|---|---|---|---|
  | Xeon E5-2620 v4 | BestPrice | €583.00 | €14.00 | −98% |
  | Pentium G4560 | Skroutz | €67.01 | €3.71 | −94% |
  | Micron 7450 Max 1.6TB U.2 | Skroutz | €4,099.99 | €511.39 | −88% |
  | Xilence Breeze Performance A+ X7 | BestPrice | €363.33 | €67.26 | −81% |
  | Core i5-4460 | Shopflix | €238.76 | €46.27 | −81% |

  The Xeon's product page lists two offers: €14.00 (BestPrice) and €612.15 (Skroutz).
- **Steps to reproduce:** Open `/` and scroll to "Largest recent price drops".
- **Expected behavior:** Drops a visitor can trust, or none.
- **Actual behavior:** A list led by −98% and −94%.
- **Root cause:** Two safety nets do not reach this case. The wrong-price filter needs more than 3 listings of the same model (`sanity.ts:46`), and these models have 1 or 2. The dip filter needs 7 points after the dip, and today's price has none. The home list adds no rule of its own.
- **Recommended solution:** In `homeFile.ts`, leave out drops above a ceiling (for example 60%), and require at least two sources or a second day at the new price.
- **Alternative solutions:** Rank by euros saved among drops between 7% and 50%; or apply the same 30-day rule as the list badges (see P3-003).
- **Regression risks:** A real clearance price above the ceiling would not be featured. It still shows on its product page.
- **Verification plan:** Unit test with a 98% drop on a single-listing model; check the built `home.json`.
- **Estimated effort:** Small

---

## [P2-003] Automatic builder: "prefer dual-channel memory" can pick a kit three times dearer than needed

- **Category:** Business logic
- **Severity:** P2
- **Confidence:** High
- **Status:** Confirmed
- **Affected files:** `src/lib/autoBuild.ts:62-70`, `src/lib/autoBuild.ts:140`, `src/lib/autoBuild.ts:151`
- **Affected functionality:** "Build it for me", the home page's ready builds.
- **Problem:** `dualChannelFirst` moves every two-stick kit whose price per GB is within 15% of the cheapest single stick to the front of the list. It looks only at price per GB, not at the price. A large kit with a good per-GB price jumps ahead of a small, cheap stick that already meets the minimum.
- **Evidence:** DDR5 desktop rows in `dist/data/builder/ram.json`: cheapest stick that meets a 16 GB minimum is 1×16GB at €220.87. The only two-stick kits inside the limit (€14.49/GB) are 48GB (2×24GB) at **€645.30** and 64GB at €829. Built `auto.json`: use "everyday", budget €1,000 → Ryzen 5 9600X €165.60, board €61.46, **RAM 48GB €645.30**, total €993.38. Memory is 65% of an office PC. The same kit appears in the €5,000 and €10,000 builds.
- **Steps to reproduce:** `/builder` → Everyday → €1,000 → "Build it for me".
- **Expected behavior:** 16 GB or 32 GB of memory.
- **Actual behavior:** 48 GB for €645.30.
- **Root cause:** The preference has no cap on absolute price or capacity.
- **Recommended solution:** Prefer a two-stick kit only when its **price** is within a margin (for example 15%) of the cheapest acceptable option.
- **Alternative solutions:** Limit the preference to kits of the same capacity as the cheapest acceptable stick.
- **Regression risks:** Some builds fall back to a single stick when two-stick kits are dear. That is the honest cheapest answer.
- **Verification plan:** Unit test with the row set above; compare `auto.json` before and after.
- **Estimated effort:** Small

---

## [P3-001] Automatic builder spends extra budget only on the graphics card and processor

- **Category:** Business logic / design
- **Severity:** P3
- **Confidence:** High
- **Status:** Confirmed
- **Affected files:** `src/lib/autoBuild.ts:87-96` (`cheapest`), `src/lib/autoBuild.ts:264-271` (`bestFor`)
- **Affected functionality:** Automatic builds at medium and high budgets.
- **Problem:** Every part other than the CPU and GPU is always the cheapest one that passes the checks. `bestFor` picks the highest GPU tier, then CPU tier, then the lowest total. A larger budget never improves the board, case, power supply, storage or memory.
- **Evidence:** Built `auto.json`, use "unsure": budget €5,000 → total €3,244.36 (65% used): Ryzen 7 9800X3D, a €1,939 card, a €61.46 A620 board, a €23.90 case, a €51.09 850 W Bronze supply. Budget €10,000 → a €6,462.34 card in the same €23.90 case with an €87.37 supply. Gaming 1080p at €2,000 uses 76%.
- **Steps to reproduce:** `/builder` → Not sure → €5,000 → "Build it for me".
- **Expected behavior:** A balanced build near the budget.
- **Actual behavior:** A top card on the cheapest board, case and supply; a third of the budget unused.
- **Root cause:** By design ("cheapest that fits"). No quality tiers for the other parts.
- **Recommended solution:** Decide first whether this is wanted. If not: after choosing CPU and GPU, spend leftover budget by per-part shares (the builder already has budget shares per use in `wizard.ts`).
- **Alternative solutions:** Keep the logic and say on the page that the suggestion is the cheapest compatible set, with the unused amount shown.
- **Regression risks:** Medium; changes every suggested build.
- **Verification plan:** Property test: total ≥ 85% of budget when dearer compatible parts exist.
- **Estimated effort:** Medium

---

## [P3-003] Three different definitions of "deal" and "lowest price" are shown side by side

- **Category:** Cross-layer consistency
- **Severity:** P3
- **Confidence:** High
- **Status:** Confirmed
- **Affected files:** `src/lib/deals.ts:43-62` (30-day median, 7%, strict lowest), `src/lib/priceSummary.ts:16-60` (90-day median), `src/lib/homeFile.ts:25` (90-day), `src/lib/data.ts` `allTimeLow` (60 days, "less or equal"), `src/lib/derive.ts` `modelChunks`
- **Affected functionality:** List badges, product page sentence, home page drops, Recommended score.
- **Problem:** The list badge compares with the 30-day median. The product page sentence and the home page compare with the 90-day median. The "lowest" badge needs a price strictly under every earlier low; the older `allTimeLow` used for model chunks accepts an equal price.
- **Evidence:** Code as cited. On `/cpu/xeon-e5-2620-v4` the header badge reads −98% and the history sentence reads "98% below the 90-day median", each from a different function. For most models the two numbers differ.
- **Steps to reproduce:** Compare a product's badge with its history sentence on any model with a deal.
- **Expected behavior:** One rule, one number.
- **Actual behavior:** Two or three.
- **Root cause:** The deals rework of 2026-11-08 added a new rule and kept the earlier ones.
- **Recommended solution:** Choose one reference window; compute it once in the build; have every surface read it.
- **Alternative solutions:** Keep both and label them ("vs 30 days", "vs 90 days").
- **Regression risks:** Low to medium; numbers on pages change.
- **Verification plan:** A test that the home deal percent equals the product badge percent for the same model.
- **Estimated effort:** Medium

---

## [P3-008] Category tiles show junk minimum prices ("Processors from €3.71")

- **Category:** Business logic / presentation
- **Severity:** P3
- **Confidence:** High
- **Status:** Confirmed
- **Affected files:** `src/lib/homeFile.ts:17-20`
- **Affected functionality:** Home page and `/parts` tiles.
- **Problem:** "from €X" is the minimum over every listing in the category, including server pulls, 1 GB DDR2 sticks and single-listing outliers.
- **Evidence:** Rendered home page: Processors from €3.71, Memory from €1.88, CPU coolers from €3.33, Monitors from €15.00 (a charger; the scraper fix `7dcc167` is newer than the data tested), Case fans from €1.32.
- **Steps to reproduce:** Open `/`.
- **Expected behavior:** A floor that describes the category a visitor expects.
- **Actual behavior:** The cheapest oddity.
- **Root cause:** Plain `Math.min` over all listings.
- **Recommended solution:** Take the minimum over the default segment only (the same models the category page shows first), or drop the price from the tile.
- **Alternative solutions:** Use a low percentile.
- **Regression risks:** None of note.
- **Verification plan:** Check `home.json` after the change.
- **Estimated effort:** Small

---

## Checked and not a defect

- **"Lowest" badge on a dearer listing.** `filterModels` (`data.ts:370`) attaches the badge without a price check, and under a source filter 62 of 103 badged models showed a dearer listing in my script. The live catalogue does not use that field: `ProductList.tsx:48` and `catalogueFilters.ts:80` add the price check. No user-visible defect; the unchecked path is used only by dead code (P4-005).
- **History points only from sources that answered.** A day when Skroutz fails could raise that day's low and later create false deals. Skroutz supplied about half of the cheapest prices and was present on about 80% of days; I found no mass of false deals. Not confirmed as a defect; noted as a risk in `10-DATABASE-AND-INTEGRATIONS.md`.
