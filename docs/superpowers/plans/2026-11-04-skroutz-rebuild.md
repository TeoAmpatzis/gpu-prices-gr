# Skroutz Rebuild Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. Owner approved the design and continuous execution. Change approaches when evidence shows negligible improvement; do not repeat failed probes indefinitely.

**Goal:** Publish complete, current Skroutz snapshots across nine categories, with safe fallback and truthful CI.

**Architecture:** First prove a usable access environment through read-only collection. Rebuild only Skroutz page parsing and complete-or-fail traversal, preserving normalized listing identities and history. Reuse the existing validator for publication and CI gates; choose deployment only after the access evidence supports it.

**Tech stack:** Existing Python, curl_cffi, selectolax, unittest and GitHub Actions. No paid provider or new credentials assumed.

**Spec:** `docs/superpowers/specs/2026-11-04-skroutz-rebuild-design.md`

## Global constraints

- Website stays local; no website push/deployment.
- Existing snapshot/history guards, source identities and other stores remain intact.
- Keep the 720-second retry-wait cap and 90-minute production timeout.
- No runner installation, external integration or local production-data publication without the required concrete access/runtime decision.
- Never mark retained or incomplete source data fresh.

## Review focus

1. Later-page failures after valid data must reject that category (Task 2).
2. Equivalent pagination HTML, unexpected destinations and cycles must not cause truncation or arbitrary navigation (Task 2).
3. Real linked-variant prices and normalizer-filtered pages must retain their meaning (Task 2).
4. Partial publication must preserve failed-source history/timestamps and leave a failed required-source outcome (Task 3).
5. A later run's commit/timestamp must never satisfy an earlier run's acceptance gate (Tasks 3–4).

## Task 1 — Prove the collection environment

- [ ] Record exact baseline commit, counts, IDs and source timestamps in ignored diagnostic output.
- [ ] Run CPU/GPU/case/storage first-page probes locally with the released client. One attempt per category, spaced 30 seconds. Stop that candidate if access is not usable; no identical repeated batch.
- [ ] If all pass, run read-only full collection for all categories; compare counts/IDs and record per-page completion evidence. No generated listings go into production files.
- [ ] Stop the full candidate after two category failures; investigate their failure class before choosing a different method.
- [ ] Repeat a passing full collection in a separate window before accepting runtime suitability.
- [ ] Consult official Skroutz API documentation. Distinguish merchant-write APIs from an authorized read-price feed; do not invent access.

Output: evidence for runtime selection, or a specific access blocker. Parser safety work can proceed offline while a runtime decision remains pending.

## Task 2 — Complete-or-fail Skroutz collector

**Files:** `scraper/sources/skroutz.py`; `scripts/checks/test_skroutz_collector.py`; sanitized fixtures only as needed.

**Interface:** Preserve `parse(html, scraped_at, cat) -> (listings, has_next)` and `fetch(cat) -> list`; add a focused internal pagination helper only where needed. Incomplete collection raises, allowing existing main fallback.

- [ ] Write RED tests for exact variant prices, JSON-LD variants/malformed data, challenge/empty pages, next-link attribute ordering, invalid/off-host/other-category next URLs, duplicates, cycles, cap exhaustion, later-page/subpath failure and session cleanup.
- [ ] Run `python scripts/checks/test_skroutz_collector.py`; inspect intended failures.
- [ ] Implement robust native HTML extraction and same-host/category pagination validation. Honor actual next URLs; reject ambiguous incomplete traversals. Keep lowest-priced sponsored duplicates.
- [ ] Preserve normalization, ID/URL/price contracts. Distinguish raw product cards from normalized listings so a fully filtered page is not mistaken for a network failure or end marker.
- [ ] Run collector tests plus probe/source-status/HTTP/validator/history suites; obtain focused review and commit.

## Task 3 — Production acceptance and truthful CI

**Files:** `scraper/main.py`; `scripts/checks/validate_skroutz.py`; existing tests; `.github/workflows/scrape.yml`.

- [ ] Write RED regressions for rejected suspicious snapshots, partial-success publication, retained-source timestamps/history and required-source outcome.
- [ ] Reuse source validation at the responsible acceptance boundary. Enforce unique IDs, counts, completeness and reviewed coverage without contaminating other-source updates.
- [ ] Add a required Skroutz gate after safe publication. Pin checks to the exact commit and this run's time window, including an upper bound. Gate failure must not prevent safe other-store publication.
- [ ] Verify no-history-loss, concurrency and latest-main rebase guards remain mandatory.
- [ ] Run source/validator/recovery/HTTP/alias/history tests and required lint/build checks; review and commit.

## Task 4 — Runtime decision, cutover and sustained verification

- [ ] Present demonstrated runtime choice, cost, machine availability and credential/code-execution boundary. Obtain any required setup decision before installation or publication.
- [ ] Validate new collector read-only in that intended production environment across all configured paths, with reviewed count/ID differences.
- [ ] Release only the reviewed scraper changes; retain rollback to the previous collector and all diagnostics.
- [ ] Verify one full production scrape and two consecutive scheduled full scrapes using actual published source metadata, coverage and history logs. Never substitute a targeted repair for this gate.
- [ ] Sync verified remote data into the local website through the existing normal merge path, then finish its previously outstanding browser/health checks.

## Execution ledger

- Owner authorized design and requested bounded exploration of alternatives.
- Isolated branch `fix/skroutz-rebuild`, baseline `e4041ef`. Prior experiment branch is preserved and not promoted.
- Manual sibling worktree was created before discovering a native worktree tool. Reuse this verified isolated checkout rather than creating a duplicate; website remains untouched.
- Baseline checks passed: probes 6, source-status 6, validator 7.
- Local baseline full read-only validation passed all nine categories: 10,864 listings, 267 collection requests, zero blocked requests; 18:54:33–19:06:18 UTC including four spaced preliminary probes. No production data files were modified.
- Collector regression: 18 initial tests exposed extraction/pagination/cleanup failures; implementation passed. Additional snapshot and coverage tests reproduced duplicate/large-drop publication before the guard, then passed. Current collector suite 25 tests, source-status 7, validator 11.
- Validator RED reproduced acceptance of a later-run timestamp, missing-ID exception and absence of exact-commit reads. GREEN proves bounded collection-window checks, invalid identity rejection and committed data pinning despite modified working files.
- Fresh whole-change reviewer found equivalent head/body pagination hrefs incorrectly counted as ambiguous. Fixed with canonical destination comparison; dedicated regression observed RED then GREEN. No other material findings.
- Existing probe 6, HTTP stats 8, recovery 5, aliases 41, specs 34, history merge 20 and git history replay 6 passed. Lint/build passed with the existing PriceChart warning. YAML parsed successfully.
- Rewritten collector full read-only validation is running, with completion checks and the same unchanged HTTP transport. Results go to ignored `scraper/debug/rebuild/candidate-validation.json`.
- Official docs checked: Products API is for merchant inventory updates; the 2019 official external-access response declined new access. No usable authorized price feed was established, and no integration/account was created.
- Runtime proposal prepared in `docs/superpowers/specs/2026-11-04-skroutz-runtime-proposal.md`. Repository currently has zero self-hosted runners; external workflow approval currently covers first-time contributors only. No runner/security setting change performed.
- Rewritten full read-only collection passed all nine categories at 19:18:12 UTC: 10,864 listings, 267 requests, zero blocked. Per-category counts exactly matched the earlier local baseline. All configured cooler/storage subpaths completed under the new strict traversal rules.
- Collector 25/25 also passed on Python 3.12.16; a matched Python 3.12 first-page request returned 200 and 60 listings. The exact workflow publication Bash script passed changed/unchanged cases against a disposable bare repository using Python 3.12, including history preservation and exact data SHA outputs.
- Owner explicitly approved the concrete PC runner setup through the runtime proposal question. Registered repository-scoped `BuildDraftScrape`, exact custom label `builddraft-scrape`, official version 2.338.2 archive verified against release SHA256 `a1f17aa987fc8158bc7521d284912267a0d01b7c2c4684b33c86783b5e8221cc`. Runner is online as a hidden manually started process; no service/startup/power change. Fork-workflow approval was changed to all external contributors and read back successfully.
- Runtime review found Windows default-shell and offline-queue risks. Proposal corrected to require explicit Bash, disclose shared-concurrency queue impact, and document cancellation/restart/rollback ownership. Workflow runtime diff uses exact labels plus trusted-main scheduled/manual guard and explicit Bash. First full production run and scheduled verification remain pending.
