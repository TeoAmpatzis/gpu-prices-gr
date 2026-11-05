# Skroutz scraping recovery plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for sequential investigation and implementation. Checkboxes track evidence and deliverables, not assumptions.

**Goal:** Restore fresh Skroutz listings in the scheduled GitHub scrape and prove recovery across consecutive scheduled runs.

**Architecture:** Diagnose with a small, read-only probe using the existing HTTP session and parser. Change only the layer demonstrated to fail: shared HTTP client, category parser, or execution environment. Validate candidate code without publishing data, then release the narrow scraper fix independently of ongoing v2 UI work.

**Tech stack:** Existing Python scraper, curl_cffi, selectolax, GitHub Actions, standard-library unittest.

**Spec:** The user requested a plan to solve the unresolved Skroutz scraping failure. The requirements and acceptance criteria below are the plan's self-contained design brief. The previous reporting-only work is recorded in `2026-11-04-skroutz-ci-status.md` and is not a scraping fix.

## Global constraints

- Planning only at this stage. No production code, workflow, infrastructure, push, or deployment changes during this planning task.
- Cost remains zero. Do not provision proxies, CAPTCHA services, or paid runners.
- Preserve cached listings, last successful timestamps, fresh-only history points, history merge protection, and the existing data publishing guard.
- Keep the existing 720-second shared retry allowance and 90-minute production timeout unless evidence justifies a separately reviewed change.
- Never commit or push locally scraped production data. Do not move the scheduled scrape onto the user's PC by default.
- Preserve other sources and their normal publication even when Skroutz fails. Reporting success is not evidence of scraping success.
- No new product-detail, shops_list, or price_graph probes. Initial diagnostics use only the existing CPU category's first page.
- Release scraper changes separately from v2 UI changes. No v2 deployment is authorized.

## What is known and what remains unknown

- Run `41789115948`: all nine Skroutz category scrapes failed with HTTP 403, `cf-mitigated=challenge`, and `server=cloudflare`. Retries used the full allowance.
- Previous run `41706919364`: eight of nine Skroutz category scrapes succeeded. Persistent platform-wide failure is not yet established.
- A local read-only CPU request returned HTTP 200 and 60 parsed listings. Both environments used curl_cffi 0.16.3.
- Python, OS, network, and observation time differed. A GitHub IP ban, a TLS fingerprint problem, and a parser regression have not been proven.
- Existing fallback behavior retained 10,858 previous listings in the failing run. Uncommitted reporting changes add warnings and source summaries but do not restore requests.
- `.github/workflows/scrape.yml` explicitly checks out `main`. Dispatching that workflow on a candidate branch does not test candidate scraper code.

## Review focus

1. HTTP 200 containing a challenge or zero parsed cards must not count as recovery.
2. Diagnostic workflow must check out the candidate ref, lack write permissions, and never execute the production data commit step.
3. A failed or partial category fetch must retain the previous complete source snapshot and exclude it from fresh history.
4. A successful probe must not be mistaken for sustained recovery under full listing traffic.
5. Candidate changes must not consume other hosts' retry allowance unexpectedly, regress their requests, or break bounded concurrent retry accounting.

## Task 1: Reproduce the failure with matched, bounded probes

**Files:** Create `scripts/checks/probe_skroutz.py`, `scripts/checks/test_probe_skroutz.py`, and `.github/workflows/skroutz-diagnostics.yml` during implementation.

**Interfaces:** `probe() -> dict` makes one CPU-category GET with `http_client.session()` and checks `http_client._block` before `sources.skroutz.parse`. The script prints one JSON result and exits nonzero for blocked, non-200, network-error, or empty-parser results. It writes no production data and performs no internal retries.

- [ ] Write failing tests with fake session responses: normal category HTML gives nonzero listings; HTTP 403 is blocked; a challenge with HTTP 200 is blocked; valid HTTP 200 with zero parsed listings is a distinct parser/markup failure; network timeout is a distinct request failure. Assert exactly one GET and no production file writes.
- [ ] Implement the probe using `https://www.skroutz.gr/c/32/cpu-epeksergastes.html`. Record UTC time, Python/OS/package versions, status, elapsed time, challenge classification, relevant Cloudflare headers, parsed count, and next-page flag. Never record cookies, authorization headers, tokens, or full response bodies.
- [ ] Add a manual-only diagnostic workflow with `contents: read`, no secrets, and no data commit step. Check out `${{ github.ref }}`. Use Python 3.12; use the observed curl_cffi 0.16.3 and selectolax 0.4.13 for this baseline experiment only. Keep the production requirements unchanged.
- [ ] Register the manual-dispatch workflow on the repository's default branch before attempting branch dispatch; a new branch-only workflow cannot be assumed dispatchable. Publish this as an isolated workflow-only change, excluding v2 UI and generated data. Check deployment behavior before any push; if registration would deploy protected v2 work, resolve that release conflict first.
- [ ] Use concurrency group `scrape`, `cancel-in-progress: false`, so probes do not overlap production traffic. A probe job has a 10-minute timeout.
- [ ] Run tests locally. On approval to execute/publish this diagnostic workflow, run three probes 30 seconds apart on each of two fresh GitHub runners in separate workflow runs, not an aggressive parallel matrix. Run three matching local probes near the same observation window. Match Python/dependency versions where available; explicitly record remaining OS/network differences.
- [ ] Collect all three per-run results even when a probe exits nonzero; aggregate failures only after the sample completes. Upload diagnostic evidence with `if: always()` so a first 403 or timeout does not hide later results or the artifact.
- [ ] Initial budget: at most nine category requests total across the three environments, no product-page requests. Save compact JSON evidence as an Actions artifact and a short evidence note under `docs/superpowers/`.

**Gate:** Name the observed failure boundary before editing production request behavior. If all environments work, no speculative HTTP change is justified; proceed to listing validation and scheduled observation. If evidence remains ambiguous after the nine requests, record the exact blocker instead of silently expanding the probe budget.

## Task 2: Apply the smallest fix supported by that evidence

**Potential files:** `scraper/http_client.py`, `scraper/sources/skroutz.py`, `scraper/requirements.txt`, or `.github/workflows/scrape.yml`. Edit only files owned by the demonstrated failure. Add regression cases in `scripts/checks/test_skroutz_recovery.py`.

**Interfaces:** Preserve `session()`, `get(session, url, **kwargs)`, `parse(html, scraped_at, cat)`, and `fetch(cat)` contracts. The exact patch is selected after Task 1; inventing it now would repeat the previous symptom-only fix.

| Evidence | Action | Required proof |
| --- | --- | --- |
| Matched probes and full listing validation pass on fresh GitHub runners | Keep existing request behavior. Treat the incident as intermittent and validate consecutive scheduled runs. | Real source timestamps advance; no silent fallback counted as recovery. |
| HTTP 200 is usable but parser returns zero or changed cards | Repair Skroutz parsing using a sanitized fixture. | Before/after fixture test; linked-variant prices and pagination still correct. |
| A reproducible client/version/session difference explains the failure | Test one supported client/dependency correction at a time in diagnostics, then apply it at its owning layer. | Same environment fails before and succeeds after; bounded retry and other-source tests stay green. |
| Fresh GitHub runners consistently get challenges while matched local requests work | Treat network/execution environment as the leading hypothesis, not a proven IP ban. Review supported Skroutz data access and a suitable trusted alternative execution environment. | A proposed replacement must pass the same probe and listing validation before any migration. |
| Both environments consistently get challenges | Investigate supported data access or a site-wide access change. Do not spend the retry budget hoping parser edits will help. | An authorized, working access path is demonstrated before scraper replacement. |

- [ ] Write a failing regression test for the selected mechanism before the production patch. Keep one variable per candidate. Rejected candidates are reverted.
- [ ] For a request-layer change, test challenge rejection, eventual recovery within existing waits, allowance exhaustion, and concurrent cap reservation. Include a non-Skroutz control to catch shared-client regressions.
- [ ] For a parser change, test normal cards, malformed/empty pages, JSON-LD linked-variant prices, and pagination without relying on live network assertions.
- [ ] Run the selected tests plus `test_source_status.py`, `test_http_stats.py`, `test_aliases.py`, `test_merge_history.py`, and `test_history_git.py`.

**Escalation gate:** An alternative runner, external feed, paid option, credentials, or a larger request budget requires a concrete proposal with costs and security/operations ownership. Do not install a self-hosted runner or introduce a new provider as an automatic fallback. If the existing free hosted runner cannot regain access and no approved supported route exists, report blocked recovery rather than claiming success.

## Task 3: Validate candidate code without publishing data

**Files:** Extend the diagnostic workflow with a manual listing-validation mode. Preserve its candidate-ref checkout, read-only permissions, and shared production concurrency group.

- [ ] Give listing validation a separate job with a 90-minute timeout; do not inherit the 10-minute probe timeout. Always upload its diagnostic results, including on failure.
- [ ] Add a workflow configuration check that asserts candidate checkout uses `${{ github.ref }}`, permissions are read-only, and no `git push` or data commit step is present.
- [ ] After probes pass, run `python scraper/main.py --only skroutz --no-shipping --specs-budget 0 --makers-budget 0` on the candidate ref in the ephemeral runner checkout. This validates normal listing pagination across all nine categories without adding enrichment reads or publishing data.
- [ ] Compare before/after source metadata and source listing IDs/counts. Require `sources.skroutz.ok == true` and a last-success timestamp from this run for all nine categories. Investigate material count drops before accepting success, including suspiciously truncated nonempty results. A zero HTTP-block count alone is insufficient.
- [ ] Verify retained snapshots and old timestamps remain unchanged if a source fails. Regression tests must prove those retained entries do not generate fresh history points.
- [ ] Run `python scraper/merge_history.py check <checked-out-base-sha>` against the ephemeral changes. Do not use `--allow-shrink` to pass this recovery validation.
- [ ] Keep this run's results as diagnostics only. Do not copy generated JSON back from the PC or runner into a developer commit.

## Task 4: Release and prove sustained scheduled recovery

**Files:** Only the proven scraper fix, relevant tests/workflow, and previously reviewed reporting changes. No UI changes or local data snapshots.

- [ ] Review the exact diff against current `origin/main` in isolation. Confirm the full production path still uses the existing history concurrency/merge guards and latest-main checkout.
- [ ] Run required build and lint checks; obtain a fresh code review. Prepare a narrow commit/PR with the failed-before/passed-after evidence and any material limits.
- [ ] Once release is authorized, merge the fix into `main`. Branch-only diagnostics cannot repair the scheduled workflow because it checks out `main`.
- [ ] Validate the first normal full production scrape, including other sources, shipping/spec enrichment, data commit, and history guard. Keep the publishing drop guard enabled. If this would deploy protected v2 work, stop and resolve that release conflict first.
- [ ] Observe two consecutive scheduled runs, approximately six hours apart; verify nine fresh Skroutz categories in each. The comparison uses actual source success timestamps, not the overall run's green icon or category timestamp.
- [ ] If a regression appears, revert only the recovery patch and retain source warnings and previous data. Do not reset production history or bypass the merge guard.

## Definition of solved

All nine Skroutz categories succeed in the production workflow and in two consecutive scheduled runs; source timestamps advance; listing coverage passes review; other sources still publish; history and data publishing guards pass. Logs and source summaries make any later fallback explicit. A local 200 response, a successful probe, a green job with stale data, or added warnings alone does not meet this definition.

## Plan status

The initial transport-focused approach is superseded by the approved rebuild plan `2026-11-04-skroutz-rebuild.md`. Its first full production run published nine successful Skroutz categories in `6a171b8`, with history preserved and no validation errors. A subsequent scheduled run was abandoned when this PC slept; two consecutive scheduled full passes remain pending. The execution entries below preserve the investigation chronology and are not instructions to repeat rejected experiments.

Fresh builder review found two execution gaps: probe failures could stop sampling/artifact upload, and listing validation needed a separate 90-minute timeout. Both are addressed above. No other material gaps were reported.

## Execution record (2026-11-04)

- Implementation authorized by owner. Recovery worktree: `C:/Users/Teo/Desktop/PROJECTS/BuildDraft-skroutz-recovery`; current website stays local on `design/claude-v2`.
- Initial nine read-only probes completed: local 200/200/200; first runner 403/200/403; second runner 200/200/403. Every 200 response parsed 60 CPU listings. Dependency versions matched; Python patch/OS/network differences recorded. No IP-ban or parser regression established.
- Original failing production log proved shipping consumed 300 of the 720 retry seconds before later category fetches. Candidate prioritizes all listings, then one late fresh-session pass only over failed Skroutz categories, then shipping. The shared retry allowance and production timeout are unchanged. Targeted history includes only sources fetched successfully in that invocation.
- Baseline listing-only run `41864876960` (`674e80a`) refreshed all nine categories in 1,381 seconds. Candidate run `41866245142` (`89945b7`) refreshed all nine in 1,353 seconds; GPU failed initially and recovered 451 listings on the late pass. Candidate history guard reported nothing lost.
- Candidate reviewed and published to `main` as `89945b7`. No website source, Vercel configuration or locally scraped production data was included. Normal production run `41874128949`, created 17:05:40 UTC, is in progress. Its committed data and subsequent scheduled runs still need verification.
- Source regression suites passed: probes 6, validator 7, recovery ordering 5, source/history status 5, HTTP statistics 8, aliases 41, history merge 20, git incident replay 6. Main build/lint passed. Main's full unit suite has three existing live-inventory-dependent Terra failures; identical failures were reproduced on unchanged `674e80a` before release.
- Owner next requested completing the website locally for review, with no v2 deployment. Root checkout merged released `origin/main` normally to refresh its code/data, preserving all UI changes. Earlier reporting-only edits were backed up in a named stash; do not reapply that stale stash over the newer released scraper.
- Local readiness fixes: real-route health checker reuses maintained Playwright suites and retains strict freshness limits; stale lint suppression removed; valid `public/robots.txt`; actual 44px range targets with 18px visible knobs; Terra manufacturer tests use a stable fixture rather than permanent stock assumptions. No production compatibility tables or raw data edited.
- Website checks: typecheck/lint/build and all 1,499 unit tests passed after the merge and fixes. Original full 258-browser suite passed; two new range tests passed after rebuild, including transparent-target dragging, keyboard synchronization and mobile bounds. A full 260-test final run remains planned after the production data refresh.
- Health checker: 12 native tests passed; real route/photo run passed 71 browser checks and correctly failed stale local data. A disposable localhost proxy deliberately broke `/gpu`; the checker detected the missing products and returned nonzero. Proxy stopped; preview on `http://127.0.0.1:4173/` remains available (exec session 38297).
- Post-fix three-run Lighthouse medians, mobile/desktop: home 99/100, case 89/100, product 95/100, builder 98/100. Accessibility, best practices and SEO all 100 across those measured routes/profiles. Largest category list is ~265 KiB gzip; category JS ~100 KiB gzip. Preview DOES compress assets; the mobile category score is a real remaining performance limit. Raw reports: `test-results/local-completion/perf-fixed/`.
- Browser UI host unavailable; automated browser tests and generated screenshots provided inspection evidence. No v2 branch push or deployment occurred.
- Remaining: verify normal production commit has nine fresh Skroutz sources and intact history; merge that remote data locally; run final local full checks, health and 260 browser tests; record owner-review handoff; observe two subsequent scheduled scrapes. Do not claim those future checks are already complete.

### Follow-up after the first production run

- Production run `41874128949` completed and published `e4041efc80200c50537376b8dc534cf44e21309b`. Only ram, psu, mobo, fan and cooler refreshed successfully. GPU, CPU, case and storage retained old Skroutz data. The history guard passed. Overall job success did not establish source recovery.
- Targeted exit-status fix `b6c234f` was released; its source-status suite now passes six cases.
- Follow-up candidate `3c51089` replaces a challenged pooled connection before retries using native curl options, while retaining the existing attempts and 720-second allowance. A real keep-alive server regression failed with the old client and with fresh-connect alone, then passed with connection-cache eviction and replacement reuse. The final regression passed on Windows and GitHub Linux.
- Read-only diagnostic `41886685162` compares released and candidate clients across the four stale category first pages. Balanced ordering and equal per-arm allowances bound the comparison, but it remains a smoke check, not isolated causal proof. Its result is pending.
- The candidate also adds an explicit manual `recover_skroutz` input. It selects only failed Skroutz categories from current main data and skips shipping, specs and maker reads, preserving the existing commit, concurrency and history guards.
- Local root merged `e4041ef` normally. Typecheck, lint, build and 1,499 tests passed again. The combined browser suite now contains 261 tests, including localized slider labels, and is running against that data. Strict source freshness remains blocked on the four stale categories.
- Connections diagnostic `41886685162` failed its gate: candidate recovered case only, while GPU, CPU and storage remained HTTP 403. Released control failed all four. Total 24 requests and 640 retry-wait seconds. No transport promotion occurred.
- Ruling: investigate the environment boundary with three read-only CPU probes on GitHub hosted Windows before any runner migration. The public repository uses the standard included hosted runner; production remains Ubuntu, with no new credentials/provider/permissions. Diagnostic-only commit `fa79fee`, run `41888909215`; unit probes 6/6 passed in the existing virtual environment. Production runner replacement still requires validation and a concrete operations decision.
- Refreshed-data full browser run: 258 passed, three failed. Two failures came from the now-absent Terra build scenario; reviewed local commit `c283544` uses stocked Era 2 with the same curated SFX/SFX-L-only constraint, retaining all assertions. Both scenarios then passed. The remaining mobile home delayed-feed test detected a 152px geometry shift and is under investigation; its threshold was not relaxed.
- Windows hosted probe `41888909215` returned 403 on all three spaced CPU requests. Two follow-up local requests returned 200 with 60 parsed listings. Diagnostic `b5bbeb1` then tested one ordinary Chromium category navigation on hosted Ubuntu; run `41889743968` also returned 403 and zero cards. No challenge interaction, persisted browser state or production change occurred.
- Access-path decision pending owner input: identify a trusted always-on machine or authorized feed/API before runner setup or a new integration. No self-hosted runner was installed, no locally scraped production data was published, and the scheduled monitor remains unlaunched. The transport candidate was not promoted.
- Mobile homepage root cause: the bounded five-row feed needed 572px at 360px width; loading reserved 420px. Local reviewed commit `2e4861a` changes the shared mobile loading/populated/empty reserve to 600px, reducing measured shift to zero. All ten home browser tests passed after reproducing RED. Build/lint passed; full 261-test browser rerun is in progress.
