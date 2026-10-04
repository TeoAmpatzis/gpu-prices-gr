# BuildDraft.gr v1 — audit (v2 Phase 0)

2026-10-03/04 · branch `v2` (v1 code unchanged) · Plan: `docs/redesign-v2.md` · Raw results, screenshots and per-part reports: `docs/audit/` · Scripts: `scripts/audit/`, tests: `tests/compat/`, `tests/e2e/`.

**Data snapshot.** Every part of the audit except B5 used the data of commit `d1dcaab` ("chore(data): update prices 2026-10-03 12:52", 12:52 UTC), the last data commit before the scraper outage (issue OPS-01). B5 (Lighthouse) ran after merging main again; see section 7. Builds were the v1 code of `4c65539`, served by `vite preview` from a copy of `dist`.

**What "verified" means here.** *Verified* = I ran it, or traced the mechanism in this repo's code. *Hypothesis* = consistent with the data but not traced (usually because the cause is on a shop's page, which this audit was not allowed to open). Numbers come from scripts in the repo and can be re-run (commands at the end of each section).

<!-- SUMMARY -->

## 2. Severity scale

| Level | Meaning (from the brief) |
| --- | --- |
| **S1** | The site tells the user something false that could cost them money: says compatible when it isn't, shows a wrong price, uses a wrong spec in a check. |
| **S2** | A feature does not work. |
| **S3** | A usability problem. |
| **S4** | Cosmetic. |

How I applied S1: an error is S1 when it can let a user **buy a build that doesn't work or pay a price that isn't real** (v1 says "fits"/"pass" or shows a price it shouldn't). When a wrong spec only makes v1 **stricter** than reality (it hides parts that fit, or asks for a part that isn't needed), I graded it S2 and say so in the row: it is a broken feature but it errs on the safe side. You may want some of those treated as S1; they are marked "safe direction".

## 3. Issues

**IDs:** `OPS` operations · `D` data (B3) · `C` compatibility logic (B1) · `B` builder flows (B2) · `UX` UX audit (B4, numbering kept from `docs/audit/ux.md`) · `P` prices · `PERF` performance (B5) · `T` tooling. **Fix target:** "v1 hotfix" = proposed for main now (your decision, nothing applied); "v2 Pn" = a phase of the plan (P1 design system, P2 compatibility engine + new data fields, P3+ = the page phases — the plan's roadmap block was lost in the Markdown export, so exact numbers after P2 are mine).

### 3.1 S1 — not fixed; each has a proposed minimal fix and waits for your decision

| ID | Area | Description | Steps to reproduce | Evidence | Root cause | Proposed minimal fix · target |
| --- | --- | --- | --- | --- | --- | --- |
| **D-01** | Data → builder rule 8 | 28 of the builder's 314 measured air coolers have a height under 40 mm (21–28 mm: a fan's thickness, not the tower's height), e.g. Alpenfoehn Brocken 4 27 mm, Deepcool AK400 G2 25 mm, Thermalright Assassin Spirit 120 Vision 25.6 mm. The builder rates them "Fits" in every case that states a cooler limit. 72 listings / 26 models in the category data. | `#builder?cpu=Ryzen 7 9700X%7Cfalse&case=sharkoonmsy1000&cooler=deepcoolak400g2` (case limit 135 mm; the AK400 G2 is ~155 mm — our own "AK400 G2 Digital NYX" model says 156 mm) → Review: cooler **"Fits"**, summary **"Everything fits"**. | **Reproduced in the UI:** `docs/audit/s1/D-01-review-1366-en-light.jpg` (`node scripts/audit/s1-repro.mjs docs/audit/s1`). `docs/audit/data/builder-impact.json`, `implausible.json`, data-quality.md §3; 28 rows re-counted from `dist/data/builder.json`. | **Verified:** `scraper/specs.py` `parse_cooler` copies the product page's "Ύψος" field; the builder compares it as is. **Hypothesis:** those Skroutz/BestPrice pages hold the fan's height there (23 raw spec-cache entries < 30 mm). | Treat an air cooler height under 30 mm as unknown ("Fit not verified") — one condition where the builder reads `heightMm` (site only, no scraper change). Real ultra-thin coolers then show "not verified", which is safe. · **v1 hotfix** |
| **D-02** | Data → builder rule 14 | 12 current cards carry a "minimum PSU" equal to their board power: PNY RTX 5050 130 W, MSI RTX 5060 Shadow 145 W, Sparkle Arc B570 170 W, PNY RTX 5060 Ti 180 W, Acer RX 9070 245 W (4 rows), PNY RTX 5070 Ti 300 W. The builder uses the card's figure before the chip table, so it rates a 300–450 W PSU as enough for an RTX 5070 Ti. | `#builder?cpu=Ryzen 7 9700X%7Cfalse&gpu=skroutz:60811441&psu=350W Bronze ATX` (PNY RTX 5070 Ti) → Review: card and PSU **"Fits"**, **"Recommended PSU: ≥ 300 W"**, **"Everything fits"**. | **Reproduced in the UI:** `docs/audit/s1/D-02-review-1366-en-light.jpg`. builder-impact.json; `dist/data/builder.json` (PNY RTX 5070 Ti `minPsu` 300; 22 PSU models of 300–499 W are offered). | **Verified:** `src/lib/builder.ts:162` `gpuPsu = minPsu ?? GPU_PSU[chip]`; `specs.py` reads Skroutz "Ελάχιστη Ισχύς Τροφοδοτικού". **Hypothesis:** those Skroutz pages put the board power in that field (the values equal the chips' board power). | Use the larger of the card's figure and the chip table (`Math.max(minPsu ?? 0, GPU_PSU[chip] ?? 0) || null`) — one line, site only; it can only raise the recommendation. · **v1 hotfix** |
| **D-03** | Data → builder rule 3, RAM €/GB | 113 RAM listings in 42 models (mostly Shopflix "… DDR5 32GB 6000MHz (2x16)") are filed as one stick ("DDR5 32GB (1×32GB) 6000MHz"); 31 of the builder's 239 RAM rows contain such a listing. A 4-stick kit filed as 1 stick passes a 2-slot board, and the category page mixes kits with single sticks. | `#ram` → "DDR5 32GB (1×32GB) 6000MHz" → expand → Shopflix offers whose titles end "(2x16)". | data-quality.md §2 RAM ("title states another kit"), builder-impact.json. | **Verified:** `scraper/normalize_ram.py` `KIT` needs "GB" after the module size, so "(2x16)" is not read. | Accept "(NxM)" without "GB" when N×M equals the stated total (scraper regex; the moved listings start new history under the right model, nothing is lost). · **v1 hotfix on main (scraper, needs your OK — scraper rule)** |
| **D-04** | Data → builder rule 2 | DDR5 kits whose shop titles say "DDR4" are filed as DDR4 (G.Skill `F5-6000…`, ADATA `AX5U6000…`, Lexar `LD5S…`): builder rows "DDR4 16GB (1×16GB) 6000MHz" and "DDR4 64GB (2×32GB) 6000MHz" pass the DDR4-board check. Also 31 registered/ECC server DIMMs (Micron `MTA…72P`, Kingston `KSM…R`, Samsung `M393…`) are classified Desktop; 2 are a builder row's own listing. | `#builder?mode=quick` → board with DDR4 → RAM picker → "DDR4 … 6000MHz" is offered. | data-quality.md §2/§3 (RAM), builder-impact.json. | **Verified:** `normalize_ram.py` takes the type from the title first and defaults the form factor to Desktop. RDIMM detection = part-number heuristic (general knowledge). | Let a known part-number prefix (F4-/F5-, AX4/AX5, LD4/LD5) decide the DDR type when the title disagrees; mark the RDIMM prefixes Server. · **v1 hotfix on main (scraper, needs your OK)** |
| **D-05** | Data → builder rule 5 (and rule 2) | 2 E-ATX boards the builder offers are labelled ATX (Asus ROG Maximus Z890 Extreme WiFi, ASRock X870E Taichi Lite WiFi; Shopflix "Extended ATX" titles), so the builder says they fit ATX cases. 6 board models (33 listings, 5 offered) mix DDR4 and DDR5 versions, e.g. "ASRock H610M-HDV/M.2+ D5" inside the DDR4 "H610M-HDV/M.2". | Quick list → board "Asus Rog Maximus Z890 Extreme WiFi" → case with max board ATX → "Fits". | data-quality.md §4 (11 size contradictions), §2 mobo. | **Verified:** `normalize_mobo.py` removes e-shop's "D5", `productKey` drops "+"; "Extended ATX" in the Shopflix tail is not read as E-ATX. | Read "Extended ATX" as E-ATX; keep "D5"/"+" in the board name. · **v1 hotfix on main (scraper, needs your OK)** |
| **P-01** | Prices (lists, details) | The "… με μεταφορικά" total can belong to **another offer** than the price above it. Example: RAM "Lexar 32GB DDR5 5600 C46" shows **280,47 €** and **"590,01 € με μεταφορικά"** (tooltip "Techstores: 586,51 € + 3,50 €"). In 196 of the 10,361 listings that have a total, the offer behind the total differs from the shown price by more than 25% (92 higher, 104 lower — the lower case shows a "with shipping" price **below** the price itself). | `#ram` → "DDR5 32GB (1×32GB) 5600MHz" → expand → first offer. | `public/data/ram/offers.json` entry `bestprice:2160475229` (`price 586.51, listingPrice 280.47`, checked 11:55:58, the same minute as the list); count script in this session; screenshot `docs/audit/ux/ux-details-1366-el-light-ram.jpg` (UX-25). | **Verified:** `scraper/shipping.py` `bestprice_offer` / `skroutz_offer` skip offers whose shipping isn't stated and keep the cheapest total of the rest; nothing ties it to the listing's price. **Hypothesis:** the 280,47 € offer had no stated shipping. | Show the total only when the offer behind it has the listing's price (within 2%); otherwise show nothing. Site only (one condition where `total` is shown). · **v1 hotfix** |
| **D-06** | Data (storage, Server tier) | "Toshiba Enterprise 2.4TB" (10k rpm SAS, 690,90 €) and "Toshiba Enterprise 24TB" (1.316,17 €) are one model, which shows the 2.4TB price for the 24TB drive. 1.2/12, 1.6/16, 1.8/18 TB can collide the same way. Not offered by the builder (Server tier). | `#storage?seg=pro` → search "Toshiba Enterprise 24TB". | data-quality.md §2 storage ("key collision"). | **Verified:** `model_key` / `productKey` keep only `[a-z0-9]`, so "2.4tb" = "24tb". | Write non-integer TB capacities as GB in the storage name ("2400GB"). · v1 fix on main (scraper) or v2 P2 — low reach |

### 3.2 S2

| ID | Area | Description | Steps to reproduce | Evidence | Root cause | Fix target |
| --- | --- | --- | --- | --- | --- | --- |
| **OPS-01** | Scraper (production) | **Prices stopped updating** after 2026-10-03 12:52 UTC: the scheduled scrapes of 16:19, 21:19 and 05:57 UTC failed at start-up (`ImportError: Modest backend is deprecated since selectolax 1.0`). The history import would have failed the same way. **Fixed** with your approval: `7cf0c9d` pins `selectolax>=0.3,<1.0` on main. <!-- SCRAPE --> | `gh run view 37181364953 --log-failed` | Run logs 37136428081, 37154673988, 37181364953 (failed), 37120505121 (last green: selectolax 0.4.13). | **Verified:** `scraper/requirements.txt` had `selectolax>=0.3`; selectolax 1.0.0 (released 2026-10-03) removed `selectolax.parser`, imported by 14 scraper files. | Done (pin). Lexbor migration → `docs/v2-backlog.md` #1; caps for the other dependencies → #2; failure alert → #6. New CLAUDE.md rule: every Python dependency gets a version cap. |
| **C-01** | Builder rule 14 / "Only compatible" | With a GPU and a PSU that's too small for it, **every CPU is hidden**: CPU step "0 shown · 359 incompatible hidden", "No parts match these filters" (nothing says the PSU is the reason). The innocent CPU also gets an "Incompatible" label, the clash is counted twice, and the message is repeated ("550 W power supply; at least 850 W is needed." twice). | `#builder?gpu=bestprice:2160322211&psu=550W%20Bronze%20ATX&step=cpu` (RTX 5080 + 550 W). | `docs/audit/picker/P7-cpu-only-compatible-on.jpg`, `picker-audit.json` (P7), compat S12/S26 messages. | **Verified:** `src/lib/builder.ts:448–449` records the PSU failure against both the GPU pair and the CPU pair, so every CPU candidate rates "no". | v2 P2 (rules attach to the parts that cause them). Could be a 1-line v1 fix: only add the CPU pair when the CPU's own +100 W changes the result. |
| **C-02** | Data → builder rule 21 (safe direction) | Case fan positions undercounted: Kolink Observatory HF Mesh has `fanSlots` 1 (its titles say 6 fans included); 25 Midi/Full towers have < 3. v1 then says "Incompatible: 3 fans; the case has 1 fan positions" and hides 563 of 1,720 fan packs. | `#builder?case=kolinkobservatoryhfmesh&step=fan` → "1157 shown · 563 incompatible hidden". | `docs/audit/picker/P6-fan-only-compatible-on.jpg`, compat S35 (wrong), `public/data/case/specs.json` (`skroutz:55377549` fanSlots 1, `bestprice:2159911221` fanSlots 6). | **Verified:** `scraper/specs.py:137` sums only positions whose value is a bare number (`v.isdigit()`); `fanSlots` is not reconciled between sites (not in `SAFER`), and the builder row took Skroutz's 1. **Hypothesis:** Skroutz's page writes the other positions as "N x 120mm". | v1 option: treat `fanSlots` below the included fans or below 3 for towers as unknown. v2 P2 (data validation). |
| **C-03** | Builder rule 14 | The PSU recommendation ignores CPU power except +100 W for "Ryzen 9 / Core i9 / Ultra 9" names: i7-14700K (PL2 253 W) + RTX 5070 Ti + 750 W passes; the plan's formula asks 850 W (S59). 9950X + 5090 + 4 sticks + 2 drives + 6 fans: v1 1,100 W, plan 1,200 W (S62). | `#builder?cpu=Core%20i7-14700K%7Cfalse&gpu=bestprice:2160396062&psu=750W%20Gold%20ATX` | compat-results.md "Recommended power supply"; B2 wattage table (§6). | **Verified:** `requiredWatts` (`builder.ts:169`) = card figure + 100 W for top-tier names. Reference TBP/PPT/PL2 values are recalled, not fetched. | v2 P2 (plan formula). |
| **D-07** | Data → builder rule 11 (safe direction) | 41 CPU listings (32 models; 21 builder rows) sold as "Tray με ψύκτρα" / "Tray with Fan" have `coolerIncluded = false`, so the builder asks for a cooler that's in the box. 154 of 359 CPU rows have it unknown. | `#builder?mode=quick` → CPU "Athlon 3000G" (Tray row) → note "The CPU has no cooler". | data-quality.md §3 (cpu), builder-impact.json. | **Verified:** `specs.py` `apply` sets `false` for any Tray listing without a stated value. | v1 option: Tray + title "ψύκτρα/Fan" → unknown. v2 P2. |
| **D-08** | Data → builder rule 5 (safe direction) | In 19 case models the sites disagree on the largest board and the builder uses the smaller, most common value (Thermaltake The Tower 300: Mini ITX vs Micro ATX/ATX); 3 Mini-ITX boards (ASRock A520M-ITX/ac, B550M-ITX/ac) are labelled Micro ATX and hidden for ITX cases. 129 case models disagree on the size label (the board-size fallback). | Builder → case "Thermaltake The Tower 300" → Board step: Micro ATX boards hidden. | builder-impact.json, data-quality.md §2/§4. | **Verified:** builder takes the most common value; `normalize_mobo.py` lets the chipset's "M" suffix win over the stated size. | v2 P2 (per-field conflict rule: stated > estimated, larger/smaller by safety). |
| **D-09** | Data grouping | One product split into several models, so a buyer can miss its cheapest offer: coolers keep Shopflix words ("Τριπλού Ανεμιστήρα 120mm"; 165 models have a twin without them — the Asus ROG Strix LC III 360 is spread over 6 models); 68 groups across categories differ only in word order; filler words, part numbers, e-shop leftovers. 11 cooler models mix Air and AIO listings (the builder checks the cheapest listing's type). | `#cooler` search "ROG Strix LC III 360". | data-quality.md §2 (20 worst examples per category). | **Verified:** `productKey` drops Greek letters but keeps "120mm"; Shopflix slug "udropsuxe" not in the water-word list. | v2 P2 / the planned duplicate-merge task (needs `allow_history_shrink`). |
| **D-10** | Data (Skroutz family cards) | The title shown names another variant than the price and link: 38 PSU listings (title "MSI MPG A1000GS", link and spec A1250GS), 36 storage, 8 RAM, 3 cooler, 2 fan, 1 GPU. AIOs: the radiator from the spec line contradicts the title (22 models, "1STPLAYER Mothra MT360 240"). | `#psu` → 1250W Gold → Skroutz offer titled "A1000GS". | data-quality.md §2. | **Verified:** `scraper/sources/skroutz.py` takes the title from the card and the price/URL from the JSON-LD of the linked variant. | v2 P2 (scraper). |
| **D-11** | Data (RAM speed) | 1,063 Shopflix listings say "με Ταχύτητα 3600" but get no speed (84 "speed not stated" models with 1,234 listings); one builder row is "DDR5 64GB (2×32GB) **60000MHz**" (1.637,32 €; e-shop's title says 60000MHZ); DDR5 at 2400/2800 (the I/O clock). | `#ram` → speed filter / search "60000". | data-quality.md §3 (ram). | **Verified:** `normalize_ram.py` reads only "MHz/MT/s" or the Skroutz slug, no range check. | v2 P2 (scraper). |
| **D-12** | Data (storage) | Drive variants merged: 43 models mix SATA and SAS, 30 mix form factors (M.2/U.2/2.5"), 16 mix RPM (WD Purple 8TB 5400/7200); 8 offered by the builder (WD Blue SA510 2.5" and M.2). | `#storage` → "Philips Ultra Speed 480GB". | data-quality.md §2 storage, builder-impact.json. | **Verified** (key = chip + media; interface/form factor not in the key for most names). | v2 P2. |
| **UX-13** | Filters | "Cache DRAM (SSD)" covers 29 of 1,641 SSD models; choosing "Ναι" hides every drive whose DRAM isn't stated, without saying so. | `#storage` → DRAM filter. | `docs/audit/ux/ux-list-1366-el-light-storage.jpg`. | Observed; the filter tests the listing value (unknown = no match). | v2 P3 (coverage rule, plan filter rule 4). Graded S3 in ux.md; S2 here because the filter gives wrong results. |
| **B-04** | Builder (storage step, slow network) | If `builder-storage.json` fails to load, the required Storage step shows **"Loading…" forever** — no error, no retry button; the build can't be completed. | Block `/data/builder-storage.json` (HTTP 503) → `#builder?step=storage`. | `docs/audit/builder/031-n-en-1366-storage-failed.jpg` (after 12 s), `builder-flows-…json` (`n.failedStorage`). | **Verified:** `src/lib/builderState.ts:151–154` sets `lazyReady[slot] = false` on failure, the same state as "not loaded yet"; it retries only when the step is requested again. | v2 builder (error state with retry). 1-line v1 option: show an error when `lazyReady[slot] === false`. |

### 3.3 S3

| ID | Area | Description | Steps / where | Evidence | Root cause | Fix target |
| --- | --- | --- | --- | --- | --- | --- |
| C-04 | Builder rule 9 | AIO 360 mm + case whose maker lists radiators up to 280 mm → v1 "Fit not verified" (with the reason), not "Incompatible" (S09). | Builder: Lian Li case with maker radiator list + 360 AIO. | compat S09. | **Verified:** owner's rule (CLAUDE.md) "a maker list read wrongly must never hide a part". Not a bug — a policy the plan contradicts (plan feedback §9). | v2 P2 (decide policy). |
| C-05 | Builder rule 21 | 3 × 140 mm fans in a case whose maker lists 2 × 140 → "Fit not verified" (S33); plan: error. | compat S33. | compat-results.md. | Same policy as C-04. | v2 P2. |
| C-06 | Builder rule 11 | Box CPU with cooler-in-box unknown and no cooler → v1 **error** ("pick one to be safe"); plan: warning (S18). | compat S18. | compat-results.md. | **Verified:** `buildNotes` uses the error level. | v2 P2. |
| C-07 | Builder rules 6, 8, 14 | No margin warnings: a 340 mm card in a 340 mm case, a 155 mm cooler under a 160 mm limit, a PSU exactly at the recommendation all "Fit" (S23, S44, S25). | compat. | compat-results.md. | v1 has no warning level. | v2 P2. |
| C-08 | Builder (gaps) | v1 does not check rules 4, 7, 13 (BIOS: Ryzen 9000 on B650 gets no warning, S03), 15, 16 (SFX-only cases), 17, 18, 22–26, and holds one part per category (no second RAM kit, drive or fan pack). 28 of 99 expected rule results are "not checked". | compat. | compat-results.md "Rules v1 checks". | By design of v1. | v2 P2 (engine) and builder (quantities). |
| D-13 | Data (GPU) | Phantom models "RTX 5070 16GB" (2 Snif listings whose part number says `-12GD`), "RTX 5070 Ti 12GB", "RX 9070 12GB". Builder picks per listing, so only labels and the VRAM filter are wrong. | `#gpu` → RTX 5070 16GB. | data-quality.md §2 GPU. | **Verified:** model key = chip + VRAM stated in the title. | v2 P2. |
| D-14 | Data (coverage) | Builder-critical clearances stay thin: case max GPU length 26.5% of case models (39.6% of the most-listed quarter), max cooler height 14.8%, radiator sizes 2.5%, fan positions per size 2.6%, fans in the box 5.7%; cooler sockets 33.1%; air-cooler height 26.0%. | — | §5, data-quality.md §1. | Data not collected yet (makers phase partly done). | v2 P2 (new fields + makers). |
| D-15 | Prices | Prices far below their model's median are shown as normal and recommended first: Samsung 990 Pro Heatsink 2TB 239,99 € (Snif; next offers 397/439 €) was the builder's first storage card; RAM 14 listings (11 are a model's shown price), cases 2 (Nanoxia Deep Silence 9 White 54,27 € vs 248,95 €). Real or not can't be checked offline. | `#storage` Recommended. | UX-26, data-quality.md §3. | Hypothesis: mismatched listings or shop errors. | v2 P1 (outlier badge, plan price rule 4). |
| UX-01 | Navigation | No home page; on phones the builder tab is off-screen (x = 1102 px at 360). | `/` at 360. | `ux/ux-first-visit-360-el-light.jpg` | Observed. | v2 P3 (home, nav). |
| UX-02 | Navigation | The builder tab is clipped by 13 px at 1366/1920 in Greek light ("Συναρμολόγηση P("). Seen in this session's screenshot. | `#gpu` 1366 el light. | `ux/ux-tabbar-builder-cut-1366-el-light.jpg` | Hypothesis: light theme `body` weight 450 vs 400 in dark. | **v1 hotfix candidate** (trivial). |
| UX-03 | Navigation | Hidden tabs with no scroll cue; current tab off-screen at 360/768. | `#case` 768. | `ux/ux-tabbar-768-el-light.jpg`, `ux/ux-active-tab-hidden-768-el-dark-case.jpg` | Observed. | v2 P3. |
| UX-04 | Status line | "5 καταστήματα" names sources (3 are comparison sites); a late source's age is hidden. | Status popover. | `ux/ux-status-popover-1366-el-light-gpu.jpg` | Observed. | v2 P1. |
| UX-05 | Keyboard | No skip link: 37 Tab presses to the first product. | `#gpu` keyboard. | `ux/ux-focus-row-1366-el-light.jpg` | Observed. | v2 P1. |
| UX-10 | Filters | Pill groups start all ticked; clicking "NVIDIA" removes NVIDIA. | `#gpu` → NVIDIA pill. | `ux/ux-pill-click-nvidia-1366-el-light-gpu.jpg` | Observed (design). | v2 P3. |
| UX-11 | Filters | Spec filters are single-choice dropdowns of up to 169 options, no search, zero options kept; price has max only. | Any sidebar. | `ux/ux-storage-sidebar-specs-1366-el-light.jpg` | Observed. | v2 P3. |
| UX-12 | Filters/data | Maker lists contain non-makers ("Midi", "ATX", "Gaming") and case duplicates ("Armaggeddon"/"ARMAGGEDDON"). | `#case` maker dropdown. | `ux-full/lists.json` (not committed) | Hypothesis: vendor normalisation (`names.valid_vendor`). | Scraper + v2 P3. |
| UX-14 | Filters | Some columns have no filter (storage speed/TBW/rpm, €/fan, 7-day change, price with shipping). | — | ux.md table. | Observed. | v2 P3. |
| UX-15 | Filters | No quick filters above the list; on phones sort lives in the sheet. | `#gpu` 360. | `ux/ux-list-360-el-light-gpu.jpg` | Observed. | v2 P3. |
| UX-16 | Tables | Headers don't sort; no €/GB, €/W, per-fan sort. | Click "VRAM". | `ux/ux-list-1366-el-light-gpu.jpg` | Observed. | v2 P3. |
| UX-17 | Copy | Same word for different things; three different reset buttons. | `#gpu`. | `ux/ux-empty-1366-el-light-gpu.jpg` | Observed. | v2 P1/P3. |
| UX-18 | Lists | Spec-group rows (RAM/PSU/GPU) show one maker and one photo for many makers. | `#ram` DDR5 32GB 5600. | `ux/ux-details-1366-el-light-ram.jpg` | Design (spec models). | v2 product page. |
| UX-19 | Errors | Load error shows raw text ("…: HTTP 500", "Failed to fetch" in English), no retry. | Block list.json. | `ux/ux-error-http500-1366-el-light-gpu.jpg` | Observed. | v2 P1. |
| UX-23 | Prices | Real shop, shipping breakdown and 7-day change are hover-only; no availability; no per-price check time. | Any list on a phone. | `ux/ux-details-1366-el-light-gpu.jpg` | Observed; availability is not collected. | v2 P1 (price cell). |
| UX-24 | Prices | The 7-day change has no label. | Any list. | `ux/ux-list-360-el-light-gpu.jpg` | Observed. | v2 P1. |
| UX-28 | Details | A product has no address; Contact asks for a product link that doesn't exist. | Open any product. | `ux/ux-info-360-el-light-contact.jpg` | Design. | v2 product page. |
| UX-29 | Details | Offer titles cut to 15–30 characters; offers look identical. | `#gpu` details 1366. | `ux/ux-details-1366-el-light-gpu.jpg` | Observed. | v2 product page. |
| UX-30 | Details | On phones offers are a 320 px scroll box; ordered without shipping. | `#gpu` details 360. | `ux/ux-details-360-el-light-gpu.jpg` | Observed. | v2 product page. |
| UX-32 | Builder | On a phone the first screen is chrome + a notice; "⚠ 6" before any action. | `#builder` 360. | `ux/ux-builder-guided-360-el-light.jpg` | Observed. | v2 builder. |
| UX-33 | Builder | Missing parts, "not verified" and a real clash share one amber icon. | Empty build; clash build. | `ux/ux-builder-clash-quick-1366-el-light.jpg` | Observed (v1 has one note level for all). | v2 P2 + builder. |
| UX-34 | Builder | Status line uses the same icon for "not verified" and "incompatible". | Review. | `ux/ux-builder-guided-review-1366-el-light.jpg` | Observed. | v2 P2 + builder. |
| UX-35 | Builder | An incompatible part shows as a completed step (✓) and is hidden from its own step; reason tooltip-only. | Saved clash build → board step. | `ux/ux-builder-clash-mobo-step-1366-el-light.jpg` | Observed. | v2 P2 + builder. |
| UX-36 | Builder | After choosing, "Next" is ~1,250 px below (desktop). | CPU step 1366. | `ux/ux-builder-guided-mobo-chosen-1366-el-light.jpg` | Observed. | v2 builder. |
| UX-37 | Builder | First (Recommended) cards contradict the step's advice and the budget: 1×32GB RAM after "take a 2-stick kit"; Gaming + 1.000 € → 1.566,16 € (B2 g1 reproduced this in el/en at 1366 and 360). | Guided, first card each step. | `ux/ux-builder-guided-review-1366-el-light.jpg`, `docs/audit/builder/004-g1-el-1366-review.jpg` | Observed: Recommended = ranking score, not use/budget. | v2 builder. |
| UX-38 | Builder | "Clear build" empties the build with no confirmation or undo. | Summary → Καθαρισμός. | `ux/ux-builder-cleared-1366-el-light.jpg` | **Verified:** `src/components/builder/Summary.tsx:123` `onClick={() => update({})}`. | **v1 hotfix candidate** (confirm step). |
| UX-39 | Builder | Saved parts that no longer exist vanish silently. | Saved build with a gone part. | `ux/ux-builder-vanished-part-1366-el-light.jpg` | Observed. | v2 builder. |
| UX-40 | Builder | The parts list names specs ("850W Gold", "DDR5 32GB (1×32GB)"), not products, also in Copy list. | Review / Copy list. | `ux/ux-builder-review-full-1366-el-light.jpg` | Design (spec models). | v2 builder. |
| UX-41 | Builder | Builder total is without shipping and shows sources, not shops; date without time. | Summary. | `ux/ux-builder-guided-review-1366-el-light.jpg` | Design; builder rows carry no shipping. | v2 builder + prices. |
| UX-42 | Builder | On phones the "shared build" notice is hidden in the collapsed bar. | Share link at 360. | `ux/ux-builder-shared-360-el-light.jpg` | Observed. | v2 builder. |
| UX-49 | Quick list | Pickers open with the cheapest (obsolete) parts, no sort. | Quick list → CPU. | `ux/ux-builder-quick-picker-1366-el-light.jpg` | Observed. | v2 builder. |
| B-01 | Builder (change CPU later) | Changing platform after later parts are chosen: with an AM5 CPU, board and RAM chosen, Intel CPUs are hidden on the CPU step ("0 shown · 4 incompatible hidden"); with the filter off they are greyed ("Socket LGA1700 ≠ the board's AM5."). Removing the AM5 CPU doesn't help — the board stays, keeps hiding Intel CPUs, and the summary says "Everything fits" without a CPU. The user must find the board step and remove the board (and the RAM if the memory type changes); nothing on the CPU step says so. Dependent parts are never cleared or re-checked — they constrain the earlier step. | Guided: 9700X → board → RAM → back to CPU → search "14600K". | `docs/audit/builder/*-g3-*-intel-hidden.jpg`, `*-g3-*-intel-greyed.jpg`, `*-g3-*-after-intel.jpg`; `builder-flows-…json` (`g3`), all four configurations. | Observed; filtering is against every chosen part. | v2 builder ("replace" that lists what it clears). |
| B-02 | Builder (Quick list, empty state) | A search with no match says "0 options · Nothing compatible with the current build. Remove a part to see more options." — the cause is the search text, not compatibility. | Quick list → RAM picker → search "zzzzqqq". | `docs/audit/builder/*-q1-*-empty-search.jpg`, `q1.emptyText`. | Observed (one message for both cases). | v2 builder. |
| B-03 | Builder (shared builds) | Opening someone's share link keeps your saved build — until you change anything: then the shared build (plus the change) silently **replaces** your own saved build (notice says so on desktop; hidden on phones, UX-42). No undo, one saved build. | Save build A → open another share link → change one part → `pcBuild` = the shared build. | `s.savedWhileViewing` = A, `s.savedAfterChange` = shared build + change, hash cleared (`builder-flows-…json`, all four configurations). | **Verified** (as designed in `builderState.ts`). | v2.1 (named lists) / v2 builder (undo). |
| B-05 | Builder (slow network) | While the builder data loads, a **saved build shows as empty**: "0 parts · 0,00 €", every part "—", "Pick a processor." (phone bar "⚠ 6"), for as long as `builder.json` takes (5 s in the test); a saved drive likewise shows "Storage —" until `builder-storage.json` arrives (~8 s). Everything is restored afterwards; `pcBuild` is never touched. | Delay `/data/builder.json` 5 s → reload a saved build. | `docs/audit/builder/*-r-*-reload-loading.jpg` vs `*-reload-ready.jpg`; `builder-flows-r.json`, `n.savedDriveLate`. | **Verified:** the summary renders before the data (CLAUDE.md, Lighthouse fix 2026-10-02) and has no loading state for saved parts. | v2 builder (skeleton rows for saved parts). |
| B-06 | Builder (Copy list, slow network) | "Copy list" pressed before `builder-extra.json` arrives copies the list **without the shop links** (only the drive has one); nothing tells the user. The Review rows have no links either until the file arrives. | Delay `/data/builder-extra.json` 15 s → shared build → Review → Copy list. | `n.copyBeforeExtra` in `builder-flows-…json`; `docs/audit/builder/*-c-*-slow-extra.jpg`. | **Verified:** links live in `builder-extra.json`, loaded after the builder (CLAUDE.md "Data"). | v2 builder. |

### 3.4 S4

| ID | Area | Description | Evidence | Fix target |
| --- | --- | --- | --- | --- |
| UX-06 | Contrast | Small text under 4.5:1 in light (builder tab 3.57:1, pager 4.46:1, current step 3.9:1). | `ux/ux-list-1366-el-light-gpu.jpg` | v2 P1 |
| UX-07 | Header | Tagline wraps to 3 lines at 360 and splits "e-shop.gr". | `ux/ux-first-visit-360-el-light.jpg` | v2 P1 |
| UX-08 | Routing | Unknown hash shows GPU prices, no 404. | ux.md | v2 P3 (URLs) |
| UX-09 | Photos | Blank white tiles while photos load (dark). | `ux/ux-photos-loading-1366-el-dark-gpu.jpg` | v2 P1 |
| UX-20 | Phones | Applied-filter chips wrap and push results down. | `ux/ux-applied-360-el-light-case.jpg` | v2 P3 |
| UX-21 | Phones | The phone loading skeleton is the desktop layout. | `ux/ux-loading-360-el-light-gpu.jpg` | v2 P1 |
| UX-22 | Copy | English words inside Greek filter labels. | `ux/ux-list-1366-el-light-ram.jpg` | v2 P1 |
| UX-27 | Lists | "Range" column dominated by mismatched listings (32GB stick "έως 3.689 €"). | `ux/ux-details-1366-el-light-ram.jpg` | v2 P3 |
| UX-31 | Tablet | An opened card leaves a blank area in the 2-column grid. | `ux/ux-details-768-el-light-storage.jpg` | v2 product page |
| UX-43 | Builder | Step order/names differ between progress bar and parts list. | `ux/ux-builder-review-full-1366-el-light.jpg` | v2 builder |
| UX-44 | Builder | "Χωράει" used for non-space checks (socket, memory, watts). | `ux/ux-builder-guided-review-1366-el-light.jpg` | v2 P2 |
| UX-45 | Builder | Permanent yellow coverage notice on every step. | `ux/ux-builder-guided-1366-el-light.jpg` | v2 builder |
| UX-46 | Builder | Phone progress steps are bare numbers. | `ux/ux-builder-guided-cpu-360-el-light.jpg` | v2 builder |
| UX-47 | Copy | "1 ασύμβατα", "1 εξαρτήματα". | `ux/ux-builder-clash-quick-1366-el-light.jpg` | v2 P1 (trivial) |
| UX-48 | Builder | Progress buttons 38 px wide and Review links 24 px tall at 360 (site rule 44 px). | `ux/ux-builder-guided-360-el-light.jpg` | v2 builder |
| UX-50 | Quick list | Guide always opens expanded; picker is a small scroll box. | `ux/ux-builder-quick-360-el-light.jpg` | v2 builder |
| D-16 | Freshness | At the audit snapshot Skroutz had failed in the latest run for 7 of 9 categories (its kept data 6.6–10.1 h older); nothing older than 24 h then. | data-quality.md §5 | (see OPS-01 for the outage after it) |

## 4. Compatibility scenario results (B1)

**Suite.** 64 scenarios in `tests/compat/scenarios/` (one JSON file each; format in `tests/compat/scenario.ts`): id, title, parts (category, exact product key from the data, quantity, and the field values that matter, frozen so the test explains itself when the data changes), expected results per rule of the plan's table (1–26) with level error / warning / note / pass, and one line of why. 56 use real products from the data; 8 (S50–S57) add **synthetic** fields the data doesn't have (SFX-only case, board max memory, card thickness, 12V-2x6, M.2 slots, SATA ports, fan headers, USB-C header), marked `"synthetic"` with the reason. All 14 examples of the plan's Phase 0 table are S01–S14. Every rule 1–26 has at least one scenario; every rule v1 can express has a pass and a fail case.

**Adapter.** `tests/compat/v1-adapter.ts` builds v1 `Model`s from the frozen parts and calls the functions the v1 UI uses (`slotModels`, `rate`, `buildNotes`, `requiredWatts` from `src/lib/builder.ts`), not a re-implementation. `npm test` runs it; `tests/compat/v1-report.test.ts` writes `docs/audit/compat-results.md` (all messages, per-part labels, the wattage table) and `compat-results.json`.

**Mapping of v1 outputs to the plan's levels:** "Fits" → pass; "Likely fits" (estimate) → note; "Fit not verified" → note; "Incompatible" (hidden by "Only compatible") → error; a summary note with the warning icon → error (v1 has no warning level); a note with the info icon → note, except "the CPU comes with a cooler" → pass.

**Totals: 64 scenarios — 46 correct, 5 wrong, 13 v1 does not check.** Per expected rule result: 99 — 66 correct, 5 wrong, 28 not checked. ("Wrong" = v1 checks the rule and answers differently; "not checked" = v1 has no such check, can't hold the quantities, needs a field v1 lacks, or the expected level is the plan's margin warning.)

The 5 wrong: **S09** AIO 360 vs case ≤ 280 → v1 note (C-04) · **S18** unknown box cooler → v1 error, plan warning (C-06) · **S33** 3 × 140 vs maker's 2 × 140 → v1 note (C-05) · **S35** bad `fanSlots` → v1 error, plan note (C-02) · **S59** i7-14700K + 5070 Ti + 750 W → v1 pass, plan error (C-03). None of the five is v1 saying "fits" against **correct** data where the plan says error, except S59 (a formula difference) and S09/S33 (deliberate leniency); the S1 problems are in the data (section 3.1), which the scenarios freeze as correct values.

<details><summary>All 64 scenarios (expected → v1 → verdict; v1's messages per part are in docs/audit/compat-results.md)</summary>

| ID | Scenario | Expected | v1 reports | Verdict |
| --- | --- | --- | --- | --- |
| S01 | Ryzen 5 7600 (box cooler) + B650 + DDR5 2×16GB + Midi Tower ATX: no warnings | R1 pass · R2 pass · R3 pass · R5 pass · R11 pass · R12 pass · R13 pass | R1 pass · R2 pass · R3 pass · R5 pass · R11 pass · R12 pass · R13 — | correct (not checked: R13) |
| S02 | Core i5-14400F (LGA1700) + B760 DDR4 board + DDR5 kit: memory type error | R1 pass · R2 error | R1 pass · R2 error | correct |
| S03 | Ryzen 7 9700X + B650: BIOS update warning | R1 pass · R13 warning | R1 pass · R13 — | correct (not checked: R13) |
| S04 | Ryzen 7 9700X + X870: no BIOS warning | R1 pass · R13 pass | R1 pass · R13 — | correct (not checked: R13) |
| S05 | CPU without integrated graphics and no graphics card: error | R1 pass · R2 pass · R10 pass · R12 error | R1 pass · R2 pass · R10 pass · R12 error | correct |
| S06 | Core i5-14600KF (Tray) with no cooler: error | R11 error · R12 pass | R11 error · R12 pass | correct |
| S07 | Graphics card 340 mm + case that takes 330 mm: error | R6 error | R6 error | correct |
| S08 | Air cooler 165 mm + case that takes 160 mm: error | R8 error | R8 error | correct |
| S09 | AIO 360 mm + case whose maker lists radiators up to 280 mm: error | R9 error | R9 note | **wrong** (R9) |
| S10 | ATX board + Mini-ITX case: error | R5 error | R5 error | correct |
| S11 | 4 RAM sticks + board with 2 slots: error | R2 pass · R3 error | R2 pass · R3 error | correct |
| S12 | RTX 5080 + 550 W power supply: error | R14 error | R14 error | correct |
| S13 | 3.5" drive + case without drive bay data: note | R19 note | R19 note | correct |
| S14 | Graphics card with unknown length + small case: note | R6 note | R6 note | correct |
| S15 | Cooler whose sockets are not stated + AM5 CPU: note | R10 note | R10 note | correct |
| S16 | Board with RAM slots not stated + 4-stick kit: note | R2 pass · R3 note | R2 pass · R3 note | correct |
| S17 | Board with RAM slots not stated + 2-stick kit: pass | R2 pass · R3 pass | R2 pass · R3 pass | correct |
| S18 | Box CPU where a cooler in the box is not stated + no cooler: warning | R11 warning · R12 pass | R11 error · R12 pass | **wrong** (R11) |
| S19 | Midi Tower that states no board size + ATX board: note (estimate) | R5 note | R5 note | correct |
| S20 | Measured graphics card + case without a maximum card length: note | R6 note | R6 note | correct |
| S21 | AIO 240 and a 3-pack of fans in a case that states no radiator or fan positions: notes | R9 note · R21 note | R9 note · R21 note | correct |
| S22 | Air cooler 165 mm + case without a maximum cooler height: note | R8 note | R8 note | correct |
| S23 | Graphics card 340 mm + case that takes exactly 340 mm: warning | R6 warning | R6 pass | v1 does not check this |
| S24 | Graphics card 241.5 mm + case that takes 330 mm: pass | R6 pass | R6 pass | correct |
| S25 | Power supply exactly at the recommended wattage (650 W): warning | R14 warning | R14 pass | v1 does not check this |
| S26 | Power supply just below the recommended wattage (600 W of 650 W): error | R14 error | R14 error | correct |
| S27 | Power supply above the recommended wattage plus 10% (750 W of 650 W): pass | R14 pass | R14 pass | correct |
| S28 | Two DDR5 2×16GB kits on a 4-slot board: pass | R2 pass · R3 pass | R2 — · R3 — | v1 does not check this |
| S29 | Two DDR5 2×16GB kits on a 2-slot board: error | R3 error | R3 — | v1 does not check this |
| S30 | One NVMe SSD + two 3.5" HDDs on a B650 board in a Midi Tower: notes | R17 note · R18 note · R19 note | R17 — · R18 — · R19 — | v1 does not check this |
| S31 | Two 3-packs of 120 mm fans in a case with 9 × 120 mm positions: pass | R21 pass · R22 pass | R21 — · R22 — | v1 does not check this |
| S32 | One 3-pack of 120 mm fans in a case with 9 × 120 mm positions: pass | R21 pass · R22 pass | R21 pass · R22 — | correct (not checked: R22) |
| S33 | 3 × 140 mm fans in a case whose maker lists only 2 × 140 mm positions: error | R21 error | R21 note | **wrong** (R21) |
| S34 | 5-pack of 120 mm fans in a case whose shop page states 3 positions: error | R21 error | R21 error | correct |
| S35 | 3-pack of fans in a case whose data say 6 fans included but 1 position: note | R21 note | R21 error | **wrong** (R21) |
| S36 | Mini-ITX board + ATX case: pass | R5 pass | R5 pass | correct |
| S37 | AM5 CPU (Ryzen 5 9600X) + AM4 board: error | R1 error | R1 error | correct |
| S38 | DDR5 kit + AM4 DDR4 board: error | R2 error | R2 error | correct |
| S39 | Tray CPU (Ryzen 7 9700X Tray) with no cooler: error | R11 error · R12 pass | R11 error · R12 pass | correct |
| S40 | Ryzen 5 5600X with box cooler, no cooler chosen, no graphics card: cooler pass, graphics error | R1 pass · R11 pass · R12 error | R1 pass · R11 pass · R12 error | correct |
| S41 | AIO 240 mm in a case that takes 240/280 at the front: pass | R9 pass · R10 pass | R9 pass · R10 pass | correct |
| S42 | AIO 360 mm in a case that takes 360 mm on top: pass | R9 pass | R9 pass | correct |
| S43 | Intel-only cooler (LGA1700/1851) + AM5 CPU: error | R10 error | R10 error | correct |
| S44 | Air cooler 155 mm + case that takes 160 mm: warning | R8 warning · R10 pass | R8 pass · R10 pass | correct (not checked: R8) |
| S45 | Air cooler 155 mm + case that takes 170 mm, with RAM: pass + clearance note | R8 pass · R10 pass · R26 note | R8 pass · R10 pass · R26 — | correct (not checked: R26) |
| S46 | PCIe 5.0 SSD on a B650 board (M.2 generation not collected): note | R20 note | R20 note | correct |
| S47 | PCIe 4.0 SSD on a B650 board: pass | R20 pass | R20 pass | correct |
| S48 | Case that ships without fans + no fans in the build: warning | R22 warning | R22 — | v1 does not check this |
| S49 | SFF case (PSU size not stated) + ATX power supply: note | R16 note | R16 note | correct |
| S50 | Case that takes only SFX + ATX power supply: error (synthetic case) | R16 error | R16 note | v1 does not check this |
| S51 | Two 2×32GB kits (128 GB) on a board with a 64 GB maximum: error (synthetic field) | R3 pass · R4 error | R3 — · R4 — | v1 does not check this |
| S52 | 3.5-slot card + case with 2 expansion slots: error (synthetic fields) | R7 error | R7 — | v1 does not check this |
| S53 | 12V-2x6 card + power supply without a native 12V-2x6 cable: note (synthetic fields) | R14 pass · R15 note | R14 pass · R15 — | correct (not checked: R15) |
| S54 | Two NVMe SSDs + board with 1 M.2 slot: error (synthetic field) | R17 error | R17 — | v1 does not check this |
| S55 | Three SATA SSDs + board with 2 SATA ports: error (synthetic field) | R18 error | R18 — | v1 does not check this |
| S56 | Six case fans + board with 3 fan headers: note (synthetic field) | R21 pass · R23 note | R21 — · R23 — | v1 does not check this |
| S57 | Case with front USB-C + board without a USB-C header: note (synthetic fields) | R5 pass · R24 note | R5 pass · R24 — | correct (not checked: R24) |
| S58 | DDR5-6000 kit with a Ryzen 5 7600 (official DDR5-5200): note | R2 pass · R25 note | R2 pass · R25 — | correct (not checked: R25) |
| S59 | Core i7-14700K + RTX 5070 Ti + 750 W: error by the plan formula, pass by the card maker | R14 error | R14 pass | **wrong** (R14) |
| S60 | ATX power supply in a Midi Tower: pass | R16 pass | R16 pass | correct |
| S61 | M.2 SSD + case without drive bay data: pass | R19 pass | R19 pass | correct |
| S62 | Ryzen 9 9950X + RTX 5090 + 4 sticks + 2 SSDs + 6 fans + 1000 W: error | R14 error | R14 error | correct |
| S63 | Core i9-14900K without a graphics card + 550 W: pass | R14 pass | R14 pass | correct |
| S64 | Ryzen 7 9800X3D + RX 9070 XT (card asks 850 W) + 750 W: error | R14 error | R14 error | correct |

</details>

### "Only compatible" filter (picker check)

`scripts/audit/picker-audit.mjs` opens a step of the guided builder with parts chosen through a share link, loads every card, reads "N shown · M incompatible hidden", turns the filter off (clashes are greyed and not choosable) and compares with an **independent oracle** written from the plan's rules over the raw `builder.json` fields (not v1's code).

| Case | Step, parts chosen | Shown · hidden | (a) count = greyed = oracle | (b) hidden but passes | (c) fails but choosable |
| --- | --- | --- | --- | --- | --- |
| P1 | board, AM5 CPU | 449 · 574 | yes | 0 | 0 |
| P2 | RAM, DDR5 2-slot board | 111 · 128 | yes | 0 | 0 |
| P3 | GPU, case ≤ 330 mm | 1,371 · 196 | yes | 0 | 0 |
| P4 | cooler, AM5 + case ≤ 160 mm | 1,985 · 128 | yes | 0 | 0 |
| P5 | PSU, RTX 5080 (850 W) | 56 · 83 | yes | 0 | 0 |
| P6 | fans, Kolink HF Mesh (`fanSlots` 1) | 1,157 · 563 | yes, **by the data** — the data is wrong (C-02) | 0 by the data | 0 |
| P7 | CPU, RTX 5080 + 550 W PSU | **0 · 359** | **no** (oracle: 0 fail) | **359** | 0 |
| P8 | CPU, LGA1700 board | 117 · 242 | yes | 0 | 0 |

The count is accurate and nothing failing is choosable in all 8 cases; the one wrong result is P7 (C-01). Screenshots: `docs/audit/picker/P1…P8-*.jpg`; raw: `picker-audit.json`.

Re-run: `npm test` (scenarios) · `node scripts/audit/picker-audit.mjs <preview url> <dist>/data docs/audit/picker`.

## 5. Data coverage and data quality (B3)

Full report with every table, the 20 worst examples per category (with titles), the spot-check samples and method: **`docs/audit/data-quality.md`** (generated by `node scripts/audit/data-quality/run-all.mjs`, which checks its model grouping equals the site's `manifest.json`). Committed data and caches only, no network.

### Coverage of the fields the plan's rules use

"All models" = models where any listing has a value; "top quarter" = the most-listed quarter of models; "builder rows" = rows of `builder.json` (what the checks use).

| Rule | Field | Plan says today | All models | Top quarter | Builder rows |
| --- | --- | --- | --- | --- | --- |
| 1 | CPU socket / board socket | 98–100% | 97.6% / 97.4% | 100% / 99.7% | 100% / 100% |
| 2 | Board memory type (RAM type 100%) | 97% | 92.6% | 99.7% | 100% |
| 3 | Board RAM slots | 75% | 71.3% | 99.0% | 75.6% |
| 4 | Board max memory | new | not collected | — | — |
| 5 | Case largest board (stated) | 70% | 86.0% | 99.7% | 86.0% |
| 6 | Card length / case max card length | 77% / 14% (popular 43%) | 55.7%\* / 26.5% | 84.0% / 39.6% | 80.2% / 26.5% |
| 7 | Card thickness, case expansion slots | new | not collected | — | — |
| 8 | Air-cooler height / case max cooler height | ~15% | 26.0% / 14.8% | 38.8% / 36.5% | 26.0% / 14.8% |
| 9 | Case radiator sizes per position (positions only) | 3% | 2.5% (19.2%) | 3.7% (30.5%) | 2.5% (19.2%) |
| 10 | Cooler sockets | ~15% | 33.1% | 46.5% | 33.1% |
| 11 | CPU cooler in the box | 52% | 89.3% | 100% | 57.1% |
| 12 | CPU integrated graphics | have | 100% (computed) | 100% | 100% |
| 13 | Board chipset (have) · BIOS Flashback (new) | new table | 91.9% · not collected | 98.4% · — | 100% · — |
| 14 | Card minimum PSU (else chip table) | have | 52.6% (71.1% with table) | 84.0% | 71.7% (100% with table) |
| 15 | Card power connector, PSU 12V-2x6 | new | not collected (PSU: title words 5.9%) | — | — |
| 16 | PSU form factor / case PSU form factor | new | 72.0% stated (rest default ATX) / not collected | 100% / — | 55.4% / — |
| 17–18 | Board M.2 slots, SATA ports | new | not collected | — | — |
| 19 | Case drive bays | planned task | not collected | — | — |
| 20 | Drive PCIe generation (NVMe) / board M.2 gen | new | 96.0% / not collected | 99.7% | 96.5% |
| 21 | Case fan positions per size (count only) | 3% | 2.6% (23.6%) | 3.8% (33.8%) | 2.6% (23.6%) |
| 22 | Case fans in the box | 2% | 5.7% | 7.2% | 5.7% |
| 23–24 | Board fan headers, USB-C header; case front USB-C | general / new | not collected | — | — |
| 25 | RAM speed (CPU official speed: not collected) | have | 82.8% | 79.4% | 86.6% |
| 26 | RAM height | — | not collected | — | — |

\* GPU models are chip + VRAM groups; "all models" counts a chip as measured when any card of it is. The plan's "today" column is out of date for rules 5, 6 (cases), 10 and 11 (§9).

Filters in the plan's per-category table that fall **under the plan's 30% threshold**: cases — max GPU length, max cooler height, radiators, fan positions, fans in the box; coolers — air height; fans — airflow/pressure type 6.3%, CFM 11.9%, static pressure 8.3%; storage — DRAM 1.8%, read/write speed 9.4/9.3%, TBW 1.0%; PSU — ATX 3.x 18.3% and 12V-2x6 5.9% (title words only). Not collected at all: threads, boost clock, generation table, max memory, M.2/SATA, Bluetooth, BIOS Flashback, card thickness/connector/fan count/colour, PSU length, case bays/expansion slots/front USB-C/colour, noise, RGB for RAM, XMP/EXPO, RAM height, **availability** (every category).

### Quality per category

Counts of the strongest checks; checks overlap, so they are not summed (all checks, confidence levels and examples in data-quality.md §2–4).

| Category | Models | Likely duplicates (one product, several models) | Likely wrong merges (high confidence) | Implausible values | Spot check (errors of 20, 95% interval) |
| --- | --- | --- | --- | --- | --- |
| GPU | 97 | — (models are chip + VRAM) | 3 phantom chip+VRAM models (4 listings) | 12 builder rows with `minPsu` = board power (D-02) | 0/20 (0–16%) |
| CPU | 421 | — | 6 models mix cooler-in-box (47 listings), 3 mix core counts | 41 "με ψύκτρα" listings with cooler = no (D-07) | 3/20 |
| Motherboards | 1,215 | 44 word order (h), 47 filler words (m) | 6 DDR4+DDR5 (33 listings), 4 socket | 11 size contradictions (D-05, D-08) | 0/20 |
| RAM | 489 | — (spec models) | 42 kit misreads (113 listings), 51 same part number in different specs | 14 speeds outside the DDR type (60000 MHz) | 2/20 |
| Storage | 2,346 | 16 word order (h), 237 shared part number (m) | 43 SATA+SAS, 30 form factors, 16 RPM, 1 key collision | 2 prices < 25% of median | 2/20 |
| PSU | 186 | — (spec models) | 37 same part number in different specs, 20 family-card titles | none (74 small/large units are real) | 1/20 |
| Cases | 2,609 | 20 word order (h), 116 filler words (m) | 129 size labels (m), 40 largest board (m) | 2 prices < 25% of median; 50 board-vs-size candidates | 2/20 |
| Fans | 2,005 | 14 word order, 11 Greek words (h) | 19 pack size contradicts title, 45 mix 3-/4-pin (m) | — | 2/20 |
| Coolers | 2,113 | 42 word order, Greek-word twins (h) | 22 AIO radiator contradicts title, 11 Air+AIO | 72 listings / 26 models air height < 30 mm (D-01) | 5/20 (11–47%) |

Identity fields vs titles (regex pass over all listings): sockets, memory types, PSU form factors and case sizes — **0 contradictions**; board form factor — 11 (D-05, D-08). Spot-check error rates are rough: 20 per category gives wide intervals (0/20 → 0–16%).

**Freshness.** At the snapshot every source was under 24 h old (Skroutz had failed in its latest run for 7 of 9 categories; its kept data was 6.6–10.1 h older). After the snapshot the outage OPS-01 froze all prices for about 18 h. `scrapedAt` is the run time per source, not a per-listing check time.

## 6. UX findings by page (B4) and builder flows (B2)

Full UX report: **`docs/audit/ux.md`** (50 findings with heuristic, what was seen, where, screenshots). Pages: all nine category lists, product details (inside the list), builder Guided and Quick list, About, Contact, Privacy at 360/768/1366/1920 px, light/dark, el/en (screenshots `docs/audit/ux/`; the full matrix of 484 screenshots stayed local in `docs/audit/ux-full/`, not committed). v1 has no deals or compare pages. No page scrolls sideways anywhere; the problems are meaning, findability and trust.

| Page | Findings (severity) |
| --- | --- |
| All pages (header, navigation) | UX-01 no home / builder hidden on phones (S3) · UX-02 builder tab clipped (S3) · UX-03 hidden tabs (S3) · UX-04 "stores" vs sources (S3) · UX-05 no skip link (S3) · UX-06 contrast (S4) · UX-07 tagline (S4) · UX-08 no 404 (S4) · UX-09 white photo tiles (S4) |
| Category lists (all nine) | UX-10 pills start ticked (S3) · UX-11 single-choice dropdowns (S3) · UX-12 junk makers (S3) · UX-13 DRAM filter (S2 here) · UX-14 columns without filters (S3) · UX-15 no quick filters (S3) · UX-16 headers don't sort (S3) · UX-17 copy (S3) · UX-18 one maker for spec groups (S3) · UX-19 raw load error (S3) · UX-20 chips wrap (S4) · UX-21 skeleton (S4) · UX-22 English in Greek (S4) · UX-23 hover-only price facts (S3) · UX-24 unlabelled 7-day change (S3) · P-01 total from another offer (S1) · UX-26/D-15 implausible prices (S3) · UX-27 range column (S4) |
| Product details | UX-28 no address (S3) · UX-29 truncated offer titles (S3) · UX-30 phone scroll box (S3) · UX-31 tablet gap (S4) |
| Builder, Guided | UX-32 … UX-48 (S3/S4, see tables) |
| Builder, Quick list | UX-49 obsolete parts first (S3) · UX-50 guide expanded (S4) |
| About / Contact / Privacy | No page-specific problem (Contact asks for a product link that doesn't exist: UX-28) |

**Baymard checks (plan):** applied filters shown in place *and* above the list — **yes** (chips + "Καθαρισμός όλων"), but pills invert the meaning (UX-10). Long lists truncated with "show more" — **no** (UX-11). A filter for every attribute shown — **mostly** (UX-14, table in ux.md). Promoted quick filters above the list — **no** (UX-15).

### PC builder — functional audit (B2)

`scripts/audit/builder-flows.mjs` drives v1's builder in Chromium (Playwright) on the local production preview, in **Greek and English at 1366 and 360 px** (wattage and network flows at 1366 only: they don't depend on width), and records texts, numbers, `localStorage`, the clipboard, console errors and screenshots (`docs/audit/builder/`, raw `builder-flows-*.json`). Console errors: **none** in any flow except the deliberate 503 of the network test.

| Flow | What was checked | Result |
| --- | --- | --- |
| Guided, full build (g1) | Use "Gaming" + 1.000 €, first compatible card on every step, Review | Completes in all 4 configurations. **Total 1.566,16 € = sum of the 9 shown prices** (el/en, 1366/360). Budget bar full and red, "υπέρβαση 566,16 €" (correct). Recommended PSU ≥ 550 W; the plan formula gives the same (card maker 550 W > (145 + 121 + 50 + 5 + 8 + 12 + 5) × 1.3 → 450 W, with recalled TBP/PL2 values). The first cards contradict the use/budget advice (UX-37) and include the suspicious 1×32GB at 280,47 € (P-01) and 990 Pro 2TB at 239,99 € (D-15). |
| Guided, skipping optional steps (g2) | Ryzen 5 7600 with box cooler: GPU and cooler steps optional | Works in all 4 configurations: GPU and Cooler offer **Skip** with the reason ("The CPU has integrated graphics: a card is optional." / "The CPU comes with a cooler: a better one is optional."); Case fans offers Skip without a reason. Result: 6 parts, **990,50 € = sum of the shown prices**, "Everything fits" plus the box-cooler note. No console errors. |
| Guided, change the CPU later (g3) | AM5 CPU + board + RAM, then back to the CPU step | Dependent parts are **kept, not cleared or re-checked**; they filter the CPU step (Intel hidden; greyed with the reason when the filter is off). Switching platform needs a manual board removal (B-01). A clashing build from a link hides its own chosen board (UX-35). |
| Quick list (q1) | Add CPU, board, RAM; replace RAM; remove RAM; empty search; switch to Guided mid-build | Add/replace/remove work in all 4 configurations. Empty search shows a misleading message (B-02). Switching to Guided keeps the parts (summary shows CPU + board, 2 steps ✓) and opens "Use and budget". Pickers start with obsolete parts (UX-49). |
| Totals and shipping | Sum of shown prices vs total; shipping | Totals always equal the sum (g1, c: 2.121,76 € = 8 parts). Shipping is consistently **left out** of the builder ("χωρίς μεταφορικά" in summary, Review and Copy list) while list pages show "με μεταφορικά" (UX-41). |
| Wattage (w) | 6 builds: summary line vs the plan formula | The UI shows exactly the adapter's values: S12 850, S25 650, S59 750, S62 1100, S63 450, S64 850 W. Plan formula: same for 4, **+100 W for S59 and S62** (C-03, table in compat-results.md). A PSU clash is counted twice ("2 incompatible" for S12; C-01). |
| Saved build (s, r) | Reload; share link in a clean profile; opening a shared build over a saved one | Share link opens the same 3 parts and the same total (652,36 €) in a clean profile, shows the notice (desktop) and saves nothing there. Opening another shared build keeps build A in `localStorage`; the first change replaces A (B-03). Reload: restores the build once `builder.json` arrives (`pcBuild` never touched), but **while it loads the summary shows "0 parts · 0,00 €", every part "—" and "Pick a processor."** (phone bar: "0 parts · €0.00 · ⚠ 6") — looks like a lost build on a slow phone (B-05; screenshots `*-r-*-reload-loading.jpg`, data delayed 5 s). |
| Copy list (c) | Parts, prices, links, total | Correct parts, prices, sources, product links, total and share link in all 4 configurations. Names are specs ("750W Gold") — the product shows only in the link (UX-40). Pressed before `builder-extra.json` arrives: no links (B-06). |
| Storage step, fans step, fan advice (st) | 9950X + RTX 5090 + Lian Li Lancool 207 | Storage step offers 1,322 drives (Consumer + NAS). Case step explains the fan plan. Fans step: "High-power build: add 1 × 120 mm rear exhaust and 2 × 120 mm top exhaust" — **correct for this case** (maker data: 2 × 140 front + 2 × 120 bottom included); size chip pre-set to 120 mm; honest note that board fan headers aren't in the data. |
| Slow / failing files (n) | `builder-storage.json` +8 s; 503; a saved drive with the file late; Copy list before `builder-extra.json` | +8 s: "Loading…", cards after 8.1 s, no errors. 503: "Loading…" forever (B-04, S2). Saved drive: hidden ~8 s, then restored, `pcBuild` intact (B-05). Copy list early: no links (B-06). |
| Empty states | Picker with no match; step with everything hidden | "0 options · Nothing compatible…" for a search miss (B-02); "No parts match these filters" with 359 hidden by a PSU clash and no hint of the cause (C-01). |
| Phone bottom bar (m, 360 px) | Size, tap targets, covering content, Next from the bar | Bar 72 px; Back/Skip 44 × 44 px; the step's last control is not covered; opens to 552 px; Next from the bar moves GPU → Cooler. Works. Shared-build notice hidden inside it (UX-42); "⚠ 6" on an empty build (UX-32/33). |

Re-run: `node scripts/audit/builder-flows.mjs <preview url> docs/audit/builder [g1,g2,g3,q1,s,r,c,w,st,n,m]` (needs the 2026-10-03 data snapshot for the product keys it uses).

## 7. Performance baseline (B5)

<!-- B5 -->

## 8. Tooling baseline

| Check | Result |
| --- | --- |
| `npm run typecheck` (app + tests) | **0 errors** |
| `npm run lint` | passes: **0 new errors**; v1's baseline is **39 errors, 6 warnings** (13 errors in `src/`, 26 in `scripts/checks/`), recorded as bulk suppressions in `eslint-suppressions.json`; `npm run lint:baseline` lists them. By rule: `@typescript-eslint/no-explicit-any` 23, `react-hooks/refs` 6 (refs read during render: Guided.tsx ×5, FilterBar.tsx), `react-hooks/set-state-in-effect` 4 (App.tsx, useFilterState.ts…), `no-unused-vars` 3, `no-empty` 2, `no-irregular-whitespace` 1; warnings: `react-hooks/exhaustive-deps` 6 (Guided.tsx 3, QuickList.tsx 2, PriceChart.tsx 1). Full list: `docs/audit/baseline/eslint-baseline.txt`. |
| `npm test` (Vitest) | **70 tests pass** (64 scenario files + the v1 report) |
| `npm run e2e` (Playwright, Chromium, production preview) | **15 tests pass** (`tests/e2e/smoke.spec.ts`: 9 category lists, details, guided builder, quick list, 3 info pages, no page errors); also 15/15 against `npm run dev` |
| `npm run build` | passes; JS/CSS/HTML **byte-identical** to the pre-tooling baseline (same file names, sizes and SHA-256 as `docs/audit/baseline/bundle-baseline.tsv`) — the tooling adds nothing visitors download |
| `npm run check` | **passes** (typecheck → lint → test → build) |
| `npm audit` | dev-only advisories: main 7 (6 high `braces`, 1 esbuild), v2 9 (+2 moderate via vitest → vite 5). Nothing shipped. Backlog #4. |

The React Compiler rules in `react-hooks` v7 (`refs`, `set-state-in-effect`) flag patterns that work today but are fragile; they are worth fixing when v2 rewrites those components, not in v1.

## 9. Plan feedback (suggestions only)

1. **The roadmap and its gates are missing from the repo.** The export turned that block into `[embedded content: σειρά υλοποίησης · 6 φάσεις, 5 πύλες]`. Phase prompts refer to gates; please paste the phase list into `docs/redesign-v2.md`. (Phase numbers after P2 in this audit are my guesses.)
2. **Data errors are a bigger risk than missing rules.** Every S1 here is a wrong value used by a correct rule (cooler height, card PSU figure, RAM kit, DDR type, board size), not a missing rule. Suggest that Phase 2 starts with a **validation layer** before the engine: plausible ranges per field (air cooler ≥ 30 mm, card PSU ≥ chip table − 100 W, speeds per DDR type…), cross-source disagreements → "unknown" (or the safer value), and part-number checks. A rule fed a wrong "known" value says "fits"; fed "unknown", it says "not verified".
3. **Rule 11 / Phase 0 example: "F" does not mean "no cooler".** The example "Επεξεργαστής 'F' ή 'Tray' χωρίς ψύκτρα → Σφάλμα" is wrong for i5-12400F/14400F Box, which ship with a cooler. F = no integrated graphics (rule 12); no box cooler = K/KF, Ryzen X/X3D, and Tray (but Greek shops also sell "Tray με ψύκτρα", D-07).
4. **Margins in rules 6, 8, 14 are ambiguous.** "έως 10 mm περιθώριο → προειδοποίηση": I read it as "fits, but within 10 mm of the limit → warning" (equal counts as warning). Please confirm, also for 5 mm (rule 8) and +10% (rule 14).
5. **"Likely fits" is orange (warning) in the colour table but a note in the rules** (rule 5: "σημείωση αν είναι εκτίμηση"). Pick one.
6. **The owner rule "a maker list read wrongly must never hide a part"** (CLAUDE.md) contradicts rules 9 and 21 at error level (S09, S33). Decide which wins for v2.
7. **The "Δεδομένα σήμερα" column is out of date**: rule 5 stated board size is 86% (not 70%), case GPU clearance 26.5% (not 14%), cooler sockets 33% (not ~15%), cooler-in-box 89% of models but 57% of builder rows.
8. **Prices with shipping cover only 28%** of listings (10,361 of 36,812: Shopflix and Snif never; GPU 18.6%, PSU 11.4%), and the builder rows carry no shipping at all. The v2.0 promise "σύνολο με μεταφορικά ανά κατάστημα" needs per-shop shipping rules (the plan's manual file, v2.1) or more product-page fetches; and P-01 shows the current totals can belong to another offer.
9. **Availability and real shop are not collected** for most offers, yet the plan's price cell shows both ("Διαθεσιμότητα", "Plaisio, μέσω Skroutz"). Add them to Phase 2's list of new scraper fields.
10. **What is a "product" for product pages and URLs?** RAM, PSU and GPU models are spec groups across makers (UX-18, UX-40); `/gpu/rtx-5070-gigabyte-windforce` needs a product level (e.g. GPU `card_key`) that the list pages don't have today. Decide before the URL scheme.
11. **Wattage**: the plan formula needs per-chip TBP and per-family PPT/PL2 tables (not in the data). With them, `max(card maker, formula)` also protects against the wrong card figures of D-02.
12. **Operations**: the plan has no item for noticing a broken scraper. OPS-01 went unnoticed for ~15 h; a free alert (backlog #6) and the plan's "price older than 24 h is marked" rule would have shown it.
13. **Phase 0 deliverable vs gates**: the plan says severe compatibility errors are fixed in v1 immediately; the Phase 0 prompt says don't fix S1 in Phase 0. I followed the prompt; the S1 list in §3.1 is ready for your decision.

## 10. B6 — problems you have seen yourself

The Phase 0 prompt still had the placeholder "[Teo: write here what you have seen go wrong…]", and the plan's decision #1 asks the same. **Nothing was provided, so nothing was reproduced.** If you list them, I'll reproduce each with evidence and add it here.
