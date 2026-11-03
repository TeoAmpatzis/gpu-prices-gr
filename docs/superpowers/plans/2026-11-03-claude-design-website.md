# Claude Design Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task after Teo approves it. Use a builder and separate reviewer per task, as required by this repository. Steps use checkbox syntax for tracking.

**Goal:** Implement the complete supplied BuildDraft website locally, with individual-product catalogues and the existing functioning builder.

**Architecture:** Extend the current React views, router, design tokens, and data derivation. Preserve pricing/compatibility/persistence owners; introduce a listing-level presentation adapter and a bounded homepage feed rather than replacing the data model.

**Tech Stack:** React 18, TypeScript, Vite 5, Tailwind 3, Lucide, Vitest, Playwright; existing free dependencies only.

**Spec:** `docs/superpowers/specs/2026-11-03-claude-design-website-design.md`. Read it before executing; it owns visual references, adaptations, and invariants.

## Global Constraints

- Plan review first; no product implementation until Teo approves.
- Same checkout; local redesign branch from reviewed `362c43a` or a subsequently reviewed HEAD. No commits on main, push, deployment, workflow runs, raw data edits, scraper changes, or parallel checkouts.
- All UI copy uses existing `{el,en}` translations; dark theme only; self-hosted Greek/Latin fonts.
- Preserve original listing schemas, `src/types.ts`, engine rules, source prices, shipping semantics, saved/shared compatibility, canonical family URLs, and legacy redirects.
- New derived contracts live beside their implementation, not in scraper mirror types. Approval of this plan covers `/data/home.json`, listing presentation records, selected-listing query parameters, and `/search` + `/how-prices` routes.
- Source code and comments retain normal professional English; no generated Claude runtime or mock/sample data in production.
- Follow the spec's explicit decisions for individual products, family history, email contact, stateless sharing, 90-day median, guided builder, and unsupported controls.
- No change to `docs/PROJECT-STATE.md` without Teo's separate review of its proposed diff. Do not carry out historical backup/export instructions in this local design task.
- Every task ends with focused proof and separate review. Before each local implementation commit: build, lint, unit tests. Full browser/performance gate at Task 8.

## Review Focus

1. Similar product titles across sources: do not merge distinct SKUs or give one card another card's price/specification/history.
2. Selection no longer present after refresh: show the missing selection explicitly; do not add a substitute to the build.
3. Existing saved/unsaved build when opening a homepage preview or shared link: preserve existing replacement and recovery safeguards.
4. Unknown shipping, old prices, sparse history, missing availability: do not render false free-shipping, fresh-price, stock, or discount claims.
5. Long Greek text and small screens with overlays/sticky summaries: all controls remain usable by keyboard and touch without overflow.

## Task 1: Establish visual baseline and shared shell

**Modify:** `src/ui/tokens.css`, `src/ui/ui.css`, `src/index.css`, `src/ui/logos.tsx`, `src/shell/Header.tsx`, `src/shell/MegaMenu.tsx`, `src/shell/controls.tsx`, `src/shell/pages.tsx`, `src/shell/texts.ts`, `src/App.tsx`.

**Tests:** `tests/unit/tokens.test.ts`, `tests/unit/motion.test.ts`, `tests/e2e/shell.spec.ts`; create `tests/e2e/design-layout.spec.ts` for shared layout behavior.

**Interfaces:** Existing `Header`, `Footer`, `Button`, `Badge`, `Chip`, `Dialog`, and `BottomSheet` APIs remain compatible. Add one shared `.site-container` CSS class for the spec's exact width/padding scale.

- [ ] Confirm clean/known worktree and actual HEAD; create the local redesign branch in this checkout. Preserve unique user work if state changed.
- [ ] Capture settled pre-change home/category/product/builder screenshots, payload sizes, and Lighthouse medians with identical settings to the final measurement. Keep local artifacts in ignored `test-results/design-audit/`.
- [ ] Add layout checks for 360px Greek labels, focus-visible controls, menu/search Escape handling, focus return, and footer placement on short pages. Run and inspect the currently failing design expectations.
- [ ] Extend existing primitives and shell to match the exported tokens/components. Keep RGB token representation, contrast, semantic colors, and self-hosted fonts. Apply the shared container to header/main/footer.
- [ ] Restyle desktop/mobile menu, search box, language selection, wordmark, and footer without changing navigation behavior. Dedicated compact mobile design governs small screens.
- [ ] Run targeted token/motion/shell checks, inspect desktop/mobile settled screenshots, then run required local commit checks and obtain separate review.

## Task 2: Define individual-product presentation and selection

**Create:** `src/lib/catalogueProducts.ts`, `src/lib/productSelection.ts`, `tests/unit/catalogueProducts.test.ts`, `tests/unit/productSelection.test.ts`.

**Modify:** `src/lib/columns.ts` only if existing decoded fields need exposing; `src/lib/slots.ts`, `src/lib/buildFit.ts`, `src/lib/buildStore.ts`, `src/lib/builderOffers.ts`, `src/lib/share.ts`, `src/components/product/fitUi.tsx`, `src/components/PickView.tsx`, and `src/lib/builderState.ts` where exact selection crosses into existing builder APIs. Extend existing `tests/unit/buildStore.test.ts`, `builderOffers.test.ts`, `buildFit.test.ts`, and `share.test.ts`.

**Interfaces:**

- `CatalogueProduct<L extends BaseListing = BaseListing>` contains `key`, `familyKey`, `familySlug`, `listing: L`; `key` derives from source and listing id, never title similarity.
- `catalogueProducts<L extends BaseListing>(cat: Category, families: readonly Model<L>[]): CatalogueProduct<L>[]` flattens existing family listings without cross-source merging or mutation.
- `ProductSelection = { source: SourceName; id: string }`.
- `readProductSelection(search: string): ProductSelection | null` validates supported sources and complete pairs; partial/invalid selections are distinct invalid input in the consuming page.
- `productHref(cat: Category, familySlug: string, selection: ProductSelection): string` uses the canonical family path plus encoded `source` and `offer` query parameters.
- `resolveProductSelection(listings: readonly BaseListing[], selection: ProductSelection): BaseListing | null` requires both source and id.
- `encodeOfferChoice(selection: ProductSelection): string` writes `bd1:<source>:<encodeURIComponent(id)>`; `decodeOfferChoice(value: string)` returns a qualified choice, legacy bare id, or invalid choice. Legacy ids resolve only when unique within allowed offers. New shared links keep existing `o.<line>` keys and carry this opaque string.
- Extend `setPart(slot: Slot, part: StoredPart | null, offerChoice?: string): void` to atomically write the part and explicit offer pin; existing two-argument callers retain their behavior. Extend `addToBuild(slot: Slot, cand: FitCandidate, builtAt: string, selection?: ProductSelection)` through this path. Extend action classification to compare the qualified selection as well as canonical part key.

- [ ] Write tests for identical ids on different sources, similar names with conflicting specs, stable keys/order, missing/invalid selection, encoded identifiers, no input mutation, and no inherited sibling price/shipping. Include qualified-choice codec, unique legacy resolution, ambiguous legacy rejection, and malformed strings.
- [ ] Run these tests and confirm the missing behavior fails before implementation.
- [ ] Implement the adapter and URL selection helpers using existing decoded listing fields and family slug helpers. Do not add raw fields or replace grouping used by the compatibility engine.
- [ ] Trace each category's canonical builder identity. Resolve the selected listing to its supported canonical candidate and pin its offer atomically. If the builder groups variants, make the supported-configuration selection explicit. Same-family/different-offer selection must replace the pin after any required confirmation; exact same selection is already-in-build. If listing specifications affect compatibility, use the selected listing's measured fields through existing part adapters; never inherit a sibling's verified fit.
- [ ] Test one storage write/notification for add+pin, same-family offer replacement, exact source/id after reload/save/share/import, and unresolved pending/missing/failed requested offers. Existing fallback estimates may remain internally, but the UI and purchase actions must not represent them as the requested selected product.
- [ ] Run selection, model-address, build-fit, and builder recovery regressions. Confirm the new view layer does not import the full builder/engine into catalogue first paint. Complete checks and separate review.

## Task 3: Catalogue and mobile filtering

**Modify:** `src/components/CategoryView.tsx`, `src/components/ModelTable.tsx`, `src/components/ModelRow.tsx`, `src/components/FilterBar.tsx`, `src/components/ActiveFilters.tsx`, `src/components/BottomSheet.tsx`, `src/shell/CategoryPage.tsx`, `src/lib/facets.ts`, `src/lib/facets.worker.ts`, `src/lib/facetsClient.ts`, `src/lib/useFilterState.ts`, `src/ui/filters.tsx`, `src/ui/strings.ts`.

**Create if needed for clear ownership:** `src/components/catalogue/ProductList.tsx`, `src/components/catalogue/ProductRow.tsx`, `src/components/catalogue/ProductCard.tsx`; do not force listing behavior into a family-only renderer.

**Tests:** `tests/unit/facets.test.ts`, `tests/unit/filterUrl.test.ts`, `tests/e2e/facets.spec.ts`, `tests/e2e/links.spec.ts`, `tests/e2e/smoke.spec.ts`, `tests/e2e/design-layout.spec.ts`.

**Interfaces:** Consumes `CatalogueProduct[]` from Task 2. Filter-state URL names remain compatible. Result counts and facet counts explicitly refer to visible listing products; the worker, filters, sorting, pagination, and cards use the same record set.

- [ ] Add tests proving price/spec/source filters do not keep a product because a sibling satisfies the condition; count and paginate visible products, including duplicate source identifiers and unknown specifications.
- [ ] Add browser assertions for exact selected product links/add action, Back preserving query/page/scroll, URL refresh, no-build browse, build-fit browse, empty results, and failed/retried data.
- [ ] Implement nine category presentations with category-specific columns, full product names, source/merchant disclosure, actual price/shipping, and honest missing-data badges.
- [ ] Replace family expansion as the default with product rows/cards. Preserve family links and legacy query intent. A desktop table/cards toggle is local view state; below 1024px always use cards.
- [ ] Implement filter sidebar/group controls and mobile draft/apply sheet. Apply updates URL once; Cancel/Escape restores pre-open filters. Support reset, live result count, focus trapping/restoration, and keyboard use.
- [ ] Check 360/390px cards, 820/951px two-column cards, 1023/1024px switch, desktop and wide screens, both languages. Update old family-expansion test expectations only where this approved behavior changed. Complete checks and separate review.

## Task 4: Product detail with honest selected-product context

**Modify:** `src/components/product/ModelPage.tsx`, `ProductHeader.tsx`, `OffersTable.tsx`, `PriceHistory.tsx`, `BuildFit.tsx`, `SpecGroups.tsx`, `Variants.tsx`, `Alternatives.tsx`, `ReportError.tsx`, `keySpecs.ts`, `fitUi.tsx`, `src/ui/strings.ts`.

**Tests:** `tests/e2e/model.spec.ts`, `tests/e2e/links.spec.ts`, `tests/unit/offers.test.ts`, `tests/unit/keySpecs.test.ts`, `tests/unit/priceSummary.test.ts`, `tests/unit/productSelection.test.ts`.

**Interfaces:** Consume selection helpers from Task 2. No-selection routes retain their family overview. Selected listing is an explicit input to header/spec/action rendering; family history remains a separate named section.

- [ ] Test that selecting product A never shows sibling B's lower price/specifications as A's; test direct family links, missing selected offers, aliases preserving selection parameters, and failed/retried chunks.
- [ ] Implement screenshot layout: photo/title/spec chips/actions and price summary, offers, chart/fit columns, spec cards, alternatives, correction strip; stack into readable mobile sections.
- [ ] For a selected listing, show its source offer and label other family products as alternatives. Do not present all family listings as exact-SKU shops. Family-level photo/history must say what it represents.
- [ ] Retain existing 90-day summary, trusted-history exclusions, chart ranges, known-total ordering, and unknown availability/shipping behavior. Omit unsupported Compare control.
- [ ] Verify outbound and add-to-build actions use selected listing; verify refresh/Back and 360px offers/cards with long Greek text. Complete focused and commit checks; separate review.

## Task 5: Builder, saved builds, and shared states

**Modify:** `src/components/Builder.tsx`, `src/components/builder/Workbench.tsx`, `Start.tsx`, `PartList.tsx`, `PartCard.tsx`, `SummaryBar.tsx`, `Review.tsx`, `ShopChoice.tsx`, `PowerBreakdown.tsx`, `SavedBuildsMenu.tsx`, `CopyList.tsx`, `GuidedWalk.tsx`, `Picker.tsx`, `src/ui/builderStrings.ts`.

**Create:** `src/components/builder/ShareDialog.tsx` for dialog presentation using existing share/copy helpers; other view extraction only when ownership benefits.

**Tests:** `tests/e2e/builder.spec.ts`, `tests/e2e/builder-recovery.spec.ts`, `tests/e2e/builder-gate.spec.ts`, `tests/unit/share.test.ts`, `tests/unit/savedBuilds.test.ts`, `tests/e2e/design-layout.spec.ts`.

**Interfaces:** Preserve `StoredBuild`, canonical part keys, `encodeShare`/`decodeShare`, storage keys, and current state-controller methods. New dialogs are views over these owners, not second persistence implementations.

- [ ] Add layout/interaction tests for empty/filled freeform lists, guided steps, mobile summary at 959/960/961px, keyboard dialogs, and exact selected-product behavior from Tasks 2–4.
- [ ] Restyle start screen and both builder modes. Keep intent/budget default, automatic-build entry, parts selection, quantity/second-drive controls, undo, remove, replacement prompts, copy, and new-list actions functioning.
- [ ] Recompose existing compatibility counts/findings, load/peak estimates, purchase alternatives, and shop shipping into the designed cards/sidebar. Do not port the mock's hardcoded calculations.
- [ ] Implement saved-build and share dialog layouts; preserve rename/delete confirmation, storage-denied state, cross-tab updates, clipboard fallback, and current-list recovery.
- [ ] Present shared review using existing decoded links; style corrupt/incomplete/unavailable cases using the supplied gone-link design with accurate copy. Never claim timed expiry or cloud storage.
- [ ] Confirm sticky mobile bar does not cover the last action, browser zoom or focus target. Run existing builder/share/recovery suite, commit checks, and separate review.

## Task 6: Complete search and information pages

**Create:** `src/components/search/SearchPage.tsx`, `src/lib/searchResults.ts`, `tests/unit/searchResults.test.ts`, `tests/e2e/search.spec.ts`.

**Modify:** `src/lib/routes.ts`, `src/lib/router.ts`, `src/shell/nav.ts`, `src/shell/texts.ts`, `src/App.tsx`, `src/ui/SearchBox.tsx`, `src/components/InfoPage.tsx`, `src/content/pages.ts`, `src/shell/pages.tsx`, `vercel.json`, `tests/unit/routes.test.ts`, `tests/e2e/smoke.spec.ts`, `tests/e2e/urls.spec.ts`.

**Interfaces:** `/search?q=<query>&cat=<optional-category>&min=<optional-price>&max=<optional-price>&sort=<relevance|price-asc|price-desc>&page=<positive-integer>` is bookmarkable. `/how-prices` is an info route. Existing paths/redirects stay valid.

- [ ] Add route/rewrite/deep-link and search tests for Greek accents, token order, empty/long queries, no matches, invalid bounds/page, category filtering, stable sorting, and Back/Forward.
- [ ] Extend existing prepared search index/matching to provide complete results without its suggestion cap. Keep suggestions lightweight. Current index is family-based: result cards disclose family scope and open existing family pages; individual-product browsing is available from category pages.
- [ ] Implement result layout with category counts, item-price bounds, sorting, pagination, loading/retry/no-results, and working links. Do not show unsupported source facets, exact shipping, or prebuilt-PC inventory from this index.
- [ ] Restyle About, Contact, Privacy, and 404. Add How Prices from actual code/data behavior. Preserve the working mailbox and privacy substance; no dummy contact submission or invented policy claims.
- [ ] Wire all header/footer/home links, document titles, focus handling, prefetch, and production-host rewrites. Verify reloads with preview and route parity tests. Complete checks and separate review.

## Task 7: Full homepage with real derived data

**Create:** `src/lib/homeData.ts`, `src/lib/homeFile.ts`, `src/shell/HomeSections.tsx`, `tests/unit/homeData.test.ts`, `tests/e2e/home.spec.ts`.

**Modify:** `vite-plugin-data.ts`, `src/shell/Home.tsx`, `src/shell/site.ts`, `src/shell/texts.ts`, `src/App.tsx`; reuse `src/lib/derive.ts`, `src/lib/priceSummary.ts`, `src/lib/autoPick.ts` without duplicating their algorithms.

**Interfaces:** `HomeFile` (owned in `homeData.ts`) contains `builtAt`, `categories`, `deals`, and `builds`. `categories` has category id, listing count, and minimum item price or null; `deals` has family URL/name, trusted-history date, source `checkedAt`, current history price, median, and percentage; `builds` has budget/use/resolution, supported part identifiers/preview labels, known price/shipping details, and availability state. `loadHome(): Promise<HomeFile>` loads only this feed, with retry after errors. Keep UI text in translations.

- [ ] Test nine-category counts/minima against catalogue listing rules, sparse/glitch/stale history exclusion, correct 90-day labels, at most five drops, stable ordering, and all four budget slots.
- [ ] Test real automatic outputs through `autoFor`: use gaming 1080p for €700/€1,000, gaming 1440p for €1,500, gaming 4K for €2,500. No suitable build stays unavailable, unknown shipping stays disclosed, and missing compatibility measurements do not become verified claims. Build preview links round-trip canonical identifiers. Stale-feed and source-time tests use the spec's 24-hour policy at generation and render time.
- [ ] Generate `/data/home.json` in the existing build/dev data path from already validated inputs and already-generated automatic builds. Do not write source `public/data` or rerun scraping.
- [ ] Build hero/freshness panel, category cards, actual price drops, four ready-build previews, and methodology strip using shared shell/primitives. Counts/prices/timestamps come from data, never screenshot literals.
- [ ] Load feed after first paint with reserved section geometry and honest loading/error/empty states. Assert initial homepage requests exclude nine lists, full history, engine, and builder parts. Measure feed gzip <=20KiB and existing page budgets.
- [ ] Test opening preview with an active named/unsaved build retains safeguards. Review homepage at reference widths, both languages; complete checks and separate review.

## Task 8: Whole-site local acceptance gate

**Modify:** Existing e2e assertions only for approved layout changes; fix defects at their owning layer. No general cleanup.

**Create:** `docs/design-implementation-gate.md`; retain screenshots and detailed measurements under ignored `test-results/design-audit/`.

- [ ] Map each spec screen row to its implemented route/state and compare against supplied desktop/tablet/mobile/English references. Record justified differences: actual data, preserved formulas, family scope, email contact, invalid-link wording, and omitted unsupported features.
- [ ] Run `npm run check`; require typecheck, lint, unit/compatibility tests, and production build success. Record the existing PriceChart warning separately; no new warnings accepted without explanation.
- [ ] Run full `npm run e2e` against the production build/preview. Update structural selectors without weakening behavioral assertions; retain failing-first proof for corrected defects.
- [ ] Run layout checks for all routes at 360/390/820/951/1440px in both languages, plus representative home/catalogue/product/builder at 1366/1920/2560/3840px and breakpoint edges. Exercise overlays, focus, reduced motion, sticky bars, image failures, no-data states, and real catalogue sizes.
- [ ] Compare representative three-run mobile/desktop Lighthouse medians and compressed payloads with Task 1 baseline; preserve JS <=110KB and initial data <=300KB gzip, with permitted post-paint pick code and fonts reported separately. Investigate material regressions.
- [ ] Have an independent reviewer inspect the whole change for product identity, price/shipping truth, persistence, accessibility, and accidental deployment/configuration changes.
- [ ] Confirm `git diff` contains no source-data/scraper/workflow edits or credentials. Record local commits, passing checks, screenshot coverage, and material limitations in the gate report. Propose any PROJECT-STATE update separately.
- [ ] Run `npm run preview:local -- --host 127.0.0.1` (or build then `npx vite preview --host 127.0.0.1 --port 4173 --strictPort`) and leave the finished website available for Teo at `http://localhost:4173/`.
- [ ] Stop for Teo's visual/local acceptance. No push or Vercel deployment until a later explicit instruction.

## Planning completion

The initial inspection ran `npm run check` successfully and opened existing home/GPU/builder with no uncaught page errors. Those results describe the pre-change release only. This plan must be approved before implementation starts.
