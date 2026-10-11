# Data validation report

Measured values (lengths, heights, speeds, wattages) that fall outside the plausible range for their field. These are almost always scraping mistakes (for example a case "up to 3.502 mm"), not real measurements. In report mode nothing is changed on the site; the owner approves the ranges before `VALIDATION_MODE` becomes `'enforce'`, which then treats the listed values as "not stated".

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
| `cooler-height` | cooler.heightMm | 15–200 mm | enforced | 1557 | 12 | 7 |
| `case-gpu-max` | case.gpuMaxMm | 100–700 mm | enforced | 5259 | 1 | 1 |
| `case-cooler-max` | case.coolerMaxMm | 25–250 mm | enforced | 4614 | 0 | 0 |
| `gpu-length` | gpu.lengthMm | 100–400 mm | enforced | 1233 | 0 | 0 |
| `psu-watts` | psu.watts | 150–3,000 W | report only | 3947 | 0 | 0 |
| `ram-ddr4-speed` | ram.speed | 1,600–5,333 MHz | enforced | 2235 | 1 | 1 |
| `ram-ddr5-speed` | ram.speed | 4,000–10,000 MHz | enforced | 2368 | 9 | 5 |
| `ram-cas` | ram.cas | 5–60 CL | enforced | 2116 | 0 | 0 |
| `cpu-tdp` | cpu.tdp | 10–500 W | enforced | 745 | 0 | 0 |
| `mobo-max-memory` | mobo.maxMemoryGB | 4–16,384 GB | enforced | 0 | 0 | 0 |

## `cooler-height`: cooler.heightMm outside 15–200 mm

12 value(s), 7 model(s). Showing 10.

| Model | Value | Title | Listing id |
| --- | ---: | --- | --- |
| Akasa Alucia H4i | 12 mm | Akasa Alucia H4i | `bestprice:2163333292` |
| Akasa Alucia H4i | 12 mm | Akasa Alucia H4i Socket 115x/1200/1700/1851 | `skroutz:56533164` |
| Inter-Tech A-45 | 13 mm | Inter-Tech A-45 | `bestprice:2164214442` |
| Inter-Tech A-45 | 13 mm | Inter-Tech A-45 Ψύκτρα Επεξεργαστή για Socket AM4 / AM5 | `shopflix:SF-200080806` |
| Inter-Tech A-45 | 13 mm | Inter-Tech A-45 Socket AM4/AM5 | `skroutz:54765776` |
| Inter-Tech IP-3 | 12 mm | Inter-Tech IP-3 Socket AM4/1200/115x/1700 | `skroutz:35276996` |
| Inter-Tech IP-3 Παθητική | 12 mm | Inter-Tech IP-3 Παθητική για Socket AM4 / 1200 / 115x / 1700 Ασημί | `shopflix:SF-11324138` |
| Inter-Tech Q-7 | 13 mm | Inter-Tech Q-7 Ψύκτρα Επεξεργαστή για Socket 1700 | `shopflix:SF-201054176` |
| Inter-Tech Q-7 | 13 mm | Inter-Tech Q-7 Socket 1700 | `skroutz:64624870` |
| Xilence M404 Pro | 14 mm | Xilence M404 Pro ARGB Black | `bestprice:2164587206` |

## `case-gpu-max`: case.gpuMaxMm outside 100–700 mm

1 value(s), 1 model(s). Showing 1.

| Model | Value | Title | Listing id |
| --- | ---: | --- | --- |
| Spire U20M | 3.502 mm | Spire U20M Black Gaming Midi Tower RGB με Πλαϊνό Παράθυρο | `bestprice:2163830217` |

## `ram-ddr4-speed`: ram.speed outside 1,600–5,333 MHz

1 value(s), 1 model(s). Showing 1.

| Model | Value | Title | Listing id |
| --- | ---: | --- | --- |
| DDR4 32GB (1×32GB) 6400MHz | 6,400 MHz | Lenovo 32GB DDR4 4X77A90965 | `skroutz:68019327` |

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

## Review band `cooler-height-low`: cooler.heightMm from 15 to under 30

Real low-profile coolers are 21–27 mm, but shop pages also give a fan's 25 mm thickness as the tower height (audit D-01, v1 ignores < 30 mm). Owner decides. (Report only: these values are kept in every mode.)

59 model(s).

| Model | Value(s) | Listings |
| --- | --- | ---: |
| Aerocool AEROPGSRAVE3-FRGB-4P | 25 | 2 |
| Aerocool AEROPGSRAVE4-FRGB-4P | 25 | 2 |
| Akasa AK-CC1109BP01 | 27.6 | 1 |
| Akasa AK-CC6601EP01 | 26.92 | 2 |
| Akasa AK-CC6602HP01 | 29.92 | 2 |
| Akasa AK-CC6609EP01 | 21.8 | 2 |
| Akasa AK-CC6610EP01 | 26.92 | 2 |
| Akasa AK-CC7122BP01 | 26 | 3 |
| Akasa AK-CC7129BP01 | 21 | 3 |
| Akasa AK-CCE-7106HP | 29.5 | 2 |
| Akasa Vegas Chroma iLG | 29.92 | 2 |
| Alpenfoehn Brocken 4 | 27 | 5 |
| Alpenfoehn Brocken 4 MAX | 27 | 2 |
| Alpenfoehn Brocken 4 Max | 27 | 2 |
| Alpenfoehn Brocken 4 Max Διπλού Ανεμιστήρα | 27 | 1 |
| Alpenfoehn Dolomit Premium | 25 | 2 |
| Apnx AP1-V | 25 | 2 |
| Armaggeddon Blizzard 1 | 25 | 5 |
| Armaggeddon Blizzard 2 | 25 | 5 |
| Armaggeddon Blizzard 3 | 25 | 5 |
| Darkflash L6 | 25 | 1 |
| Deepcool AK400 G2 | 25 | 4 |
| Deepcool Theta 31 PWM | 25 | 1 |
| Dynatron K199 | 28.5 | 1 |
| Dynatron K666 | 25 | 3 |
| Dynatron Q1 | 27 | 1 |
| Dynatron Q3 | 28 | 1 |
| Dynatron S3 | 27 | 1 |
| Dynatron S5 | 25 | 1 |
| Dynatron S7 | 27.4 | 1 |
| Inter-Tech A-18 | 27.5 | 3 |
| Inter-Tech A-41 | 28.4 | 3 |
| Inter-Tech K-129 | 26.5 | 1 |
| Inter-Tech K-199 | 28.5 | 3 |
| Inter-Tech K129 | 26.5 | 1 |
| Inter-Tech K129 Παθητική | 26.5 | 1 |
| Inter-Tech Q-3 | 28 | 2 |
| Inter-Tech Q-5 | 28 | 3 |
| Inter-Tech Q3 | 28 | 1 |
| LC-Power LC-CC-120-RGB | 25 | 1 |
| LC-Power LC-CC-65 | 20 | 2 |
| Power Train DL-200T | 25 | 1 |
| Serioux CC92ARGB | 25 | 2 |
| SilverStone AR09-115XP | 25 | 1 |
| SilverStone AR09-115XS | 25 | 1 |
| SilverStone NT07-1700 | 22 | 2 |
| SilverStone NT09-1700 | 25 | 3 |
| SilverStone SST-XE04-4677VB | 25 | 2 |
| SilverStone XE01-1700A | 28 | 2 |
| Soeyi CLA902 | 25 | 1 |
| Thermalright AXP90-X36 | 15 | 4 |
| Thermalright Assassin Spirit 120 Vision | 25.6 | 4 |
| Thermalright Assassin X 120 Refined SE PLUS | 25 | 1 |
| Thermalright Assassin X 120 Refined SE Plus | 25 | 1 |
| Thermalright Peerless Assassin 140 | 27 | 4 |
| Thermalright Peerless Assassin 140 Διπλού Ανεμιστήρα | 27 | 1 |
| Thermaltake NIC C4 | 25 | 2 |
| Xilence XC232 | 25 | 2 |
| Zalman CNPS9X Performa | 25 | 4 |
