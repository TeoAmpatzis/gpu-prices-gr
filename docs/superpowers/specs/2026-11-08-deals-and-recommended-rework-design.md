# Deals, Recommended and catalogue fixes — design

Status: proposed, not approved. Nothing in this document has been built.
Date: 2026-11-08. Owner decisions that are still open are in section 9.

## 1. Why

On 2026-11-08 the live v2 site was tested end to end (Playwright, desktop and phone) and its deal and ranking logic was
checked against the site's own price history (`public/data/<cat>/history.json`, last 30 days before the test) and the built
`list.v2.json` files, using the project's real `applyFilters`, `saleOf`, `allTimeLow` and `recommendedScores` code. The pages
work (no errors, no overflow, sorting, pagination, search, language, builder, offline state all fine). The logic behind
"on sale", "lowest ever" and "Recommended" does not hold up.

Measured baseline (all 9 categories, default filters):

| Measure | Result |
|---|---|
| Models flagged "on sale" (`saleOf`) | 170. Real drop vs own 30-day median: 52 (31%). Partial: 32. None: 85 (50%). |
| Models flagged "lowest ever" (`allTimeLow`) | 625. At least 3% under the 30-day median: 233 (37%). Weak: 389 (62%). 0.0% under (flat price, a tie): common. |
| Genuine drops (at least 8% under the 30-day median, at least 10 history points) | 825. Flagged by either badge: 156 (19%). |
| Recommended, coolers | Sale/low boost (x1.1) lifts 32 of the top 40 into it; the top 9 all carry the LOW flag. |
| Recommended, PSU | Top 4 driven by two wrong BestPrice prices (FSP Hydro Ti Pro 850W Platinum at €28.66, FSP Hydro PTM X Pro 1200W at €29.42) and a "value" of watts per euro. |
| Recommended, GPU | RTX 5090 and 5080 are not in the top 14; the first top-decile-price model is #15; RTX 5070 Ti is #12, below RX 9060 XT 8GB and RTX 5050. |
| Filters | In 8 of 9 categories the main group (Manufacturer, Socket, Memory type, Efficiency, Size, Type) starts fully ticked, and so does Source; unticking hides items. Motherboards show two "Socket" headings. |
| SEO | Same meta description on every page, no canonical link, no product structured data, `/sitemap.xml` returns 404. |
| Other | Quick build picks one 16 GB RAM stick; product-title links in lists are 17 px tall on a phone. |

Where the flags come from today: `scraper/sources/*.py` copy each shop's own discount (`listing.drop`): Skroutz and
BestPrice price-drop badges, Shopflix `p["discount"]`, e-shop's RRP check (already built on the Omnibus 30-day rule).
`src/lib/data.ts` `saleOf` accepts any offer within 2% of the cheapest that carries `drop >= 5`. `allTimeLow` fires when
today's price is at or under every earlier daily low plus 0.005, so an unchanged price counts. `src/lib/ranking.ts`
mixes popularity, a "modern" table, a price band, per-unit value and a x1.02 to x1.1 boost for those two flags.

## 2. How other sites do it (research, 2026-11-08)

These are findings from public pages. Several are vendor blogs; where a primary source exists it is named.

- **PriceSpy** publishes its method ([How we calculate deals](https://pricespy.co.nz/information/how-we-calculate-deals)):
  lowest market price per day over three months, a linear-regression trend, a deal is a price at least 5% below the expected
  lowest daily price, at least three stores, in stock, only seasonal and popular categories. Classification is by trend, not
  by what a store calls a sale, so a price drop that follows an artificial increase is not treated as a discount. The shown
  percentage is the gap to the trend.
- **Keepa** (Amazon) compares the current price with a 1/7/30/90-day average rather than with Amazon's labels; a 90-day
  average is described as the steadiest ([guide](https://fbamogul.com/keepa-product-finder-getting-started-guide/)).
- **Google Shopping** shows low / typical / high from how stores priced the item over about three months
  ([Google](https://blog.google/products-and-platforms/products/shopping/save-money-price-insights-price-alerts/)); the
  formula is not published.
- **EU Omnibus rule** for announced reductions: the reference is the lowest price in the previous 30 days, and earlier
  promotional prices count in that window; the percentage must use the same base
  ([overview](https://pagecrawl.io/blog/eu-omnibus-30-day-lowest-price-monitoring),
  [practical guide](https://trustyourwebsite.com/eu/en/guides/price-display-omnibus)). Vendor sources; confirm with a lawyer.
- **Idealo, Geizhals, PCPartPicker**: price history charts and price alerts; no published definition of a "deal" or of the
  default sort was found. PCPartPicker lists category price trends
  ([trends](https://de.pcpartpicker.com/trends)).
- **Recommended / default sort** (retail guidance, mixed quality): popularity is the usual default because it reads as social
  proof; a static or all-time ranking goes stale, so blend recent signals; a "Recommended" default should reflect relevance,
  stock and variety and must not imply an objective ranking; sorting reorders, filtering removes
  ([Shoptimity](https://shoptimity.com/blogs/ecommerce-product-sorting-options-guide),
  [Practical Ecommerce](https://www.practicalecommerce.com/default-category-sorts-can-harm-conversions)).
  No Skroutz or BestPrice sort documentation was found.
- **Facet filters**: a facet with nothing selected means all values; pre-checking everything forces users to uncheck first
  ([Coveo](https://docs.coveo.com/en/atomic/2.29.0/reference/components/atomic-facet)); show result counts.

Principles adopted from this:

1. A deal is defined by our own price history against a reference, never by a shop's label.
2. Use a trailing reference (median of daily lows), require enough history and enough sellers, and ignore glitch points.
3. Show the reference to the visitor ("-12% vs 30-day typical, €X") so the claim can be checked.
4. A default order must be explainable and stable; deal signals are a tie-break, not the main driver.
5. Filters: empty means all; ticking narrows; counts stay visible.

## 3. Goals, non-goals, anti-goals

Goals
- "On sale" and "lowest" badges that are right at least 90% of the time against the 30-day median, and that catch most
  real drops (target recall in section 7).
- A Recommended order a knowledgeable buyer would call sensible in every category, with no single wrong price able to
  reach the top.
- Filters that behave like the rest of the web.
- Pages that search engines can understand: titles, descriptions, canonical links, sitemap, product structured data.
- Everything measurable: the audit used for this document becomes a repeatable check.

Non-goals
- New data sources, new categories, a mobile app, accounts, price alerts (possible later).
- Changing how the scrapers collect data (the Skroutz/WARP work is separate).
- Server-side rendering of the whole site (WS6 asks whether to prerender key pages; it is a decision, not a commitment).

Anti-goals (would make this a failure even if it technically works)
- Inventing discounts: a badge that the visitor cannot reproduce from the shown reference.
- Hiding the badges so completely that real deals vanish.
- Growing the initial data over the existing budgets (JS <= 110 KB gzip, initial data <= 300 KB gzip, home feed <= 20 KiB
  gzip).
- Silently dropping listings: a rejected price must be visible in a report, not just disappear.

## 4. Constraints

- Static site on Vercel Hobby; data is built from `public/data/*` at `vite build` (`vite-plugin-data.ts`, `src/lib/derive.ts`).
  Anything computed from history must be computed at build time and shipped as compact columns, not as raw history.
- `list.v2.json` has a format version `v` (`assertListFormat`); changing columns means bumping it and the decoder together.
- Free tier only: GitHub Actions, Vercel Hobby. No new paid service.
- The data workflows run every 6 h (shops) and 12 h (Skroutz); history has a gap 2026-11-05 to 2026-11-08, and Skroutz-sourced
  history is imported (`i: 1`) with known glitches (`dips.ts`, `glitches.py`). The deal engine must tolerate both.
- v1 rules live in a frozen test copy (`tests/compat/v1-rules.ts`); do not touch.

## 5. Design

### WS1. Data sanity guard (price outliers)
Problem: one wrong price sets a model's `cheapest`, its Recommended score, its "value", the builder's pick and, for PSU/RAM
classes, a whole class (the model key is a spec class, e.g. `850W Platinum`, by existing design, see
`categoryRules.ts` `modelKey`).
Design:
- A listing is **suspect** when its price per natural unit is far from its peers. Peer group = same category class: PSU
  per watt within the same efficiency tier; RAM and storage per GB within type; fans per fan within size; every category:
  same `modelKey` across other sources (needs at least 3 other listings). Rule (my starting point, to be tuned on the
  audit): price below 40% of the peer median, or above 3x the peer median.
- Suspect listings are excluded from `cheapest`, `bestTotal`, ranking, deals and the builder's picks, but stay visible on the
  model page marked "price looks wrong" and are written to a build report (`dist/data-report.json`: category, listing id,
  price, peer median, rule). The build does not fail; a count above a threshold prints a warning.
- Where: a pure function in `src/lib/derive.ts` (or a new `src/lib/sanity.ts`) used by `listFile` and the builder files, so
  derived data and full data agree (`data-equivalence.test.mts` must keep passing with the same rule on both sides).
- Known cases that must be caught: FSP Hydro Ti Pro 850W Platinum (€28.66), FSP Hydro PTM X Pro 1200W (€29.42),
  "DDR4 4GB (1x4GB)" at €464.96.
Acceptance: the three cases are flagged; fewer than 0.5% of listings are flagged overall; a hand review of the 30 smallest
and 30 largest flagged ratios finds at most 3 false positives.

### WS2. Deal engine (replaces `saleOf` for ranking and badges)
Definition, computed at build time per model from full daily history (`history.json`, with `g`-marked glitch points and
shared-import artefacts already removed by `dips.ts`):
- reference = median of the daily-low prices over the 30 days before today (excluding today). 30 days matches the Omnibus
  window and the e-shop check already in the scraper. (PriceSpy uses three months with a trend line; Keepa offers 30 and
  90 days. Starting point 30, tunable.)
- conditions: at least 10 history points in the window, at least 2 shops currently listing the model, today's cheapest is not
  suspect (WS1), not an imported-only series.
- **deal** when price <= reference x (1 - T), T = 7% (my call; PriceSpy uses 5%). Percentage shown = gap to the reference.
- **lowest** ("lowest in N days / ever") only when today is strictly below the previous minimum of the daily lows and at
  least 3% below the reference; a tie or a flat price never counts. Needs the existing 60 days of history.
- Shop badges (`listing.drop`) are no longer used for ranking or for the main badge. They can be shown as a small
  "shop says: -37%" note on the offer row, because the visitor sees that claim on the shop's page anyway.
- Output: one compact column per model (`deal` = rounded percent, 0 = none, plus the reference price) in `list.v2.json`
  (bump `v`), and a `lowest` flag. The sale filter ("On sale only") is renamed "Deals" and filters on this column.
- UI text: "-12% vs 30-day typical (€X)" with the reference in a tooltip; the product page chart marks the reference band.
Acceptance (measured with the audit script, same method as the baseline): precision at least 90% (flagged models are at least
3% under their 30-day median), recall at least 60% of genuine drops of 8% or more, no flagged model with fewer than 10
history points, and the Corsair 3200D RS (flat for 30 days) and DDR4 4GB (wrong price) cases are not flagged.

### WS3. Recommended rework
Principles: explainable, stable under filtering, hard to game by one bad listing, premium parts not buried for being premium.
Design:
- **Stability**: compute the score once per category at build time on the full category (not on the filtered set) and ship
  it as a rank/score column; filters then only remove rows. Today scores shift with filters because percentiles are taken
  over the shown models.
- **Components** (weights tuned per category in `ranking.ts`, kept in one table):
  - demand proxy: number of distinct shops that sell it (`shopCount` max across listings, capped) plus number of sources,
    not the raw number of listings; documented as a proxy, not real demand (we have no click data).
  - quality tier: GPU performance table (`value.ts` `gpuValue` table reused), CPU generation and socket, RAM type and kit,
    storage interface and size, PSU efficiency and a sensible wattage band, etc. (the current "modern" tables, kept).
  - value: performance per euro for GPU, GB per euro for storage/RAM, only on non-suspect prices (WS1).
  - price fit: kept only where there is no performance measure (cases, fans, coolers), and as a mild band; **removed for
    GPU and CPU**, where it buries premium parts.
  - deal: after WS2, a real deal adds at most +3% to the score (tie-break); the "lowest" flag adds nothing.
- **Sort menu**: "Recommended" (above), "Price low to high", "Price high to low", plus **"Best deals"** (by deal percentage)
  so deal-hunters have their own order instead of mixing it into Recommended (the PriceSpy/Keepa split).
- Keep the name only if the order passes the acceptance list below; otherwise rename to "Popular".
Acceptance (golden fixtures in a test, per category): no model flagged suspect in the top 40; no model outside its
category's sane price/unit band in the top 40; GPU: RTX 5070 Ti ranks above RTX 5050 and above RX 9060 XT 8GB, RTX 5090 or
5080 inside the top 40; PSU: no class priced under 40% of the category median in the top 20; coolers: at most 10 of the top 40
carry a deal flag; ordering of two models does not change when a filter is applied.

### WS4. Filters
- `defaultFilters` returns empty `groups` and empty `sources` meaning "all"; `filterModels` treats an empty list as all.
  Ticking narrows. Unticking everything returns to all.
- Update: `activeFilterCount`, `clearedFilters`, `filterUrl.ts` encode/decode (old links with a full explicit list keep
  working; a subset still narrows), `facets.ts` counts, `ActiveFilters` chips, `FilterBar` checkboxes, the phone filter
  sheet, the builder's pick mode.
- Motherboards: merge the two Socket lists into one Socket facet with every socket, ordered by count, and keep Platform.
- Segment ("Category: Desktop / Server / All") stays a choice of one; it is a different kind of control.
- Back button: filters keep using `replaceState` (my call: no history entry per tick); revisit if users ask.
Acceptance: Playwright test per category: default shows no ticked boxes; ticking one narrows and the count matches; clear
returns to all; reload and shared links keep state; old URLs open correctly; unit tests updated for `defaultFilters`.

### WS5. PSU grouping and quick build
- PSU keeps its spec-class model key (existing design); with WS1 the class price is robust. The product page and the row show
  the cheapest real product name so "850W Platinum" is never shown with an unnamed price.
- Quick build (`src/lib/autoBuild.ts`): choose a two-module kit for 16 GB and larger on dual-channel platforms, take only
  non-suspect prices, and show a note when the pick is single-channel. (My call; the owner may prefer cheapest-only.)

### WS6. SEO
- Per-route `<title>` and meta description from data ("RTX 5060 Ti 8GB — from €529 across 5 shops | BuildDraft.gr"), in the
  page's language; canonical link per page; keep one URL per page for both languages (language is a client toggle).
- `sitemap.xml` generated at build (index plus chunks per category: categories and every model page), added to `robots.txt`.
- JSON-LD `Product` with `AggregateOffer` (`lowPrice`, `highPrice`, `offerCount`, `priceCurrency`) on model pages.
- The site is a client-rendered SPA. Google renders JavaScript, but slowly and not always; whether to prerender key pages at
  build is a bigger decision (section 9) and is not part of phases 1 and 2.

### WS7. Small UI
- List-row product-title links get a minimum 24 px target (padding), no layout change on desktop.
- Keep: real 404 status for unknown routes, offline/error state.

### WS8. Tests and measurement
- Turn the audit scripts into `scripts/checks/deal-audit.mts` (precision, recall, LOW quality, top-N sanity per category) and
  run it in CI-style checks; baseline numbers above are the "before".
- Unit tests for the deal engine with fixtures: flat price, real drop, one-day spike then drop (fake discount), glitch price,
  short history, two shops only.
- Golden ranking fixtures (WS3), Playwright filter tests (WS4), sanity-guard fixtures (WS1).

## 6. Order of work

1. WS1 (guard) and WS8 audit script first: everything else depends on trustworthy prices and on being able to measure.
2. WS2 (deal engine) with its list-format bump, then WS3 (Recommended) using the new fields.
3. WS4 (filters) can run in parallel with WS2 and WS3 (separate code), then WS5, WS7.
4. WS6 (SEO) phases: titles/meta/canonical/sitemap/JSON-LD first; prerendering only if approved.
Each step is shipped behind the existing build guard (`checkData`), measured with the audit, and deployed through `main` only
after the audit meets its acceptance numbers.

## 7. Targets

| Measure | Before | Target |
|---|---|---|
| Deal badge precision (>= 3% under the 30-day median) | 31% | >= 90% |
| Genuine drops (>= 8%) flagged | 19% | >= 60% |
| "Lowest" badge precision | 37% | >= 90% |
| Suspect prices inside top 40 | present in PSU, RAM | 0 |
| Pre-ticked filter groups | 8 of 9 categories + Source | 0 |
| Initial data budget | within 300 KB gzip | still within (deal column compact) |

## 8. Risks

- History is thin right after the gap and for new models: the engine returns "no deal" instead of guessing (at least 10 points).
- The 30-day median can lag after a real price cut that stays: a deal fades after about two weeks. Acceptable; documented.
- The threshold and weights are my starting points, not user-tested; the audit exists so they can be tuned with evidence.
- No click or sales data exists, so "demand" is a proxy. Recommended can be explained but not validated against behaviour.
- Legal: the site should not repeat a shop's discount claim as its own. This design is not legal advice; Omnibus wording
  should be confirmed.
- Format change to `list.v2.json` touches the decoder, derive and tests together; do it in one change set.

## 9. Decisions

Answered by the owner (2026-11-08):
1. Shops' own discount claims: **show** them, as a small "shop says" note on the offer row (never as the main badge).
2. SEO depth: **left to me**. My call: phases 1 and 2 only (titles, descriptions, canonical, sitemap, structured data);
   prerendering is deferred until Search Console shows indexing problems, because it adds build time and moving parts.
3. Source filter: **empty means all**, like the other filters.

My calls, not yet confirmed by the owner: deal threshold 7%; 30-day window; guard limits 40% and 3x; quick build prefers
two-module kits; "Recommended" keeps its name only if it passes the golden fixtures.

Added by the owner after testing: the "Recommended" sort control is unreadable (white, visible only on hover). Fix with the
small UI items (WS7).

## 10. What is left to the builder

Exact threshold tuning, column encoding for `deal` in `list.v2.json`, the exact peer groups and ratios of the guard (use the
audit), copy for the UI text in Greek and English, the sitemap chunking, and the order of tests.
