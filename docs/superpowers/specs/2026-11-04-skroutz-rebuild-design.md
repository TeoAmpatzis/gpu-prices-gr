# Skroutz rebuild: problems, options and pass gates

Status: owner approved the rebuild and subsequently approved the concrete PC runner proposal. Collector `743977b` and runtime `ad60469` are released. Full production data `6a171b8` passed all nine categories; two consecutive scheduled passes remain pending. The November 5 follow-up records a PC-sleep interruption separately from scraper correctness.

## Intent

Rebuild Skroutz collection around demonstrated access, complete category snapshots and truthful reporting. The owner asked to start again with problem identification, then solutions and a plan. Success means usable, current data in production, not only a green workflow.

The existing website remains local. Preserve other stores, normalized listing contracts, stable Skroutz IDs, model keys, compatibility facts and append-only history. Do not rebuild the whole application or discard working normalization and history handling.

## 1. Problems established by evidence

| Problem | Evidence | Consequence |
| --- | --- | --- |
| Hosted access is unreliable | Original run failed all nine categories with 403 challenges. First recovery production run refreshed only five of nine. | A parser rewrite cannot process product HTML that was never received. |
| Operating-system changes did not establish access | Hosted Windows CPU probes returned three 403s; follow-up local Windows requests returned 200 and parsed 60 listings. | Moving from hosted Linux to hosted Windows is not a demonstrated fix. |
| A normal hosted browser also failed | Chromium diagnostic returned 403 and zero listing cards. | Adding Playwright to production is not currently justified. |
| Retry/session changes are insufficient | Connection-replacement candidate recovered case only; GPU, CPU and storage remained blocked. | Do not promote it as the solution or increase retry volume without new evidence. |
| Workflow success does not mean Skroutz success | Production run 41874128949 was green while four Skroutz category snapshots remained unsuccessful. `scrape_category` intentionally reports whether any selected source succeeded. | A separate required-source gate must distinguish safe partial publication from complete Skroutz recovery. |
| Optional reads competed with listing retries | Shipping consumed 300 of 720 retry-wait seconds in the original failing run. | Keep released listing-first ordering and fresh-history filtering; a rewrite must not regress them. |

These observations support an execution/access boundary. They do not prove a permanent IP ban, rate limiting, a particular Cloudflare rule, or a parser regression. Some hosted full listing runs previously passed all nine, so the access failure is not universally reproducible.

Evidence and run links: `docs/superpowers/2026-11-04-skroutz-recovery-evidence.md`.

## 2. Additional correctness risks found in the current code

These are code-inspection findings to reproduce with fixtures, not demonstrated causes of the recent 403 incident.

- `fetch_category` can accept a page with zero parsed listings as a normal end. After earlier good pages this can publish a partial nonempty category as successful.
- Reaching `MAX_PAGES=80` with another page advertised returns accumulated listings without proving completion.
- A duplicate-only page with another page advertised is treated as completion. It may be the site's repeated-last-page behavior or a pagination failure; it is not proof of completeness by itself.
- Next-page detection depends on the exact text `<link rel="next"`; equivalent HTML attribute ordering can be missed. Pagination fixtures must cover equivalent markup and actual next-page URLs.
- Any nonempty source result currently earns `ok=true`. Completeness and suspicious coverage changes are not enforced at that production boundary.
- `fetch` does not explicitly close its session on success or failure.
- Existing fixtures must pin exact linked-variant prices, JSON-LD variations, valid category URLs, sponsored duplicates and all configured subcategory paths before replacing parsing code.

Existing safe behavior to preserve: fetch exceptions retain the previous source snapshot; failed-source success timestamps do not advance; stale retained listings do not become fresh history points.

## 3. Candidate solutions

| Option | What it can address | Limits / decision |
| --- | --- | --- |
| Authorized Skroutz feed or API | A supported access contract can remove dependence on challenged listing pages. | Availability, permission, category coverage, fields, quotas and cost are unverified. Investigate official documentation before assuming a consumer-price feed exists. Merchant APIs are not automatically suitable. |
| Collection on a trusted always-on machine/network | Local first-page access currently works. Keeps existing Python and publication contracts. | Must prove full pagination and repeatability. Machine must stay on and operational ownership must be agreed. Runner installation is a security decision; no runner is installed by this plan. |
| Existing GitHub-hosted collection | Least operational change; some earlier full runs worked. | Current Linux, Windows and browser probes do not demonstrate dependable access. Keep as a candidate only if matched tests regain repeatable access. |

Recommendation: first verify a full read-only local collection using the current network, while checking whether an authorized feed is actually available. Choose the simplest path that passes. Do not select a paid service, proxy, new credentials or new runner deployment without a concrete owner decision. Do not build several production transports speculatively.

## 4. Minimal target design

Keep Python, curl_cffi and selectolax if the chosen access path works with them. Replace only the Skroutz collector and any demonstrated production validation/reporting gaps.

Collection has four responsibilities:

1. Obtain a usable response through the validated access path. Classify network errors, HTTP rejection, challenge pages and usable product pages separately.
2. Parse a page using pure, fixture-tested extraction. Preserve `parse(html, scraped_at, cat)` behavior where possible and reuse `cat.make_listing` and stable `skroutz:<native_id>` identities.
3. Collect every configured path/page for one category into a staged snapshot. Deduplicate deterministically and establish an explicit completion reason. Close sessions even when a later page fails.
4. Accept or reject the category before publication. Preserve `fetch(cat) -> list` if that remains sufficient: return a complete accepted snapshot or raise a specific failure; do not add an abstraction just to wrap one implementation.

Retain previous category/source listings on blocked, malformed, incomplete or unreviewed suspicious results. Preserve last-success timestamps and history. Keep other stores independently publishable.

## 5. Ordered execution plan

### Phase A — Freeze the baseline and prove access

- [ ] Record current published source counts, listing IDs, last-success times and history checks at an exact main commit.
- [ ] Run a small matched first-page check for CPU, GPU, case and storage in the proposed collection environment. Use the same URLs/dependencies and record status, challenge indicator and parsed count; do not persist cookies or credentials.
- [ ] If access works, validate full listing pagination for all nine categories and every configured Skroutz subcategory path in a disposable staging checkout. No production writes or data push.
- [ ] Repeat the full validation in a separate collection window. Review counts and IDs against the baseline, not only HTTP 200 or a nonempty result.
- [ ] If access fails, stop that candidate and inspect the supported feed option or agree on a trusted execution environment. Do not repeat identical diagnostics indefinitely.

Deliverable: a demonstrated access path and named operational owner. No promise of a successful rewrite until this gate passes.

### Phase B — Rebuild and prove the collector offline

Likely ownership: `scraper/sources/skroutz.py`, new focused parser/pagination fixture tests under `scripts/checks/`, and sanitized fixtures there. Change `scraper/http_client.py` only for a reproduced shared-client defect.

- [ ] Write failing fixtures for a valid page, linked-variant price ranges, malformed JSON-LD, challenge HTML with HTTP 200, zero-card pages, sponsored duplicates and all supported category normalizers.
- [ ] Write failing pagination tests for equivalent next-link markup, relative/absolute next URLs, a later-page 403, repeated pages, advertised-next empty pages, maximum-page exhaustion and a failed later subcategory path. Accept next URLs only on the expected Skroutz host/category path; do not follow arbitrary extracted destinations.
- [ ] Rebuild extraction and collection at their owning layer. Preserve exact product IDs, URLs, price meaning and normalizer contracts.
- [ ] Make incomplete traversals fail the category. Treat ambiguous repeated-end behavior as incomplete unless an explicit tested completion check proves otherwise.
- [ ] Prove session cleanup, existing bounded retries and unchanged behavior for other sources.

Deliverable: fixture-tested complete-or-fail collection. Expected failures retain the previous snapshot.

### Phase C — Enforce publication and CI truth

Likely ownership: `scraper/main.py`, `scripts/checks/validate_skroutz.py`, their existing tests, and `.github/workflows/scrape.yml`.

- [ ] Reuse the existing validator and extend it only where completeness evidence requires it. Reject empty, duplicate-ID, count-mismatched, stale and incomplete results. A drop greater than 30% requires investigation; a smaller drop does not by itself prove completeness.
- [ ] Keep successfully fetched data from other stores publishable when Skroutz fails. Retain concurrency, latest-main checkout, rebase, history and data-drop guards.
- [ ] Add a required Skroutz verification outcome after safe publication: green only when all nine required categories succeeded in this invocation. Verify the exact published commit; later runs must not satisfy this run's gate.
- [ ] Test a partially successful run: other-store data publishes safely, failed Skroutz snapshots/timestamps remain unchanged, no false fresh history appears, and the Skroutz gate fails visibly.
- [ ] Emit a per-category summary with outcome, pages, coverage and last successful update. Do not replace meaningful failures with generic retry messages.

Deliverable: truthful CI without losing healthy source updates.

### Phase D — Validate and cut over

- [ ] Run offline collector, source-status, retry, validator, alias and history regression suites; run required lint/build checks.
- [ ] Obtain a fresh review of collection, publication safety and the selected execution setup.
- [ ] Run the new collector read-only against all nine categories in the intended production environment. Investigate coverage changes and confirm no history loss.
- [ ] Release only the reviewed scraper change. Do not deploy or push the local website branch.
- [ ] Verify one full production run and then two consecutive scheduled full runs, with actual published data and advancing source timestamps. A targeted repair alone is not a full-run acceptance result.
- [ ] Roll back collector/runtime changes if they regress data; retain diagnostics and previous safe snapshots. Never reset history or bypass guards to pass.

## 6. Definition of passing

All are required:

- All nine categories and their configured paths finish with valid, unique listings and verified traversal completion.
- Every required Skroutz source has `ok=true` and a success timestamp within that specific run's collection window.
- Counts match published listings; coverage is reviewed against the baseline, with no unexplained truncation or large drop.
- Failed/incomplete snapshots cannot be published as fresh; other stores keep working.
- History preservation and data publishing guards pass.
- First full production run and two consecutive scheduled full runs pass these same checks.
- The selected execution path has agreed cost, availability, credential handling and maintenance ownership.

No scraper can guarantee uninterrupted access to a third-party site. Passing means demonstrated collection plus safe and visible failure behavior.

## 7. Runtime decision and remaining operational gate

Owner approved the concrete repository-scoped runner on this PC after reviewing its separate checkout, current-account code-execution boundary, fork approvals and availability responsibility. The first full production run passed. A scheduled run then lost communication while the PC slept, confirming that an awake, connected machine is required. No service, startup task or power change was authorized or installed. If this machine cannot remain available, a dedicated always-on environment is a new operational decision; no alternate feed/API access is assumed.

Builder review found no material unanswered questions beyond the runtime decision, which was resolved by that subsequent explicit approval. Two consecutive scheduled full passes remain pending; source fallback and history safety do not depend on treating that gate as complete.
