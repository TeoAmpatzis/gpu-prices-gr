# Local website review verification

**Scope:** Complete the existing approved website locally, then hand it to the owner for review. No v2 deployment or website branch push is authorized.

**Preview:** <http://127.0.0.1:4173/>

**Status:** Ready for local review. On published data commit `6a171b8da50d4b7f74770ac6b7c007eaf2fd6112`, typecheck, lint, build, all 1,499 unit tests and all 261 browser tests passed. The complete health command also passed all 71 route checks, strict freshness for all 45 store/category pairs and a served WebP photo. Verified November 5, 2026, around 06:01 UTC. Sustained scheduled scraper verification remains a separate pending operational gate.

## Changes

- Updated the health command to test real v2 routes through the maintained Playwright smoke and URL suites. It still rejects missing data, category/source freshness failures and broken pages, and checks a served product photo. Local preview explicitly skips only hosting cache-header assertions.
- Enlarged range-slider pointer targets to 44 × 44 pixels while retaining compact visible knobs, correct track endpoints, keyboard synchronization, localized labels and mobile bounds.
- Added a valid static robots.txt; the previous missing resource returned the SPA's HTML.
- Removed the obsolete health-script lint suppression.
- Made manufacturer compatibility tests independent of temporary Fractal Terra stock availability. Production compatibility facts and inventory are unchanged.

Local implementation commits: `c86c858` and `991fa89` on `design/claude-v2`.

Refreshed-data follow-ups: `c283544` replaces the now-unavailable Terra browser scenario with stocked Fractal Era 2, which has the same curated SFX/SFX-L-only PSU constraint. ATX rejection and all other scenario assertions remain. `2e4861a` reserves sufficient mobile space for the bounded five-row deals feed: the old 420px placeholder became 572px after loading, shifting following content by 152px; the shared loading/populated/empty reserve is now 600px. Measured shift is zero. Both changes passed fresh review.

Local test-only follow-up `88b8eb8` scopes the homepage smoke assertion to the nine actual category links. The old broad selector also counted five asynchronously loaded deal links, producing a false failure. The failing full run was observed before this correction; the focused test and subsequent full 261-test suite passed.

## Verification so far

- Typecheck, lint, all **1,499 unit tests in 64 files**, and production build passed after syncing released main data. Lint retains one pre-existing PriceChart dependency warning.
- All **261 browser tests** passed in 7.7 minutes on the refreshed published data. The suite covers all three range regressions, including transparent-target dragging and Greek labels.
- All **12 native health-check tests** passed. The real health command passed all 71 route tests, strict data freshness and the sampled WebP. Earlier negative controls correctly rejected stale data and a broken route.
- A disposable proxy deliberately broke `/gpu`. The health command detected the missing product rows and returned nonzero. The real preview was unchanged, and the proxy was stopped.
- Generated Greek mobile and English desktop screenshots were inspected. The interactive browser host was unavailable; automated browser rendering supplied the inspection artifacts.
- No raw production data was locally edited. Remote data was synchronized through the normal `origin/main` merge.

## Performance

Three-run Lighthouse medians on the production preview, after the target/robots fixes:

| Route | Mobile performance | Desktop performance | Accessibility | Best practices | SEO |
| --- | ---: | ---: | ---: | ---: | ---: |
| Home | 99 | 100 | 100 | 100 | 100 |
| Heaviest category, cases | 89 | 100 | 100 | 100 | 100 |
| Product detail | 95 | 100 | 100 | 100 | 100 |
| Builder | 98 | 100 | 100 | 100 | 100 |

The preview compresses assets. The heaviest category's simulated mobile LCP is approximately 3.8 seconds, so its score of 89 is a real remaining performance limit. Category JavaScript is approximately 100 KiB gzip and the largest category list approximately 265 KiB gzip, within the existing payload limits. The repeated worker list request reused the cached body; it did not transfer another full list. Product compatibility code loads after first paint, as permitted by the existing spec. Fonts are separate (approximately 66 KiB).

Raw benchmark reports: `test-results/local-completion/perf-fixed/`. These measurements precede the final mobile deal-panel reserve fix and latest data refresh; they are recorded benchmarks, not a new measurement of that final snapshot. Final mobile layout stability is covered by the passing browser suite.

## Scraper recovery

Initial recovery `89945b7` and status fix `b6c234f` were insufficient: the first production run refreshed only five of nine Skroutz categories. The connection-replacement candidate, hosted Windows probes and hosted Chromium probe did not establish dependable access and were not promoted as a solution. Detailed evidence is in `docs/superpowers/2026-11-04-skroutz-recovery-evidence.md`.

Owner then approved a rebuilt complete-or-fail collector and the concrete repository-scoped local-runner proposal. Released collector `743977b` preserves identities, normalizers and history, validates pagination and staged coverage, and closes sessions. Runtime release `ad60469` routes trusted-main scheduled/manual scraping to the approved separate Windows runner and checks the exact published commit. Source regression suites passed 163 checks; the collector also passed 25 cases under Python 3.12.

[Full production run 41896086713](https://github.com/TeoAmpatzis/gpu-prices-gr/actions/runs/41896086713) passed and published `6a171b8da50d4b7f74770ac6b7c007eaf2fd6112`: all nine Skroutz categories, 10,863 listings, all 45 store/category pairs current/successful, zero source-validation errors and intact history. The complete workflow log contains zero blocked-response messages. That data was merged locally through `origin/main`, rebuilt and verified as described above.

[Scheduled run 41902862054](https://github.com/TeoAmpatzis/gpu-prices-gr/actions/runs/41902862054) failed after this PC slept from November 4 at 20:50 UTC until November 5 at 05:48 UTC. GitHub reports lost runner communication. It did not publish a replacement snapshot. The runner recovered after wake; the failed run remains in the monitoring history. A PC that sleeps cannot provide uninterrupted scheduled collection.

Follow-up `7db2e7d` removes slow remote pip-cache transfer from the persistent machine and streams progress without buffering; local caches remain. [Normal run 41977104870](https://github.com/TeoAmpatzis/gpu-prices-gr/actions/runs/41977104870) is now in progress after connectivity recovery. The bounded read-only monitor requires two consecutive actual scheduled passes and stops after two consecutive failures or its 16-hour deadline.

Runner controls are outside the website checkout: [start](C:/Users/Teo/ActionsRunners/BuildDraftScrape/Start-Runner.ps1) and [stop](C:/Users/Teo/ActionsRunners/BuildDraftScrape/Stop-Runner.ps1). No Windows service, startup task or power setting was changed. Keep the PC awake and connected for scheduled work; restart the runner after reboot. No website branch push or v2 deployment occurred.

## Remaining gate

- [x] Verify a full published production run has nine current successful Skroutz sources and intact history.
- [x] Merge remote data locally, rebuild and pass 1,499 unit tests, 261 browser tests and the strict health command.
- [x] Leave the local preview ready for owner review, with v2 undeployed.
- [ ] Verify two consecutive scheduled full scrapes. The read-only monitor is running; machine availability remains the owner's operational responsibility.
