# 11 — Test coverage and gaps

## What exists (all run in this audit)

| Suite | Size | Result | Runs automatically? |
|---|---|---|---|
| TypeScript check (`npm run typecheck`) | app + tests | clean | Only as part of `tsc -b` in the Vercel build (app code) |
| ESLint (`npm run lint`) | flat config, 32 older errors suppressed | clean | **No** |
| Vitest (`npm test`) | 78 files, 1,629 tests | 1,628 pass, 1 skipped | **No** |
| Engine scenarios | 81 | 63 pass, 4 documented gaps (S03, S04, S35, S45), 14 "unknown", 0 failures | **No** |
| Playwright (`npm run e2e`) | 24 files, 312 tests, Chromium, 1 worker | 312 pass, 8.1 min | **No** |
| Python checks (`scripts/checks/test_*.py`) | 23 scripts run (one, `test_history_git.py`, skipped by me because it runs git commands) | all exit 0 | Partly: the scrape workflow runs its own validation step |
| Build publishing check | data drop, empty category, builder slots | passed | Yes, in every Vercel build |

Code-coverage percentages were not measured (no coverage tool is configured, and adding one needed approval).

The suite is large and, where I compared it with behaviour, honest: its tests assert on real output, not on mocks of the thing under test. The gaps below are about what is not covered and about when tests run.

---

## [P3-012] No test, lint or type check runs automatically before code reaches the live site

- **Category:** Test process
- **Severity:** P3
- **Confidence:** High
- **Status:** Confirmed
- **Affected files:** `.github/workflows/` (only `scrape.yml`, `scrape-shops.yml`, `history.yml`), `package.json` (`build` = `tsc -b && vite build`)
- **Affected functionality:** Every push to `main`, which deploys.
- **Problem:** The 1,628 unit tests and 312 browser tests run only when someone runs them by hand. A push that breaks a test still deploys, as long as it compiles and the data check passes.
- **Evidence:** The workflows folder holds three scraper workflows and nothing else. The project notes say of the e2e suite: "No GitHub workflow for it yet."
- **Steps to reproduce:** List `.github/workflows`.
- **Expected behavior:** `npm run check` on every push and pull request; e2e at least on pull requests.
- **Actual behavior:** Manual.
- **Root cause:** Not set up yet.
- **Recommended solution:** One workflow: on push and pull request to `main` (ignoring data-only commits by path filter), run `npm ci` and `npm run check`; a second job runs Playwright. The repository is public, so minutes are free.
- **Alternative solutions:** Make Vercel's build command `npm run check`. Slower deploys for data commits; a path-filtered workflow is better.
- **Regression risks:** None for the site.
- **Verification plan:** Open a pull request with a failing test and see it blocked.
- **Estimated effort:** Small

---

## Gaps found by comparing tests with the defects in this audit

| Gap | Shows up as | Suggested test |
|---|---|---|
| No test at the exact deal threshold | P2-001 passed 1,628 tests | Unit: price at 93.0% of the reference must give a badge; property: every model flagged by the build is shown by `saleOf` |
| No upper bound checked on home page drops | P2-002 | Unit on `homeFile`: a 98% drop on a one-listing model is not featured |
| Automatic builder tested for validity, not for sense | P2-003, P3-001 | Property: memory cost ≤ a share of the total; total ≥ 85% of budget when dearer parts exist |
| Error boundary tested for showing, not for leaving | P2-004 | e2e: block a chunk, see the error, press Back, expect the list |
| Router not tested with malformed input | P4-001 | Unit: `matchRoute('/gpu/%')` is `notFound` |
| URL decoders tested for round trip, not for hostile values | P4-002 | Unit: huge page, `min > max`, unknown option value, huge budget |
| Layout shift checked on category pages only | P3-005 | Add info, search and compare pages to the layout tests with a CLS limit |
| Response headers | P2-005 | A check in `scripts/checks/site-check.mjs` that the live site sends the security headers |
| Data freshness | P2-006 | Scheduled check that the live manifest is younger than 14 hours |
| Browsers other than Chromium | unknown | Add Firefox and WebKit projects to `playwright.config.ts` (needs `npx playwright install`) |
| Real phones and touch | unknown | A manual pass on one iPhone and one Android phone before each larger release |
| Scraper against the real sites | parsers are tested on saved pages only | Already partly covered by `validate_skroutz.py` in the workflow; a weekly "parser still matches the live page" check per source would catch layout changes sooner |
| Photos repository | none in this repo | Out of scope here; check that repo has its own |

## Test quality notes

- e2e runs with one worker and takes 8 minutes; fine for CI on pull requests.
- 14 of 81 engine scenarios end in "unknown" and 4 are recorded gaps. They are documented, not hidden. They mark where the compatibility data is still thin (graphics-card power connector: 0 of 1,660 listings carry it; native 12V-2x6 on power supplies: 0 of 3,958), so rule 15 can never say "pass" or "error" today.
- One Vitest test is skipped; which one and why was not looked up.
