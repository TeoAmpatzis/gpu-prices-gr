# Implementation roadmap (DRAFT for owner approval)

Status: planning only; nothing below is started. Legend: **[V]** verified, **[A]** assumption, **[P]** proposal. Works with PERIPHERALS_ARCHITECTURE.md, MONITOR_INTEGRATION_PLAN.md, UNIVERSAL_COMPARISON_SYSTEM.md, ARCHITECTURE_DECISIONS.md.

## 0. Working rules that bind every phase [V: CLAUDE.md + owner feedback]
- Nothing deploys without the owner's explicit go-ahead. Work happens in a worktree/branch, not on `main`. No commit, push, PR or issue without approval.
- Changes to scraper or data structure (`models.py`, JSON schemas, `types.ts`) wait for an approved plan (this roadmap is that plan only once approved).
- Every phase ends with `npm run check` (typecheck → lint → test → build) green plus the checks named below; the report says what is unfinished or uncertain.
- Cost 0: no paid service, no new dependency unless approved.
- Both languages for every string; dark only; 360 px works; tokens only.
- Privacy text kept true (new localStorage key `compare` → policy + `PRIVACY_UPDATED`).

## 1. Review of the proposed phase order
The sequence Architecture → Monitor Data → Monitor UI → Comparison → Builder → Release is sound with three changes [P]:
1. **Add Phase 0 (recon + prerequisites)**: monitor sources are unverified, and the closed category lists must be classified before touching types.
2. **Comparison for the existing nine does not depend on monitors.** Phase 4 can start after Phase 1 and run in parallel with Phase 2/3 if capacity allows; ship order stays monitors → compare so the owner sees one new thing at a time.
3. **Phase 5 (builder) is a separate approval.** It needs GPU output-port data that does not exist (`PART_FIELDS.gpu` has no ports [V]); decide after the rest is live.

## 2. Phases

### Phase 0: recon and prerequisites (no feature code)
Tasks: (a) read-only recon of monitor lists on the five sources, same client and delays as the scrapers, no evasion, 3–5 pages each, findings and volumes written into MONITOR_INTEGRATION_PLAN §1; (b) classify the 21 `Record<Category>` files as generic vs component-only (a table in this doc); (c) save ≥60 real monitor titles as fixtures; (d) measure photo-repo size headroom and scrape duration headroom (Skroutz ≈12 min for nine categories [V]).
Files: docs only, `scraper/debug/` (ignored), `tests/fixtures/monitor/` titles.
Exit criteria: owner confirms sources and the Skroutz decision (D2); classification table complete.
Rollback: delete docs/fixtures.

### Phase 1: architecture (registry, domains, types, routes), no visible change
Tasks: introduce `ComponentCategory`/`PeripheralCategory`/`Category`; `CategoryDef` registry with `domain`; make `CATEGORY_LIST`, `APP_SEGMENTS`, nav groups, sitemap, manifest iteration and `MIN_MODELS` read it; make `vercel.json` rewrites test-asserted against the registry (already tested by `routes.test.ts` [V]); in Python make `glitches.py`/`merge_history.py` import `CATEGORIES`; make the `scrape.yml` "nine fresh Skroutz categories" gate and `validate_skroutz.py` registry-driven (count from `CATEGORIES`, so adding monitors does not fail the gate).
Files: `src/types.ts`, `src/lib/routes.ts`, `src/shell/nav.ts`, `src/shell/site.ts`, `src/lib/derive.ts` (`MIN_MODELS`), `src/lib/sitemap.ts`, `vercel.json`, `scraper/categories.py`, `scraper/glitches.py`, `scraper/merge_history.py`, `.github/workflows/scrape.yml`, `scripts/checks/validate_skroutz.py`, tests `routes.test.ts`.
Data/migrations: none. No JSON shape changes; live output byte-identical (prove with `scripts/checks/data-equivalence.test.mts` ALL EQUAL and an e2e smoke on every existing route).
Exit criteria: `npm run check` green; zero diff in `dist` data files for the nine categories; same first-load bytes (bundle baseline); every existing e2e passes.
Rollback: revert the branch; nothing deployed depends on it.

### Phase 2: monitor data (scraper + build), not linked from the site
Tasks: `MonitorListing` in `models.py`; `scraper/normalize_monitor.py`; `Category("monitor", …)` with per-source paths; shared/settle rules; BestPrice product-page spec parser in `specs.py` (`parse_monitor`) within the existing budget; `main.PRIORITY`/`SAFER` untouched; `types.ts` `MonitorListing`; `derive.ts` list/detail/search for monitor; `public/data/monitor/` created by the scraper (additive); images repo picks the category via `CATEGORIES`.
Files: `scraper/models.py`, `scraper/normalize_monitor.py` (new), `scraper/categories.py`, `scraper/sources/*.py` (only if a source needs a path option), `scraper/specs.py`, `src/types.ts`, `src/lib/derive.ts`, tests `scraper tests` (`scripts/checks/test_*.py` style [V]).
Data/migrations: new folder `public/data/monitor/` (additive). `manifest.json` gains `cats.monitor`; consumers already skip absent categories [V `site.ts`]. First deploy: `checkData` has no live baseline for monitor and uses `MIN_MODELS.monitor` [V `derive.ts:763`], so set it from the first real run (half the count, like the 2026-10-01 rule).
Execution order: scraper change reviewed and approved first → one manual run of `scrape-shops` for `--category monitor` offline from fixtures locally → owner approves a workflow run → data commit. Local runs never push data (existing rule [V]).
Exit criteria: see section 3 (monitor data). Data must be visible in `public/data/monitor/latest.json` and `/data/monitor/list.json` but **no menu, home tile, sitemap entry or search hit** points to it yet (feature gate: registry `visible:false`).
Rollback: set `visible:false` (already hidden); remove category from `CATEGORIES` and delete `public/data/monitor/` in a data commit; history merge `check` guards the other categories [V].

### Phase 3: monitor UI
Tasks: monitor `CategoryConfig` (columns, pills, `extraFilters`, sorts), `ranking.ts` config, `SpecGroups` monitor groups, key specs, spec line, i18n strings (glossary), nav "Peripherals" group and breadcrumbs, search tag, sitemap and `pageMeta` (title/description/JSON-LD Product), home tile (owner-approved), `/parts` tile page domains, `visible:true`.
Files: `src/lib/categories.tsx`, `src/lib/categoryRules.ts`, `src/lib/ranking.ts`, `src/ui/specs.ts`, `src/components/product/keySpecs.ts`, `src/shell/{nav,Header,MegaMenu,pages,Home}*.tsx`, `src/lib/{pageMeta,sitemap,search}.ts`, `src/shell/texts.ts`, `vercel.json`, e2e specs.
Exit criteria: section 3 (monitor UI). Deploy only on go-ahead; then run `node scripts/checks/site-check.mjs` and the seo/filters e2e on the live URL [V practice].
Rollback: `visible:false` + redeploy; or revert the UI commit (data keeps collecting harmlessly).

### Phase 4: universal comparison
Tasks: `src/lib/compare/` engine, `SpecDef` definitions for monitor (native) and the adapter for the nine, tray store (`compare` key), tray + compare page components, product page and card buttons, `/compare` route + rewrite + noindex, privacy text, tests.
Files: `src/lib/routes.ts`, `src/lib/compare/*` (new), `src/components/compare/*` (new), `src/components/{ModelRow,ModelCard}.tsx`, `src/components/product/ProductHeader.tsx`, `src/content/pages.ts`, `src/shell/site.ts` (`PRIVACY_UPDATED`), `vercel.json`, `src/shell/nav.ts` (Compare link added now that the page exists).
Exit criteria: section 3 (comparison).
Rollback: hide buttons/tray via a single flag in the registry/config; revert the route.

### Phase 5: optional PC Builder integration (separate approval)
Scope proposal only: optional "Peripherals" section in the builder summary with its own total and a "Complete setup total" line; peripherals never feed the compatibility engine or `CATEGORY_RULE_SLOTS`. GPU-to-monitor info: only **stated** facts (connector types/versions) shown as neutral notes, never a "slow GPU" warning, never an incompatibility unless a connector is verifiably absent on both sides (needs new GPU port data; not in the data today [V]). Alternative: defer indefinitely (my lean for now).
Exit criteria if approved: engine snapshot tests (`tests/compat/*`) unchanged; saved builds and share links (`pcBuild`, `/builder?cpu=…`) still load unchanged (old links without peripherals stay valid).
Rollback: flag off.

### Phase 6: testing and release
Full regression, Lighthouse (mobile ≥ today's `case` page, desktop 100 target as in README), layout audit at 1920/1366/1280/1024/768/360 in EL/EN, `site-check.mjs` on the live URL, scraper run results (no blocked requests, run time within the 90 min workflow timeout), data check floors, docs update (`CLAUDE.md` file map and category recipe, `PROJECT-STATE.md`), memory notes. Deploy with owner go-ahead.

## 3. Acceptance criteria (measurable)
**Architecture (Phase 1)**
- `tsc` passes with `monitor` unused in data; all existing unit + e2e + compat suites pass unchanged (count equal to or above today's 1,440+ [V README badge; re-count in Phase 0]).
- `data-equivalence.test.mts`: ALL EQUAL; `dist/data/*` for the nine categories byte-identical.
- Adding a fake category `x` in a test registry produces: route, rewrite, menu item (when it has data), manifest entry; deleting it restores the original (registry test).

**Monitor data (Phase 2)**
- Golden-title test: ≥60 real titles, 100% correct size/resolution; ≥95% correct Hz/panel where the title states them; 0 wrong merges in a hand-reviewed sample of 200 models spanning at least 5 brands (owner reviews the sample).
- Dedup: of models listed on ≥2 sources, ≥90% carry an MPN-key (target to confirm after recon); every `weak` model is listed in a report.
- No spec is displayed that no source states (test: every field maps to a source-state record).
- `settle()` idempotent (twice = once). Scrape with 0 blocked requests; monitor category adds < 10 min to the shops run and ≤ the Skroutz budget agreed in D2.
- `checkData` rejects an empty or >30%-down monitor category (unit test).

**Monitor UI (Phase 3)**
- Every filter in MONITOR_INTEGRATION_PLAN §5 round-trips through the URL and has correct facet counts (unit test against a fixture); unknown handled as specified.
- Product page shows only stated specs, groups omitted when empty; EL and EN complete (i18n test: no missing key).
- Layout audit: 0 overflow issues at the six widths; tap targets ≥44 px on touch.
- Lighthouse mobile for `/monitor`: performance not below the lower of `case` and `ram` pages measured the same day; CLS 0.
- Menu shows Peripherals › Monitors; no empty peripheral category exists anywhere (search, menu, sitemap, home).

**Comparison (Phase 4)**
- Two monitors, two GPUs, two SSDs compare correctly end to end (e2e); GPU + monitor in one table is impossible (unit + e2e).
- Differences highlighted with a non-colour marker; "hide identical" removes exactly the identical/all-unknown rows (property test).
- URL contract round trip, corrupt localStorage tolerated, removed product shows placeholder, max 4 enforced.
- Prices: lowest, shipping, delivered total, merchant, freshness equal the category page's numbers for the same model (test compares values from `offers.ts`).
- No increase in first-load bytes on category pages (bundle baseline file); compare chunk loads only on first use.
- Privacy page lists `compare`.

**Regression (all phases)**
- Builder: `tests/compat/*` and `builder*.spec.ts` unchanged and green; saved builds load.
- Search, pricing, history, deals, aliases, sitemap tests unchanged and green.
- No change to existing `public/data/<cat>/` files caused by these changes.

## 4. Adding a category later (keyboard example) [P]
1. Registry entry (id, domain, names, icon, words, `SpecDef[]`).
2. Python: dataclass, `normalize_keyboard.py`, `Category(...)` (source paths, `model_key`, `shared`), fixtures.
3. Frontend: `CategoryConfig` (pills, filters from flagged `SpecDef`s, columns), ranking config, spec groups.
4. `MIN_MODELS.keyboard` from the first run; set `visible:true` after data looks right.
5. Tests: golden titles, filter round trip, e2e smoke; no new comparison code.
Estimate [A]: normaliser and fixtures dominate the effort; everything else is config.

## 5. Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Monitor sources blocked or restructured | medium [A] | recon first; skip a source; breaker already exists |
| Wrong merges of near-identical models | medium | MPN-first identity, no-merge rules, owner-reviewed sample, split on conflict |
| Skroutz load/ban risk | owner-level | D2: shops first, Skroutz later, no new product-page reads |
| Type split bigger than expected | medium | Phase 1 classification; stop and replan if >10 files change meaning |
| Phone Lighthouse score falls (more filters) | medium | Phase 3 measurement, facet idle chunking (existing backlog) |
| Photo repo / Pages size | low–medium [A] | measure in Phase 0 |
| Scope creep (builder, "best for gaming" scores, reviews) | high | deferred list in ARCHITECTURE_DECISIONS D9 |
