# Phase 4 gate (step 5, task 16): the new builder

Date 2026-11-02. Branch `v2` (local only). Base: Task 14 `b2801c0` + merge of origin/main `59aab09` (`3c25b5c`).
Everything below was measured on the production preview (`npm run build` + `vite preview`, port 4173), not the dev
server. Screenshots are local only (`docs/phase4/screens/`, in `.git/info/exclude`); this file names them.

## Verdict

| Check | Result |
| --- | --- |
| Tasks 0–14 of the plan | **Done** (commits on `v2` up to `b2801c0`, merged `origin/main` 59aab09 as `3c25b5c` and 9601565 as `7593879`) |
| Task 15 (Backend queue) | In progress on `builddraft-scraper-fixes` (`a3-queue`); Q-B1 live on `main` (`9601565`), Q-B5/Q-B2/Q-B4/Q-B3 committed locally on `a3-queue` awaiting scheduled scrape verification |
| Task 16 (Phase 4 gate) | **Gate measured & verified** (56/56 buyer runs pass, 0 errors, full automated test suites pass) |
| `npm run check` (typecheck, lint, 1441 unit tests, build with live data check) | **Pass**. Lint: 0 errors, 1 warning (pre-existing `PriceChart` hook) |
| `npm run e2e` (Playwright) | **Pass** (194/194 passed in full Chromium suite, including 9 builder gate runs and recovery tests) |
| Compatibility scenarios | 81 scenarios: pass 63, gap 4 (S03, S04, S35, S45), unknown 14, failure 0 |
| Buyer matrix (7 builds × 2 modes × 2 viewports × 2 langs = 56 runs) | **56/56 pass** (712 screenshots; 0 errors, 0 unexpected warnings, line sums match total, share links & copy list verified) |
| Phone Lighthouse ≥ 90 (median of 3) | `/builder` (empty) **98**; `/builder` with build b saved **91** (remediated from 59, LCP 3.46 s, CLS 0.0005); `/builder?step=case` **89** (missed by 1, LCP 3.77 s, CLS 0) |
| Desktop Lighthouse ≥ 95 (median of 3) | `/builder` (empty) **100**; `/builder` with build b saved **100** (remediated from 87); `/builder?step=case` **100**; CLS 0 |
| Accessibility | **100** across all builder pages, phone and desktop |
| Rule 11 budget (first-paint JS ≤ 110 KB, data ≤ 300 KB gzip) | **Within**: empty builder JS 81.6 KB, data 1.5 KB |
| Layout audit (`scripts/audit/builder-flows.mjs`) | **0 issues** across all 16 mode × viewport × language permutations |
| Motion audit (`tests/unit/motion.test.ts`) | **Pass** (`prefers-reduced-motion` respected across all animated builder elements) |

## 1. Merge of origin/main
- `git fetch origin`: origin/main = `59aab09` (Q7 push of 02/11; no scrape commit after it). Merged into v2 as
  `3c25b5c`, no conflicts (79 files: scraper, tests, data).
- Before the merge, the local paths that blocked it were stashed: `CLAUDE.md` (popped, auto-merged clean) and 53
  `public/data/**` files whose local copies differed from origin/main. That stash is **kept, not popped**
  (`stash@{0}` "pre-gate-merge 2026-11-02 public-data"): the same files changed on both sides, so the merged
  origin/main data is what the site builds from. The owner decides whether to drop it. No other owner edit was touched.
- Data age at the gate (dist built from the merged data, `scripts/checks/source-age.mjs`, 02/11 ~07:30 UTC):
  BestPrice, Snif, Shopflix, e-shop.gr 8.6–9.3 h in all 9 categories; **Skroutz 25.1–57.0 h, older than 24 h in 9/9
  categories** (its scrapes fail on GitHub's runners since 01/11; owner dropped that work for now, 02/11).

## 2. The seven builds (`scripts/phase4/builds.mjs`, `scripts/phase4/drive.mjs`)
Each build is driven like a buyer: start screen (use + budget typed in), then Guided (one step at a time, search +
sort + "Choose") or the Part list (each line's picker sheet). 7 builds × Guided/Part list × 1366/360 × el/en = 56 runs,
a screenshot per step (`docs/phase4/screens/<build>-<mode>-<width>-<lang>-NN-<step>.jpg`), a JSON log per run
(`docs/phase4/screens/runs/`). Every run checks: Review's findings against the build's `expect` (any error, or any
warning outside the listed rules, fails), total = sum of the lines' shown prices, Copy list (title line, a line ending
with each part's listing URL and holding its variant title, the share link last), reload keeps the same lines and total,
the share link in a fresh browser context gives the same lines and total without writing the visitor's saved build,
no sideways scroll on Review, no page errors. `tests/e2e/builder-gate.spec.ts` runs 9 of the 56 inside `npm run e2e`.

**Result: 56/56 runs pass** (final pass after the fixes in section 5; 712 screenshots). Same lines and total in all 8
runs of a build (Guided = Part list, 1366 = 360, el = en).

| Build | Parts chosen (Guided, 1366, en) | Total today | Warnings on Review | Runs |
| --- | --- | ---: | --- | ---: |
| a cheap gaming 700 € | Ryzen 5 7500F (Tray), Biostar B650MS2-E, DDR5 32GB 2×16 6000, PNY RTX 5060 8GB, Thermalright Assassin X 90 SE V2, Kingston NV3 1TB, Montech XR, Gigabyte P650G 650W Gold | 1,421.21 € | none | 8/8 |
| b mid gaming 1,300 € | Ryzen 7 7800X3D, Gigabyte B650 Eagle, DDR5 32GB 6000, PNY RTX 5070 12GB, Phantom Spirit 120 SE, WD Black SN7100 1TB, Phanteks XT Pro Ultra, Adata XPG Kyber II 850W Gold, Arctic P12 Pro LN | 2,098.07 € | none | 8/8 |
| c high-end 3,500 € | Ryzen 9 9950X3D, Gigabyte X870E Eagle WiFi 7, DDR5 64GB 2×32 6000, Asus ProArt RTX 5090, Enermax Liqmax IV 360, Samsung 990 Pro 2TB, Lian Li O11 Dynamic Evo, Thermalright TR-SG1000 1000W Gold | 7,440.89 € | rule 14 (expected: maker 1000 W met, estimate 1100 W not) | 8/8 |
| d Mini-ITX 1,200 € | Ryzen 5 7600, Gigabyte B650I AX, DDR5 32GB 6000, PNY RTX 5060 8GB, Noctua NH-L9a-AM5, Kingston NV3 1TB, Fractal Terra, Deepcool PS750G 750W Gold SFX | 1,787.14 € | none | 8/8 |
| e everyday 500 € | Ryzen 5 8600G (Box, cooler not stated), ASRock A620AM-HVS, DDR5 16GB 2×8 5200, Intenso MI500 500GB, Montech Air 100 Lite, Tacens APB550 550W Bronze; no card (iGPU), no cooler | 647.51 € | rule 11 (expected: box cooler unknown, see reconciliation) | 8/8 |
| f Intel creating 2,000 € | Core Ultra 7 265K, ASRock Z890 Pro-A, DDR5 64GB 6000, PNY RTX 5070 Ti 16GB, Phantom Spirit 120 SE, Kingston NV3 2TB, Fractal North XL RC, Adata XPG Kyber II 850W Gold | 3,369.47 € | rule 8 (cooler 154 mm, case 155 mm), rule 14 (850 W = the estimate, no 10% headroom) — both true margins | 8/8 |
| g AM4 900 € | Ryzen 7 5800X3D (fallback: no 5700X3D offered today), ASRock B550 Phantom Gaming 4, DDR4 32GB 3200, Asus RX 9060 XT 16GB Dual, Thermalright Assassin X 120 R Digital, Kingston NV3 1TB, Phanteks XT View, Gigabyte P650G 650W Gold | 1,606.73 € | none | 8/8 |

No build has an error. Notes (rules 17, 22, 24, 25, 26, 30 …) are listed in each run's JSON; the "Not checked yet"
line names the fields no data has (card thickness, 12V-2x6 connector, board USB-C header). The totals are far over
the budgets for a, b, c, d, f because of today's prices (RAM), not because of the builder; the automatic build is
covered by task 10 and builder.spec.ts.

Changes made to the old test-drive expectations (and why):
- **e**: the old example expected "no cooler needed for the 8600G Box". AMD's downloaded pages do not state a box
  cooler (task 3), so the gate expects rule 11 = warning (unknown) and the cooler line "Missing"; no cooler is added
  and nothing is faked (controller's reconciliation note).
- **f**: rules 8 and 14 are allowed warnings: both are real margins (154 / 155 mm; 850 W against an 850 W estimate).
- **d**: the old "no fits with ATX" is checked twice: with "Only compatible" on, ATX units are hidden (the Terra's
  stated SFX-only support is a real "no"); with it off, none of the 15 ATX units says "Fits".

Harness limits: the gate drives the step list's address (`/builder?step=…`) between Guided steps and uses "Next"
only from the last step to Review (Next on every step is covered by builder.spec.ts); in the Part list the screenshot
is taken after the sheet closes; the e2e spec runs 9 of the 56 runs to keep `npm run e2e` under ~15 min.

## 3. The 32 findings of the test drive (20/10), re-run

Status per finding: **fixed** (the gate run that shows it, screenshot under `docs/phase4/screens/`) or **not now**
(the reason from the plan's table). A shot is `docs/phase4/screens/<run>-NN-<step>.jpg`; the table names run and step
(the same step exists in all 8 runs of a build).

| # | Finding (test drive 20/10) | Status | Evidence at the gate |
| --- | --- | --- | --- |
| 1 | No SFX PSU can be chosen | fixed | Build d chooses an SFX unit (Deepcool PS750G 750W Gold, SFX) in all 8 runs. Shot: `d-guided-1366-el-*-psu.jpg` |
| 2 | Terra + ATX PSU "fits" | fixed | With the Terra chosen, ATX units are hidden (a stated "no": the Terra row of `casePsu.ts`, from Fractal's page: SFX / SFX-L). With "Only compatible" off, 15 ATX units show and **none** is labelled "Fits". Shots: `d-*-probe-atx-in-terra.jpg`, `d-*-probe-atx-in-terra-all.jpg` |
| 3 | 1000 W hidden for 9950X3D + 5090; text twice | fixed | Build c: 1000 W units are offered (24 shown, label "Check"); the chosen one gives **one** rule 14 warning ("reaches the maker's 1000 W but not the 1100 W whole-build estimate"), no error. Shots: `c-*-probe-1000w.jpg`, `c-*-review.jpg` |
| 4 | PSU spec groups, junk first, Copy list "650W Gold" | fixed | PSUs are products ("Gigabyte P650G 650W Gold"); under Recommended the first unit states its efficiency (probe `psu-recommended`); Copy list: "Power supply: Gigabyte P650G 650W Gold · 650 W · 80+ Gold · ATX — …". Under "Price (lowest first)" unbranded no-efficiency units come first — that sort is by price, as the buyer chose. Shot: `a-*-probe-psu-recommended.jpg` |
| 5 | Recommended ignores use and budget | fixed | Recommended follows use + budget left (task 10); the start screen says "A 1080p gaming PC with 16 GB costs at least €729.47 today" for build a. Shot: `a-*-start.jpg` |
| 6 | Budget hints below prices, "0,00 € left", no culprit | fixed | "Costs at least X € today" on the start screen; build c (budget 3,500 €, total 7,440.89 €) shows the overrun in the summary. Shots: `a-*-start.jpg`, `c-*-review.jpg` |
| 7 | Box CPUs: cooler "not stated" | fixed, unknown kept where AMD states nothing | Official box-cooler table (task 3). Build e takes the 8600G Box: AMD's pages state no cooler, so rule 11 is a **warning (unknown)** and the cooler line stays "Missing · Choose" — never faked as included (gate reconciliation note). Shot: `e-*-review.jpg` |
| 8 | Quick list "optional" differs from Guided | fixed | Build e in both modes: graphics card "—" (optional: the 8600G has an iGPU), cooler "Missing" in both. Shots: `e-guided-*-review.jpg`, `e-quick-*-review.jpg` |
| 9 | H9 Flow 200 mm hides the 5090 | fixed (G1) | Build c, case step with the RTX 5090 chosen: "NZXT H9 Flow" and "H9 Flow 2025" are shown, "Fit not verified" (the 200 mm figure is not trusted). The Q-B1 override is still in the backend queue. Shot: `c-*-probe-h9flow.jpg` |
| 10 | Assassin X 120 Refined SE hidden on AM4 | fixed (G4) | Build g (AM4): 20 Assassin X 120 coolers shown; "Thermalright Assassin X 120 R Digital" chosen, "Fits". Shot: `g-*-probe-assassin-x120.jpg` |
| 11 | B550M-ITX/ac "Micro ATX" | fixed | "ASRock B550M-ITX/ac · B550 · AM4 · Mini ITX". Shot: `g-*-probe-b550m-itx.jpg` |
| 12 | AK400 97 mm / SG13 "ATX" / 3200D RS 180 mm | partly | **AK400 not now**: still 97 mm in the data; the fix is a Q-B1 override from Deepcool's page (backend queue, not pushed). **SG13 fixed at the gate**: the engine already said "board size not stated", but the SG13B-C card said "up to ATX" from v1's guess table (bug 2 below). **3200D RS**: cooler ≤ 165 mm, no GPU limit stated → "Fit not verified" (G1); its override is Q-B1. Shots: `g-*-probe-ak400.jpg`, `c-*-probe-sg13.jpg`, `c-*-probe-3200d.jpg` |
| 13 | Fans: one product, no quantity | fixed | Build b: the fans section of the case step with the fan plan, "Arctic P12 Pro LN 120mm" (× 1, "Likely fits · Case": 10 positions, sizes not stated) chosen; the quantity (× 3) in share link and Copy list is covered by builder.spec.ts. Shot: `b-*-fan.jpg` |
| 14 | Needless "not verified" | fixed | "Not verified" parts rank below verified ones; the reason is said once above the cards ("the board doesn't state its M.2 slots"). Shot: `a-*-storage.jpg` |
| 15 | Box and Tray twice | fixed | One CPU card with its versions (Ryzen 5 8600G: "no cooler" / "cooler: not stated"). Shot: `e-*-cpu.jpg` |
| 16 | Duplicate products | GPU fixed; storage not now | GPU twins merged in v2 (task 7). Storage: "Kingston NV3 1TB" and "Kingston SNV3S/1000G 1TB" are still two cards: B9 batch 2 (Q7) reached main on 02/11, but no scrape has run since, so the data keeps the old names. |
| 17 | HDD as only drive, no note | fixed | Under Recommended the first drive offered is an SSD (probe `first-drive-ssd`); the HDD-only note is in the task 12 unit tests. Shot: `e-*-probe-first-drive-ssd.jpg` |
| 18 | "Όλα ταιριάζουν" with parts missing | fixed | Build e: cooler "Missing", no "everything fits" line. Shot: `e-*-review.jpg` |
| 19 | Case label from the fan check | fixed | Labels name the other part: case "Fit not verified · GPU", storage "· Board". Shot: `a-*-case.jpg` |
| 20 | Included fans unknown (XT Pro Ultra) | not now | Q-B4 optional; 24 of the top 50 cases lack fan data; maker parsers are scraper work. Cards say "Fans in the box: not stated". |
| 21 | Quick list: cheapest-first junk, no sort/Review | fixed | The Part list uses the same picker (search, sort, chips) and the same Review; all 28 Part-list runs reach Review with Copy list and share link. Shots: `a-quick-*-psu.jpg`, `a-quick-*-review.jpg` |
| 22 | Share link drops a gone part silently | fixed | builder.spec.ts "a part the data no longer has is named … (finding #22)" passes in `npm run e2e`. |
| 23 | 360 px: first product below the fold | fixed | builder.spec.ts asserts card top + bar ≤ 780 on every guided step at 360. Shots: every `*-360-*` step |
| 24 | Picker under the phone bar | fixed | The Part list picker is a sheet above the bar. Shots: `*-quick-360-*` steps |
| 25 | 24 px price/shop links | fixed | builder.spec.ts: every control ≥ 44 px at 360; layout audit 0 issues. |
| 26 | Storage has no fit label | fixed | Storage cards carry labels (rules 17/18/20), the board's coverage said once. Shot: `a-*-storage.jpg` |
| 27 | Copy list: no PSU brand, wrong variant link | fixed | Every run checks a Copy list line ends with each part's listing URL and holds its variant title; PSU line = maker + model. |
| 28 | Steps vs summary order | fixed | One order (cpu, mobo, ram, gpu, cooler, storage, case, psu, fan) in steps, summary, Review, Copy list. Shot: any `*-review.jpg` |
| 29 | Board step repeats CPU text | fixed | Own guide text (task 14). Shot: `a-*-mobo.jpg` |
| 30 | English price formats mixed | fixed | "€1,421.21" everywhere in English, "1.421,21 €" in Greek. Shots: `*-en-*-review.jpg` |
| 31 | "1 θέσεις" | fixed | Montech XR card: "1 fan position" / "1 θέση ανεμ.". Shot: `a-*-case.jpg` |
| 32 | "650W" finds "1650W" | fixed | Searching "650W" shows no 1650 W unit (probe `650w-whole-number`). Shot: `a-*-probe-650w-whole-number.jpg` |

Count: 29 fixed (7 with the 8600G honestly unknown), 1 partly (12: SG13 fixed; AK400 / 3200D overrides wait for
Q-B1), 1 split (16: GPU fixed, storage not now), 1 not now (20).

## 4. Measurements

### Lighthouse 12, median of 3 (`docs/phase4/perf/lighthouse.json`)
`node scripts/phase3/measure-pick.mjs lighthouse http://localhost:4173 docs/phase4/perf <raw> 3
builder-guided,builder-gate-b,builder-step-case` with `GATE_BUILD=docs/phase4/perf/build-b.json` (build b's saved
`pcBuild`, from the gate run b-guided-1366-en). Fresh profile per run, storage preset, production preview.

**Baseline (initial gate run before loading and layout remediation):**

| Page | Phone (runs) | LCP | CLS | Desktop (runs) | CLS | Transfer JS / data | Target |
| --- | --- | ---: | ---: | --- | ---: | --- | --- |
| `/builder` (empty, start screen) | **98** (98/98/98) | 2.26 s | 0 | **100** (100/100/100) | 0 | 83.9 / 2.2 KB | met |
| `/builder` with build b saved | **59** (59/55/59) | 7.06 s | **0.357** | **87** (87/87/89) | **0.154** | 161.8 / 947.5 KB | **missed** |
| `/builder?step=case` | **89** (89/89/89) | 3.77 s | 0 | **100** (100/100/99) | 0 | 139.8 / 213.8 KB | **phone missed by 1** |

**Remediated (with deferred extra shop data, ShopChoice min-height, stable badge geometry, and delayed speculative prefetch):**

| Page | Phone (runs) | LCP | CLS | Desktop (runs) | CLS | Transfer JS / data | Target |
| --- | --- | ---: | ---: | --- | ---: | --- | --- |
| `/builder` (empty, start screen) | **98** (98/98/98) | 2.26 s | 0 | **100** (100/100/100) | 0 | 84.0 / 2.1 KB | met |
| `/builder` with build b saved | **91** (91/91/91) | 3.46 s | **0.0005** | **100** (100/100/100) | 0 | 165.5 / 173.5 KB | **met** |
| `/builder?step=case` | **89** (89/89/89) | 3.77 s | 0 | **100** (100/100/100) | 0 | 142.1 / 162.4 KB | **phone missed by 1** |

Causes & remediations:
- **Build b saved**: Resolved from 59 to 91 on mobile (and 87 to 100 on desktop). Deferring eager `wantExtra()` downloads in Review and scoping per-slot chunk loading reduced data transfer before paint from 947.5 KB to 173.5 KB. Layout shift (CLS 0.357 -> 0.0005) was eliminated by reserving `min-h-6` badge space in PartList/Review and `min-h-11` in ShopChoice.
- **`?step=case` phone 89**: LCP waits for `case.json` (102.6 KB, the largest step file) plus the worker check; phone score sits at 89 (1 point below the 90 threshold), while desktop reaches 100 and CLS is 0. Speculative prefetch for subsequent steps was deferred by 2000 ms to give the visible step clear network priority.

### Bytes, rule 11 (`docs/phase4/perf/bytes.json`, `scripts/phase3/measure-pick.mjs bytes`; gzip level 6 of bodies)
- `/builder` until the network is idle: **JS 81.6 KB, data 1.5 KB** (manifest 0.6 + builder/index 0.9), fonts 65.7 KB
  apart — within 110 KB / 300 KB. Task 11's first-paint method (gzip 9, `task-11-bytes.mjs`): 83,387 B = 81.4 KiB JS,
  1,566 B data (task 14: 81.4 KiB — unchanged).
- `/builder?step=case`: 154.4 KiB JS, 207.8 KB data (case 102.6 + fan 50.4 + psu …), within the data limit; JS past
  110 KB here is the lazy Workbench + checker chunks after the first paint (not counted under rule 11, decision 12/10).
- `/builder` with a saved full build: ≈ 398 KB of step files are needed to show the lines (over 300 KB by itself)
  plus ≈ 547 KB of extras (see above). Rule 11 was set for the empty page; the owner should decide whether it also
  binds a restored build.
- Other pages from the same run (for comparison, unchanged by this step): `/gpu` 101.6 / 84.4 KB, `/case` 101.6 /
  522.2 KB (not a builder page; outside this gate), product pages 113.9 / 8.9–17.8 KB.

### Step change on a throttled phone (`scripts/phase4/steptime.mjs`)
Step transition times on throttled mobile (412 px viewport, CPU 4× slower, 150 ms latency, 1.6 Mbit/s down, 750 kbit/s up, Greek locale):

- **Wait 3000 ms between steps (speculative prefetch allowed to settle)** (`docs/phase4/perf/steptime-wait3s.txt`):
  `median: cpu 3626 · mobo 238 · ram 96 · gpu 127 · cooler 113 · storage 87 · case 264 · psu 188 ms` (warm step transitions all < 270 ms).
- **Wait 0 ms (immediate click-through without idle prefetch window)** (`docs/phase4/perf/steptime-wait0.txt`):
  `median: cpu 3625 · mobo 563 · ram 694 · gpu 798 · cooler 524 · storage 1008 · case 1434 · psu 1039 ms` (all < 1.5 s on slow network).

### Automated check results

- **`npm run check`**: PASS (55 test files, 1441 tests passed; lint 0 errors, 1 pre-existing warning in `PriceChart.tsx`; production build with live data check passed).
- **`npm run e2e`**: PASS (194 tests passed in full Chromium suite, including 9 builder gate matrix runs and recovery tests).
- **Standalone scraper checks**: 16 standalone test suites passed (no regressions on normalizers or history merge driver).
- **Compatibility scenarios**: 81 scenarios evaluated: 63 pass, 4 known gaps, 14 unknown, 0 failures.
- **Layout audit (`scripts/audit/builder-flows.mjs`)**: 0 issues across all 16 permutations (2 builder modes × 4 screen widths × 2 languages).
- **Motion audit (`tests/unit/motion.test.ts`)**: PASS (`prefers-reduced-motion` respected across animated builder components).

## 5. Bugs found at the gate

Three real bugs, each small, fixed at the gate with a check that failed first or a unit test (listed for the reviewer):

1. **360 px: a step scrolled sideways** (`src/components/builder/Picker.tsx:260`, `PartCard.tsx:62`). The cards' grid
   had no explicit column, so its one track took the min-content width of the widest card: a cooler's spec line
   "AIO 360mm · AM4/AM5/LGA1700/LGA1851" (raised to 14 px on phones) made the cards 346 px wide from x = 28, page
   374 px in a 360 viewport (build c, cooler step, el and en). The gate run failed on it (the phone's bar covered
   the shifted card: "li.card intercepts pointer events"). Fix: `grid-cols-1` (= `minmax(0, 1fr)`) on the list and
   `[overflow-wrap:anywhere]` on the spec line. `drive.mjs` now checks sideways scroll after every chosen part; the
   rerun is green. The task 14 layout audit missed it because its walk picks the first card, not a 360 mm AIO.
2. **Case card "up to ATX" for a case of unknown size** (`src/lib/builderData.ts:170`, `parts.tsx:139`). The card
   used v1's guess table (`categoryRules.BOARD_BY_CASE_SIZE`, which still maps `Άλλο` to ATX) while the engine
   (H5, owner 27/10) says "board size not stated": SilverStone SG13B-C showed both. Fix: the engine's table, and no
   "up to" segment when it gives nothing. Unit test in `tests/unit/builderData.test.ts` ("the board size on a case card").
3. **Greek "Άλλο" in English board cards** (`parts.tsx:91`): "Asus ROG Strix B650E-I Gaming WiFi | B650E · AM5 · Άλλο"
   on the English page. Fix: `groupName` (shows "Other"). The board's real size is Mini ITX; its data has no stated
   size — a data note for the backend queue, not fixed here.

Test hook (no behaviour change): Review's message items carry `data-rule` and `data-status`
(`src/components/builder/Review.tsx:152`) so the gate can check findings by rule instead of by text.

Seen, not bugs or not in scope (for the owner):
- Build a's budget is 700 € but the parts cost 1,421 € today (RAM: 32 GB DDR5 from ~500 €); the start screen says
  "costs at least €729.47" for its cheapest automatic build. Prices, not a defect.
- Under Recommended with build a's case, the first PSU is a Be Quiet Dark 14 850W Titanium (174.78 €), although the
  budget is long spent (observed; not traced further — the owner may want to look at it with the task 10 rules).
- A search for "650W" in a Midi Tower build lists SFX units first under Recommended (they get "Fit not verified" with
  the bracket note).
