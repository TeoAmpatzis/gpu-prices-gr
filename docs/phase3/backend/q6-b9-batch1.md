# Q6: B9 grouping batch 1 (cases, fans, coolers)

Plan: `docs/superpowers/plans/2026-10-20-q6-b9-batch1.md` (approved by the owner 25/10 with answers 1–8).
Code: commit **851710d** on branch `q6-b9-batch1` (worktree `buildcraft-q6`), on top of main's 800830f. Not pushed:
the push waits until Q4b's clean-up history run is confirmed (one main change at a time). Numbers below are offline,
on main's data at df2d8fa (2026-10-25).

## What changed

- Greek shop descriptors in case/fan/cooler names are dropped ("Διπλού/Τριπλού Ανεμιστήρα 120mm", "Επεξεργαστή",
  "ΚΟΥΤΙ ΥΠΟΛΟΓΙΣΤΗ" …) or translated when they name a real difference: Ασύρματο → Wireless, LCD Οθόνη → LCD,
  Γυάλινη → Glass, Ακρυλική → Acrylic. Colours are still dropped.
- Greek look-alike capitals become Latin (shared `names.latin`, also used by the motherboard normalizer: 0 of 2,939
  boards change).
- "The Tower 300" = "Tower 300" (Thermaltake's own name). Lian Li "O11D EVO RGB" = "O11 Dynamic EVO RGB", its own
  model; the plain EVO stays separate. The EVO RGB override (455.7 mm GPU / 167 mm cooler) is kept and points at the
  new key; it is removed only when the log shows the Lian Li page matches, after asking the owner.
- AIO coolers: the radiator comes from the name, never from the fan size after the fan count. 268 Shopflix/Snif
  listings change from Air to AIO with a radiator. An AIO name ending in its fan size loses it; a bare 120/140 counts
  as the radiator when the URL says water cooling; on an air-cooler URL the Greek fan count never makes an AIO
  (reviewer's finding, fixed with 2 tests).
- `scraper/model_aliases.json`: 242 new entries (case 10 incl. the hand-picked `lianlio11devo → lianlio11dynamicevorgb`,
  fan 7, cooler 225). They move each old key's price history to the new model on the next scrape.

## Numbers (offline, df2d8fa)

| | case | fan | cooler |
|---|---:|---:|---:|
| Models | 2,630 → 2,626 | 2,010 → 2,004 | 2,066 → 1,857 |
| Listings that change model | 21 | 8 | 311 |
| Listings dropped / added | 0 / 0 | 0 / 0 | 0 / 0 |
| Aliases | 10 | 7 | 225 |
| Models on 2+ sites | 1,438 → 1,439 | 770 → 771 | 820 → 899 |
| History points after the alias fold | 406,621 → 406,514 | 325,742 → 325,584 | 379,247 → 373,961 |
| builder.json rows | 2,630 → 2,626 | 1,714 → 1,708 | 2,066 → 1,857 |

- **History check** (the real `merge_history.check`, offline, with the aliases): "nothing lost", exit 0, **without**
  `--allow-shrink`. The points that disappear are same-day pairs that become one (own point beats imported, lower of
  the same kind) and 48 cooler points over the 365-point trim. Without the aliases it would report 602 / 184 / 5,788
  points lost.
- Vercel publishing check: passes (largest drop cooler models −10.1%, limit 30%).
- Builder cooler coverage 72% → 80%.

## The 10 biggest price-gap merges, opened by the reviewer

The reviewer fetched 26 shop pages (one at a time, 5–8 s apart, all HTTP 200) and compared the spec tables.
All 10 are the **same product**; the price gaps are Shopflix marketplace sellers' prices.

| # | Model | Verdict | Evidence |
|---|---|---|---|
| 1 | Thermaltake Toughliquid 360 EX Pro Sync | same | Shopflix 3 fans 120 mm 2000 rpm = Skroutz CL-W400-PL12BL-A, 3×120, 2000 rpm |
| 2 | Gigabyte Aorus Waterforce X II 360 | same | Shopflix 3×120, 2400 rpm, radiator 394×119×27 = BestPrice + Skroutz, 3 fans, 2400 rpm |
| 3 | 1stPlayer Thunderstorm TS2 360 | same | Shopflix white TS2 3×120 2500 rpm = Skroutz white TS2; BestPrice black (colour only) |
| 4 | Deepcool LQ240 | same | Shopflix 2×120 2400 rpm = Skroutz R-LQ240-BKLSMW-G-1; e-shop "DEEPCOOL LQ240" |
| 5 | Darkflash DH360D | same | Shopflix 3 fans 120 mm 2000 rpm = BestPrice DH360D White |
| 6 | SilverStone XE360-TR5 | same | Shopflix 3 fans 120 mm 4000 rpm = Skroutz XE360-TR5 |
| 7 | Mars Gaming ML-ONE360 | same | Shopflix white 3×120 1800 rpm = Skroutz ML-ONE360 white |
| 8 | Cooler Master MasterLiquid PL360 Flux | same | Shopflix 3 fans 2300 rpm = Skroutz MLY-D36M-A23PZ-R1 + BestPrice |
| 9 | Deepcool Mystique 240 | same | Shopflix 2 fans 120 mm = Skroutz Mystique 240 + BestPrice |
| 10 | 1stPlayer MT360 Infinite Space | same | Shopflix 3 fans 120 mm 2500 rpm = Skroutz MT360 Infinite Space, 2500 rpm |

Nothing had to be kept apart.

## Checks

All 13 `scripts/checks/test_*.py` pass (new: test_names 10, test_normalize_case 22, test_normalize_cooling 29;
aliases 41). The new tests fail on the old code (names 0/10, case 5/22, cooling 5/27). Reviewer: spec OK, quality
approved; one fix round (the air-URL rule), re-review approved. `npm run build` not run: no site file changed and the
build's data step needs the network; no linter yet.

## Left for later

- Endorfy Fera 5 / Scythe Mugen 6 Shopflix "Διπλού" listings beside a separate "Dual" model (owner: later batch).
- The plain O11 Dynamic EVO keeps 27 days of EVO RGB prices under its old key (owner accepted; week change reads high
  for about a week).
- Split old keys without an alias keep history nobody uses (Darkflash Aquarius/DK431, be quiet! Light/Pure/Silent
  Loop 120mm, Cougar Poseidon Elite 120mm, Lian Li Hydroshift LCD 360).
