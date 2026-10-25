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
