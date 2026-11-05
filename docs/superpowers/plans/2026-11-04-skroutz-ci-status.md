# Skroutz CI source status implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make retained, stale source data visible in GitHub Actions without compromising successful sources or history.

**Architecture:** Keep source status ownership in `scraper/main.py`. After a category is persisted, report the attempted sources to GitHub warning annotations and the step summary. Use the existing `sources_meta` values; do not infer success from category timestamps.

**Tech stack:** Python standard library, existing scraper, GitHub Actions workflow commands.

**Spec:** Owner approved the investigation and fix scope in chat: compare local and GitHub responses, preserve cached data, and expose degraded source status in CI.

## Constraints

- No paid services, request fingerprint changes, extra retries, production data edits, or deployment.
- Preserve existing retry cap, source fallback, successful timestamps, fresh-only history, and partial-success exit status.
- Report only sources attempted during this invocation, including an empty result as failure.
- Local runs emit no GitHub workflow commands. Summary output is append-only when GitHub provides `GITHUB_STEP_SUMMARY`.

## Evidence

- GitHub run 41789115948: all nine Skroutz categories failed with HTTP 403, `cf-mitigated=challenge`, `server=cloudflare`. Existing retry waiting reached 720 seconds. Other sources succeeded, keeping CI green.
- Prior run 41706919364: eight of nine Skroutz categories succeeded.
- Local read-only CPU request: HTTP 200, 60 parsed listings. Both environments used curl_cffi 0.16.3. Python/platform and observation time differ, so an exact IP-based root cause is not proven.
- Scraper source/workflow code matches fetched origin/main. No parser or dependency regression demonstrated.

## Review focus

Failed and empty sources must retain old listings and timestamps, never contribute stale points to history, and never appear successful in the summary. Unselected sources must not generate warnings. No-data failures must say the last success is unknown. Multiple categories must append rather than overwrite the summary. Escape workflow-command data.

## Task 1: Report attempted source status

**Files:** `scraper/main.py`, `scripts/checks/test_source_status.py`.

- [x] Write and run regression tests for failed/empty source fallback, fresh-only history, a healthy source, unselected sources, missing prior data, append-only summaries, and annotation escaping.
- [x] Add `report_sources(category: str, sources: dict[str, dict], attempted: list[str]) -> None` in `main.py`. Emit one warning per failed attempted source when `GITHUB_ACTIONS=true`; include retained count and last successful timestamp. Append a per-category table to the provided step summary. Call after writing category data/history.
- [x] Run the new tests and existing HTTP, aliases, and history regression checks.

## Task 2: Verify and document

**Files:** `scripts/checks/README.md`, this plan.

- [x] Document the check command and tested invariants.
- [x] Run repository build and lint, inspect the complete diff, and obtain a fresh review.
- [x] Record results and remaining limitation: reporting does not remove Cloudflare blocking. No live GitHub validation is claimed until the branch is run there.

## Execution record

- Baseline: HTTP counting 8/8 and aliases/history fold 41/41 passed.
- Ruling: implement in an isolated branch from the current checkout because the owner has ongoing v2 UI work; scraper files match origin/main. No shared branch push or deployment.

- Verification: source-status tests 4/4 (exception and empty-result subcases), HTTP stats 8/8, aliases/history fold 41/41, history merge 20/20, and git history replay 6/6 passed.
- Build passed, including the live data publishing guard. Lint passed with one existing `PriceChart.tsx:70` hooks warning.
- New regression tests were observed failing for missing reporting before implementation, then passing afterward. Fresh review is recorded below.
- At initial reporting-task completion, annotations had not yet run on GitHub and Cloudflare access was unresolved. Subsequent released runs exercised that reporting. The later rebuild and approved local-runner setup achieved a full nine-category production pass in `6a171b8`; see `docs/superpowers/2026-11-04-skroutz-recovery-evidence.md`. Two consecutive scheduled passes remain pending after a PC-sleep interruption.
- Fresh Cavecrew review: no issues. Verified patch applied to the original checkout after checking destination files were unchanged.
