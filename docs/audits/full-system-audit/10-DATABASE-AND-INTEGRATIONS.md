# 10 — Database and integrations

There is **no database**. The data store is JSON files in git (`public/data/<category>/`), written by the scraper and read by the build. This file reports read-only integrity checks of those files (data commit `ca61231`, 2026-11-10 09:49 UTC) and the state of the external integrations.

## Integrity checks (all 10 categories, 42,467 listings)

| Check | Result |
|---|---|
| Duplicate listing ids | 0 |
| Price missing, zero, negative or not a number | 0 |
| URL not `https://` or not one of the five source hosts | 0 |
| Listing id prefix differs from its `source` | 0 |
| `sources.<name>.count` equals the number of listings of that source | equal in 9 categories; **monitors: Snif declares 1,056, the file holds 1,054** (declared total 5,779, listings 5,777). Small bookkeeping gap, cause not traced |
| A source marked failed (`ok: false`) | none |
| Listings older than 48 hours | 0 |
| Negative shipping | 0 |
| History: dates out of order | 0 |
| History: two points on one day | 0 |
| History: dates in the future | 0 |
| History: price ≤ 0 | 0 |
| History: series longer than 365 points | 0 |
| History: days with no own points | **2026-11-06 and 2026-11-07** (finding P2-006) |
| History: own-point jumps of ×2.5 or ×0.4 from one day to the next | 12 in GPU (others not tabulated here); these are what the dip and wrong-price filters exist for |

Build-time filters, from the build log of this audit: 3 values out of range dropped (GPU); 239 field conflicts resolved (motherboards 36, cases 148, coolers 55); **143 of 42,467 listings left out as suspect prices** (GPU 4, CPU 1, RAM 116, storage 1, PSU 14, cases 2, fans 4, monitors 1). Example caught: a 96 GB workstation card listed at €10 against a peer median of €22,702.59.

## Shipping totals

In the raw data a listing's stored best total is sometimes lower than its own list price (CPU 104 listings, 18 of them by more than 1%; motherboards 252 / 127; cases 261 / 180). That happens when the shop list had a cheaper offer than the list page, or the cached offer is older than the list price. The page handles it with a "same offer within 2%" rule (`src/lib/data.ts` `ownTotal`); on the product page tested, price + shipping equalled the total on every row with known shipping. No finding, but the number of affected listings is worth watching.

---

## [P3-002] A shop's typing mistake creates a product family that does not exist ("RTX 5070 16GB")

- **Category:** Data quality
- **Severity:** P3
- **Confidence:** High
- **Status:** Confirmed
- **Affected files:** `scraper/normalize.py` (VRAM taken from the title before the part number), data `public/data/gpu/latest.json`
- **Affected functionality:** Search results, "Related families" on the RTX 5070 page, the sitemap, a product page at `/gpu/rtx-5070-16gb`.
- **Problem:** Two Snif listings are titled with 16GB for a card whose part number says 12 GB. The normalizer trusts the title. The site shows a family "RTX 5070 16GB" from €1,199.00.
- **Evidence:** Raw listings: `snif 1199 "Gigabyte GeForce RTX 5070 Gaming 16GB GDDR7 OC GV-N5070GAMING-OC-12GD"` and `snif 2082.17 "Gigabyte GeForce RTX 5070 Gaming 16GB OC"`. Search for "rtx 5070" lists four families, one of them "RTX 5070 16GB"; the RTX 5070 12GB page links to "16GB €1,199.00".
- **Steps to reproduce:** Open `/search?q=rtx 5070`.
- **Expected behavior:** The listing joins RTX 5070 12GB, or is dropped.
- **Actual behavior:** A phantom family.
- **Root cause:** No table of valid memory sizes per chip; the part number is not preferred when it disagrees with the title.
- **Recommended solution:** When a Gigabyte/MSI/ASUS part number states the memory, let it win. Add a small "valid sizes per chip" table for current chips and drop or re-assign listings that disagree. Scraper change: needs the owner's approved plan.
- **Alternative solutions:** An entry in `scraper/overrides.json` for these two listing ids.
- **Regression risks:** A wrong table would hide real variants; limit it to chips with fixed sizes.
- **Verification plan:** A case in the normalizer checks with these two titles.
- **Estimated effort:** Small

---

## Monitors: accessories in the list (not counted as a finding)

The built monitor list still had 12 rows that are not monitors (a €15 charger, a €19 screen filter, a €29,999 signage panel). The scraper fix for exactly this is commit `7dcc167` (15:07 UTC), newer than the data tested (09:49 UTC). `origin/main` has monitor data commits at 16:32 and 16:49 UTC that were not pulled for this audit. Whether those rows are gone was **not verified**.

## Integrations

| Integration | Role | State observed | Verified how |
|---|---|---|---|
| Skroutz, BestPrice, Snif, Shopflix, e-shop.gr | Price sources | All five `ok: true`, 8–10 h old at audit time | Data files only; no request sent by the audit |
| Makers' sites (Gigabyte, Lian Li, Thermaltake, ASUS, Noctua, MSI, Corsair, Fractal) | Measurements | Not checked. The repo's own bug list says the Thermaltake parser is broken | Not verified |
| GitHub Actions | Runs the scraper | Ran on 11-08 to 11-10; stopped 11-05 to 11-08 (P2-006) | `git log` only; the Actions API was not queried |
| Cloudflare WARP | Proxy for Skroutz | In the workflow (P3-011) | Code reading |
| Vercel | Build and hosting | Live site serves build of 2026-11-10 15:22 UTC | 22 page loads, headers |
| `builddraft-images` repository via GitHub Pages | Photos | Photos loaded on live pages (50 images on `/gpu`, 0 broken) | Live page loads |
| Browser `localStorage` | Saved build, comparison, language | Works; survives corrupt values | Tests J04–J06, E05 |

## Risk noted, not a finding

History points are written only from sources that answered that day. If the usually cheapest source fails for a day, that day's low is too high, which can later make a normal price look like a drop. Over the 30-day window in this data Skroutz was missing on about one day in five, and deals were spread across sources (Skroutz 476, BestPrice 483, Shopflix 103, e-shop 56, Snif 18), so no wave of false deals was seen. A cheap safeguard: skip a model's daily point when the source of its previous low did not answer that day.
