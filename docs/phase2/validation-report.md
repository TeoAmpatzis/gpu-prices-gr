# Data validation report

Measured values (lengths, heights, speeds, wattages) that fall outside the plausible range for their field. These are almost always scraping mistakes (for example a case "up to 3.502 mm"), not real measurements. The site runs in enforce mode: each listed value is treated as "not stated" in the site's data files (list.v2.json, builder.json, the compatibility and product page files), so the compatibility checks say "unknown" instead of using it. The scraper's own files are not changed. `psu-watts` is report only (a wattage cannot be "not stated").

Data times (`latest.updatedAt`):

- gpu: 2026-10-25T16:48:42+00:00
- cpu: 2026-10-25T16:50:13+00:00
- mobo: 2026-10-25T16:25:42+00:00
- ram: 2026-10-25T16:58:31+00:00
- storage: 2026-10-25T16:53:11+00:00
- psu: 2026-10-25T17:04:25+00:00
- case: 2026-10-25T16:31:17+00:00
- fan: 2026-10-25T16:38:08+00:00
- cooler: 2026-10-25T16:43:35+00:00

## Summary

| Check | Field | Range | Mode | Values stated | Out of range | Distinct models out of range |
| --- | --- | --- | --- | ---: | ---: | ---: |
| `cooler-height` | cooler.heightMm | 30–200 mm | enforced | 1424 | 0 | 0 |
| `case-gpu-max` | case.gpuMaxMm | 100–700 mm | enforced | 6102 | 0 | 0 |
| `case-cooler-max` | case.coolerMaxMm | 25–300 mm | enforced | 5457 | 0 | 0 |
| `gpu-length` | gpu.lengthMm | 100–400 mm | enforced | 1129 | 0 | 0 |
| `gpu-minpsu-plausible` | gpu.minPsu | at least the chip board power + 100 W (chips with a board power in the GPU power table) | enforced | 787 | 8 | 5 |
| `psu-watts` | psu.watts | 150–3,000 W | report only | 3945 | 0 | 0 |
| `ram-ddr4-speed` | ram.speed | 1,600–5,333 MHz | enforced | 2722 | 0 | 0 |
| `ram-ddr5-speed` | ram.speed | 4,000–10,000 MHz | enforced | 2910 | 0 | 0 |
| `ram-cas` | ram.cas | 5–60 CL | enforced | 2099 | 0 | 0 |
| `cpu-tdp` | cpu.tdp | 10–500 W | enforced | 724 | 0 | 0 |
| `mobo-max-memory` | mobo.maxMemoryGB | 4–16,384 GB | enforced | 2418 | 0 | 0 |

## `gpu-minpsu-plausible`: gpu.minPsu needs at least the chip board power + 100 W (chips with a board power in the GPU power table)

8 value(s), 5 model(s). Showing 8.

| Model | Value | Title | Listing id |
| --- | ---: | --- | --- |
| Arc B570 | 170 W | Sparkle Arc B570 10GB GDDR6 Luna Guardian OC | `bestprice:2160489604` |
| Arc B570 | 170 W | Sparkle ARC B570 10GB GDDR6 GUARDIAN LUNA OC | `shopflix:SF-105747737` |
| Arc B570 | 170 W | Sparkle Arc B570 10GB GUARDIAN LUNA OC | `skroutz:59312128` |
| RTX 5050 | 130 W | PNY GeForce RTX 5050 8GB Dual | `skroutz:63278778` |
| RTX 5060 | 145 W | MSI GeForce RTX 5060 8GB Shadow 2x OC Max | `skroutz:66091976` |
| RTX 5070 Ti | 300 W | PNY GeForce RTX 5070 Ti 16GB | `skroutz:60811441` |
| RX 9070 | 245 W | Acer Radeon RX 9070 16GB GDDR6 Predator BiFrost | `shopflix:SF-106359451` |
| RX 9070 | 245 W | Acer Radeon RX 9070 16GB Predator BiFrost | `skroutz:60261433` |

## Builder rows changed

builder.json built from the scraper's raw data and again from the checked data, rows matched by listing id (a row is one model; its value is the one the builder uses for that model). Rows whose value differs:

| Check | Builder rows changed | Rows in the slot |
| --- | ---: | ---: |
| `cooler-height` | 0 | 2069 |
| `case-gpu-max` | 0 | 2629 |
| `case-cooler-max` | 0 | 2629 |
| `gpu-length` | 0 | 1380 |
| `gpu-minpsu-plausible` | 8 | 1380 |
| `psu-watts` | 0 | 135 |
| `ram-ddr4-speed` | 0 | 210 |
| `ram-ddr5-speed` | 0 | 210 |
| `ram-cas` | 0 | 210 |
| `cpu-tdp` | 0 | 346 |
| `mobo-max-memory` | 0 | 1011 |

Rows only in one of the two builds: 0.

### `gpu-minpsu-plausible`: gpu.minPsu

Showing 8 of 8.

| Model | Before | After | Listing id |
| --- | ---: | ---: | --- |
| Arc B570 | 170 | not stated | `bestprice:2160489604` |
| Arc B570 | 170 | not stated | `shopflix:SF-105747737` |
| Arc B570 | 170 | not stated | `skroutz:59312128` |
| RTX 5050 | 130 | not stated | `skroutz:63278778` |
| RTX 5060 | 145 | not stated | `skroutz:66091976` |
| RTX 5070 Ti | 300 | not stated | `skroutz:60811441` |
| RX 9070 | 245 | not stated | `shopflix:SF-106359451` |
| RX 9070 | 245 | not stated | `skroutz:60261433` |

## Conflicts

Second pass after the ranges (`src/data/validate/conflicts.ts`), on whole models. **G1** two product pages of a model state the same measurement and differ by more than the tolerance (case card length > 50 mm, case cooler clearance > 20 mm, cooler height > 20 mm): unknown. **G2** a value outside its size class (card length under 230 mm in a Midi/Full Tower, ATX/E-ATX board in an SFF / Cube, E-ATX in a Mini Tower) that two agreeing pages do not confirm: unknown. **G3** a model's listings disagree on the board size (case `maxBoard`, board `formFactor`): unknown, except a board whose name says ITX (not mATX): Mini ITX. **G4** a shop title names a socket (AM4, AM5, 1200, 1700, 1851) that the cooler's `sockets` lacks: `socketsTitle`. Mode: enforced.

| Check | Field | Models affected | Models stating the value | Share |
| --- | --- | ---: | ---: | ---: |
| G1 | case.gpuMaxMm | 32 | 2022 | 1.6% |
| G1 | case.coolerMaxMm | 0 | 1628 | 0.0% |
| G1 | cooler.heightMm | 0 | 553 | 0.0% |
| G2 | case.gpuMaxMm | 6 | 2022 | 0.3% |
| G2 | case.maxBoard | 19 | 2347 | 0.8% |
| G3 | case.maxBoard | 102 | 2347 | 4.3% |
| G3 | mobo.formFactor | 40 | 1170 | 3.4% |
| G4 | cooler.socketsTitle | 59 | 1490 | 4.0% |

Boards: 2 corrected to Mini ITX by their name, 38 unknown.
Cooler sockets named by a title but missing from the spec: AM4 29, AM5 18, LGA1200 25, LGA1700 13, LGA1851 3.

258 conflict(s) in all. Every one:

| Check | Category | Field | Model | Values | Action |
| --- | --- | --- | --- | --- | --- |
| G1 | case | gpuMaxMm | adatainvaderx | 330 / 400 | unknown |
| G1 | case | gpuMaxMm | antecvsk3000bu3 | 318 / 375 | unknown |
| G1 | case | gpuMaxMm | apnxv2f | 390 / 445 | unknown |
| G1 | case | gpuMaxMm | aqirysxo1 | 410 / 470 | unknown |
| G1 | case | gpuMaxMm | bequietdarkbasepro901 | 370 / 495 | unknown |
| G1 | case | gpuMaxMm | chieftecho12b350gpb | 280 / 340 | unknown |
| G1 | case | gpuMaxMm | chieftecho12bop | 280 / 340 | unknown |
| G1 | case | gpuMaxMm | chieftechq01bop | 250 / 340 | unknown |
| G1 | case | gpuMaxMm | chieftechunter | 320 / 425 | unknown |
| G1 | case | gpuMaxMm | coolermasterelite600 | 240 / 425 | unknown |
| G1 | case | gpuMaxMm | corsair3200drs | 180 / 400 | unknown |
| G1 | case | gpuMaxMm | corsair9000dairflow | 400 / 580 | unknown |
| G1 | case | gpuMaxMm | darkflashft350 | 330 / 400 | unknown |
| G1 | case | gpuMaxMm | darkflashk430 | 410 / 490 | unknown |
| G1 | case | gpuMaxMm | deepcoolch270digital | 320 / 413 | unknown |
| G1 | case | gpuMaxMm | fractaldesignmeshify2 | 315 / 450 | unknown |
| G1 | case | gpuMaxMm | fractaldesignmeshify2light | 250 / 491 | unknown |
| G1 | case | gpuMaxMm | gamdiasauragc1elite | 260 / 340 | unknown |
| G1 | case | gpuMaxMm | jonsbon4 | 125 / 230 | unknown |
| G1 | case | gpuMaxMm | marsgamingmcvortex | 152 / 273 | unknown |
| G1 | case | gpuMaxMm | nzxth9flow | 200 / 459 | unknown |
| G1 | case | gpuMaxMm | phanteksenthoopro | 347 / 472 | unknown |
| G1 | case | gpuMaxMm | phanteksxtview | 415 / 500 | unknown |
| G1 | case | gpuMaxMm | silverstonefara311 | 161 / 354 | unknown |
| G1 | case | gpuMaxMm | silverstonesetad1 | 275 / 394 | unknown |
| G1 | case | gpuMaxMm | thermaltakeax500 | 185 / 460 | unknown |
| G1 | case | gpuMaxMm | thermaltakectec700 | 327 / 410 | unknown |
| G1 | case | gpuMaxMm | thermaltakectec700air | 327 / 410 | unknown |
| G1 | case | gpuMaxMm | thermaltakethetower200 | 280 / 380 | unknown |
| G1 | case | gpuMaxMm | thermaltakethetower300 | 280 / 400 | unknown |
| G1 | case | gpuMaxMm | thermaltakethetower600 | 280 / 400 | unknown |
| G1 | case | gpuMaxMm | thermaltakeview300mx | 280 / 400 | unknown |
| G2 | case | gpuMaxMm | alcatrozfuturapro6000 | 120 | unknown |
| G2 | case | gpuMaxMm | gamemaxnexc56vcwh | 120 | unknown |
| G2 | case | gpuMaxMm | intertechit503 | 195 | unknown |
| G2 | case | gpuMaxMm | kolinkobservatoryhfmeshcore | 180 | unknown |
| G2 | case | gpuMaxMm | logicdartprousbc | 200 | unknown |
| G2 | case | gpuMaxMm | powertechpt770 | 220 | unknown |
| G2 | case | maxBoard | chieftecvisioaircube | ATX in SFF / Cube | unknown |
| G2 | case | maxBoard | chieftecvisioairgm30bmopcube | ATX in SFF / Cube | unknown |
| G2 | case | maxBoard | chieftecvisioairmeshcube | ATX in SFF / Cube | unknown |
| G2 | case | maxBoard | chieftecvisiocube | ATX in SFF / Cube | unknown |
| G2 | case | maxBoard | chieftecvisiogm30btgopcube | ATX in SFF / Cube | unknown |
| G2 | case | maxBoard | chieftecvisiogm30wtgopcube | ATX in SFF / Cube | unknown |
| G2 | case | maxBoard | lianlio11dynamicminis | E-ATX in Mini Tower | unknown |
| G2 | case | maxBoard | progamingbansheecube | ATX in SFF / Cube | unknown |
| G2 | case | maxBoard | progamingelitecube | ATX in SFF / Cube | unknown |
| G2 | case | maxBoard | silverstonecrown04hometheater | E-ATX in SFF / Cube | unknown |
| G2 | case | maxBoard | silverstonerm51hometheater | E-ATX in SFF / Cube | unknown |
| G2 | case | maxBoard | silverstonesstflp01whometheater | ATX in SFF / Cube | unknown |
| G2 | case | maxBoard | silverstonesugosg13bqcube | ATX in SFF / Cube | unknown |
| G2 | case | maxBoard | xigmatekclouddgt | E-ATX in SFF / Cube | unknown |
| G2 | case | maxBoard | xigmatekcrystalstormv2 | E-ATX in SFF / Cube | unknown |
| G2 | case | maxBoard | xigmatekheaven | E-ATX in SFF / Cube | unknown |
| G2 | case | maxBoard | xigmatekheavenair | E-ATX in SFF / Cube | unknown |
| G2 | case | maxBoard | xigmatekmoondgt | E-ATX in SFF / Cube | unknown |
| G2 | case | maxBoard | zenpccube | ATX in SFF / Cube | unknown |
| G3 | case | maxBoard | 1stplayerwd8 | ATX / E-ATX | unknown |
| G3 | case | maxBoard | adataxpgbattlecruiser | ATX / E-ATX | unknown |
| G3 | case | maxBoard | adataxpgvalorairpro | ATX / E-ATX | unknown |
| G3 | case | maxBoard | aerocoolcs107v2 | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | alphageartrickster | ATX / E-ATX | unknown |
| G3 | case | maxBoard | antecc8 | ATX / E-ATX | unknown |
| G3 | case | maxBoard | aqirysavior | ATX / E-ATX | unknown |
| G3 | case | maxBoard | aqiryswezen | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | armaggeddonnimitztr1100 | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | armaggeddontessaraxxcore1 | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | armaggeddontessaraxxcore12air | ATX / E-ATX | unknown |
| G3 | case | maxBoard | asusprimeap202 | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | azzacelesta340f | ATX / E-ATX | unknown |
| G3 | case | maxBoard | azzareaver | ATX / E-ATX | unknown |
| G3 | case | maxBoard | chieftecbu12b300 | ATX / Mini ITX | unknown |
| G3 | case | maxBoard | chieftecci02bopcube | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | chieftechunter | ATX / E-ATX | unknown |
| G3 | case | maxBoard | chieftechunter3 | ATX / E-ATX | unknown |
| G3 | case | maxBoard | chiefteclg01bop | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | chieftecscorpioniii | ATX / E-ATX | unknown |
| G3 | case | maxBoard | coolermastercosmosalpha | ATX / E-ATX | unknown |
| G3 | case | maxBoard | coolermasterelite302 | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | coolermasterelite502 | ATX / E-ATX | unknown |
| G3 | case | maxBoard | coolermastermasterbox600lite | ATX / E-ATX | unknown |
| G3 | case | maxBoard | coolermastermasterframe400mesh | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | coolermastermasterframe500mesh | ATX / E-ATX | unknown |
| G3 | case | maxBoard | coolermastermasterframe600 | ATX / E-ATX | unknown |
| G3 | case | maxBoard | coolermastermasterframe600mesh | ATX / E-ATX | unknown |
| G3 | case | maxBoard | corsair5000d | ATX / E-ATX | unknown |
| G3 | case | maxBoard | corsair5000dairflow | ATX / E-ATX | unknown |
| G3 | case | maxBoard | corsair7000dairflow | ATX / E-ATX | unknown |
| G3 | case | maxBoard | corsairframe4000drsmodular | ATX / E-ATX | unknown |
| G3 | case | maxBoard | corsairicue5000t | ATX / E-ATX | unknown |
| G3 | case | maxBoard | corsairicue7000x | ATX / E-ATX | unknown |
| G3 | case | maxBoard | cougarairfaceeco | ATX / E-ATX | unknown |
| G3 | case | maxBoard | darkflashairnova | ATX / E-ATX | unknown |
| G3 | case | maxBoard | darkflashc275p | Micro ATX / Mini ITX | unknown |
| G3 | case | maxBoard | darkflashdb460m | Micro ATX / Mini ITX | unknown |
| G3 | case | maxBoard | darkflashdk352plus | ATX / E-ATX | unknown |
| G3 | case | maxBoard | darkflashfloatronf1 | Micro ATX / Mini ITX | unknown |
| G3 | case | maxBoard | darkflashm305 | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | darkflashm305mesh | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | darkflashth285m | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | deepcoolch270digital | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | deepcoolmatrexx403fs | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | endorfyaquarius8000corona | ATX / E-ATX | unknown |
| G3 | case | maxBoard | fractaldesigndefine7 | ATX / E-ATX | unknown |
| G3 | case | maxBoard | fractaldesignepochxl | ATX / E-ATX | unknown |
| G3 | case | maxBoard | fractaldesignmeshify2compact | ATX / E-ATX | unknown |
| G3 | case | maxBoard | fractaldesignnorthxlrc | ATX / E-ATX | unknown |
| G3 | case | maxBoard | fractaldesignpop2vision | ATX / E-ATX | unknown |
| G3 | case | maxBoard | fractaldesignpopair | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | fsps140 | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | gamemaxinfinity | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | gamemaxinfinitymini | Micro ATX / Mini ITX | unknown |
| G3 | case | maxBoard | gembirdfornaxk300 | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | genesisirid505 | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | gigabyteaorusc400glass | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | gigabytec102glass | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | havnbf360 | ATX / E-ATX | unknown |
| G3 | case | maxBoard | havnbf360flow | ATX / E-ATX | unknown |
| G3 | case | maxBoard | iboxpassionv4 | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | inwin | Micro ATX / Mini ITX | unknown |
| G3 | case | maxBoard | jonsbod41screen | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | jonsplusz20 | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | lianlilancool217 | ATX / E-ATX | unknown |
| G3 | case | maxBoard | lianlilancool217inf | ATX / E-ATX | unknown |
| G3 | case | maxBoard | lianlio11visioncompact | ATX / E-ATX | unknown |
| G3 | case | maxBoard | lianlivectorv100 | ATX / E-ATX | unknown |
| G3 | case | maxBoard | logicaramis | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | logicportos | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | marsgamingmcse2 | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | miditower | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | minitower | ATX / Micro ATX / Mini ITX | unknown |
| G3 | case | maxBoard | modecomvolcanoperunapex | ATX / E-ATX | unknown |
| G3 | case | maxBoard | modecomvolcanospacexl | ATX / E-ATX | unknown |
| G3 | case | maxBoard | montechskytwogx | ATX / E-ATX | unknown |
| G3 | case | maxBoard | montechx5 | ATX / E-ATX | unknown |
| G3 | case | maxBoard | msimpgvelox100r | ATX / E-ATX | unknown |
| G3 | case | maxBoard | msiproshieldm100p | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | nzxth5flow | ATX / E-ATX | unknown |
| G3 | case | maxBoard | nzxth9flow | ATX / E-ATX | unknown |
| G3 | case | maxBoard | phanteksenthoopro | ATX / E-ATX | unknown |
| G3 | case | maxBoard | phanteksxtsilent | ATX / E-ATX | unknown |
| G3 | case | maxBoard | powertechpt1098 | Micro ATX / Mini ITX | unknown |
| G3 | case | maxBoard | preyonnestmeshy | ATX / E-ATX | unknown |
| G3 | case | maxBoard | raijintekmetisevotgs | Micro ATX / Mini ITX | unknown |
| G3 | case | maxBoard | rampagehydrav1 | ATX / E-ATX | unknown |
| G3 | case | maxBoard | saviosigmax1 | ATX / E-ATX | unknown |
| G3 | case | maxBoard | sharkoonak6 | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | sharkoonpuresteel | ATX / E-ATX | unknown |
| G3 | case | maxBoard | sharkoons25w2 | ATX / E-ATX | unknown |
| G3 | case | maxBoard | sharkoonvk2 | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | silverstonesetah2 | ATX / E-ATX | unknown |
| G3 | case | maxBoard | thermaltakectee550 | ATX / E-ATX | unknown |
| G3 | case | maxBoard | thermaltakedivider170 | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | thermaltakes100 | ATX / Micro ATX | unknown |
| G3 | case | maxBoard | thermaltakes370ws | ATX / E-ATX | unknown |
| G3 | case | maxBoard | thermaltakethetower300 | ATX / Micro ATX / Mini ITX | unknown |
| G3 | case | maxBoard | thermaltaketr100 | ATX / Mini ITX | unknown |
| G3 | case | maxBoard | xigmatekaqua7 | ATX / E-ATX | unknown |
| G3 | case | maxBoard | zenpcz3 | ATX / E-ATX | unknown |
| G3 | mobo | formFactor | asrocka520mitxac | Micro ATX / Mini ITX | corrected |
| G3 | mobo | formFactor | asrocka620amproawifi | ATX / Micro ATX | unknown |
| G3 | mobo | formFactor | asrocka620amprorswifi | ATX / Micro ATX | unknown |
| G3 | mobo | formFactor | asrocka620amx | ATX / Micro ATX | unknown |
| G3 | mobo | formFactor | asrocka620amxwifi | ATX / Micro ATX | unknown |
| G3 | mobo | formFactor | asrockb550mitxac | Micro ATX / Mini ITX | corrected |
| G3 | mobo | formFactor | asrockb550mphantomgaming4 | ATX / Micro ATX | unknown |
| G3 | mobo | formFactor | asrockb650d4u | ATX / Micro ATX | unknown |
| G3 | mobo | formFactor | asrockb850proa | ATX / Micro ATX | unknown |
| G3 | mobo | formFactor | asrockb850proawifi | ATX / Micro ATX | unknown |
| G3 | mobo | formFactor | asrockb860lightningwifi | ATX / Micro ATX | unknown |
| G3 | mobo | formFactor | asrockw790wsr20 | ATX / E-ATX | unknown |
| G3 | mobo | formFactor | asrockx870etaichi | ATX / E-ATX | unknown |
| G3 | mobo | formFactor | asrockx870etaichilite | ATX / E-ATX | unknown |
| G3 | mobo | formFactor | asusprimea620amk | ATX / Micro ATX | unknown |
| G3 | mobo | formFactor | asusprimeh610ma | ATX / Micro ATX | unknown |
| G3 | mobo | formFactor | asusprowsb850macese | ATX / Micro ATX | unknown |
| G3 | mobo | formFactor | asusrogcrosshairx870eextreme | ATX / E-ATX | unknown |
| G3 | mobo | formFactor | asusrogmaximusz890extreme | ATX / E-ATX | unknown |
| G3 | mobo | formFactor | asusrogstrixb650eigamingwifi | ATX / Mini ITX | unknown |
| G3 | mobo | formFactor | asusrogstrixb760ggamingwifi | ATX / Micro ATX | unknown |
| G3 | mobo | formFactor | asusrogstrixb760igamingwifi | ATX / Mini ITX | unknown |
| G3 | mobo | formFactor | asusrogstrixb850igamingwifi | ATX / Mini ITX | unknown |
| G3 | mobo | formFactor | asusrogstrixb860ggamingwifi | ATX / Micro ATX | unknown |
| G3 | mobo | formFactor | asusrogstrixb860igamingwifi | ATX / Mini ITX | unknown |
| G3 | mobo | formFactor | asusrogstrixx870igamingwifi | ATX / Mini ITX | unknown |
| G3 | mobo | formFactor | asustufgamingb760mplus | ATX / Micro ATX | unknown |
| G3 | mobo | formFactor | asustufgamingb850pluswifi7w | ATX / Micro ATX | unknown |
| G3 | mobo | formFactor | asustufgamingz890pluswifi | ATX / Micro ATX | unknown |
| G3 | mobo | formFactor | asusz11pad8 | ATX / E-ATX | unknown |
| G3 | mobo | formFactor | biostara68n2100k | ATX / Mini ITX | unknown |
| G3 | mobo | formFactor | biostarh610mhc20 | ATX / Micro ATX | unknown |
| G3 | mobo | formFactor | gigabyteaorusproicex870wifi | ATX / Mini ITX | unknown |
| G3 | mobo | formFactor | gigabyteb850eaglewifi6eice | ATX / Micro ATX | unknown |
| G3 | mobo | formFactor | gigabyteh610mhv3d4 | ATX / Micro ATX | unknown |
| G3 | mobo | formFactor | gigabyteh610mkv2 | ATX / Micro ATX | unknown |
| G3 | mobo | formFactor | gigabyteh610ms2hv3d4 | ATX / Micro ATX | unknown |
| G3 | mobo | formFactor | gigabytez890aorustachyonice | ATX / E-ATX | unknown |
| G3 | mobo | formFactor | msiproa620ambevo | ATX / Micro ATX | unknown |
| G3 | mobo | formFactor | sapphirepulsea620am | ATX / Micro ATX | unknown |
| G4 | cooler | socketsTitle | adataxpglevanteii240 | title says AM4,AM5 | title-socket |
| G4 | cooler | socketsTitle | alphacooleisbaer360 | title says AM4 | title-socket |
| G4 | cooler | socketsTitle | alseyeh120z | title says AM4 | title-socket |
| G4 | cooler | socketsTitle | aqiryshydra240 | title says LGA1200 | title-socket |
| G4 | cooler | socketsTitle | arcticliquidfreezerii240 | title says LGA1200 | title-socket |
| G4 | cooler | socketsTitle | arcticliquidfreezerii280 | title says LGA1200 | title-socket |
| G4 | cooler | socketsTitle | coolermasterhyper212 | title says LGA1200 | title-socket |
| G4 | cooler | socketsTitle | coolermastermasterliquid360coreii | title says AM4,AM5 | title-socket |
| G4 | cooler | socketsTitle | coolermastermasterliquidcorenex360 | title says AM4,AM5 | title-socket |
| G4 | cooler | socketsTitle | cougarhelor360 | title says LGA1200 | title-socket |
| G4 | cooler | socketsTitle | cougarposeidonelite360 | title says LGA1200,LGA1700,LGA1851 | title-socket |
| G4 | cooler | socketsTitle | darkflashdv240s | title says AM4 | title-socket |
| G4 | cooler | socketsTitle | darkflashdv360s | title says AM4 | title-socket |
| G4 | cooler | socketsTitle | darkflashexplorede360 | title says LGA1200 | title-socket |
| G4 | cooler | socketsTitle | deepcoolak500 | title says AM4 | title-socket |
| G4 | cooler | socketsTitle | deepcoollp360 | title says LGA1200 | title-socket |
| G4 | cooler | socketsTitle | gamdiasauragldigital360 | title says AM4,AM5 | title-socket |
| G4 | cooler | socketsTitle | gamdiasborease1410 | title says LGA1200 | title-socket |
| G4 | cooler | socketsTitle | gamdiaschionep3240u | title says AM4,AM5 | title-socket |
| G4 | cooler | socketsTitle | gigabyteaoruswaterforce280 | title says LGA1700 | title-socket |
| G4 | cooler | socketsTitle | gigabyteaoruswaterforce360 | title says LGA1700 | title-socket |
| G4 | cooler | socketsTitle | gigabyteaoruswaterforcex240 | title says LGA1700 | title-socket |
| G4 | cooler | socketsTitle | gigabyteaoruswaterforcex280 | title says LGA1700 | title-socket |
| G4 | cooler | socketsTitle | jonsbocr3000 | title says LGA1200 | title-socket |
| G4 | cooler | socketsTitle | kolinkumbravoid360 | title says AM4,AM5 | title-socket |
| G4 | cooler | socketsTitle | kruxhydroarc360 | title says AM5 | title-socket |
| G4 | cooler | socketsTitle | kruxhydroglance240 | title says AM4,AM5 | title-socket |
| G4 | cooler | socketsTitle | modecomvolcano0ct202lcd | title says LGA1200 | title-socket |
| G4 | cooler | socketsTitle | montechhyperflowdigital240 | title says AM4,AM5,LGA1700,LGA1851 | title-socket |
| G4 | cooler | socketsTitle | montechhyperflowdigital360 | title says LGA1200 | title-socket |
| G4 | cooler | socketsTitle | noctuanhd15s | title says LGA1700 | title-socket |
| G4 | cooler | socketsTitle | noctuanhd9l | title says AM4,LGA1200 | title-socket |
| G4 | cooler | socketsTitle | noctuanhl9i | title says AM5,LGA1200 | title-socket |
| G4 | cooler | socketsTitle | noctuanhl9x65 | title says AM4 | title-socket |
| G4 | cooler | socketsTitle | noctuanhu12a | title says LGA1200 | title-socket |
| G4 | cooler | socketsTitle | noctuanhu12s | title says AM4,LGA1200 | title-socket |
| G4 | cooler | socketsTitle | noctuanhu9s | title says AM4,LGA1200 | title-socket |
| G4 | cooler | socketsTitle | nzxtkrakenelite360v2 | title says AM4,AM5 | title-socket |
| G4 | cooler | socketsTitle | nzxtkrakenplus360v2 | title says AM4,AM5 | title-socket |
| G4 | cooler | socketsTitle | rampageinfinitev120 | title says LGA1700 | title-socket |
| G4 | cooler | socketsTitle | rampageinfinitev240 | title says AM4 | title-socket |
| G4 | cooler | socketsTitle | scytheshuriken3 | title says AM4,AM5,LGA1200,LGA1700 | title-socket |
| G4 | cooler | socketsTitle | silverstonexe360sp5 | title says AM5 | title-socket |
| G4 | cooler | socketsTitle | thermalrightaquaelite360v3 | title says AM4,AM5 | title-socket |
| G4 | cooler | socketsTitle | thermalrightassassinx120refinedse | title says AM4 | title-socket |
| G4 | cooler | socketsTitle | thermalrightburstassassin120 | title says LGA1200 | title-socket |
| G4 | cooler | socketsTitle | thermalrightfrozenhorizon360v2 | title says AM4,AM5 | title-socket |
| G4 | cooler | socketsTitle | thermalrightpeerlessassassin120digital | title says AM4,LGA1200 | title-socket |
| G4 | cooler | socketsTitle | thermalrightturboright240c | title says LGA1200 | title-socket |
| G4 | cooler | socketsTitle | thermalrightwondervision360ub | title says LGA1200 | title-socket |
| G4 | cooler | socketsTitle | thermaltakest360ultra | title says AM4,AM5,LGA1200,LGA1700,LGA1851 | title-socket |
| G4 | cooler | socketsTitle | thermaltaketh360v2ultrasync | title says AM4 | title-socket |
| G4 | cooler | socketsTitle | thermaltaketoughliquid360 | title says LGA1700 | title-socket |
| G4 | cooler | socketsTitle | thermaltaketoughliquidultra240sync | title says LGA1700 | title-socket |
| G4 | cooler | socketsTitle | thermaltakewater30240sync | title says AM4 | title-socket |
| G4 | cooler | socketsTitle | tryxpanorama360 | title says AM4,AM5 | title-socket |
| G4 | cooler | socketsTitle | xigmatekconnectpro360arctic | title says LGA1200 | title-socket |
| G4 | cooler | socketsTitle | xilenceliqurizerlq360pro | title says LGA1700 | title-socket |
| G4 | cooler | socketsTitle | xilencem403pro | title says LGA1200 | title-socket |
