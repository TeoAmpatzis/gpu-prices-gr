# Q4b: Skroutz import glitches

Not committed, not pushed. Branch `a3-queue` (worktree `buildcraft-a3`), fast-forwarded to origin/main **`df2d8fa`**
(data commit "update prices 2026-10-25 05:36"); every number below is from that data, offline, no network. Waiting
for review, then your OK for the push and for the one `allow_history_shrink` run.

## What changed

- `scraper/glitches.py` (new): v2's import-glitch rule, ported line by line from `src/lib/dips.ts` (N = 3 models,
  runs of at most 3 days, neighbours at least 5 % higher, whole run or nothing, every point of the run imported).
  On today's data it finds exactly the same 678 points as v2's own code, in every category.
- `scraper/site_history.py` (the daily import): a newly fetched Skroutz series loses its glitch runs **before** it
  is merged into `history.json` and before its all-time `low` is taken. It never removes points already in
  `history.json`, so the strict push guard stays as it is.
- Queue order: models never imported come first, as today; reset models are fetched **after** them, inside the same
  60 requests per category per day, same pauses. No extra Skroutz requests.
- One-off clean-up: `python scraper/glitches.py clean [--dry-run]`. It removes the glitch points from
  `history.json` and resets the wrong lows. Only in the run you OK.
- `history.yml`: new manual input `clean_glitches` (default off; the daily schedule never cleans). It runs the
  clean-up before the import in the same job, and stops at once unless `allow_history_shrink` is also ticked. It
  also refuses `clean_glitches` together with `restore_from` (a restore run never imports, so the clean-up would
  be skipped silently).
- Tests: `scripts/checks/test_glitches.py` (76 checks, plus 18 parity checks with v2 on real data), two Skroutz price
  graphs as fixtures (Xeon E-2486, Core i9-14900KF, fetched 20/10). No network in tests.

## Decision for you: one new small data file per category

`public/data/<cat>/import_glitches.json`, e.g. gpu: `{"days":{"2025-09-10":[115.43]},"lows":[115.43]}`
(48 bytes to 3.0 KB per category, 7.4 KB in all). **This is a new data file (a schema change), so it needs your OK.**

Why: the rule sees a glitch only while 3+ models still show it. The clean-up removes exactly that evidence (the
glitch points, and the bad lows it resets). Without a record, the re-imports would bring the glitches straight back.
Measured on today's cleaned data with the Xeon E-2486 graph: **with** the file its re-imported low is 505.05 €;
**without** it, 369.59 € again, and the 10/09/2025 point is written back.

What it holds: `days` = the date and value of every removed glitch point; `lows` = only the shared lows of entries
the clean-up actually **reset** (73 values in all). A shared low that every model holding it keeps (a real sibling
promo: Asus Prime 94.90 €, Jonsbo 12.40 / 32.09 / 35.65 €, Chieftec 4.13 € and 12 more) is **not** written; it stays
suspect only while 3+ models still hold it, as in v2.

**What you accept with it:** the file is never pruned, so in that category a real deal of 1 to 3 days at **exactly**
one of the stored glitch prices, with the days around it 5 % or more higher, is dropped from any later import, and
that model's low comes out higher than the real one. Examples of stored prices: mobo 87.00, 139.00, 150.00 €; case
24, 40, 47, 52, 63, 68, 78 €; cooler 24, 50, 79, 95 €; fan 5.00, 12.90, 14.90, 24 €. Round prices are the most
exposed (a 2-day 50 € cooler promo, a Black Friday board at 150 €). Real runs of 4+ days, or drops of less than 5 %,
are never touched.

The file is written by the clean-up and extended by the daily import when it skips a glitch (days only). An
unreadable file stops the run instead of being treated as empty. The live site does not read it. Nothing else changes
in the existing files' format.

## Reset marker (no new field)

A reset entry becomes a date-only string, e.g. `"Xeon E-2486": "2026-10-25"`. That format already exists (older
entries were like that; none are left today):
- the import fetches it again, after the first imports;
- the live site treats it as "no Skroutz low" (`allTimeLow` only reads object entries; `derive.ts` passes it on
  unchanged), so until the re-import the badge uses `history.json` alone, as for any new model;
- the git merge keeps the reset: base full + ours reset + theirs unchanged gives the reset (tested both ways); a
  later re-import replaces it with a full entry;
- the push guard sees no lost marker (the key stays); it counts only the removed points.

## Offline before/after (`df2d8fa`)

| Category | Points removed | Models | Shared-low models (N = 3) | kept | reset | Own-glitch lows reset | Entries reset |
|---|---:|---:|---:|---:|---:|---:|---:|
| gpu | 1 | 1 | 6 | 0 | 6 | 0 | 6 |
| cpu | 11 | 11 | 13 | 0 | 13 | 1 | 14 |
| mobo | 64 | 39 | 38 | 8 | 30 | 7 | 37 |
| ram | 4 | 4 | 18 | 1 | 17 | 0 | 17 |
| storage | 28 | 20 | 53 | 0 | 53 | 0 | 53 |
| psu | 5 | 3 | 9 | 0 | 9 | 0 | 9 |
| case | 165 | 109 | 94 | 26 | 68 | 17 | 85 |
| fan | 301 | 155 | 160 | 68 | 92 | 12 | 104 |
| cooler | 99 | 74 | 83 | 17 | 66 | 4 | 70 |
| **Total** | **678** | **416** | **474** | **120** | **354** | **41** | **395** |

- "Kept": the low is also a normal (not glitch) imported point still in the model's history, so it is visibly a
  real price and stays. The other shared lows are reset.
- "Own-glitch lows reset" (one addition to the brief): a low that equals one of the model's own removed glitch
  points, though fewer than 3 models share it (e.g. two Noctua NF-A4x10 at 12.58 € on 16/12/2025). Keeping them
  would keep a low the clean-up just proved wrong. 8 more such models keep theirs by the same "visibly real" rule.
  The clean-up log's "spared" column (128 in all) = these 8 + the 120 kept shared lows.
- Our own scraped points (no `"i"`) are untouched: the same set before and after (288,866 points: gpu 2,592, cpu
  11,108, mobo 31,157, ram 12,028, storage 50,564, psu 4,986, case 68,594, fan 52,315, cooler 55,522). Model counts
  are the same in `history.json` and `history_imported.json`; no entry other than the 395 resets changes; no point
  is added; the files keep their format and key order.
- A reset low is not lost for good: the re-import reads the model's whole ~2-year Skroutz graph again with the rule,
  so a real low comes back.

**Why more than on 20/10 (604 points / 374 models / 356 resets):** 604 + 38 + 54 - 18 = 678.
- +38 points in models first imported since 20/10 (case 21, fan 13, cooler 4);
- +54 points that were already there but are flagged now, because newly imported models share their day (case 27,
  fan 18, cooler 9);
- -18 points that fell out of the 365-point window (storage 7, fan 5, case 4, mobo 1, ram 1).
- Resets: case 68 to 85, fan 92 to 104, cooler 64 to 70, storage 49 to 53, the rest unchanged; the ~500 entries
  imported since 20/10 brought new shared lows (case 14 to 19, fan 28 to 36, cooler 14 to 16).
These numbers keep moving a little every day; the run's own log prints the real ones.

## Re-import cost (after the first imports already queued)

Requests per model: 1, or up to 3 Skroutz products for gpu/ram/psu. Days at 60 requests per category per day,
counting the first imports ahead in the queue, if every request succeeds.

| | gpu | cpu | mobo | ram | storage | psu | case | fan | cooler |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| First imports queued (24/10 log "left") | 1 (1) | 2 (2) | 1 (1) | 3 (3) | 817 (816) | 0 (0) | 700 (699) | 115 (115) | 113 (113) |
| Re-imports (models / requests) | 5 / 12 | 12 / 12 | 34 / 34 | 17 / 40 | 51 / 51 | 9 / 23 | 85 / 85 | 104 / 104 | 64 / 64 |
| Reset, no Skroutz listing today | 1 | 2 | 3 | 0 | 2 | 0 | 0 | 0 | 6 |
| Day the re-imports finish | 1 | 1 | 1 | 1 | 15 | 1 | 14 | 4 | 3 |

425 requests for 381 models. Storage and case show one more first import than the 24/10 log: the 25/10 scrape
added one model each. The latest history run (24/10) got 403 from Skroutz in every category and imported nothing;
each such day adds a day. The 14 resets without a Skroutz listing wait until one appears.

## Sibling promos (same maker, same low)

| Group | Models | Keep low | Why |
|---|---:|---:|---|
| Asus Prime B840M-A / B860M-K / H810M-A WiFi, 94.90 € | 3 | 3 | 6-day run 24-29/09/2026, in history.json |
| Corsair iCUE Link LX 140 R / LX 140 / LX 120 R, 35.89 € | 3 | 2 | LX 140 R: 17 days from 31/10/2025; LX 140: 9 days at 35.89 € from 26/10/2025 (longest unbroken run 5). LX 120 R is reset: its only 35.89 € day (21/10/2025) has fallen out of its 365-point history since 20/10 |
| Noctua NF-A12x15 FLX / NF-A12x15 / NF-S12A, 18.71 € | 3 | 0 | one day each, 16/12/2025, between ~21-23 € days (NF-A12x15: 23.01 / 18.71 / 23.01): a glitch by the rule. Reset; the re-import decides again |
| Chieftec AF-0825 PWM / AF-1225S / ZF-1425 PWM, 4.13 € | 3 | 3 | one day (10/07/2026), but the next day is less than 5 % higher: a real price by the rule |

All 101 groups where 2+ models of one maker share a low (members = models of the category with that low; only
groups with a kept or reset model; 63 models keep their low):

| Cat | Maker | Low € | Models with it | Same maker | Keep | Kept (run) | Reset |
|---|---|---:|---:|---:|---:|---|---|
| gpu | NVIDIA | 115.43 | 6 | 5 | 0 | - | RTX 3050 6GB, RTX 3050 8GB, GTX 1660 Ti 6GB, GTX 1660 Super 6GB, T400 4GB |
| cpu | Intel | 369.59 | 10 | 8 | 0 | - | Core Ultra 9 285K, Core i9-14900, Core i9-14900KF, Core i9-13900, Xeon Silver 4309Y, Xeon E-2486, Xeon E-2488, Core i7-13700T |
| cpu | AMD | 999.00 | 3 | 2 | 0 | - | EPYC 9334, EPYC 9454 |
| mobo | ASRock | 62.90 | 2 | 2 | 0 | - | asrockb650pglightning, asrockb760prors |
| mobo | Biostar | 69.90 | 4 | 2 | 0 | - | biostarb760mxcpro20wifi, biostarb760mxcpro20 |
| mobo | ASRock | 87.00 | 3 | 2 | 1 | asrockh810mxgen5 (1 d from 2026-09-26) | asrockb850proawifi |
| mobo | Asus | 94.90 | 3 | 3 | 3 | asusprimeb840macsm, asusprimeb860mk, asusprimeh810mawifi (6 d from 2026-09-24) | - |
| mobo | Asus | 97.99 | 9 | 4 | 0 | - | asusrogstrixb550fgaming, asusproq670mccsm, asustufgamingb550mplus, asusb650emaxgamingwifi |
| mobo | Gigabyte | 97.99 | 9 | 4 | 1 | gigabyteb550maoruseliteax (1 d from 2025-09-22) | gigabyteb650mgamingwifi6e, gigabyteb760gamingxd4gen5, gigabyteb860ds3hwifi6e |
| mobo | MSI | 139.00 | 3 | 2 | 1 | msib850wifi (1 d from 2026-05-28) | msiproz890awifi |
| mobo | Asus | 150.00 | 3 | 2 | 1 | asustufgamingh770prowifi (2 d from 2026-07-04) | asusrogstrixb850agamingwifi |
| mobo | Asus | 369.59 | 13 | 5 | 0 | - | asusrogstrixx870eegamingwifi, asusprowsw680aceipmi, asusproartx870ecreatorwifi, asusrogstrixx870igamingwifi, asusrogcrosshairx870eherowifi |
| mobo | ASRock | 369.59 | 13 | 4 | 0 | - | asrockb650d4u2l2tbcmb650e, asrockknoll3, asrockx870etaichiwifi, asrockz890taichiwifi |
| ram | CoreParts | 12.00 | 3 | 2 | 1 | DDR4 4GB (1×4GB) 2400MHz Desktop (1 d from 2025-10-01) | DDR4 4GB (1×4GB) 2400MHz Laptop |
| ram | G.Skill | 24.00 | 4 | 2 | 0 | - | DDR4 16GB (2×8GB) 3600MHz Desktop, DDR3 16GB (2×8GB) 1866MHz Laptop |
| ram | G.Skill | 47.55 | 11 | 3 | 0 | - | DDR5 32GB (2×16GB) 6400MHz Desktop, DDR4 32GB (2×16GB) 3600MHz Desktop, DDR5 32GB (2×16GB) 4800MHz Laptop |
| ram | Kingston | 47.55 | 11 | 5 | 0 | - | DDR5 16GB (1×16GB) 6400MHz Desktop, DDR5 32GB (1×32GB) 5200MHz Desktop, DDR5 32GB (1×32GB) 5600MHz Server, DDR5 16GB (1×16GB) 6400MHz Laptop, DDR5 16GB (1×16GB) 6000MHz Laptop |
| ram | Corsair | 47.55 | 11 | 3 | 0 | - | DDR5 32GB (2×16GB) 5200MHz Desktop, DDR4 32GB (2×16GB) 2666MHz Laptop, DDR3 12GB (3×4GB) 1600MHz Desktop |
| storage | Intenso | 7.51 | 3 | 2 | 0 | - | intensotop128gbssd, intensohigh240gbssd |
| storage | Kingston | 13.35 | 5 | 2 | 0 | - | kingstona400240gbssd, kingstona400480gbssd |
| storage | Intenso | 13.35 | 5 | 3 | 0 | - | intensotop512gbssd, intensotop1tbssd, intensotop256gbssd |
| storage | Intenso | 24.00 | 26 | 3 | 0 | - | intensotop512gbm2ssd, intensomi500500gbssd, intensopremium500gbssd |
| storage | Patriot | 24.00 | 26 | 3 | 0 | - | patriotp300512gbssd, patriotp220512gbssd, patriotp310480gbssd |
| storage | Crucial | 24.00 | 26 | 2 | 0 | - | cruciale100480gbssd, crucialp3500gbssd |
| storage | Goodram | 24.00 | 26 | 2 | 0 | - | goodrampx500512gbssd, goodrampx600500gbssd |
| storage | PNY | 24.00 | 26 | 2 | 0 | - | pnycs1030500gbssd, pnycs2230500gb2230ssd |
| storage | TeamGroup | 24.00 | 26 | 2 | 0 | - | teamgroupgx2512gbssd, teamgroupms30512gbm2ssd |
| storage | MSI | 24.00 | 26 | 2 | 0 | - | msispatiums270480gbssd, msispatiumm371500gbssd |
| storage | Transcend | 24.00 | 26 | 4 | 0 | - | transcend220s256gbmsatassd, transcend230s256gbmsatassd, transcend430s256gbm2ssd, transcend115s250gbssd |
| storage | Western Digital | 369.59 | 16 | 7 | 0 | - | westerndigitalultrastardchc58022tbhdd, westerndigitalultrastardchc58024tbhdd, westerndigitalultrastardchc57022tbhdd, westerndigitalgold18tbhdd, westerndigitalredpro18tbhdd, westerndigitalgold22tbhdd, westerndigitalredpro26tbhdd |
| storage | Seagate | 369.59 | 16 | 3 | 0 | - | seagateexosx2424tbhdd, seagateironwolfpro20tbhdd, seagateskyhawkai24tbhdd |
| storage | Crucial | 369.59 | 16 | 3 | 0 | - | crucialt7004tbssd, crucialt700heatsink4tbssd, crucialt7054tbssd |
| psu | Chieftec | 24.00 | 9 | 2 | 0 | - | 700W ATX, 400W Bronze ATX |
| psu | Powertech | 24.00 | 9 | 2 | 0 | - | 500W Bronze ATX, 250W TFX |
| case | Krux | 24.00 | 18 | 2 | 0 | - | kruxvako, kruxscor |
| case | Aerocool | 24.00 | 18 | 5 | 0 | - | aerocoolprimev1, aerocoolcs109, aerocoolcs110, aerocooldelta, aerocoolraidermini |
| case | Inter-Tech | 24.00 | 18 | 2 | 0 | - | intertechit2812business, intertechjx500 |
| case | LC-Power | 24.00 | 18 | 4 | 0 | - | lcpower2014mb, lcpower2015mb, lcpower7034b, lcpower7036b |
| case | 1stCOOL | 37.90 | 3 | 2 | 1 | 1stcoolstep5 (13 d from 2026-09-16) | 1stcoolstep6 |
| case | Kolink | 40.00 | 3 | 2 | 0 | - | kolinkobservatorymxmesh, kolinkunitymeshbay |
| case | Adata | 45.48 | 3 | 2 | 2 | adatavalorairnano, adatavalormeshnano (80 d from 2026-07-11) | - |
| case | Sharkoon | 47.00 | 6 | 2 | 0 | - | sharkoonak2, sharkoonvk4rainbow |
| case | Sharkoon | 47.55 | 14 | 4 | 0 | - | sharkoonv1000, sharkoonpuresteel, sharkoontg5pro, sharkoonlit200 |
| case | Chieftec | 47.55 | 14 | 5 | 0 | - | chieftecbu12b300, chiefteccw01bop, chieftecht01b350gpb, chiefteccm25bop, chiefteclf02bop |
| case | Inter-Tech | 47.55 | 14 | 2 | 0 | - | intertechit502desktop, intertechit6865 |
| case | Antec | 49.90 | 5 | 2 | 1 | antecax90 (15 d from 2025-10-26) | anteccx600mtrio |
| case | Corsair | 52.00 | 4 | 2 | 0 | - | corsair3500x, corsairframe4000d |
| case | Armaggeddon | 54.14 | 6 | 3 | 3 | armaggeddonaquaronnemo, armaggeddondfduplex2cargbw, armaggeddondeepfreezeduplex2argbc (1 d from 2026-08-27) | - |
| case | Chieftec | 55.51 | 3 | 2 | 2 | chieftecscorpioniii, chieftecscorpion3 (1 d from 2026-02-16) | - |
| case | Sharkoon | 78.00 | 4 | 2 | 0 | - | sharkoonak6, sharkoonrebelc80m |
| case | Thermaltake | 86.80 | 2 | 2 | 0 | - | thermaltakeaht200 |
| case | Be Quiet | 97.99 | 2 | 2 | 0 | - | bequietlightbase900dx, bequietshadowbase800 |
| fan | Chieftec | 2.76 | 3 | 2 | 2 | chieftecaf0625s60mm, chieftecaf0825s80mm (1 d from 2026-07-10) | - |
| fan | Aerocool | 2.83 | 6 | 3 | 2 | aerocool12120mm (8 d from 2026-09-10); aerocool12frgb120mm (23 d from 2026-09-06) | aerocool14140mm |
| fan | 1stPlayer | 2.83 | 6 | 2 | 2 | 1stplayerfan120f1120mm, 1stplayerdf1202512seln120mm (34 d from 2026-08-26) | - |
| fan | Chieftec | 4.13 | 3 | 3 | 3 | chieftecaf0825pwm80mm, chieftecaf1225s120mm, chiefteczf1425pwm140mm (1 d from 2026-07-10) | - |
| fan | Jonsbo | 5.00 | 3 | 2 | 0 | - | jonsbosl120c120mm, jonsbosl120cw120mm |
| fan | 1stPlayer | 5.90 | 4 | 2 | 1 | 1stplayerfc7rinfinitymirror120mm (31 d from 2025-07-07) | 1stplayerfc7infinitymirror120mm |
| fan | Havit | 6.99 | 3 | 2 | 0 | - | havitf2089120mm, havitf2095120mm |
| fan | Noiseblocker | 7.19 | 3 | 2 | 2 | noiseblockerblacknoisesilentpro120mm, noiseblockerpk2140mm (3 d from 2026-09-26) | - |
| fan | StarTech | 8.50 | 2 | 2 | 1 | startechfan5x1tx350mm (99 d from 2025-10-23) | - |
| fan | Noiseblocker | 8.73 | 4 | 3 | 3 | noiseblockermultiframem12p120mm, noiseblockernbeloopbionicb123120mm, noiseblockereloopseries120mm (1 d from 2026-09-24) | - |
| fan | Jonsbo | 12.40 | 4 | 3 | 3 | jonsbozb120w120mm (268 d from 2025-12-21); jonsboza120w120mm (4 d from 2026-10-16); jonsbozb120br120mm (286 d from 2025-12-21) | - |
| fan | ID-Cooling | 12.54 | 3 | 3 | 3 | idcoolingpn17rainbow120mm, idcoolingpn21120mm, idcoolingpn26140mm (2 d from 2026-09-24) | - |
| fan | Noctua | 12.58 | 2 | 2 | 0 | - | noctuanfa4x10flx40mm, noctuanfa4x105vflx40mm |
| fan | Noctua | 12.82 | 3 | 3 | 0 | - | noctuanfa6x25flx60mm, noctuanfa6x2560mm, noctuanfa6x15pwm60mm |
| fan | Noctua | 14.05 | 2 | 2 | 0 | - | noctuanfp14rredux1500140mm, noctuanfp14sredux900140mm |
| fan | Noctua | 16.87 | 3 | 3 | 0 | - | noctuanfs12auln120mm, noctuanfs12aflx120mm, noctuanfa9x14hspwmchbks92mm |
| fan | Corsair | 18.35 | 3 | 2 | 2 | corsairinfinityj22a120mm3 (19 d from 2026-09-10); corsairinfinityj22areverse120mm3 (20 d from 2026-09-09) | - |
| fan | Noctua | 18.71 | 3 | 3 | 0 | - | noctuanfa12x15flx120mm, noctuanfa12x15120mm, noctuanfs12a120mm |
| fan | Noctua | 22.03 | 5 | 5 | 0 | - | noctuanfa145v140mm, noctuanfa14flx140mm, noctuanfa14140mm, noctuanfa15140mm, noctuanfs12achromaxswap120mm |
| fan | Noctua | 24.00 | 35 | 9 | 0 | - | noctuanfa205v200mm, noctuanfa20flx200mm, noctuanff12industrialppc3000120mm, noctuanfa12x25uln120mm, noctuanfa12x255v120mm, noctuanfa12x25ls120mm, noctuanfa15hs140mm, noctuanfa12x25120mm, noctuanfa12x25pwmchromaxswap120mm |
| fan | Be Quiet | 24.00 | 35 | 4 | 0 | - | bequietsilentwingspro4120mm, bequietsilentwingspro4140mm, bequietsilentwings4pro120mm, bequietsilentwings4pro140mm |
| fan | Alphacool | 24.00 | 35 | 2 | 0 | - | alphacoolapexstealth120mm, alphacoolapexstealthmetalpower120mm |
| fan | Lian Li | 24.00 | 35 | 4 | 0 | - | lianliunislinfinity140mm, lianliunialv2120mm, lianliunislinf140mm, lianliunitl120mm |
| fan | SilverStone | 24.00 | 35 | 4 | 0 | - | silverstonesharkforce140140mm, silverstoneairpenetrator120sk120mm, silverstonesharkforce140mm, silverstonefhs120x120mm |
| fan | Thermaltake | 24.00 | 35 | 4 | 0 | - | thermaltakeriing12radiatorsyncedition120mm3, thermaltakeriing14140mm3, thermaltakeriingquad12radiatorttpremium120mm, thermaltaketoughfan12highstaticpressureradiator120mm2 |
| fan | Noctua | 25.98 | 4 | 2 | 0 | - | noctuanfa12x25flx120mm, noctuanfa12x25r120mm |
| fan | Jonsbo | 26.90 | 4 | 3 | 3 | jonsboza240b120mm (110 d from 2026-06-11); jonsboza240w120mm (87 d from 2025-12-21); jonsboza240wr120mm (165 d from 2025-12-21) | - |
| fan | Phanteks | 29.97 | 3 | 2 | 2 | phanteksm25g2140140mm3, phanteksm25g2120120mm3 (1 d from 2026-08-11) | - |
| fan | Jonsbo | 32.09 | 4 | 4 | 4 | jonsbozl120b120mm3 (88 d), jonsbozl120br120mm3 (11 d), jonsbozl120w120mm3 (88 d), jonsbozl120wl120mm3 (92 d), all from 2026-07-03 | - |
| fan | Jonsbo | 35.65 | 5 | 5 | 5 | jonsbozk120b120mm3, jonsbozk120w120mm3, jonsbozk120wr120mm3 (88 d from 2026-07-03); jonsbozk120br120mm (92 d from 2026-07-03); jonsbozb360br123mm (225 d from 2025-12-21) | - |
| fan | Corsair | 35.89 | 3 | 3 | 2 | corsairicuelinklx140r140mm (17 d from 2025-10-31); corsairicuelinklx140140mm (5 d from 2025-10-31) | corsairicuelinklx120r120mm |
| fan | Lian Li | 37.05 | 9 | 2 | 0 | - | lianliunifanslwireless120mm3, lianliunitllcdwireless120mm |
| fan | Thermaltake | 37.05 | 9 | 4 | 0 | - | thermaltakeriingtrio12radiatorttpremium120mm3, thermaltakect140exstandardblades140mm3, thermaltakeriingduo12radiatorttpremium120mm3, thermaltakeswafanex12syncttpremiumedition120mm3 |
| fan | For (card fans) | 49.84 | 3 | 3 | 3 | forgalaxgtx660660tigtx760gtx770gtx780gtx780ti85mm, forgalaxyrtx2080ti88mm, forgeforcegtx1080107086mm (296 d from 2025-10-22) | - |
| fan | Corsair | 74.90 | 3 | 2 | 2 | corsairrx360iiunified120mm3, corsairrx360iiunifiedstaticpressure120mm3 (19 d from 2026-09-10) | - |
| fan | Lian Li | 87.00 | 3 | 3 | 0 | - | lianliunislinfinitywireless120mm3, lianliunislinfwireless120mm3, lianliunislinfwireless120120mm3 |
| cooler | Xilence | 15.74 | 3 | 2 | 0 | - | xilencem403pro, xilencei404t |
| cooler | Be Quiet | 21.17 | 20 | 3 | 1 | bequietpurerockslim3 (55 d from 2026-07-08) | bequietpurerockpro3, bequietpurerock3lx |
| cooler | Thermaltake | 21.17 | 20 | 2 | 0 | - | thermaltakeastria200, thermaltakeriingsilent12sync |
| cooler | Deepcool | 21.17 | 20 | 8 | 0 | - | deepcoolag400digitalplus, deepcoolak400zerodark, deepcoolak400zerodarkplus, deepcoolag400bk, deepcoolak400digital, deepcoolak400digitalwh, deepcoolak400wh, deepcoolag400digitalbk |
| cooler | SilverStone | 21.17 | 20 | 2 | 0 | - | silverstoneargonar09115xp, silverstoneargonar10 |
| cooler | Enermax | 21.17 | 20 | 2 | 0 | - | enermaxt50axesilent, enermaxetst50abvt |
| cooler | Jonsbo | 24.00 | 12 | 2 | 0 | - | jonsbocr1000evo, jonsbohp600 |
| cooler | Thermaltake | 24.00 | 12 | 2 | 0 | - | thermaltakeux200se, thermaltaketoughair310 |
| cooler | SilverStone | 24.00 | 12 | 2 | 0 | - | silverstoneargonar12, silverstonexe011700a |
| cooler | Akasa | 24.00 | 12 | 2 | 0 | - | akasavegaschromailg, akasaakcc6606bp01 |
| cooler | Alphacool | 37.05 | 10 | 2 | 0 | - | alphacoolcoreoceant38280, alphacoolcoreoceant38360 |
| cooler | Aerocool | 37.05 | 10 | 2 | 0 | - | aerocoolmiragel240, aerocoolmiragel360 |
| cooler | NZXT | 95.00 | 3 | 2 | 0 | - | nzxtkraken240, nzxtkrakenplus240v2 |

"1 d" runs are kept when a neighbour is less than 5 % higher (a small real drop). Groups of 2 not shared by 3
models (mobo 62.90, Noctua 12.58 / 14.05, Thermaltake 86.80, Be Quiet 97.99) are own-glitch resets.

## Every real-looking low that is reset (211)

Your screen: reset, and (low at least 75 % of the model's median imported price, or the low's own day was a
removed glitch point). 130 pass the 75 % test, 138 had their low's day removed, 211 in all. Most are the known
glitch values (369.59 €, 115.43 €, 97.99 € on 26-27/06/2026, 24 €, the 23/01/2026, 08/01/2026 and 16/12/2025
days). Each one is checked again on its re-import with its whole Skroutz graph; it comes back if it was real.
Columns: low, median of the model's imported points, ratio, models of the category with that low, removed day(s)
at the low ("-" = the low is older than history.json).

| Cat | Model | Low € | Median € | Ratio | Same low | Day(s) removed |
|---|---|---:|---:|---:|---:|---|
| gpu | T400 4GB | 115.43 | 155.18 | 74% | 6 | 2025-09-10 |
| cpu | Core i7-13700T | 369.59 | 449.50 | 82% | 10 | 2025-09-10 |
| cpu | EPYC 9135 | 999.00 | 1223.50 | 82% | 3 | 2025-09-22 |
| cpu | Core i9-14900KF | 369.59 | 456.27 | 81% | 10 | - |
| cpu | Ryzen 5 PRO 9645 | 199.00 | 303.88 | 66% | 2 | 2026-01-23 |
| cpu | Xeon E-2486 | 369.59 | 791.11 | 47% | 10 | 2025-09-10 |
| cpu | Xeon E-2378G | 369.59 | 806.35 | 46% | 10 | 2025-09-10 |
| cpu | EPYC 9454 | 999.00 | 2282.32 | 44% | 3 | 2025-09-22 |
| cpu | Xeon E-2488 | 369.59 | 868.84 | 42% | 10 | 2025-09-10 |
| mobo | gigabyteb650mgamingwifi6e | 97.99 | 113.64 | 86% | 9 | 2026-06-26, 2026-06-27 |
| mobo | asrockx870etaichiwifi | 369.59 | 430.81 | 86% | 13 | - |
| mobo | asrockz890taichiwifi | 369.59 | 434.68 | 85% | 13 | - |
| mobo | asustufgamingb550mplus | 97.99 | 115.91 | 84% | 9 | 2026-06-26, 2026-06-27 |
| mobo | gigabytex870eaorusmasterwifi | 369.59 | 442.60 | 84% | 13 | - |
| mobo | asusrogstrixx870igamingwifi | 369.59 | 445.49 | 83% | 13 | - |
| mobo | msimpgx870ecarbonwifi | 369.59 | 489.83 | 76% | 13 | - |
| mobo | asustufgamingb760mplusii | 118.00 | 156.55 | 75% | 2 | 2026-01-23 |
| mobo | asusprimeb850e | 100.00 | 138.80 | 72% | 1 | 2026-01-23 |
| mobo | msiprob860pwifi | 118.00 | 164.30 | 72% | 2 | 2026-01-23 |
| mobo | gigabyteb760gamingxd4gen5 | 97.99 | 137.75 | 71% | 9 | 2026-06-26, 2026-06-27 |
| mobo | biostarh81mhv3 | 43.00 | 61.21 | 70% | 2 | 2026-01-23 |
| mobo | gigabyteb850md3hp | 87.00 | 124.84 | 70% | 3 | 2026-01-23 |
| mobo | asrockz890prorswifiwhite | 150.00 | 217.87 | 69% | 3 | 2026-01-23 |
| mobo | asrockz890prors | 139.00 | 203.00 | 68% | 3 | 2026-01-23 |
| mobo | msiprob850mpwifi | 97.99 | 145.98 | 67% | 9 | 2026-06-26, 2026-06-27 |
| mobo | asrockh610mhdvm2r20 | 43.00 | 64.79 | 66% | 2 | 2026-01-23 |
| mobo | gigabyteb860ds3hwifi6e | 97.99 | 155.63 | 63% | 9 | 2026-06-26, 2026-06-27 |
| mobo | asrockx570d4i2t | 369.59 | 599.70 | 62% | 13 | 2025-09-10 |
| mobo | asusrogstrixb550fgaming | 97.99 | 159.32 | 62% | 9 | 2026-06-26, 2026-06-27 |
| mobo | asusb650emaxgamingwifi | 97.99 | 165.75 | 59% | 9 | 2026-06-26, 2026-06-27 |
| mobo | asusrogstrixb850agamingwifi | 150.00 | 261.00 | 57% | 3 | 2026-01-23 |
| mobo | asrockb850proawifi | 87.00 | 151.56 | 57% | 3 | 2026-01-23 |
| mobo | asrockb760prors | 62.90 | 110.64 | 57% | 2 | 2026-03-13 |
| mobo | asrockb850mprorswifi | 69.90 | 129.13 | 54% | 4 | 2026-03-13 |
| mobo | msiproz890awifi | 139.00 | 272.70 | 51% | 3 | 2026-01-23 |
| mobo | asusproq670mccsm | 97.99 | 200.00 | 49% | 9 | 2026-06-26, 2026-06-27 |
| mobo | asrockb650pglightning | 62.90 | 128.60 | 49% | 2 | 2026-03-13 |
| ram | DDR3 12GB (3×4GB) 1600MHz Desktop | 47.55 | 94.31 | 50% | 11 | 2025-09-10 |
| storage | westerndigitalgold18tbhdd | 369.59 | 737.72 | 50% | 16 | 2025-09-10 |
| psu | 500W Standard ATX | 24.00 | 31.39 | 76% | 9 | 2026-01-23 |
| case | kolinkvoid | 47.00 | 47.19 | 100% | 6 | - |
| case | 1stcoolstep6 | 37.90 | 38.90 | 97% | 3 | - |
| case | antecp7silent | 78.00 | 81.64 | 96% | 4 | - |
| case | sharkoonmk2 | 54.00 | 56.80 | 95% | 2 | 2026-03-19 |
| case | powertechpt1101 | 49.90 | 55.60 | 90% | 5 | - |
| case | asusprimeap303 | 68.00 | 76.50 | 89% | 3 | 2026-01-23 |
| case | endorfysignumm30air | 54.14 | 61.00 | 89% | 6 | - |
| case | intertechit6865 | 47.55 | 53.92 | 88% | 14 | - |
| case | lcpower2014mb | 24.00 | 27.44 | 88% | 18 | - |
| case | aerocoolcs110 | 24.00 | 27.50 | 87% | 18 | - |
| case | aerocoolp300d | 45.00 | 52.53 | 86% | 3 | - |
| case | lcpower7036b | 24.00 | 28.24 | 85% | 18 | - |
| case | cougarpurity | 46.30 | 54.68 | 85% | 3 | - |
| case | kolinkinspirex3 | 37.90 | 45.17 | 84% | 3 | 2025-10-28 |
| case | zalmant6 | 24.00 | 28.76 | 84% | 18 | - |
| case | intertechit6505reto | 27.00 | 32.37 | 83% | 1 | 2026-01-23 |
| case | darkflashleo | 24.00 | 28.97 | 83% | 18 | - |
| case | lcpower2015mb | 24.00 | 29.32 | 82% | 18 | - |
| case | sharkoonmk4wstrip | 62.00 | 76.50 | 81% | 1 | 2026-03-19 |
| case | nzxth7flow | 97.00 | 120.00 | 81% | 2 | 2026-01-23 |
| case | sharkoonvs9 | 41.35 | 51.61 | 80% | 3 | - |
| case | iboxwizard4 | 68.00 | 86.53 | 79% | 3 | - |
| case | montechair100lite | 41.35 | 53.17 | 78% | 3 | - |
| case | iboxantila39 | 24.00 | 30.92 | 78% | 18 | - |
| case | sharkoonslider | 45.48 | 58.65 | 78% | 3 | - |
| case | sharkoonrebelc80g | 85.64 | 110.91 | 77% | 1 | 2026-03-14, 2026-03-15 |
| case | endorfyarx500air | 63.00 | 81.91 | 77% | 3 | 2026-01-23 |
| case | sharkoonrebelc70g | 106.00 | 138.32 | 77% | 2 | 2026-03-19 |
| case | asustufgt301 | 63.00 | 83.26 | 76% | 3 | 2026-01-23 |
| case | sharkoonvk4rainbow | 47.00 | 62.47 | 75% | 6 | 2026-03-19 |
| case | bequietshadowbase800 | 97.99 | 130.46 | 75% | 2 | 2026-06-26, 2026-06-27 |
| case | kolinkobservatorymxmesh | 40.00 | 54.05 | 74% | 3 | 2026-01-08 |
| case | sharkoonak6 | 78.00 | 105.78 | 74% | 4 | 2026-03-19 |
| case | chieftecxt01b350gpb | 60.70 | 84.52 | 72% | 2 | 2026-03-13, 2026-03-14, 2026-03-15 |
| case | bequietlightbase900dx | 97.99 | 139.24 | 70% | 2 | 2026-06-26, 2026-06-27 |
| case | sharkoonrebelc80m | 78.00 | 110.90 | 70% | 4 | 2026-03-19 |
| case | nzxth3flow | 47.00 | 67.99 | 69% | 6 | 2026-01-08 |
| case | kolinkvoidx | 50.44 | 75.53 | 67% | 1 | 2026-08-18 |
| case | sharkoonak2 | 47.00 | 70.80 | 66% | 6 | 2026-03-19 |
| case | anteccx700 | 55.00 | 82.89 | 66% | 2 | 2026-03-19 |
| case | antecax27 | 47.00 | 71.71 | 66% | 6 | 2026-03-19 |
| case | corsairframe4000drs | 63.00 | 96.36 | 65% | 3 | 2026-01-23 |
| case | sharkoontg6m | 68.00 | 104.89 | 65% | 3 | 2026-03-19 |
| case | msimagpano110rpz | 50.00 | 77.28 | 65% | 2 | 2026-01-23 |
| case | fsps380 | 45.00 | 69.50 | 65% | 3 | 2026-01-23 |
| case | gigabytec102glass | 40.00 | 64.81 | 62% | 3 | 2026-01-08 |
| case | intertechit2812business | 24.00 | 38.90 | 62% | 18 | 2026-01-23 |
| case | corsair3500x | 52.00 | 84.89 | 61% | 4 | 2026-01-23 |
| case | cougarduoface | 41.00 | 67.18 | 61% | 2 | 2026-01-23 |
| case | endorfyarx700 | 69.00 | 118.00 | 58% | 1 | 2026-01-08 |
| case | kolinkunitymeshbay | 40.00 | 70.57 | 57% | 3 | 2026-01-08 |
| case | deepcoolcg5804fv2 | 47.00 | 83.28 | 56% | 6 | 2026-01-23 |
| case | deepcoolcg5804f | 52.00 | 93.36 | 56% | 4 | 2026-01-23 |
| case | cougarduofacepro | 50.00 | 92.40 | 54% | 2 | 2026-01-23 |
| case | corsairframe4000d | 52.00 | 99.18 | 52% | 4 | 2026-01-23 |
| case | cougarfv270 | 75.00 | 150.00 | 50% | 2 | 2026-01-23 |
| case | thermaltakeaht200 | 86.80 | 178.43 | 49% | 2 | 2026-06-24, 2026-06-25 |
| case | deepcoolcyclops | 24.00 | 78.50 | 31% | 18 | 2026-09-26 |
| fan | lianliunislinfwireless120120mm3 | 87.00 | 87.99 | 99% | 3 | 2026-01-20 |
| fan | 1stplayerfc7infinitymirror120mm | 5.90 | 6.00 | 98% | 4 | - |
| fan | lianliunislinfinitywireless120mm3 | 87.00 | 89.59 | 97% | 3 | 2026-01-20 |
| fan | lianliunislinfwireless120mm3 | 87.00 | 89.59 | 97% | 3 | 2026-01-20 |
| fan | silverstonefhs120x120mm | 24.00 | 24.81 | 97% | 35 | - |
| fan | alphacoolapexstealth120mm | 24.00 | 24.89 | 96% | 35 | - |
| fan | alphacoolriseaurora140mm | 22.82 | 23.80 | 96% | 3 | - |
| fan | armaggeddonneuroniv120mm | 12.90 | 13.56 | 95% | 4 | - |
| fan | marvofn14120mm | 6.99 | 7.40 | 94% | 3 | - |
| fan | silverstonesharkforce140mm | 24.00 | 25.59 | 94% | 35 | - |
| fan | silverstoneairpenetrator140i140mm | 12.90 | 13.95 | 92% | 4 | - |
| fan | argusrs061120mm | 5.18 | 5.67 | 91% | 3 | - |
| fan | havitf2089120mm | 6.99 | 7.67 | 91% | 3 | 2025-12-04 |
| fan | whitesharkgravity120mm | 5.90 | 6.49 | 91% | 4 | - |
| fan | noctuanfp14rredux1500140mm | 14.05 | 15.51 | 91% | 2 | 2025-12-16 |
| fan | silverstoneairpenetrator120sk120mm | 24.00 | 26.50 | 91% | 35 | - |
| fan | lianliunitllcdwireless120mm | 37.05 | 41.36 | 90% | 9 | - |
| fan | xilencexf063120mm | 4.50 | 5.02 | 90% | 1 | 2025-11-13 |
| fan | sharkoonmirrorpwm120mm | 11.57 | 13.00 | 89% | 1 | 2026-05-12, 2026-05-13 |
| fan | akasaottosc12120mm | 22.82 | 25.99 | 88% | 3 | - |
| fan | noctuanfa12x15flx120mm | 18.71 | 21.36 | 88% | 3 | 2025-12-16 |
| fan | noctuanfa15140mm | 22.03 | 25.23 | 87% | 5 | 2025-12-16 |
| fan | havitf2095120mm | 6.99 | 8.03 | 87% | 3 | 2025-12-04 |
| fan | noctuanfa9x14hspwmchbks92mm | 16.87 | 19.46 | 87% | 3 | 2025-12-16 |
| fan | corsairicuelinklx120r120mm | 35.89 | 41.48 | 86% | 3 | - |
| fan | alphacoolapexstealthmetalpower120mm | 24.00 | 27.83 | 86% | 35 | - |
| fan | noctuanfa12x25flx120mm | 25.98 | 30.17 | 86% | 4 | 2025-11-14 |
| fan | noctuanfa12x25r120mm | 25.98 | 30.17 | 86% | 4 | 2025-11-14 |
| fan | azzablizzardpro120mm | 11.64 | 13.54 | 86% | 3 | 2026-08-13 |
| fan | noctuanff12industrialppc3000120mm | 24.00 | 28.15 | 85% | 35 | - |
| fan | noctuanfa14140mm | 22.03 | 25.91 | 85% | 5 | 2025-12-16 |
| fan | silverstoneairpenetrator184ipro180mm | 37.05 | 43.60 | 85% | 9 | - |
| fan | noctuanfa14flx140mm | 22.03 | 25.95 | 85% | 5 | 2025-12-16 |
| fan | thermaltakeriingquad12radiatorttpremium120mm | 24.00 | 28.27 | 85% | 35 | - |
| fan | noctuanfa6x2560mm | 12.82 | 15.15 | 85% | 3 | 2025-12-16 |
| fan | noctuanafk1redux120mm | 15.99 | 19.08 | 84% | 3 | - |
| fan | lianliunislinfinity140mm | 24.00 | 28.66 | 84% | 35 | - |
| fan | lianliunislinf140mm | 24.00 | 28.66 | 84% | 35 | - |
| fan | jonsbofr502120mm | 15.90 | 19.06 | 83% | 1 | 2026-08-18 |
| fan | noctuanfp14sredux900140mm | 14.05 | 16.87 | 83% | 2 | 2025-12-16 |
| fan | bequietcoolerpurewings3120mm | 8.83 | 10.60 | 83% | 3 | - |
| fan | thermaltakeriing14140mm3 | 24.00 | 28.91 | 83% | 35 | - |
| fan | noctuanfs12auln120mm | 16.87 | 20.40 | 83% | 3 | 2025-12-16 |
| fan | noctuanfs12aflx120mm | 16.87 | 20.40 | 83% | 3 | 2025-12-16 |
| fan | noctuanfa12x25120mm | 24.00 | 29.10 | 82% | 35 | - |
| fan | fanderfrx29225hx92mm | 5.18 | 6.29 | 82% | 3 | - |
| fan | deepcoolfl123in1120mm3 | 18.35 | 22.37 | 82% | 3 | 2026-08-11 |
| fan | noctuanfa4x10flx40mm | 12.58 | 15.34 | 82% | 2 | 2025-12-16 |
| fan | noctuanfa4x105vflx40mm | 12.58 | 15.34 | 82% | 2 | 2025-12-16 |
| fan | noctuanfs12achromaxswap120mm | 22.03 | 26.86 | 82% | 5 | 2025-12-16 |
| fan | noctuanfa12x15120mm | 18.71 | 23.00 | 81% | 3 | 2025-12-16 |
| fan | noctuanfs12a120mm | 18.71 | 23.00 | 81% | 3 | 2025-12-16 |
| fan | noctuanfa145v140mm | 22.03 | 27.12 | 81% | 5 | 2025-12-16 |
| fan | noctuanfa6x25flx60mm | 12.82 | 15.80 | 81% | 3 | 2025-12-16 |
| fan | bequietsilentwings4pro120mm | 24.00 | 29.93 | 80% | 35 | - |
| fan | ekwbimpulse120120mm | 24.00 | 29.96 | 80% | 35 | - |
| fan | noctuanfa12x15chromaxswap120mm | 20.45 | 25.55 | 80% | 1 | 2026-06-30 |
| fan | fractaldesignaspect14frame140mm3 | 37.05 | 46.31 | 80% | 9 | - |
| fan | sharkoonsharkmirror120mm | 9.99 | 12.50 | 80% | 3 | 2026-03-14, 2026-03-15 |
| fan | noctuanfa12x25ls120mm | 24.00 | 30.17 | 80% | 35 | - |
| fan | noctuanfa15hs140mm | 24.00 | 30.17 | 80% | 35 | - |
| fan | noctuanfa6x15pwm60mm | 12.82 | 16.35 | 78% | 3 | 2025-12-16 |
| fan | bequietsilentwings4pro140mm | 24.00 | 30.80 | 78% | 35 | - |
| fan | modecomvolcanoapex140140mm | 14.90 | 19.29 | 77% | 3 | 2026-08-18 |
| fan | noctuanfa12x25pwmchromaxswap120mm | 24.00 | 31.41 | 76% | 35 | - |
| fan | phanteksphf120d30120mm | 24.00 | 31.53 | 76% | 35 | - |
| fan | noctuanfa205v200mm | 24.00 | 31.82 | 75% | 35 | - |
| fan | thermaltakeriing12radiatorsyncedition120mm3 | 24.00 | 31.88 | 75% | 35 | - |
| fan | raijintekiris14rainbow140mm2 | 24.00 | 31.91 | 75% | 35 | - |
| fan | raijintekageras12argb2120mm2 | 15.50 | 21.50 | 72% | 2 | 2026-08-11 |
| fan | powertechpt907120mm | 5.00 | 7.00 | 71% | 3 | 2026-02-19 |
| fan | aerocool14140mm | 2.83 | 4.05 | 70% | 6 | 2026-08-11 |
| fan | evolveo12rs120mm | 14.90 | 21.52 | 69% | 3 | 2026-08-18 |
| fan | intertechargusrs04120mm3 | 24.00 | 35.50 | 68% | 35 | 2025-02-04 |
| fan | thermaltaketoughfan12highstaticpressureradiator120mm3 | 36.65 | 58.88 | 62% | 1 | 2025-11-19 |
| fan | deepcoolfl12sewh3in1120mm3 | 12.70 | 23.32 | 55% | 1 | 2026-08-11 |
| fan | alpenfoehnwingboost3highspeed120mm3 | 31.90 | 58.59 | 54% | 2 | 2026-08-18 |
| fan | coolermastersickleflowedge120120mm3 | 15.69 | 29.90 | 52% | 3 | 2026-06-30, 2026-07-01, 2026-07-02 |
| cooler | armaggeddonblizzard3 | 25.00 | 25.17 | 99% | 4 | - |
| cooler | lianligaiilite240 | 79.00 | 81.60 | 97% | 3 | 2026-01-20 |
| cooler | akasaakcc7122bp01 | 19.90 | 20.84 | 96% | 3 | - |
| cooler | jonsbocr1000evo | 24.00 | 25.58 | 94% | 12 | - |
| cooler | xilencem504d | 24.00 | 25.70 | 93% | 12 | - |
| cooler | jonsbocr1400evostandard | 18.53 | 19.91 | 93% | 3 | - |
| cooler | idcoolingpinkflow240 | 95.00 | 102.78 | 92% | 3 | - |
| cooler | deepcoolgammaarcher | 6.00 | 6.70 | 90% | 3 | - |
| cooler | silverstoneargonar12 | 24.00 | 28.04 | 86% | 12 | - |
| cooler | silverstonesstxe044677vb | 97.99 | 115.10 | 85% | 2 | 2026-06-26, 2026-06-27 |
| cooler | deepcoolak400digitalse | 22.73 | 26.81 | 85% | 2 | 2025-12-16 |
| cooler | xilencei404t | 15.74 | 18.69 | 84% | 3 | 2025-10-28 |
| cooler | gembirdcpuhuracanargbx130 | 24.00 | 28.90 | 83% | 12 | - |
| cooler | xilencem403pro | 15.74 | 19.07 | 82% | 3 | 2025-10-27, 2025-10-28 |
| cooler | thermaltakeux200se | 24.00 | 29.18 | 82% | 12 | - |
| cooler | akasavegaschromailg | 24.00 | 29.87 | 80% | 12 | - |
| cooler | gamdiasboreasm1610 | 35.00 | 44.61 | 78% | 4 | - |
| cooler | fspnp5 | 22.00 | 29.02 | 76% | 3 | 2026-01-08 |
| cooler | arcticalpine17co | 6.00 | 8.10 | 74% | 3 | 2026-01-08 |
| cooler | bequietsilentloop3420 | 97.99 | 138.64 | 71% | 2 | 2026-06-26, 2026-06-27 |
| cooler | arcticfreezer8aco | 11.00 | 15.76 | 70% | 1 | 2026-01-08 |
| cooler | noctuanfl9i17xx | 35.00 | 50.62 | 69% | 4 | 2026-01-08 |
| cooler | deepcoolag400bk | 21.17 | 30.81 | 69% | 20 | 2025-09-10 |
| cooler | endorfyfera5dualfan | 21.00 | 30.94 | 68% | 3 | 2026-01-08 |
| cooler | endorfynavisf280240 | 50.00 | 73.98 | 68% | 3 | 2026-01-08 |
| cooler | thermalrightpeerlessassassin120se | 25.00 | 38.26 | 65% | 4 | 2026-05-08 |
| cooler | spirexerus200 | 15.74 | 24.17 | 65% | 3 | 2025-11-27, 2025-11-28 |
| cooler | nzxtt120 | 21.00 | 33.37 | 63% | 3 | 2026-01-08 |
| cooler | noctuanhu12dxi4 | 50.00 | 79.77 | 63% | 3 | 2026-01-08 |
| cooler | nzxtkraken240 | 95.00 | 160.27 | 59% | 3 | 2026-01-08 |
| cooler | nzxtkraken240v2 | 79.00 | 139.80 | 56% | 3 | 2026-01-08 |
| cooler | nzxtkrakenplus240v2 | 95.00 | 173.23 | 55% | 3 | 2026-01-08, 2026-01-12 |
| cooler | cougarforza85 | 19.90 | 43.85 | 45% | 3 | 2026-03-13 |
| cooler | intertechk618 | 21.17 | 72.45 | 29% | 20 | 2025-09-10 |
| cooler | valkyriejarn280 | 37.05 | 128.79 | 29% | 10 | 2025-09-10 |

## Ten examples

| Model | Before | After the clean-up |
|---|---|---|
| T400 4GB (gpu) | low 115.43 €; point 115.43 € on 10/09/2025 between 144.79 € days | point removed; reset (one of 6 cards sharing 115.43 €) |
| Core i7-12700T (cpu) | point 369.59 € on 10/09/2025 between 424.50 / 424.00 €; low 327 € | point removed; its low 327 € is not shared, kept |
| Xeon E-2486 (cpu) | low 369.59 €; point on 10/09/2025 between 524.29 / 526.95 € | point removed, reset; re-import with the 20/10 graph: low 505.05 € |
| ASRock Knoll3 (mobo) | low 369.59 € | reset. Its 10/09/2025 point has fallen out of the 365-point window since 20/10, so no point to remove |
| WD Gold 18TB (storage) | low 369.59 €; point 369.59 € on 10/09/2025 (its first day; next day 388.08 €) | point removed, reset |
| Cases at 24 € | Deepcool Cyclops 24 € on 26/09/2026 (43.90 / 24 / 37.80 €, low 24 €); Akyga AK17 BK 24 € on 22/06/2026 (low 18.86 €); Inter-Tech B30 24 € on 23/01/2026 (27.13 / 24 / 27.13 €, low 23.56 €) | all three points removed; Cyclops reset; Akyga and B30 keep their lows (not shared). Inter-Tech IT-2812 Business: 24 € on 23/01/2026 removed, reset |
| 500W Standard ATX (psu) | low 24 €; point 24 € on 23/01/2026 between 45.19 / 42.27 € | point removed, reset |
| 750W Gold SFX (psu) | points 97.99 € on 26 and 27/06/2026 between 103.70 € days; low 81.40 € | both points removed; low kept (81.40 € on 06/08/2026 is a normal point) |
| Adata Legend 710 / 860 / 900 Pro 2TB (storage) | 220.16 € on 30/07/2026 (900 Pro also 31/07) | the 4 points removed; their lows (92.48, 52.31, 103.67 €) are not shared, kept |
| Asus Prime B860M-K (mobo) | low 94.90 € | kept: a 6-day run 24-29/09/2026 (sibling promo) |

## Push guard after the clean-up

`merge_history.py check origin/main` (= `df2d8fa`) on the cleaned copy, without `--allow-shrink`: exit 1.

```
gpu: 1 history points of 1 models would disappear, 0 import markers
cpu: 11 history points of 11 models would disappear, 0 import markers
mobo: 64 history points of 39 models would disappear, 0 import markers
ram: 4 history points of 4 models would disappear, 0 import markers
psu: 5 history points of 3 models would disappear, 0 import markers
case: 165 history points of 109 models would disappear, 0 import markers
fan: 301 history points of 155 models would disappear, 0 import markers
cooler: 99 history points of 74 models would disappear, 0 import markers
storage: 28 history points of 20 models would disappear, 0 import markers
history check FAILED: not pushing (data compared with origin/main); see scraper/merge_history.py
```

(each line is followed by up to 15 model names). With `--allow-shrink`: the same lines, then
`allow_history_shrink: the removals above are deliberate for this run; pushing`, exit 0. In the real run the same
job also imports, so a few removed days can come back at once through re-imports (only when the full graph shows
them as real).

## Concerns

1. **Glitches only one product shows are not caught.** The Core i9-14900KF graph (20/10) has 286 € on 23/01/2026
   between 439.90 € days; no other CPU has that value that day, so neither our rule nor v2's flags it. Re-imported,
   its low goes from 369.59 € to 286 € (measured with the fixture on today's cleaned data). Reset entries can come
   back with another wrong low. A separate rule would be needed (not in this task).
2. **Start of the 365-point window.** A run at a model's first point needs only the next neighbour. 15 of the 678
   points (13 models) are such runs, e.g. Corsair LX 120 R: its last 35.89 € day was the window's first day on 20/10
   while its siblings show 9-17 days. Same as v2. Reset models re-read the full graph, so a real run comes back;
   for models that are not reset, the point simply goes.
3. **Days for the re-imports.** Storage and case finish on day 15 and 14 because of the first-import backlog (as you
   chose). The 24/10 run got 403 in every category; expect weeks rather than days.
4. `merge_history.py restore <old commit>` adds history back by design: restoring from a commit before the clean-up
   would bring the glitch points and the bad lows back.
5. **Two paths can undo a reset without a re-import.** Both prefer a full entry over a date-only one: a model rename
   fold (`scraper/aliases.py` `fold_imported`, run by every scrape) when the old key still holds the full glitch
   entry, and `restore` (`merge_history.py`, merged with an empty base). Either can bring a reset glitch low back.
   Rare: the fold needs a renamed model whose old key still has its entry.
6. **Evidence lows block real short deals at those exact prices** (see the decision section): a real 1-3 day low at
   exactly a stored glitch price (e.g. mobo 150 €, cooler 50 €, case 24 €) is dropped from later imports in that
   category for good, and that model's low comes out too high. The file is never pruned.
7. The numbers move a little every day (new imports flag more points, the window trims old ones). The run's log
   prints the real counts.

## What to OK

1. The new file `public/data/<cat>/import_glitches.json` (schema), including what its stored glitch prices block
   (concern 6).
2. The addition "a low equal to the model's own removed glitch point is reset too" (41 models), or drop it.
3. After review: the push, then one manual `history.yml` run with `clean_glitches` + `allow_history_shrink`.
