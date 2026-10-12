# Step 3 measurements: pick mode, byte budget (A8)

2026-10-12 · worktree `buildcraft-v2`, branch `v2`, local production preview (`npm run build`, `vite preview --port 4173`). Nothing pushed. Data: v2's copy of `public/data`.

## Verdict

| Check | Result |
| --- | --- |
| JS ≤ 110 KB gzip per page (A8) | **Exceeded on every `?pick=1` page: 115.0 KiB** (first paint alone: 85.4 KiB, within) |
| Data ≤ 300 KB gzip per page (A8) | **Within**: `/case?pick=1` is the largest, 268.0 / 268.0 / 271.1 KiB (a / b / c) |
| `/gpu?pick=1` phone ≥ 90 | **Yes**: 98 / 98 / 99 (a / b / c) |
| `/case` phone ≥ 90 | 90 (Phase 2 gate: 89); `/case?pick=1` phone **91 empty, 84 with a build** |

**Stop rule applies** (a page exceeds the byte budget): measured, nothing fixed, no app code changed. Decision needed from the owner (options below).

## Method

- Build: `npm run build`, then `vite preview` on :4173 (same as the Phase 2 gate). Chrome: Playwright's Chromium 1243, launched headless=new with its own profile for every Lighthouse run (cold HTTP cache).
- **Test builds** (real keys from `dist/data/compat`, `scripts/phase3/measure-pick.mjs`): (a) no build; (b) typical: cpu `Ryzen 7 7700|?`, board `asrockchallengerb850wifiwhite`, RAM `DDR5 32GB (2×16GB) 6800MHz Desktop`, card `bestprice:2160830031`, PSU `750W Gold ATX`, all five with `compat` fields and `builtAt` of the current data; (c) worst: an old keys-only `pcBuild` (no `compat`) with a part in all nine slots (cpu, mobo, ram, gpu, cooler, storage, case, fan, psu).
- **Bytes** (`measure-pick.mjs bytes`): Playwright, gzip (level 6) of every response body, from navigation until the pick bar's status is no longer "Checking compatibility…" and the network is idle. JS = scripts, data = `/data/**.json`, fonts separate. KiB = 1024 bytes (vite's build log prints kB = 1000, so its "65.25 kB" is 63.7 KiB here). Against the budget in either unit the result is the same: 115.0 KiB = 117.8 kB > 110.
- **Lighthouse** (`measure-pick.mjs lighthouse`): the same metrics, preset and median-of-3 as `scripts/audit/lighthouse-baseline.mjs`, which is **unchanged**; the wrapper re-implements its small `summarize`/`median` because that file runs on import. Lighthouse cannot preset localStorage itself, so the wrapper starts Chromium, writes `pcBuild` through Playwright (CDP) on `/favicon.svg` (a page that loads no app code, so nothing is cached for the measured run), closes Playwright and runs `lighthouse --port=<that Chromium> --disable-storage-reset`. So (b) and (c) are measured in Lighthouse too. Its JS/data KB are transfer sizes from the run's network log (they include headers: 117.2 vs 115.0 KiB here).
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

`PickView` holds the whole engine (`src/engine`, about 19 KiB gzip as separate minified files; the chunk is 23.0 KiB gzip). The four data tables are about **5.3 KiB gzip** of it (each minified on its own, so the number is approximate): `cpuPower` 1.9, `bios` 1.7, `cpuMemory` 1.5, `gpuPower` 1.0. Moving them out of the JS (a JSON chunk fetched when the check runs, or a lazy import split from the rules) would take the pick pages from 115.0 to about 109.7 KiB, just under 110 and without margin. Other options for the owner: (1) raise the JS limit for pick pages to 120 KB; (2) split the engine rules by slot so a page loads only the rules it needs; (3) accept the definition as "first paint" (85.4 KiB).

## Lighthouse (median of 3, performance / TBT / LCP)

Phase 2 gate numbers (`docs/phase2/gate/perf/lighthouse.json`, same method) in the last column.

| Page | Build | Phone | Phone TBT, LCP | Desktop | Phase 2 phone / desktop |
| --- | --- | ---: | --- | ---: | --- |
| `/gpu` | | 98 | 39 ms, 2.13 s | 100 | 98 / 97 |
| `/gpu?pick=1` | a | 98 | 13 ms, 2.13 s | 100 | |
| | b | 98 | 24 ms, 2.13 s | 100 | |
| | c | 99 | 10 ms, 1.96 s | 100 | |
| `/case` | | **90** | 362 ms, 2.14 s | 99 | 89 / 98 |
| `/case?pick=1` | a | 91 | 291 ms, 2.38 s | 100 | |
| | b | **84** | 546 ms, 2.14 s | **85** | |
| | c | **84** | 589 ms, 2.05 s | 91 | |
| `/builder` (guided) | | 98 | 0 ms, 2.41 s | 100 | 98 / 100 |

Accessibility is 100 on every page. JS/data KB in the Lighthouse log: 86.9 without pick, 117.2 with pick (data as in the bytes table, `/gpu` 46.4); `/builder` 104.8 JS and 276.7 data (within the budget; the builder has no pick chunks).

Reading:
- `/gpu`, `/gpu?pick=1` and `/builder` are unchanged within noise. Lighthouse's phone load (slow 4G) hides the extra 30 KiB because the pick chunks load after the first paint.
- `/case` is at the 90 line (89–90 on the three runs), as at the Phase 2 gate: the known cost of the facet counts over 2,588 cases.
- `/case?pick=1` with a saved build (b, c) loses 6 points on the phone and 15 on the desktop (b): total blocking time rises from about 360 to 550–590 ms on the phone. That is the pick check running the engine over the case candidates (2,588 cases × the saved parts) right after the list arrives, on top of the facet counts. With an empty build (a) the extra work is not there. It is a candidate for the same fix as the facet counts (idle chunks, or a worker) and is not part of this task's budget, but it is below 90 and should be in the Phase 3 gate list.

## Stop-rule outcome

1. Byte budget: JS exceeded (115.0 > 110 KiB) on `/mobo`, `/cpu`, `/case` with `?pick=1`; data within. **Stopped after measuring, no code changed.** Needs an owner decision (options above).
2. `/gpu?pick=1` phone ≥ 90: yes (98–99).
3. `/case` phone: 90 (reported as known; fix = facet counts / C-items). New finding: `/case?pick=1` with a saved build is 84.

## Files

- `scripts/phase3/measure-pick.mjs` (new; the `bytes` and `lighthouse` modes above); `scripts/audit/lighthouse-baseline.mjs` unchanged.
- `docs/phase3/perf/lighthouse.json`, `docs/phase3/perf/bytes.json`.
- `docs/PROJECT-STATE.md`: rule 11, the byte-budget definition.
