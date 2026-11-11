# Mouse data review — partial live preflight

**Checkpoint update:** A full isolated collection has since completed. Its corrected offline replay and final admission report are still pending. The sections below remain the earlier preflight findings; current state and exact trial paths are in [MOUSE_CHECKPOINT.md](MOUSE_CHECKPOINT.md).

Date: 2026-11-11. This is a preflight report, **not** the completed first-data admission review. Mouse remains disabled and invisible. No production mouse snapshot has been collected or published.

## Authorization and pushed code

The owner authorized the push and starting tests after Gate A. Feature code was pushed to `feat/mouse-category` at `8e7198098361bcb745e1608ac3753d0db02605e1`; this did not merge the feature into `main`.

GitHub CI: https://github.com/TeoAmpatzis/gpu-prices-gr/actions/runs/43092987454. Its `check` job passed; the browser job was still running when this report was written. This CI run tests the feature code at `8e71980`; later documentation-only commits do not change that tested code.

The local Gate A evidence remains: typecheck/lint/build and 1,655 unit tests passed, all 322 browser tests passed, all 31 Python check programs passed.

## Scraper split prerequisite

Observed GitHub run: https://github.com/TeoAmpatzis/gpu-prices-gr/actions/runs/43067793455.

| Job | Started UTC | Finished UTC | Duration | Result |
| --- | --- | --- | --- | --- |
| prices | 2026-11-11 17:25:37 | 2026-11-11 18:15:07 | 49 min 30 s | success |
| specs | 2026-11-11 18:15:50 | 2026-11-11 18:34:47 | 18 min 57 s | success |

This confirms one successful split production run. It does not prove the separate optional requirement of two consecutive scheduled runs for consolidating the Skroutz commit action.

## Live list-page probes

Fifteen list-page GET requests were made through the existing HTTP session, sequentially per host and with the existing polite delay between same-host probes. There were no product-page, shipping, history, image-download or manufacturer-page requests.

| Page | Result | Observed catalogue size | Parsed cards | Unique IDs on first page |
| --- | --- | --- | --- | --- |
| BestPrice `/cat/2569/pontikia.html` | HTTP 200 | 2,780 advertised | 16 | 16 |
| Snif `/category/1919852/` | HTTP 200 | not stated | 19 | 19 |
| Skroutz gaming `/c/1865/gaming_pontikia.html` | HTTP 200 | 1,741 advertised | 56 | 49 |
| Skroutz office `/c/69/mice.html` | HTTP 200 | 2,248 advertised | 59 | 47 |

Sponsored/repeated cards were deduplicated before identity checks, matching the collection pipeline. Snif advertises a next page but no total or last page; its terminal page and total remain unverified. No complete category traversal was performed.

## Measured BestPrice price slices

Parameters are cents. These contiguous slices cover nonnegative prices with an open upper end. Each measured slice stays below the upstream cap of 800 products/50 pages.

| Query | Products advertised | Pages |
| --- | ---: | ---: |
| `max=499` | 445 | 28 |
| `min=500&max=699` | 400 | 25 |
| `min=700&max=999` | 504 | 32 |
| `min=1000&max=1999` | 711 | 45 |
| `min=2000&max=3999` | 389 | 25 |
| `min=4000&max=7999` | 154 | 10 |
| `min=8000` | 172 | 11 |
| **Sum** | **2,775** | **176** |

An initial single `max=999` slice contained 1,349 products but exposed only 50 pages; it is unsuitable and was split into the first three rows above.

Boundary probes confirmed inclusive cent limits: `min=1000&max=1000` returned 16 items priced exactly 1,000 cents; `min=999&max=1000` included both boundary prices; `min=1000&max=1001` included both boundary prices. First-page prices also respected the measured slices.

The slice sum is five below the earlier unfiltered advertised count. This discrepancy has not been explained; it is not evidence of full coverage or five confirmed missing products. Price changes, eligibility and complete deduplication need checking in the first full collection.

The design's estimate is consistent with these counts: 176 list requests at the earlier measured 2.3 s/request is approximately 6.7 minutes, plus the existing shipping allowance. This is an estimate, not a mouse scrape timing.

## Initial normalization test results

Combining the four first-page samples yields 131 unique source IDs. Current normalization accepts 92 observations representing 88 model keys; it rejects 33 as `no-identity`, four as `not-mouse`, and two as `identity-conflict`. These are a small popularity-selected sample, not catalogue-wide coverage statistics or a completed random model review.

The preflight exposed corrections needed before the first-data gate:

- Observed makers missing from the initial mouse vocabulary include Apple, HyperX, Xiaomi, Ajazz, Sades, ATK, Spartan Gear, Attack Shark, Motospeed and Ugreen. Snif has additional unfamiliar makers and titles whose maker is not at the prefix. Missing identity remains quarantined; it must not be guessed.
- Whole colour phrases such as `Space Grey`, `Pale Grey`, `Graphite` and `Anthracite` need explicit observed handling. Removing only a known colour suffix can leave marketing colour words in model identity and split one model. Different colour names must remain distinguishable as variants.
- Some Skroutz card titles omit the model that the same list page's matching JSON-LD states. For example, `Trust Ασύρματο Μαύρο` has a matching Product name containing `Trust 25145`; `Keychron Ασύρματο` has one containing `Keychron M6S-A23`. Using that observation needs exact source-ID/URL association and regression tests; no product-page request is needed.
- Snif's first page includes real mouse pads and a bungee/USB hub. Their accessory rejects are expected. Included receivers, unfamiliar makers and marketing-heavy titles need review against the captured originals.

No new parser correction or production category configuration was made as part of these diagnostic probes. BestPrice paths remain unset in production code until the preflight findings are addressed and tested.

## Outstanding Gate B evidence

Still required: normalization regressions from observed titles and corrected report; complete successful collection from all three sources; Snif termination evidence; complete source counts and overlap; every reject reason with up to 20 samples; 50 seeded random model groups; per-field unknown rates; source-only models; measured runtime and image candidate coverage; frontend-derived model count and calibrated minimum; owner review before hidden enablement.

Raw captures, probe summaries and samples stay under the ignored project-local `local/mouse/preflight/` directory. They are not copied into `public/data/`. The execution ledger is under `.superpowers/sdd/2026-11-11-mouse-category/`.
