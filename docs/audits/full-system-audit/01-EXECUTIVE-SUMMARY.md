# 01 — Executive summary

**Subject:** BuildDraft.gr (repository `gpu-prices-gr`), code commit `7dcc167`, data commit `ca61231`.
**Audit date:** 2026-11-10.
**Method:** repository reading, the project's own test suites, 204 scripted page loads at six screen sizes, 24 scripted user journeys and edge cases in a real Chromium browser on a local production build, 15 Lighthouse runs, independent logic checks against the real modules, read-only integrity checks of the data, and 22 read-only page loads of the live site.
**No application code, test, data file or configuration was changed.** The only files added are the thirteen reports in this folder.

## Verdict

The site is in good working order and can stay live. No finding is a P0 or P1: nothing is down, no data is being lost, and no security hole is open to use. The engineering base is strong for a one-person project: a large honest test suite, a build that refuses to publish broken data, clean console output on every page, top Lighthouse scores, and careful keyboard and error handling.

The weak spot is **trust in what the first screen says**. The home page's "largest price drops" currently leads with −98% and −94% on prices that are almost certainly errors; one class of real deals (exactly 7%) is silently hidden; and the automatic builder can spend two thirds of an office PC's budget on memory. Each is a small fix. Behind them sit two missing safety nets: tests do not run automatically before a deploy, and nothing alerts the owner when scraping stops, as it did for three days last week.

**Release readiness:** fit to remain in production. Fix the five items of roadmap step 1 before promoting the site more widely.

## What works (verified)

- Existing suites: type check and lint clean; **1,628** unit tests pass (1 skipped); **312 of 312** browser tests pass; 23 Python check scripts pass; production build passes its data checks.
- 204 page loads across 1920, 1440, 1366, 768, 390 and 375 px: 0 JavaScript errors, 0 console messages, 0 failed requests, 0 horizontal overflow, 0 broken images.
- Journeys that passed: search to product, filters with address sync and Back/Forward, pagination, language switch, product offers and totals, compare, builder pick and share link, automatic build, phone filter sheet, keyboard paths, offline and failed-data recovery, corrupted browser storage, rapid clicks, script-injection attempts, old-style links.
- Compatibility engine: 6,000 random builds, no crash, no malformed message, same answer every time.
- Lighthouse on a simulated phone: performance 92–99, accessibility 100 on ten of eleven pages, best practices 100, blocking time near zero.
- Data: 42,467 listings with no duplicate ids, no bad prices, no bad links; price history well-formed.
- What ships to visitors has 0 known vulnerable packages.

## Highest-priority fixes

| # | Finding | Why it matters | Effort |
|---|---|---|---|
| 1 | **P2-002** Home page promotes "−98%" and "−94%" drops that look like data errors | First thing a visitor sees; damages trust in every other price | Small |
| 2 | **P2-001** Deals of exactly 7% are never shown (38 products today) | A headline feature silently drops results; caused by `0.07 * 100 = 7.000000000000001` | Small |
| 3 | **P2-003** Automatic builder chose a €645 memory kit where a €221 one met the need | The "Build it for me" answer for an everyday €1,000 PC is plainly wrong | Small |
| 4 | **P2-004** After a page's code fails to load, the error screen stays on every page until reload | Likely to hit real visitors because the site redeploys several times a day | Small |
| 5 | **P2-006** Scraping stopped from 5 to 8 November with no alarm | Stale prices and holes in the history | Small |
| 6 | **P3-012** No automatic test run before deploy | 1,940 tests protect nothing unless someone runs them | Small |
| 7 | **P2-005** No security headers | Cheap hardening; none exists today | Small |

The full list of 28 findings with order and dependencies is in `12-REMEDIATION-ROADMAP.md`.

## Totals

Only items backed by evidence gathered in this audit are counted. A finding can fall in more than one group, so the group counts do not add up to 28.

| Measure | Count |
|---|---|
| Findings in total | **28** (P0: 0, P1: 0, P2: 6, P3: 11, P4: 11) |
| Status: Confirmed / Probable / Needs Verification | 23 / 3 / 2 |
| Confirmed bugs (functional defects) | 8 (P2-001, P2-003, P2-004, P3-002, P3-005, P4-001, P4-002, P4-003) |
| Probable bugs | 3 (P3-007, P4-008, P4-009) |
| Security findings | 4 (P2-005, P3-004, P4-004, P4-007), plus one compliance risk (P3-011) |
| Logic flaws | 6 (P2-001, P2-002, P2-003, P3-001, P3-003, P3-008) |
| Performance issues | 4 (P3-005, P4-006, P4-010, P4-012) |
| Dead-code findings | 1 (P4-005: 4 files, about 670 lines) |
| Architectural and process concerns | 7 (P2-006, P3-003, P3-006, P3-009, P3-011, P3-012, P4-008) |
| User journeys and edge cases scripted by the audit | 24 (9 journeys, 12 edge cases, 3 accessibility checks) |
| — passed / failed | 20 / 4 |
| Existing browser tests run — passed / failed | 312 / 0 |
| Existing unit tests run — passed / failed / skipped | 1,628 / 0 / 1 |
| Python check scripts run — passed / failed | 23 / 0 |
| Page loads in the crawl (local) | 204, 18 of them with layout shift above 0.01 |
| Page loads on the live site | 22 |
| Lighthouse runs | 15 |
| Features only partly verified or not verified | 14 areas listed in `13-UNVERIFIED-AREAS.md`; the largest are Firefox/Safari, real phones, screen readers, and a live run of the scraper |

## Limits of this audit

- Browser testing was **Chromium only**. Firefox and Safari engines were not available.
- The scraper was read, not run; its behaviour against the real sites today is unverified.
- The project has no server, database or login, so those audit phases had nothing to examine.
- Lighthouse figures are single lab runs on a local server.

## Files in this folder

| File | Content |
|---|---|
| `01-EXECUTIVE-SUMMARY.md` | This page |
| `02-ARCHITECTURE-AND-FEATURE-MAP.md` | Real stack, architecture diagram, features and their tests |
| `03-PLAYWRIGHT-TEST-RESULTS.md` | Every test run and its result |
| `04-FRONTEND-FINDINGS.md` | Frontend, accessibility, SEO |
| `05-BACKEND-AND-API-FINDINGS.md` | Scraper, workflows, build step |
| `06-BUSINESS-LOGIC-AUDIT.md` | Deals, home page, automatic builder |
| `07-SECURITY-AND-PRIVACY.md` | Headers, dependencies, injection tests, privacy |
| `08-PERFORMANCE-AND-OPTIMIZATION.md` | Lighthouse table and performance findings |
| `09-DEAD-CODE-AND-TECHNICAL-DEBT.md` | Unused code, documentation drift, debt register |
| `10-DATABASE-AND-INTEGRATIONS.md` | Data integrity, data quality, integrations |
| `11-TEST-COVERAGE-AND-GAPS.md` | Suite review and missing tests |
| `12-REMEDIATION-ROADMAP.md` | All findings, order of work |
| `13-UNVERIFIED-AREAS.md` | What was not tested |
