# Architecture decisions (DRAFT for owner approval)

Status: see PLAN_RECONCILIATION.md for changes after comparison with an independent plan (D2, D3, D4, D8 updated there). Nothing here is decided until the owner answers. "Owner" marks a decision that is yours. "Mine" marks a small call I made that you can overrule. Legend: **[V]** verified, **[A]** assumption, **[P]** proposal.

Index: D1 URL shape · D2 Skroutz for monitors · D3 tray scope · D4 comparison for existing categories · D5 monitor spec depth · D6 Peripherals landing page · D7 builder integration · D8 registry scope and type split · D9 deferred features · D10 domain as data vs navigation · D11 identity by model code · D12 comparison definitions as data · D13 ranking policy · D14 delivery in increments.

---
## D1. URL shape (owner)
- **Problem:** where do monitors live: `/monitor` or `/peripherals/monitor`?
- **Alternatives:** (a) flat `/monitor`, `/monitor/<slug>`; (b) nested `/peripherals/monitor`, `/peripherals/monitor/<slug>`.
- **Tradeoffs:** (a) matches today's rule "URL segment = category id" [V `routes.ts`, owner 2026-10-04], one route shape, minimal rewrites, short links; hierarchy shows only in menu and breadcrumbs. (b) expresses the hierarchy in the path and gives a natural `/peripherals` landing; needs a second route shape, new rewrite rules, redirect logic, sitemap and search-link changes, and every later peripheral inherits the longer path.
- **Recommendation:** (a).
- **Justification:** the user-visible distinction the prompt wants is created by navigation and breadcrumbs; the path adds cost without a user benefit today.
- **Impact:** `CATEGORY_LIST`, `vercel.json` (test-checked), sitemap. Reversible later with redirects.

## D2. Skroutz for monitors at launch (owner)
- **Problem:** Skroutz is the most fragile source (WARP proxy, circuit breaker, no new product-page reads without approval [V]). Monitors add one more Skroutz list crawl.
- **Alternatives:** (a) shops only (BestPrice, Shopflix, Snif, e-shop) first, Skroutz later; (b) all five from day one; (c) Skroutz lists only, no Skroutz product pages (default under the existing pause).
- **Tradeoffs:** (a) lowest risk, but Skroutz is usually the biggest catalogue and price reference [A], so early coverage is thinner. (b) best coverage, one more category on the 12-min WARP run and a bigger failure surface. Product pages stay paused in all options.
- **Recommendation:** (c) with Skroutz **lists** enabled only after the shops-only data looks right (a then b in time), and `scrape.yml` gate made registry-driven first.
- **Justification:** keeps the proven fail-safe behaviour (a failed source keeps old data [V]) and doesn't spend Skroutz trust before monitors prove useful.
- **Impact:** `scrape.yml`, `validate_skroutz.py` gate, per-source `Category` paths.

## D3. Comparison tray scope (owner)
- See UNIVERSAL_COMPARISON_SYSTEM §3.2. **Recommendation:** B, selections kept per category, one visible group, tabs only when ≥2 groups are non-empty; no mixed table.
- **Justification:** nothing lost when browsing across categories, and no misleading cross-category table.
- **Impact:** `compare` localStorage shape `{groups:{cat:[slug]}}`; small tray UI.

## D4. Comparison for the existing nine categories (owner)
- **Problem:** existing categories expose display strings, not typed values [V].
- **Alternatives:** A adapter over `specGroups` strings (diff by equality, no ranking); B typed `SpecDef`s for all nine now; C monitors only first.
- **Tradeoffs:** A: fast, no changes to existing categories, weaker diffs. B: precise but large and touches code the builder also reads. C: smallest, but the prompt asks for a universal system.
- **Recommendation:** A now, monitors native; B per category later when wanted.
- **Justification:** the engine stays the same in A and B, so B is a later data change, not a rewrite.
- **Impact:** none on existing categories in A.

## D5. Monitor spec depth at launch (owner)
- **Alternatives:** (a) title tokens + BestPrice product pages + list spec lines; (b) add maker-site parsers; (c) title only.
- **Recommendation:** (a); makers one by one later.
- **Justification:** (a) fills the big filters (size, resolution, Hz, panel) and many connectivity fields without any new request pattern; (b) is open-ended maintenance (a maker-site redesign breaks a parser).
- **Impact:** `specs.py` `parse_monitor`; coverage reported like `builder-coverage.mts` [V]. Fields left unknown stay hidden/"—".

## D6. Peripherals landing page (owner)
- **Recommendation:** none until a second peripheral category has data; the menu item goes straight to Monitors.
- **Justification:** a landing with one tile is a signpost to nowhere, and you asked for no empty/misleading pages.
- **Impact:** none now; the registry already supports it.

## D7. PC Builder integration (owner, later)
- **Alternatives:** (a) none; (b) optional Peripherals section with separate totals; (c) full GPU-to-monitor checks.
- **Recommendation:** decide after the rest is live; lean (a)/(b). (c) is blocked by missing GPU port data [V] and must never turn performance doubts into "incompatible".
- **Justification:** peripherals must stay independent of the deterministic engine; (b) is additive and reversible.
- **Impact:** none in Phases 0–4. Engine, `Slot`, `CATEGORY_RULE_SLOTS`, saved builds untouched.

## D8. Registry scope and type split (mine; confirm)
- **Problem:** `Category` is repeated in ~10 hand-written places [V] and mixes "catalogue page" with "builder slot".
- **Alternatives:** (a) just add `'monitor'` to the union and fix every error; (b) type split + small registry (recommended); (c) full plugin framework with dynamic loading.
- **Tradeoffs:** (a) fastest now, keyboards later repeat the same ~25-file edit and builder records need monitor entries that make no sense. (b) one refactor, then new categories are config plus a normaliser. (c) overengineering for a static site with one developer.
- **Recommendation:** (b); existing categories keep their config in place (no rewrite) and only get a registry stub.
- **Justification:** smallest change that makes the next category cheap; `tsc` guards the refactor.
- **Impact:** Phase 1; zero data diff, zero UI diff (proved by tests).

## D9. Deferred to avoid complexity (mine)
Reviews/ratings, benchmark or "best for gaming" scores, price alerts, accounts, server-side comparison API, per-merchant stock, peripheral builder totals, maker-site parsers, `/peripherals` landing, cross-category compare table, rewriting the nine categories onto typed `SpecDef`s.

## D10. Peripherals as a data-level parent or a navigation grouping (answers Q1)
- **Alternatives:** (a) data parent (`public/data/peripherals/monitor/…`); (b) `domain` field in config only.
- **Recommendation:** (b). **Justification:** data is stored per category and nothing reads a parent folder; (a) would change paths used by scraper, history merge, images, derive and workflows. **Impact:** none on storage.

## D11. Monitor identity = manufacturer model code (mine)
- **Problem:** GPUs/RAM group by spec bundle; monitors with equal specs are different products.
- **Alternatives:** (a) spec bundle; (b) MPN-first with strict fallback.
- **Recommendation:** (b). **Justification:** splitting is recoverable (aliases merge later); a wrong merge shows a false price for a different product. **Impact:** `normalize_monitor.py`, alias workflow, "weak model" report.

## D12. Comparison definitions: data-driven or per-category logic (answers Q3)
- **Recommendation:** TypeScript data objects (`SpecDef`) with a generic engine; no category names in the engine. **Justification:** one definition drives filters, spec table and compare; type-checked; no JSON loader needed. **Impact:** new `src/lib/compare/`; monitors define `SpecDef`s once.

## D13. Ranking policy in comparison (mine)
- **Recommendation:** highlight differences; rank only price/shipping/delivered total; never rank panel, HDR label, sync brand, ports, size, resolution or response time across kinds. **Justification:** you asked not to assume higher is better and not to invent advantages. **Impact:** `rank` defaults null.

## D14. Delivery in increments (answers Q9)
- **Recommendation:** Phase 0 recon → Phase 1 invisible refactor → Phase 2 hidden data → Phase 3 UI → Phase 4 comparison → Phase 5 (separate) → Phase 6 release; each deployable alone, behind a `visible` flag where user-facing, each with a rollback in IMPLEMENTATION_ROADMAP. **Justification:** production stays unchanged until a phase is approved and verified live. **Impact:** deploys only on your go-ahead.

---
## Answers to the brainstorm questions in one place
1. Parent category or navigation grouping: navigation/config grouping (D10).
2. How much infrastructure can be reused: pricing, offers, history, deals, aliases, slugs, photos, search, category and product pages, filters, facets, sitemap: reused. New: normaliser, monitor specs, compare (see PERIPHERALS_ARCHITECTURE §3.5).
3. Comparison data-driven or code: data-driven definitions, generic engine (D12).
4. Introducing keyboards/mice/headsets later: registry entry + normaliser + specs (ROADMAP §4).
5. Multi-category tray: yes in storage, one visible group (D3).
6. Peripheral prices in PC Builder totals: not now; separate totals if ever (D7).
7. Specification normalisation: typed `SpecDef` per field with canonical unit and source state (`stated/conflict/unknown`); title tokens only where unambiguous (MONITOR_INTEGRATION_PLAN §2–3).
8. Limitations to fix first: closed category lists, nine-category gates, Python list duplicates, string-only specs (PERIPHERALS_ARCHITECTURE §2).
9. Incremental delivery: yes (D14).
10. Deferred: D9.
