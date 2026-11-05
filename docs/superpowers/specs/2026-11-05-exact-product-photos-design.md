# Exact product photos: findings and proposed design

Date: 2026-11-05. Status: proposed; implementation requires user review. Scope: the local redesigned BuildDraft website, all nine categories. No push, deployment, branding change, or remote image workflow execution is authorized by this document.

## Goal

The photo must depict the actual selected product variant: manufacturer, model line, cooling layout, revision and colour where applicable. An MSI two-fan RTX 5060 must never inherit an ASUS or three-fan photo. Preserve fast browsing, current offer selection, price history, saved builds and share links.

Accuracy takes priority over coverage. An uncertain or missing photo displays the existing category icon. This proposal does not promise a verified photo for every listing: some sources supply no photo, or supply an ambiguous or incorrect one. Coverage and reasons for omissions must be reported, never disguised by representative photos.

## Findings from the repository

Research baseline: local branch `design/claude-v2`, commit `75024ba4cd38f5a50be87241642c3c789e287851`, November 5 data. These observations describe the code and data, not a visual certification of every cached image.

| Problem | Evidence | Effect |
|---|---|---|
| Family identity is too broad | `scraper/categories.py`, `src/lib/categoryRules.ts`: GPU grouping is chip plus VRAM. RTX 5060 8GB contains 121 offers across nine board partners. | Brand and cooler variants share one photo slot. |
| Candidate provenance disappears | `scraper/main.py:write_image_urls` groups by family, retains first image per source, removes listing image fields, and merges old candidates. | The downloader cannot establish which offer the image belongs to. |
| Valid bitmap is treated as correct product | `scraper/images.py` accepts a decodable image; first successful candidate wins. | Wrong variant and shop placeholders can pass. |
| Wrong photos persist | Downloader skips IDs already in its index; metadata contains only category, source and date. | Later better candidates do not repair existing images. |
| Selected offer still gets family photo | `ModelPage.tsx`, `ProductHeader.tsx`, `builderData.ts`, `builderFiles.ts`. | Accurate selected title and price can accompany a different variant. |
| Existing warning is insufficient | `isExamplePhoto` considers differing manufacturers. | Same-maker two-fan/three-fan mismatch remains undetected. |
| Redesigned catalogue currently uses icons | `catalogue/ProductList.tsx`. | Adding photos introduces real image bytes compared with the present baseline. |
| Local image requests use production assets | `vite.config.ts` proxies `/img` in dev and preview. | Copying local images into `public/img` alone does not isolate experiments. |

Concrete distinct offers include `skroutz:60561002` (MSI Ventus 2X OC), `skroutz:60798685` (White), `bestprice:2164703775` (V1), and `shopflix:SF-202599431` (rev. 1.0). Those suffixes must survive identity checks. The family candidate file prefers a Gigabyte Windforce image; the current cached bitmap may predate that candidate order.

The existing `normalize.card_key` and maker MPN-prefix matching support measurements, not photo verification. They discard or relax identity details. Reusing them as exact-photo proof would retain the root problem.

## Options and recommendation

1. Improve the one-photo-per-family selection. Cheap, but cannot represent multiple manufacturers or coolers correctly. Reject.
2. Use every source image directly in the browser. Better association, but source mistakes remain, and uncached large external images increase latency and requests. Reject.
3. Keep source-qualified listing identity, verify offline, serve the existing small cached WebP sizes. Recommend. It fits the present static data/image architecture and needs no browser matching engine, database or new image service.

For the first version, do not automatically share images across sources. A future exact full-MPN match could justify sharing, but is unnecessary for correctness now. Content duplicates may remain; measure storage before adding deduplication machinery.

## Proposed data flow and ownership

### 1. Capture evidence before family aggregation

Retain the existing price/history family keys and listing IDs unchanged. Export backend-only `photo_candidates.v2.json` per category before `write_image_urls` removes `image`. Each record includes category, existing source-qualified listing ID, source, full title, product URL, image URL, capture time, and full manufacturer MPN when explicitly supplied. Include source SKU and whether it is a concrete or abstract SKU when known. Unknown fields stay null; never infer an exact MPN from fuzzy title matching.

BestPrice and Skroutz association must be tested against their actual product records. Shopflix abstractSku may refer to a broader product family; it does not prove variant identity. Snif uses the selling shop's image and needs the same review. e-shop currently provides no list photo: keep icons unless independently verified evidence becomes available. This version does not add full product-page crawls to the price scrape.

Store candidate exports under ignored local research output for trials, then a backend artifact/data location explicitly excluded from frontend publishing. Do not put raw provenance into list files or ship candidate exports in `dist`.

The build reads this backend candidate sidecar as well as the exact index. Each category export carries a snapshot digest over sorted `(listing ID, source, full title)` tuples from that category's latest listings. The build recomputes that digest and refuses exact joins for a stale/missing sidecar. For each matching listing, it recomputes the evidence fingerprint from current full title plus the sidecar's explicit MPN. Python and TypeScript must share fixtures for canonical JSON, Unicode, whitespace and case normalization. The MPN remains backend-only. A changed MPN in a fresh export invalidates approval even if the title is unchanged; unavailable evidence does not imply an unchanged MPN.

### 2. Verify candidates outside the price job

Extend the existing downloader with an explicit exact-photo mode; preserve its legacy default and old index. Use a separate `exact-index.v1.json` and `img/v2/` namespace. Maintain a review ledger with `pending`, `verified`, `rejected`, and `blocked` states; only `verified` records enter frontend output.

A verified record binds category + listing ID to its full title/MPN evidence fingerprint, candidate URL, downloaded source-byte SHA-256, revision, both encoded asset hashes/sizes, reviewer, reviewed date and evidence URLs. A changed identity fingerprint or changed source bytes requires review again. Price, merchant and stock changes do not revoke an unchanged identity. A source reusing its SKU for a different product must not inherit approval.

Revalidate verified source URLs at least every seven days in the separate image job, within its budget; a newly observed candidate URL is queued immediately. Use conditional GET where possible, but hash any returned body. Unchanged bytes retain approval; changed bytes revoke the current record until reviewed and assigned a new revision. A transient fetch failure retains the already verified immutable bytes, records the error and retries on the existing cooldown. If verification cannot be refreshed within 14 days, withhold the revision until successful revalidation. Scheduling must prioritize expiring records rather than silently extending their validity.

Generate local contact sheets with full titles, source links and candidate photos. A reviewer checks the actual photo against the source offer and corroborating exact manufacturer model evidence. GPU checks include partner, product line, fan count, revision, OC suffix, memory variant and colour. A fan count inferred only from a product-line name is insufficient. Prefer an angle showing all fans; packaging-only or obscured-cooler photos remain pending when they cannot prove the requested layout. Manufacturer pages corroborate identity; image assets remain the shop's own photos, following `CLAUDE.md:141`.

Other category checks: CPU box/tray and model; motherboard revision/form factor; RAM capacity, module count and colour; storage capacity, form factor and heatsink; PSU wattage/model/form factor; case colour/window/layout; cooler radiator size/fan arrangement; case fan diameter/colour/pack count. Where several capacities legitimately use identical appearance, record that evidence for each offer rather than assuming equivalence.

Reject known placeholders, logos, unrelated products, corrupted images and inadequate resolution. Technical decoding cannot establish product identity; manual review remains necessary for ambiguous records. Use no generated hardware photos or browser-side visual classification.

For technical eligibility require at least 192px on the source's longest side and 64px on its shortest, allowing existing 250px Skroutz images without upscaling. Visual review must still reject unreadable evidence. Bound download bodies to 10 MiB, decoded images to 40 million pixels, each request to 20 seconds and redirects to three.

### 3. Cache and version immutable files

Reuse Pillow contain-on-white conversion with no crop or upscale. Keep 96px and 320px WebP outputs. Proposed maximum encoded sizes: 8 KiB and 32 KiB respectively. Prefer quality 80; try 75 then 70 if needed. If the image remains oversized or unreadable, hold it for review instead of silently lowering fidelity further.

Path: `/img/v2/<category>/<listingHash>-r<revision>-{96,320}.webp`. `listingHash` is the first 20 hex digits of SHA-1(category + NUL + existing source-qualified listing ID); SHA-1 here is a path identifier, not integrity proof. Check collisions against full identities during export. Revision is a positive safe integer, monotonic per listing; zero/missing means no verified photo. Never reuse a revision for different bytes. Stage both files, validate them, then atomically replace the exact index. Interrupted work must not expose an indexed partial pair. A crash may leave harmless unindexed files.

Continue blocklist/removal behavior in exact mode, with listing-scoped entries. Blocked records cannot be reintroduced by old candidates. Rejected candidates are not automatically retried unchanged. Temporary download errors use the existing cooldown; new candidate URLs/hashes may be reconsidered. Bound request time, redirects, response bytes and decoded pixel count. Validate HTTP(S), reject private/local destinations including redirect targets, and do not attach credentials. Retain throttling and the separate job budget.

### 4. Ship one compact field, resolve one actual offer

Add optional `photoRevision` to the existing listing data contract, compact list column, model chunks and builder rows. It is emitted only when the exact index identity fingerprint matches current listing identity and both sizes exist. Missing or invalid metadata resolves to null. No provenance manifest or remote image lookup loads in the browser.

Extend `src/lib/images.ts` with `exactProductImage(category, listingId, revision): ProductImage | null`. Keep legacy helpers available for compatibility, but migrate every redesigned photo consumer to the exact helper. Never fall back to a family image.

Catalogue rows show the actual row's photo. Product details show the resolved selected offer's photo. A family-only page initially shows an icon until a concrete variant is resolved/selected; its title must make that selection clear. Builder choices, review, saved-build restoration and shared builds use the actual resolved listing, including when an unavailable offer falls back to another offer. Old saved `img` strings are not authority: resolve from current listing data. Do not change selection URL keys or saved build identities.

`ProductPhoto` must clear the previous bitmap immediately when identity/revision changes. Key the image element and loaded/error state by exact path; late events from an earlier selection must not replace or suppress the current image. Keep dimensions, useful alt text and error icon. Remove family-photo disclaimer only from migrated exact-photo surfaces; do not relabel legacy family assets as verified.

## Performance constraints and research

Use existing React, Pillow, static files and CDN routes. No new frontend image library, product-page API call, client identity index or gallery preload. Preserve category/model/builder chunk isolation and caching. Keep fixed image dimensions and native lazy loading for offscreen rows; the visible detail hero remains eager with high priority. Reuse cached immutable URLs across selection, cards and review.

An offline gzip experiment appended `photoRevision` values (two verified rows for every unverified row) to current compact list rows. This measures metadata only, not photo bytes or final integrated output:

| Category | Rows | Existing gzip bytes | Added gzip bytes |
|---|---:|---:|---:|
| GPU | 1,634 | 42,438 | 590 |
| Case | 6,949 | 273,752 | 2,874 |
| CPU | 1,446 | 50,461 | 583 |
| Motherboard | 2,957 | 115,312 | 1,142 |
| RAM | 6,370 | 173,730 | 2,701 |
| Storage | 4,933 | 209,121 | 2,025 |
| PSU | 3,942 | 107,929 | 1,493 |
| Cooler | 4,020 | 175,571 | 1,843 |
| Fan | 4,068 | 158,262 | 1,928 |

Proposed gates: at most 5 KiB gzip extra photo metadata per category; retain approved JS <=110 KB gzip, initial data <=300 KB gzip, home feed <=20 KiB gzip. Report fonts and post-paint builder code separately. Count real visible images through completion, plus browser lazy-load lookahead traffic; do not hide work by delaying it beyond Lighthouse.

Capture baseline and candidate on identical frozen data, browser, network/CPU settings and 360px/1440px viewports. Use three-run mobile/desktop medians for home, largest category, selected product and builder. Candidate LCP may increase by no more than 100ms, Lighthouse performance by no more than a two-point decrease, and CLS by no more than 0.01. Also require absolute CLS <=0.1. Report all runs, transfer bytes, request counts and visible-photo completion times for cold and warm cache. These tolerances are proposed engineering gates, not user-approved promises. Existing case-page score 89 is a baseline limitation, not proof of a photo regression or a claim of perfect speed.

No literal zero-byte-cost promise: catalogue icons currently cost less than photographs. If a gate fails, adjust image size/encoding/loading at the responsible layer and repeat the affected proof before asking for local approval.

## Local staging, approval and eventual rollout

Create ignored staging output outside the published image repo. Add an explicit local image directory option to Vite dev and preview; when set, serve only that directory for `/img/v2/` and return 404 for missing exact assets. Never fall through to remote family assets. With no local override, existing production proxy behavior remains compatible. Build-time exact index override must point at the same staging set. Stage a real local snapshot; no production image workflow invocation.

Sequence: capture baseline; implement correctness fixtures; stage and review GPUs first; apply the same pipeline to all categories; run full local accuracy/performance proof; present local website and coverage report to user. Until approval, keep all work local and do not push either repository. After approval, separately confirm release scope if it is unclear; publish immutable assets first, verify both sizes, then ship metadata/UI. Keep legacy assets/index during migration. Rollback for redesigned exact consumers is icons plus revision withdrawal, never representative family images. A blocklisted photo needs asset removal and CDN invalidation as well as metadata withdrawal.

## Acceptance and outstanding limits

- No brand, fan-layout, colour, revision, kit-count or capacity mismatch in the reviewed fixture matrix.
- Every displayed photo has a current verified ledger entry and two complete assets. Unknown offers cause no photo request.
- Source ambiguity, changed identity, wrong source photo, corrupt/blocked/missing asset, and late load events all fail to an icon.
- Offer switches, filters, pagination, cheapest-offer changes, saved builds and shared builds preserve photo/title/price agreement.
- Coverage report includes verified/pending/rejected/blocked/missing counts by category and source, reviewer evidence and top missing reasons. A verified-only claim must never be confused with 100% photo coverage.
- No changes to prices, history keys, source-qualified selection identities, scrape request volume or production hosting during local work.

Remaining cost is offline review effort and additional asset storage. Source photos can themselves be wrong; manufacturer corroboration and conservative icons reduce that risk but cannot certify undocumented physical revisions. This is why approval is evidence-bound rather than inferred from download success.

Local review readiness requires a nonempty real-photo corpus: review every available candidate for the current RTX 5060 8GB family, and 20 distinct candidate-bearing listings per category (or every such listing if fewer exist). Select those 20 deterministically across the most-offered families and available sources, not by invented popularity. Include all available brand/fan/revision/colour contrasts from the acceptance matrix. Every corpus item must have a recorded verdict; no unexplained pending entries. Missing or contradictory evidence is a documented rejection, never a forced approval. If any category has no verified photo, report that as a readiness blocker requiring further source research, not as successful completion. Broader catalogue coverage remains an explicit gap for user review.

## Primary references

- [MSI RTX 5060 Ventus 2X OC overview](https://www.msi.com/Graphics-Card/GeForce-RTX-5060-8G-VENTUS-2X-OC/Overview): explicitly specifies dual-fan thermal design. Supports the need to verify exact cooler variants.
- [MSI RTX 5060 Ventus 2X OC specifications](https://www.msi.com/Graphics-Card/GeForce-RTX-5060-8G-VENTUS-2X-OC/Specification): exact manufacturer model evidence.
- [Browser-level lazy loading](https://web.dev/articles/browser-level-image-lazy-loading): fixed dimensions, offscreen lazy loading, eager LCP images, and browser-controlled lookahead.
- [Image priority guidance](https://developer.chrome.com/docs/modern-web-guidance/guides/performance/optimize-image-priority): selective fetch priority rather than prioritizing every thumbnail.
- Existing repository constraint: `docs/superpowers/specs/2026-11-03-claude-design-website-design.md`, performance budget; `CLAUDE.md:141`, shop-owned photos only.
