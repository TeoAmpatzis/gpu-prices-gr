# Roadmap step 4 gate: the product page (Phase 3 gate)

2026-10-18 · worktree `buildcraft-v2`, branch `v2` (local only, nothing pushed) · HEAD `f9681ec` (Task 12 fixes: `7c079e7`) · data: v2's copy of
`public/data` (same as the step 3 gate plus later merges). Method as in `docs/phase3/gate.md` and `step3-measure.md`:
`npm run build`, `vite preview` on :4173, Lighthouse 12 with a fresh Chromium profile per run, median of 3.

**Task 12 update (2026-10-18, commit `7c079e7`)**: the three step 4 misses found below were fixed or explained:
- product pages no longer load the category list: phone 96 on all three, desktop 100, data 8-10 KB;
- the Greek 360 px fit rows wrap;
- `/gpu` time to first product is the same before and after step 4.

The Task 11 numbers are kept below as "before". The Task 12 numbers are in the sections marked "Task 12" and in
`docs/phase3/perf/step4/*-task12.*`.

## Verdict

| Criterion | Result |
| --- | --- |
| Phone Lighthouse >= 90, median of 3 | **Pass.** Category pages and builder (Task 11): `/gpu` 99, `/case` 99, `/storage` 99, `/case?pick=1` build b 99, `/builder` 97. Product pages (Task 12): `/gpu/...` 94 → **96**, `/case/...` 87 → **96**, `/storage/...` 88 → **96** |
| Desktop 100 | **Pass**, every page. `/case/corsair-3500x` was 99 in Task 11 (LCP 0.85 s); **100** after Task 12 (LCP 0.61 s) |
| CLS 0 | **Pass**, every page, phone and desktop |
| Accessibility 100 | **Pass**, every page |
| Rule 11 bytes (first-paint JS <= 110 KB, data <= 300 KB gzip) | **Pass** on every page. Product page data target <= 60 KB: **pass** after Task 12: gpu 50.9 → **9.5**, case 254.1 → **9.6**, storage 202.6 → **7.9** (the category `list.v2.json` is no longer requested) |
| Time to first product vs v1 | GPU **miss, not caused by step 4**: 1.97 s vs gate 1.84 s (v1 measured now 1.75 s). v2 before step 4 (`97ae8d2`) took 2.00 s and now takes 2.00 s (2,004 vs 1,999 ms), so this is a Phase 1/3 paint-order matter for the owner. Cases **pass** (3.12 s vs gate 3.93 s; v1 now 3.90 s) |
| Keyboard walk <= 5 | **Pass**: first product after 5 key presses with the skip link (Phase 1: 26; v1: 37), no stop without a visible focus |
| Build time / dist | 7.4 s → 11.2-12.6 s; dist 141.6 → 140.4 MiB; files 691 → 2,948 (model chunks). See "Build stats" |
| Layout audit 0 issues | **Pass.** Without a saved build: 12 pages incl. 3 product pages x 1920/1366/768/360 x el/en (Task 11); 4 product pages again after Task 12. With a saved build after Task 12: gpu/case/cpu/storage product pages x 1366/360 x el/en, **0 issues**. In Task 11 there was 1 issue: `/gpu/rtx-5060-8gb` at 360 px, Greek, +3 px sideways; it is fixed |
| `npm run e2e` | **144 passed** (Task 11: 142; Task 12 added 2 tests: no category list while a product page loads, and its photo appears) |
| `npm test` (1,042 tests incl. compat scenarios) | **Pass**. 64 scenarios: pass 50, gap 4 (S03, S04, S35, S45), unknown 10, failure 0 (same as Phase 2 / step 3) |
| B9 batches 1-5 live on main, aliases in `MODEL_ALIASES` | **Open: waiting for B9** (the backend queue is at Q3; `MODEL_ALIASES` is empty). Step 4 closes when B9 is live and its aliases are in |

## Lighthouse (median of 3; local `vite preview`)

`node scripts/phase3/measure-pick.mjs lighthouse http://localhost:4173 docs/phase3/perf/step4 <raw> 3
gpu,case,storage,case-pick-b,builder-guided,p-gpu,p-case,p-storage`. The script gained three product pages (`p-gpu`,
`p-case`, `p-storage`); `case-pick-b` = the typical saved build of the step 3 gate. Raw: `docs/phase3/perf/step4/lighthouse.json`.
(One execution stopped at `p-case` desktop run 2 with a Lighthouse process error; `p-case` and `p-storage` were then run
again completely and merged: the three runs of each are identical to the first attempt.)

| Page | Phone (runs) | Phone TBT / CLS / LCP | Desktop (runs) | Desktop TBT / CLS / LCP | Step 3 gate phone / desktop |
| --- | --- | --- | --- | --- | --- |
| `/gpu` | 99 (98/99/99) | 16 ms / 0 / 2.12 s | 100 (100/100/100) | 0 / 0 / 0.62 s | 97 / 99 |
| `/case` | 99 (98/99/99) | 53 ms / 0 / 2.13 s | 100 (100/100/100) | 0 / 0 / 0.63 s | 90 / 99 |
| `/storage` | 99 (98/99/99) | 41 ms / 0 / 2.07 s | 100 (99/100/100) | 0 / 0 / 0.72 s | 95 / 99 |
| `/case?pick=1`, build b | 99 (99/99/99) | 37 ms / 0 / 1.95 s | 100 (99/100/100) | 0 / 0 / 0.62 s | 95 / 99 |
| `/builder` (guided) | 97 (97/97/98) | 0 / 0 / 2.56 s | 100 (100/100/100) | 0 / 0 / 0.57 s | 98 / 100 |
| `/gpu/rtx-5060-8gb` | 94 (94/94/94) | 0 / 0 / 3.00 s | 100 (100/100/100) | 0 / 0 / 0.61 s | n/a |
| `/case/corsair-3500x` | **87** (87/87/87) | 0 / 0 / 4.06 s | **99** (99/99/99) | 0 / 0 / 0.85 s | n/a |
| `/storage/crucial-p310-1tb-ssd` | **88** (88/88/88) | 0 / 0 / 3.90 s | 100 (100/100/100) | 0 / 0 / 0.80 s | n/a |

Product pages chosen: the models listed by all five shops with the most listings in the current data
(`list.v2.json`): RTX 5060 8GB (141 listings), Corsair 3500X (16 listings, the top case), Crucial P310 1TB (9 listings, the
top SSD). Addresses `/gpu/rtx-5060-8gb`, `/case/corsair-3500x`, `/storage/crucial-p310-1tb-ssd`.

### Task 12: product pages after the fix (`7c079e7`)

`node scripts/phase3/measure-pick.mjs lighthouse http://localhost:4173 <out> <raw> 3 p-gpu,p-case,p-storage`, same
method. Raw: `docs/phase3/perf/step4/lighthouse-task12.json`.

| Page | Phone before → after (runs) | Phone LCP | Desktop before → after (runs) | Desktop LCP | Lighthouse data KB (transfer) |
| --- | --- | --- | --- | --- | --- |
| `/gpu/rtx-5060-8gb` | 94 → **96** (96/96/96) | 3.00 → 2.78 s | 100 → **100** (100/100/100) | 0.61 → 0.61 s | 52.0 → 10.1 |
| `/case/corsair-3500x` | 87 → **96** (96/96/96) | 4.06 → 2.72 s | 99 → **100** (100/100/100) | 0.85 → 0.61 s | 255.3 → 10.2 |
| `/storage/crucial-p310-1tb-ssd` | 88 → **96** (96/96/96) | 3.90 → 2.72 s | 100 → **100** (100/100/100) | 0.80 → 0.61 s | 203.9 → 8.5 |

On all three pages: TBT 0, CLS 0, accessibility 100, phone FCP 1.20 s.

What was wrong:
- `src/App.tsx` `startFirstPage()` preloaded `/data/<cat>/list.v2.json` for product addresses as well as category
  addresses.
- Nothing on the product page reads that list. The photo comes from the model chunk's `photo` flag + `photoId`, the
  header, alternatives and variants come from the chunk, and the fit uses the compat chunks.
- So the preload only competed with the chunk and the photo on the slow phone link.

Only category pages preload it now. A product page requests the manifest, its model chunk and the photos. Hover/focus
prefetch of the category link can still fetch the list on interaction.

The remaining phone LCP (2.7 s) is the chain first paint → `ModelPage` code + manifest → model chunk → photo, under
the paint-order rule.

### What changed since step 3 (category pages)

Facet counts now run in a worker after the first paint (`7d7232e`) and the list file shrank (`da3fb15`): TBT of `/case`
fell 353 -> 53 ms and phone 90 -> 99; `/storage` 95 -> 99; `/gpu` 97 -> 99. This closes the open item "Category pages'
first-load speed" for the phone score.

### Desktop

Run-to-run LCP differences were small this time (`/gpu` 0.62/0.62/0.62, `/case` 0.63/0.63/0.62, `/storage`
0.75/0.66/0.72, `/case?pick=1` 0.74/0.61/0.62 s). The only 99 runs (one run each of `/storage`, `/case?pick=1`
build b) are the photo proxy case of the step 3 gate: the same code scores 100 in the other runs and the LCP is 0.1 s
later in the run that scored 99 (photos come from GitHub Pages through the preview proxy). `/case/corsair-3500x` is 99 in
all three runs with identical numbers (LCP 0.85 s), so this one is the page, not the network (below).

### Product pages: why phone misses on case and storage

The LCP element on all three product pages is the 160 px product photo. The page needs `list.v2.json` of its category
before it knows the photo id (the photo bitset lives in the list file) and, per the step 4 design, for the header and the
alternatives. The case list is 244.5 KiB and the storage list 194.8 KiB, so on Lighthouse's slow phone (1.6 Mbit/s)
the photo is requested only after the list is parsed: for `/case/corsair-3500x` the photo's own load delay is 107 ms and its
download 150 ms, the rest of the 4.06 s LCP (score 87) is the wait for the list. The GPU list is 41.5 KiB, so `/gpu/...` is 94 (LCP 3.0 s).
The model chunk itself (7-9 KiB) arrives with the list. Possible fixes (not done, no product code in this task): give
the photo id in the model chunk (or the page URL data) so the photo and header can paint from the chunk alone and the
category list loads after the first paint (it is only needed for alternatives/variants and the previous/next links), which
would also bring the product page data to ~10-20 KB and meet the <= 60 KB target. Owner decision.

*Task 12 correction:* the page did not need the list.
- The chunk already carried the `photo` flag (the photo id comes from `photoId(cat, key)`), and nothing on the page read
  the list.
- The list was only a preload from `App.tsx` that shared the link with the chunk and the photo.
- Removing it was enough; see "Task 12: product pages after the fix" above.

## Bytes (gzip of the response bodies, KiB; `measure-pick.mjs bytes`)

`node scripts/phase3/measure-pick.mjs bytes http://localhost:4173 docs/phase3/perf/step4/bytes.json` (the script gained
the plain pages). Data is counted per distinct URL: the category `list.v2.json` appears twice in a browser's response log
(page and worker; the second answer comes from the HTTP cache) and counted once here. The raw `bytes.json` `dataKB` field
still holds the sum with the repeat, the per-page `data` lists show it.

| Page | First-paint JS | JS after the first paint (not counted) | Data | Fonts |
| --- | ---: | ---: | ---: | ---: |
| `/gpu` | 93.5 | 7.0 (facet worker) | 42.1 | 65.7 |
| `/case` | 93.5 | 7.0 | 245.1 | 65.7 |
| `/storage` | 93.5 | 7.0 | 195.4 | 65.7 |
| `/builder` | 107.3 | 0 | 279.6 | 65.7 |
| `/gpu/rtx-5060-8gb` | 98.2 | 13.6 (PriceChart 2.4, BuildFit 2.7, useBuildCheck 2.7, builder 5.8) | 50.9 (list 41.5, model 8.8, manifest 0.6) | 65.7 |
| `/case/corsair-3500x` | 98.2 | 13.6 | 254.1 (list 244.5, model 9.0) | 65.7 |
| `/storage/crucial-p310-1tb-ssd` | 98.2 | 13.6 | 202.6 (list 194.8, model 7.2) | 65.7 |
| `/case?pick=1` build a / b / c | 93.5 | pick code + worker (total JS 132.8) | 245.1 / 245.1 / 248.1 | 65.7 |
| `/mobo?pick=1` a / b / c | 93.5 | same | 108.5 / 108.5 / 110.8 | 65.7 |
| `/cpu?pick=1` a / b / c | 93.5 | same | 49.9 / 49.9 / 53.1 | 65.7 |

**Task 12** (`7c079e7`, same script; raw `docs/phase3/perf/step4/bytes-task12.json`). Product pages' data, before →
after:

| Page | Data before → after | After: files | Total JS incl. after-paint chunks |
| --- | ---: | --- | ---: |
| `/gpu/rtx-5060-8gb` | 50.9 → **9.5** | manifest 0.6 + gpu/model/199 8.8 | 111.8 (unchanged) |
| `/case/corsair-3500x` | 254.1 → **9.6** | manifest 0.6 + case/model/113 9.0 | 111.8 |
| `/storage/crucial-p310-1tb-ssd` | 202.6 → **7.9** | manifest 0.6 + storage/model/166 7.2 | 111.8 |

First-paint JS here = every script response of the page minus the chunks that only load after the first paint (the
worker; on product pages the chart, fit and builder chunks). The product page's total JS incl. those is 111.8 KiB;
Lighthouse's transfer size (headers included, every script it saw) says 116.5 KiB on all three product pages and 96.3 on
category pages. Step 3 reported 87.7 first-paint JS for category pages; it is 93.5 now (`titles`, `circle-help`, a larger
`index` 64.2 -> 66.1 and `CategoryPage` 11.6 -> 12.2). Within 110. `/builder` data (279.6) and `/case` data
(245.1) have 20-55 KiB left under 300.

## Build stats

| | Before step 4 (`97ae8d2`) | Now (`f9681ec`) |
| --- | ---: | ---: |
| `npm run build` time (tsc + vite + data) | 7.4 s (2 runs: 7.4, 7.4) | 11.2-12.6 s (3 runs: 12.4, 12.6, 11.2) |
| dist size | 141.6 MiB | 140.4 MiB (about 147 MB in decimal) |
| dist files | 691 | 2,948 (model chunks: 256 per category) |

The "before" build ran in a temporary worktree of `97ae8d2` with its own `public/data` (a few days older, same shape), so
size/time are for the commit, not identical data. The dist size fell although files grew: raw scraper files and category
`history.json` are left out of dist now (`635c028`, `814f2b2`: 58 raw files), photo ids and history are compact.

## Time to first product vs v1 (`scripts/phase1/content-timing.mjs`)

Lighthouse's phone profile (412 px, CPU 4x slower, 150 ms, 1.6 Mbit/s), median of 3, fresh context per run, Greek.
v1 = `origin/main` (`867454e`) built in a temporary worktree (`DATA_CHECK=off`), preview on :4175; v2 on :4173.
Raw: `docs/phase3/perf/step4/content-timing.json`.

| Page | v1 first paint / products visible | v2 first paint / products visible | Gate |
| --- | --- | --- | --- |
| GPU | 1,272 / **1,754** ms (runs 1754/1755/1750) | 1,256 / **1,973** ms (1978/1973/1969) | <= 1.84 s: **miss by 0.13 s** (0.22 s later than v1 measured now) |
| Cases | 1,268 / **3,897** ms (3826/3897/3906) | 1,268 / **3,122** ms (3108/3122/3151) | <= 3.93 s: **pass** (0.78 s sooner than v1) |
| RAM | 1,276 / 2,681 ms | 1,260 / 2,684 ms | (not a gate) equal |
| Builder (CPU step) | 1,276 / 3,186 ms | 1,256 / 3,457 ms | (not a gate) 0.27 s later |

GPU: Phase 1 had 2.03 s (the owner's decision 16 kept the paint order); step 4's smaller list gets 1.97 s but not the
1.84 s. Not analysed further here; candidates: start the page chunk and list request at the first render, or inline a small first page of rows;
not done here.

**Task 12: did step 4 cause the GPU miss? No.** Same script and settings, with its v1 slot = v2 at `97ae8d2` (before
step 4, temporary worktree, preview :4175) and its v2 slot = v2 now (`f9681ec` + the Task 12 fix, preview :4173).
`git diff 97ae8d2 HEAD -- public/data` is empty, so both builds used the same data. Raw:
`docs/phase3/perf/step4/content-timing-task12.json`.

| Page | Before step 4 (`97ae8d2`): first paint / products (runs) | Now: first paint / products (runs) |
| --- | --- | --- |
| GPU | 1,260 / **2,004 ms** (2004/1984/2024) | 1,272 / **1,999 ms** (1983/1999/2005) |
| RAM | 1,260 / 2,954 ms | 1,256 / 2,685 ms |
| Cases | 1,232 / 4,013 ms | 1,260 / 3,129 ms |
| Builder (CPU step) | 1,244 / 3,429 ms | 1,268 / 3,475 ms |

/gpu 1.97 s vs 1.84 s: **not caused by step 4** (v2 before step 4: 2.00 s; now 2.00 s). This is a Phase 1/3
paint-order matter for the owner: page code and list start after the first contentful paint, `src/lib/paint.ts`.
Step 4 made RAM 0.27 s and cases 0.88 s faster.

## Keyboard walk (`scripts/phase1/keyboard-walk.mjs`, 1366 px, Greek)

`/`: 18 stops, all with a visible focus. `/gpu`: 31 stops, all visible; **first product after 5 key presses with the skip
link** (v1: 37; Phase 1: 26), 0 after the panel's skip link. `/builder`: 40 stops, all visible.
Raw: `docs/phase3/perf/step4/keyboard.json`.

## Layout audit (`scripts/checks/layout-audit.mjs`)

- `gpu,cpu,mobo,ram,storage,psu,case,fan,cooler` + the three product pages, 1920/1366/768/360 px, el + en: **no issues**.
- With a saved build (`PCBUILD`: Ryzen 7 7700, AM5 DDR5 ATX board, DDR5 32 GB kit, 750 W PSU) on the three product pages
  and `/case`: **one issue**, `/gpu/rtx-5060-8gb` at 360 px, Greek only (also in its "details" and "filter-sheet"
  states): the page scrolls sideways by 3 px; the elements that stick out are the fit card ("Έλεγχος με το build σου: 3
  εξαρτήματα", +19-20 px inside its box) and the line "Ταιριάζει σε ό,τι ελέγξαμε · 141 προσφορές τιμής" (+3 px
  outside the viewport). Case and storage pages with the same build: clean. Needs a fix before release (not done: this
  task changes no product code).
- **Task 12** (`7c079e7`):
  - Cause: the graphics card fit counts (`[data-fit-counts]`) put the badge and "141 προσφορές τιμής" in a flex row that
    could not wrap. The rows wrap now; nothing changes at 1366 px.
  - With the same build (from `dist/data/compat`, with compat fields) on `gpu/rtx-5060-8gb`, `case/corsair-3500x`,
    `cpu/core-i5-12400f` and `storage/crucial-p310-1tb-ssd`, 1366/360 x el/en: **0 issues**.
  - Without a build, the same four pages at 1920/1366/768/360: **0 issues**.
  - The old `BuildFit.tsx` with the build reproduced the issue (+3 px, el, 360).
  - Reports: `docs/phase3/perf/step4/layout-audit-task12-{with-build,no-build,old-code-with-build}.txt`.

## Step 4 commits (branch `v2`, after `97ae8d2`)

Task numbers as in the plan (`docs/superpowers/plans/2026-10-17-step4-product-page.md`) and the SDD ledger.

| Task | What | Commits |
| --- | --- | --- |
| 1 | RAM short titles without the lone "2" (C5) | `9a8d534` |
| 2 | list.json bytes: photo bitset, compact history; `list.v2.json` + format check | `da3fb15`, `84fddc6` |
| 3 | Facet counts in a worker after the first paint | `7d7232e` |
| 4 | Model chunk files | `e018bcc` |
| 4b | Expanded-row chart reads model chunks; category `history.json` out of dist | `814f2b2` |
| 4c | No cheaper list for "Other" cases; raw scraper files out of dist | `635c028` |
| 5 | Model addresses, aliases, not-found state | `2b6d12f` |
| 6 | Header and offers table | `8141dfa` |
| 7 | Price history | `78ea6f4` |
| 7b | Skroutz import glitch filter (+ backend plan note Q4b, docs) | `ecf3f58` (`dda857c`) |
| 8 | Fit with your build, add or replace | `0c8a54f` |
| 9 | Variants, alternatives, specs, report a mistake | `fe4c2cd` |
| 10 | Links from lists and search, skip link | `f9681ec` |
| 11 | This gate report and measurements | (this commit) |
| 12 | Gate fixes: no category list on product pages, Greek 360 px fit rows wrap | `7c079e7` |

None has a Co-Authored-By line.

## Open items

Misses at this gate (owner decides):

1. ~~Product pages phone: case 87, storage 88 (gate 90); GPU 94.~~ Fixed in Task 12 (`7c079e7`): 96 / 96 / 96, data
   7.9-9.6 KB.
2. ~~`/case/corsair-3500x` desktop 99.~~ Fixed in Task 12: 100.
3. GPU time to first product 1.97 s vs 1.84 s: **not caused by step 4** (v2 before step 4: 2.00 s; now 2.00 s). It is a
   Phase 1/3 paint-order matter for the owner.
4. ~~3 px sideways scroll on `/gpu/<model>` at 360 px in Greek with a saved build.~~ Fixed in Task 12.
5. Waiting for B9 (aliases; `MODEL_ALIASES` empty).

Deferred minors from the step 4 reviews (one line each; from `progress.md`):

- Task 1: RAM title data check is a proxy; "με Module(s)" without a number leaves "με"; comment why single-listing models are skipped.
- Task 2: no build-time guard for history prices with more than 2 decimals; one test asserts `>= 0`; the photo bitset depends silently on `hist` holding every model (warn at the encode site); `productImage` recomputes SHA-1 per render (memoise per key); stale "list.json" mentions in comments and docs (scripts/checks/README.md, CLAUDE.md, validation-report.ts, source-age, CategoryView, ModelTable, images.ts, site-check labels).
- Task 3: the fixed 4-digit count width makes "On sale only" / "All-time lows" wrap at 360 px (owner glance); `referenceCounts` in facets.test shares the new filter paths (comment or frozen snapshot); CLAUDE.md / PROJECT-STATE facet-count text outdated; the facet mismatch counter never resets (bounded, keyed by version).
- Task 4: the 40 KiB chunk limit exists only in a unit test (add a `checkData` warning); `toPart(slot, m as never)` cast hides a type mismatch; the SAME_KIND_TEST mode tie-break may differ from `mostCommon`.
- Task 5: the ModelPage error path does not clear the visited-slugs set; nothing checks that a record's key chain and slug chain end at the same model (the alias build step must guarantee it).
- Task 6: duplicate strings `offerChecked`/`offerTotal` vs `UI.checked`/`UI.total`; source badge and "via BestPrice" repeat in the header seller line; the Total column "—" tooltip says "Shipping: unknown"; an SSD without DRAM reads "DRAM: no" after `bare()` strips the label.
- Task 4c: the `pruneRawData` test uses a hand-written GENERATED sample (optional build-time assert that every emitted path survives the prune).
- Task 8: HeaderFit says "Add to build" even when the click would replace; `hasParts` export used only by tests, missing space in a `useBuildCheck` template, `OfferFitLine` useMemo never memoises, `levelOf` copies `shownLevel` (comment why); a `/builder` restore of a GPU listing-id key is not e2e-tested from the product page.
- Task 7b: round-value false positives accepted under the owner's ruling (e.g. asusb860mmaxgamingax 150 for 2 days).

Other: the step 3 note that `maxMemoryGB` has 5 listings with "3" (BestPrice "3.072GB", fixed on main in `2bdc58f`, cached
pages not re-read) is unchanged; its range check makes them unknown.

## Files

`docs/phase3/perf/step4/{lighthouse,bytes,content-timing,keyboard}.json`, `scripts/phase3/measure-pick.mjs` (product pages
in `PAGES`, plain pages in `bytes`). Servers started (preview 4173, v1 preview 4175, e2e 4174) are stopped; both temporary
worktrees (`%TEMP%\bd-v1-main`, `%TEMP%\bd-v2-before`) are removed.

Task 12 added these files (the Task 11 ones are unchanged):
- `docs/phase3/perf/step4/{lighthouse,bytes,content-timing}-task12.json`;
- `layout-audit-task12-{with-build,no-build,old-code-with-build}.txt`.

Servers started (preview 4173 and 4175; e2e 4174) are stopped, and the temporary worktree `%TEMP%\bd-t12-before` is
removed.
