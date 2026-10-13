# Step 3 measurements: pick mode, byte budget (A8)

2026-10-12 · worktree `buildcraft-v2`, branch `v2`, local production preview (`npm run build`, `vite preview --port 4173`). Nothing pushed. Data: v2's copy of `public/data`.

## Verdict

| Check | Result |
| --- | --- |
| JS ≤ 110 KB gzip per page (A8) | **Exceeded on every `?pick=1` page: 115.0 KiB** (first paint alone: 85.4 KiB, within) |
| Data ≤ 300 KB gzip per page (A8) | **Within**: `/case?pick=1` is the largest, 268.0 / 268.0 / 271.1 KiB (a / b / c) |
| `/gpu?pick=1` phone ≥ 90 | **Yes**: 98 / 98 / 99 (a / b / c) |
| `/case` phone ≥ 90 | 90 (Phase 2 gate: 89); `/case?pick=1` phone **91 empty, 84 with a build** (plain `/case` 90); desktop 100 empty, **85 / 91 with a build**, mostly layout shift (CLS), see below |

**Stop rule applies** (a page exceeds the byte budget): measured, nothing fixed, no app code changed. Decision needed from the owner (options below).

## Two readings of the budget

- **(A) Counting the lazy pick chunks** until the check finished: 114.97 KiB = 117.7 kB, over 110 in both KiB and kB. Data within.
- **(B) The brief's pre-approved fallback** (pick code lazy, loaded after the first paint) is already in place, so the first-load JS is 85.4 KiB (within). Note: the chunk is requested from a `useEffect` right after mount, not on idle, so it competes with the first paint's network time on a slow phone (Lighthouse shows no cost on `/gpu`).

The stop rule was applied on reading (A).

## Method

- Build: `npm run build`, then `vite preview` on :4173 (same as the Phase 2 gate). Chrome: Playwright's Chromium 1243, launched headless=new with its own profile for every Lighthouse run (cold HTTP cache).
- **Test builds** (real keys from `dist/data/compat`, `scripts/phase3/measure-pick.mjs`): (a) no build; (b) typical: cpu `Ryzen 7 7700|?`, board `asrockchallengerb850wifiwhite`, RAM `DDR5 32GB (2×16GB) 6800MHz Desktop`, card `bestprice:2160830031`, PSU `750W Gold ATX`, all five with `compat` fields and `builtAt` of the current data; (c) worst: an old keys-only `pcBuild` (no `compat`) with a part in all nine slots (cpu, mobo, ram, gpu, cooler, storage, case, fan, psu).
- Build (b) has no case, cooler, fan or storage part, so on `/case` it exercises only the board, card and PSU inputs of the rules (and on `/mobo` and `/cpu` the other four slots). Build (c) has all nine.
- **Bytes** (`measure-pick.mjs bytes`): Playwright, gzip (level 6) of every response body, from navigation until the pick bar's status is no longer "Checking compatibility…" and the network is idle. JS = scripts, data = `/data/**.json`, fonts separate. KiB = 1024 bytes (vite's build log prints kB = 1000, so its "65.25 kB" is 63.7 KiB here). Against the budget in either unit the result is the same: 115.0 KiB = 117.8 kB > 110.
- **Lighthouse** (`measure-pick.mjs lighthouse`): the same metrics, preset and median-of-3 as `scripts/audit/lighthouse-baseline.mjs`, which is **unchanged**; the wrapper re-implements its small `summarize`/`median` because that file runs on import. Lighthouse cannot preset localStorage itself, so the wrapper starts Chromium, writes `pcBuild` through Playwright (CDP) on `/favicon.svg` (a page that loads no app code, so nothing is cached for the measured run), closes Playwright and runs `lighthouse --port=<that Chromium> --disable-storage-reset`. So (b) and (c) are measured in Lighthouse too. Its JS/data KB are compressed transfer sizes from the run's network log (they include response headers: 117.2 vs 115.0 KiB here).
- Raw files: `docs/phase3/perf/lighthouse.json` (medians + 3 runs each), `docs/phase3/perf/bytes.json`.

## Bytes at first load (gzip, KiB)

| Page | Build | JS | Data | Fonts |
| --- | --- | ---: | ---: | ---: |
| `/mobo?pick=1` | a empty | 115.0 | 117.7 | 65.7 |
| | b typical | 115.0 | 117.7 | 65.7 |
| | c worst | 115.0 | 120.0 | 65.7 |
| `/cpu?pick=1` | a | 115.0 | 55.2 | 65.7 |
| | b | 115.0 | 55.2 | 65.7 |
| | c | 115.0 | 58.5 | 65.7 |
| `/case?pick=1` | a | 115.0 | 268.0 | 65.7 |
| | b | 115.0 | 268.0 | 65.7 |
| | c | 115.0 | 271.1 | 65.7 |
| (no pick) `/mobo`, `/cpu`, `/case` | | 85.4 | 117.7 / 55.2 / 268.0 | 65.7 |

- JS: `index` 63.7 + `CategoryPage` 10.3 + `data` 3.6 + `images` 7.8 (= 85.4 as without pick) + `PickView` 23.0 + `buildStore` 6.6 = **115.0**. Pick adds 29.6 KiB; the budget is exceeded by 5.0 KiB. The same on every build and page: the pick code does not depend on the saved build.
- Data: the pick check adds nothing in (a) and (b) (fields are stored, builder.json is never fetched). In (c) it adds the compat chunks of the slots the page's rules read: 2.3 KiB on `/mobo` (cpu, ram, case, fan, storage chunks), 3.3 KiB on `/case` and `/cpu`. All chunks are 0.1–1.0 KiB; the largest data total is still `/case/list.json` itself.
- Fonts are reported, not counted, as defined.
- The pick chunks are already lazy and are requested only with `pick=1`, after the first paint (the fallback of the definition). The budget as written counts them "at first load" (until the check finished), so the page is over; the first-paint JS (85.4 KiB) is within.

### Engine table share (option only, not implemented)

`PickView` holds the whole engine (`src/engine`; about 19 KiB gzip as separate minified files, the chunk is 23.0 KiB gzip). The four data tables gzipped **each on its own** add up to about 5.3 KiB: `cpuPower` 1.9, `bios` 1.7, `cpuMemory` 1.5, `gpuPower` 1.0. Inside the chunk they compress better with the rest, so the real saving is probably **4–5 KiB**, which gives about **110–112 KiB**: at best at the limit, with no margin (and 109.7 KiB would be 112.3 kB, so the result also depends on the unit). Moving the tables out is therefore not enough alone. Other options for the owner: (1) raise the JS limit for pick pages to 120 KB; (2) split the engine rules by slot so a page loads only the rules it needs, together with the tables; (3) accept reading (B).

## Lighthouse (median of 3, performance / TBT / LCP)

Phase 2 gate numbers (`docs/phase2/gate/perf/lighthouse.json`, same method) in the last column.

| Page | Build | Phone | Phone TBT, CLS, LCP | Desktop | Desktop TBT, CLS | Phase 2 phone / desktop |
| --- | --- | ---: | --- | ---: | --- | --- |
| `/gpu` | | 98 | 39 ms, 0, 2.13 s | 100 | 0 ms, 0 | 98 / 97 |
| `/gpu?pick=1` | a | 98 | 13 ms, 0, 2.13 s | 100 | 0 ms, 0 | |
| | b | 98 | 24 ms, 0, 2.13 s | 100 | 0 ms, 0 | |
| | c | 99 | 10 ms, 0, 1.96 s | 100 | 0 ms, 0 | |
| `/case` | | **90** | 362 ms, 0, 2.14 s | 99 | 63 ms, 0 | 89 / 98 |
| `/case?pick=1` | a | 91 | 291 ms, 0, 2.38 s | 100 | 59 ms, 0.0005 | |
| | b | **84** | 546 ms, 0.073, 2.14 s | **85** | 146 ms, **0.234** | |
| | c | **84** | 589 ms, 0, 2.05 s | 91 | 131 ms, **0.159** | |
| `/builder` (guided) | | 98 | 0 ms, 0, 2.41 s | 100 | 0 ms, 0 | 98 / 100 |

Accessibility is 100 on every page. JS/data KB in the Lighthouse log: 86.9 without pick, 117.2 with pick (data as in the bytes table, `/gpu` 46.4); `/builder` 104.8 JS and 276.7 data (within the budget; the builder has no pick chunks).

Reading:
- `/gpu`, `/gpu?pick=1` and `/builder` are unchanged within noise. Lighthouse's phone load (slow 4G) hides the extra 30 KiB because the pick chunks load after the first paint.
- `/case` is at the 90 line (89–90 on the three runs), as at the Phase 2 gate: the known cost of the facet counts over 2,588 cases.
- `/case?pick=1` with a saved build (b, c), against plain `/case` (phone 90, desktop 99): phone **84**, desktop **85 / 91**. Two separate causes show in the numbers:
  - **Layout shift (CLS), mostly the desktop drop.** Desktop CLS is 0.234 (b) and 0.159 (c) against 0.0005 for (a), and desktop TBT is only 146 / 131 ms, so the desktop score falls because of CLS. Phone (b) CLS is 0.073. When the check finishes, the rows change (hidden, greyed, "Add to build" buttons) and the layout moves. Not caused by the engine's cost; it is a **Phase 3 gate item** of its own.
  - **Blocking time on the phone.** TBT goes from 291 ms (a) to 546 / 589 ms (b / c), about +255–300 ms. The engine running over the page's candidates after the list arrives is the likely reason, but it is an inference from this a / b / c difference: no trace or long-task data was recorded. (Plain `/case` shows 362 ms against 291 ms for (a), so the baseline itself moves by about 70 ms between runs of different pages.)

## Stop-rule outcome

1. Byte budget: JS exceeded (115.0 > 110 KiB) on `/mobo`, `/cpu`, `/case` with `?pick=1`; data within. **Stopped after measuring, no code changed.** Needs an owner decision (options above).
2. `/gpu?pick=1` phone ≥ 90: yes (98–99).
3. `/case` phone: 90 (reported as known; fix = facet counts / C-items). New finding: `/case?pick=1` with a saved build is 84.

## Files

- `scripts/phase3/measure-pick.mjs` (new; the `bytes` and `lighthouse` modes above); `scripts/audit/lighthouse-baseline.mjs` unchanged.
- `docs/phase3/perf/lighthouse.json`, `docs/phase3/perf/bytes.json`.
- `docs/PROJECT-STATE.md`: rule 11, the byte-budget definition.

## Task 6b: `/case?pick=1` with a saved build (owner's option A, 12/10)

2026-10-13 · commits `90b0b32`, `d1c7bb4` · same method as above (`measure-pick.mjs`, 3 runs, median, local
preview). "Before" = the current HEAD before 6b (`f198493`, after Tasks 7 and 8), built and measured the same way
in a separate worktree, so Task 6's numbers are not reused. Raw: `docs/phase3/perf/6b-before/`, `6b-after/`
(`lighthouse.json`, `bytes.json`, `trace-*.json`).

Budget reading (owner, 12/10, recorded in PROJECT-STATE rule 11): the first-load budget is the first paint's JS;
the pick chunks load after it.

### Trace first (`measure-pick.mjs trace`, Chromium with the CPU slowed 4×, unminified build)

| `/case?pick=1` | Long tasks (ms) | Where the time went | Layout shifts |
| --- | --- | --- | --- |
| b phone, before | 852, 648 (+ 2 near 50) | two full passes of the page's filtering + facet counts: `facetCounts` 1,312 ms, `applyFilters` 564 ms in all; the **second pass runs because the listings change when the check finishes** (hidden ones removed). `checkAll` itself: 90 ms in all, in slices under 50 ms | 0.073: a card moves into view when the cards above it are hidden |
| c phone, before | 841, 674 | same; `checkAll` 126 ms | 0.050: a card and an "Add to build" button move up |
| b desktop, before | 174, 131 | same two passes | 0.229: table rows move up 210 px (two hidden rows collapse) + the filter sidebar 4 px (switch label/hint) |
| b phone, after | 701 (+ 50, 68) | one pass (`facetCounts` 545, `applyFilters` 257); candidates 62; no engine on the main thread | 0.000 |
| c phone, after | 674 (+ 51, 67, 78) | one pass; no engine | 0.000 |
| b desktop, after | 145 | one pass | 0.000 |

So the attribution of Task 6 was half right: the shift is the rows changing after the check; but the blocking time
was mostly the page's own filter + count pass running twice, not the engine.

### What changed

- **No shift:** with a saved build that has parts for the page, the rows and the filter sidebar wait for the check:
  placeholders of the same shapes (the table / cards skeleton; the switch above a sidebar skeleton), then the final
  rows are painted once. The page skips its filtering and facet counts until then, so the pass runs once. An empty
  build (a) and normal pages behave as before.
- **Worker:** `checkAll` runs in a module Web Worker (`src/lib/pick.worker.ts`, Vite-native). Protocol
  `src/lib/pickProtocol.ts` (pure: request = slot + build parts + candidate parts; answer = key, hide, findings
  trimmed to errors and warnings, the only ones a row shows). `src/lib/pickChecker.ts` runs it; fallback to the
  previous idle-slice main-thread check when there is no Worker, the worker can't start, crashes, answers with an
  error or not within 10 s. The engine stays one shared source (`src/engine`); `pickCheck.ts` holds `checkAll`,
  `pickHide.ts` the hide rules (no engine code).
- **Bytes:** the engine left the page's `PickView` chunk (23.0 → 7.3 KiB gzip); it is in the worker chunk (17.4 KiB)
  and in a fallback-only chunk (`pickCheck`, 17.3 KiB, fetched only without Worker support).
- Facet counts were **not** moved (not needed for ≥ 90).

### Lighthouse (median of 3: score / TBT / CLS)

| Page | Build | Phone before | Phone after | Desktop before | Desktop after |
| --- | --- | --- | --- | --- | --- |
| `/case?pick=1` | a | 92 / 317 ms / 0 | 93 / 292 ms / 0 | 100 / 58 ms / 0.001 | 100 / 57 ms / 0.001 |
| | b | **84** / 543 ms / 0.073 | **93** / 275 ms / 0 | **86** / 138 ms / 0.234 | **100** / 47 ms / 0 |
| | c | **84** / 564 ms / 0.050 | **94** / 250 ms / 0 | **91** / 122 ms / 0.159 | **100** / 44 ms / 0 |
| `/gpu?pick=1` | b | 99 / 13 ms / 0 | 99 / 21 ms / 0 | 100 / 0 ms / 0.001 | 100 / 0 ms / 0 |
| `/case` | | 90 / 333 ms / 0 | 91 / 338 ms / 0 | 98 / 66 ms / 0 | 99 / 63 ms / 0 |
| `/gpu` | | 97 / 30 ms / 0 | 99 / 30 ms / 0 | 100 / 0 ms / 0 | 100 / 0 ms / 0 |

Runs after: `/case?pick=1` b phone 95, 93, 93; c phone 93, 94, 95; desktop 100 × 3 each. `/case` and `/gpu` (no
code change in their path) moved within run-to-run noise. The "before" b runs were measured with the HEAD build's
own data date (a first try used the other build's date, which made build b refresh its parts through the compat
chunks like build c: 83 / 87).

Lighthouse's JS column does not count the worker's script (its request is logged with 0.3 KB): exact bytes are below.

### Bytes (gzip of the response bodies, KiB, until the check finished)

| | Before | After |
| --- | ---: | ---: |
| First paint JS, every category page (`index` + `CategoryPage` + `data` + `images`) | 86.4 | 86.5 (+80 bytes: the placeholder branch) |
| Pick pages' JS until checked (`/mobo`, `/cpu`, `/case` `?pick=1`, builds a/b/c) | 116.0 | 117.8 (`PickView` 7.3 + `buildStore` 6.6 + worker 17.4) |
| Data, `/case?pick=1` a / b / c | 268.2 / 268.2 / 271.3 | same |

(86.4 is the current HEAD; Task 6's 85.4 was before Tasks 7–8.)

### Stop rule

Not triggered: `/case?pick=1` (b) and (c) phone 93 / 94 (≥ 90), CLS 0 on phone and desktop.

Remaining long task on the phone: the single filter + facet pass after the check (~700 ms with the CPU slowed 4×;
Lighthouse TBT ≈ 250–275 ms), the same work plain `/case` does at its first paint (the known facet-count cost).
