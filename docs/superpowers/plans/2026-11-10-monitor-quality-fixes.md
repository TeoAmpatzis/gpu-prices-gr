# Monitor Quality Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Proposed; planning only. No implementation, scraper changes, publishing or workflow runs authorized by this document.

**Goal:** Publish only complete PC monitors, with reliable identities and specifications, and working product photos across the catalogue, product pages and comparison.

**Architecture:** Keep admission and title parsing in `scraper/normalize_monitor.py`; apply the same admission decision to fresh and retained listings before identity, sharing, images and history. Reuse the existing rejection report, alias/history preservation, model photo pipeline and `ProductPhoto`. No new service, dependency or listing schema.

**Tech Stack:** Existing Python scraper and unittest checks; React/TypeScript, Vitest, Vite, Playwright; existing GitHub Actions, image repository and Vercel.

**Spec:** User's PC-monitors-only requirement and the scope/product policy below; live Playwright audit on 2026-11-10. This plan supersedes the earlier monitor-photo plan only where sequencing or safety differs.

**Detailed execution plan:** [Monitor quality detailed implementation](2026-11-10-monitor-quality-implementation.md). Use that document for task order, exact interfaces, tests and commands. Its refinements supersede the task-level outline here, especially conditional alias work and the limits of title-only offline replay.

## Scope and product policy

- Include complete desktop, gaming and workstation PC monitors. Proposed interpretation: include genuine portable external PC monitors and touch/smart monitors designed for computer use.
- Exclude chargers, adapters, stands, arms, cables, protective films, replacement panels, internal case/status screens, video walls, signage, CCTV-only displays, open-frame/kiosk/POS displays, broadcast-only displays, TVs and all-in-one computers. Keep the existing exclusion of refurbished/used listings.
- Do not reject a genuine monitor merely because its title says “screen”, “portable”, “USB-C”, “touch”, “smart” or “OLED”. Do not use a manufacturer allowlist or invent a minimum diagonal to hide accessories.
- Classification must use product-purpose evidence, not just brand plus a model-looking token. For misleading titles such as ES916 and US88v1, use a small, documented exact-product exclusion in the existing normalizer when generic wording is insufficient. Do not blanket-ban those brands.
- Ambiguous suspected non-monitors stay out of the published catalogue through the existing rejection mechanism until reviewed. Missing refresh rate, missing image or missing diagonal alone does not make a real monitor an accessory.
- Keep the nine PC-part categories, builder behaviour, URLs and existing comparison semantics unchanged. No general catalogue redesign or new comparison features.

## Global constraints

- Cost remains 0. Reuse installed dependencies and current photo hosting.
- Greek and English; dark theme; desktop and 360 px mobile.
- Work from a fresh `origin/main` at execution time, not the divergent local `main`. Preserve unrelated untracked work.
- Never push PC-generated price data. Snapshot/replay experiments use temporary copies outside tracked `public/data`.
- Preserve source timestamps and failure status: cleaning retained data must never pretend the source was fetched successfully.
- Preserve history and model aliases. Never use `allow_history_shrink` or `allow_data_drop` to silence an unexplained regression.
- No new Skroutz product-page reads, scraping budget increase or paid service.
- Existing repository approval rules still govern scraper changes, pushes, workflow execution, deletion and deployment. This is a proposal for those changes, not permission to publish them.

## Audit evidence

The live data changed from 5,883 to 6,040 rows during the audit. Charger examples disappeared after a refresh, but the following defects remained. Recheck the latest snapshot before implementation.

| Defect | Reproduction / evidence |
| --- | --- |
| Cheapest product is an accessory screen | `/monitor?sort=price-asc`: Ocypus Sigma ES916, BestPrice `2164558621`, EUR 42.55 |
| Internal/dashboard screens admitted | Lian Li US88v1, BestPrice `2163855693` and `2164038236`, EUR 79.50 / 83.80; manufacturer describes a USB secondary/status screen |
| Non-PC product classes admitted | Samsung VM46B-U video wall `snif:36073664`; AG SX-19G CCTV `bestprice:227077204`; ELO open-frame 2295L `snif:39913930` |
| No photos | Published monitor photo bitmap contains only zero bytes; catalogue, product and compare views show icons |
| Diagonal parsing corrupts filtering | ES916 9.16 and US88v1 8.8 become unknown; Anmite AW03 is displayed as 3 inches, although its source URL identifies A185W03 / 18.5 inches |
| Specification becomes model code | ELO 2495L listing `bestprice:225960199` becomes `/monitor/elo-600nit`; 600NIT is brightness |
| Retained listings bypass new rejection rules | `settle()` rebuilds from stored parsed fields; it does not re-evaluate title admission after a source failure or partial-source run |

Screenshots and captured data: `C:/Users/Teo/AppData/Local/Temp/builddraft-monitor-audit/`. They are evidence, not a stable test-data dependency.

## Review focus

1. Misleading accessory titles without an obvious prohibited word: exclude the verified accessory while retaining genuine monitors from the same brand. Task 1.
2. A failed/unselected source retains an old charger with `reject=None`: reject it without changing its timestamp or deleting history. Task 1.
3. Missing stored list-spec text: do not rebuild every retained field from its title and erase legitimate source/page observations. Tasks 1 and 2.
4. A model rename or split changes URLs, history keys and photo IDs: preserve only proven one-to-one aliases; do not merge distinct products. Task 2.
5. The image index or a photo cannot load: keep the icon fallback, but fail the release evidence if photo coverage is inadequate. Task 3.

## Task 1: Enforce PC-monitor admission on fresh and retained data

**Files:**
- Modify `scraper/normalize_monitor.py` (`REJECT`, `parse`, `settle`).
- Extend `scripts/checks/test_normalize_monitor.py` with real negative and positive examples.
- Extend `scripts/checks/test_source_status.py` only for retained-source integration assertions.
- Create `scripts/checks/monitor_admission.py`: a small read-only snapshot check using the normalizer's admission helper, not another blacklist.

**Interfaces:** Add `rejection_reason(title: str, specs: str = "", size: float | None = None) -> str | None` in the normalizer. Reuse existing rejection reasons/fields. `parse()` and `settle()` call it; `settle(listings: list[dict]) -> None` retains its public signature. Snapshot checker accepts a path to `latest.json`, names offending IDs/reasons, and exits nonzero if any published row should be excluded.

- [ ] Add failing tests for ES916, both US88v1 colours, video wall, CCTV, open-frame/POS, broadcast display, and the previously observed chargers/protectors. Verify product-purpose evidence for each negative example; save the title and evidence URL with the fixture.
- [ ] Add positive controls: normal desktop/gaming monitors, a 57-inch PC ultrawide, a genuine portable USB-C monitor, a touch PC monitor, and genuine products from a brand appearing in a negative example.
- [ ] Add a retained-row regression: `reject=None` on an old charger must become rejected; valid retained specs, source freshness/status and history remain unchanged. Running settlement twice must give the same result.
- [ ] Run `venv/Scripts/python.exe scripts/checks/test_normalize_monitor.py`; confirm new tests fail for the observed defects before editing production code.
- [ ] Implement the shared admission decision at the existing ingestion/settlement boundary. Recheck known size bounds and explicit page/title evidence before grouping. Do not replace all retained fields with a title-only parse.
- [ ] Run the normalizer and source-status checks. Run the snapshot checker on a temporary copy of the current published dataset; review every removed row and record accepted/rejected counts per source.
- [ ] Run `npm run check` before a local commit. Deliverable: excluded products cannot enter a new published snapshot even when one source fails. Do not push.

## Task 2: Correct diagonal and model-code extraction without losing identity

**Files:**
- Modify `scraper/normalize_monitor.py` (`_size`, `NOISE`, `_code` and only the necessary parsing path).
- Extend `scripts/checks/test_normalize_monitor.py` and relevant fixtures.
- Inspect `scraper/sources/skroutz.py` and `scripts/checks/test_skroutz_collector.py`; change them only if a saved list-card fixture proves the shared source parser is responsible.
- Adapt `scripts/checks/refresh_aliases.py` and `scripts/checks/test_refresh_aliases.py` for monitor-safe replay; use `scraper/model_aliases.json` for reviewed identity changes.
- Extend `scripts/checks/renormalize_diff.py` only as needed to report monitor rejection, identity and spec changes faithfully; its current generic field report does not exercise monitor settlement.

**Interfaces:** Keep `parse(title, specs) -> Parsed`, `make_listing(...)` and `settle(...)` compatible. No schema additions. A parsed diagonal needs a genuine size token; a model code must not be a brightness, refresh, resolution or response-time token.

- [ ] Add failing assertions: explicit `9.16"` -> 9.16 and `8.8"` -> 8.8 at parsing level, although Task 1 still excludes those accessories; `23.8IN` -> 23.8; the suffix `03` in `AW03 IPS` must never become a 3-inch diagonal.
- [ ] Capture the Anmite list-card input using permitted listing access, not a Skroutz product-page fetch. Assert the trustworthy list-spec diagonal becomes 18.5 if actually stated; otherwise preserve unknown instead of inventing 18.5 from the model code or URL.
- [ ] Assert the exact ELO title containing `2495L ... 600NIT` produces code `2495L`, not `600NIT`. Add controls for real numeric/suffixed model codes and brightness-unit variants.
- [ ] Run the focused tests and confirm failures, then fix token boundaries, units and model-token exclusions in their existing owners. Retain strict panel/size/refresh/revision disagreement handling and the no-unknown-bridge rule.
- [ ] Replay the current monitor snapshot offline, including settlement and cached page evidence. Report changes to IDs, codes, sizes, model keys, rejections and grouping; run the existing matching/barcode corpus and idempotence checks.
- [ ] Before generating monitor aliases, add failing helper tests for rejected rows with an empty `chip`, identity resolved using cached page evidence, absent `history_imported.json`, and preserved existing history markers. Adapt `refresh_aliases.py` to apply the same early cached evidence and settlement as production, form targets only from accepted rows, and treat an absent imported-history file as `{}`. Never alias a rejected product to an empty key or another product.
- [ ] Generate aliases only for proven same-product renames. Review ambiguous splits rather than force-aliasing them. Keep old price points; verify the history guard without shrink. Rejected accessories' old history may remain stored but must not enter catalogue/search/compare data.
- [ ] Run normalizer, alias/history checks and `npm run check` before a local commit. Deliverable: corrected specs and identities with preserved valid links/history. Do not push or write production data from the PC.

## Task 3: Enable the existing monitor photo pipeline

**Dependencies:** Tasks 1 and 2 first, so rejected products do not get new photos and renamed keys do not waste image work.

**Files:**
- Modify `scraper/categories.py`: enable the monitor's existing `images` capability.
- Extend `scripts/checks/test_normalize_monitor.py` for the capability and `main.write_image_urls` behaviour using a temporary directory.
- Inspect/reuse `scraper/main.py`, `scraper/images.py`, `vite-plugin-data.ts`, `src/lib/images.ts`, `src/components/ProductPhoto.tsx` and the existing image repository. Change these only for a reproduced pipeline failure.
- Extend `tests/e2e/monitor.spec.ts` with deterministic local image/index fixtures for list, product and comparison views.

**Interfaces:** Preserve `image_urls.json`, the existing model photo hash, `IMAGES_INDEX`, 96/320 WebP assets, `/img/` rewrite and `ProductPhoto` props. This restores existing family photos; the separate exact-listing-photo branch stays parked. Do not imply an exact variant photo when only a family photo is known.

- [ ] Add a failing test: an accepted monitor with a shop image generates a candidate entry; a rejected accessory does not. Image URLs remain out of `latest.json` and browser list rows after candidate extraction.
- [ ] Enable images for monitors, then run the focused test. Verify existing image generation discovers monitor candidates without a new workflow or new hosting service.
- [ ] Rehearse with temporary data and 20-30 downloaded shop photos. Use a local image index/server and Playwright routing for `/img/monitor/*`; do not push candidates or assets during rehearsal.
- [ ] Assert loaded images have `naturalWidth > 0` in table/cards, product header and comparison at desktop and 360 px. Test a missing index and a broken image: the existing icon fallback must work without a broken layout.
- [ ] Measure a representative full-size local candidate export after the approved collection step: target at least 90% candidate coverage and, before completion, at least 90% published photo coverage by accepted model. Spot-check 30 images for correct product family, placeholders and unwanted products. Reuse the existing blocklist for bad photos.
- [ ] Run `npm run check` before a local commit. Deliverable: the existing pipeline can supply monitor photos without shipping raw shop URLs or importing the unrelated exact-photo feature.

## Task 4: Verify the complete correction and prepare the release

**Files:** Extend `tests/e2e/monitor.spec.ts`, `scripts/phase3/monitor-gates.mts` only for missing relevant assertions, and the checks README. The Python admission helper remains the single admission-policy owner; do not duplicate its growing rules in TypeScript.

- [ ] Add deterministic Playwright regression data with accepted monitors and the observed negative cases passed through corrected derivation. Assert cheapest-first, brand/size filters, search, product links and comparison operate on accepted products; excluded current records have no product offer to select. Old saved comparison references to removed items must show unavailable safely.
- [ ] Run `venv/Scripts/python.exe scripts/checks/test_normalize_monitor.py`, `test_source_status.py`, the affected alias/history/source checks and the read-only monitor admission checker. All applicable checks must pass.
- [ ] Run `npm run check`, then `npm run e2e -- monitor.spec.ts aliases.spec.ts smoke.spec.ts`. Run the full e2e suite once before release because category membership, shared URLs and model keys are affected.
- [ ] Run `node node_modules/vite-node/vite-node.mjs scripts/phase3/monitor-gates.mts` against matching corrected input and freshly built output. Preserve existing coverage, false-merge and size thresholds; report pre-existing failures instead of relaxing them.
- [ ] Repeat the Playwright audit in Greek and English at 1440 px and 360 px: cheapest-first, table/cards, filters, product pages and comparison. Save screenshots and list the exact accepted/excluded IDs.
- [ ] Measure median-of-three Lighthouse runs for the monitor list and a representative product page. Require mobile >=90, desktop 100, CLS 0, initial JS <=110 KiB gzip and data <=300 KiB gzip; investigate photo-induced LCP regression over 100 ms. Check other-category frozen-data outputs remain unchanged.
- [ ] Produce one release checklist: commits, removed listings with reasons, spec/identity changes, aliases, history proof, photo coverage, test results and measured performance. Resolve any material gate failure before proposing publication.

## Publication sequence and rollback

These are future release steps requiring the repository's existing authorization; do not execute while planning.

1. Record the current production commit and Vercel deployment. Review current `origin/main` and the offline replay before each push; scheduled data commits will have advanced it.
2. Publish the admission/parser correction with reviewed aliases. Let the scheduled Skroutz and shop runs produce data, or request approval for a manual run. Verify retained-source cleanup works even if one source fails. Do not manually replace production JSON from the PC.
3. Verify zero identified non-PC products remain in published lists/search/model selections/comparison; check history preservation and source counts/status. A freshly rejected product must not silently return in the next scheduled run.
4. Enable monitor candidate production after the data correction is verified. Wait for both source workflows to contribute image URLs; start the image repository's existing job only with approval, or wait for its schedule.
5. Wait for a subsequent Vercel build to consume the populated image index. Asset upload alone does not update the site's photo bitmap. Verify actual image requests and >=90% accepted-model photo coverage on the live site before declaring photos complete.
6. Repeat live smoke, cheapest-first and sample exclusion checks after the next normal collection cycle. Report remaining unknown specs honestly.

Rollback: retain the last good deployment and code commits. Revert only the responsible change; never reset main over newer price/history commits. If corrected identities require reversal, review aliases/history before rolling code back. Disabling image candidate generation does not remove already indexed photos; use the existing image blocklist for a wrong image. A deployment rollback may re-expose old contamination, so use it only with that consequence stated.

## Stop condition

The known unwanted products are excluded from all published monitor surfaces; a retained source cannot bypass admission; observed dimension/model-code regressions are fixed; accepted monitors have verified photo coverage through the existing pipeline; history, legitimate portable monitors and the other nine categories are preserved; local and live release checks pass. No new feature work beyond this correction.
