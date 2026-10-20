# Q4: plausible ranges before SAFER

Not pushed yet. Branch `a3-queue`, base `09cdb17`, uncommitted changes on top of 7f81be9. Waiting for review and the owner's OK.

## What changed

- `scraper/ranges.py` (new): the table of 7 v2 ids (cooler-height 30-200, case-gpu-max 100-700, case-cooler-max 25-300, gpu-length 100-400, cpu-tdp 10-500, mobo-max-memory 4-16384, ram-cas 5-60; inclusive). `clean` sets an out-of-range value to unknown and logs `[<cat>] range: <field> <value> from <site/maker> dropped (<v2 id>)`.
- `case-cooler-max` was 25-250; the owner raised it to 300 on 20/10 because real clearances of big towers are 260-275 mm. Changed in both tables (`scraper/ranges.py` and v2 `src/data/validate/ranges.ts`; the test keeps them equal).
- `scraper/main.py`: `finish` cleans right after `specs.apply`, before the makers and before sharing, and prints one summary line per category with the dropped count per field (shop and maker values together).
- `scraper/makers/__init__.py`: each maker value is checked before it is filled or joined through SAFER, and counted in the summary.
- `scripts/checks/test_ranges.py` (new): 54 checks, including equality with v2's `ranges.ts` and the 260/265/275/300 kept, 301 dropped boundary.
- `overrides.json` still runs last and is never checked.

## Offline before/after

Method: main `09cdb17` data (read only, no network), `main.finish` run old (checks off) and new on the same input. Scripts in `.superpowers/sdd/2026-10-19-q4-ranges-before-safer/work/`.

| Category | field | skroutz | bestprice | shopflix | eshop | listings | models |
|---|---|---|---|---|---|---|---|
| cooler | heightMm | 54 | 37 | 47 | 1 | 139 | 58 |
| case | gpuMaxMm | 0 | 1 | 0 | 0 | 1 | 1 |
| mobo | maxMemoryGB | 2 | 1 | 2 | 0 | 5 | 1 |
| case | coolerMaxMm | 0 | 0 | 0 | 0 | 0 | 0 |
| gpu, cpu, ram | lengthMm, tdp, cas | 0 | 0 | 0 | 0 | 0 | 0 |

These 145 are listings in the saved data, where the old sharing had copied each bad value to every listing of its model. Maker values out of range: 0. Every changed listing becomes unknown. Model and listing counts are equal before and after in every category; history files are not touched.

Examples (old to new): Spire U20M gpuMaxMm 3.502 to unknown (350 when a Skroutz listing exists; tested); Aerocool AEROPGSRAVE3-FRGB-4P heightMm 25 to unknown; Akasa AK-CC6601EP01 26.92 to unknown; Supermicro H13SSL-N maxMemoryGB 3 to unknown (an old "3.072GB" misread, already fixed in the scraper).

## What the next live scrape should show

A live run starts from fresh listings, so a bad value comes only from the specs cache or a maker, not from old sharing. Simulated (fresh listings, `finish` run twice as a scrape does):

- 60 listings hold a bad cached value per pass: 58 cooler heightMm, 1 case gpuMaxMm, 1 mobo maxMemoryGB.
- `finish` runs twice per scrape (after the lists, then again after the product pages), so each is logged twice: **120 lines** matching `range: .* dropped (`, plus 6 summary lines (`range: values dropped as implausible: {...}`): cooler, case and mobo, twice each.
- GPU, CPU and RAM: 0 lines.
- The first scrape after the push can show a few more, if a source fails and its kept listings carry last run's shared copies.

## Effect on the live v1 builder

builder.json rows are identical for every slot except 1 case row (Spire U20M). Coverage notice unchanged (gpu 81, case 76, cooler 71).

| field | visible change |
|---|---|
| cooler heightMm | none: v1 already treats under 30 mm as unknown |
| gpu lengthMm, cpu tdp, ram cas, mobo maxMemoryGB | none (no value dropped, or not shown in v1) |
| case gpuMaxMm | Spire U20M: its 1,118 cards with a known length were all "no"; now all 1,386 cards show "Fit not verified" |
| case coolerMaxMm | none: the three big towers (GameMax Siege 265, Thermaltake The Tower 500 275, The Tower 900 260) keep their clearance with the 300 limit |

## For the owner

- Impossible values (a case "up to 3.502 mm", a cooler "height" of 25 mm) are thrown away before the sites are compared, so the right value from the other site wins.
- You raised the case cooler clearance limit to 300 mm on 20/10; no real tower value is lost now.
- Watch number for the next scrape: 120 `range: ... dropped (` lines (60 values, each twice, because the scrape finishes its data twice) and 6 summary lines; 0 for graphics cards, CPUs and RAM. A big jump means a parser started producing bad values.
- Nothing else changes: counts equal, history untouched.
