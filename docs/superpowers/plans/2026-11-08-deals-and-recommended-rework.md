# Deals, Recommended and Catalogue Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "deal", "lowest" and "Recommended" signals correct and explainable, make filters start empty (empty = all), fix the unreadable sort control, and close the SEO gaps found in the 2026-11-08 test.

**Architecture:** Keep the existing build-time derivation (`src/lib/derive.ts` writes compact columns into `list.v2.json`; the browser only decodes). New pure modules `src/lib/sanity.ts` (suspect prices) and `src/lib/deals.ts` (deal and lowest from history) are called from `derive.ts`; `ranking.ts` consumes their results and is computed once per category at build time. UI changes are small edits to existing components.

**Tech Stack:** TypeScript, React 18, Vite, Vitest, Playwright, Python 3.12 scraper (unchanged).

**Spec:** `docs/superpowers/specs/2026-11-08-deals-and-recommended-rework-design.md`

## Progress (updated 2026-11-08, end of session)

| Task | Status |
|---|---|
| 1 Readable sort control | done, deployed (origin/main 9c7e142) |
| 2 Filters empty = all | done, deployed. The two motherboard Socket lists are labelled "Main sockets" / "All sockets"; the merge into one list was tried and dropped (it broke builder-gate f-guided-1366-en, cause unknown) |
| 3 Tap targets | done, deployed |
| 4 Sanity guard | done, committed locally (66bbcb6), not deployed. Limits are 25% / 5x (design said 40% / 3x; 40% flagged 1.2% of real data) |
| 5 Deal engine | done, committed locally (304248f, 4407119), not deployed. No list-format bump was needed (optional columns) |
| 6 Recommended v2 | done, committed locally (c89a143), not deployed. "Best deals" is still the old "Biggest discount" sort |
| 7 Quick build RAM | NOT started |
| 8 SEO phases 1-2 | NOT started |
| 9 Audit script | done, deployed. After tasks 4-6: deals 97%, lowest 100%, recall 57% (target 60%), 0 suspect in top 40 |

**Continue here:** ask the owner to deploy tasks 4-6 (merge `origin/main`, push `design/deals-rework:main`, verify the live site), then do Task 7, then Task 8, then re-run `npx tsx scripts/checks/deal-audit.mts` after a build.

## Global Constraints

- Initial data <= 300 KB gzip; JS <= 110 KB gzip; home feed <= 20 KiB gzip (spec section 3).
- `list.v2.json` format changes bump `v` and the decoder together (`assertListFormat`, `src/lib/columns.ts`).
- Deal: reference = median of daily lows over the 30 days before today; needs >= 10 points and >= 2 shops; deal when price <= reference x 0.93 (T = 7%); "lowest" only when strictly below the previous minimum and >= 3% under the reference.
- Suspect price: below 40% or above 3x of the peer median (peers: same unit class; >= 3 other listings).
- Shops' own claims (`listing.drop`) are shown only as a small "shop says" note, never as the main badge or in ranking.
- Filters: empty `groups` and `sources` mean all; the segment control stays single choice.
- No push to `main` and no deploy without the owner's go-ahead; work on branch `design/deals-rework`. Free tier only.
- Do not touch `tests/compat/v1-rules.ts` (frozen).

## Review Focus

1. A model with fewer than 10 history points: no deal, no lowest, no crash. (Task 5 test)
2. A price flat for 30 days with a shop badge of -37%: no deal. (Task 5 test)
3. A one-day spike followed by a "drop" back to normal: no deal. (Task 5 test)
4. Two shops only, or one shop: no deal for a single-shop model. (Task 5 test)
5. Old shared URLs with a full explicit `groups`/`sources` list, and URLs with a subset: still open and narrow correctly. (Task 2 test)

---

### Task 1: Readable sort control

**Files:**
- Modify: `src/components/catalogue/catalogue.css` (`.catalogue-sort`, around line 438-451)
- Modify: `src/index.css` (add one global rule next to the form-control comment, around line 80)
- Test: `tests/e2e/smoke.spec.ts` (new test `sort control options are readable`)

**Interfaces:** Produces nothing other tasks use.

- [ ] **Step 1: Write the failing test** in `tests/e2e/smoke.spec.ts`: open `/gpu`, read computed `background-color` and `color` of `select.catalogue-sort option` (first); assert the two colours differ in luminance by at least 4.5:1 and the background is not `rgb(255, 255, 255)` in dark theme.
- [ ] **Step 2: Run** `npx playwright test tests/e2e/smoke.spec.ts -g "sort control"`; expected FAIL (option background is white).
- [ ] **Step 3: Fix.** `.catalogue-sort` gets `background-color: rgb(var(--panel)); color: rgb(var(--fg));` (replace `background: transparent` for the sort only); add global `select option, select optgroup { background-color: rgb(var(--panel)); color: rgb(var(--fg)); }` in `src/index.css`.
- [ ] **Step 4: Run the same test**; expected PASS. Also check light theme manually via `data-theme="light"` in the test.
- [ ] **Step 5: Commit** `fix(ui): readable sort and select options on dark theme`.

### Task 2: Filters empty = all (groups and sources), merged Socket facet

**Files:**
- Modify: `src/lib/data.ts` (`defaultFilters` 301, `activeFilterCount` 328, `filterModels` 360-364)
- Modify: `src/lib/filterUrl.ts` (encode/decode vs defaults, 47 and 72), `src/lib/facets.ts` (39), `src/components/ActiveFilters.tsx` (21), `src/components/FilterBar.tsx` (83, 105), `src/lib/categoryRules.ts` (mobo `extraFilters` 243: merge Socket)
- Test: `src/lib/data.test.ts` (or the existing filter tests), `src/lib/filterUrl.test.ts`, `tests/e2e/filters.spec.ts` (new)

**Interfaces:**
- Produces: `defaultFilters(groups: string[], pick?: boolean): Filters` returns `groups: []`, `sources: []`; `filterModels` treats an empty list as "no restriction". `Filters` type unchanged.

- [ ] **Step 1: Failing unit tests.** `defaultFilters(['A','B']).groups` equals `[]` and `.sources` equals `[]`; `filterModels` with default filters returns every listing; with `groups: ['A']` returns only group A; `activeFilterCount(defaultFilters(g), g)` is 0 and 1 after setting `groups: ['A']`.
- [ ] **Step 2: Failing URL tests.** Decoding `?groups=A,B` (a full old list) equals showing all; `?groups=A` narrows; encoding default filters produces no `groups`/`sources` params; round trip keeps `groups: ['A']`.
- [ ] **Step 3: Implement** in `data.ts`: `groups: []`, `sources: []`; in `filterModels` use `(f.groups.length === 0 || f.groups.includes(cfg.group(l))) && (f.sources.length === 0 || f.sources.includes(l.source))`; `activeFilterCount` counts `f.groups.length ? 1 : 0` and `f.sources.length ? 1 : 0`. Update `filterUrl.ts` and `facets.ts` (counts per group computed with the group restriction removed, as now) to the same convention; `FilterBar` checkboxes show `checked` only when the value is in the list; `ActiveFilters` shows a chip per selected value.
- [ ] **Step 4: Merge Socket.** For mobo, remove the separate pre-ticked socket group heading: keep `cfg.groups` as the main Socket facet but list every socket (AM5, AM4, LGA1851, LGA1700 and all others from the data, ordered by count) and delete the duplicate `extraFilters` Socket entry; keep Platform.
- [ ] **Step 5: Run** `npx vitest run` (fix tests that assumed full lists) and `npm run typecheck`; expected PASS.
- [ ] **Step 6: Playwright** `tests/e2e/filters.spec.ts`: for each of the 9 categories, no checkbox in the sidebar is checked except the Segment control; ticking one value reduces the count; "Clear filters" restores it; reload keeps the state; `/mobo?groups=AM5,AM4,LGA1851,LGA1700,Other` (old link) shows all boards.
- [ ] **Step 7: Commit** `feat(filters): empty selection means all; merge motherboard sockets`.

### Task 3: Tap targets

**Files:** Modify `src/components/catalogue/catalogue.css` (`.catalogue-product-name a`). Test: `tests/e2e/smoke.spec.ts` (phone viewport).

- [ ] **Step 1: Failing test:** at 390 px, first product-title link in `/psu` has bounding height >= 24 px.
- [ ] **Step 2: Fix:** `.catalogue-product-name a { display: inline-block; min-height: 24px; padding-block: 3px; }` without changing desktop row height by more than 4 px.
- [ ] **Step 3: Run, commit** `fix(ui): 24px tap target for product titles`.

### Task 4: Sanity guard for prices

**Files:**
- Create: `src/lib/sanity.ts`; Test: `src/lib/sanity.test.ts`
- Modify: `src/lib/derive.ts` (`listFile`, builder files; call `suspectListings` before `groupModels`), `src/lib/data.ts` (`Model.suspect?: string[]`)
- Create (build output): `dist/data-report.json` via `vite-plugin-data.ts`

**Interfaces:**
- Produces: `export interface Suspect { id: string; price: number; peerMedian: number; rule: 'low' | 'high' }`
- Produces: `export function suspectListings<L extends BaseListing>(cat: Category, listings: L[]): Map<string, Suspect>` keyed by `listingId(l)`.
- Produces: `export const PEER_LOW = 0.4; export const PEER_HIGH = 3; export const MIN_PEERS = 3;`

- [ ] **Step 1: Failing tests** with fixtures: (a) PSU listing `850W Platinum` at 28.66 among 80 listings of the same tier around 140 (per watt) is suspect `low`; (b) 1200W Platinum at 29.42 suspect; (c) RAM `DDR4 4GB (1x4GB)` at 464.96 among kits around 30 is suspect `high`; (d) a model with 2 other listings is never flagged; (e) a listing at 0.45 x median is not flagged; (f) deterministic order.
- [ ] **Step 2: Run, expect FAIL** (module missing).
- [ ] **Step 3: Implement.** Peer key per category: psu = watts band + efficiency tier, price per watt; ram/storage = type, price per GB; fan = size, price per fan (`pack`); others = same `modelKey`, raw price; compare each listing with the median of the others.
- [ ] **Step 4: Wire into `derive.ts`:** drop suspect listings before computing `cheapest`, `bestTotal`, ranking, deals and builder rows; keep them on the model's listing list flagged `suspect` for the product page ("price looks wrong"); write counts and details to `dist/data-report.json`; print a warning when more than 0.5% of listings are flagged.
- [ ] **Step 5: Run** `npx vitest run`, `npx tsx scripts/checks/data-equivalence.test.mts` (must still pass with the guard on both sides), `npm run build`; expect the three known cases in `dist/data-report.json`.
- [ ] **Step 6: Commit** `feat(data): suspect price guard`.

### Task 5: Deal engine and list format bump

**Files:**
- Create: `src/lib/deals.ts`; Test: `src/lib/deals.test.ts`
- Modify: `src/lib/data.ts` (`Model.deal?: Deal | null`, `Model.lowest?: Lowest | null`; remove `saleOf` use in `filterModels`; keep `saleOf` exported only for the "shop says" note), `src/lib/derive.ts` (~575-585 compute deal per model and add columns), `src/lib/columns.ts` (bump `v`, decode the new columns), `src/lib/builderData.ts` (434-441 `drop` becomes `deal`), `src/components/ModelRow.tsx` (80-90 badges, 206 shop note), `src/components/builder/PartCard.tsx` (53), `src/components/FilterBar.tsx` (157: "On sale only" becomes "Deals only"), `src/lib/i18n.ts` (texts), `src/lib/data.ts` sort key `discount` uses `deal.pct`.

**Interfaces:**
- Produces: `export interface Deal { pct: number; reference: number; days: number }` and `export interface Lowest { since: string }`.
- Produces: `export const DEAL_THRESHOLD = 0.07; export const LOWEST_MARGIN = 0.03; export const REFERENCE_DAYS = 30; export const MIN_POINTS = 10; export const MIN_SHOPS = 2;`
- Produces: `export function dealOf(points: DailyLow[] | undefined, price: number, shops: number, today: string): Deal | null`
- Produces: `export function lowestOf(points: DailyLow[] | undefined, imp: Imported[string] | undefined, price: number, today: string): Lowest | null`
- Consumes: `untrustedPoints` from `src/lib/dips.ts`; `suspectListings` from Task 4.

- [ ] **Step 1: Failing tests** (`deals.test.ts`), with `today = '2026-11-08'` and synthetic daily points:
  - flat price for 30 days, price today equal: `dealOf` is `null`.
  - median 100 over 30 days, price 90: `{ pct: 10, reference: 100, days: 30 }`.
  - median 100, price 94 (6%): `null`; price 93: deal.
  - fewer than 10 points: `null`; `undefined` points: `null`; `shops = 1`: `null`.
  - 29 days at 100, one day at 150 (spike), price 100 today: `null`.
  - `lowestOf`: price equal to previous minimum: `null`; strictly lower by 1%: `null`; lower by 3% with 60+ days: `{ since }`; under 60 days of history: `null`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** `deals.ts` (median of daily lows in `[today-30, today)` excluding `untrustedPoints`; no `Date.now()`; `today` is a parameter).
- [ ] **Step 4: Wire derive and columns.** Add per-model `deal` (rounded percent and reference) and `lowest` (since date) columns; bump `v`; update `decodeList`/`fromColumns` and `assertListFormat`; update `builderData.ts` row field from `drop` to `deal`.
- [ ] **Step 5: UI.** `ModelRow` shows "−N% vs 30-day typical" with the reference in the tooltip, "lowest" badge only for `lowest`; the per-offer "shop says −N%" note stays at line 206 in a muted style; filter and sort named "Deals".
- [ ] **Step 6: Run** `npx vitest run`, `npx tsx scripts/checks/data-equivalence.test.mts`, `npm run build`, bundle size check (initial data <= 300 KB gzip).
- [ ] **Step 7: Audit** with `scripts/checks/deal-audit.mts` (Task 9): precision >= 90%, recall >= 60%; if short, adjust only the constants above, not the structure.
- [ ] **Step 8: Commit** `feat(deals): history-based deal and lowest; shop claims as a note`.

### Task 6: Recommended v2

**Files:** Modify `src/lib/ranking.ts`, `src/lib/data.ts` (`applyFilters` sort, ~395-410), `src/lib/derive.ts` (compute `rank` once per category), `src/lib/value.ts` (value only on non-suspect). Test: `src/lib/ranking.test.ts`, `scripts/checks/ranking-golden.test.mts`.

**Interfaces:**
- Produces: `export function categoryScores<L extends BaseListing>(models: Model<L>[], category: Category, value?: (m: Model<L>) => number | null): Map<string, number>` computed on the full category; `recommendedScores` is removed and callers use the stored score.
- Produces: `RankConfig` gains `dealBoost: number` (0.03) and loses `saleBoost`; GPU and CPU configs set `weights.price = 0`.
- Produces: new sort key `'deals'` in `SortKey` and `SORTS` (`filterUrl.ts` 29).

- [ ] **Step 1: Failing tests:** two models keep their relative order when a filter removes other models; a model with `deal` scores at most 3% above the same model without; GPU fixture: RTX 5070 Ti above RTX 5050 and above RX 9060 XT 8GB; RTX 5090 inside the top 40; PSU fixture: no class at < 40% of the category median per watt in the top 20.
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement** per spec WS3 (demand proxy = distinct shops and sources, capped; quality tier tables kept; value on non-suspect prices; price fit only for case, fan, cooler).
- [ ] **Step 4:** add "Best deals" to the sort menu (`CategoryView.tsx` ~226); keep "Recommended" label only if the golden test passes, else "Popular".
- [ ] **Step 5: Run** unit tests, golden test on built data (`dist/data`), `npm run build`. **Step 6: Commit** `feat(ranking): stable Recommended v2, Best deals sort`.

### Task 7: Quick build RAM and PSU name

**Files:** Modify `src/lib/autoBuild.ts` (RAM pick), `src/components/ModelRow.tsx` (PSU class shows cheapest product name). Test: `src/lib/autoBuild.test.ts`.

- [ ] **Step 1: Failing test:** on a dual-channel platform with >= 16 GB total, the chosen kit has `modules === 2` when one exists within 15% of the cheapest single-module kit's price per GB; non-suspect listings only.
- [ ] **Step 2: Implement, run `npx vitest run`, commit** `fix(builder): prefer dual-channel kits`.

### Task 8: SEO phases 1 and 2

**Files:** Modify `index.html`, `src/shell/` route head handling (new `src/lib/pageMeta.ts`), `vite-plugin-data.ts` (sitemap), `public/robots.txt`. Test: `src/lib/pageMeta.test.ts`, `tests/e2e/seo.spec.ts`.

**Interfaces:** Produces `export function pageMeta(path: string, lang: 'el' | 'en', data?: { name: string; low: number; shops: number }): { title: string; description: string; canonical: string }`.

- [ ] **Step 1: Failing tests:** `/gpu/rtx-5060-ti-8gb` gives a title containing the model and "BuildDraft.gr", a description mentioning the lowest price and the shop count; `/gpu` and `/` differ from each other; canonical has no query string.
- [ ] **Step 2: Implement** `pageMeta` and set `document.title`, `meta[name=description]`, `link[rel=canonical]` on route change; add `JSON-LD` `Product` + `AggregateOffer` on model pages; generate `sitemap.xml` (index and per-category chunks) at build and add `Sitemap:` to `public/robots.txt`.
- [ ] **Step 3: Playwright:** every category page has a distinct description; a model page has JSON-LD with `lowPrice`; `/sitemap.xml` returns 200 XML. **Step 4: Commit** `feat(seo): per-page meta, canonical, sitemap, structured data`.

### Task 9: Audit script

**Files:** Create `scripts/checks/deal-audit.mts` (from the 2026-11-08 analysis: precision of deal and lowest against the 30-day median using `public/data/<cat>/history.json`, recall of genuine drops >= 8%, top-40 sanity per category); add a row to `scripts/checks/README.md`.

- [ ] **Step 1:** implement printing the table in spec section 7 and exiting non-zero below the targets. **Step 2:** run it before Task 5 (baseline must match 31%/37%/19%) and after Tasks 5-6 (targets). **Step 3: Commit** `chore(checks): deal and ranking audit`.

---

## Self-review notes

- Spec coverage: WS1 Task 4, WS2 Task 5, WS3 Task 6, WS4 Task 2, WS5 Task 7, WS6 Task 8, WS7 Tasks 1 and 3, WS8 Task 9 plus the tests in each task. The owner's decisions (shop claims shown as a note, SEO phases 1 and 2, Source empty = all, readable sort control) are in Tasks 5, 8, 2 and 1.
- Order: Tasks 1-3 are independent and quick; Task 9's baseline run goes first before Task 5; Tasks 4 -> 5 -> 6 are sequential.
- Deployment is not part of any task: after Task 6 and the audit, the owner decides when to merge to `main`.
