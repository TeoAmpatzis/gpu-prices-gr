# 03 — Playwright test results

All browser tests ran on **Chromium only** (Playwright 1.63.0, headless). Firefox and WebKit are not installed on this machine and were not installed, because installing software needed approval. See `13-UNVERIFIED-AREAS.md`.

Target for all state-changing tests: the local production build served by `vite preview` on `http://localhost:4199` (code `7dcc167`, data `ca61231`). The deployed site `https://gpu-prices-gr.vercel.app` received a read-only pass of 22 page loads.

The audit's own scripts are not in the repository. They are in the session scratch folder (`journeys.cjs`, `crawl.cjs`, `live.cjs`, `lh.cjs`, `logic.ts`, `integrity.cjs`, `graph.cjs`). Ask if you want them copied into the repo.

## 1. Existing end-to-end suite

Command: `E2E_BASE_URL=http://localhost:4199 npx playwright test`

| Result | Count |
|---|---|
| Passed | **312** |
| Failed | 0 |
| Skipped / flaky | 0 |
| Duration | 8.1 min, 1 worker |

24 spec files: aliases 2, builder-gate 9, builder-presentation 9, builder-recovery 6, builder 29, catalogue 14, compare 28, cpu-threads 1, design-layout 6, facets 3, filters 11, home 10, links 5, model 52, monitor 5, pick 16, product-presentation 6, product-selection 7, range-targets 3, search 9, seo 3, shell 4, smoke 22, urls 52.

## 2. Audit crawl: 34 page types × 6 viewports

Viewports: 1920×1080, 1440×900, 1366×768, 768×1024, 390×844 (touch), 375×667 (touch). Pages: home, `/parts`, the 10 category lists, one product page per category, 3 builder views, compare, search (with and without a query), 4 info pages, an unknown page, an unknown product.

| Check (204 page loads) | Result |
|---|---|
| HTTP status other than 200 | 0 |
| JavaScript page errors | 0 |
| Console errors or warnings | 0 |
| Failed network requests | 0 |
| Horizontal overflow, elements outside the viewport | 0 |
| Broken images | 0 |
| Images without `alt` | 0 |
| Exactly one `<h1>`, a title, a canonical link | all 204 |
| Layout shift (CLS) above 0.01 | **18 page loads** (see P3-005) |

CLS values measured (higher than 0.1 is "needs improvement" by Google's threshold):

| Page | 1920 | 1440 | 1366 | 768 | 390 | 375 |
|---|---|---|---|---|---|---|
| `/search?q=rtx` | 0.115 | 0.145 | 0.158 | 0.163 | 0 | 0 |
| `/privacy` | 0.076 | 0.145 | 0.175 | 0.089 | 0 | 0 |
| `/about` | 0.046 | 0.095 | 0.138 | 0.074 | 0 | 0 |
| `/how-prices` | 0.014 | 0.041 | 0.069 | 0.043 | 0 | 0 |
| `/contact` | 0 | 0.005 | 0.022 | 0.007 | 0 | 0 |
| `/compare` | 0 | 0 | 0 | 0.014 | 0 | 0 |

Every other page: 0 to 0.001 at every viewport.

## 3. Audit journeys and edge cases (24 scripted steps)

Final status after correcting three checks in my own script (the first run of J01, J06 and E13 failed because of my selectors and a truncated string, not because of the site; they were fixed and re-run).

| ID | Journey / edge case | Result | Evidence |
|---|---|---|---|
| J01 | Home search → suggestions → results → product page | Pass | 4 suggestions; `/search?q=rtx%205070`; 4 results; opens "RTX 5070 12GB" |
| J02 | Filter, URL sync, sort, reload, Back, Forward, Clear | Pass | 1469 → 345 (AMD); `/gpu?brand=amd`; first 15 prices ascending; reload keeps state |
| J03 | Pagination; out-of-range and garbage parameters | Pass | page 2 shows dearer items; `page=1000000000` still shows products (URL not corrected, see P4-002) |
| J04 | Language toggle and persistence | Pass | h1 and `<html lang>` switch; survives reload |
| J05 | Product page: offers, totals, history chart, compare | Pass | 128 offers after expanding; price + shipping = total on all 9 rows with known shipping; chart drawn; comparison survives reload |
| J06 | Builder part list: pick, persist, share link, clean-browser open | Pass | total €379.60; link `/builder?v=2&cpu=…&n.cpu=…` opens same build; visitor's `pcBuild` not written. "New list" opened a confirmation; the confirmation itself was not completed |
| J07 | Start screen: Gaming + €1,000 → automatic build | Pass | total €935.02; "14 fit, 2 likely, 5 to check, 0 incompatible" |
| J08 | Phone: filter sheet, focus trap, Esc, focus return | Pass | `role=dialog aria-modal=true`; focus stays inside after 60 Tabs; returns to "Filters" |
| J09 | Keyboard: skip link, menu open/close, focus indicator | Pass | first Tab = "Skip to content"; menu `aria-expanded` toggles; 2px outline |
| E01 | Malformed `%` in the path | **Fail (local server)** | `vite preview` answers HTTP 500 itself. On the live site Vercel answers HTTP 400 before the app loads. See P4-001 |
| E02 | Script injection through `q`, `n.cpu`, `items`, slug | Pass | no script ran, no injected element, on 5 URLs |
| E03 | Share link with unknown part, spoofed name, `budget=1e308` | Pass with note | page shows "No longer sold: FREE RTX 5090 — visit evil.example (Processor)" (P4-004); no Infinity/NaN shown |
| E05 | Corrupted `localStorage` (17 values × 3 pages = 51 loads) | Pass | 0 broke |
| E07 | Offline navigation, then retry online | Pass | "The prices didn't load … Try again"; retry loads 4,040 items |
| E08 | Page code fails to load, then user navigates | **Fail** | Back and the header link both stay on the error screen (P2-004) |
| E09 | 21 rapid filter toggles; 9 rapid compare clicks | Pass | URL and count consistent; no duplicate entries |
| E11 | 6,000-character query, blank query, Greek, regex characters | **Fail (one check)** | long unbroken query causes horizontal overflow (P4-003); the rest pass |
| E12 | Slow line (400 kbit/s, 400 ms latency) | Pass | heading at 4.1 s, first product at 6.5 s |
| E13 | List file: HTTP 500, truncated JSON, wrong shape | Pass | all three show the error state with retry |
| E14 | A model the build flags as a 7% deal | **Fail** | no badge on the list, none on the product page, "Deals only" returns 0 (P2-001) |
| E15 | Old hash links, trailing slash, wrong case | Pass | `/#ram?type=ddr5&cap=32&sort=price-asc` → `/ram?...`; `/GPU` → 404 page |
| A01 | Scripted accessibility checks on 9 pages | Pass | 0 controls without a name, 0 unlabelled fields, 0 duplicate ids, 0 heading skips |
| A02 | Touch targets ≥ 24 px on a phone, 5 pages | Pass | the only hits were the visually hidden skip link (1×44 px until focused), which is not a real target |
| A03 | Reduced motion; reflow at 320 px wide on 6 pages | Pass | 0 px overflow on all 6; 4 elements still carry a transition under reduced motion (not judged) |

Totals for the audit's own steps: **24 steps, 20 pass, 4 fail** (E01, E08, E11, E14).

## 4. Deployed site, read-only

22 page loads (11 URLs × 1440 px and 390 px), Greek locale.

| Check | Result |
|---|---|
| Pages rendered with the right heading | 20 of 20 real pages |
| Unknown page | HTTP 404 with the site's own 404 page |
| JavaScript errors, broken images, overflow | 0 |
| `/gpu/%E0%A4%A` | HTTP 400 from Vercel (`ERR_HTTP2_PROTOCOL_ERROR` in the browser) |
| Raw scraper files (`/data/gpu/latest.json`, `history.json`) | 404 (removed from the build, as designed) |
| Dev-only `/_preview` | 404 |
| Live `manifest.json` | built 2026-11-10 15:22 UTC, same data as the local build |

One unexplained observation: on the live site every page except the home page took about 31 s to reach Playwright's "network idle" state, against about 1.2 s locally. The pages themselves had rendered. The cause was not investigated (P4-012, needs verification).

## 5. Independent logic checks against the real modules (`npx vite-node`)

| Check | Cases | Result |
|---|---|---|
| Compatibility engine on random builds from real builder rows, half with corrupted fields | 6,000 | 0 exceptions, 0 messages containing `undefined`/`NaN`/`null`, 0 non-deterministic results |
| PSU rule: more watts is never worse | every clean build with a PSU, 9 wattages | 0 violations |
| Filter → URL → filter round trip | 4,000 | 0 mismatches |
| Offers order independent of input order | 352 models | 0 differences |
| Recommended and price sort independent of input order | GPU list | stable |
| Deals flagged by the build vs shown by the page | 1,031 models | **38 not shown** (P2-001) |
| Router on malformed paths | 10 | 3 throw `URIError` (P4-001) |

## 6. Baseline

`npm run check` → exit 0: typecheck clean, lint clean, **78 test files, 1,628 tests passed, 1 skipped**, build passed. Engine scenarios: 81 (63 pass, 4 documented gaps, 14 unknown, 0 failures). Python checks: 23 scripts, all exit 0.
