# Exact Product Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task after approval. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show verified photos of the actual selected hardware variant throughout the local redesigned site without material speed regression.

**Architecture:** Preserve price families and source-qualified listing IDs. Extend the existing offline WebP pipeline with listing-bound verification and immutable revisions, then carry one compact revision field through existing data files and photo components. Unknown identity resolves to the existing icon.

**Tech Stack:** Existing Python/Pillow, TypeScript/React 18, Vite, Vitest and Playwright. No new frontend runtime dependency or external service.

**Spec:** `docs/superpowers/specs/2026-11-05-exact-product-photos-design.md` (proposed; review before execution).

## Global Constraints

- Local only until user approval; no push, deployment, remote image workflow or branding change.
- Shop-owned photos only; manufacturer pages provide corroboration, not replacement asset licensing.
- Keep existing price/history families, IDs, URL selection and saved build identities.
- No family-image fallback, fuzzy identity approval or automatic cross-source image sharing.
- 96px/320px contained WebP; 8 KiB/32 KiB caps; quality 80, then 75, then 70; hold failures.
- JS <=110 KB gzip; initial data <=300 KB gzip; home feed <=20 KiB gzip; added photo metadata <=5 KiB gzip/category.
- Matched baseline/candidate medians: LCP increase <=100ms; performance score decrease <=2; CLS increase <=0.01 and absolute CLS <=0.1.
- Price scraping gains no page requests; image downloads remain a throttled separate job.

## Review Focus

1. Source reuses an existing listing ID: changed title/MPN evidence must revoke approval (Task 1/2).
2. Shopflix abstract SKU contains multiple variants: no exact approval from that SKU alone (Task 1/2).
3. Slow old image finishes after offer switch: current photo stays correct (Task 4).
4. Saved/shared offer disappears: resolved fallback title, price and photo agree (Task 4).
5. Interrupted generation or blocked asset: no incomplete pair or stale approved entry becomes displayable (Task 2/3).

## File ownership

- `scraper/main.py`, source adapters and `scraper/models.py`: preserve native candidate association before aggregation; no frontend photo decisions.
- New `scraper/exact_photos.py`: evidence fingerprints, review ledger validation and exact index rules. Keep it independent of price normalization.
- `scraper/images.py`: reuse decoding/encoding, extend CLI for explicit exact mode, download limits and atomic index publication. Legacy behavior stays default.
- `vite-plugin-data.ts`, `src/lib/derive.ts`, `src/lib/builderData.ts`, `src/types.ts`: join verified revision into existing contracts; exclude backend artifacts.
- `src/lib/images.ts`: sole exact-path resolver; `ProductPhoto.tsx`: rendering/load state.
- Existing catalogue/product/builder modules: pass actual listing identity, not family photo flags.
- `vite.config.ts`: local exact asset serving and existing remote compatibility.
- New focused Python/unit/browser tests: test identity boundaries and rendered behavior, not implementation details.

### Task 1: Capture exact candidate evidence

**Files:** `scraper/main.py`, `scraper/models.py`, `scraper/sources/{bestprice,shopflix,skroutz,snif}.py`; create `scraper/tests/test_photo_candidates.py` and `scraper/exact_photos.py`.

**Interfaces:** `export_photo_candidates(category: str, listings: list[dict], out_dir: Path) -> None`; output version-2 records described in the spec. `identity_fingerprint(category: str, listing: dict) -> str` hashes normalized whitespace/case in full title plus full explicit MPN; preserve all alphanumeric/suffix distinctions. The existing source-qualified ID remains a separate required join key.

Export the spec's category snapshot digest. Build-time Python/TypeScript parity fixtures define canonical serialization and normalization; a missing or stale sidecar yields icons. The build consumes fresh backend candidate MPN evidence without publishing it.

- [ ] Add failing fixtures for MSI/ASUS, Ventus/Trio, White/V1, duplicate source IDs, and Shopflix concrete/abstract SKU. Assert candidate URL stays bound to its native product and source.
- [ ] Run `venv/Scripts/python.exe -m unittest discover -s scraper/tests -p test_photo_candidates.py`; confirm failures identify missing export/association. Use standard-library unittest, adding no test dependency.
- [ ] Capture provenance before legacy export strips `image`; write versioned backend output outside frontend data. Do not invent MPNs, fan counts or unknown SKU specificity.
- [ ] Rerun focused tests. Compare frozen before/after listing IDs, prices and family/history keys: identical; count source-page requests: unchanged. Verify title/MPN changes alter fingerprint, price changes do not.
- [ ] Commit only task files locally: `feat(photos): preserve listing image evidence`.

### Task 2: Verify and cache exact assets

**Files:** `scraper/exact_photos.py`, `scraper/images.py`; create `scraper/tests/test_exact_photos.py`. Ignored staging: `scraper/debug/exact-photos/`.

**Interfaces:** `exact_photo_id(category: str, listing_id: str) -> str` uses specified 20-hex hash. `verified_revision(category: str, listing: dict, index: dict) -> int` returns positive matching revision or zero. Exact CLI: `python scraper/images.py --exact --data <candidates-dir> --out <staging-dir> --budget <count>`. Ledger and index schemas follow spec; legacy CLI stays compatible.

- [ ] Add failing tests for changed evidence, ambiguous SKU, mismatched source image, placeholder, small/corrupt image, non-HTTP URL, private destination/redirect, oversized response/pixel count, blocklist, collision, revision reuse and interrupted two-size output. Network tests use fixtures, not public sites.
- [ ] Run `venv/Scripts/python.exe -m unittest discover -s scraper/tests -p test_exact_photos.py`; confirm expected failures.
- [ ] Implement ledger validation and exact mode using existing Pillow helpers. Bound downloads to 10 MiB, decoded image to 40 million pixels, 20 seconds/request and three redirects; validate every destination. Require usable source dimensions of at least 192px on its longest side and 64px on its shortest; smaller images remain pending. Manual review catches semantic placeholders that technical checks cannot.
- [ ] Implement seven-day revalidation and 14-day expiry using the spec's conditional-fetch/hash rules. Add clock-controlled tests for same-URL changed bytes, unchanged response, transient failure and exhausted refresh budget; overdue approvals must not reach frontend output.
- [ ] Generate both sizes into temporary files, enforce byte caps, record hashes, and publish index atomically only after complete pair validation. New bytes require a new revision and review; blocklist overrides every approval.
- [ ] Generate contact sheets and review real RTX 5060 examples first. Include exact two/three/one-fan fixtures from available hardware, White/V1 variants and deliberately rejected cross-brand candidates. Never fabricate a source example absent from the data.
- [ ] Rerun focused tests and prove legacy fixture behavior remains unchanged. Record coverage/storage/download costs separately from frontend performance.
- [ ] Commit code only, excluding staged assets and raw provenance: `feat(photos): cache verified listing variants`.

### Task 3: Join compact revisions and isolate local assets

**Files:** `src/types.ts`, `src/lib/derive.ts`, `src/lib/builderData.ts`, `vite-plugin-data.ts`, `vite.config.ts`, `src/lib/images.ts`; extend `tests/unit/listFile.test.ts`, `tests/unit/modelChunks.test.ts`; create `tests/unit/exactPhotos.test.ts`.

**Interfaces:** optional `photoRevision?: number` on listings/build rows; `exactProductImage(category: string, listingId: string, revision: number | null | undefined): ProductImage | null`. Build env `EXACT_IMAGES_INDEX` identifies exact index JSON; `LOCAL_EXACT_IMAGES_DIR` identifies matching local asset root. Existing `IMAGES_INDEX` remains legacy-compatible.

- [ ] Add failing tests for Python/TypeScript hash parity, invalid revisions, changed identity, missing index, missing size, collision, blocklist, and revision round-trip through category/model/builder files.
- [ ] Run `npm run test -- tests/unit/exactPhotos.test.ts tests/unit/listFile.test.ts tests/unit/modelChunks.test.ts`; confirm expected failures.
- [ ] Join verified revisions at build time using the fresh candidate sidecar and matching category snapshot digest. Test stale sidecars, changed MPN with unchanged title, missing evidence and cross-language fingerprints. Reuse existing data generation and optional-column decoding; do not create a second listing store. Never expose ledger, candidate URLs or review evidence in generated frontend assets.
- [ ] Add local `/img/v2/` serving for dev/preview with containment checks against traversal. Missing assets return 404 locally; never remote fallback. With no override, retain current remote proxy behavior. Make local index loading accept a filesystem path without a network server.
- [ ] Run focused tests and `npm run build`. Check emitted files exclude backend artifacts; gzip all integrated payloads against spec. Verify old data without revision yields icons and old legacy data tooling remains readable.
- [ ] Commit locally: `feat(photos): expose compact verified revisions`.

### Task 4: Render actual selected variants everywhere

**Files:** `src/components/catalogue/ProductList.tsx`, `src/components/{ModelPage,ProductHeader,ProductPhoto,ModelTable}.tsx`, `src/lib/{builderData,builderFiles,productStrings}.ts`, builder `parts.tsx`, `PartCard.tsx`, `PartList.tsx`, `Review.tsx` (locate current directory before editing); extend `tests/unit/{productPresentation,builderFiles}.test.ts` and `tests/e2e/product-selection.spec.ts` or existing equivalent.

**Interfaces:** consume Task 3 helper and actual resolved listing; preserve existing offer-selection resolver. Key image DOM/load/error state by exact image path. Family-only unresolved view returns null photo.

- [ ] Add failing behavioral tests for two same-family partners, same-maker fan variants, selection changes, unavailable-offer fallback, saved/shared restore and old saved `img` data. Assert displayed title, price, source and exact path belong to the same listing.
- [ ] Run focused unit and Playwright selection tests, using real staged variant assets for visual assertions; confirm failures.
- [ ] Replace family-photo calls in redesigned consumers. Reuse `ProductPhoto`; preserve dimensions, alt text, icon fallback and hero priority. Add catalogue thumbnails within existing layout.
- [ ] Add delayed response/error race tests: select A, then B, then finish A. B remains visible; an A failure cannot suppress B. Unknown variants request no image. A 404 displays stable-size icon.
- [ ] Rerun focused tests and inspect mobile/desktop screenshots/contact sheets. Remove outdated family disclaimers only where exact photos now apply. Search all redesigned photo call sites for legacy fallbacks.
- [ ] Commit locally: `fix(photos): follow selected hardware variant`.

### Task 5: Complete local review corpus and speed proof

**Files:** ignored staging/measurement artifacts; create `docs/v2-pre-release-audit/local-completion/exact-photo-review.md` with summarized evidence and coverage, no raw image blobs.

**Interfaces:** complete local staging index/assets, frozen data baseline, acceptance matrix in spec. No production write actions.

- [ ] Before changing code, capture baseline runs and frozen data hashes. After Task 4, run the same scenarios with staged real photos: home, largest category, GPU detail, builder; 360px/1440px; cold and warm cache; three runs per mobile/desktop mode.
- [ ] Review every available RTX 5060 8GB candidate and 20 distinct candidate-bearing listings per category, or all if fewer exist, selected as specified in the design. Include all five source outcomes and e-shop missing-photo icons. Require a recorded verdict for every corpus item and at least one verified photo per category; otherwise report a readiness blocker. Record whole-catalogue verified/pending/rejected/blocked/missing counts separately. Do not call technical decode or MPN-prefix matching visual verification.
- [ ] Measure complete visible-photo loading, image bytes and browser lookahead requests. Check 96/320 size caps, metadata/JS/data budgets, median LCP/score/CLS tolerances, cached navigation reuse and no family-then-exact double fetch.
- [ ] Run `npm run check`, focused Python photo suites, full Playwright suite and existing local health checks. Confirm no history/selection regressions and no private provenance in `dist`.
- [ ] Fix only accuracy, performance or regressions within this scope, then repeat affected checks. Document remaining coverage gaps honestly.
- [ ] Save review screenshots, source evidence links, payload totals and all performance runs. Commit report locally: `docs(photos): record local accuracy and speed proof`.
- [ ] Present local website and review report to user. Stop before push/deployment. Publication is a later approved step: assets first, verify, metadata/UI second; rollback exact consumers to icons.

## Current handoff

This is a proposed plan, not executed work. Native execution is recommended because tasks share a small number of data contracts and one existing image pipeline. User review of this design/plan comes before implementation; review of the completed local website comes before any push.
