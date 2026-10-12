# PSU recommendation: v1 before, engine after

For every graphics card the builder offers: what v1 recommended for the power supply, and what rule 14 of the v2 engine uses now. Nothing in the builder uses the new figures yet; the owner reads this first.

Data times (`latest.updatedAt`):

- gpu: 2026-10-10T05:45:12+00:00
- cpu: 2026-10-10T05:47:59+00:00

## How each figure is made

- **v1 figure**: the larger of the card's own stated minimum PSU and v1's chip table (no source), for the card alone (the +100 W v1 added for a Ryzen 9 / Core i9 / Core Ultra 9 is not included here).
- **Card minPsu**: the minimum PSU the shop or card page states for that card. **Chip maker W**: NVIDIA "Required System Power" / AMD "Minimum PSU Recommendation" for the chip, from `src/engine/data/gpuPower.ts`.
- **Maker W** (the card maker's figure) = the larger of those two. Rule 14 gives an error below it.
- **Formula W** = ⌈(card board power + CPU power limit + 50 W board + 5 W per RAM stick + 8 W per drive + 3 W per fan + 5 W AIO pump) × 1.3 / 50⌉ × 50. The CPU term is Intel's Maximum Turbo Power (PL2) or, for AMD, its stated default TDP (AMD gives no PPT; owner's decision). Empty when the board power of the card or the power figure of the CPU has no official page in our tables.
- **Recommended** = the larger of Maker W and Formula W. By the owner's rule a PSU at or above Maker W but below Formula W is a warning, not an error.

## Reference builds

- **Intel reference**: Core i5-12400F (PL2 117 W; the most-listed desktop Intel CPU on LGA1700 / LGA1851 with a power-limit row, 13 listings), 2 RAM sticks, 1 NVMe drive, 3 fans, an air cooler. Without the card its parts draw 194 W; the card's board power is added on top.
- **AMD reference**: Ryzen 7 7700 (TDP 65 W, "TDP (AMD gives no PPT)"; the most-listed desktop AMD CPU on AM5 / AM4 with a TDP row, 11 listings), the same RAM, drive, fans and cooler. Without the card its parts draw 142 W.

## Summary

1536 cards. Maker W exists for 1411, Formula W (Intel reference) for 1193, Formula W (AMD reference) for 1193, a v1 figure for 1536. "Not comparable" = either side has no figure.

| Reference | Compared figure | Rises vs v1 | Falls vs v1 | Same as v1 | Not comparable |
| --- | --- | ---: | ---: | ---: | ---: |
| Intel (Core i5-12400F) | Recommended (max of maker and formula) | 14 | 118 | 1291 | 113 |
| AMD (Ryzen 7 7700) | Recommended (max of maker and formula) | 8 | 118 | 1297 | 113 |
| (for comparison) Maker W alone | Maker W | 8 | 112 | 1291 | 125 |

## The 20 largest changes (Intel reference)

| Chip | Card | Card minPsu | Chip maker W | v1 W | Maker W | Formula W (Intel ref.) | Recommended (Intel ref.) | Change vs v1 | Formula W (AMD ref.) | Recommended (AMD ref.) | Change vs v1 (AMD ref.) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| RTX 3050 | GIGABYTE VGA GV-N3050WF2OCV2-6GD, 6GB , GDDR6 | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | Gainward GeForce RTX 3050 6GB GDDR6 Pegasus | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | Gainward GeForce RTX 3050 6GB Pegasus | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | Gigabyte GeForce RTX 3050 | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | Gigabyte GeForce RTX 3050 6GB GDDR6 Low Profile OC | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | Gigabyte GeForce RTX 3050 6GB GDDR6 Windforce OC v2 | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | Gigabyte GeForce RTX 3050 6GB GDDR6 Windforce OC v2 | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | Gigabyte GeForce RTX 3050 6GB GDDR6 Windforce OC v2 | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | Gigabyte GeForce RTX 3050 6GB OC Low Profile 6G | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | MSI GEFORCE RTX 3050 VENTUS 2X E 6GB OC | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | MSI GeForce RTX 3050 6GB GDDR6 Gaming X | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | MSI GeForce RTX 3050 6GB GDDR6 LP E 6G OC | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | MSI GeForce RTX 3050 6GB GDDR6 Ventus 2X E OC | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | MSI GeForce RTX 3050 6GB GDDR6 Ventus 2X OC | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | MSI GeForce RTX 3050 6GB GDDR6 Ventus 2X OC | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | MSI GeForce RTX 3050 6GB LP E 6G OC | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | MSI GeForce RTX 3050 6GB Ventus 2X 6G OC | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | MSI GeForce RTX 3050 6GB Ventus 2X E 6G OC | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | Palit GeForce RTX 3050 6GB StormX (Refresh) | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | ASUS DUAL GEFORCE RTX 3050 V2 OC EDITION 8GB GDDR6 PCI-E RETAIL | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |

## Card minPsu values the validation rejected

A card's own `minPsu` is treated as not stated when the chip has a row in the GPU power table and the value is under the chip's board power + 100 W (check `gpu-minpsu-plausible`). The cards above were computed without these values.

12 listing(s) rejected.

| Chip | Listing | Stated minPsu | Lowest accepted |
| --- | --- | ---: | ---: |
| Arc B570 | Sparkle ARC B570 10GB GDDR6 GUARDIAN LUNA OC | 170 | 250 |
| Arc B570 | Sparkle Arc B570 10GB GDDR6 Luna Guardian OC | 170 | 250 |
| Arc B570 | Sparkle Arc B570 10GB GUARDIAN LUNA OC | 170 | 250 |
| RTX 5050 | PNY GeForce RTX 5050 8GB Dual | 130 | 230 |
| RTX 5050 | PNY GeForce RTX 5050 8GB GDDR6 Dual | 130 | 230 |
| RTX 5060 | MSI GeForce RTX 5060 8GB Shadow 2x OC Max | 145 | 245 |
| RTX 5070 Ti | PNY GeForce RTX 5070 Ti 16GB | 300 | 400 |
| RX 9070 | Acer Radeon RX 9070 16GB GDDR6 Predator BiFrost | 245 | 320 |
| RX 9070 | Acer Radeon RX 9070 16GB GDDR6 Predator BiFrost OC White | 245 | 320 |
| RX 9070 | Acer Radeon RX 9070 16GB GDDR6 Predator Bifrost OC White Edition | 245 | 320 |
| RX 9070 | Acer Radeon RX 9070 16GB Predator BiFrost | 245 | 320 |
| RX 9070 | Acer Radeon RX 9070 16GB Predator Bifrost OC White Edition | 245 | 320 |

## All cards

Sorted by chip, then card name.

| Chip | Card | Card minPsu | Chip maker W | v1 W | Maker W | Formula W (Intel ref.) | Recommended (Intel ref.) | Change vs v1 | Formula W (AMD ref.) | Recommended (AMD ref.) | Change vs v1 (AMD ref.) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Arc A310 | Asrock Arc A310 4GB GDDR6 Low Profile | — | — | 300 | — | 350 | 350 | +50 | 300 | 300 | 0 |
| Arc A310 | Sparkle 1A1-S00401900G ARC A310 PCI-E 4.0 4GB GDDR6 | — | — | 300 | — | 350 | 350 | +50 | 300 | 300 | 0 |
| Arc A310 | Sparkle ARC A310 4GB GDDR6 ELF (SA310F-4G) | — | — | 300 | — | 350 | 350 | +50 | 300 | 300 | 0 |
| Arc A310 | Sparkle Arc A310 4GB ECO | 350 | — | 350 | 350 | 350 | 350 | 0 | 300 | 350 | 0 |
| Arc A310 | Sparkle Arc A310 4GB GDDR6 ECO | 350 | — | 350 | 350 | 350 | 350 | 0 | 300 | 350 | 0 |
| Arc A310 | Sparkle Arc A310 4GB GDDR6 Omni View | 350 | — | 350 | 350 | 350 | 350 | 0 | 300 | 350 | 0 |
| Arc A310 | Sparkle Arc A310 4GB Omni View | 350 | — | 350 | 350 | 350 | 350 | 0 | 300 | 350 | 0 |
| Arc A380 | ASRock Arc A380 6GB Challenger ITX OC | 500 | — | 500 | 500 | 350 | 500 | 0 | 300 | 500 | 0 |
| Arc A380 | Asrock ARC A380 6GB GDDR6 Challenger ITX OC με HDMI & 3 DisplayPort Α… | 500 | — | 500 | 500 | 350 | 500 | 0 | 300 | 500 | 0 |
| Arc A380 | Asrock Arc A380 6GB GDDR6 Challenger ITX OC | 500 | — | 500 | 500 | 350 | 500 | 0 | 300 | 500 | 0 |
| Arc A380 | Matrox Arc A380 6GB | — | — | 300 | — | 350 | 350 | +50 | 300 | 300 | 0 |
| Arc A380 | Matrox Arc A380 6GB GDDR6 Luma | — | — | 300 | — | 350 | 350 | +50 | 300 | 300 | 0 |
| Arc A380 | SPARKLE INTEL ARC A380 ELF 6 GB GDDR6 RETAIL | 500 | — | 500 | 500 | 350 | 500 | 0 | 300 | 500 | 0 |
| Arc A380 | Sparkle ARC A380 6GB GDDR6 ELF | 500 | — | 500 | 500 | 350 | 500 | 0 | 300 | 500 | 0 |
| Arc A380 | Sparkle Arc A380 6GB | — | — | 300 | — | 350 | 350 | +50 | 300 | 300 | 0 |
| Arc A380 | Sparkle Arc A380 6GB ELF | 500 | — | 500 | 500 | 350 | 500 | 0 | 300 | 500 | 0 |
| Arc A380 | Sparkle Arc A380 6GB GDDR6 ELF | 500 | — | 500 | 500 | 350 | 500 | 0 | 300 | 500 | 0 |
| Arc A580 | Sparkle Arc A580 12GB Guardian | 600 | — | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| Arc A750 | Asrock Arc A750 8GB GDDR6 Challenger SE OC | — | — | 600 | — | 550 | 550 | -50 | 500 | 500 | -100 |
| Arc A750 | Sparkle ARC A750 8GB GDDR6 ROC Luna OC | 550 | — | 600 | 550 | 550 | 550 | -50 | 500 | 550 | -50 |
| Arc A750 | Sparkle ARC A750 8GB GDDR6 Titan OC | 650 | — | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| Arc A750 | Sparkle Arc A750 8GB GDDR6 ORC OC | 550 | — | 600 | 550 | 550 | 550 | -50 | 500 | 550 | -50 |
| Arc A750 | Sparkle Arc A750 8GB GDDR6 ROC Luna OC | 550 | — | 600 | 550 | 550 | 550 | -50 | 500 | 550 | -50 |
| Arc A750 | Sparkle Arc A750 8GB GDDR6 Titan OC | 650 | — | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| Arc A750 | Sparkle Arc A750 8GB ORC OC | 550 | — | 600 | 550 | 550 | 550 | -50 | 500 | 550 | -50 |
| Arc A750 | Sparkle Arc A750 8GB ROC Luna OC | 550 | — | 600 | 550 | 550 | 550 | -50 | 500 | 550 | -50 |
| Arc A750 | Sparkle Arc A750 8GB Titan OC | 650 | — | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| Arc B570 | ASROCK INTEL ARC B570 CL 10GB GDDR6 RETAIL | — | — | 500 | — | 450 | 450 | -50 | 400 | 400 | -100 |
| Arc B570 | ASRock Arc B570 10GB Challenger OC | 600 | — | 600 | 600 | 450 | 600 | 0 | 400 | 600 | 0 |
| Arc B570 | ASRock Arc B570 10GB GDDR6 Challenger OC | 600 | — | 600 | 600 | 450 | 600 | 0 | 400 | 600 | 0 |
| Arc B570 | Asrock Arc B570 10GB GDDR6 Challenger OC | 600 | — | 600 | 600 | 450 | 600 | 0 | 400 | 600 | 0 |
| Arc B570 | Sparkle ARC B570 10GB GDDR6 Eclipse OC | 600 | — | 600 | 600 | 450 | 600 | 0 | 400 | 600 | 0 |
| Arc B570 | Sparkle ARC B570 10GB GDDR6 GUARDIAN LUNA OC | — | — | 500 | — | 450 | 450 | -50 | 400 | 400 | -100 |
| Arc B570 | Sparkle ARC B570 10GB GDDR6 Guardian OC | 600 | — | 600 | 600 | 450 | 600 | 0 | 400 | 600 | 0 |
| Arc B570 | Sparkle Arc B570 10GB Eclipse OC | 600 | — | 600 | 600 | 450 | 600 | 0 | 400 | 600 | 0 |
| Arc B570 | Sparkle Arc B570 10GB GDDR6 Guardian OC | 600 | — | 600 | 600 | 450 | 600 | 0 | 400 | 600 | 0 |
| Arc B570 | Sparkle Arc B570 10GB GDDR6 Luna Guardian OC | — | — | 500 | — | 450 | 450 | -50 | 400 | 400 | -100 |
| Arc B570 | Sparkle Arc B570 10GB GUARDIAN LUNA OC | — | — | 500 | — | 450 | 450 | -50 | 400 | 400 | -100 |
| Arc B570 | Sparkle Arc B570 10GB Guardian OC | 600 | — | 600 | 600 | 450 | 600 | 0 | 400 | 600 | 0 |
| Arc B570 | Sparkle Technology Arc B570 10GB GDDR6 Eclipse OC | — | — | 500 | — | 450 | 450 | -50 | 400 | 400 | -100 |
| Arc B580 | ASROCK INTEL ARC B580 CHALLENGER 12GB OC GDDR6 | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| Arc B580 | ASRock ARC B580 12GB GDDR6 | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| Arc B580 | ASRock Arc B580 12GB Challenger OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| Arc B580 | Asrock Arc B580 12GB GDDR6 Challenger OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| Arc B580 | Sparkle ARC B580 12GB GDDR6 Guardian | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| Arc B580 | Sparkle Arc B580 12GB GDDR6 Guardian OC | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| GT 1030 | AFOX GeForce GT 1030 4GB GDDR4 | — | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | ASUS GEFORCE GT1030 GT1030-2G-BRK 2GB GDDR5 PCI-E RETAIL | — | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | ASUS GEFORCE GT1030 GT1030-SL-2G-BRK 2GB GDDR5 PCI-E RETAIL | — | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | ASUS VGA GT1030-SL-2G-BRK, 2048MB, GDDR5 | — | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Afox GeForce GT 1030 2GB | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Afox GeForce GT 1030 4GB | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Asus GeForce GT 1030 2GB GDDR5 | — | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Asus GeForce GT 1030 2GB GDDR5 LP Silent with Brackets | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Asus GeForce GT 1030 2GB GDDR5 LP Silent with Brackets | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Asus GeForce GT 1030 2GB GDDR5 Low Profile | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Asus GeForce GT 1030 2GB GDDR5 Low Profile | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Asus GeForce GT 1030 2GB GDDR5 Low Profile | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Asus GeForce GT 1030 2GB GDDR5 Low Profile PCI-E x16 3.0 HDMI Display… | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Asus GeForce GT 1030 2GB LP Silent with Brackets | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Asus GeForce GT 1030 2GB Low Profile | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | BIOSTAR NVIDIA GEFORCE GT1030 4GB VN1034TB46 | — | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Biostar GeForce GT 1030 4GB | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Biostar GeForce GT 1030 4GB GDDR4 | — | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Biostar GeForce GT 1030 4GB GDDR4 | — | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | GIGABYTE GEFORCE GT1030 LOW PROFILE D4 2G GV-N1030D4-2GL 2GB DDR4 PCI… | — | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Gainward GeForce GT 1030 2GB | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Gainward GeForce GT 1030 2GB GDDR4 | — | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | GeForce GT 1030 4GB | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Gigabyte GeForce GT 1030 2GB D4 | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Gigabyte GeForce GT 1030 2GB GDDR4 | — | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Gigabyte GeForce GT 1030 2GB GDDR4 D4 | — | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Gigabyte GeForce GT 1030 2GB GDDR4 D4 PCIE x16 3.0 με HDMI | — | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | INNO3D NVIDIA GEFORCE GT1030 2GB GDDR5 N1030-1SDV-E5BL RETAIL | — | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Inno 3D GeForce GT 1030 2GB GDDR5 Passive | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Inno 3D GeForce GT 1030 2GB Passive | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Inno3D GeForce GT 1030 2GB GDDR5 | — | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | MSI GeForce GT 1030 2GB | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | MSI GeForce GT 1030 2GB 2GHDA LP OC | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | MSI GeForce GT 1030 2GB Aero ITX | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | MSI GeForce GT 1030 2GB Aero ITX 2GD4 OC | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | MSI GeForce GT 1030 2GB GDDR4 2GHDA LP OC | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | MSI GeForce GT 1030 2GB GDDR4 LP OC | — | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | MSI GeForce GT 1030 2GB GDDR4 PCI Express x16 3.0 Low Profile Παθητικ… | — | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | MSI GeForce GT 1030 4GB 4GHD4 LP OC | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | MSI GeForce GT 1030 4GB AERO ITX 4GD4 OC | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | MSI GeForce GT 1030 4GB DDR4 LP OC | — | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | MSI GeForce GT 1030 4GB GDDR4 | — | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | MSI GeForce GT 1030 4GB GDDR4 4GHD4 LP OC | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | MSI GeForce GT 1030 4GB GDDR4 Aero ITX OC | — | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Palit GeForce GT 1030 2GB GDDR4 | — | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | ZOTAC NVIDIA GEFORCE GT1030 2GB GDDR5 PCI-E RETAIL | — | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Zotac GeForce GT 1030 2GB GDDR5 | — | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Zotac GeForce GT 1030 2GB GDDR5 Low Profile | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 1030 | Zotac GeForce GT 1030 2GB Low Profile | 300 | 300 | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 210 | AFOX GeForce GT 210 1GB GDDR2 Low Profile | — | — | 300 | — | — | — | — | — | — | — |
| GT 210 | AFOX GeForce GT 210 1GB GDDR2 Low Profile | — | — | 300 | — | — | — | — | — | — | — |
| GT 210 | Afox GeForce GT 210 1GB | 300 | — | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 210 | Afox GeForce GT 210 1GB DDR2 | — | — | 300 | — | — | — | — | — | — | — |
| GT 210 | Afox GeForce GT 210 1GB V7 | 300 | — | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 210 | BIOSTAR NVIDIA GEFORCE GT210-1G 1GB DDR3 | — | — | 300 | — | — | — | — | — | — | — |
| GT 210 | Biostar GeForce GT 210 1GB | — | — | 300 | — | — | — | — | — | — | — |
| GT 210 | Biostar GeForce GT 210 1GB Ver. G210 | 300 | — | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 240 | AFOX GeForce GT 240 1GB GDDR3 Low Profile V2 | — | — | 300 | — | — | — | — | — | — | — |
| GT 240 | AFOX NVIDIA GEFORCE AF240-1024D3L2 GT240 1GB DDR3 RETAIL | — | — | 300 | — | — | — | — | — | — | — |
| GT 240 | AFOX NVIDIA GEFORCE AF240-1024D3L2-V2 GT240 1GB DDR3 RETAIL | — | — | 300 | — | — | — | — | — | — | — |
| GT 240 | Afox GeForce GT 240 1GB | 300 | — | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 240 | Afox GeForce GT 240 1GB GDDR3 | — | — | 300 | — | — | — | — | — | — | — |
| GT 240 | Afox GeForce GT 240 1GB GDDR3 | — | — | 300 | — | — | — | — | — | — | — |
| GT 240 | Afox GeForce GT 240 1GB GDDR3 | — | — | 300 | — | — | — | — | — | — | — |
| GT 240 | Afox GeForce GT 240 1GB V2 | — | — | 300 | — | — | — | — | — | — | — |
| GT 240 | Gainward NVIDIA GeForce GT 240 1GB (MTX) | — | — | 300 | — | — | — | — | — | — | — |
| GT 610 | BIOSTAR GT610-2GB 2GB GDDR3 RETAIL | — | — | 300 | — | — | — | — | — | — | — |
| GT 610 | Biostar GeForce GT 610 2GB | 300 | — | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 610 | Biostar GeForce GT 610 2GB GDDR3 | — | — | 300 | — | — | — | — | — | — | — |
| GT 610 | Biostar GeForce GT 610 GDDR3 2 GB PCI Express x16 2.0 | — | — | 300 | — | — | — | — | — | — | — |
| GT 710 | ASUS GT710-SL-2GD5-BRK-EVO NVIDIA GEFORCE GT 710 2 GB GDDR5 | — | — | 300 | — | — | — | — | — | — | — |
| GT 710 | ASUS VGA GT710-SL-2GD5-BRK-EVO 2GB DDR5 | — | — | 300 | — | — | — | — | — | — | — |
| GT 710 | Afox GeForce GT 710 rev. 3.0 4GB | — | — | 300 | — | — | — | — | — | — | — |
| GT 710 | Asus GeForce GT 710 2GB Evo | 300 | — | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 710 | Asus GeForce GT 710 2GB GDDR3 Evo | — | — | 300 | — | — | — | — | — | — | — |
| GT 710 | Asus GeForce GT 710 2GB GDDR3 SL BRK Evo | — | — | 300 | — | — | — | — | — | — | — |
| GT 710 | Asus GeForce GT 710 2GB GDDR5 Evo | 300 | — | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 710 | Biostar GeForce GT710 2GB | — | — | 300 | — | — | — | — | — | — | — |
| GT 710 | GIGABYTE NVIDIA GEFORCE GT710 GV-N710D3-2GL 2GB DDR3 PCI-E RETAIL | — | — | 300 | — | — | — | — | — | — | — |
| GT 710 | Gigabyte GeForce GT 710 2GB | — | — | 300 | — | — | — | — | — | — | — |
| GT 710 | Gigabyte GeForce GT 710 2GB | 300 | — | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 710 | Gigabyte GeForce GT 710 2GB GDDR3 | — | — | 300 | — | — | — | — | — | — | — |
| GT 710 | Gigabyte GeForce GT 710 2GB GDDR3 PCI-E x8 2.0 HDMI | — | — | 300 | — | — | — | — | — | — | — |
| GT 710 | Gigabyte GeForce GT 710 rev. 1.0 2GB GDDR3 | — | — | 300 | — | — | — | — | — | — | — |
| GT 710 | INNO3D N710-1SDV-E3BX GEFORCE GT 710 2GB GDDR3 LP | — | — | 300 | — | — | — | — | — | — | — |
| GT 710 | Inno 3D GeForce GT 710 2GB GDDR3 LP | — | — | 300 | — | — | — | — | — | — | — |
| GT 710 | Inno 3D GeForce GT 710 2GB LP | 300 | — | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 710 | Inno3D GeForce GT 710 2GB GDDR3 | — | — | 300 | — | — | — | — | — | — | — |
| GT 710 | MAXSUN VGA MS-GT710 Power Hammer II 2G, 2GB DDR3, 64bit | — | — | 300 | — | — | — | — | — | — | — |
| GT 710 | MSI GeForce GT 710 2GB | 300 | — | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 710 | MSI GeForce GT 710 2GB GDDR3 Low Profile | — | — | 300 | — | — | — | — | — | — | — |
| GT 710 | MSI NVIDIA GEFORCE GT710 2GB GT710 2GD3H LP 2GB DDR3 PCI-E RETAIL | — | — | 300 | — | — | — | — | — | — | — |
| GT 710 | ZOTAC NVIDIA GEFORCE GT 710 2GB DDR3 64BIT HDMI 954MHZ | — | — | 300 | — | — | — | — | — | — | — |
| GT 710 | Zotac GeForce GT 710 2GB | 300 | — | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 710 | Zotac GeForce GT 710 2GB | — | — | 300 | — | — | — | — | — | — | — |
| GT 710 | Zotac GeForce GT 710 2GB GDDR3 | — | — | 300 | — | — | — | — | — | — | — |
| GT 710 | Zotac GeForce GT 710 2GB GDDR3 | — | — | 300 | — | — | — | — | — | — | — |
| GT 710 | Zotac GeForce GT 710 2GB Passive | 300 | — | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 730 | AFOX GeForce GT 730 1GB GDDR3 LP | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | AFOX GeForce GT 730 4GB GDDR3 | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | AFOX GeForce GT 730 4GB Low Profile | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | AFOX NVIDIA GEFORCE AF730-1024D3L7-V1 GT730 1GB DDR3 RETAIL | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | AFOX NVIDIA GEFORCE GT730 4GB GDDR3 RETAIL | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | ASUS NVIDIA GEFORCE GT730 GT730-4H-SL-2GD5 2GB GDDR5 PCI-E RETAIL | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | ASUS NVIDIA GEFORCE GT730 GT730-SL-2GD5-BRK 2GB GDDR5 PCI-E RETAIL | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | Afox GeForce GT 730 1GB GDDR3 LP | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | Afox GeForce GT 730 1GB LP | 300 | — | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 730 | Afox GeForce GT 730 4GB | 300 | — | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 730 | Afox GeForce GT 730 4GB GDDR3 | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | Asus GeForce GT 730 2GB | 300 | — | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 730 | Asus GeForce GT 730 2GB | 300 | — | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 730 | Asus GeForce GT 730 2GB GDDR5 | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | Asus GeForce GT 730 2GB GDDR5 | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | Asus GeForce GT 730 2GB GDDR5 | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | Asus GeForce GT 730 2GB GDDR5 Multicolour | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | Asus GeForce GT 730 2GB GDDR5 PCI Express x16 2.0 Low Profile Παθητικ… | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | Asus GeForce GT 730 2GB GDDR5 Silent | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | Asus GeForce GT 730 2GB GDDR5 Silent with Brackets | 300 | — | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 730 | Asus GeForce GT 730 2GB Silent with Brackets | 300 | — | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 730 | BIOSTAR BIO-VC-N-VN7313TH41 NVIDIA GEFORCE GT730 4GB DDR3 LP PCI-E RE… | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | BIOSTAR GT730 4GB 4XHDMI RETAIL | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | BIOSTAR NVIDIA GEFORCE GT730 2GB DDR3 | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | BIOSTAR VGA GeForce GT730 VN7313TH41-TBARL-BS2, GDDR3 4GB, 128bit | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | BIOSTAR VGA GeForce GT730 VN7313THX1-TBARL-BS2, DDR3 2GB, 128bit | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | Biostar GeForce GT 730 2GB | 300 | — | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 730 | Biostar GeForce GT 730 2GB GDDR2 PCI Express x16 2.0 Αερόψυκτη | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | Biostar GeForce GT 730 2GB GDDR3 | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | Biostar GeForce GT 730 2GB GDDR3 | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | Biostar GeForce GT 730 4GB | 300 | — | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 730 | Biostar GeForce GT 730 4GB (LP) Ver. | 300 | — | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 730 | Biostar GeForce GT 730 4GB GDDR3 | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | Biostar GeForce GT 730 4GB GDDR3 | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | Biostar GeForce GT 730 4GB GDDR3 | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | Biostar GeForce GT 730 4GB GDDR3 LP | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | Biostar GeForce GT 730 4GB GDDR4 PCI Express x16 2.0 Αερόψυκτη | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | Biostar Vga Geforce Gt730 Vn7313th41-tbarl-bs2, Gddr3 4gb, 128bit Bulk | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | Gigabyte GeForce GT 730 2GB GDDR5 | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | MSI GeForce GT 730 2GB GDDR3 Low Profile V1 | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | PNY GeForce GT 730 2GB | 300 | — | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GT 730 | PNY GeForce GT 730 2GB GDDR3 | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | PNY GeForce GT 730 2GB GDDR3 | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | Zotac GeForce GT 730 4GB GDDR3 | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | Zotac GeForce GT 730 4GB GDDR3 Zone Edition | — | — | 300 | — | — | — | — | — | — | — |
| GT 730 | Zotac GeForce GT 730 4GB Zone Edition | 300 | — | 300 | 300 | — | 300 | 0 | — | 300 | 0 |
| GTX 1050 | BIOSTAR NVIDIA GEFORCE GTX1050 4GB GDDR5 RETAIL | — | — | 300 | — | — | — | — | — | — | — |
| GTX 1050 | Biostar GeForce GTX 1050 4GB | 250 | — | 300 | 250 | — | 250 | -50 | — | 250 | -50 |
| GTX 1050 | Biostar GeForce GTX 1050 4GB GDDR5 VN1055TF41 | — | — | 300 | — | — | — | — | — | — | — |
| GTX 1050 Ti | AFOX GeForce GTX 1050 Ti 4GB Black | — | — | 300 | — | — | — | — | — | — | — |
| GTX 1050 Ti | BIOSTAR NVIDIA GEFORCE GTX1050TI 4GB GDDR5 RETAIL | — | — | 300 | — | — | — | — | — | — | — |
| GTX 1050 Ti | Biostar GeForce GTX 1050 Ti 4GB | 250 | — | 300 | 250 | — | 250 | -50 | — | 250 | -50 |
| GTX 1050 Ti | Biostar GeForce GTX 1050 Ti 4GB | — | — | 300 | — | — | — | — | — | — | — |
| GTX 1050 Ti | Biostar GeForce GTX 1050 Ti 4GB GDDR4 | — | — | 300 | — | — | — | — | — | — | — |
| GTX 1050 Ti | Biostar GeForce GTX 1050 Ti 4GB GDDR5 | — | — | 300 | — | — | — | — | — | — | — |
| GTX 1050 Ti | Biostar GeForce GTX 1050 Ti 4GB GDDR5 | — | — | 300 | — | — | — | — | — | — | — |
| GTX 1660 | Gigabyte GeForce GTX 1660 6GB GDDR5 OC | 450 | — | 450 | 450 | — | 450 | 0 | — | 450 | 0 |
| GTX 1660 | PALIT VGA GeForce GTX 1660 StormX NE51660018J9-165F, GDDR5 6GB, 192bit | — | — | 450 | — | — | — | — | — | — | — |
| GTX 1660 | Palit GeForce GTX 1660 6GB GDDR5 StormX | — | — | 450 | — | — | — | — | — | — | — |
| GTX 1660 Super | BIOSTAR NVIDIA GTX1660SUPER-6GB GDDR6 VN1666SF69 (TBA) | — | — | 450 | — | — | — | — | — | — | — |
| GTX 1660 Super | Biostar GeForce GTX 1660 Super 6GB | 450 | — | 450 | 450 | — | 450 | 0 | — | 450 | 0 |
| GTX 1660 Super | Biostar GeForce GTX 1660 Super 6GB GDDR6 | — | — | 450 | — | — | — | — | — | — | — |
| GTX 1660 Super | Biostar GeForce GTX 1660 Super 6GB GDDR6 | — | — | 450 | — | — | — | — | — | — | — |
| GTX 1660 Ti | Asus GeForce GTX 1660 Ti 6GB GDDR6 TUF Gaming Evo | 450 | — | 450 | 450 | — | 450 | 0 | — | 450 | 0 |
| GTX 1660 Ti | Asus GeForce GTX 1660 Ti 6GB TUF Gaming EVO OC | 450 | — | 450 | 450 | — | 450 | 0 | — | 450 | 0 |
| GTX 1660 Ti | Biostar GeForce GTX 1660 Ti 6GB | 450 | — | 450 | 450 | — | 450 | 0 | — | 450 | 0 |
| GTX 745 | NVidia GeForce GTX 745 2.0GB | — | — | 300 | — | — | — | — | — | — | — |
| RTX 2060 | Asus GeForce RTX 2060 6GB GDDR6 Dual Evo OC | — | — | 500 | — | — | — | — | — | — | — |
| RTX 2060 | Gigabyte GeForce RTX 2060 6GB GDDR6 D6 Rev 2.0 | 500 | — | 500 | 500 | — | 500 | 0 | — | 500 | 0 |
| RTX 2060 Super | AFOX GeForce RTX 2060 Super 8GB GDDR6 Dual V2 | — | — | 550 | — | — | — | — | — | — | — |
| RTX 2060 Super | Afox GeForce RTX 2060 Super 8GB Dual | — | — | 550 | — | — | — | — | — | — | — |
| RTX 2060 Super | Afox GeForce RTX 2060 Super 8GB GDDR6 Dual | — | — | 550 | — | — | — | — | — | — | — |
| RTX 2060 Super | BIOSTAR NVIDIA RTX2060 SUPER 8GB VN2066RF82 PCI-E RETAIL | — | — | 550 | — | — | — | — | — | — | — |
| RTX 2060 Super | Biostar GeForce RTX 2060 Super 8GB Extreme Gaming | 550 | — | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RTX 2060 Super | Biostar GeForce RTX 2060 Super 8GB GDDR6 | — | — | 550 | — | — | — | — | — | — | — |
| RTX 2060 Super | Biostar GeForce RTX 2060 Super 8GB GDDR6 Extreme Gaming | 550 | — | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RTX 3050 | ASUS DUAL GEFORCE RTX 3050 V2 OC EDITION 8GB GDDR6 PCI-E RETAIL | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | ASUS NVIDIA GEFORCE RTX3050 DUAL-O6G DP/HDMI/DVI-D OC 6GB GDDR6 RETAIL | — | — | 550 | — | — | — | — | — | — | — |
| RTX 3050 | ASUS VGA DUAL-RTX3050-O6G, 6GB, GDDR6 | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | ASUS VGA DUAL-RTX3050-O8G-V2, 8GB, GDDR6 | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | Asus Dual GeForce RTX 3050 V2 8GB GDDR6 OC Edition 90YV0GH6-M0NA00 | — | — | 550 | — | — | — | — | — | — | — |
| RTX 3050 | Asus GeForce RTX 3050 | 550 | — | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RTX 3050 | Asus GeForce RTX 3050 6GB | — | — | 550 | — | — | — | — | — | — | — |
| RTX 3050 | Asus GeForce RTX 3050 6GB GDDR6 Dual OC | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | Asus GeForce RTX 3050 6GB GDDR6 Dual OC | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | Asus GeForce RTX 3050 6GB GDDR6 LP BRK | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | Asus GeForce RTX 3050 6GB GDDR6 LP BRK OC Edition | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | Asus GeForce RTX 3050 6GB LP BRK OC Edition | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | Asus GeForce RTX 3050 8GB Dual OC LHR V2 | — | — | 550 | — | — | — | — | — | — | — |
| RTX 3050 | Asus GeForce RTX 3050 8GB GDDR6 Dual OC | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | Asus GeForce RTX 3050 8GB GDDR6 Dual OC V2 | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | Asus GeForce RTX 3050 8GB GDDR6 Dual V2 OC | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | Asus GeForce RTX 3050 8GB OC | — | — | 550 | — | — | — | — | — | — | — |
| RTX 3050 | GIGABYTE VGA GV-N3050WF2OCV2-6GD, 6GB , GDDR6 | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | Gainward GeForce RTX 3050 6GB GDDR6 Pegasus | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | Gainward GeForce RTX 3050 6GB GDDR6 StormX | — | — | 550 | — | — | — | — | — | — | — |
| RTX 3050 | Gainward GeForce RTX 3050 6GB Pegasus | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | Gigabyte GV-N3050WF2OCV2-6G GeForce RTX 3050 6GB | — | — | 550 | — | — | — | — | — | — | — |
| RTX 3050 | Gigabyte GeForce RTX 3050 | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | Gigabyte GeForce RTX 3050 6GB GDDR6 Low Profile OC | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | Gigabyte GeForce RTX 3050 6GB GDDR6 Windforce OC v2 | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | Gigabyte GeForce RTX 3050 6GB GDDR6 Windforce OC v2 | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | Gigabyte GeForce RTX 3050 6GB GDDR6 Windforce OC v2 | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | Gigabyte GeForce RTX 3050 6GB OC Low Profile 6G | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | Gigabyte GeForce RTX 3050 8GB GDDR6 Gaming OC | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | Gigabyte GeForce RTX 3050 8GB GDDR6 Windforce OC V2 | — | — | 550 | — | — | — | — | — | — | — |
| RTX 3050 | Gigabyte GeForce RTX 3050 8GB GDDR6 Windforce V2 OC | — | — | 550 | — | — | — | — | — | — | — |
| RTX 3050 | Gigabyte GeForce RTX 3050 Nvidia PCI Express x16 4.0 6GB GDDR6 | — | — | 550 | — | — | — | — | — | — | — |
| RTX 3050 | INNO3D NVIDIA GEFORCE RTX 3050 TWIN X2 6GB V2 RETAIL | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | Inno 3D GeForce RTX 3050 6GB GDDR6 Twin X2 | — | — | 550 | — | — | — | — | — | — | — |
| RTX 3050 | Inno 3D GeForce RTX 3050 6GB GDDR6 Twin X2 V2 | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | Inno 3D GeForce RTX 3050 6GB Twin X2 V2 | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | Inno 3D GeForce RTX 3050 8GB GDDR6 Twin X2 Αερόψυκτη | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | Inno 3D GeForce RTX 3050 8GB TWIN X2 OC | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | Inno 3D GeForce RTX 3050 8GB Twin X2 | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | Inno3D GeForce RTX 3050 6GB GDDR6 TWIN X2 V2 | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | Inno3D GeForce RTX 3050 8GB GDDR6 Twin X2 | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | Inno3D GeForce RTX 3050 8GB GDDR6 Twin X2 OC | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | MSI GEFORCE RTX 3050 VENTUS 2X E 6GB OC | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | MSI GeForce RTX 3050 6GB GDDR6 Gaming X | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | MSI GeForce RTX 3050 6GB GDDR6 LP E 6G OC | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | MSI GeForce RTX 3050 6GB GDDR6 Low Profile E OC | — | — | 550 | — | — | — | — | — | — | — |
| RTX 3050 | MSI GeForce RTX 3050 6GB GDDR6 Low Profile OC | — | — | 550 | — | — | — | — | — | — | — |
| RTX 3050 | MSI GeForce RTX 3050 6GB GDDR6 Ventus 2X E OC | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | MSI GeForce RTX 3050 6GB GDDR6 Ventus 2X OC | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | MSI GeForce RTX 3050 6GB GDDR6 Ventus 2X OC | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | MSI GeForce RTX 3050 6GB LP E 6G OC | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | MSI GeForce RTX 3050 6GB Ventus 2X 6G OC | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | MSI GeForce RTX 3050 6GB Ventus 2X E 6G OC | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | MSI GeForce RTX 3050 8GB GDDR6 Ventus 2X XS OC | 500 | — | 550 | 500 | — | 500 | -50 | — | 500 | -50 |
| RTX 3050 | MSI GeForce RTX 3050 8GB GDDR6 Ventus 2X XS OC | 500 | — | 550 | 500 | — | 500 | -50 | — | 500 | -50 |
| RTX 3050 | MSI GeForce RTX 3050 8GB Ventus 2X XS OC | 500 | — | 550 | 500 | — | 500 | -50 | — | 500 | -50 |
| RTX 3050 | Palit GeForce RTX 3050 6GB GDDR6 StormX | — | — | 550 | — | — | — | — | — | — | — |
| RTX 3050 | Palit GeForce RTX 3050 6GB GDDR6 StormX | — | — | 550 | — | — | — | — | — | — | — |
| RTX 3050 | Palit GeForce RTX 3050 6GB GDDR6 StormX | — | — | 550 | — | — | — | — | — | — | — |
| RTX 3050 | Palit GeForce RTX 3050 6GB StormX (Refresh) | 300 | — | 550 | 300 | — | 300 | -250 | — | 300 | -250 |
| RTX 3050 | Palit GeForce RTX 3050 8GB GDDR6 StormX | 550 | — | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RTX 3050 | Palit GeForce RTX 3050 StormX | 550 | — | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RTX 3050 | ZOTAC NVIDIA GEFORCE RTX3050 6GB GDDR6 RETAIL | — | — | 550 | — | — | — | — | — | — | — |
| RTX 3050 | ZOTAC NVIDIA GEFORCE RTX3050 GAMING ECO NVIDIA 8GB GDDR6 RETAIL | — | — | 550 | — | — | — | — | — | — | — |
| RTX 3050 | Zotac GeForce RTX 3050 6GB | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | Zotac GeForce RTX 3050 6GB GDDR6 | — | — | 550 | — | — | — | — | — | — | — |
| RTX 3050 | Zotac GeForce RTX 3050 6GB GDDR6 Solo | — | — | 550 | — | — | — | — | — | — | — |
| RTX 3050 | Zotac GeForce RTX 3050 6GB GDDR6 Twin Edge OC | — | — | 550 | — | — | — | — | — | — | — |
| RTX 3050 | Zotac GeForce RTX 3050 8GB ECO | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | Zotac GeForce RTX 3050 8GB Eco Solo | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | Zotac GeForce RTX 3050 8GB GDDR6 ECO | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | Zotac GeForce RTX 3050 8GB GDDR6 ECO | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | Zotac GeForce RTX 3050 8GB GDDR6 Eco Solo | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3050 | Zotac GeForce RTX 3050 8GB GDDR6 Eco Solo | 450 | — | 550 | 450 | — | 450 | -100 | — | 450 | -100 |
| RTX 3060 | ASUS VGA DUAL-RTX3060-O12G-V2, 12GB, GDDR6 | — | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | Asus GeForce RTX 3060 12GB | 650 | 550 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 3060 | Asus GeForce RTX 3060 12GB Dual V2 OC | 650 | 550 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 3060 | Asus GeForce RTX 3060 12GB GDDR6 Dual OC V2 | 650 | 550 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 3060 | Asus GeForce RTX 3060 12GB GDDR6 Dual V2 | — | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | Asus GeForce RTX 3060 12GB GDDR6 Dual V2 OC | 650 | 550 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 3060 | Biostar GeForce RTX 3060 12GB | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | GIGABYTE NVIDIA GEFORCE RTX 3060 12GB GDDR6 | — | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | Gainward GeForce RTX 3060 12GB GDDR6 Ghost OC | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | Gainward GeForce RTX 3060 12GB GDDR6 Python II OC | — | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | Gainward GeForce RTX 3060 12GB Ghost OC | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | Gigabyte GeForce RTX 3060 12GB GDDR6 Gaming OC | — | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | Gigabyte GeForce RTX 3060 12GB GDDR6 Gaming OC | — | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | Gigabyte GeForce RTX 3060 12GB GDDR6 Gaming OC Rev 2.0 | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | Gigabyte GeForce RTX 3060 12GB GDDR6 Gaming OC rev. 2.0 PCI-E x16 4.0… | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | Gigabyte GeForce RTX 3060 12GB GDDR6 Windforce OC | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | Gigabyte GeForce RTX 3060 12GB GDDR6 Windforce OC PCI-E x16 4.0 με 2 … | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | Gigabyte GeForce RTX 3060 12GB GDDR6 Windforce OC Rev.2.0 | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | Gigabyte GeForce RTX 3060 12GB Windforce OC | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | Gigabyte GeForce RTX 3060 8GB GDDR6 Gaming OC Rev 2.0 | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | Gigabyte GeForce RTX 3060 8GB GDDR6 Gaming OC Rev. 2.0 | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | Gigabyte GeForce RTX 3060 8GB GDDR6 Gaming OC V2 | — | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | Gigabyte GeForce RTX 3060 rev. 2.0 GAMING OC | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | Inno3D GeForce RTX 3060 12GB GDDR6 Twin X2 | — | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | MSI GeForce RTX 3060 12GB GDDR6 Ventus 2X OC | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | MSI GeForce RTX 3060 12GB Ventus 2X OC | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | Palit GeForce RTX 3060 12GB GDDR6 Infinity 2 OC | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | Palit GeForce RTX 3060 12GB GDDR6 Infinity 2 OC | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | Palit GeForce RTX 3060 12GB Infinity 2 OC | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | Zotac GeForce RTX 3060 12GB GDDR6 Twin Edge | — | 550 | 550 | 550 | 500 | 550 | 0 | 450 | 550 | 0 |
| RTX 3060 | Zotac GeForce RTX 3060 12GB GDDR6 Twin Edge OC | 600 | 550 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 3060 | Zotac GeForce RTX 3060 12GB Twin Edge OC | 600 | 550 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 3060 Ti | BIOSTAR NVIDIA GEFORCE RTX3060TI 8GB (N3606TM82) RETAIL | — | 600 | 600 | 600 | 550 | 600 | 0 | 450 | 600 | 0 |
| RTX 3060 Ti | Biostar GeForce RTX 3060 Ti 8GB | 600 | 600 | 600 | 600 | 550 | 600 | 0 | 450 | 600 | 0 |
| RTX 3060 Ti | Biostar GeForce RTX 3060 Ti 8GB GDDR6 | — | 600 | 600 | 600 | 550 | 600 | 0 | 450 | 600 | 0 |
| RTX 3060 Ti | Biostar GeForce RTX 3060 Ti 8GB GDDR6 | — | 600 | 600 | 600 | 550 | 600 | 0 | 450 | 600 | 0 |
| RTX 3060 Ti | Inno 3D GeForce RTX 3060 Ti 8GB GDDR6 Twin X2 OC LHR | — | 600 | 600 | 600 | 550 | 600 | 0 | 450 | 600 | 0 |
| RTX 3070 | BIOSTAR NVIDIA GEFORCE RTX3070 8 GB GDDR6 VN3706RM82 RETAIL | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RTX 3070 | Biostar GeForce RTX 3070 8GB | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RTX 3070 | Biostar GeForce RTX 3070 8GB GDDR6 | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RTX 3070 | Biostar GeForce RTX 3070 8GB GDDR6 LH | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RTX 3070 | Gigabyte GeForce RTX 3070 rev. 1.0 8GB Eagle OC LHR | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RTX 3070 Ti | Gigabyte GeForce RTX 3070 Ti 8GB GDDR6 PCI Express x16 4.0 RGB Lighti… | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 3070 Ti | Gigabyte GeForce RTX 3070 Ti 8GB GDDR6X Gaming OC | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 3070 Ti | Gigabyte GeForce RTX 3070 Ti rev. 1.0 8GB OC LHR | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 3070 Ti | MSI GeForce RTX 3070 Ti 8GB GDDR6X Gaming X Trio | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 3070 Ti | Palit GeForce RTX 3070 Ti 8GB GDDR6X GameRock | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RTX 3070 Ti | Palit GeForce RTX 3070 Ti 8GB GameRock | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RTX 3080 | BIOSTAR NVIDIA GEFORCE RTX3080 10GB (VN3816RMT3) RETAIL | — | 750 | 750 | 750 | — | 750 | 0 | — | 750 | 0 |
| RTX 3080 | Biostar GeForce RTX 3080 10GB Extreme Gaming VN3806 | 750 | 750 | 750 | 750 | — | 750 | 0 | — | 750 | 0 |
| RTX 3080 | Biostar GeForce RTX 3080 10GB Extreme Gaming VN3816 | 750 | 750 | 750 | 750 | — | 750 | 0 | — | 750 | 0 |
| RTX 3080 | Biostar GeForce RTX 3080 10GB GDDR6X Extreme Gaming | — | 750 | 750 | 750 | — | 750 | 0 | — | 750 | 0 |
| RTX 3080 | Biostar GeForce RTX 3080 10GB GDDR6X LHR | — | 750 | 750 | 750 | — | 750 | 0 | — | 750 | 0 |
| RTX 3090 | Gigabyte GeForce RTX 3090 24GB GDDR6X Turbo | 750 | 750 | 750 | 750 | 750 | 750 | 0 | 650 | 750 | 0 |
| RTX 3090 | Gigabyte GeForce RTX 3090 24GB Turbo | 750 | 750 | 750 | 750 | 750 | 750 | 0 | 650 | 750 | 0 |
| RTX 4060 | Asus GeForce RTX 4060 8GB Dual V2 OC Edition | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 350 | 550 | 0 |
| RTX 4060 | PALIT VGA GeForce RTX4060 Infinity 2 NE64060019P1-1070L 8GB GDDR6 128… | — | 550 | 550 | 550 | 450 | 550 | 0 | 350 | 550 | 0 |
| RTX 4060 Ti | Inno 3D GeForce RTX 4060 Ti 8GB ICHILL X3 | 550 | 550 | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RTX 4060 Ti | Inno3D GeForce RTX 4060 Ti 8GB GDDR6 iChill X3 | 550 | 550 | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RTX 4070 Ti | Gigabyte GeForce RTX 4070 Ti 12GB GDDR6X Aero OC | 750 | 700 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 4070 Ti | Gigabyte GeForce RTX 4070 Ti 12GB GDDR6X Gaming OC | 750 | 700 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 4070 Ti Super | Zotac GeForce RTX 4070 Ti Super 16GB GDDR6X Trinity Black Edition | — | 700 | 700 | 700 | 650 | 700 | 0 | 600 | 700 | 0 |
| RTX 4080 | MSI GeForce RTX 4080 16GB GDDR6X Suprim X | 850 | 750 | 850 | 850 | 700 | 850 | 0 | 650 | 850 | 0 |
| RTX 5050 | ASUS NVIDIA GEFORCE RTX5050 OC DUAL 8GB GDDR6 RETAIL | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | ASUS VGA DUAL-RTX5050-O8G, 8GB GDDR6 | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Asus GeForce RTX 5050 8 GB | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Asus GeForce RTX 5050 8GB Dual OC Edition | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Asus GeForce RTX 5050 8GB GDDR6 Dual OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Asus GeForce RTX 5050 8GB GDDR6 Dual OC Edition | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Asus GeForce RTX 5050 8GB GDDR6 Prime OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Asus GeForce RTX 5050 8GB GDDR6 Prime OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Asus GeForce RTX 5050 8GB Prime OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | GIGABYTE NVIDIA GEFORCE RTX 5050 GAMING OC 8GB GDDR6 RETAIL | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | GIGABYTE NVIDIA GEFORCE RTX5050 OC LOW PROFILE 8GB GDDR6 RETAIL | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Gainward GeForce RTX 5050 8GB GDDR6 Ghost | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Gainward GeForce RTX 5050 8GB GDDR6 Pegasus | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Gainward GeForce RTX 5050 8GB Ghost | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Gainward GeForce RTX 5050 8GB Pegasus | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Gigabyte GeForce RTX 5050 8GB D6 8G | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Gigabyte GeForce RTX 5050 8GB GDDR6 | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Gigabyte GeForce RTX 5050 8GB GDDR6 D6 8G | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Gigabyte GeForce RTX 5050 8GB GDDR6 Gaming OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Gigabyte GeForce RTX 5050 8GB GDDR6 Low Profile OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Gigabyte GeForce RTX 5050 8GB GDDR6 OC 8G | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Gigabyte GeForce RTX 5050 8GB GDDR6 OC Low Profile | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Gigabyte GeForce RTX 5050 8GB GDDR6 Windforce OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Gigabyte GeForce RTX 5050 8GB GDDR6 Windforce OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Gigabyte GeForce RTX 5050 8GB Gaming OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Gigabyte GeForce RTX 5050 8GB OC Low Profile | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Gigabyte GeForce RTX 5050 8GB Windforce OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Gigabyte GeForce RTX 5050 8GB Windforce OC V2 | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Gigabyte GeForce RTX 5050 OC 8G | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Gigabyte GeForce RTX 5050 Windforce OC 8G | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Inno 3D GeForce RTX 5050 8GB Twin X2 | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Inno3D GeForce RTX 5050 8GB GDDR6 Twin X2 | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | MSI GeForce RTX 5050 8GB GDDR6 | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | MSI GeForce RTX 5050 8GB GDDR6 Gaming OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | MSI GeForce RTX 5050 8GB GDDR6 Shadow 2X OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | MSI GeForce RTX 5050 8GB GDDR6 Ventus 2X OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | MSI GeForce RTX 5050 8GB GDDR6 Ventus 2X OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | MSI GeForce RTX 5050 8GB Gaming OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | MSI GeForce RTX 5050 8GB SHADOW 2X OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | MSI GeForce RTX 5050 8GB Ventus 2X OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | PNY GeForce RTX 5050 8GB Dual | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | PNY GeForce RTX 5050 8GB GDDR6 | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | PNY GeForce RTX 5050 8GB GDDR6 | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | PNY GeForce RTX 5050 8GB GDDR6 Dual | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | PNY GeForce RTX 5050 8GB Single | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Palit GeForce RTX 5050 8GB Dual | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Palit GeForce RTX 5050 8GB GDDR6 Dual | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Palit GeForce RTX 5050 8GB GDDR6 StormX | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Palit GeForce RTX 5050 8GB StormX | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Zotac GeForce RTX 5050 8GB GDDR6 Low Profile | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Zotac GeForce RTX 5050 8GB GDDR6 Low Profile | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Zotac GeForce RTX 5050 8GB GDDR6 Twin Edge | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Zotac GeForce RTX 5050 8GB GDDR6 Twin Edge | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Zotac GeForce RTX 5050 8GB GDDR6 Twin Edge OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Zotac GeForce RTX 5050 8GB GDDR6 Twin Edge OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Zotac GeForce RTX 5050 8GB GDDR6 Twin Edge White OC | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Zotac GeForce RTX 5050 8GB Low Profile | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Zotac GeForce RTX 5050 8GB Twin Edge | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Zotac GeForce RTX 5050 8GB Twin Edge OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5050 | Zotac GeForce RTX 5050 8GB Twin Edge White | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | ASUS DUAL OC NVIDIA GEFORCE RTX5060 8GB GDDR7 RETAIL | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | ASUS VGA DUAL-RTX5060-O8G-WHITE, 8GB, GDDR7 | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Asus GeForce RTX 5060 8GB DUAL OC Advanced | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Asus GeForce RTX 5060 8GB Dual OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Asus GeForce RTX 5060 8GB Dual White OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Asus GeForce RTX 5060 8GB GDDR7 DUAL OC Advanced | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Asus GeForce RTX 5060 8GB GDDR7 Dual OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Asus GeForce RTX 5060 8GB GDDR7 Dual OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Asus GeForce RTX 5060 8GB GDDR7 Dual OC Advanced | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Asus GeForce RTX 5060 8GB GDDR7 Dual White OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Asus GeForce RTX 5060 8GB GDDR7 Dual White OC Graphics Card | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Asus GeForce RTX 5060 8GB GDDR7 LP BRK OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Asus GeForce RTX 5060 8GB GDDR7 LP BRK OC Edition | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Asus GeForce RTX 5060 8GB GDDR7 Prime OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Asus GeForce RTX 5060 8GB GDDR7 Prime OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Asus GeForce RTX 5060 8GB GDDR7 TUF Gaming OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Asus GeForce RTX 5060 8GB GDDR7 TUF Gaming OC Edition | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Asus GeForce RTX 5060 8GB LP BRK OC Edition | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Asus GeForce RTX 5060 8GB Prime OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Asus GeForce RTX 5060 8GB TUF Gaming OC Edition | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | GIGABYTE GEFORCE RTX 5060 EAGLE OC ICE 8GB GDDR7 RETAIL | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | GIGABYTE GEFORCE RTX 5060 GAMING OC 8GB GDDR7 RETAIL | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | GIGABYTE NVIDIA GEFORCE RTX 5060 EAGLE MAX OC 8GB GDDR7 RETAIL | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | GIGABYTE NVIDIA GEFORCE RTX5060 WINDFORCE MAX OC 8GB GDDR7 | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | GIGABYTE VGA GV-N5060EAGLEOC ICE-8GD, 8GB, GDDR7 | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | GIGABYTE VGA GV-N5060GAMING OC-8GD, 8GB, GDDR7 | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | GIGABYTE VGA GV-N5060WF2MAX OC-8GD , 8GB, GDDR7 | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | GIGABYTE VGA GV-N5060WF2OC-8GD, 8GB, GDDR7 | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gainward GeForce RTX 5060 8GB GDDR7 | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gainward GeForce RTX 5060 8GB GDDR7 Ghost | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gainward GeForce RTX 5060 8GB GDDR7 Ghost OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gainward GeForce RTX 5060 8GB GDDR7 NE75060S19P1-GB2063B | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gainward GeForce RTX 5060 8GB Ghost | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gainward GeForce RTX 5060 8GB Ghost OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB Aero OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB Eagle MAX OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB Eagle OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB Eagle OC Ice | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB GAMING OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB GDDR7 Aero OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB GDDR7 Aero OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB GDDR7 Eagle MAX OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB GDDR7 Eagle MAX OC Graphics Card | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB GDDR7 Eagle Max OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB GDDR7 Eagle OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB GDDR7 Eagle OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB GDDR7 Eagle OC Ice | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB GDDR7 Eagle OC Ice | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB GDDR7 GAMING OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB GDDR7 Gaming OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB GDDR7 Gaming OC V2 | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB GDDR7 Low Profile OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB GDDR7 OC Low Profile 8G | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB GDDR7 Windforce Max OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB GDDR7 Windforce Max OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB GDDR7 Windforce Max OC V2 | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB GDDR7 Windforce OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB GDDR7 Windforce OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB OC Low Profile 8G | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB Windforce Max OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 8GB Windforce OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 Eagle OC 8GB | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 OC 8G | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 VGA GV-N5060WF2OC-8GD/8GB/GDDR7 | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 Windforce Max OC 8GB | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Gigabyte GeForce RTX 5060 rev. 2.0 8GB GAMING OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | INNO3D NVIDIA GEFORCE RTX 5060 TWIN X2 OC 8GB GDDR7 RETAIL | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Inno 3D GeForce RTX 5060 8GB | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Inno 3D GeForce RTX 5060 8GB GDDR7 | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Inno 3D GeForce RTX 5060 8GB GDDR7 Twin X2 | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Inno 3D GeForce RTX 5060 8GB GDDR7 Twin X2 OC V2 | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Inno 3D GeForce RTX 5060 8GB TWIN X2 OC White | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Inno 3D GeForce RTX 5060 8GB Twin X2 | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Inno 3D GeForce RTX 5060 8GB Twin X2 OC V2 | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Inno3D GeForce RTX 5060 8GB GDDR7 Low Profile | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Inno3D GeForce RTX 5060 8GB GDDR7 Twin X2 | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Inno3D GeForce RTX 5060 8GB GDDR7 Twin X2 OC V2 | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Inno3D GeForce RTX 5060 8GB GDDR7 Twin X2 OC White | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Lenovo GeForce RTX 5060 8GB | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Lenovo GeForce RTX 5060 8GB GDDR7 | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Lenovo GeForce RTX 5060 8GB GDDR7 | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | MSI GeForce RTX 5060 8GB 8G GAMING OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | MSI GeForce RTX 5060 8GB 8G INSPIRE ITX OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | MSI GeForce RTX 5060 8GB 8G SHADOW 2X OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | MSI GeForce RTX 5060 8GB GDDR7 8G GAMING OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | MSI GeForce RTX 5060 8GB GDDR7 8G SHADOW 2X OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | MSI GeForce RTX 5060 8GB GDDR7 Gaming OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | MSI GeForce RTX 5060 8GB GDDR7 Inspite ITX OC | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | MSI GeForce RTX 5060 8GB GDDR7 Shadow 2X OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | MSI GeForce RTX 5060 8GB GDDR7 Ventus 2X OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | MSI GeForce RTX 5060 8GB GDDR7 Ventus 2X OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | MSI GeForce RTX 5060 8GB GDDR7 Ventus 2X OC White | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | MSI GeForce RTX 5060 8GB GDDR7 Ventus 2X OC White | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | MSI GeForce RTX 5060 8GB GDDR7 Ventus 3X OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | MSI GeForce RTX 5060 8GB GDDR7 Ventus 3X OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | MSI GeForce RTX 5060 8GB Shadow 2x OC Max | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | MSI GeForce RTX 5060 8GB Ventus 2X OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | MSI GeForce RTX 5060 8GB Ventus 2X OC White | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | MSI GeForce RTX 5060 8GB Ventus 3X OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | MSI GeForce RTX 5060 rev. 1.0 8GB GDDR7 Ventus 2X OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | MSI GeForce RTX 5060 rev. 1.0 8GB Ventus 2X OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | MSI RTX 5060 GAMING OC 8GB GDDR7 RETAIL | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | PNY GeForce RTX 5060 8GB Dual Fan | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | PNY GeForce RTX 5060 8GB Dual Fan OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | PNY GeForce RTX 5060 8GB GDDR7 | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | PNY GeForce RTX 5060 8GB GDDR7 Dual Fan OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | PNY GeForce RTX 5060 8GB GDDR7 OC | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | PNY GeForce RTX 5060 8GB GDDR7 Single Fan | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | PNY GeForce RTX 5060 8GB GDDR7 Single Fan | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | PNY GeForce RTX 5060 8GB Single Fan | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Palit GeForce RTX 5060 8GB Dual | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Palit GeForce RTX 5060 8GB Dual OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Palit GeForce RTX 5060 8GB GDDR7 Dual | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Palit GeForce RTX 5060 8GB GDDR7 Dual OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Palit GeForce RTX 5060 8GB GDDR7 Dual OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Palit GeForce RTX 5060 8GB GDDR7 Infinity 2 OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Palit GeForce RTX 5060 8GB GDDR7 Infinity 2 OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Palit GeForce RTX 5060 8GB GDDR7 White OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Palit GeForce RTX 5060 8GB Infinity 2 OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Palit GeForce RTX 5060 8GB White OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | ZOTAC GAMING NVIDIA GEFORCE RTX 5060 AMP 8GB GDDR7 RETAIL | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | ZOTAC GAMING RTX 5060 TWIN EDGE 8GB GDDR7 RETAIL | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | ZOTAC GAMING RTX 5060 TWIN EDGE OC WHITE EDITION 8GB GDDR7 RETAIL | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Zotac GeForce RTX 5060 8GB AMP | 600 | 550 | 600 | 600 | 450 | 600 | 0 | 400 | 600 | 0 |
| RTX 5060 | Zotac GeForce RTX 5060 8GB GDDR7 AMP | 600 | 550 | 600 | 600 | 450 | 600 | 0 | 400 | 600 | 0 |
| RTX 5060 | Zotac GeForce RTX 5060 8GB GDDR7 AMP | 600 | 550 | 600 | 600 | 450 | 600 | 0 | 400 | 600 | 0 |
| RTX 5060 | Zotac GeForce RTX 5060 8GB GDDR7 AMP Core | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Zotac GeForce RTX 5060 8GB GDDR7 Twin Edge | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Zotac GeForce RTX 5060 8GB GDDR7 Twin Edge | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Zotac GeForce RTX 5060 8GB GDDR7 Twin Edge OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Zotac GeForce RTX 5060 8GB GDDR7 Twin Edge OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Zotac GeForce RTX 5060 8GB GDDR7 Twin Edge OC White | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Zotac GeForce RTX 5060 8GB GDDR7 Twin Edge OC White | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Zotac GeForce RTX 5060 8GB GDDR7 Twin Edge Plus | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Zotac GeForce RTX 5060 8GB GDDR7 Twin Edge Plus | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Zotac GeForce RTX 5060 8GB Twin Edge | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Zotac GeForce RTX 5060 8GB Twin Edge OC | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Zotac GeForce RTX 5060 8GB Twin Edge OC White | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 | Zotac GeForce RTX 5060 8GB Twin Edge Plus | 550 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RTX 5060 Ti | ASUS DUAL RTX5060TI-O8G NVIDIA GEFORCE RTX 5060TI 8GB OC GDDR7 RETAIL | 550 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | ASUS NVIDIA GEFORCE DUAL RTX 5060TI 16GB GDDR7 RETAIL | 550 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | ASUS PRIME NVIDIA GEFORCE RTX 5060TI OC 16GB GDDR7 TRIPLE FAN RETAIL | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | ASUS VGA DUAL-RTX5060TI-016G, 16GB, GDDR7 | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Asus GeForce RTX 5060 Ti | 550 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Asus GeForce RTX 5060 Ti | 550 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Asus GeForce RTX 5060 Ti 16GB Dual White OC | 550 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Asus GeForce RTX 5060 Ti 16GB GDDR7 | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Asus GeForce RTX 5060 Ti 16GB GDDR7 Dual OC | 550 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Asus GeForce RTX 5060 Ti 16GB GDDR7 Prime OC | 550 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Asus GeForce RTX 5060 Ti 16GB GDDR7 Prime OC | 550 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Asus GeForce RTX 5060 Ti 16GB GDDR7 TUF Gaming OC | 550 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Asus GeForce RTX 5060 Ti 16GB TUF Gaming OC | 550 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Asus GeForce RTX 5060 Ti 8GB GDDR7 Dual OC | 550 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Asus GeForce RTX 5060 Ti 8GB GDDR7 Dual OC | 550 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Asus GeForce RTX 5060 Ti 8GB GDDR7 T1 OC | 550 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Asus GeForce RTX 5060 Ti 8GB T1 OC Edition | 550 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Asus GeForce RTX 5060 Ti Dual OC | 550 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | GIGABYTE GEFORCE RTX 5060 TI WINDFORCE OC 16GB GDDR7 RETAIL | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | GIGABYTE GEFORCE RTX 5060TI AERO OC 8GB GDDR7 RETAIL | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | GIGABYTE GEFORCE RTX 5060TI EAGLE OC ICE 8GB GDDR7 RETAIL | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | GIGABYTE GEFORCE RTX 5060TI GAMING OC 8GB GDDR7 RETAIL | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | GIGABYTE GEFORCE RTX 5060TI WINDFORCE OC 8GB GDDR7 RETAIL | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | GIGABYTE NVIDIA GEFORCE RTX 5060 TI WINDFORCE 8GB GDDR7 RETAIL | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | GIGABYTE NVIDIA GEFORCE RTX 5060 TI WINDFORCE MAX OC 16GB GDDR7 RETAIL | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | GIGABYTE RTX 5060TI EAGLE MAX OC 16GB GDDR7 | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | GIGABYTE VGA GV-N506TWF2-8GD, 8GB, GDDR7 | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | GIGABYTE VGA GV-N506TWF2OC-8GD, 8GB, GDDR7 | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gainward GeForce RTX 5060 Ti 16GB GDDR7 Ghost II OC | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Gainward GeForce RTX 5060 Ti 16GB GDDR7 Ghost OC | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Gainward GeForce RTX 5060 Ti 16GB GDDR7 Python III | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Gainward GeForce RTX 5060 Ti 16GB GDDR7 Python III | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Gainward GeForce RTX 5060 Ti 16GB GDDR7 Python III OC | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Gainward GeForce RTX 5060 Ti 16GB GDDR7 Python III OC Graphics Card | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Gainward GeForce RTX 5060 Ti 16GB Python III OC | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Gainward GeForce RTX 5060 Ti 8GB GDDR7 Ghost | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Gainward GeForce RTX 5060 Ti 8GB GDDR7 Ghost OC | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Gainward GeForce RTX 5060 Ti 8GB GDDR7 Ghost OC | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Gainward GeForce RTX 5060 Ti 8GB GDDR7 Python III | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Gainward GeForce RTX 5060 Ti 8GB Ghost | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Gainward GeForce RTX 5060 Ti Ghost OC | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Gainward GeForce RTX 5060 Ti Python III | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 16GB AI BOX | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 16GB GDDR7 AI BOX | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 16GB GDDR7 AI Box | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 16GB GDDR7 Aero OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 16GB GDDR7 Aero OC White | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 16GB GDDR7 EAGLE MAX OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 16GB GDDR7 Eagle Ice OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 16GB GDDR7 Eagle Max OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 16GB GDDR7 Eagle OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 16GB GDDR7 Eagle OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 16GB GDDR7 Eagle OC ICE | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 16GB GDDR7 Gaming OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 16GB GDDR7 Gaming OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 16GB GDDR7 Windforce Max OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 16GB GDDR7 Windforce Max OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 16GB GDDR7 Windforce Max OC Graphics Card | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 16GB GDDR7 Windforce OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 16GB GDDR7 Windforce OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 8GB GDDR7 | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 8GB GDDR7 Aero OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 8GB GDDR7 Aero OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 8GB GDDR7 EAGLE MAX OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 8GB GDDR7 Eagle Ice OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 8GB GDDR7 Eagle Max OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 8GB GDDR7 Eagle OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 8GB GDDR7 Eagle OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 8GB GDDR7 Gaming OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 8GB GDDR7 Gaming OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 8GB GDDR7 Windforce | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 8GB GDDR7 Windforce | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 8GB GDDR7 Windforce Max OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 8GB GDDR7 Windforce Max OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 8GB GDDR7 Windforce OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 8GB GDDR7 Windforce OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti 8GB Windforce | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti Aero OC White | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti EAGLE MAX OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti Eagle OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti Eagle OC Ice | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti GAMING OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti VGA GV-N506TWF2-8GD/8GB/GDDR7 | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti Windforce Max OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Gigabyte GeForce RTX 5060 Ti Windforce OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | INNO3D GEFORCE RTX 5060TI TWIN X2 NVIDIA 8GB GDDR7 RETAIL | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | INNO3D GEFORCE RTX 5060TI TWIN X2 OC NVIDIA 8GB GDDR7 RETAIL | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | INNO3D NVIDIA GEFORCE RTX 5060 TI TWIN X2 OC 16GB GDDR7 RETAIL | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | INNO3D NVIDIA GEFORCE RTX 5060 TI X3 OC 16GB GDDR7 RETAIL | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Inno 3D GeForce RTX 5060 Ti 16GB GDDR7 Twin X2 | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Inno 3D GeForce RTX 5060 Ti 16GB GDDR7 Twin X2 OC | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Inno 3D GeForce RTX 5060 Ti 8GB GDDR7 Twin X2 | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Inno 3D GeForce RTX 5060 Ti 8GB GDDR7 Twin X2 OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Inno 3D GeForce RTX 5060 Ti 8GB GDDR7 X3 OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Inno 3D GeForce RTX 5060 Ti 8GB X3 OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Inno 3D GeForce RTX 5060 Ti TWIN X2 OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Inno 3D GeForce RTX 5060 Ti Twin X2 | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Inno 3D GeForce RTX 5060 Ti Twin X2 OC White | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Inno3D GeForce RTX 5060 Ti 16GB GDDR7 Twin X2 | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Inno3D GeForce RTX 5060 Ti 16GB GDDR7 Twin X2 OC | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Inno3D GeForce RTX 5060 Ti 8GB GDDR7 Twin X2 | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Inno3D GeForce RTX 5060 Ti 8GB GDDR7 Twin X2 OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Inno3D GeForce RTX 5060 Ti 8GB GDDR7 Twin X2 OC White | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | Inno3D GeForce RTX 5060 Ti 8GB GDDR7 X3 OC | 650 | 600 | 650 | 650 | 500 | 650 | 0 | 450 | 650 | 0 |
| RTX 5060 Ti | MSI GeForce RTX 5060 Ti 16GB GDDR7 Gaming Trio | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI GeForce RTX 5060 Ti 16GB GDDR7 Gaming Trio OC White | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI GeForce RTX 5060 Ti 16GB GDDR7 Gaming Trio OC White | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI GeForce RTX 5060 Ti 16GB GDDR7 Ventus 2X OC Plus | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI GeForce RTX 5060 Ti 16GB GDDR7 Ventus 2X OC Plus | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI GeForce RTX 5060 Ti 16GB GDDR7 Ventus 2X OC White Plus | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI GeForce RTX 5060 Ti 16GB GDDR7 Ventus 3X OC | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI GeForce RTX 5060 Ti 16GB Gaming OC | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI GeForce RTX 5060 Ti 16GB Gaming Trio OC White | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI GeForce RTX 5060 Ti 16GB Ventus 2X OC | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI GeForce RTX 5060 Ti 8GB GDDR7 Gaming Trio OC | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI GeForce RTX 5060 Ti 8GB GDDR7 Gaming Trio OC | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI GeForce RTX 5060 Ti 8GB GDDR7 SHADOW 2X OC PLUS | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI GeForce RTX 5060 Ti 8GB GDDR7 Shadow 2X Oc Plus | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI GeForce RTX 5060 Ti 8GB GDDR7 Ventus 2X OC Plus | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI GeForce RTX 5060 Ti 8GB GDDR7 Ventus 2X OC Plus | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI GeForce RTX 5060 Ti 8GB GDDR7 Ventus 2X OC Plus 602-V536-07S | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI GeForce RTX 5060 Ti 8GB Gaming Trio OC | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI GeForce RTX 5060 Ti 8GB OC | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI GeForce RTX 5060 Ti 8GB Shadow 3X OC CLASSIC | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI GeForce RTX 5060 Ti 8GB Ventus 3X OC | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI GeForce RTX 5060 Ti SHADOW 2X OC PLUS | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI GeForce RTX 5060 Ti Ventus 2X OC Plus | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI NVIDIA GEFORCE RTX 5060 TI 8G GAMING TRIO OC 8GB GDDR7 | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI NVIDIA GEFORCE RTX 5060TI VENTUS 2X OC PLUS 8GB GDDR7 | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | MSI VENTUS GEFORCE RTX 5060TI 2X OC PLUS 16GB GDDR7 RETAIL | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | PNY GeForce RTX 5060 Ti 16GB GDDR7 Dual Fan OC | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | PNY GeForce RTX 5060 Ti 16GB GDDR7 OC | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | PNY GeForce RTX 5060 Ti 8GB Dual Fan | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | PNY GeForce RTX 5060 Ti 8GB EPIC-X RGB OC TRIPLE FAN | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | PNY GeForce RTX 5060 Ti 8GB GDDR7 | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | PNY GeForce RTX 5060 Ti 8GB GDDR7 Dual Fan | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | PNY GeForce RTX 5060 Ti 8GB GDDR7 Dual Fan OC | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | PNY GeForce RTX 5060 Ti 8GB GDDR7 EPIC-X RGB OC TRIPLE FAN | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | PNY GeForce RTX 5060 Ti 8GB GDDR7 OC | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | PNY GeForce RTX 5060 Ti Dual Fan OC | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Palit GeForce RTX 5060 Ti 16GB GDDR7 Infinity 3 | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Palit GeForce RTX 5060 Ti 16GB GDDR7 Infinity 3 | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Palit GeForce RTX 5060 Ti 16GB GDDR7 Infinity 3 OC | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Palit GeForce RTX 5060 Ti 16GB GDDR7 Infinity 3 OC | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Palit GeForce RTX 5060 Ti 16GB GDDR7 White OC | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Palit GeForce RTX 5060 Ti 16GB GDDR7 White OC | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Palit GeForce RTX 5060 Ti 16GB Infinity 3 | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Palit GeForce RTX 5060 Ti 16GB Infinity 3 OC | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Palit GeForce RTX 5060 Ti 8GB Dual | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Palit GeForce RTX 5060 Ti 8GB Dual OC | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Palit GeForce RTX 5060 Ti 8GB GDDR7 Dual | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Palit GeForce RTX 5060 Ti 8GB GDDR7 Dual | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Palit GeForce RTX 5060 Ti 8GB GDDR7 Dual OC | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Palit GeForce RTX 5060 Ti 8GB GDDR7 Dual OC | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Palit GeForce RTX 5060 Ti 8GB GDDR7 Ghost | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Palit GeForce RTX 5060 Ti 8GB GDDR7 Graphics Card | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Palit GeForce RTX 5060 Ti 8GB GDDR7 White OC | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Palit GeForce RTX 5060 Ti White OC | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | ZOTAC GAMING GEFORCE RTX 5060TI TWIN EDGE NVIDIA 8GB GDDR7 RETAIL | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | ZOTAC GAMING GEFORCE RTX 5060TI TWIN EDGE OC NVIDIA 16GB GDDR7 RETAIL | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | ZOTAC GAMING NVIDIA GEFORCE RTX5060 TI TWIN EDGE OC 8GB GDDR7 RETAIL | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Zotac GeForce RTX 5060 Ti 16GB GDDR7 AMP | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Zotac GeForce RTX 5060 Ti 16GB GDDR7 AMP | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Zotac GeForce RTX 5060 Ti 16GB GDDR7 Twin Edge | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Zotac GeForce RTX 5060 Ti 16GB GDDR7 Twin Edge | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Zotac GeForce RTX 5060 Ti 16GB GDDR7 Twin Edge OC | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Zotac GeForce RTX 5060 Ti 16GB GDDR7 Twin Edge OC | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Zotac GeForce RTX 5060 Ti 16GB GDDR7 Twin Edge OC White | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Zotac GeForce RTX 5060 Ti 16GB GDDR7 Twin Edge OC White | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Zotac GeForce RTX 5060 Ti 16GB Twin Edge OC White | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Zotac GeForce RTX 5060 Ti 8GB GDDR7 AMP | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Zotac GeForce RTX 5060 Ti 8GB GDDR7 AMP | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Zotac GeForce RTX 5060 Ti 8GB GDDR7 Twin Edge | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Zotac GeForce RTX 5060 Ti 8GB GDDR7 Twin Edge | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Zotac GeForce RTX 5060 Ti 8GB GDDR7 Twin Edge OC | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Zotac GeForce RTX 5060 Ti 8GB GDDR7 Twin Edge OC | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Zotac GeForce RTX 5060 Ti 8GB GDDR7 Twin Edge OC White | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Zotac GeForce RTX 5060 Ti 8GB GDDR7 Twin Edge OC White Edition | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Zotac GeForce RTX 5060 Ti 8GB Twin Edge OC White Edition | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Zotac GeForce RTX 5060 Ti AMP | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Zotac GeForce RTX 5060 Ti Twin Edge | 600 | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5060 Ti | Zotac GeForce RTX 5060 Ti Twin Edge OC | — | 600 | 600 | 600 | 500 | 600 | 0 | 450 | 600 | 0 |
| RTX 5070 | ASUS NVIDIA GEFORCE RTX 5070 DUAL OC 12GB GDDR7 RETAIL | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | ASUS VGA PRIME-RTX5070-O12G-WHITE, 12GB, GDDR7 | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Asus GeForce RTX 5070 12GB | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Asus GeForce RTX 5070 12GB Dual OC Edition | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Asus GeForce RTX 5070 12GB GDDR7 Dual OC | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Asus GeForce RTX 5070 12GB GDDR7 Dual OC Edition | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Asus GeForce RTX 5070 12GB GDDR7 Prime OC | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Asus GeForce RTX 5070 12GB GDDR7 Prime OC | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Asus GeForce RTX 5070 12GB GDDR7 Prime OC White OC | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Asus GeForce RTX 5070 12GB GDDR7 Prime White OC | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Asus GeForce RTX 5070 12GB GDDR7 TUF Gaming OC | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Asus GeForce RTX 5070 12GB GDDR7 TUF Gaming OC | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Asus GeForce RTX 5070 12GB TUF Gaming OC | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | GIGABYTE GEFORCE RTX 5070 AERO OC 12GB | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | GIGABYTE GEFORCE RTX 5070 AORUS MASTER 12GB GDDR7 | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | GIGABYTE NVIDIA GEFORCE RTX 5070 12GB EAGLE OC PCI-E RETAIL | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | GIGABYTE NVIDIA GEFORCE RTX 5070 12GB GAMING OC PCI-E RETAIL | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | GIGABYTE NVIDIA GEFORCE RTX 5070 EAGLE OC ICE SFF 12GB GDDR7 | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | GIGABYTE VGA GV-N5070AORUS M-12GD , 12GB , GDDR7 | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | GIGABYTE VGA GV-N5070GAMING OC-12GD , 12GB , GDDR7 | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Gainward GeForce RTX 5070 12GB GDDR7 Python III | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Gainward GeForce RTX 5070 12GB GDDR7 Python III OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Gainward GeForce RTX 5070 12GB GDDR7 Python III OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Gainward GeForce RTX 5070 12GB Python III | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Gainward GeForce RTX 5070 12GB Python III OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Gigabyte Aorus GeForce RTX 5070 12GB GDDR7 Master | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Gigabyte GV-N5070GAMING OC GeForce RTX 5070 12GB | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 12GB Aero OC | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 12GB Aorus Infinity | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 12GB Aorus Master | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 12GB EAGLE OC ICE SFF 12G | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 12GB EAGLE OC SFF 12G | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 12GB GAMING OC | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 12GB GDDR7 Aero OC | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 12GB GDDR7 Aero OC | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 12GB GDDR7 Aorus Infinity | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 12GB GDDR7 Aorus Master | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 12GB GDDR7 EAGLE OC ICE SFF 12G | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 12GB GDDR7 Eagle OC | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 12GB GDDR7 Eagle OC Ice | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 12GB GDDR7 Gaming OC | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 12GB GDDR7 Gaming OC | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 12GB GDDR7 Windforce OC | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 12GB GDDR7 Windforce OC SFF | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 12GB Windforce OC SFF | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 Aero 12GB OC | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 Gaming 12GB OC | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 Gaming 16GB GDDR7 OC GV-N5070GAMING-OC-12GD | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 Gaming 16GB OC | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 VGA 12GB Aero OC GDDR7 | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 VGA GV-N5070AORUS M-12GD/12GB/GDDR7 | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Gigabyte GeForce RTX 5070 VGA GV-N5070GAMING OC-12GD/12GB/GDDR7 | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Gigabyte VGA GV-N5070AERO OC-12GD GeForce RTX 5070 12GB | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Gigabyte VGA GV-N5070EAGLEOC ICE-12GD GeForce RTX 5070 12GB | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Inno 3D GeForce RTX 5070 12GB GDDR7 Twin X2 | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Inno 3D GeForce RTX 5070 12GB GDDR7 Twin X2 OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Inno 3D GeForce RTX 5070 12GB TWIN X2 OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Inno 3D GeForce RTX 5070 12GB Twin X2 | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Inno 3D GeForce RTX 5070 12GB iChill X3 | 750 | 650 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RTX 5070 | Inno3D GeForce RTX 5070 12GB GDDR7 Twin X2 | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Inno3D GeForce RTX 5070 12GB GDDR7 Twin X2 OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Inno3D GeForce RTX 5070 12GB GDDR7 Twin X2 OC White | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Lenovo GeForce RTX 5070 12GB | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Lenovo GeForce RTX 5070 12GB GDDR7 | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Lenovo GeForce RTX 5070 12GB GDDR7 | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | MSI 912-V532-005 GeForce RTX 5070 12GB | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | MSI GeForce RTX 5070 12GB GDDR7 Gaming Trio OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | MSI GeForce RTX 5070 12GB GDDR7 Gaming Trio OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | MSI GeForce RTX 5070 12GB GDDR7 Shadow 2X OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | MSI GeForce RTX 5070 12GB GDDR7 Shadow 2X OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | MSI GeForce RTX 5070 12GB GDDR7 Ventus 2X OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | MSI GeForce RTX 5070 12GB GDDR7 Ventus 2X OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | MSI GeForce RTX 5070 12GB GDDR7 Ventus 3X OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | MSI GeForce RTX 5070 12GB Gaming Trio OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | MSI GeForce RTX 5070 12GB Shadow 2X OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | MSI GeForce RTX 5070 12GB Shadow 3X OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | MSI GeForce RTX 5070 12GB Ventus 2X OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | MSI GeForce RTX 5070 12GB Ventus 2X OC White | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | MSI GeForce RTX 5070 12GB Ventus 3X OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | MSI RTX 5070 VENTUS 2X OC 12GB GDDR7 RETAIL | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | PNY GeForce RTX 5070 12GB ARGB EPIC-X RGB OC Triple Fan | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | PNY GeForce RTX 5070 12GB Dual Slim OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | PNY GeForce RTX 5070 12GB GDDR7 | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | PNY GeForce RTX 5070 12GB GDDR7 ARGB EPIC-X RGB OC Triple Fan | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | PNY GeForce RTX 5070 12GB GDDR7 Slim OC | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | PNY GeForce RTX 5070 12GB GDDR7 VERTO OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | PNY GeForce RTX 5070 12GB GDDR7 Verto Epic-X ARGB OC | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | PNY GeForce RTX 5070 12GB VERTO OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | PNY NVIDIA GEFORCE RTX 5070 EPIC-X RGB OC 12GB GDDR7 | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | PNY NVIDIA GEFORCE RTX 5070 SLIM OC 12GB GDDR7 RETAIL | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Palit GeForce RTX 5070 12GB GDDR7 Infinity 3 | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Palit GeForce RTX 5070 12GB GDDR7 Infinity 3 Black | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Palit GeForce RTX 5070 12GB GDDR7 Infinity 3 OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Palit GeForce RTX 5070 12GB GDDR7 Infinity 3 OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Palit GeForce RTX 5070 12GB GDDR7 Python III | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Palit GeForce RTX 5070 12GB Infinity 3 | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Palit GeForce RTX 5070 12GB Infinity 3 OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | ZOTAC GAMING GEFORCE RTX 5070 SOLID OC NVIDIA 12GB GDDR7 RETAIL | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | ZOTAC GAMING RTX 5070 TWIN EDGE OC WHITE EDITION 12GB GDDR7 RETAIL | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | ZOTAC NVIDIA GEFORCE RTX 5070 GAMING TWIN EDGE 12GB GDDR7 RETAIL | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | ZOTAC NVIDIA GEFORCE RTX 5070 GAMING TWIN EDGE OC 12GB GDDR7 | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Zotac GeForce RTX 5070 12GB AMP White Edition | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Zotac GeForce RTX 5070 12GB GDDR7 AMP White Edition | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Zotac GeForce RTX 5070 12GB GDDR7 AMP White Edition | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Zotac GeForce RTX 5070 12GB GDDR7 SOLID OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Zotac GeForce RTX 5070 12GB GDDR7 Solid | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Zotac GeForce RTX 5070 12GB GDDR7 Solid OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Zotac GeForce RTX 5070 12GB GDDR7 Twin Edge | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Zotac GeForce RTX 5070 12GB GDDR7 Twin Edge | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Zotac GeForce RTX 5070 12GB GDDR7 Twin Edge OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Zotac GeForce RTX 5070 12GB GDDR7 Twin Edge OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Zotac GeForce RTX 5070 12GB GDDR7 Twin Edge OC White | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Zotac GeForce RTX 5070 12GB GDDR7 Twin Edge OC White Edition | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Zotac GeForce RTX 5070 12GB Solid OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Zotac GeForce RTX 5070 12GB Twin Edge | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Zotac GeForce RTX 5070 12GB Twin Edge OC | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 | Zotac GeForce RTX 5070 12GB Twin Edge OC White Edition | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RTX 5070 Ti | Asus GeForce RTX 5070 Ti 16GB GDDR7 Prime OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Asus GeForce RTX 5070 Ti 16GB GDDR7 Prime OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Asus GeForce RTX 5070 Ti 16GB GDDR7 ProArt OC | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RTX 5070 Ti | Asus GeForce RTX 5070 Ti 16GB GDDR7 ProArt OC Edition | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RTX 5070 Ti | Asus GeForce RTX 5070 Ti 16GB GDDR7 ROG Strix OC | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RTX 5070 Ti | Asus GeForce RTX 5070 Ti 16GB GDDR7 TUF Gaming OC | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RTX 5070 Ti | Asus GeForce RTX 5070 Ti 16GB GDDR7 TUF Gaming OC | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RTX 5070 Ti | Asus GeForce RTX 5070 Ti 16GB Prime OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Asus GeForce RTX 5070 Ti 16GB ProArt OC Edition | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RTX 5070 Ti | Asus GeForce RTX 5070 Ti 16GB ROG Strix OC Edition | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RTX 5070 Ti | Asus GeForce RTX 5070 Ti 16GB TUF Gaming OC | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RTX 5070 Ti | GAINWARD NVIDIA GEFORCE RTX 5070 TI PHOENIX-S 16GB GDDR7 RETAIL | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | GIGABYTE GEFORCE RTX 5070TI 16GB GDDR7 AERO OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | GIGABYTE GEFORCE RTX 5070TI 16GB GDDR7 EAGLE OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | GIGABYTE GEFORCE RTX 5070TI GDDR7 16GB GAMING OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | GIGABYTE NVIDIA GEFORCE RTX 5070 TI WINDFORCE 3 OC SFF 16GB GDDR7 RET… | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | GIGABYTE NVIDIA GEFORCE RTX 5070TI 16GB AORUS WINDFORCE OC PCI-E RETA… | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | GIGABYTE VGA GV-N507TAORUS M-16GD , 16GB , GDDR7 | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | GIGABYTE VGA GV-N507TGAMING OC-16GD , 16GB , GDDR7 | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | GIGABYTE VGA GV-N507TWF3OC-16GD , 16GB , GDDR7 | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gainward GeForce RTX 5070 Ti 16GB GDDR7 Phoenix-S | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gainward GeForce RTX 5070 Ti 16GB GDDR7 Phoenix-S GS | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gainward GeForce RTX 5070 Ti 16GB Phoenix-S | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gainward GeForce RTX 5070 Ti 16GB Phoenix-S GS | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gainward GeForce RTX 5070 Ti Phoenix-S 16GB GDDR7 Graphics Card (NE75… | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte 9VN507ΤΑΟ-00-G10 GeForce RTX 5070 Ti 16GB | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte Aorus GeForce RTX 5070 Ti 16GB GDDR7 Master | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GV-N507TEAGLE OC-16GD 16 GB | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti 16GB Aero OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti 16GB Aorus Master | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti 16GB Eagle OC Ice SFF | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti 16GB Eagle OC SFF | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti 16GB GAMING OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti 16GB GDDR7 Aero OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti 16GB GDDR7 Aero OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti 16GB GDDR7 Aorus Infinity | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti 16GB GDDR7 Aorus Master | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti 16GB GDDR7 Aorus Windforce OC SFF | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti 16GB GDDR7 Eagle Ice OC SFF | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti 16GB GDDR7 Eagle OC Ice SFF | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti 16GB GDDR7 Eagle OC SFF | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti 16GB GDDR7 Eagle OC SFF | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti 16GB GDDR7 Gaming OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti 16GB GDDR7 Gaming OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti 16GB GDDR7 Infinity | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti 16GB GDDR7 Windforce OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti 16GB GDDR7 Windforce OC SFF | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti 16GB GDDR7 Windforce OC V2 | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti 16GB Infinity | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti 16GB Windforce OC SFF | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti VGA GV-N507TAORUS M-16GD/16GB/GDDR7 | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti VGA GV-N507TWF3OC-16GD/16GB/GDDR7 | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti rev. 2.0 16GB GDDR7 Windforce OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte GeForce RTX 5070 Ti rev. 2.0 16GB Windforce OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Gigabyte VGA GV-N507TWF3OC-16GD GeForce RTX 5070 Ti 12GB | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Inno 3D GeForce RTX 5070 Ti 16GB GDDR7 | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Inno 3D GeForce RTX 5070 Ti 16GB X3 | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Inno3D GeForce RTX 5070 Ti 16GB GDDR7 X3 | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | MSI GEFORCE RTX 5070TI TRIO OC GAMING 16GB GDDR7 RETAIL | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | MSI GeForce RTX 5070 Ti 16GB GDDR7 Gaming Trio OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | MSI GeForce RTX 5070 Ti 16GB GDDR7 Gaming Trio OC Plus | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | MSI GeForce RTX 5070 Ti 16GB GDDR7 Shadow 3X OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | MSI GeForce RTX 5070 Ti 16GB GDDR7 Shadow 3X OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | MSI GeForce RTX 5070 Ti 16GB GDDR7 Ventus 3X OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | MSI GeForce RTX 5070 Ti 16GB GDDR7 Ventus 3X OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | MSI GeForce RTX 5070 Ti 16GB Gaming Trio OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | MSI GeForce RTX 5070 Ti 16GB Shadow 3X OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | MSI GeForce RTX 5070 Ti 16GB Ventus 3X OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | MSI NVIDIA GEFORCE RTX 5070TI 16G VENTUS 3X OC 16GB GDDR7 RETAIL | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | PALIT NVIDIA GEFORCE RTX 5070 TI GAMINGPRO-S 16GB GDDR7 RETAIL | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | PNY GeForce RTX 5070 Ti 16GB | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | PNY GeForce RTX 5070 Ti 16GB ARGB Overclocked Triple Fan Plus | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | PNY GeForce RTX 5070 Ti 16GB Dual Slim OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | PNY GeForce RTX 5070 Ti 16GB GDDR7 | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | PNY GeForce RTX 5070 Ti 16GB GDDR7 ARGB | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | PNY GeForce RTX 5070 Ti 16GB GDDR7 ARGB OC | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | PNY GeForce RTX 5070 Ti 16GB GDDR7 ARGB OC | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | PNY GeForce RTX 5070 Ti 16GB GDDR7 ARGB Overclocked Triple Fan Plus | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | PNY GeForce RTX 5070 Ti 16GB GDDR7 Dual Slim OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | PNY GeForce RTX 5070 Ti 16GB GDDR7 OC | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | PNY GeForce RTX 5070 Ti 16GB GDDR7 OC Plus | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | PNY GeForce RTX 5070 Ti 16GB GDDR7 OC Triple Fan | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | PNY GeForce RTX 5070 Ti 16GB GDDR7 OC Triple Fan | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | PNY GeForce RTX 5070 Ti 16GB GDDR7 Overclocked Triple Fan Plus Graphi… | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | PNY GeForce RTX 5070 Ti 16GB GDDR7 Slim OC | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | PNY GeForce RTX 5070 Ti 16GB GDDR7 Triple DP | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | PNY GeForce RTX 5070 Ti 16GB GDDR7 Triple Fan | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | PNY GeForce RTX 5070 Ti 16GB Overclocked Triple Fan Plus | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | PNY GeForce RTX 5070 Ti 16GB Triple DP | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | PNY GeForce RTX 5070 Ti 16GB Triple Fan | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Palit GeForce RTX 5070 Ti 16GB GDDR7 GamingPro-S | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Palit GeForce RTX 5070 Ti 16GB GDDR7 GamingPro-S | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Palit GeForce RTX 5070 Ti 16GB GDDR7 GamingPro-S OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Palit GeForce RTX 5070 Ti 16GB GDDR7 GamingPro-S OC Graphics Card | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Palit GeForce RTX 5070 Ti 16GB GamingPro-S | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Palit GeForce RTX 5070 Ti 16GB GamingPro-S OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5070 Ti | Zotac GeForce RTX 5070 Ti 16GB Solid Core | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RTX 5080 | ASUS PRIME NVIDIA GEFORCE RTX5080 OC 16GB GDDR7 | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | ASUS PROART NVIDIA GEFORCE RTX5080 16GB GDDR7 RETAIL | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | ASUS VGA PRIME-RTX5080-O16G, 16GB , GDDR7 | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | ASUS VGA ROG-ASTRAL-RTX5080-O16G-GAMING, 16GB , GDDR7 | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | ASUS VGA TUF-RTX5080-O16G-GAMING, 16GB, GDDR7 | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Asus GeForce RTX 5080 16GB | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Asus GeForce RTX 5080 16GB GDDR7 Noctua OC | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Asus GeForce RTX 5080 16GB GDDR7 Prime OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Asus GeForce RTX 5080 16GB GDDR7 Prime OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Asus GeForce RTX 5080 16GB GDDR7 ProArt OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Asus GeForce RTX 5080 16GB GDDR7 ProArt OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Asus GeForce RTX 5080 16GB GDDR7 ROG Astral OC | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Asus GeForce RTX 5080 16GB GDDR7 ROG Astral OC Edition | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Asus GeForce RTX 5080 16GB GDDR7 ROG Astral OC White | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Asus GeForce RTX 5080 16GB GDDR7 ROG Astral White OC Edition | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Asus GeForce RTX 5080 16GB GDDR7 TUF Gaming | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Asus GeForce RTX 5080 16GB GDDR7 TUF Gaming OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Asus GeForce RTX 5080 16GB GDDR7 TUF Gaming OC Edition | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Asus GeForce RTX 5080 16GB Prime OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Asus GeForce RTX 5080 16GB ProArt OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Asus GeForce RTX 5080 16GB TUF Gaming OC Edition | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Asus Prime -RTX5080-O16G NVIDIA GeForce RTX 5080 16 GB | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Asus ROG Astral GeForce RTX 5080 16GB GDDR7 OC Edition 90YV0LV0-M0NA00 | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Asus TUF Gaming GeForce RTX 5080 16GB GDDR7 OC Edition 90YV0M30-M0NA00 | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | GIGABYTE AORUS NVIDIA GEFORCE RTX 5080 XTREME WATERFORCE WB 16GB GDDR7 | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | GIGABYTE GEFORCE RTX 5080 AORUS MASTER 16GB GDDR7 | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | GIGABYTE GEFORCE RTX 5080 GDDR7 16GB AERO OC SFF | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | GIGABYTE NVIDIA GEFORCE RTX 5080 16GB WINDFORCE OC PCI-E RETAIL | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | GIGABYTE NVIDIA GEFORCE RTX 5080 GAMING OC 16GB GDDR7 RETAIL | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | GIGABYTE VGA GV-N5080AORUS M-16GD, 16GB , GDDR7 | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gainward Ge Force RTX 5080 16GB GDDR7 Python III | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gainward GeForce RTX 5080 16GB GDDR7 Phoenix | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gainward GeForce RTX 5080 16GB GDDR7 Phoenix | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gainward GeForce RTX 5080 16GB GDDR7 Phoenix GS | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gainward GeForce RTX 5080 16GB GDDR7 Phoenix GS | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gainward GeForce RTX 5080 16GB GDDR7 Phoenix V1 | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gainward GeForce RTX 5080 16GB GDDR7 Phoenix V1 | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gainward GeForce RTX 5080 16GB GDDR7 Python III | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gainward GeForce RTX 5080 16GB Phoenix GS | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gainward GeForce RTX 5080 16GB Phoenix V1 | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gainward GeForce RTX 5080 16GB Python III | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte Aorus GeForce RTX 5080 16GB GDDR7 Master | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte Aorus GeForce RTX 5080 16GB GDDR7 Master Ice | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GV-N5080AORUS M-16GD 16 GB | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GeForce RTX 5080 16GB | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GeForce RTX 5080 16GB Aero OC SFF | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GeForce RTX 5080 16GB Aorus Master | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GeForce RTX 5080 16GB Aorus Xtreme Waterforce | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GeForce RTX 5080 16GB GAMING OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GeForce RTX 5080 16GB GDDR7 AERO OC SFF | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GeForce RTX 5080 16GB GDDR7 Aero Windforce OC SFF | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GeForce RTX 5080 16GB GDDR7 Aorus Infinity | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GeForce RTX 5080 16GB GDDR7 Aorus Master | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GeForce RTX 5080 16GB GDDR7 Aorus XTREME Waterforce | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GeForce RTX 5080 16GB GDDR7 Gaming OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GeForce RTX 5080 16GB GDDR7 Gaming OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GeForce RTX 5080 16GB GDDR7 Master Ice | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GeForce RTX 5080 16GB GDDR7 Windforce OC SFF | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GeForce RTX 5080 16GB GDDR7 Windforce OC V2 SFF | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GeForce RTX 5080 16GB GDDR7 Windforce SFF OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GeForce RTX 5080 16GB GDDR7 Xtreme Waterforce | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GeForce RTX 5080 16GB GDDR7 Xtreme Waterforce WB | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GeForce RTX 5080 16GB GDDR7 Xtreme Waterforce WB | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GeForce RTX 5080 16GB Gaming | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GeForce RTX 5080 16GB Master Ice | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GeForce RTX 5080 16GB Windforce OC SFF | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GeForce RTX 5080 16GB Xtreme Waterforce WB | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Gigabyte GeForceRTX 5080 Aero 16GB OC | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | INNO3D NVIDIA GEFORCE RTX 5080 ICHILL X3 V2 16GB GDDR7 RETAIL | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | INNO3D NVIDIA GEFORCE RTX 5080 X3 16GB GDDR7 | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | INNO3D NVIDIA GEFORCE RTX 5080 X3 OC 16GB GDDR7 | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | INNO3D NVIDIA GEFORCE RTX5080 ICHILL FROSTBITE 16GB GDDR7 RETAIL | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Inno 3D GeForce RTX 5080 16GB GDDR7 IChill X3 V2 | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Inno 3D GeForce RTX 5080 16GB GDDR7 X3 | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Inno 3D GeForce RTX 5080 16GB GDDR7 X3 OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Inno 3D GeForce RTX 5080 16GB GDDR7 iChill Frostbite | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Inno 3D GeForce RTX 5080 16GB GDDR7 iChill Frostbite | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Inno 3D GeForce RTX 5080 16GB IChill X3 V2 | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Inno 3D GeForce RTX 5080 16GB X3 | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Inno 3D GeForce RTX 5080 16GB X3 OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Inno 3D GeForce RTX 5080 16GB iChill Frostbite | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Inno 3D GeForce RTX 5080 16GB iChill Frostbite Pro | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Inno 3D GeForce RTX 5080 16GB iChill X3 OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Inno3D GeForce RTX 5080 16GB GDDR7 X3 OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Inno3D GeForce RTX 5080 16GB GDDR7 X3 OC White | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Inno3D GeForce RTX 5080 16GB GDDR7 iChill Frostbite | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Inno3D GeForce RTX 5080 16GB GDDR7 iChill Frostbite Pro | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Inno3D GeForce RTX 5080 16GB GDDR7 iChill X3 SFF | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Inno3D GeForce RTX 5080 16GB GDDR7 iChill X3 V2 | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Lenovo GeForce RTX 5080 16GB | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Lenovo GeForce RTX 5080 16GB GDDR7 | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Lenovo GeForce RTX 5080 16GB GDDR7 | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | MSI GAMING GEFORCE RTX 5080 16G TRIO OC NVIDIA 16GB GDDR7 | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | MSI GeForce RTX 5080 16GB | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | MSI GeForce RTX 5080 16GB GDDR7 Gaming Trio OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | MSI GeForce RTX 5080 16GB GDDR7 Gaming Trio OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | MSI GeForce RTX 5080 16GB GDDR7 Inspire 3X OC | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | MSI GeForce RTX 5080 16GB GDDR7 Ventus 3X OC | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | MSI GeForce RTX 5080 16GB GDDR7 Ventus 3X OC | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | MSI GeForce RTX 5080 16GB GDDR7 Ventus 3X OC Plus | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | MSI GeForce RTX 5080 16GB GDDR7 Ventus 3X OC Plus Graphics Card | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | MSI GeForce RTX 5080 16GB GDDR7 Ventus 3X OC White | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | MSI GeForce RTX 5080 16GB Gaming Trio OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | MSI NVIDIA GEFORCE RTX 5080 VENTUS 3X OC 16GB GDDR7 BLACK | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | MSI VENTUS NVIDIA GEFORCE RTX5080 16GB 3X OC GDDR7 | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | NVidia GeForce RTX 5080 16GB Dual Slim OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | PNY GeForce RTX 5080 16GB EPIC-X RGB Overclocked | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | PNY GeForce RTX 5080 16GB GDDR7 | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | PNY GeForce RTX 5080 16GB GDDR7 Dual Slim OC | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | PNY GeForce RTX 5080 16GB GDDR7 EPIC-X RGB Overclocked | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | PNY GeForce RTX 5080 16GB GDDR7 OC | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | PNY GeForce RTX 5080 16GB GDDR7 Overclocked Triple Fan | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | PNY GeForce RTX 5080 16GB GDDR7 Triple Fan | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | PNY GeForce RTX 5080 16GB Overclocked Triple Fan | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | PNY GeForce RTX 5080 16GB Triple Fan | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | PNY NVIDIA GEFORCE RTX 5080 TRIPLE FAN 16GB GDDR7 RETAIL | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Palit GeForce RTX 5080 16GB GDDR7 | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Palit GeForce RTX 5080 16GB GDDR7 GamingPro | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Palit GeForce RTX 5080 16GB GDDR7 GamingPro OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Palit GeForce RTX 5080 16GB GDDR7 GamingPro OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Palit GeForce RTX 5080 16GB GDDR7 GamingPro V1 | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Palit GeForce RTX 5080 16GB GDDR7 Infinity 3 | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Palit GeForce RTX 5080 16GB GDDR7 Infinity 3 | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Palit GeForce RTX 5080 16GB GDDR7 Infinity 3 OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Palit GeForce RTX 5080 16GB GamingPro | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Palit GeForce RTX 5080 16GB GamingPro OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Palit GeForce RTX 5080 16GB GamingPro V1 | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Palit GeForce RTX 5080 16GB Infinity 3 | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Palit GeForce RTX 5080 16GB Infinity 3 OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Palit GeForce RTX 5080 rev. 1.0 16GB | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Palit GeForce RTX 5080 rev. 1.0 16GB GDDR7 | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | ZOTAC GEFORCE RTX 5080 16GB AMP EXTREME INFINITY | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | ZOTAC NVIDIA GEFORCE GAMING RTX 5080 SOLID CORE OC 16GB GDDR7 RETAIL | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | ZOTAC NVIDIA GEFORCE GAMING RTX 5080 SOLID OC 16GB GDDR7 RETAIL | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | ZOTAC NVIDIA GEFORCE RTX5080 SOLID CORE GAMING 16GB GDDR7 RETAIL | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Zotac GeForce RTX 5080 16GB AMP Extreme INFINITY | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Zotac GeForce RTX 5080 16GB GDDR7 AMP Extreme INFINITY | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Zotac GeForce RTX 5080 16GB GDDR7 AMP Extreme Infinity | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Zotac GeForce RTX 5080 16GB GDDR7 Solid Core | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Zotac GeForce RTX 5080 16GB GDDR7 Solid Core | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Zotac GeForce RTX 5080 16GB GDDR7 Solid Core | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Zotac GeForce RTX 5080 16GB GDDR7 Solid Core OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Zotac GeForce RTX 5080 16GB GDDR7 Solid Core OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Zotac GeForce RTX 5080 16GB GDDR7 Solid Core OC 20th Anniversary Edit… | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Zotac GeForce RTX 5080 16GB GDDR7 Solid Core OC 20th Anniversary Edit… | — | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Zotac GeForce RTX 5080 16GB GDDR7 Solid OC White | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Zotac GeForce RTX 5080 16GB GDDR7 Solid OC White | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Zotac GeForce RTX 5080 16GB Solid Core | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Zotac GeForce RTX 5080 16GB Solid Core OC | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5080 | Zotac GeForce RTX 5080 16GB Solid OC White | 850 | 850 | 850 | 850 | 750 | 850 | 0 | 700 | 850 | 0 |
| RTX 5090 | Asus GeForce RTX 5090 32GB Astral OC Edition | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Asus GeForce RTX 5090 32GB GDDR7 Astral OC Edition | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Asus GeForce RTX 5090 32GB GDDR7 ROG Astral BTF OC | — | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Asus GeForce RTX 5090 32GB GDDR7 ROG Astral Edition 20 | — | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Asus GeForce RTX 5090 32GB GDDR7 ROG Astral LC | — | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Asus GeForce RTX 5090 32GB GDDR7 ROG Astral OC | — | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Asus GeForce RTX 5090 32GB GDDR7 TUF Gaming OC | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Asus GeForce RTX 5090 32GB GDDR7 TUF Gaming OC Edition | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Asus GeForce RTX 5090 32GB TUF Gaming OC Edition | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | GIGABYTE RTX 5090 GAMING OC 32GB | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | GIGABYTE VGA GV-N5090AORUS M-32GD, 32GB GDDR7 | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | GIGABYTE VGA GV-N5090AORUSST ICE-32GD, 32GB, GDDR7 | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | GIGABYTE VGA GV-N5090GAMING OC-32GD, 32GB GDDR7 | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Gigabyte Aorus GeForce RTX 5090 32GB GDDR7 Master | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Gigabyte Aorus GeForce RTX 5090 32GB GDDR7 Master Ice | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Gigabyte Aorus GeForce RTX 5090 32GB GDDR7 Stealth Ice | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Gigabyte GeForce RTX 5090 32GB Aorus Master | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Gigabyte GeForce RTX 5090 32GB Aorus Stealth Ice | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Gigabyte GeForce RTX 5090 32GB GAMING OC | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Gigabyte GeForce RTX 5090 32GB GDDR7 Aorus Infinity | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Gigabyte GeForce RTX 5090 32GB GDDR7 Aorus Master | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Gigabyte GeForce RTX 5090 32GB GDDR7 Aorus Stealth Ice | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Gigabyte GeForce RTX 5090 32GB GDDR7 Aorus Stealth Ice | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Gigabyte GeForce RTX 5090 32GB GDDR7 Gaming OC | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Gigabyte GeForce RTX 5090 32GB GDDR7 Gaming OC | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Gigabyte GeForce RTX 5090 32GB GDDR7 MASTER ICE 32G | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Gigabyte GeForce RTX 5090 32GB GDDR7 Windforce OC | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Gigabyte GeForce RTX 5090 32GB GDDR7 Windforce OC | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Gigabyte GeForce RTX 5090 32GB GDDR7 XTREME Waterforce | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Gigabyte GeForce RTX 5090 32GB GDDR7 Xtreme Waterforce | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Gigabyte GeForce RTX 5090 32GB MASTER ICE 32G | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Gigabyte GeForce RTX 5090 32GB Windforce OC | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Gigabyte GeForce RTX 5090 32GB Xtreme Waterforce | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | INNO3D NVIDIA GEFORCE RTX 5090 ICHILL FROSTBITE 32GB GDDR7 RETAIL | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Inno 3D GeForce RTX 5090 32GB GDDR7 iChill Frostbite | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Inno 3D GeForce RTX 5090 32GB GDDR7 iChill Frostbite | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Inno 3D GeForce RTX 5090 32GB iChill Frostbite | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Inno3D GeForce RTX 5090 32GB GDDR7 X3 | — | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Inno3D GeForce RTX 5090 32GB GDDR7 iCHill Frostbite | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Inno3D GeForce RTX 5090 32GB GDDR7 iChill Frostbite Pro | — | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Inno3D GeForce RTX 5090 32GB GDDR7 iChill X3 | — | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | MSI GeForce RTX 5090 32GB GDDR7 Gaming Trio OC | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | MSI GeForce RTX 5090 32GB GDDR7 SUPRIM SOC | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | MSI GeForce RTX 5090 32GB GDDR7 Suprim SOC | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | MSI GeForce RTX 5090 32GB GDDR7 Ventus 3X OC | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | MSI GeForce RTX 5090 32GB GDDR7 Ventus 3X OC | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | MSI GeForce RTX 5090 32GB Gaming Trio OC | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | MSI GeForce RTX 5090 32GB SUPRIM SOC | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | MSI GeForce RTX 5090 32GB Ventus 3X OC | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | MSI VENTUS NVIDIA GEFORCE RTX 5090 3X OC 32GB GDDR7 RETAIL | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Palit GeForce RTX 5090 32GB GDDR7 GameRock | — | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | ZOTAC GAMING GEFORCE RTX 5090 SOLID OC NVIDIA 32 GB GDDR7 | — | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Zotac GeForce RTX 5090 32GB AMP Extreme INFINITY | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Zotac GeForce RTX 5090 32GB GDDR7 | — | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Zotac GeForce RTX 5090 32GB GDDR7 AMP Extreme Infinity | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Zotac GeForce RTX 5090 32GB GDDR7 AMP Extreme Infinity | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Zotac GeForce RTX 5090 32GB GDDR7 SOLID OC White Edition | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Zotac GeForce RTX 5090 32GB GDDR7 Solid OC | — | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Zotac GeForce RTX 5090 32GB GDDR7 Solid OC White | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RTX 5090 | Zotac GeForce RTX 5090 32GB SOLID OC White Edition | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 950 | 1000 | 0 |
| RX 550 | Afox Radeon RX 550 4GB V5 | 400 | 400 | 400 | 400 | 350 | 400 | 0 | 250 | 400 | 0 |
| RX 550 | BIOSTAR AMD RADEON RX550 4GB GDDR5 VA5505RF41 | — | 400 | 400 | 400 | 350 | 400 | 0 | 250 | 400 | 0 |
| RX 550 | Biostar Radeon RX 550 4GB | — | 400 | 400 | 400 | 350 | 400 | 0 | 250 | 400 | 0 |
| RX 550 | Biostar Radeon RX 550 4GB GDDR5 | — | 400 | 400 | 400 | 350 | 400 | 0 | 250 | 400 | 0 |
| RX 550 | Biostar Radeon RX 550 4GB GDDR5 | — | 400 | 400 | 400 | 350 | 400 | 0 | 250 | 400 | 0 |
| RX 550 | Biostar Radeon RX 550 4GB Gaming | 450 | 400 | 450 | 450 | 350 | 450 | 0 | 250 | 450 | 0 |
| RX 550 | Biostar Radeon RX 550 4GB Gaming | 450 | 400 | 450 | 450 | 350 | 450 | 0 | 250 | 450 | 0 |
| RX 550 | Biostar Radeon RX 550 GDDR5 4 GB PCI Express x16 3.0 | — | 400 | 400 | 400 | 350 | 400 | 0 | 250 | 400 | 0 |
| RX 550 | Biostar VA5505RF41 Radeon RX 550 4GB GDDR5 Gaming | 450 | 400 | 450 | 450 | 350 | 450 | 0 | 250 | 450 | 0 |
| RX 550 | PowerColor Radeon RX 550 4GB GDDR5 Red Dragon PCI-E x16 3.0 με HDMI | 250 | 400 | 400 | 400 | 350 | 400 | 0 | 250 | 400 | 0 |
| RX 550 | PowerColor Radeon RX 550 4GB Red Dragon | 250 | 400 | 400 | 400 | 350 | 400 | 0 | 250 | 400 | 0 |
| RX 550 | PowerColor Radeon RX 550 4GB Red Dragon Low Profile | — | 400 | 400 | 400 | 350 | 400 | 0 | 250 | 400 | 0 |
| RX 560 | Afox Radeon RX 560 4GB ATX Dual Fan | — | 450 | 400 | 450 | — | 450 | +50 | — | 450 | +50 |
| RX 560 | Afox Radeon RX 560 4GB GDDR5 | — | 450 | 400 | 450 | — | 450 | +50 | — | 450 | +50 |
| RX 560 | BIOSTAR RADEON RX560 4GB GDDR5 | — | 450 | 400 | 450 | — | 450 | +50 | — | 450 | +50 |
| RX 560 | Biostar Radeon RX 560 4GB | 400 | 450 | 400 | 450 | — | 450 | +50 | — | 450 | +50 |
| RX 560 | Biostar Radeon RX 560 4GB GDDR5 | — | 450 | 400 | 450 | — | 450 | +50 | — | 450 | +50 |
| RX 560 | Biostar Radeon RX 560 4GB GDDR5 | — | 450 | 400 | 450 | — | 450 | +50 | — | 450 | +50 |
| RX 560 | Biostar Radeon RX 560 GDDR5 4 GB PCI Express x16 3.0 | — | 450 | 400 | 450 | — | 450 | +50 | — | 450 | +50 |
| RX 560 | Biostar VGA Radeon RX560 4GB DDR5 128-bit VA5615RF41 | — | 450 | 400 | 450 | — | 450 | +50 | — | 450 | +50 |
| RX 5600 XT | Sapphire Radeon RX 5600 XT 6GB GDDR6 | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RX 5600 XT | Sapphire Radeon RX 5600 XT 6GB Pulse | — | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RX 5600 XT | Sapphire Radeon RX 5600 XT 6GB Pulse OC | 500 | 550 | 550 | 550 | 450 | 550 | 0 | 400 | 550 | 0 |
| RX 580 | AFOX Radeon RX 580 8GB GDDR5 V3 | — | 500 | 500 | 500 | 500 | 500 | 0 | 450 | 500 | 0 |
| RX 580 | Afox Radeon RX 580 8GB 2048SP | — | 500 | 500 | 500 | 500 | 500 | 0 | 450 | 500 | 0 |
| RX 580 | BIOSTAR AMD RADEON RX580 2048SP 8GB GDDR5 RETAIL | — | 500 | 500 | 500 | 500 | 500 | 0 | 450 | 500 | 0 |
| RX 580 | BIOSTAR AMD RADEON RX580 8GB GDDR5 RETAIL | — | 500 | 500 | 500 | 500 | 500 | 0 | 450 | 500 | 0 |
| RX 580 | BIOSTAR RADEON RX 580 8GB WHITE GDDR5 | — | 500 | 500 | 500 | 500 | 500 | 0 | 450 | 500 | 0 |
| RX 580 | Biostar Radeon RX 580 8GB GDDR5 | — | 500 | 500 | 500 | 500 | 500 | 0 | 450 | 500 | 0 |
| RX 580 | Biostar Radeon RX 580 8GB GDDR5 | — | 500 | 500 | 500 | 500 | 500 | 0 | 450 | 500 | 0 |
| RX 580 | Biostar Radeon RX 580 8GB GDDR5 2048SP | — | 500 | 500 | 500 | 500 | 500 | 0 | 450 | 500 | 0 |
| RX 580 | Biostar Radeon RX 580 8GB GDDR5 Gaming | — | 500 | 500 | 500 | 500 | 500 | 0 | 450 | 500 | 0 |
| RX 580 | Biostar Radeon RX 580 8GB GDDR5 Gaming 2048sp White | 450 | 500 | 500 | 500 | 500 | 500 | 0 | 450 | 500 | 0 |
| RX 580 | Biostar Radeon RX 580 8GB GDDR5 Gaming 2048sp White | 450 | 500 | 500 | 500 | 500 | 500 | 0 | 450 | 500 | 0 |
| RX 580 | Biostar Radeon RX 580 8GB Gaming 2048sp | 450 | 500 | 500 | 500 | 500 | 500 | 0 | 450 | 500 | 0 |
| RX 580 | Biostar Radeon RX 580 8GB Gaming 2048sp White | 450 | 500 | 500 | 500 | 500 | 500 | 0 | 450 | 500 | 0 |
| RX 580 | MSI Radeon RX 580 8GB Armor OC | 500 | 500 | 500 | 500 | 500 | 500 | 0 | 450 | 500 | 0 |
| RX 580 | Radeon RX 580 8GB PCWinMax | 450 | 500 | 500 | 500 | 500 | 500 | 0 | 450 | 500 | 0 |
| RX 6400 | MSI Radeon RX 6400 4GB GDDR6 Aero ITX | 350 | 350 | 350 | 350 | 350 | 350 | 0 | 300 | 350 | 0 |
| RX 6400 | XFX Radeon RX 6400 4GB Speedster SWFT 105 | 400 | 350 | 400 | 400 | 350 | 400 | 0 | 300 | 400 | 0 |
| RX 6600 XT | ASRock Radeon RX 6600 XT 8GB GDDR6 Challenger D OC | — | 500 | 500 | 500 | 500 | 500 | 0 | 400 | 500 | 0 |
| RX 6650 XT | Gigabyte Radeon RX 6650 XT 8GB GDDR6 Gaming OC | — | 500 | 500 | 500 | 500 | 500 | 0 | 450 | 500 | 0 |
| RX 6650 XT | MSI Radeon RX 6650 XT 8GB GDDR6 Gaming X | 500 | 500 | 500 | 500 | 500 | 500 | 0 | 450 | 500 | 0 |
| RX 6650 XT | Sapphire Radeon RX 6650 XT 8GB GDDR6 Pulse | — | 500 | 500 | 500 | 500 | 500 | 0 | 450 | 500 | 0 |
| RX 6700 XT | Asrock Radeon RX 6700 XT 12GB GDDR6 Challenger D OC | — | 650 | 650 | 650 | 600 | 650 | 0 | 500 | 650 | 0 |
| RX 6700 XT | Sapphire Radeon RX 6700 XT 12GB GDDR6 Pulse | — | 650 | 650 | 650 | 600 | 650 | 0 | 500 | 650 | 0 |
| RX 6800 | BIOSTAR AMD RADEON RX6800-16GB GDDR6 VA6806LMP2 | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RX 6800 | Biostar Radeon RX 6800 16GB | 650 | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RX 6800 | Biostar Radeon RX 6800 16GB GDDR6 Extreme | — | 650 | 650 | 650 | 600 | 650 | 0 | 550 | 650 | 0 |
| RX 7600 | ASROCK AMD RADEON RX7600 CHALLENGER 8GB GDDR6 RETAIL | — | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7600 | ASRock Radeon RX 7600 8GB Challenger OC | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7600 | ASRock Radeon RX 7600 8GB GDDR6 Challenger OC | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7600 | Asrock Radeon RX 7600 8GB GDDR6 Challenger OC | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7600 | Asrock Radeon RX 7600 8GB OC | — | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7600 | Asus Radeon RX 7600 8GB Dual Evo OC | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7600 | Asus Radeon RX 7600 8GB GDDR6 Dual EVO OC | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7600 | Asus Radeon RX 7600 8GB GDDR6 Dual Evo OC | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7600 | Biostar Radeon RX 7600 8GB GDDR6 OC | — | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7600 | Biostar Radeon RX 7600 8GB GDDR6 Ultimate Gaming OC | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7600 | Biostar Radeon RX 7600 8GB Ultimate Gaming OC | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7600 | GIGABYTE AMD RADEON RX7600 GAMING OC 8GB GDDR6 RETAIL | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7600 | Gigabyte Radeon RX 7600 8GB GAMING OC | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7600 | Gigabyte Radeon RX 7600 8GB GDDR6 Gaming OC | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7600 | Gigabyte Radeon RX 7600 8GB GDDR6 Gaming OC | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7600 | POWERCOLOR AMD RADEON RX7600 FIGHTER 8GB REV2.0 HDMI/3XDP GDDR6 RETAIL | — | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7600 | PowerColor Radeon RX 7600 8GB Fighter | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7600 | PowerColor Radeon RX 7600 8GB GDDR6 Fighter | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7600 | PowerColor Radeon RX 7600 8GB GDDR6 Fighter V2 | — | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7600 | PowerColor Radeon RX 7600 8GB GDDR6 Hellhound | 600 | 550 | 600 | 600 | 500 | 600 | 0 | 400 | 600 | 0 |
| RX 7600 | PowerColor Radeon RX 7600 8GB GDDR6 Hellhound OC | — | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7600 | PowerColor Radeon RX 7600 8GB Hellhound | 600 | 550 | 600 | 600 | 500 | 600 | 0 | 400 | 600 | 0 |
| RX 7600 | PowerColor Radeon RX 7600 rev. 2.0 8GB Fighter | 600 | 550 | 600 | 600 | 500 | 600 | 0 | 400 | 600 | 0 |
| RX 7600 | PowerColor Radeon RX 7600 rev. 2.0 8GB GDDR6 Fighter | 600 | 550 | 600 | 600 | 500 | 600 | 0 | 400 | 600 | 0 |
| RX 7600 | Sapphire Radeon RX 7600 8GB GDDR6 Pulse | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7600 | Sapphire Radeon RX 7600 8GB GDDR6 Pulse | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7600 | Sapphire Radeon RX 7600 8GB Pulse | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7600 | XFX Radeon RX 7600 8GB GDDR6 Speedster SWFT 210 | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7600 | XFX Radeon RX 7600 8GB Speedster SWFT 210 | 550 | 550 | 550 | 550 | 500 | 550 | 0 | 400 | 550 | 0 |
| RX 7700 XT | Asus Radeon RX 7700 XT 12GB GDDR6 Dual OC | 750 | 700 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RX 7700 XT | Asus Radeon RX 7700 XT 12GB OC Edition | 750 | 700 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RX 7700 XT | Asus Radeon RX 7700 XT AMD PCI Express x16 4.0 12GB GDDR6 | — | 700 | 700 | 700 | 600 | 700 | 0 | 550 | 700 | 0 |
| RX 7800 XT | PowerColor Radeon RX 7800 XT 16GB | 750 | 700 | 750 | 750 | 600 | 750 | 0 | 550 | 750 | 0 |
| RX 7800 XT | PowerColor Radeon RX 7800 XT 16GB GDDR6 (RX7800XT) | — | 700 | 700 | 700 | 600 | 700 | 0 | 550 | 700 | 0 |
| RX 7900 XTX | Sapphire Radeon RX 7900 XTX 24GB GDDR6 Pulse | — | 800 | 800 | 800 | 750 | 800 | 0 | 650 | 800 | 0 |
| RX 9060 XT | ASROCK AMD RADEON RX9060XT CHALLENGER 16GB OC GDDR6 RETAIL | 550 | 450 | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RX 9060 XT | ASRock Radeon RX 9060 XT 16GB Challenger OC | 550 | 450 | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RX 9060 XT | ASRock Radeon RX 9060 XT 16GB GDDR6 Challenger OC | 550 | 450 | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RX 9060 XT | ASRock Radeon RX 9060 XT 16GB Steel Legend OC | 550 | 450 | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RX 9060 XT | ASUS RADEON RX 9060XT DUAL 16GB GDDR6 | 550 | 450 | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RX 9060 XT | Acer Radeon RX 9060 XT 16GB GDDR6 Nitro OC | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Acer Radeon RX 9060 XT 16GB XT Nitro OC | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Acer Radeon RX 9060 XT 8GB Nitro Radeon™ XT OC | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Asrock Radeon RX 9060 XT 16GB GDDR6 Challenger OC | 550 | 450 | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RX 9060 XT | Asus Radeon RX 9060 XT 16GB Dual | 550 | 450 | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RX 9060 XT | Asus Radeon RX 9060 XT 16GB Dual White | 550 | 450 | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RX 9060 XT | Asus Radeon RX 9060 XT 16GB GDDR6 Dual | 550 | 450 | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RX 9060 XT | Asus Radeon RX 9060 XT 16GB GDDR6 Dual Graphics Card | 550 | 450 | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RX 9060 XT | Asus Radeon RX 9060 XT 16GB GDDR6 Dual White | 550 | 450 | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RX 9060 XT | Asus Radeon RX 9060 XT 16GB GDDR6 Dual White | 550 | 450 | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RX 9060 XT | Asus Radeon RX 9060 XT 16GB GDDR6 OC | 550 | 450 | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RX 9060 XT | Asus Radeon RX 9060 XT 16GB GDDR6 Prime OC | 550 | 450 | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RX 9060 XT | Asus Radeon RX 9060 XT 16GB GDDR6 Prime OC Edition | 550 | 450 | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RX 9060 XT | Asus Radeon RX 9060 XT 16GB GDDR6 TUF Gaming OC | — | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Asus Radeon RX 9060 XT 16GB OC | 550 | 450 | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RX 9060 XT | Asus Radeon RX 9060 XT 16GB Prime OC Edition | 550 | 450 | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RX 9060 XT | Asus Radeon RX 9060 XT 8GB GDDR6 Dual OC | — | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Asus Radeon RX 9060 XT 8GB GDDR6 Prime OC | 550 | 450 | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RX 9060 XT | GIGABYTE AMD RADEON RX 9060 XT GAMING OC ICE 16G GDDR6 RETAIL | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | GIGABYTE AMD RADEON RX9060XT GAMING OC 16GB GDDR6 RETAIL | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Gigabyte Radeon RX 9060 XT | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Gigabyte Radeon RX 9060 XT 16GB GAMING OC ICE | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Gigabyte Radeon RX 9060 XT 16GB GDDR6 GAMING OC | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Gigabyte Radeon RX 9060 XT 16GB GDDR6 GAMING OC ICE | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Gigabyte Radeon RX 9060 XT 16GB GDDR6 Gaming | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Gigabyte Radeon RX 9060 XT 16GB GDDR6 Gaming | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Gigabyte Radeon RX 9060 XT 16GB GDDR6 Gaming OC | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Gigabyte Radeon RX 9060 XT 16GB GDDR6 Gaming OC ICE | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Gigabyte Radeon RX 9060 XT 8GB GDDR6 Gaming | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Gigabyte Radeon RX 9060 XT 8GB GDDR6 Gaming OC | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Gigabyte Radeon RX 9060 XT GAMING OC | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Gigabyte Radeon RX 9060 XT VGA GV-R9060XTGAMING OC-8GD/8GB/GDDR6 | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | POWERCOLOR AMD RADEON RX9060XT 8GB GDDR6 RETAIL | — | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | POWERCOLOR AMD RADEON RX9060XT REAPER 16GB GDDR6 RETAIL | 500 | 450 | 500 | 500 | — | 500 | 0 | — | 500 | 0 |
| RX 9060 XT | POWERCOLOR HELLHOUND AMD RADEON RX9060XT 16GB OC GDDR6 RETAIL | — | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | PowerColor Radeon RX 9060 XT 16GB GDDR6 Hellhound | 550 | 450 | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RX 9060 XT | PowerColor Radeon RX 9060 XT 16GB GDDR6 Hellhound | 550 | 450 | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RX 9060 XT | PowerColor Radeon RX 9060 XT 16GB GDDR6 Reaper | 500 | 450 | 500 | 500 | — | 500 | 0 | — | 500 | 0 |
| RX 9060 XT | PowerColor Radeon RX 9060 XT 16GB GDDR6 Reaper | 500 | 450 | 500 | 500 | — | 500 | 0 | — | 500 | 0 |
| RX 9060 XT | PowerColor Radeon RX 9060 XT 8GB GDDR6 Hellhound | — | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | PowerColor Radeon RX 9060 XT 8GB GDDR6 Reaper | — | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | PowerColor Radeon RX 9060 XT 8GB GDDR6 Reaper | — | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | PowerColor Radeon RX 9060 XT Hellhound | 550 | 450 | 550 | 550 | — | 550 | 0 | — | 550 | 0 |
| RX 9060 XT | PowerColor Radeon RX 9060 XT Reaper | 500 | 450 | 500 | 500 | — | 500 | 0 | — | 500 | 0 |
| RX 9060 XT | SAPPHIRE AMD RADEON RX9060 XT GAMING OC NITRO+ 16GB GDDR6 RETAIL | — | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | SAPPHIRE PULSE AMD RADEON RX9060XT GAMING 16GB GDDR6 RETAIL | — | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Sapphire Radeon RX 9060 XT 16GB GDDR6 NITRO+ | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Sapphire Radeon RX 9060 XT 16GB GDDR6 Nitro+ | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Sapphire Radeon RX 9060 XT 16GB GDDR6 Pulse | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Sapphire Radeon RX 9060 XT 16GB GDDR6 Pulse OC | — | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Sapphire Radeon RX 9060 XT 16GB GDDR6 Pure | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Sapphire Radeon RX 9060 XT 16GB GDDR6 Pure White | — | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Sapphire Radeon RX 9060 XT 16GB NITRO+ | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Sapphire Radeon RX 9060 XT 16GB Pure | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Sapphire Radeon RX 9060 XT 8GB GDDR6 Pulse | — | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Sapphire Radeon RX 9060 XT 8GB GDDR6 Pulse OC | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Sapphire Radeon RX 9060 XT 8GB GDDR6 Pulse OC | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Sapphire Radeon RX 9060 XT 8GB Pulse OC | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | Sapphire Radeon RX 9060 XT Pulse | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | XFX Radeon RX 9060 XT 16GB GDDR6 Mercury | — | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | XFX Radeon RX 9060 XT 16GB GDDR6 Mercury OC | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | XFX Radeon RX 9060 XT 16GB GDDR6 Mercury OC | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | XFX Radeon RX 9060 XT 16GB GDDR6 Mercury White OC | — | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | XFX Radeon RX 9060 XT 16GB GDDR6 Swift OC | — | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | XFX Radeon RX 9060 XT 16GB GDDR6 Swift OC Gaming Edition | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | XFX Radeon RX 9060 XT 16GB GDDR6 Swift OC Triple Fan | — | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | XFX Radeon RX 9060 XT 16GB GDDR6 Swift OC Triple Fan Gaming Edition | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | XFX Radeon RX 9060 XT 16GB GDDR6 Swift OC White Triple Fan | — | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | XFX Radeon RX 9060 XT 16GB GDDR6 Swift OC White Triple Fan Gaming Edi… | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | XFX Radeon RX 9060 XT 16GB Mercury OC | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | XFX Radeon RX 9060 XT 16GB Mercury OC Gaming Edition | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | XFX Radeon RX 9060 XT 16GB Swift OC Gaming Edition | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | XFX Radeon RX 9060 XT 16GB Swift OC Triple Fan Gaming Edition | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | XFX Radeon RX 9060 XT 16GB Swift OC White Triple Fan Gaming Edition | 450 | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9060 XT | XFX SWIFT AMD RADEON RX9060XT OC TRIPLE FAN 16GB GDDR6 RETAIL | — | 450 | 500 | 450 | — | 450 | -50 | — | 450 | -50 |
| RX 9070 | ACER NITRO AMD RADEON RX9070 OC 16GB GDDR6 RETAIL | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | ASROCK AMD RX 9070 16GB CHALLENGER PCI-E RETAIL | 700 | 650 | 700 | 700 | 550 | 700 | 0 | 500 | 700 | 0 |
| RX 9070 | ASRock Radeon RX 9070 16GB Challenger | 700 | 650 | 700 | 700 | 550 | 700 | 0 | 500 | 700 | 0 |
| RX 9070 | ASRock Radeon RX 9070 16GB GDDR6 Challenger | 700 | 650 | 700 | 700 | 550 | 700 | 0 | 500 | 700 | 0 |
| RX 9070 | ASRock Radeon RX 9070 16GB GDDR6 Steel Legend OC | 700 | 650 | 700 | 700 | 550 | 700 | 0 | 500 | 700 | 0 |
| RX 9070 | ASRock Radeon RX 9070 16GB Steel Legend OC | 700 | 650 | 700 | 700 | 550 | 700 | 0 | 500 | 700 | 0 |
| RX 9070 | ASUS PRIME AMD RADEON RX9070 EVO 16GB GDDR6 RETAIL | 750 | 650 | 750 | 750 | 550 | 750 | 0 | 500 | 750 | 0 |
| RX 9070 | Acer Radeon RX 9070 16GB GDDR6 Nitro OC | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Acer Radeon RX 9070 16GB GDDR6 Nitro OC | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Acer Radeon RX 9070 16GB GDDR6 Nitro OC | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Acer Radeon RX 9070 16GB GDDR6 Predator BiFrost | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Acer Radeon RX 9070 16GB GDDR6 Predator BiFrost OC | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Acer Radeon RX 9070 16GB GDDR6 Predator BiFrost OC White | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Acer Radeon RX 9070 16GB GDDR6 Predator Bifrost OC White Edition | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Acer Radeon RX 9070 16GB Nitro OC | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Acer Radeon RX 9070 16GB Predator BiFrost | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Acer Radeon RX 9070 16GB Predator Bifrost OC White Edition | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Asrock 90-GA5NZZ-00UANF Radeon RX 9070 16GB | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Asrock Radeon RX 9070 16GB GDDR6 Challenger | 700 | 650 | 700 | 700 | 550 | 700 | 0 | 500 | 700 | 0 |
| RX 9070 | Asrock Radeon RX 9070 16GB GDDR6 Steel Legend | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Asus Prime Radeon RX 9070 16GB GDDR6 OC Edition 90YV0LI1-M0NA00 | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Asus Radeon RX 9070 12GB GDDR6 Prime OC | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Asus Radeon RX 9070 16GB GDDR6 OC Edition | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Asus Radeon RX 9070 16GB GDDR6 Prime EVO Graphics Card | 750 | 650 | 750 | 750 | 550 | 750 | 0 | 500 | 750 | 0 |
| RX 9070 | Asus Radeon RX 9070 16GB GDDR6 Prime EVO OC | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Asus Radeon RX 9070 16GB GDDR6 Prime OC | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Asus Radeon RX 9070 16GB GDDR6 Prime OC | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Asus Radeon RX 9070 16GB Prime EVO | 750 | 650 | 750 | 750 | 550 | 750 | 0 | 500 | 750 | 0 |
| RX 9070 | Asus Radeon RX 9070 16GB Prime OC | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | GIGABYTE VGA GV-R9070GAMING OC-16GD , 16GB, GDDR6 | 750 | 650 | 750 | 750 | 550 | 750 | 0 | 500 | 750 | 0 |
| RX 9070 | Gigabyte GV-R9070GAMING OC-16GD 16 GB | 750 | 650 | 750 | 750 | 550 | 750 | 0 | 500 | 750 | 0 |
| RX 9070 | Gigabyte Radeon RX 9070 16GB GAMING OC | 750 | 650 | 750 | 750 | 550 | 750 | 0 | 500 | 750 | 0 |
| RX 9070 | Gigabyte Radeon RX 9070 16GB GDDR6 Gaming | 750 | 650 | 750 | 750 | 550 | 750 | 0 | 500 | 750 | 0 |
| RX 9070 | Gigabyte Radeon RX 9070 16GB GDDR6 Gaming OC | 750 | 650 | 750 | 750 | 550 | 750 | 0 | 500 | 750 | 0 |
| RX 9070 | Gigabyte Radeon RX 9070 16GB GDDR6 Gaming OC | 750 | 650 | 750 | 750 | 550 | 750 | 0 | 500 | 750 | 0 |
| RX 9070 | Gigabyte Radeon RX 9070 16GB Gaming | 750 | 650 | 750 | 750 | 550 | 750 | 0 | 500 | 750 | 0 |
| RX 9070 | Gigabyte Radeon RX 9070 Gaming OC 16GB GDDR6 9VR9070GO-00-G10 | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | PowerColor Radeon RX 9070 16GB GDDR6 Reaper | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | PowerColor Radeon RX 9070 16GB GDDR6 Reaper | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | PowerColor Radeon RX 9070 16GB Reaper | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | SAPPHIRE AMD RADEON RX 9070 PURE OC 16GB GDDR6 RETAIL | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | SAPPHIRE NITRO+ RADEON RX 9070 16GB GAMING OC | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | SAPPHIRE PULSE AMD RADEON RX 9070 16GB GDDR6 | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Sapphire Radeon RX 9070 16GB GDDR6 Nitro+ | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Sapphire Radeon RX 9070 16GB GDDR6 Nitro+ | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Sapphire Radeon RX 9070 16GB GDDR6 Pulse | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Sapphire Radeon RX 9070 16GB GDDR6 Pulse | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Sapphire Radeon RX 9070 16GB GDDR6 Pure | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Sapphire Radeon RX 9070 16GB GDDR6 Pure Gaming OC | 600 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Sapphire Radeon RX 9070 16GB NITRO+ | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Sapphire Radeon RX 9070 16GB Pulse | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | Sapphire Radeon RX 9070 16GB Pure Gaming OC | 600 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | XFX AMD RADEON RX9070 SWIFT OC GAMING EDITION 16GB RETAIL AMD RADEON … | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | XFX Radeon RX 9070 16GB GDDR6 OC White Triple Fan Gaming Edition | 800 | 650 | 800 | 800 | 550 | 800 | 0 | 500 | 800 | 0 |
| RX 9070 | XFX Radeon RX 9070 16GB GDDR6 Swift OC | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | XFX Radeon RX 9070 16GB GDDR6 Swift OC Triple Fan Gaming Edition | 800 | 650 | 800 | 800 | 550 | 800 | 0 | 500 | 800 | 0 |
| RX 9070 | XFX Radeon RX 9070 16GB GDDR6 Swift OC White | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | XFX Radeon RX 9070 16GB GDDR6 Swift OC White 90mm Fan | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | XFX Radeon RX 9070 16GB OC White Triple Fan Gaming Edition | 800 | 650 | 800 | 800 | 550 | 800 | 0 | 500 | 800 | 0 |
| RX 9070 | XFX Radeon RX 9070 16GB Swift OC Triple Fan Gaming Edition | 800 | 650 | 800 | 800 | 550 | 800 | 0 | 500 | 800 | 0 |
| RX 9070 | XFX Radeon RX 9070 16GB Swift OC White | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 | XFX SWIFT RX 9070 WHITE 3-FAN GAME 16GB GDDR6 | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 GRE | Asrock Radeon RX 9070 GRE 12GB GDDR6 Steel Legend Dark OC | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 GRE | Asus Radeon RX 9070 GRE 12GB GDDR6 Prime OC | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 GRE | Asus Radeon RX 9070 GRE 12GB GDDR6 Prime OC | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 GRE | Asus Radeon RX 9070 GRE 12GB Prime OC | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 GRE | Gigabyte Radeon RX 9070 GRE 12GB | 750 | 650 | 750 | 750 | 550 | 750 | 0 | 500 | 750 | 0 |
| RX 9070 GRE | Gigabyte Radeon RX 9070 GRE 12GB GDDR6 | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 GRE | Gigabyte Radeon RX 9070 GRE 12GB GDDR6 Gaming OC | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 GRE | PowerColor Radeon RX 9070 GRE 12GB GDDR6 Hellhound | 700 | 650 | 700 | 700 | 550 | 700 | 0 | 500 | 700 | 0 |
| RX 9070 GRE | PowerColor Radeon RX 9070 GRE 12GB GDDR6 Hellhound | 700 | 650 | 700 | 700 | 550 | 700 | 0 | 500 | 700 | 0 |
| RX 9070 GRE | PowerColor Radeon RX 9070 GRE 12GB GDDR6 Reaper | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 GRE | PowerColor Radeon RX 9070 GRE 12GB GDDR6 Reaper | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 GRE | PowerColor Radeon RX 9070 GRE 12GB GDDR6 Red Devil | 750 | 650 | 750 | 750 | 550 | 750 | 0 | 500 | 750 | 0 |
| RX 9070 GRE | PowerColor Radeon RX 9070 GRE 12GB GDDR6 Red Devil | 750 | 650 | 750 | 750 | 550 | 750 | 0 | 500 | 750 | 0 |
| RX 9070 GRE | PowerColor Radeon RX 9070 GRE 12GB GDDR6 Red Devil | 750 | 650 | 750 | 750 | 550 | 750 | 0 | 500 | 750 | 0 |
| RX 9070 GRE | PowerColor Radeon RX 9070 GRE 12GB Hellhound | 700 | 650 | 700 | 700 | 550 | 700 | 0 | 500 | 700 | 0 |
| RX 9070 GRE | PowerColor Radeon RX 9070 GRE 12GB OC GDDR6 Hellhound | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 GRE | PowerColor Radeon RX 9070 GRE 12GB Reaper | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 GRE | PowerColor Radeon RX 9070 GRE 12GB Red Devil | 750 | 650 | 750 | 750 | 550 | 750 | 0 | 500 | 750 | 0 |
| RX 9070 GRE | SAPPHIRE AMD RADEON RX 9070 GRE OC PULSE GAMING 12GB GDDR6 RETAIL | — | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 GRE | Sapphire Radeon RX 9070 GRE 12GB GDDR6 Pulse OC | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 GRE | Sapphire Radeon RX 9070 GRE 12GB GDDR6 Pulse OC | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 GRE | Sapphire Radeon RX 9070 GRE 12GB Pulse OC | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 GRE | XFX Radeon RX 9070 GRE 12GB GDDR6 Swift | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 GRE | XFX Radeon RX 9070 GRE 12GB GDDR6 Swift | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 GRE | XFX Radeon RX 9070 GRE 12GB GDDR6 Swift | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 GRE | XFX Radeon RX 9070 GRE 12GB GDDR6 Swift White | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 GRE | XFX Radeon RX 9070 GRE 12GB Swift | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 GRE | XFX Radeon RX 9070 GRE 12GB Swift White | 650 | 650 | 650 | 650 | 550 | 650 | 0 | 500 | 650 | 0 |
| RX 9070 XT | ASRock Radeon RX 9070 XT 16GB Challenger | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | ASRock Radeon RX 9070 XT 16GB GDDR6 Steel Legend | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | ASRock Radeon RX 9070 XT 16GB GDDR6 Taichi OC | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RX 9070 XT | ASRock Radeon RX 9070 XT 16GB Steel Legend | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | ASRock Radeon RX 9070 XT 16GB Steel Legend Dark | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | ASRock Radeon RX 9070 XT 16GB Taichi OC | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RX 9070 XT | ASRock Radeon RX 9070 XT 16GB Taichi White OC | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RX 9070 XT | ASUS AMD RADEON RX 9070 XT WHITE PRIME OC 16GB GDDR6 RETAIL | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | ASUS PRIME -RX9070XT-O16G AMD RADEON RX 9070 XT 16 GB GDDR6 | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | ASUS TUF GAMING TUF-RX9070XT-O16G-GAMING RADEON RX 9070 XT 16GB GDDR6 | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Acer Radeon RX 9070 XT 16GB Predator BiFrost OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Acer Radeon RX 9070 XT 16GB Radeon Nitro OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Asrock Radeon RX 9070 XT 16GB GDDR6 Challenger | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Asrock Radeon RX 9070 XT 16GB GDDR6 Steel Legend | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | Asrock Radeon RX 9070 XT 16GB GDDR6 Steel Legend Dark | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | Asrock Radeon RX 9070 XT 16GB GDDR6 Taichi OC | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RX 9070 XT | Asrock Radeon RX 9070 XT 16GB GDDR6 Taichi OC White | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RX 9070 XT | Asus Radeon RX 9070 XT 16GB COD BO7 Special Edition | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RX 9070 XT | Asus Radeon RX 9070 XT 16GB GDDR6 Prime OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Asus Radeon RX 9070 XT 16GB GDDR6 Prime OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Asus Radeon RX 9070 XT 16GB GDDR6 Prime OC White | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Asus Radeon RX 9070 XT 16GB GDDR6 Prime OC White | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Asus Radeon RX 9070 XT 16GB GDDR6 Prime OC White | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Asus Radeon RX 9070 XT 16GB GDDR6 TUF Gaming COD BO7 | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Asus Radeon RX 9070 XT 16GB GDDR6 TUF Gaming OC | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Asus Radeon RX 9070 XT 16GB OC | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RX 9070 XT | Asus Radeon RX 9070 XT 16GB Prime OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | GIGABYTE AMD RADEON RX 9070 XT GAMING OC ICE 16GB GDDR6 RETAIL | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RX 9070 XT | GIGABYTE AMD RX 9070 XT 16GB GAMING OC PCI-E RETAIL | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RX 9070 XT | GIGABYTE RADEON RX 9070 XT AORUS ELITE 16GB GDDR6 | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RX 9070 XT | Gigabyte Aorus Radeon RX 9070 XT 16GB GDDR6 Elite | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RX 9070 XT | Gigabyte Radeon RX 9070 XT 16GB Aorus Elite | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RX 9070 XT | Gigabyte Radeon RX 9070 XT 16GB GAMING | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RX 9070 XT | Gigabyte Radeon RX 9070 XT 16GB GAMING OC | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RX 9070 XT | Gigabyte Radeon RX 9070 XT 16GB GAMING OC ICE | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RX 9070 XT | Gigabyte Radeon RX 9070 XT 16GB GDDR6 Aorus Elite | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RX 9070 XT | Gigabyte Radeon RX 9070 XT 16GB GDDR6 GAMING | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RX 9070 XT | Gigabyte Radeon RX 9070 XT 16GB GDDR6 GAMING OC ICE | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RX 9070 XT | Gigabyte Radeon RX 9070 XT 16GB GDDR6 Gaming | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RX 9070 XT | Gigabyte Radeon RX 9070 XT 16GB GDDR6 Gaming OC | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RX 9070 XT | Gigabyte Radeon RX 9070 XT 16GB GDDR6 Gaming OC | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RX 9070 XT | Gigabyte Radeon RX 9070 XT 16GB GDDR6 Gaming OC Ice | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RX 9070 XT | Gigabyte Radeon RX 9070 XT 16GB Gaming OC | 850 | 750 | 850 | 850 | 650 | 850 | 0 | 600 | 850 | 0 |
| RX 9070 XT | POWERCOLOR HELLHOUND RX9070XT 16G-L/OC | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | POWERCOLOR RADEON HELLHOUND REVA EDITION RX 9070 XT 16GB GDDR6 RETAIL | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | POWERCOLOR RADEON RED DEVIL RX 9070 XT 16GB GDDR6 | 900 | 750 | 900 | 900 | 650 | 900 | 0 | 600 | 900 | 0 |
| RX 9070 XT | POWERCOLOR REAPER RX9070 XT 16GB GDDR6 | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | PowerColor Radeon RX 9070 XT 16GB GDDR6 Hellhound | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | PowerColor Radeon RX 9070 XT 16GB GDDR6 Hellhound | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | PowerColor Radeon RX 9070 XT 16GB GDDR6 Hellhound | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | PowerColor Radeon RX 9070 XT 16GB GDDR6 Hellhound Resonance Edition | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | PowerColor Radeon RX 9070 XT 16GB GDDR6 Hellhound Reva Edition | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | PowerColor Radeon RX 9070 XT 16GB GDDR6 Hellhound Reva OC | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | PowerColor Radeon RX 9070 XT 16GB GDDR6 Hellhound Spectral White OC | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | PowerColor Radeon RX 9070 XT 16GB GDDR6 Hellhound White | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | PowerColor Radeon RX 9070 XT 16GB GDDR6 Reaper | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | PowerColor Radeon RX 9070 XT 16GB GDDR6 Reaper | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | PowerColor Radeon RX 9070 XT 16GB GDDR6 Red Devil | 900 | 750 | 900 | 900 | 650 | 900 | 0 | 600 | 900 | 0 |
| RX 9070 XT | PowerColor Radeon RX 9070 XT 16GB GDDR6 Red Devil | 900 | 750 | 900 | 900 | 650 | 900 | 0 | 600 | 900 | 0 |
| RX 9070 XT | PowerColor Radeon RX 9070 XT 16GB GDDR6 Red Devil Spectral White | 900 | 750 | 900 | 900 | 650 | 900 | 0 | 600 | 900 | 0 |
| RX 9070 XT | PowerColor Radeon RX 9070 XT 16GB GDDR6 Red Devil Spectral White | 900 | 750 | 900 | 900 | 650 | 900 | 0 | 600 | 900 | 0 |
| RX 9070 XT | PowerColor Radeon RX 9070 XT 16GB Hellhound | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | PowerColor Radeon RX 9070 XT 16GB Hellhound Reva Edition | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | PowerColor Radeon RX 9070 XT 16GB Hellhound White | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | PowerColor Radeon RX 9070 XT 16GB Reaper | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | PowerColor Radeon RX 9070 XT 16GB Red Devil | 900 | 750 | 900 | 900 | 650 | 900 | 0 | 600 | 900 | 0 |
| RX 9070 XT | PowerColor Radeon RX 9070 XT 16GB Red Devil Spectral White | 900 | 750 | 900 | 900 | 650 | 900 | 0 | 600 | 900 | 0 |
| RX 9070 XT | SAPPHIRE AMD RADEON NITRO+ RX 9070 XT OC CRIMSON DESERT EDITION 16GB … | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | SAPPHIRE NITRO+ RADEON RX 9070 XT 16GB GDDR6 | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | SAPPHIRE PULSE RADEON RX 9070 XT 16GB GDDR6 | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | SAPPHIRE PURE RADEON RX 9070 XT 16GB GDDR6 | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Sapphire Radeon RX 9070 XT | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Sapphire Radeon RX 9070 XT | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Sapphire Radeon RX 9070 XT 16GB GDDR6 NITRO+ OC Crimson Desert Edition | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Sapphire Radeon RX 9070 XT 16GB GDDR6 NITRO+ OC Crimson Desert Edition | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Sapphire Radeon RX 9070 XT 16GB GDDR6 Nitro+ | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Sapphire Radeon RX 9070 XT 16GB GDDR6 Nitro+ | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Sapphire Radeon RX 9070 XT 16GB GDDR6 Nitro+ Phantom Link OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Sapphire Radeon RX 9070 XT 16GB GDDR6 Nitro+ Phantom Link OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Sapphire Radeon RX 9070 XT 16GB GDDR6 Nitro+ Phantom Link Polar OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Sapphire Radeon RX 9070 XT 16GB GDDR6 Phantom Link Polar OC | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Sapphire Radeon RX 9070 XT 16GB GDDR6 Pulse | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Sapphire Radeon RX 9070 XT 16GB GDDR6 Pure | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Sapphire Radeon RX 9070 XT 16GB GDDR6 Pure | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Sapphire Radeon RX 9070 XT 16GB NITRO+ | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Sapphire Radeon RX 9070 XT 16GB NITRO+ OC Crimson Desert Edition | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Sapphire Radeon RX 9070 XT 16GB Nitro+ Phantom Link OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Sapphire Radeon RX 9070 XT 16GB Nitro+ Phantom Link Polar OC | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Sapphire Radeon RX 9070 XT 16GB Pulse | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | Sapphire Radeon RX 9070 XT 16GB Pure | 750 | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | XFX AMD RADEON RX9070 XT QUICKSILVER GAMING EDITION WHITE 16GB GDDR6 … | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | XFX MERCURY RX 9070XT OC RGB 16GB GDDR6 | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | XFX MERCURY RX 9070XT OC WHITE G RGB 16GB GDDR6 | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB GDDR6 Mercury Magnetic Air OC | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB GDDR6 Mercury Magnetic Air White OC | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB GDDR6 Mercury OC | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB GDDR6 Mercury OC Gaming Edition | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB GDDR6 Mercury OC White | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB GDDR6 Mercury OC White Gaming Edition | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB GDDR6 OC White Magnetic Air Edition RGB | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB GDDR6 Quicksilver Gaming Edition | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB GDDR6 Quicksilver OC | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB GDDR6 Quicksilver White | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB GDDR6 Quicksilver White | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB GDDR6 Quicksilver White | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB GDDR6 Swift Gaming Triple Fan | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB GDDR6 Swift Gaming Triple Fan White | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB GDDR6 Swift OC | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB GDDR6 Swift OC White | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB Mercury Gaming Edition | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB Mercury OC Gaming Edition | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB Mercury OC Magnetic Air Edition RGB | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB Mercury OC White Gaming Edition | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB OC White Magnetic Air Edition RGB | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB Quicksilver Gaming Edition | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB Quicksilver White | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB Swift Gaming Triple Fan | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | XFX Radeon RX 9070 XT 16GB Swift Gaming Triple Fan White | 800 | 750 | 800 | 800 | 650 | 800 | 0 | 600 | 800 | 0 |
| RX 9070 XT | XFX SWIFT RX 9070XT 3-FAN GAMING E. 16GB GDDR6 | — | 750 | 750 | 750 | 650 | 750 | 0 | 600 | 750 | 0 |
