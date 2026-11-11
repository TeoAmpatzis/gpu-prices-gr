# 08 — Performance and optimization

All numbers below were measured in this audit. Lighthouse 12, **one run per page** (single runs vary by a few points), against the local production build on `http://localhost:4199`. Phone = Lighthouse's default simulated slow 4G and mid-range phone. The local server and the live CDN differ, so treat these as lab figures for the code, not as field data for the live site. No field data (real-visitor measurements) exists for this site.

## Lighthouse results

| Page | Form | Perf | A11y | Best pr. | SEO | FCP ms | LCP ms | TBT ms | CLS | JS KB | Data KB | Total KB | Requests |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Home | phone | 99 | 100 | 100 | 100 | 1353 | 1953 | 0 | 0.001 | 77 | 3 | 162 | 11 |
| Home | desktop | 100 | 100 | 100 | 100 | 322 | 442 | 0 | 0.001 | 77 | 3 | 162 | 11 |
| `/gpu` | phone | 99 | 100 | 100 | 100 | 1354 | 1954 | 5 | 0 | 105 | 44 | 247 | 20 |
| `/gpu` | desktop | 100 | 100 | 100 | 100 | 324 | 605 | 0 | 0 | 105 | 44 | 236 | 20 |
| `/case` | phone | 99 | 100 | 100 | 100 | 1353 | 1953 | 49 | 0 | 105 | 276 | 484 | 21 |
| `/storage` | phone | 99 | 100 | 100 | 100 | 1354 | 1954 | 42 | 0 | 105 | 214 | 431 | 24 |
| `/monitor` | phone | 92 | 100 | 100 | 100 | 1353 | 3303 | 81 | 0 | 105 | 178 | 368 | 19 |
| Product page | phone | 94 | 100 | 100 | 100 | 1354 | 3016 | 0 | 0 | 141 | 11 | 249 | 36 |
| Product page | desktop | 100 | 100 | 100 | 100 | 324 | 693 | 0 | 0 | 141 | 11 | 276 | 38 |
| `/builder` | phone | 98 | 100 | 100 | 100 | 1353 | 2258 | 0 | 0 | 92 | 2 | 178 | 15 |
| `/builder` | desktop | 100 | 100 | 100 | 100 | 324 | 486 | 0 | 0 | 92 | 2 | 178 | 15 |
| `/builder?mode=quick` | phone | 94 | 100 | 100 | 100 | 1354 | 3019 | 0 | 0 | 157 | 2 | 244 | 29 |
| `/search?q=rtx` | phone | 93 | 96 | 100 | 100 | 1353 | 3154 | 0 | 0.061 | 79 | 162 | 324 | 12 |
| `/compare` | phone | 95 | 100 | 100 | 100 | 1353 | 1953 | 0 | 0.124 | 103 | 1 | 186 | 19 |
| `/privacy` | phone | 98 | 100 | 100 | 100 | 1353 | 2258 | 0 | 0 | 85 | 1 | 170 | 12 |

Reading: performance is strong. Every page scores 92 or more on a simulated phone and 100 on desktop. Blocking time is near zero everywhere, including the large case list (the facet counts run in a Web Worker). The Lighthouse "SEO 100" checks only basics after scripts run; see P3-009 for what it does not see.

## Other measurements

- Slow line (400 kbit/s, 400 ms latency), `/gpu`: heading at 4.1 s, first product at 6.5 s.
- Build output: `dist` is 189 MB (mostly the per-model data chunks); `dist/assets` is 0.9 MB. Main bundle 232.65 kB (76.89 kB gzip); `Workbench` 101.80 kB (37.08 kB gzip); `pickCheck` 72.16 kB; `ModelPage` 38.33 kB; `CategoryPage` 35.89 kB. `search.json` 563.5 KB before compression (162 KB transferred).
- No memory-leak, long-session or CPU-profile measurement was made.

---

## [P4-010] Two page types download more JavaScript than the project's own target

- **Category:** Performance
- **Severity:** P4
- **Confidence:** Medium (the target comes from project notes; it may have been relaxed since)
- **Status:** Needs Verification
- **Affected files:** `src/components/builder/Workbench.tsx` and its imports; `src/components/product/ModelPage.tsx`
- **Affected functionality:** Builder part list, product pages, on phones.
- **Problem:** Project notes give a first-load budget of about 110 KB of JavaScript. Measured transfer: builder part list 157 KB, product page 141 KB. Both still score 94 with LCP about 3.0 s.
- **Evidence:** Table above.
- **Steps to reproduce:** Lighthouse on the two addresses.
- **Expected behavior:** Within the stated budget, or the budget updated.
- **Actual behavior:** 28% and 43% over.
- **Root cause:** The compatibility engine and its tables load with these pages.
- **Recommended solution:** Confirm whether the budget still stands. If so, load the engine after first paint on the product page (it is needed only for the "fits your build" line).
- **Alternative solutions:** Raise the budget in the notes.
- **Regression risks:** Low.
- **Verification plan:** Lighthouse, three runs, median.
- **Estimated effort:** Medium

---

## [P4-006] A missing photo is cached as "missing" for a day

- **Category:** Caching
- **Severity:** P4
- **Confidence:** High for the header; effect inferred
- **Status:** Confirmed
- **Affected files:** `vercel.json` (`/img/(.*)` header rule)
- **Affected functionality:** Product photos added after a visitor or the CDN first asked for them.
- **Problem:** The one-day `Cache-Control` applies to 404 answers as well.
- **Evidence:** Header read on a 404 `/img/…` response during the audit: `Cache-Control: max-age=86400`.
- **Steps to reproduce:** `curl -sI https://gpu-prices-gr.vercel.app/img/gpu/000000000000-96.webp`.
- **Expected behavior:** Short lifetime for "not found".
- **Actual behavior:** One day.
- **Root cause:** One header rule for the whole path.
- **Recommended solution:** The site only requests photos listed in the build's index, so the case is rare. Leave as is, or lower the browser lifetime and keep the CDN one.
- **Alternative solutions:** None needed.
- **Regression risks:** None.
- **Verification plan:** Header check.
- **Estimated effort:** Small

---

## [P4-012] On the live site, pages took about 31 s to reach "network idle"

- **Category:** Performance
- **Severity:** P4
- **Confidence:** Low
- **Status:** Needs Verification
- **Affected files:** Unknown
- **Affected functionality:** Unknown; pages were rendered and usable long before.
- **Problem:** Playwright's `networkidle` wait took 31.2 s on every live page except the home page, at both viewports, against about 1.2 s on the local build of the same code.
- **Evidence:** `live.cjs` output: `/gpu 31556ms`, `/builder 31205ms`, `/privacy 31223ms`; home 4.3 s and 1.6 s.
- **Steps to reproduce:** `page.goto(url, { waitUntil: 'networkidle' })` on the live site.
- **Expected behavior:** Idle within a few seconds.
- **Actual behavior:** About 31 s, very constant, which points to one request that stays open for 30 s (a prefetch, a photo request through the rewrite, or a connection the CDN holds).
- **Root cause:** Not investigated, to keep live traffic minimal.
- **Recommended solution:** Open the Network panel on the live `/gpu` and look for a request that stays pending.
- **Alternative solutions:** None.
- **Regression risks:** None.
- **Verification plan:** As above.
- **Estimated effort:** Small

Layout shift on info, search and compare pages is finding P3-005 in `04-FRONTEND-FINDINGS.md`.

## Algorithmic notes (no finding)

- Automatic builds are computed at build time for a budget grid of 400 to 10,000 in steps of 50; the browser only looks one up. Good.
- Facet counts run one filter pass per filter group; moved to a Web Worker, measured blocking time 5 to 81 ms on a simulated phone.
- History is reduced at build time to the few points a list needs; full history loads only on a product page.
