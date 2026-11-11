# Monitor Quality Detailed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Complete each task's failing test, implementation, verification and local review before starting its dependent task.

**Goal:** Remove non-PC monitors from every published monitor surface, correct the observed parser defects, and supply working product photos through the existing pipeline.

**Architecture:** Make one admission decision in the Python monitor normalizer and apply it before settlement to both fresh and retained rows. Keep normalization, source-status handling, history, aliases, photo generation and frontend rendering in their existing owners. Use current JSON fields and the existing model-photo pipeline; add no service, dependency or application configuration.

**Tech Stack:** Python/unittest, React 18/TypeScript/Vite, Vitest, Playwright, existing GitHub Actions, GitHub Pages image repository and Vercel.

**Spec:** [Monitor quality scope and product policy](2026-11-10-monitor-quality-fixes.md). The user approved preparing this detailed implementation plan. No product code, workflow, publishing or production-data action has been performed.

## Global constraints

- Include genuine desktop, gaming, workstation, portable external, touch and smart PC monitors. Missing specs or photos alone are not grounds for exclusion.
- Exclude accessories, internal case/status screens, replacement panels, video walls, signage, CCTV-only, kiosk/open-frame/POS and broadcast-only displays, TVs, all-in-one PCs and used/refurbished products.
- Do not reject entire brands or generic words such as screen, portable, USB-C, smart, touch, hub, webcam or stand.
- Cost remains 0. No new dependency, no schema additions, no new Skroutz product-page reads or request-budget increases.
- Greek and English; dark theme; 1440 px desktop and 360 px mobile. Keep the other nine categories and builder behaviour unchanged.
- Never push price data generated on this PC. Replays and photo experiments use temporary copies; production data comes from the existing workflows.
- Preserve timestamps, source failure status, historical price points, valid old links and strict no-false-merge identity rules.
- Work from current remote main at execution time. Never base this work on the divergent local main. Preserve `UNIVERSITY_PROJECT_PRESENTATION_GUIDE.md` and other unrelated changes.
- Local commits require build, lint and unit checks. Pushes, workflow starts/retries, destructive changes and deployment follow existing repository authorization rules; a plan is not authorization for those actions.
- Do not run a production scrape to make a local test pass. Do not relax coverage, history or >30% drop guards.

## Refinements from the outline

1. ELO 2495L is itself an excluded open-frame product. Fix its parser regression, but do not create a public alias or preserve a selectable offer for it.
2. Alias tooling changes are conditional on a proven rename of an **accepted** monitor. Skip that code if no accepted identity changes.
3. Stored snapshots lack the original Skroutz list-spec text. A title-only replay cannot prove complete ingestion equivalence. Preserve this limitation in reports and verify disputed values with saved list-card fixtures or the next scheduled collection.
4. A fixture-based browser test proves rendering, not that a live photo exists. Both deterministic tests and actual post-publication image requests are required.
5. The existing Lighthouse runner does not enumerate monitors. A command filtering it to `monitor` would measure nothing; Task 8 gives a real measurement path.

## Review focus

| Failure mode | Expected behaviour | Owning task |
| --- | --- | --- |
| Accessory advertised as a monitor, without a generic reject word | Reject verified ES916/US88v1 products, retain genuine monitors from the same manufacturer | 1 |
| Failed/unselected source supplies an old accessory with `reject=None` | Exclude it without making its source fresh or adding a fresh history point | 2 |
| Model suffix resembles a size; page evidence and title disagree | Never read AW03 as 3 inches; keep trustworthy observations and existing conflict rules | 3 |
| Removed record or accepted rename affects old compare links and history | No empty aliases, wrong redirects, accidental history loss or selectable removed offer | 4, 7 |
| Photo index/image fails, or the first image release is incomplete | Render safe fallback; do not claim photo release complete below the coverage target | 5, 7, 9 |

## File map and ownership

| File | Planned responsibility |
| --- | --- |
| `scraper/normalize_monitor.py` | Admission, title token parsing, retained-row recheck; no network I/O |
| `scripts/checks/fixtures/monitor-quality.json` (new) | Small, reviewed corpus of real titles, evidence URLs and expected decisions/fields |
| `scripts/checks/test_normalize_monitor.py` | Extend current `ParseTests`, `NotAMonitorTests`, `SettleTests`, `StageTests`, `DataSizeTests` |
| `scripts/checks/test_source_status.py` | Failure/unselected-source integration using existing mocked `scrape_category` pattern |
| `scraper/main.py` | Change only if integration tests expose a staging/status issue; keep source collection generic |
| `scripts/checks/monitor_admission.py` and `test_monitor_admission.py` (new) | Read-only accepted-snapshot policy check and its CLI tests |
| `scripts/checks/renormalize_diff.py` | Monitor-aware offline report, preserving current category callers |
| `scripts/checks/refresh_aliases.py`, `test_refresh_aliases.py`, `scraper/model_aliases.json` | Conditional accepted-product alias correction only |
| `scraper/categories.py` | Enable existing monitor image capability |
| `scripts/checks/test_monitor_images.py` (new) | Candidate extraction, generator discovery and WebP output checks with no live downloads |
| `tests/unit/monitorQuality.test.ts` (new) | Accepted-fixture derivation/photo-map contract using existing pure helpers |
| `tests/e2e/monitor-quality.spec.ts` (new) | Deterministic catalogue/product/search/compare regression flows |
| `tests/e2e/monitor.spec.ts` | Keep existing real-data monitor smoke tests; add only assertions that belong there |
| `scripts/phase3/monitor-gates.mts` and `scripts/checks/README.md` | Keep coverage/size checks; document Python admission check as the policy authority |

Inspect callers before each implementation. `src/components/ProductPhoto.tsx`, `src/lib/images.ts`, `vite-plugin-data.ts`, source collectors and workflows are reuse points, not scheduled refactors. Change them only for a reproduced defect necessary to satisfy this plan.

## Task 0: Establish a reproducible baseline

**Files:** No product changes. Save evidence outside tracked data; use the existing worktree workflow when execution starts.

- [ ] Read current project instructions and inspect branch/status/remotes. Fetch current remote refs and record the exact base SHA; create an isolated implementation worktree from `origin/main` without altering the current checkout's untracked files.
- [ ] Save baseline monitor `latest.json`, `specs.json`, `rejected.json`, `history.json` and alias file from that exact revision. Treat absent imported-history/image-candidate files as absent; do not manufacture production files.
- [ ] Run `npm run check` once on that base. Record pre-existing failures separately. Run `venv/Scripts/python.exe scripts/checks/test_normalize_monitor.py` and `venv/Scripts/python.exe scripts/checks/test_source_status.py`.
- [ ] Reproduce cheapest-first and known unwanted products with Playwright. Record deployment/list `builtAt`, row count, product IDs and screenshots; prices in the audit are observations, not test constants for live data.
- [ ] Record baseline model/listing counts by source, accepted model keys, history points and image coverage. Keep the nine other categories' source inputs and derived outputs for a frozen-input comparison later.

**Pass:** Known failures are reproducible, inputs are tied to one revision, and no production data has changed. If the baseline cannot run, resolve environment problems before attributing failures to this work.

## Task 1: One PC-monitor admission policy

**Files:** `scraper/normalize_monitor.py`, `scripts/checks/test_normalize_monitor.py`, new fixture corpus.

**Interface:** Add `rejection_reason(title: str, specs: str = "", size: float | None = None) -> str | None`. It is pure, uses existing cleaning/accent handling and existing reasons (`not-monitor`, `used`, `bundle`), and is called by `parse()`. Preserve `parse(title, specs) -> Parsed` and `make_listing(...)` signatures.

- [ ] Create the fixture corpus with fields `id`, `source`, `title`, `evidenceUrl`, `expectedReject` and optional expected parse fields. Store real text, not transliterated approximations. Tests must not depend on the temporary audit directory.
- [ ] Add `NotAMonitorTests.test_quality_corpus_rejects_non_pc_displays`. Cover ES916, both US88v1 colour listings, VM46B-U, SX-19G CCTV, ELO 2295L/2495L, verified POS/broadcast examples, chargers, protectors, replacement panels, stands and cables. Verify purpose evidence before labeling additional examples negative.
- [ ] Add `test_quality_corpus_keeps_complete_pc_monitors`: desktop, gaming, 57-inch PC ultrawide, portable USB-C, touch/smart PC monitors, monitor with no stand, monitor with hub/webcam and current positive controls. An unknown spec must not trigger rejection.
- [ ] Add exact-brand/model boundary controls: a verified accessory exclusion must not match a longer/different model number or every product from that manufacturer. Keep the known `Dell without stand` / Apple mount-adapter cases positive.
- [ ] Run the focused class and confirm new failures:

```powershell
rtk run venv/Scripts/python.exe scripts/checks/test_normalize_monitor.py NotAMonitorTests
```

- [ ] Implement the helper by extending current rejection logic with purpose-specific terms and a small set of evidence-backed brand/model matches where the shop title is misleading. Do not add a classifier framework, brand allowlist or size cutoff to hide accessories. Keep explanatory source URLs next to exact-product exceptions.
- [ ] Run the entire normalizer suite, including matching/barcode and false-merge tests. After the common commit gate below, commit locally as `fix(monitor): reject non-PC displays`.

**Pass:** Every reviewed negative is rejected and every positive remains eligible. Unknown identity continues through existing identity rules; admission does not invent a model.

## Task 2: Apply policy to retained data before any grouping

**Files:** `scraper/normalize_monitor.py`; existing normalizer staging tests and source-status integration tests; `scraper/main.py` only if needed by these tests.

**Consumes:** Task 1's `rejection_reason`.

**Produces:** Same `settle(listings: list[dict]) -> None` signature. A forbidden retained row has `reject="not-monitor"` and `chip=""` before `stage()` removes it. Title-only replay does not overwrite its other stored observations.

- [ ] Add `SettleTests.test_retained_accessory_is_rejected_under_current_policy`. Construct an old charger and old ES916 with `reject=None` and a populated chip; do not construct them through the already-fixed parser. Assert both are rejected and ungrouped.
- [ ] Add `test_retained_valid_fields_survive_policy_recheck`: preserve valid `hz`, `height`, page observations, GTIN, `scrapedAt`, merchant/shipping and price. Assert two settlements equal one and a rejected row cannot be revived by barcode placement.
- [ ] Extend `StageTests` for an old accessory plus retained earlier rejects. Assert each unwanted row is absent from kept listings and present once with its reason; do not drop unrelated prior rejected records for failed/unselected sources.
- [ ] Add a `test_source_status.py` integration using a temporary `DATA_DIR`, real monitor category/settlement and mocked source results. Simulate both a failed source and `--only` excluding that source. Assert old valid monitor kept, accessory excluded, old timestamp/failure semantics preserved, successful-source count equals kept fresh rows, and only successful fresh accepted rows reach `write_history`.
- [ ] Confirm these tests fail first. Then call the shared policy during settlement before constructing `_of`/group input. Preserve non-transient rejection reasons; keep existing reset behaviour for `no-identity` and `ambiguous` only.
- [ ] Reuse `main.stage()` to remove rejected rows. If its current merge duplicates a row in the regression, correct that merge by listing ID at this owner; do not redesign source collection or redefine freshness.
- [ ] Run normalizer/source-status/alias integration checks; after common commit gate, commit `fix(monitor): recheck retained listings before settlement`.

**Pass:** Failure or partial collection cannot reintroduce known unwanted products, falsify freshness or generate new price-history points for retained data.

## Task 3: Fix diagonal and model-token parsing

**Files:** `scraper/normalize_monitor.py`, existing `ParseTests` and fixture corpus. Inspect the collector only to capture/verify the raw list-card input.

**Interface:** Keep `_size(folded: str) -> float | None` and `_code(folded: str) -> str | None`. Fix token boundaries and exclusions in these owners; do not add frontend corrections for malformed stored specs.

- [ ] Add these precise parser assertions:

```python
self.assertEqual(p('Ocypus Sigma ES916 IPS Monitor 9.16"').size, 9.16)
self.assertEqual(p('Lian Li US88v1 IPS Monitor 8.8" 1920x480').size, 8.8)
self.assertEqual(p('Elo 2495L 23.8IN FHD 600NIT OPEN FRAME').size, 23.8)
self.assertEqual(p('Elo 2495L 23.8IN FHD 600NIT OPEN FRAME').code, '2495L')
self.assertIsNone(p('Anmite AW03 IPS FHD 1920x1080').size)
```

- [ ] Add comma decimals, quote variants, explicit `IN`/`INCH` units and controls for 24.07/21.45/31.5/57 inches. Numeric substrings of model codes, resolution, brightness or refresh tokens must not become sizes/model codes. Preserve valid suffixed numeric models.
- [ ] Capture the actual Anmite card title and spec line from a permitted listing response if available. If that text explicitly states 18.5 inches, add a fixture asserting 18.5; otherwise assert unknown. Never derive the diagonal from `A185W03` or silently assume the shop URL is a measured spec.
- [ ] Run `ParseTests` and confirm the new assertions fail, then fix the parser. In particular, matching `03 IPS` inside `AW03 IPS` must fail the token boundary check.
- [ ] Keep the accessory rejection from Task 1: correcting ES916/US88 dimensions does not admit those products. Verify the ELO code even though its open-frame classification excludes publication.
- [ ] Run the whole normalizer matching corpus, EAN conflicts and repeat-settlement tests. After common commit gate, commit `fix(monitor): parse diagonal and model tokens correctly`.

**Pass:** The observed wrong sizes/identities are impossible for the same input, with no broader false merges or invented values.

## Task 4: Check snapshots, replay safely and handle accepted renames only

**Files:** New `scripts/checks/monitor_admission.py`, `test_monitor_admission.py`; monitor branch in `scripts/checks/renormalize_diff.py`. Conditional alias files listed below.

**Interfaces:** `check_rows(listings: list[dict]) -> list[tuple[str, str]]` returns offending ID/reason pairs using Task 1's helper and existing reject/identity fields. CLI `monitor_admission.py <latest.json>` reads only, prints every offending ID, and exits 0 for a nonempty clean snapshot, 1 for violations and 2 for invalid input. It must not rewrite the file or settle/mutate caller input.

- [ ] Test a clean positive snapshot, retained unwanted row with no stored reject, already-rejected row mistakenly published, missing/empty chip, empty dataset, malformed JSON and missing required title/identity fields. Assert input bytes are unchanged after CLI success and failure. Missing input and malformed input must not report clean data.
- [ ] Run `rtk run venv/Scripts/python.exe scripts/checks/test_monitor_admission.py`; confirm failure, implement the small checker, then confirm all cases pass. Keep normalizer regression fixtures independent of the checker's own verdict so a shared policy bug cannot certify itself.
- [ ] Extend the existing diff command only for monitors: include `reject`, code, dimensions, resolution, refresh, panel and resulting settled model keys; use source-ID matching rather than positional matching. Register dynamically loaded modules in `sys.modules` before execution, as required by the normalizer's dataclass.
- [ ] Preserve the existing CLI `renormalize_diff.py monitor monitor <BASE_SHA>`. For both versions, use the same stored title inputs and cached page evidence; report absent original list-spec text explicitly. Retained observation changes and exact grouping equivalence are not proved by a title-only replay.
- [ ] Run replay on the captured snapshot in a temporary directory. Review every newly rejected row and every accepted ID/key change; save source counts, reasons, conflicts and affected history keys. An excluded ELO product gets no alias.
- [ ] If **no accepted key changes**, record that result and skip all alias-helper modifications. If accepted keys change, implement only the following monitor-safe additions:
  - Add `replay_rows(cat, stored: list[dict], evidence_dir: Path) -> list[dict]` to `refresh_aliases.py`; return accepted rows after cached `specs.apply` for EARLY categories and settlement. Pair old/new rows by ID, not `zip` after filtering. Document missing list-spec limitations.
  - Add `_git_json(ref: str, rel: str, *, missing_ok: bool = False) -> dict`. Only optional imported-history reads use `missing_ok=True`; malformed or missing required history/snapshot data remains an error.
  - Preserve existing `fresh_aliases`/`union` semantics, active-old-key protection and history guard. Restore temporary module-global replacements in `finally`.
  - Extend `test_refresh_aliases.py` in its current harness style: no empty target, rejected row omitted, cached page evidence respected, missing imported file allowed, existing markers preserved, split/reused target disallowed, retained live old key not folded, dry run changes no repo file.
- [ ] Where needed, run `refresh_aliases.py monitor <BASE_SHA>` without `--write` first. A proven alias may fold price history only after a green loss check. Run the repository's reviewed write procedure only after inspecting its diff; never alias an excluded product into a valid monitor.
- [ ] Run normalizer, snapshot, alias and merge-history checks. After common commit gate, commit `test(monitor): check admission and replay quality changes`; include conditional alias code in a separate `fix(monitor): preserve accepted model aliases` commit if it exists.

**Pass:** The corrected dataset has no identified admission violations; all accepted renames have explained history/link handling; skipped helper work is explicitly recorded.

## Task 5: Enable monitor photo candidates and test the existing generator

**Files:** `scraper/categories.py`, existing `DataSizeTests`, new `scripts/checks/test_monitor_images.py`. Reuse `main.stage`, `write_image_urls`, `images.main`, `write_sizes` and `model_id` unchanged unless a failing test requires a correction.

**Consumes:** Settled accepted model keys from Tasks 1-4.

**Produces:** Existing `image_urls.json` and existing 96/320 WebP/index contract. No image URL is added to browser list rows; frontend photo IDs stay `sha1("monitor\0<model key>")[:12]`.

- [ ] Replace the test pinning `CATEGORIES['monitor'].images == False` with the intended True assertion. Keep the generic `drop_images` test for categories that actually disable images.
- [ ] In a temporary directory, stage one real accepted monitor with an image, one rejected accessory and prior candidates. Call the existing pipeline in production order. Assert only accepted keys get candidates, BestPrice candidates precede Skroutz/Snif, current keys retain previous candidates during a source failure, and removed keys disappear from the candidate file.
- [ ] Assert `write_image_urls` removes `image` from accepted listing rows and does not change their price, specs or identity. Candidate generation must not alter historical points.
- [ ] Mock `http.session/get` and sleep in `scraper/images.py`; generate a tiny valid source image using installed Pillow in memory. Run `images.main()` with temporary `--data`, `--out` and `--budget 1`. Assert both WebPs have dimensions 96x96 and 320x320, expected hashed index entry exists, and no rejected model is downloaded. No network is needed for this test.
- [ ] Confirm failures, change only the monitor `images` capability to True, and rerun the normalizer/photo tests. The generator already loops through every category, so no new job or service should be necessary.
- [ ] After common commit gate, commit `feat(monitor): enable existing product photo pipeline`. Do not publish this commit until admission/parser corrections and identity effects are reviewed.

**Pass:** A monitor's source photo can travel through candidate extraction and existing image generation without admitting unwanted products or inflating browser list fields.

## Task 6: Pin accepted data and photo derivation in TypeScript

**Files:** New `tests/unit/monitorQuality.test.ts`; reuse `tests/unit/modelChunks.test.ts`, `src/lib/derive.ts`, `src/lib/images.ts` and `vite-plugin-data.ts` contracts.

**Interfaces:** Existing `CategoryInput = {latest, history, imported, specs?}`, `listFile(cat, input, builtAt, image?)`, `modelChunks(...)`, `searchFile(all, builtAt)`, and `ImageLookup(cat, modelKey) -> string | undefined`. Use these functions directly in tests; do not extract an application service to construct fixtures.

- [ ] Read Task 1's reviewed expected accepted fixture fields and construct two complete valid `MonitorListing` test objects. The Python corpus test must assert those same expected fields; do not maintain unrelated guessed versions in browser tests.
- [ ] Assert derived list IDs, model-chunk entries and search entries contain only the accepted fixture set. A fixture of post-staging data proves the boundary contract; Python Task 2 proves staging actually produces it. Do not claim TypeScript alone classifies raw titles.
- [ ] Supply a deterministic `ImageLookup` for one/both accepted models. Assert photo bitmap/model-photo paths agree with `photoId`, and missing lookup preserves the existing no-photo representation.
- [ ] Assert list columns omit raw image URLs/page cache payloads, existing unknown spec semantics remain unchanged and monitors still have no builder slot.
- [ ] Run `rtk npm test -- tests/unit/monitorQuality.test.ts tests/unit/monitorRules.test.ts tests/unit/monitorSpecs.test.ts tests/unit/modelChunks.test.ts`. Existing correct helpers should need no code changes; new contract tests can pass immediately when they verify already-working behaviour.
- [ ] After common commit gate, commit `test(monitor): cover accepted data and photo derivation`.

**Pass:** Correctly admitted monitor data and supplied image-index entries produce the artifacts the browser expects, without introducing new frontend behaviour.

## Task 7: Deterministic Playwright regressions on every affected surface

**Files:** New `tests/e2e/monitor-quality.spec.ts`; extend the real-data `monitor.spec.ts` only where appropriate. Reuse current `page.route` and `localStorage.lang` patterns from `product-presentation.spec.ts`/`model.spec.ts`.

**Fixture strategy:** Register routes before navigation for the monitor list, matching hashed model chunks and search file. Build responses with Task 6's existing derivation helpers, using the actual preview manifest's `builtAt` where needed. Serve a tiny valid image response at `/img/monitor/*`; no test depends on public image hosting. Do not add a production data-directory environment variable or change Vite's global data handling for tests.

- [ ] Add a parameterized suite for `lang in ['el','en']` and widths 1440/360. Set `localStorage.lang` in `addInitScript`; use `[data-product-key]`, `[data-product-link]`, `[data-compare-ref]`, `[data-compare-table]` and visible headings. Hidden retained pages mean `main h1` alone is not a unique locator.
- [ ] Test `cheapest list contains accepted monitors`: select `price-asc` through the Sort control; assert known accepted fixture ordering, no negative fixture IDs/titles, correct prices, and persisted sort after reload. Test the narrow/mobile card view as well as desktop table/cards.
- [ ] Test brand and diagonal filters with known fixture sizes and reload; excluded case screens must not return through search or filter changes. Do not match unknown sizes as a real size bucket.
- [ ] Open a product and assert exact selected listing, specs and shop link. Navigate to a removed fixture's old model/offer address and verify existing not-found/unavailable behaviour, with no other product silently selected as that removed offer.
- [ ] Add the two accepted monitors to comparison, reload and verify both products/prices/specs. Open a shared/saved comparison containing a removed reference and verify unavailable state without crashes or reassignment. Use current compare encoding helpers, not handwritten invalid URLs.
- [ ] Test images in visible list rows, product header and compare columns. Scroll lazy images into view and poll `complete && naturalWidth > 0`. Abort one image request and verify icon fallback and no overflow. Also test a fixture with no image-index entry.
- [ ] Assert no page exceptions or horizontal overflow in these flows. Network failures deliberately introduced for fallback tests must not count as unexpected failures.
- [ ] Run `rtk run node node_modules/@playwright/test/cli.js test monitor-quality.spec.ts monitor.spec.ts aliases.spec.ts smoke.spec.ts`. After common commit gate, commit `test(monitor): cover catalogue photos and excluded products`.

**Pass:** Browser behaviour is proven with deterministic accepted/removed records, in both languages and both target sizes. If existing removed-reference behaviour fails, make the smallest fix at its current selection/compare owner and add the regression there; do not redesign comparison.

## Task 8: Full-data rehearsal and release evidence

**Files:** `scripts/phase3/monitor-gates.mts`, `scripts/checks/README.md`; a focused performance script only if the existing measurement tools cannot take explicit monitor URLs.

- [ ] Document two separate required checks: Python admission policy and TypeScript coverage/conflict/size gates. Remove the TS gate's misleading duplicate `NOT_A_MONITOR` blacklist rather than maintaining a second growing policy. Preserve all existing numeric coverage, false-merge and 300 KiB list limits.
- [ ] Run the admission checker on the corrected snapshot and review its entire rejection report. Replay each previously confirmed unwanted ID and inspect comparable items beyond that small list; “zero known offenders” is not proof every product is correctly classified.
- [ ] Build corrected data only in a disposable local copy/worktree. Keep the source snapshot and built files paired; never run gates against stale `dist`. Compare frozen-input outputs for all nine other categories, including builder/search entries outside monitors; exclude only build timestamps from comparisons.
- [ ] Rehearse real photos for 20-30 accepted models using the existing `images.py --data <temporary-data> --out <temporary-images> --budget 30`. Fetch source image CDN assets only; no new shop/Skroutz product-page scraping. Point a local build to a locally served image index using existing `IMAGES_INDEX`, and fulfill `/img/monitor/*` from that temporary image directory in Playwright.
- [ ] Measure candidate coverage over distinct accepted model keys and final image coverage over those same keys, including models lacking candidates. Targets: candidate coverage >=90%, published photo coverage >=90%. Exclusions/blocklisted models must not be silently removed from the denominator. Spot-check 30 actual family photos, using the existing blocklist for incorrect images.
- [ ] Run the complete local gate once:

```powershell
rtk run venv/Scripts/python.exe scripts/checks/test_normalize_monitor.py
rtk run venv/Scripts/python.exe scripts/checks/test_source_status.py
rtk run venv/Scripts/python.exe scripts/checks/test_monitor_admission.py
rtk run venv/Scripts/python.exe scripts/checks/test_monitor_images.py
rtk run venv/Scripts/python.exe scripts/checks/test_aliases.py
rtk run venv/Scripts/python.exe scripts/checks/test_merge_history.py
rtk run venv/Scripts/python.exe scripts/checks/test_refresh_aliases.py
rtk run venv/Scripts/python.exe scripts/checks/monitor_admission.py <corrected-latest.json>
rtk npm run check
rtk run node node_modules/vite-node/vite-node.mjs scripts/phase3/monitor-gates.mts <corrected-monitor-dir> <fresh-list.v2.json>
rtk npm run e2e
```

The angle-bracket paths above are documented execution inputs, not literal shell arguments. Set them to the temporary corrected snapshot/build established in this task. Report existing unrelated failures separately; do not mark a failed command green.

- [ ] Start the existing production preview. Run `layout-audit.mjs <baseUrl> <evidenceDir> <monitor-list-and-model-paths> 1440,360` with `SHOTS=1`, plus the Task 7 comparison screenshots. Inspect images and labels, not merely HTTP status.
- [ ] Measure `/monitor` and one accepted product URL with three mobile and three desktop Lighthouse runs per URL, against matching before/after data and the same machine/profile. The existing runner's hard-coded pages omit monitors: use installed Lighthouse's CLI with those exact URLs, or make one narrowly scoped URL-list extension if a reusable script is needed. Verify report count, URL and device for every run; do not accept an empty result as success.
- [ ] Require mobile performance >=90, desktop 100, CLS 0, initial JS <=110 KiB gzip and data <=300 KiB gzip. Investigate median LCP regression over 100 ms from photo delivery. Do not change paint ordering speculatively.
- [ ] Record file/commit list, all test outcomes, per-source removals, identity/alias changes, history-loss proof, coverage denominator, actual photo checks, screenshots and performance medians in a concise release report. No main push yet.

**Pass:** All required gates pass or a material blocker is explicitly reported; the release remains unproposed while a material gate fails.

## Task 9: Publish corrections first, then photos, and verify live

These are execution-time actions subject to existing owner authorization. Do not execute them while producing or reviewing this plan.

1. Record current main/deployment and compare proposed commits against the now-current remote main. Refresh accepted aliases against that exact data if needed; scheduled data commits will have advanced since Task 0.
2. Publish reviewed admission/parser corrections first, without forcing a data/history guard. Wait for existing scheduled collection or obtain authorization for manual runs. Verify both fresh and retained paths and all source freshness/status fields.
3. Check the actual published list/search/model artifacts and Playwright cheapest-first results. None of the reviewed negative products may remain selectable; old removed references must fail safely. Preserve all stored price-history points; old accessory history may remain stored without publication.
4. Publish the photo-capability commit after corrected data is verified. Wait for source workflows to write monitor `image_urls.json`. A failed source may retain prior candidates; first-time coverage is not complete until successful collection supplies enough candidates.
5. Let the image repository's current scheduled job run, or get authorization to start it. Keep its current budget. Inspect pending/failed counts and run again only under existing authorization/schedule; do not silently raise the budget to hit coverage.
6. Wait for a subsequent Vercel build to consume the populated image index. Verify nonzero photo bitmap, actual 96/320 assets, `naturalWidth > 0`, coverage >=90%, and the 30-image product-family review. An index failure is a safe fallback, not successful photo delivery.
7. Repeat live list/filter/product/compare checks in both languages and target widths; run `site-check.mjs` against the live URL and verify image/per-source freshness checks. Repeat sample exclusions after the next normal source cycle to detect reintroduction.
8. Report completion only after live evidence passes. If release is not authorized, report “locally verified; publication pending” and identify exactly which live checks remain.

## Common local commit gate

For Tasks 1-7, run focused Python tests as listed, then `rtk npm run check`. Stage only the task's files, review `git diff --cached --check` and the diff, then make the named local commit. Do not run the whole e2e suite for every small commit; Task 7 runs focused browser tests and Task 8 runs the full suite once. Repeat a passed check only after relevant changes or a new failure justifies it.

## Rollback and stop condition

- Keep the previous Vercel deployment and all source/history snapshots. Revert the responsible code commit; never reset main over new data commits.
- Identity rollback requires alias/history review first. Do not reverse an alias into a different product or delete price points to satisfy a guard.
- Disabling image candidates does not remove indexed assets. Wrong images use the existing blocklist; previously downloaded unused images need no cleanup for this task.
- A deployment rollback can restore old contamination. State that consequence before using it; a targeted forward fix may be safer.
- Stop when reviewed non-PC products stay excluded across fresh/retained collection and all published surfaces, parser regressions are fixed, accepted photo coverage is verified, history/links and other categories are preserved, and the required local/live checks pass.

## Plan self-review

- All audited defects map to Tasks 1-7, with separate fresh-source and retained-source proofs.
- Interfaces and file owners were checked against current source; no production configuration or schema is invented for test fixtures.
- Conditional alias work avoids changes for rejected ELO products and other cases with no accepted rename.
- Offline title-only evidence, image fixture evidence and live release evidence are explicitly distinguished.
- Remaining execution inputs are concrete snapshot SHA, temporary paths and selected accepted product URL, recorded in Task 0/8 rather than guessed now.
