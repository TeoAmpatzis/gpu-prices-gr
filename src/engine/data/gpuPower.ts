// Official graphics-chip power, read from the chip maker's own product page (nvidia.com / amd.com / intel.com).
// A value the page does not show is left out (unknown); nothing here is derived from another value.
export interface GpuPowerRow {
  /** GPU chip names exactly as in the data (`chip`). */
  chips: string[];
  /** NVIDIA "Total Graphics Power", AMD "Typical Board Power (Desktop)", Intel "Total Board Power". */
  boardPowerW?: number;
  /** NVIDIA "Required System Power", AMD "Recommended PSU", Intel's recommended PSU if stated. */
  makerPsuW?: number;
  /** Exact official URL fetched. */
  source: string;
  /** 'YYYY-MM-DD' */
  checked: string;
}

export const GPU_OFFICIAL_DOMAINS: string[] = ['nvidia.com', 'amd.com', 'intel.com'];

export const GPU_POWER: GpuPowerRow[] = [
  // NVIDIA pages: "Total Graphics Power (W)" and "Required System Power (W)"; the 30-series pages label the first "Graphics Card Power (W)".
  { chips: ['RTX 5090'], boardPowerW: 575, makerPsuW: 1000,
    source: 'https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/', checked: '2026-10-12' },
  { chips: ['RTX 5080'], boardPowerW: 360, makerPsuW: 850,
    source: 'https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5080/', checked: '2026-10-12' },
  // Table columns "GeForce RTX 5070 Ti, GeForce RTX 5070": TGP 300 250, system power 750 650.
  { chips: ['RTX 5070 Ti'], boardPowerW: 300, makerPsuW: 750,
    source: 'https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5070-family/', checked: '2026-10-12' },
  // Same page, second column.
  { chips: ['RTX 5070'], boardPowerW: 250, makerPsuW: 650,
    source: 'https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5070-family/', checked: '2026-10-12' },
  // Table columns "GeForce RTX 5060 Ti, GeForce RTX 5060": TGP 180 145, system power 600 550.
  { chips: ['RTX 5060 Ti'], boardPowerW: 180, makerPsuW: 600,
    source: 'https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5060-family/', checked: '2026-10-12' },
  // Same page, second column.
  { chips: ['RTX 5060'], boardPowerW: 145, makerPsuW: 550,
    source: 'https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5060-family/', checked: '2026-10-12' },
  { chips: ['RTX 5050'], boardPowerW: 130, makerPsuW: 550,
    source: 'https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5050/', checked: '2026-10-12' },
  // Columns "RTX 4080 SUPER, RTX 4080" both TGP 320 / system power 750.
  { chips: ['RTX 4080'], boardPowerW: 320, makerPsuW: 750,
    source: 'https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4080-family/', checked: '2026-10-12' },
  // Columns "4070 Ti SUPER, 4070 Ti, 4070 SUPER, 4070": TGP 285 285 220 200, system power 700 700 650 650.
  { chips: ['RTX 4070 Ti Super', 'RTX 4070 Ti'], boardPowerW: 285, makerPsuW: 700,
    source: 'https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4070-family/', checked: '2026-10-12' },
  // Columns "RTX 4060 Ti, RTX 4060": TGP "165 or 160" 115, system power 550 550.
  { chips: ['RTX 4060'], boardPowerW: 115, makerPsuW: 550,
    source: 'https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4060-4060ti/', checked: '2026-10-12' },
  // Board power left out: the page says "165 or 160". System power 550.
  { chips: ['RTX 4060 Ti'], makerPsuW: 550,
    source: 'https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4060-4060ti/', checked: '2026-10-12' },
  // Columns "RTX 3090 Ti, RTX 3090": Graphics Card Power 450 350, system power 850 750.
  { chips: ['RTX 3090'], boardPowerW: 350, makerPsuW: 750,
    source: 'https://www.nvidia.com/en-us/geforce/graphics-cards/30-series/rtx-3090-3090ti/', checked: '2026-10-12' },
  // Board power left out: the page says "350 / 320" for the RTX 3080. System power 750.
  { chips: ['RTX 3080'], makerPsuW: 750,
    source: 'https://www.nvidia.com/en-us/geforce/graphics-cards/30-series/rtx-3080/', checked: '2026-10-12' },
  // Columns "RTX 3070 Ti, RTX 3070": Graphics Card Power 290 220, system power 750 650.
  { chips: ['RTX 3070 Ti'], boardPowerW: 290, makerPsuW: 750,
    source: 'https://www.nvidia.com/en-us/geforce/graphics-cards/30-series/rtx-3070-3070ti/', checked: '2026-10-12' },
  // Same page, second column.
  { chips: ['RTX 3070'], boardPowerW: 220, makerPsuW: 650,
    source: 'https://www.nvidia.com/en-us/geforce/graphics-cards/30-series/rtx-3070-3070ti/', checked: '2026-10-12' },
  // Columns "RTX 3060 Ti, RTX 3060": Graphics Card Power 200 170, system power 600 550.
  { chips: ['RTX 3060 Ti'], boardPowerW: 200, makerPsuW: 600,
    source: 'https://www.nvidia.com/en-us/geforce/graphics-cards/30-series/rtx-3060-3060ti/', checked: '2026-10-12' },
  // Same page, second column.
  { chips: ['RTX 3060'], boardPowerW: 170, makerPsuW: 550,
    source: 'https://www.nvidia.com/en-us/geforce/graphics-cards/30-series/rtx-3060-3060ti/', checked: '2026-10-12' },
  // Board power left out: two variants, "20 W 30 W". "Minimum Recommended System Power" 300 W in both.
  { chips: ['GT 1030'], makerPsuW: 300,
    source: 'https://www.nvidia.com/en-us/geforce/graphics-cards/gt-1030/specifications/', checked: '2026-10-12' },
  // AMD pages: "Typical Board Power (Desktop)" and "Minimum PSU Recommendation".
  { chips: ['RX 9070 XT'], boardPowerW: 304, makerPsuW: 750,
    source: 'https://www.amd.com/en/products/graphics/desktops/radeon/9000-series/amd-radeon-rx-9070xt.html', checked: '2026-10-12' },
  { chips: ['RX 9070'], boardPowerW: 220, makerPsuW: 650,
    source: 'https://www.amd.com/en/products/graphics/desktops/radeon/9000-series/amd-radeon-rx-9070.html', checked: '2026-10-12' },
  { chips: ['RX 9070 GRE'], boardPowerW: 220, makerPsuW: 650,
    source: 'https://www.amd.com/en/products/graphics/desktops/radeon/9000-series/amd-radeon-rx-9070-gre.html', checked: '2026-10-12' },
  // Board power left out: the 16GB page says 160W, the 8GB page (.../amd-radeon-rx-9060xt-8gb.html) says 150W; both say 450W.
  { chips: ['RX 9060 XT'], makerPsuW: 450,
    source: 'https://www.amd.com/en/products/graphics/desktops/radeon/9000-series/amd-radeon-rx-9060xt.html', checked: '2026-10-12' },
  { chips: ['RX 7900 XTX'], boardPowerW: 355, makerPsuW: 800,
    source: 'https://www.amd.com/en/products/graphics/desktops/radeon/7000-series/amd-radeon-rx-7900xtx.html', checked: '2026-10-12' },
  { chips: ['RX 7800 XT'], boardPowerW: 263, makerPsuW: 700,
    source: 'https://www.amd.com/en/products/graphics/desktops/radeon/7000-series/amd-radeon-rx-7800-xt.html', checked: '2026-10-12' },
  { chips: ['RX 7700 XT'], boardPowerW: 245, makerPsuW: 700,
    source: 'https://www.amd.com/en/products/graphics/desktops/radeon/7000-series/amd-radeon-rx-7700-xt.html', checked: '2026-10-12' },
  { chips: ['RX 7600'], boardPowerW: 165, makerPsuW: 550,
    source: 'https://www.amd.com/en/products/graphics/desktops/radeon/7000-series/amd-radeon-rx-7600.html', checked: '2026-10-12' },
  { chips: ['RX 6800'], boardPowerW: 250, makerPsuW: 650,
    source: 'https://www.amd.com/en/products/graphics/desktops/radeon/6000-series/amd-radeon-rx-6800.html', checked: '2026-10-12' },
  { chips: ['RX 6700 XT'], boardPowerW: 230, makerPsuW: 650,
    source: 'https://www.amd.com/en/products/graphics/desktops/radeon/6000-series/amd-radeon-rx-6700-xt.html', checked: '2026-10-12' },
  { chips: ['RX 6650 XT'], boardPowerW: 180, makerPsuW: 500,
    source: 'https://www.amd.com/en/products/graphics/desktops/radeon/6000-series/amd-radeon-rx-6650-xt.html', checked: '2026-10-12' },
  { chips: ['RX 6600 XT'], boardPowerW: 160, makerPsuW: 500,
    source: 'https://www.amd.com/en/products/graphics/desktops/radeon/6000-series/amd-radeon-rx-6600-xt.html', checked: '2026-10-12' },
  { chips: ['RX 6400'], boardPowerW: 53, makerPsuW: 350,
    source: 'https://www.amd.com/en/products/graphics/desktops/radeon/6000-series/amd-radeon-rx-6400.html', checked: '2026-10-12' },
  // Intel pages: "TBP"; "Minimum Power Supply Unit" only where the page has it (B580).
  { chips: ['Arc B580'], boardPowerW: 190, makerPsuW: 600,
    source: 'https://www.intel.com/content/www/us/en/products/sku/241598/intel-arc-b580-graphics/specifications.html', checked: '2026-10-12' },
  { chips: ['Arc B570'], boardPowerW: 150,
    source: 'https://www.intel.com/content/www/us/en/products/sku/241676/intel-arc-b570-graphics/specifications.html', checked: '2026-10-12' },
  { chips: ['Arc A750'], boardPowerW: 225,
    source: 'https://www.intel.com/content/www/us/en/products/sku/227954/intel-arc-a750-graphics/specifications.html', checked: '2026-10-12' },
  { chips: ['Arc A580'], boardPowerW: 185,
    source: 'https://www.intel.com/content/www/us/en/products/sku/227961/intel-arc-a580-graphics/specifications.html', checked: '2026-10-12' },
  { chips: ['Arc A380'], boardPowerW: 75,
    source: 'https://www.intel.com/content/www/us/en/products/sku/227959/intel-arc-a380-graphics/specifications.html', checked: '2026-10-12' },
  { chips: ['Arc A310'], boardPowerW: 75,
    source: 'https://www.intel.com/content/www/us/en/products/sku/227958/intel-arc-a310-graphics/specifications.html', checked: '2026-10-12' },
];

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

export function gpuPowerRow(chip: string): GpuPowerRow | undefined {
  const n = norm(chip);
  return GPU_POWER.find((r) => r.chips.some((c) => norm(c) === n));
}
