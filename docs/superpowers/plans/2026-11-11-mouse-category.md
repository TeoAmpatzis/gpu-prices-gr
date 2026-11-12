# Mouse Category Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add mice at `/mouse` and `/mouse/<slug>`, with trustworthy product identities, prices, stated-only filters, colour variants and comparison, without adding mice to PC Builder.

**Architecture:** Extend the existing category registry, source readers and normalizer pipeline. A new `normalize_mouse.py` owns mouse parsing and identity; existing derivation, history, photos, search, SEO and comparison remain the delivery path. Collect and review data before publishing routes; do not create a second catalogue, comparison engine or scraping workflow.

**Tech Stack:** Existing Python dataclasses/unittest, curl_cffi/selectolax, React 18/TypeScript, Vite, Vitest, Playwright, GitHub Actions and Vercel. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-11-mouse-category-design.md`. Read it together with `docs/PROJECT-STATE.md`; the latter owns operational rules. This plan implements phases 1–3 and 5. Richer product-page specifications (phase 4) need a separate probe and plan.

**Status:** Released 2026-11-12 (`main` = `31843e2`, mice public at `/mouse`). What was done, what differs from this plan and what is still open: `docs/peripherals/MOUSE_CHECKPOINT.md`. The checkboxes below were not all ticked one by one; the checkpoint is the record.

## Global Constraints

- All work, fixtures, temporary snapshots, reports and screenshots stay under the BuildDraft project folder. Use `local/mouse/` for disposable material; never default to an OS temporary directory in new tests or scripts.
- Work on `feat/mouse-category`. Local `main` has divergent history: do not merge it, reset it, force push or rewrite it. Before execution, inspect changes and compare the feature branch with freshly fetched `origin/main`; integrate new upstream work on the feature branch without losing existing files.
- Preserve the existing untracked `UNIVERSITY_PROJECT_PRESENTATION_GUIDE.md`; use explicit paths when staging.
- Push to `main` publishes. Require the owner's explicit yes before pushes, live data runs, workflow dispatch/re-run/cancellation, or enabling public mouse routes. Before a push: `npm run check`, `npm run e2e` and the Python checks must pass.
- Identity: `TeoAmpatzis <189219701+TeoAmpatzis@users.noreply.github.com>`. Conventional commits, no `Co-Authored-By` and no assistant attribution. Commit boundaries below are proposals for execution; this planning task creates no commit.
- Sources: BestPrice, Skroutz, Snif. Skroutz mouse lists only: no product pages, `shops_list`, `price_graph`, shipping or imported history. e-shop.gr and Shopflix are unsupported for mice. Do not add a mouse specs parser or manufacturer-page collector in this release.
- Keep workflow concurrency, source pacing, circuit breaker, budgets and timeouts. Reuse the deployed sequential prices/specs split. No jobs per category and no parallel requests to one shop.
- Cost 0. No new services or dependencies; retain pinned Python versions and Action SHAs.
- Every new user-facing text has Greek and English values. Dark only, existing tokens, keyboard access, 360 px support. First-load JS up to 110 KB gzip, data up to 300 KB gzip, CLS 0. Existing P4-010 overages must be reported separately, not silently treated as permission to exceed the mouse budget.
- Missing information stays null/unknown. Colours do not create products. Wired, wireless and explicitly dual-mode products must not collapse together. Mouse data must never enter a builder slot or compatibility-engine input.
- Do not publish locally produced `public/data/**` without the owner's explicit, change-specific permission. Tests use isolated fixtures; production data comes through the existing Actions pipeline.

## Planning Decisions Needed to Make the Design Executable

These are implementation choices from tracing the current code, not additional owner decisions. Record them in the design when implementing the related task.

1. **Bootstrap disabled, then hidden, then visible.** Start with `enabled:false, visible:false`. `checkData` currently rejects missing data for every enabled category, including hidden ones. After a real snapshot is collected and reviewed, set `enabled:true, visible:false` with a measured `MIN_MODELS.mouse`; publish only later. Do not weaken `checkData`, set `DATA_CHECK=off`, or commit fabricated data to get the scaffold through a build. Python collection is independent of the frontend's enabled flag.
2. **Hidden means unavailable through public routes.** `CATEGORY_LIST` controls routes, search, sitemap and static pages. Review hidden data through reports. For local UI testing only, temporarily make the entry visible, run the tests, then restore it and verify the diff before any staging. A preview with visibility changed is never pushed without release approval.
3. **Keep colour in list data.** The design's proposed omission of `colour` conflicts with its colour filter. Omit `partNumber` only; model chunks retain both fields. Measure before adding a preload.
4. **Dual-mode matches both connection filters.** A `both` mouse appears in wired and wireless selections; unknown connection appears only with no connection selection. Add one optional category group matcher used by filtering and facet counts, preserving equality for every existing category.
5. **Ambiguous connection is quarantined.** If an unknown connection could join more than one known connection family, reject it as `identity-conflict`; do not guess or bridge the families. An explicitly `both` listing is a third family, not a bridge. With no known connection, same-name unknown rows may form an unknown family.
6. **Colour variants are offers within one model.** Existing `Variants.tsx` links different model pages and cannot represent these colours. Add a small mouse colour selector that narrows the existing offers table on the same canonical model URL. Existing source/offer selection links retain their semantics; do not manufacture duplicate model pages.
7. **Gaming overlap is deterministic.** For the same Skroutz ID in both lists, preserve the cheapest observation and stamp `gaming:true`, independent of list order. At model sharing, reuse `main.PRIORITY` with `gaming: [True, False]`: any explicit gaming evidence wins, otherwise explicit office fills peers, otherwise unknown stays unknown. No title omission becomes false.

## Review Focus

1. Similar names, punctuation, connection variants and reused part numbers must never merge different products: Task 2 tests identity, order independence and idempotence.
2. A repeated Skroutz ID must retain the cheapest price and gaming priority without hiding incomplete pagination: Task 3 collector tests exercise both path orders and existing failure cases.
3. A source fails or is not selected after previous data exists: Task 4 proves retained data, rejects, photos and history stay consistent.
4. All-unknown booleans, colour-specific prices and dual-mode connections must agree across filters, facets, URLs and specs: Tasks 6–7 test these inputs directly.
5. First deployment has no mouse data, or later data collapses: Tasks 1 and 5 keep the existing bootstrap and publication guards, and Task 9 verifies hidden/public behavior and failure rollback.

## File and Ownership Map

| Area | Files | Responsibility |
| --- | --- | --- |
| Schema and category scaffold | `scraper/models.py`, `scraper/category_ids.py`, `scraper/categories.py`, `scraper/capabilities.py`, `src/types.ts`, `src/lib/registry.ts` | Mouse listing contract, collection policy, activation state |
| Identity | new `scraper/normalize_mouse.py`; new `scripts/checks/fixtures/mouse-titles.json`; new `scripts/checks/test_normalize_mouse.py` | Title/spec parsing, connection families, rejects, deterministic names |
| Source tags and sharing | `scraper/sources/skroutz.py`, `scraper/main.py`; `scripts/checks/test_skroutz_collector.py`, `scripts/checks/test_capabilities.py` | Per-path tags, overlapping IDs, model-level gaming propagation |
| Pipeline proof | new `scripts/checks/test_mouse_pipeline.py`; `scripts/checks/README.md` | Mocked collection, retained sources, rejection/history/image consistency |
| Category config | `src/lib/categoryRules.ts`, `src/lib/categories.tsx`, `src/lib/ranking.ts`, `src/shell/nav.ts`, `src/shell/texts.ts` | Filters, grouping, names, icons and existing recommendation scoring |
| Shared filter semantics | `src/lib/data.ts`, `src/lib/facets.ts`; `tests/unit/facets.test.ts`, `tests/unit/filterUrl.test.ts` | Consistent dual-mode filtering and counts; unchanged existing categories |
| Product presentation | `src/ui/specs.ts`, `src/components/catalogue/specs.ts`, `src/components/product/keySpecs.ts`; new `src/components/product/MouseColours.tsx`; `src/components/product/ModelPage.tsx`, `src/components/product/productStrings.ts` | Nullable specs and colour selection above the existing offers table |
| Derived data | `src/lib/derive.ts`; new `tests/unit/mouseQuality.test.ts`; `tests/unit/listFile.test.ts`, `tests/unit/modelChunks.test.ts` | Retain filter fields, omit unused part number, validate keys/chunks and first-data minimum |
| Tests for mouse behavior | new `tests/unit/mouseRules.test.ts`, `tests/unit/mouseSpecs.test.ts`, `tests/unit/mouseColours.test.ts`; new `tests/e2e/mouse.spec.ts`; existing `tests/unit/registry.test.ts`, `tests/unit/keySpecs.test.ts`, `tests/unit/compare/table.test.ts`, `tests/unit/homeData.test.ts` | Isolated behavior tests plus published-page coverage |
| Release | `src/shell/Home.tsx`, `vercel.json`, `scripts/checks/site-check.mjs`; `tests/unit/routes.test.ts`, `tests/unit/sitemap.test.ts`, `tests/unit/staticPages.test.ts` | Visible peripherals, host rewrites, crawlable pages and release checks |
| Evidence and handoff | new `docs/peripherals/MOUSE_DATA_REVIEW.md`; `docs/PROJECT-STATE.md`, `CLAUDE.md`, `docs/superpowers/specs/2026-11-11-mouse-category-design.md`, `docs/ADDING-A-CATEGORY.md` | Measured results, resolved planning choices, current state and category checklist |

Read-only reuse: `src/lib/compare/table.ts` derives comparison rows from `specGroups`; `src/lib/routes.ts`, `src/lib/sitemap.ts`, `src/lib/staticPages.ts` already follow visibility. `src/lib/images.ts` and `scraper/images.py` already hash category/model keys. `src/lib/slots.ts`, `src/lib/pick.ts`, `src/lib/compatBuild.ts` own builder exclusion. Do not add mouse branches to these unless a focused regression test exposes a real missing behavior.

## Execution Setup and Gates

- Run all commands from the BuildDraft root in PowerShell. Use installed dependencies. Put new temporary directories under `local/mouse/tmp`; `unittest` fixtures use `TemporaryDirectory(dir=ROOT / 'local' / 'mouse' / 'tmp')` after creating that parent.
- Before starting: `git status --short`, `git branch -vv`, `git fetch origin`, `git log --oneline --left-right HEAD...origin/main`. Preserve unrelated work. Establish the baseline with `npm run check` and the relevant existing Python checks; distinguish pre-existing failures from regressions.
- Gate A: Tasks 1–4 complete locally; category disabled and invisible; all checks pass. Owner reviews code before any approved push/collection.
- Gate B: Task 5 produces first-source data and a review report. Enable hidden derivation only after review and minimum-count calibration.
- Gate C: Tasks 6–8 pass locally with measured mouse data. Owner reviews the visible preview and release evidence before Task 9 publication.
- Task 10 records the release state. No gate is implied by elapsed time or an unchecked task list.

### Task 1: Add the Disabled Mouse Contract Without Breaking Existing Builds

**Files:** Schema/category scaffold and category config rows from the map; `tests/unit/registry.test.ts`, `scripts/checks/test_capabilities.py`.

**Interfaces:** `MouseListing` in Python and TypeScript; `CATEGORIES['mouse']`; frontend `REGISTRY.mouse`. Python `make_listing` comes from Task 2. Land Tasks 1–2 as one working commit, so no missing import is committed.

- [x] **1. Write failing contract tests.** In registry tests assert `slotOf('mouse') === null`, mouse absent from `SLOTS` and `SLOT_OF`, `enabled === false`, `visible === false`, Python/site category ID parity, and published IDs unchanged. Extend capability tests to assert the exact mouse matrix: Skroutz lists only; e-shop/Shopflix nothing; BestPrice/Snif lists and existing shipping policy. Existing categories retain their matrix.
- [x] **2. Run and observe the intended failures.** `npm test -- tests/unit/registry.test.ts`; `venv/Scripts/python scripts/checks/test_capabilities.py`. New mouse assertions fail, not unrelated baseline tests.
- [x] **3. Add schemas.** Python `MouseListing` uses the existing dataclass/to-dict convention; TypeScript `MouseListing extends BaseListing`. Required identity: `brand`, `chip`. Nullable fields: `connection: 'wired' | 'wireless' | 'both' | null`, `dpi`, `pollingHz`, `buttons`, `colour`, `partNumber`; nullable booleans `rgb`, `gaming`, `bluetooth`, `rf`, `rechargeable`, `ergonomic`, `silent`. `reject` follows monitor's existing representation. Preserve `listing_dict` extras such as image/shipping/drop data.
- [x] **4. Append Python `mouse` and add disabled registry entry.** Mirror every exhaustive frontend map: `MOUSE_RULES`, `MOUSE`, `CATEGORIES`, `RANKING`, `MODERN`, `CAT_PAGE`, `CATS`, `SPECS`, `FULL`, `FILL`, `MIN_MODELS`. Use empty spec output/minimal rules initially and `MIN_MODELS.mouse = 1` only while disabled; Task 5 replaces that placeholder before enabling. Register recommendation weights `popularity:0.7, modern:0, price:0.3, value:0`, monitor's existing price band/deal boost, `MODERN.mouse = () => 0`, `tierScore = () => 0`, `sortByGroup:false`, no `value` or builder slot. Add `skroutz_tags: tuple[dict, ...] = ()` to `Category`.
- [x] **5. Prove the scaffold remains harmless.** `npm run check`, capability tests and registry tests pass after Task 2 supplies the normalizer. Confirm missing mouse data still does not enter `CATEGORY_IDS`, public routes, search, home, sitemap, builder or compare refs. Do not change existing checkData behavior.

### Task 2: Implement Mouse Parsing, Rejection and Deterministic Identity

**Files:** new `scraper/normalize_mouse.py`, `scripts/checks/fixtures/mouse-titles.json`, `scripts/checks/test_normalize_mouse.py`; schema/category files from Task 1.

**Interfaces:** `make_listing(*, source: str, native_id: str, title: str, url: str, price: float, shop_count: int | None, scraped_at: str, specs: str = '') -> MouseListing | None`; `settle(listings: list[dict]) -> None`. Register `model_key=lambda l: names.model_key(l['chip'])`, `settle`, `rejects=True`, `images=True`.

- [x] **1. Build the offline fixture.** Seed real titles already recorded in the design, with source/URL/spec text and observed expected fields. Add explicitly labelled synthetic pairs for boundary testing; do not present their specs as observed product facts. Include Logitech M171, MARVO M450, G502 X/Plus, MX Master 2S/3S, Pro/Lite/Mini/Max/V2, Mac/Business/Bluetooth Edition distinctions, multiword makers, Greek prefixes, colours, trackballs, vertical mice and all design rejection classes.
- [x] **2. Write tests before implementation.** Tests instantiate `make_listing`, call `to_dict`, then `settle`. Pin these assertions:

```python
# rows(...) is a test-local constructor through make_listing(...).to_dict().
same = rows('Logitech G502 X Plus Wireless Black', 'Logitech G502 X Plus Wireless White')
settle(same)
assert same[0]['chip'] == same[1]['chip']
assert same[0]['colour'] != same[1]['colour']
different = rows('Logitech G502 X Wired Black', 'Logitech G502 X Wireless Black')
settle(different)
assert key(different[0]) != key(different[1])  # key = names.model_key(row['chip'])
before = copy.deepcopy(same)
settle(same)
assert same == before
```

Also assert: unknown joins exactly one connection family; ambiguous unknown is rejected `identity-conflict`; explicit both stays distinct; same part number across different names rejects all conflicting observations within that brand; same-name different colour part numbers merge; shuffle input and compare results by source/ID; all identity words survive; folded model keys remain unique; invalid price returns None; rejects remain serializable rows. Repeated settling after rejection and after sharing must not invent additional suffixes or change keys.
- [x] **3. Verify failure.** `venv/Scripts/python scripts/checks/test_normalize_mouse.py` fails on the missing module/behavior. Test file runs via `unittest.main()` like `test_normalize_monitor.py`.
- [x] **4. Implement title/spec extraction.** Reuse `names.prepare`, colour vocabulary, vendor aliases and `model_key`; do not copy a normalizer that defaults missing booleans to false. Strip Greek/English mouse descriptors before finding the maker; reject descriptor-only/no-brand/no-model titles. Recognize whole numeric tokens with explicit DPI/Hz/buttons units, take highest stated DPI, require finite positive integers, and ignore malformed/unitless tokens. No speculative hardware ceilings. RF/Bluetooth do not prove rechargeable or playable wired mode; a USB charging cable alone does not prove `both`. Parse explicit negatives as false; absent words as None. Use a fixed mouse colour alias table seeded by actual titles (e.g. Black/Μαύρο -> black, White/Λευκό -> white, Gray/Grey/Γκρι -> grey); preserve unrecognized wording in original titles rather than stripping arbitrary name words.
- [x] **5. Implement `settle` from original titles and stated fields.** Recompute only identity-derived rejects; preserve input rejects. Bucket by maker and cleaned identity name, keeping the design's identity phrases. Then partition by wired/wireless/both; attach unknown only to one unambiguous known family. Use canonical connection qualifiers in the final `chip` to keep distinct families' folded keys different; do not append a qualifier twice. If all connections are unknown, keep one unknown family; never merge it across multiple known families. Compare part numbers within a maker; they are corroboration/conflict evidence, never a replacement for the name. Resolve punctuation-only key collisions deterministically, using the monitor's stable collision approach and source-qualified IDs; never input order or current price. Colour, DPI, polling rate and button counts do not create identities.
- [x] **6. Verify and commit Tasks 1–2 together.** New normalizer tests, `test_normalize_monitor.py`, capability tests, `npm run check` pass. Proposed commit: `feat(mouse): add disabled category and deterministic normalization`.

### Task 3: Add Skroutz Path Tags and Source Policy

**Files:** `scraper/categories.py`, `scraper/capabilities.py`, `scraper/sources/skroutz.py`, `scraper/main.py`; `test_skroutz_collector.py`, `test_capabilities.py`, `test_mouse_pipeline.py`.

**Interfaces:** `Category.skroutz_tags` parallels `bestprice_tags`; existing `skroutz.fetch(cat) -> list` keeps its signature and `fetch_category(..., seen)` keeps pagination ownership. `main.share_fields` still owns model field propagation.

- [x] **1. Write failing collector tests.** Mock `fetch_category` to place the same source ID at prices 20 and 18 in gaming/office paths. In either path order assert one result, price 18 and `gaming is True`. An office-only row is false; empty tags leave CPU behavior unchanged. Reject a nonempty tag tuple with a different length from its path tuple, rather than silently dropping/misplacing tags. Existing sponsored-card, repeated-page, page-limit, challenge and incomplete-traversal tests must remain green.
- [x] **2. Run the targeted failures.** `venv/Scripts/python scripts/checks/test_skroutz_collector.py`; capability tests; new sharing tests with `[True, False, None]`, `[False, None]`, `[None, None]` expect respectively all true, all false, all unknown after mouse gaming sharing. Reverse input order and repeat.
- [x] **3. Configure the sources.** Gaming `/c/1865/gaming_pontikia.html`, office `/c/69/mice.html`; matching tags `({'gaming': True}, {'gaming': False})`; Snif `('1919852',)`. Add the exact capability exclusions. BestPrice price slices are populated only from the measured Task 5 preflight, not invented boundaries. Declare the design's shared fields; do not share colour or part number.
- [x] **4. Stamp tags before cross-path dedup.** Fetch each path into its own dictionary; stamp path tags, then merge into the overall dictionary. Keep cheapest observation and OR the explicit gaming tags when IDs overlap, regardless of which object supplies price. Keep sessions, sleeps and pagination failure propagation unchanged. Untagged categories keep their prior results.
- [x] **5. Reuse sharing policy.** Add `gaming: [True, False]` to `main.PRIORITY`, not a new mouse-wide pipeline branch or majority vote. Other nullable flags follow existing any-true behavior without fabricating false. Leave mouse absent from `specs.PARSERS`, `NEEDED` and `EARLY`; cached product-page identity handling is monitor-specific.
- [x] **6. Verify and commit.** Collector, capabilities, normalizer and sharing tests pass; `npm run check` passes. Proposed commit: `feat(mouse): collect tagged Skroutz lists with explicit source limits`.

### Task 4: Prove Admission, Retained Sources, History and Photos Offline

**Files:** new `scripts/checks/test_mouse_pipeline.py`, `scripts/checks/README.md`. Extend `test_source_status.py` only if its fixtures provide the cleanest reuse; do not create duplicate test helpers in production code.

**Interfaces:** Existing `main.scrape_category(cat, only, with_shipping=True) -> bool`, `stage`, `write_image_urls`, `update_history` and `collect_specs`. Tests patch `main.DATA_DIR` to a directory under `local/mouse/tmp` and mock every HTTP/source method.

- [x] **1. Write failing integration assertions.** Feed two accepted colours, distinct connection variants, a bundle and a pad through collection. Assert: accepted snapshot excludes rejects; rejected snapshot includes exact reason/title; all model keys agree with the normalizer; history and image URLs contain accepted model keys only; two colours share one model/image key; source success counts count accepted rows. Failed or unselected sources keep their previous accepted rows and relevant rejects. Test unknown source data cannot silently replace a valid prior snapshot.
- [x] **2. Add safety cases.** A partial Skroutz traversal retains the previous whole source snapshot; all-source failure reports failure; corrupt prior JSON aborts without replacing it. Specs-only preserves source freshness, prices, history bytes and settled identity. Assert no mouse request reaches Skroutz specs/shipping/history, e-shop or Shopflix. Mocked image generation uses only accepted candidates and both existing WebP sizes; `images.model_id('mouse', key)` matches the frontend hash fixture.
- [x] **3. Run and fix only missing wiring.** `venv/Scripts/python scripts/checks/test_mouse_pipeline.py`, `test_source_status.py`, `test_monitor_images.py`, `test_workflows.py`. Expected: all assertions pass with no network. Reuse existing pipeline ordering; add no mouse `EARLY` special case.
- [x] **4. Gate A verification and commit.** Run `npm run check`, `npm run e2e` and the repository Python checks. End with registry disabled/invisible and no production data changes. Proposed commit: `test(mouse): prove admission history photos and source retention`.

### Task 5: Measure Source Coverage, Collect First Data and Enable Hidden Derivation

**Files:** new `docs/peripherals/MOUSE_DATA_REVIEW.md`; `scraper/categories.py` measured BestPrice paths; `src/lib/registry.ts`, `src/lib/derive.ts`; fixtures from newly observed titles. Disposable captures live under `local/mouse/`.

**Interfaces:** Existing `main.py --category mouse`, repeated `--only`, `--no-shipping`, `--specs-budget 0`, `--makers-budget 0`; regular all-category workflows need no new job. This task contains explicit live-action gates; do not treat plan approval as permission to dispatch or publish.

- [x] **1. Record the prerequisite evidence.** Recheck the run split's Task 2 against actual GitHub results. Known reference from initial inspection: shops run `43067793455` succeeded with separate prices/specs commits. Record its job times and head SHA; do not claim the whole run-split plan or the two-scheduled-run optional gate is complete. Create `docs/ADDING-A-CATEGORY.md` if still absent in Task 10.
- [x] **2. Obtain live preflight approval, then measure.** Read BestPrice mouse counts and existing price-slice URL syntax. Partition the nonnegative cent range into contiguous slices covering through an open upper bound; no gaps, no slice beyond 50 pages/800 products. Do not assume inclusive-edge semantics: inspect adjacent boundaries, deduplicate by source ID and record exact URLs/counts/date. Discover Snif's page count/terminal link and Skroutz cross-list ID overlap. Save only useful observed title/spec samples in the committed fixture; raw HTML stays local. Record the additional request/time estimate before proceeding if it exceeds the design's budget.
- [ ] **3. Commit the measured configuration locally and request the specific code push/first collection.** Keep frontend `enabled:false, visible:false`. Use the existing Actions path to collect one successful Skroutz mouse snapshot and one shops snapshot; observe rather than blindly rerun. If an isolated local probe is approved, use a test-local patched DATA_DIR wrapper under `local/mouse/`, never the default production directory. Existing BestPrice shipping allowance is permitted; extra spec enrichment is not. Do not add a new CLI output-directory flag solely for this probe.
- [x] **4. Write the admission report.** Include run IDs/SHAs/dates; attempted/successful source counts; accepted listings, model counts, one-source models; every rejection reason/count and up to 20 examples each; exactly 50 randomly selected model groups using a recorded seed and sorted input (or all groups if fewer); per-field unknown/conflict rates; colour/connection separation examples; overlapping Skroutz IDs; pages per source; prices/specs job times; image candidate coverage. Distinguish observed counts from estimates. Freeze observed titles into regressions before changing normalization, then repeat the report after any fix.
- [ ] **5. Apply Gate B.** Owner reviews grouping/reject samples. Require successful Skroutz, BestPrice and Snif collection and no unresolved false joins/accessory leaks in the inspected sample. An unavailable source is reported and the gate stays open unless the owner explicitly changes launch scope. Set `MIN_MODELS.mouse = max(1, floor(N / 2))`, where N is the accepted first-data model count produced by frontend derivation, and put N/run/date in the comment/report. A missing/empty visible category must still fail; a >30% decline against a later live manifest must still fail.
- [ ] **6. Enable hidden derivation using the reviewed snapshot.** With approved Actions data present locally, set `enabled:true, visible:false`. Run `npm run check`; assert nonempty list/chunks and no mouse route/search/sitemap/home/compare ref. Do not lower the measured guard to pass an unexplained count loss. Proposed commit: `feat(mouse): enable reviewed data behind category visibility gate`.

### Task 6: Implement Stated-Only Filters, Dual-Mode Matching and Ranking

**Files:** `src/lib/categoryRules.ts`, `src/lib/data.ts`, `src/lib/facets.ts`, `src/lib/categories.tsx`, `src/lib/ranking.ts`; new `tests/unit/mouseRules.test.ts`; `facets.test.ts`, `filterUrl.test.ts` and ranking regression tests.

**Interfaces:** Export `MOUSE_RULES: CategoryRules<MouseListing>` and `MOUSE: CategoryConfig<MouseListing>`. Extend `CategoryRules` with `matchesGroup?: (listing: L, group: string) => boolean`; export shared `matchesGroup<L extends BaseListing>(cfg: CategoryRules<L>, listing: L, group: string): boolean`, falling back to `cfg.group(listing) === group`. Use it in the existing filter and facet group-count callers.

- [ ] **1. Write failing rules and facet tests with isolated listings.** Pin the assertions below; include `filterCatalogue` and worker/main-thread facet parity, not just direct predicates.

```ts
expect(matchesGroup(MOUSE_RULES, mouse({ connection: 'both' }), 'wired')).toBe(true);
expect(matchesGroup(MOUSE_RULES, mouse({ connection: 'both' }), 'wireless')).toBe(true);
expect(matchesGroup(MOUSE_RULES, mouse({ connection: null }), 'wired')).toBe(false);
for (const value of ['yes', 'no']) expect(flag('bluetooth').test(mouse({ bluetooth: null }), value)).toBe(false);
expect(threshold('dpi').test(mouse({ dpi: 1600 }), '1600')).toBe(true);
expect(threshold('dpi').test(mouse({ dpi: null }), '800')).toBe(false);
```

`mouse`, `flag` and `threshold` above are test-local fixture/filter lookups. Also test exact false matches No; office requires `gaming === false`; an unknown is in All; selecting both pills does not duplicate a row; facet counts use the same matcher; a white-only selection cannot display a cheaper black offer; filters round-trip through existing URL encode/decode. Existing category equality/count behavior remains unchanged.
- [ ] **2. Run the targeted failures.** `npm test -- tests/unit/mouseRules.test.ts tests/unit/facets.test.ts tests/unit/filterUrl.test.ts`.
- [ ] **3. Implement category rules.** `groups:['wireless','wired']`, `groupParam:'connection'`, translated group names, `group` returns the stated connection or OTHER for display; optional matcher gives `both` the two memberships. Empty `Filters.groups` already means All. Preserve existing group's display/ranking semantics and all other callers. Use existing `vendorFilter`, `threshold` with data-derived sorted numeric options and `oneOf` for canonical colour. Extra keys: `use`, `bluetooth`, `rf`, `rechargeable`, `dpi`, `pollingHz`, `buttons`, `rgb`, `silent`, `ergonomic`, `colour`; use values `gaming/office` and boolean `yes/no`. Use a small local nullable-boolean filter builder patterned on storage's explicit DRAM filter. Do not change the old `yesNo` helper's semantics for other categories.
- [ ] **4. Finish MOUSE config and ranking.** Greek/English labels from the design, Mouse icon, connection/DPI/Hz/button columns where stated, no fabricated performance score or best badge. Preserve monitor-style popularity/price weights and deal handling. Test two otherwise identical models with different DPI do not get different recommendation scores merely because of DPI.
- [ ] **5. Verify and commit.** Focused tests, existing facets/filter/ranking tests and `npm run check` pass. Proposed commit: `feat(mouse): add stated-only filters and dual-mode group matching`.

### Task 7: Add Nullable Specs and Same-Model Colour Selection

**Files:** presentation files from the map; new mouse specs/colour tests; existing key-spec and compare tests.

**Interfaces:** Existing `specGroups('mouse', listings, lang)` and catalogue `productSpecs`; `MouseColours` receives `listings: readonly MouseListing[]`, `value: string | null`, `onChange: (colour: string | null) => void`. Export pure `mouseColours(listings: readonly MouseListing[]): { colour: string; price: number }[]` (sorted canonical keys and cheapest prices), and `mouseOffers(listings: readonly MouseListing[], colour: string | null): MouseListing[]` (a copy of matching offers). Keep both small helpers with `MouseColours.tsx`; reuse existing formatting and UI controls.

- [ ] **1. Write failing spec tests.** Complete rows show brand, use, buttons, RGB, silent, ergonomic, DPI and polling in general; connection/Bluetooth/2.4 GHz in connections; rechargeable in power. Unknown fields produce no row/empty group. Explicit false displays No in both languages. General occurs once, not twice. `pick`/`yesNo` must preserve null; no `ls.some` shortcut. Comparison must expose the same row IDs/values through existing `compare/table.ts`.
- [ ] **2. Write failing colour tests.** Two colours produce one model with two colour choices and per-colour lowest prices. Selecting white removes black offers; All includes colour-unknown offers; an exact colour excludes unknown. No choice creates another model slug or changes source/offer identity. Changing model resets the selection. A qualified offer-selection URL remains authoritative: it retains its existing selected-offer presentation rather than being overridden by colour state. Unknown colour has no invented label/price.
- [ ] **3. Run tests and implement.** `npm test -- tests/unit/mouseSpecs.test.ts tests/unit/mouseColours.test.ts tests/unit/keySpecs.test.ts tests/unit/compare/table.test.ts`. Add mouse cases to `SPECS`, `FULL`, `FILL` and catalogue spec line; reuse translated Yes/No and number formatting. Add translated colour names and All colours text through the existing strings system.
- [ ] **4. Wire the colour control into ModelPage.** Only on a mouse family view, derive displayed offers from colour and feed the existing `OffersTable`; continue using its sorting, totals, stale-source dates and outbound links. History remains model-wide and must say so when a colour is selected; canonical/structured product data remain model-wide. Use local state, no new persisted preference or URL format. Hide the control for fewer than two known colours; display a known single colour through specs/offer text. Keep ModelPage hooks unconditional (including non-mouse and loading/error states). Do not repurpose cross-model `Variants` or add colour to `entry.variants`.
- [ ] **5. Verify and commit.** Focused tests, existing offers/product-selection tests and `npm run check` pass; keyboard selection announces state with the existing control semantics. Proposed commit: `feat(mouse): show nullable specs and colour-specific offers`.

### Task 8: Prove Data Derivation, Images, Hidden State and Performance

**Files:** `src/lib/derive.ts`; new `tests/unit/mouseQuality.test.ts`; `listFile.test.ts`, `modelChunks.test.ts`, `routes.test.ts`, `sitemap.test.ts`, `staticPages.test.ts`, `registry.test.ts`. Update the data review report with measurements.

**Interfaces:** Existing `listFile`, `fromColumns`, `modelChunks`, `modelSlug`, `photoId`, `checkData`, `searchFile`, `sitemaps`, `staticPages`. No second schema/chunk/hash implementation.

- [ ] **1. Write failing round-trip tests using synthetic mouse input.** `listFile`/decode retains all filter fields including `colour`; omits `partNumber` only from list rows; full chunks retain colour/part number. Every accepted model has exactly one chunk lookup and unique slug; rejected rows have none. Settled Python fixture keys equal `MOUSE_RULES.modelKey`. Compare Python photo ID vectors with `photoId('mouse', key)`; changing cheapest colour leaves model/history/photo key intact.
- [ ] **2. Prove activation gates.** Disabled + absent mouse inputs leaves existing checkData result unchanged. Enabled + absent/empty mouse fails; below measured first-deploy minimum fails; same data passes; 35% drop against a mouse live baseline fails. With enabled/hidden mouse inputs, search, sitemap, static HTML and compare refs omit mouse; routes return not found and builder/compat output is unchanged. Use isolated registry mocks/module resets for both hidden and visible cases, rather than editing production visibility inside unit tests.
- [ ] **3. Run and implement the minimal derivation change.** `npm test -- tests/unit/mouseQuality.test.ts tests/unit/listFile.test.ts tests/unit/modelChunks.test.ts tests/unit/registry.test.ts tests/unit/routes.test.ts tests/unit/sitemap.test.ts tests/unit/staticPages.test.ts`. Add `mouse:['partNumber']` to `LIST_SKIP_BY_CATEGORY`. Reuse normal chunk/photo/history derivation. Assert colour survives compression and decoding.
- [ ] **4. Measure using reviewed real data.** Build and run the existing preview/layout audit flow with a local-only visibility change; store evidence in `local/mouse/`. Record compressed list/data and initial JS bytes for `/mouse` and one product, request sequence, CLS and 360 px overflow. Existing runner: `node scripts/checks/layout-audit.mjs http://localhost:4173 local/mouse/layout`; inspect its existing route coverage and supplement `/mouse` in the mouse browser tests. Compute gzip file sizes with installed Node `gzipSync`, not a new dependency. Record measured values in MOUSE_DATA_REVIEW, restore visibility afterward.
- [ ] **5. Optimize only a measured bottleneck.** If mouse needs the monitor-style preload, update `index.html` and its matching CSP hash in `vercel.json` together, then run `tests/unit/securityHeaders.test.ts`. Do not strip colour or bypass validation for size. Mouse budget failure blocks release pending an explicit owner decision; unrelated P4-010 fixes remain outside this plan.
- [ ] **6. Verify and commit.** `npm run check` and relevant Python checks pass with hidden reviewed data. Proposed commit: `test(mouse): guard derived data visibility and payload budgets`.

### Task 9: Verify the Visible Preview, Then Publish with Approval

**Files:** new `tests/e2e/mouse.spec.ts`; `src/shell/Home.tsx`, `src/lib/registry.ts`, `vercel.json`, `scripts/checks/site-check.mjs`; home/routes/SEO tests. No new scraper workflow.

**Interfaces:** Existing `CATEGORY_LIST`, `REGISTRY`, `CATS`, `PUBLISHED` test helper and compare refs. `HOME_PERIPHERALS` becomes the visible peripheral entries from the registry, in registry order; component tiles remain unchanged.

- [ ] **1. Write release tests.** Unit tests assert mouse appears in visible peripheral navigation/home, global search, sitemap/category/product HTML and canonical metadata; stays out of SLOTS, builder picks and compat chunks. Registry/site-check parity must include mouse only when visible. Rewrites cover both `/mouse` and `/mouse/<slug>` alongside the ten existing categories.
- [ ] **2. Add browser coverage with stable inputs.** Follow `monitor.spec.ts` and `PUBLISHED`, but use intercepted fixture list/model data for exact colour/unknown/filter assertions; reuse an actual reviewed slug for one built-data smoke path. Test EN and EL; All/wired/wireless, both-mode and unknown; boolean No excludes null; URL reload/back/forward; colour narrows prices correctly; model page offers/history; compare two mice and reload; product and category metadata; no builder-fit/Add to build control; keyboard colour control; 360 px no overflow/CLS. Add an always-running hidden-state test when not published: direct mouse route and saved comparison ref are rejected; do not skip every mouse assertion while hidden.
- [ ] **3. Run the visible rehearsal.** Temporarily apply release visibility, home derivation, rewrite and site-check changes in the feature checkout. `npm run check`; `npm run e2e -- tests/e2e/mouse.spec.ts`; then full `npm run e2e` on its single port 4174. Run the Python checks below. Record results and screenshots. Restore the hidden release changes if publication has not been approved; leave tested UI work on the feature branch.
- [ ] **4. Gate C: present concrete release evidence.** Owner sees data-review report, preview, changed files, full check results, budgets and current run health. Require explicit approval to make `visible:true` and push the release. Proposed commit: `feat(mouse): publish reviewed mice catalogue and comparison`.
- [ ] **5. Publish through the existing main deployment path.** Integrate latest Actions data without rewriting history; repeat required checks if upstream changes affect results. Do not automatically run or cancel a scrape. Verify deployment readiness and then run `node scripts/checks/site-check.mjs` and `node scripts/checks/freshness.mjs` against their normal live target; inspect `/mouse`, one mouse model, search, compare, sitemap, and 96/320 px photo URLs. Ordinary daily history comes from accepted observations; a short initial chart is valid, not a reason to call Skroutz history.
- [ ] **6. Observe the next scheduled source/image runs.** Confirm three allowed source states, new rejects, prices/specs job times, and the images repository discovering mouse candidates. No external images-repo edit is planned: current generator scans the main repo category configuration. If its workflow hard-codes categories, report the exact blocker; keep any proposed external-repo patch in `local/mouse/` for review instead of working outside this project. Missing photos use existing fallback; they do not justify extra source reads.

### Task 10: Close the Handoff and Record Rollback

**Files:** `docs/PROJECT-STATE.md`, `CLAUDE.md`, mouse design, `docs/peripherals/MOUSE_DATA_REVIEW.md`, `scripts/checks/README.md`, `docs/ADDING-A-CATEGORY.md`.

**Interfaces:** Documentation reflects actual released flags, source policy, measured counts/times and evidence. It must not announce future phases as shipped.

- [ ] **1. Reconcile docs.** Record eleven visible categories only after release; update Python/site maps, source limits, mouse tests and run IDs. Mark the seven planning clarifications as implementation decisions. If ADDING-A-CATEGORY is absent, create its checklist from actual touched files, capability/tag requirements, disabled/hidden/visible gates, runtime headroom, checks and rollback; reuse verified split-job times instead of filling placeholders. Do not implement the run-split plan's optional Skroutz action consolidation here.
- [ ] **2. Record remaining uncertainty.** Report source-only models, unknown fields, normalization exceptions, photo coverage and measured performance. Richer specs such as weight, sensor and battery remain phase 4; leave them absent rather than guessed. Do not assert all product identities are proven because a sample passed.
- [ ] **3. Record reversible rollback.** Before public release, restore the hidden flag. After release, revert the release commit and adjust live-site category checks/rewrites together; preserve accepted raw mouse history/data. For a parser defect, prefer a corrected normalizer plus reviewed next Actions snapshot; do not delete existing data or rewrite public history. If disabling derivation is required, retain the data directory and restore the last known good deployment through the approved release process. Monitor freshness and existing ten categories throughout.
- [ ] **4. Verify final scope and commit.** `git diff --check`; inspect the complete feature diff and status, including untracked files, unintended visibility/data changes and the pre-existing presentation guide. Inspect new files explicitly because an unstaged untracked file is absent from `git diff`. Update task checkboxes only from evidence. Proposed documentation commit: `docs(mouse): record release evidence and category integration checklist`.

## Verification Commands

Each code task runs its focused red/green checks first. At each phase gate and before a push, run `npm run check` and `npm run e2e`; do not replace meaningful checks with text searches. Python scripts are standalone programs: PowerShell does not expand `test_*.py` into multiple Python invocations.

```powershell
# From the BuildDraft root. New temporary work stays in the project.
New-Item -ItemType Directory -Force -Path local/mouse/tmp | Out-Null
$env:TEMP = (Resolve-Path local/mouse/tmp).Path
$env:TMP = $env:TEMP

npm run check
if ($LASTEXITCODE -ne 0) { throw 'npm run check failed' }
npm run e2e
if ($LASTEXITCODE -ne 0) { throw 'Playwright failed' }
Get-ChildItem -LiteralPath scripts/checks -Filter 'test_*.py' | ForEach-Object {
    & ./venv/Scripts/python.exe $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "Python check failed: $($_.Name)" }
}
git diff --check
```

Use one Playwright worktree/server at a time. Run live site/freshness checks only after publication; capture actual exit status and results in the report. Never claim tests are green from a proposed command or from an earlier unrelated run.

## Completion Criteria

- Source policy is enforced and no unsupported mouse requests are made.
- Identity/rejection/source-retention tests pass; first real data review is accepted, with unresolved coverage limits disclosed.
- Colours share one model; distinct connection/name variants do not; unknown values never pass stated-only filters.
- Category/product pages, colour offers, search, compare, metadata, photos/fallback and home/navigation work in both languages and at 360 px.
- Mice remain excluded from builder and compatibility-engine inputs. Existing categories retain their behavior and publication guards.
- Required checks and measured payload/layout gates pass. Release and external Actions operations have their explicit approvals and recorded evidence.
- Current-state docs describe what actually shipped. No changes outside this project, no unrelated feature work, no richer-spec scraping hidden in the release.

## Deliberate Omissions

No keyboard/headset categories, `/peripherals` landing page, new scraping framework, category-folder refactor, comparison-engine rewrite, new state persistence, manufacturer scraping, mouse quality score or generic extension platform. BestPrice richer product-page specs, mouse weight/sensor/battery, the optional Skroutz commit-action consolidation and existing P4-010 remediation are separate work.

## Execution Evidence ? Gate A (2026-11-11)

Tasks 1?4 are complete locally. Mouse is still `enabled:false, visible:false`; BestPrice mouse price slices remain unset until the live preflight. No mouse source requests, push, workflow dispatch or deployment occurred.

- `npm run check`: passed; 83 suites, 1,655 tests passed, 1 skipped; typecheck, lint and build passed.
- `npm run e2e`: all 322 Chromium tests passed (8.8 minutes).
- Python gate: all 31 `scripts/checks/test_*.py` programs passed after the final source-identity fix.
- Focused mouse proof: 22 normalizer tests, 33 Skroutz collector tests, 10 pipeline/sharing tests (including 12 malformed shop identity subcases), 6 capability tests; shared Python/TypeScript photo vector matches.
- Independent code review findings were reproduced, fixed and rechecked. The shared scrape boundary now rejects mismatched source/qualified IDs and retains prior source data; no remaining Critical/Important review finding.
- Existing pipeline code already satisfied the history/photo/retention cases; no mouse-specific pipeline or specs parser was added. The only shared pipeline correction was the proven source-identity admission guard.
- Known limits: corpus has two observed titles from the design plus explicitly labelled synthetic boundary cases. Live source counts, slice edges, coverage, real-world grouping and payload gates are not yet validated. Plain cable descriptions without an explicit inclusion phrase are conservatively rejected for review.
- Task 5 and the live-data gates remain unchecked. Gate A code review precedes any approved code push or collection. Logs and detailed execution ledger remain inside `local/mouse/` and `.superpowers/sdd/2026-11-11-mouse-category/`.

Task 5 preflight started after owner approval: feature branch pushed, GitHub CI dispatched, 15 list-page probes completed. Partial findings and measured BestPrice slices are in `docs/peripherals/MOUSE_DATA_REVIEW.md`. Gate B remains open: parser coverage/colour issues and complete first-source collection are not yet resolved.
