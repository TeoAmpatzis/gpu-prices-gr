# Data validation report

Measured values (lengths, heights, speeds, wattages) that fall outside the plausible range for their field. These are almost always scraping mistakes (for example a case "up to 3.502 mm"), not real measurements. The site runs in enforce mode: each listed value is treated as "not stated" in the site's data files (list.json, builder.json), so the compatibility checks say "unknown" instead of using it. The scraper's own files are not changed. `psu-watts` is report only (a wattage cannot be "not stated").

Data times (`latest.updatedAt`):

- gpu: 2026-10-10T05:45:12+00:00
- cpu: 2026-10-10T05:47:59+00:00
- mobo: 2026-10-10T05:51:17+00:00
- ram: 2026-10-10T05:55:54+00:00
- storage: 2026-10-10T06:18:31+00:00
- psu: 2026-10-10T06:02:13+00:00
- case: 2026-10-10T05:38:10+00:00
- fan: 2026-10-10T06:06:19+00:00
- cooler: 2026-10-10T06:13:22+00:00

## Summary

| Check | Field | Range | Mode | Values stated | Out of range | Distinct models out of range |
| --- | --- | --- | --- | ---: | ---: | ---: |
| `cooler-height` | cooler.heightMm | 30–200 mm | enforced | 1557 | 138 | 66 |
| `case-gpu-max` | case.gpuMaxMm | 100–700 mm | enforced | 5259 | 1 | 1 |
| `case-cooler-max` | case.coolerMaxMm | 25–250 mm | enforced | 4614 | 0 | 0 |
| `gpu-length` | gpu.lengthMm | 100–400 mm | enforced | 1233 | 0 | 0 |
| `gpu-minpsu-plausible` | gpu.minPsu | at least the chip board power + 100 W (chips with a board power in the GPU power table) | enforced | 922 | 12 | 5 |
| `psu-watts` | psu.watts | 150–3,000 W | report only | 3947 | 0 | 0 |
| `ram-ddr4-speed` | ram.speed | 1,600–5,333 MHz | enforced | 2235 | 1 | 1 |
| `ram-ddr5-speed` | ram.speed | 4,000–10,000 MHz | enforced | 2368 | 9 | 5 |
| `ram-cas` | ram.cas | 5–60 CL | enforced | 2116 | 0 | 0 |
| `cpu-tdp` | cpu.tdp | 10–500 W | enforced | 745 | 0 | 0 |
| `mobo-max-memory` | mobo.maxMemoryGB | 4–16,384 GB | enforced | 0 | 0 | 0 |

## `cooler-height`: cooler.heightMm outside 30–200 mm

138 value(s), 66 model(s). Showing 10.

| Model | Value | Title | Listing id |
| --- | ---: | --- | --- |
| Aerocool AEROPGSRAVE3-FRGB-4P | 25 mm | Aerocool AEROPGSRAVE3-FRGB-4P για Socket AM4 / 115x / 1700 με RGB Φωτισμό | `shopflix:SF-11324143` |
| Aerocool AEROPGSRAVE3-FRGB-4P | 25 mm | Aerocool AEROPGSRAVE3-FRGB-4P Socket AM4/115x/1700 | `skroutz:37057174` |
| Aerocool AEROPGSRAVE4-FRGB-4P | 25 mm | Aerocool AEROPGSRAVE4-FRGB-4P για Socket 115x / 1200 / 1700 / 775 με RGB Φωτισμό | `shopflix:SF-11324182` |
| Aerocool AEROPGSRAVE4-FRGB-4P | 25 mm | Aerocool AEROPGSRAVE4-FRGB-4P Socket AM4/1200/115x/1700 | `skroutz:37056900` |
| Akasa AK-CC1109BP01 | 27.6 mm | Akasa AK-CC1109BP01 Socket AM4 | `skroutz:39815292` |
| Akasa AK-CC6601EP01 | 26.92 mm | Akasa AK-CC6601EP01 για Socket 1700 | `shopflix:SF-11324018` |
| Akasa AK-CC6601EP01 | 26.92 mm | Akasa AK-CC6601EP01 Socket 1700/1851 | `skroutz:36966924` |
| Akasa AK-CC6602HP01 | 29.92 mm | Akasa AK-CC6602HP01 για Socket 1700 | `shopflix:SF-103481560` |
| Akasa AK-CC6602HP01 | 29.92 mm | Akasa AK-CC6602HP01 Socket 1700/1851 | `skroutz:54017034` |
| Akasa AK-CC6609EP01 | 21.8 mm | Akasa AK-CC6609EP01 Low Profile για Socket 1700 Ασημί | `shopflix:SF-103272353` |

## `case-gpu-max`: case.gpuMaxMm outside 100–700 mm

1 value(s), 1 model(s). Showing 1.

| Model | Value | Title | Listing id |
| --- | ---: | --- | --- |
| Spire U20M | 3.502 mm | Spire U20M Black Gaming Midi Tower RGB με Πλαϊνό Παράθυρο | `bestprice:2163830217` |

## `gpu-minpsu-plausible`: gpu.minPsu needs at least the chip board power + 100 W (chips with a board power in the GPU power table)

12 value(s), 5 model(s). Showing 10.

| Model | Value | Title | Listing id |
| --- | ---: | --- | --- |
| Arc B570 | 170 W | Sparkle Arc B570 10GB GDDR6 Luna Guardian OC | `bestprice:2160489604` |
| Arc B570 | 170 W | Sparkle ARC B570 10GB GDDR6 GUARDIAN LUNA OC | `shopflix:SF-105747737` |
| Arc B570 | 170 W | Sparkle Arc B570 10GB GUARDIAN LUNA OC | `skroutz:59312128` |
| RTX 5050 | 130 W | PNY GeForce RTX 5050 8GB GDDR6 Dual | `shopflix:SF-200096938` |
| RTX 5050 | 130 W | PNY GeForce RTX 5050 8GB Dual | `skroutz:63278778` |
| RTX 5060 | 145 W | MSI GeForce RTX 5060 8GB Shadow 2x OC Max | `skroutz:66091976` |
| RTX 5070 Ti | 300 W | PNY GeForce RTX 5070 Ti 16GB | `skroutz:60811441` |
| RX 9070 | 245 W | Acer Radeon RX 9070 16GB GDDR6 Predator BiFrost OC White | `bestprice:2163311809` |
| RX 9070 | 245 W | Acer Radeon RX 9070 16GB GDDR6 Predator BiFrost | `shopflix:SF-106359451` |
| RX 9070 | 245 W | Acer Radeon RX 9070 16GB GDDR6 Predator Bifrost OC White Edition | `shopflix:SF-202432109` |

## `ram-ddr4-speed`: ram.speed outside 1,600–5,333 MHz

1 value(s), 1 model(s). Showing 1.

| Model | Value | Title | Listing id |
| --- | ---: | --- | --- |
| DDR4 32GB (1×32GB) 6400MHz | 6,400 MHz | Lenovo 32GB DDR4 4X77A90965 | `skroutz:68019327` |

RAM model names keep the speed the scraper read (e.g. "60000MHz"); the fix for the names is in the scraper (queued for main).

## `ram-ddr5-speed`: ram.speed outside 4,000–10,000 MHz

9 value(s), 5 model(s). Showing 9.

| Model | Value | Title | Listing id |
| --- | ---: | --- | --- |
| DDR5 24GB (1×24GB) 2800MHz | 2,800 MHz | Corsair Vengeance 24GB DDR5 | `skroutz:63368834` |
| DDR5 32GB (1×32GB) 2400MHz | 2,400 MHz | HP 32GB (1X32GB) DDR5 RAM 2400MHz C40 P64339-B21 | `bestprice:2160758270` |
| DDR5 32GB (1×32GB) 2400MHz | 2,400 MHz | Adata 32GB DDR5 AD5S480032G-S | `skroutz:40527055` |
| DDR5 32GB (1×32GB) 2400MHz | 2,400 MHz | HP Dual Rank 32GB DDR5 | `skroutz:57724317` |
| DDR5 32GB (1×32GB) 2800MHz | 2,800 MHz | Corsair Vengeance DDR5 32GB (1x32GB) 2800MHz SODIMM Laptop Memory Module | `shopflix:SF-107113129` |
| DDR5 32GB (1×32GB) 2800MHz | 2,800 MHz | Corsair Vengeance 32GB DDR5 | `skroutz:58722757` |
| DDR5 64GB (1×64GB) 2800MHz | 2,800 MHz | Crucial 64GB DDR5 MTC40F2046S1RC56BD1 | `skroutz:56046125` |
| DDR5 64GB (2×32GB) 60000MHz | 60,000 MHz | G.SKILL F5-6000J3040G32GX2-TZ5RK TRIDENT Z5 RGB 64GB (2X32GB) DDR5 60000MHZ CL3… | `eshop:PER.559539` |
| DDR5 64GB (2×32GB) 60000MHz | 60,000 MHz | G.SKILL F5-6000J3238G32GX2-TZ5S TRIDENT Z5 64GB (2X32GB) DDR5 60000MHZ CL32 DUA… | `eshop:PER.559544` |

RAM model names keep the speed the scraper read (e.g. "60000MHz"); the fix for the names is in the scraper (queued for main).

## Builder rows changed

builder.json built from the scraper's raw data and again from the checked data, rows matched by listing id (a row is one model; its value is the one the builder uses for that model). Rows whose value differs:

| Check | Builder rows changed | Rows in the slot |
| --- | ---: | ---: |
| `cooler-height` | 0 | 2089 |
| `case-gpu-max` | 1 | 2588 |
| `case-cooler-max` | 0 | 2588 |
| `gpu-length` | 0 | 1536 |
| `gpu-minpsu-plausible` | 12 | 1536 |
| `psu-watts` | 0 | 137 |
| `ram-ddr4-speed` | 0 | 222 |
| `ram-ddr5-speed` | 2 | 222 |
| `ram-cas` | 0 | 222 |
| `cpu-tdp` | 0 | 337 |
| `mobo-max-memory` | not a builder field | 984 |

Rows only in one of the two builds: 0.

### `case-gpu-max`: case.gpuMaxMm

Showing 1 of 1.

| Model | Before | After | Listing id |
| --- | ---: | ---: | --- |
| Spire U20M | 3.502 | not stated | `bestprice:2163830217` |

### `gpu-minpsu-plausible`: gpu.minPsu

Showing 10 of 12.

| Model | Before | After | Listing id |
| --- | ---: | ---: | --- |
| Arc B570 | 170 | not stated | `bestprice:2160489604` |
| Arc B570 | 170 | not stated | `shopflix:SF-105747737` |
| Arc B570 | 170 | not stated | `skroutz:59312128` |
| RTX 5050 | 130 | not stated | `shopflix:SF-200096938` |
| RTX 5050 | 130 | not stated | `skroutz:63278778` |
| RTX 5060 | 145 | not stated | `skroutz:66091976` |
| RTX 5070 Ti | 300 | not stated | `skroutz:60811441` |
| RX 9070 | 245 | not stated | `bestprice:2163311809` |
| RX 9070 | 245 | not stated | `shopflix:SF-106359451` |
| RX 9070 | 245 | not stated | `shopflix:SF-202432109` |

### `ram-ddr5-speed`: ram.speed

Showing 2 of 2.

| Model | Before | After | Listing id |
| --- | ---: | ---: | --- |
| DDR5 32GB (1×32GB) 2400MHz | 2,400 | not stated | `bestprice:2160758270` |
| DDR5 64GB (2×32GB) 60000MHz | 60,000 | not stated | `eshop:PER.559539` |
