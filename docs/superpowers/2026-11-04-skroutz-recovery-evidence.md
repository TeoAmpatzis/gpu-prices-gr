# Skroutz recovery evidence

## Scope and status

Owner approved implementation of the recovery plan on 2026-11-04. Scraper work is isolated from the website UI branch. Initial recovery `89945b7` and targeted status fix `b6c234f` were insufficient. Transport follow-up `3c51089` was not promoted. The rebuilt collector `743977b` and approved local-runner workflow `ad60469` are now released; their first full production run is being verified. Read-only diagnostic snapshots were never manually copied into production data.

After scraper recovery, the owner requested completion and verification of the existing website locally, followed by owner review. That website work must not deploy v2 before owner approval.

## Reproduction

Production scrape [41789115948](https://github.com/TeoAmpatzis/gpu-prices-gr/actions/runs/41789115948) failed all nine Skroutz categories with HTTP 403 and `cf-mitigated=challenge`. Previous snapshots were retained. The previous run succeeded in eight categories.

Nine initial read-only requests used the same CPU category, curl_cffi 0.16.3, and selectolax 0.4.13. No product-page probe requests were made. Requests in each environment were spaced 30 seconds apart.

| Environment | Time window UTC | Python | Responses | Parsed listings on each 200 |
| --- | --- | --- | --- | --- |
| Local Windows | 16:00:57–16:01:59 | 3.12.16 | 200, 200, 200 | 60 |
| GitHub Linux, first fresh runner | 16:03:18–16:04:20 | 3.12.15 | 403, 200, 403 | 60 |
| GitHub Linux, second fresh runner | 16:10:05–16:11:08 | 3.12.15 | 200, 200, 403 | 60 |

Runner artifacts:

- [First runner](https://github.com/TeoAmpatzis/gpu-prices-gr/actions/runs/41863661230), artifact `skroutz-probes-41863661230`.
- [Second runner](https://github.com/TeoAmpatzis/gpu-prices-gr/actions/runs/41864576519), artifact `skroutz-probes-41864576519`.

This establishes intermittent challenge responses on runners that also return valid listings. It does not establish an IP ban or a parser regression. No client fingerprint or dependency change is justified by these observations.

GitHub reported an Actions/Pages incident during this investigation: <https://stspg.io/pjgptg3cfc6n>. Run metadata continued to show queued states even after probe artifacts were available. Validation therefore checks artifacts and actual source timestamps as well as job status.

## Demonstrated failure amplifiers

The production run's logged retry waits total 720 seconds: category requests used 420 seconds and product shipping requests used 300 seconds. CPU shipping consumed 200 seconds and fan shipping another 80 seconds before later category requests. Once the allowance reached 720 seconds, later blocked categories received no delayed retries.

The old pipeline interleaved listing fetches and shipping enrichment category by category. This let optional enrichment consume the shared allowance before all listing categories had attempted recovery.

A separate regression test also reproduced stale-history promotion during `--only skroutz`: an untouched BestPrice snapshot with its prior `ok=true` was included in fresh history. This must be corrected before adding targeted recovery passes.

## Candidate behavior

- Fetch all selected categories before shipping enrichment.
- Retry only failed Skroutz categories once, using existing fetch/session construction and the remaining shared allowance. Successful or unselected categories are not repeated.
- Refresh shipping after listing recovery, preserving cached-total application when its budget is zero.
- Include only successfully fetched sources from the current invocation in fresh history points.
- Emit Actions warnings and per-category source summaries. Preserve partial-success publication, previous snapshots, source success timestamps, history guards, the 720-second allowance, and the 90-minute production timeout.

The late pass is bounded, but can repeat an entire failed category. Runtime and full listing coverage must be verified before release.

## Verification record

- Probe tests: missing-module failure observed before implementation; six tests passed on local Python 3.14 and matched Python 3.12.
- Listing-validator tests: initial six cases failed before implementation, then passed. Seven cases now cover successful freshness, stale/missing metadata, empty/count mismatches, duplicate IDs, listing drops over 30%, and immutable input.
- Pipeline tests: three failing cases observed before implementation; five cases passed afterward, including one bounded recovery pass, ordering before shipping, unselected source handling, recovered exit status, and persistent total failure.
- Source-status/history tests: stale unselected source was observed in fresh history before the fix; all five cases passed afterward.
- Existing HTTP statistics: 8/8; alias/history folding: 41/41; history merge: 20/20; git history incident replay: 6/6 passed.
- Build passed its live data publishing guard; lint completed with one existing PriceChart hooks warning.
- Fresh code review found no material correctness issues. Runtime proof remains necessary.

## Live validation

- Baseline listing-only validation: [41864876960](https://github.com/TeoAmpatzis/gpu-prices-gr/actions/runs/41864876960), ref `674e80a`; all nine categories refreshed in 1,381 seconds.
- Recovery candidate listing-only validation: [41866245142](https://github.com/TeoAmpatzis/gpu-prices-gr/actions/runs/41866245142), ref `89945b7`; all nine refreshed in 1,353 seconds. GPU initially failed, then the late pass recovered 451 listings. History guard passed.
- Full production [41874128949](https://github.com/TeoAmpatzis/gpu-prices-gr/actions/runs/41874128949), data commit `e4041efc80200c50537376b8dc534cf44e21309b`: only five of nine Skroutz categories refreshed. GPU, CPU, case and storage retained stale data. History guard passed. A green process did not establish recovery.
- Consecutive scheduled recovery remains unverified.

## Transport follow-up

A real HTTP/1.1 keep-alive regression server permanently rejects its first TCP connection and accepts replacements. The released client repeated the blocked connection and failed. Setting fresh-connect alone recovered the immediate retry, but a later normal request reused the old blocked connection and consumed another wait.

Candidate `3c51089` sets native curl `MAXCONNECTS=1` and `FRESH_CONNECT=1` before retries. This evicts the challenged idle connection when opening its replacement, then reuses the healthy connection. The installed Session resets thread-local curl options after each request; the shared session options dictionary remains unchanged. Retry attempts, waits and aggregate allowance remain unchanged.

The native regression passed on Windows and GitHub Linux: three requests, two connections, one 20-second reserved wait, replacement reused. Existing HTTP statistics and source regression suites passed. Fresh review found no material production issue.

Read-only [connections diagnostic 41886685162](https://github.com/TeoAmpatzis/gpu-prices-gr/actions/runs/41886685162) compared released and candidate clients on first pages of the four stale categories. Each arm had an equal 90-second allowance and ordering alternated. It used 24 requests and 640 retry-wait seconds. All four released-client arms failed HTTP 403; the candidate recovered case (60 listings), but GPU, CPU and storage still failed. The gate failed, so the transport change was not promoted. Sequential requests still have time/order confounding: this was a smoke comparison, not isolated causal proof.

Diagnostic `fa79fee` added a hosted runner choice only to read-only probes. Windows probe [41888909215](https://github.com/TeoAmpatzis/gpu-prices-gr/actions/runs/41888909215) returned HTTP 403 challenges on all three spaced CPU requests. Pinned client/parser dependencies matched. Two follow-up local Windows requests at 18:39:27 and 18:40:08 returned HTTP 200 with 60 parsed CPU listings; Python patch versions differed, so this remains evidence for an environment boundary rather than isolated proof of its mechanism. Production remains on Ubuntu; no provider, paid service, credentials or permissions were added. The public repository's standard hosted runner was used. Probe unit tests passed 6/6 in the existing dependency environment.

One final normal-browser diagnostic `b5bbeb1`, [41889743968](https://github.com/TeoAmpatzis/gpu-prices-gr/actions/runs/41889743968), used the installed Playwright dependency and stock Chromium 153 on hosted Ubuntu. Its single read-only CPU navigation returned HTTP 403 and zero listing cards. It did not interact with challenges or persist browser state. This candidate was not promoted either.

**Access-path blocker at 18:43 UTC:** Hosted Ubuntu, hosted Windows and a stock hosted browser had not demonstrated usable CPU access, while local requests worked. More parser edits, larger retry budgets or green partial runs would not address that boundary. No local runner had been installed at this point. The approved resolution and subsequent validation are recorded below.

The rejected transport candidate also contained a manual repair input for failed categories. That input was not promoted and is not part of the released rebuild.

## Rebuild and approved local runner

- Owner approved the rebuild design and bounded changes of approach rather than repeating failed probes.
- Complete local baseline: all nine categories, 10,864 listings, 267 collection requests, zero blocked responses. The rewritten collector then completed another full read-only collection with identical category counts and zero blocked responses.
- Rebuild preserves normalizers, IDs, model keys and history. It validates native next-link markup and destinations, rejects incomplete/repeated/capped traversals, supports structured JSON-LD prices and always closes sessions. Snapshot acceptance rejects duplicate/invalid identities and unexplained drops over 30% while retaining previous source timestamps/history on failure.
- Offline verification: collector 25, source-status 7, validator 11, recovery 5, HTTP statistics 8, probes 6, aliases 41, specs 34, history merge 20 and git incident replay 6 passed: 163 checks total. The collector also passed all 25 tests under Python 3.12.16. Lint/build passed with the existing PriceChart warning.
- Fresh review found one equivalent-pagination-link issue; its regression failed before canonicalization and passed afterward. Runtime review corrected explicit Bash selection on Windows and documented offline queue impact. No material findings remained.
- Owner explicitly approved the repository-scoped PC runner proposal. Official runner 2.338.2 archive checksum was verified; `BuildDraftScrape` is running as a hidden process with a separate checkout and exact custom label. No service, startup task or power setting was changed. Approval is required for all external-contributor workflows; only trusted-main scheduled/manual production scraping routes to this runner.
- Exact publication Bash commands passed changed/unchanged disposable-repository tests under Python 3.12, including history preservation and data commit reporting. Production keeps its existing concurrency, latest-main checkout, rebase and data/history guards. A required nine-category Skroutz check now validates the exact published SHA and collection window.
- First full production run [41896086713](https://github.com/TeoAmpatzis/gpu-prices-gr/actions/runs/41896086713), code `ad60469`, succeeded. Published data commit `6a171b8da50d4b7f74770ac6b7c007eaf2fd6112` has all nine current successful Skroutz categories, 10,863 listings and zero validation errors. All 45 store/category pairs succeeded within the collection window. History preservation passed; the complete log contains zero blocked-response messages and no spec-error lines. Collection finished at 20:09:13 UTC; the job completed at 20:19:52 after cache upload.
- Scheduled run [41902862054](https://github.com/TeoAmpatzis/gpu-prices-gr/actions/runs/41902862054) subsequently failed because the PC slept. Windows records sleep at 2026-11-04 20:50:07 UTC and wake at 2026-11-05 05:48:41; GitHub's annotation reports lost runner communication. This is an availability failure, not evidence of a parser or HTTP-access regression. The abandoned job did not publish a replacement data commit. Runner connectivity recovered automatically after wake and no residual scraper process remained.
- Runtime follow-up `7db2e7d` removes the remote pip cache transfer from this persistent machine and enables unbuffered progress. The first cache upload took ten minutes and the subsequent restore nearly seven; native local pip/tool caches remain. Fresh review found no material issue. New normal run [41977104870](https://github.com/TeoAmpatzis/gpu-prices-gr/actions/runs/41977104870) started on November 5 after connectivity recovered; Python setup completed in the same second and pip took one second.
- Two consecutive scheduled full passes remain the sustained-recovery gate. A bounded read-only monitor is now running. It retains the failed scheduled run in its history, resets the pass streak on failure, stops after two consecutive failures or its 16-hour deadline, and only reports success after two consecutive actual passes. No extra scrape requests or messages are generated by this monitor.
