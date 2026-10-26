// Which Box CPUs come with a cooler, read from the maker's own product page (amd.com), field "Thermal Solution (PIB)".
// A chip whose page lacks the field, or whose page could not be downloaded, has no row (unknown); nothing is
// inferred from another chip or family. Intel: only an intel.com page that names the boxed cooler would count (owner
// 2026-10-25); the "Thermal Solution Specification: PCG ..." class is a design class and never counts. intel.com
// got HTTP 403 on one download and a second attempt was blocked by the permission system, so there are no Intel rows.
export interface CpuBoxRow {
  /** Chip names exactly as in the data. */
  models: string[];
  /** The cooler the page names; null = the page says none is in the box ("Not Included"). */
  cooler: string | null;
  /** The page field read. */
  field: string;
  /** Exact official URL downloaded. */
  source: string;
  /** 'YYYY-MM-DD' */
  checked: string;
}

export const CPU_BOX: CpuBoxRow[] = [
  { models: ['Ryzen 5 5500F'], cooler: 'AMD Wraith Stealth', field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/5000-series/amd-ryzen-5-5500f.html', checked: '2026-10-26' },
  { models: ['Ryzen 5 5600T'], cooler: 'AMD Wraith Stealth', field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/5000-series/amd-ryzen-5-5600t.html', checked: '2026-10-26' },
  { models: ['Ryzen 5 5600X'], cooler: 'AMD Wraith Stealth', field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/5000-series/amd-ryzen-5-5600x.html', checked: '2026-10-26' },
  { models: ['Ryzen 5 5600XT'], cooler: 'AMD Wraith Stealth', field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/5000-series/amd-ryzen-5-5600xt.html', checked: '2026-10-26' },
  { models: ['Ryzen 5 7400'], cooler: 'AMD Wraith Stealth', field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-5-7400.html', checked: '2026-10-26' },
  { models: ['Ryzen 5 7500'], cooler: 'AMD Wraith Stealth', field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-5-7500.html', checked: '2026-10-26' },
  { models: ['Ryzen 5 7500X3D'], cooler: null, field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-5-7500x3d.html', checked: '2026-10-26' },
  { models: ['Ryzen 5 7600'], cooler: 'AMD Wraith Stealth', field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-5-7600.html', checked: '2026-10-26' },
  { models: ['Ryzen 5 7600X'], cooler: null, field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-5-7600x.html', checked: '2026-10-26' },
  { models: ['Ryzen 5 9600'], cooler: 'AMD Wraith Stealth', field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-5-9600.html', checked: '2026-10-26' },
  { models: ['Ryzen 5 9600X'], cooler: null, field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-5-9600x.html', checked: '2026-10-26' },
  { models: ['Ryzen 7 5800X'], cooler: null, field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/5000-series/amd-ryzen-7-5800x.html', checked: '2026-10-26' },
  { models: ['Ryzen 7 5800X3D'], cooler: null, field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/5000-series/amd-ryzen-7-5800x3d.html', checked: '2026-10-26' },
  { models: ['Ryzen 7 7700X'], cooler: null, field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-7-7700x.html', checked: '2026-10-26' },
  { models: ['Ryzen 7 7700X3D'], cooler: null, field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-7-7700x3d.html', checked: '2026-10-26' },
  { models: ['Ryzen 7 7800X3D'], cooler: null, field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-7-7800x3d.html', checked: '2026-10-26' },
  { models: ['Ryzen 7 9700X'], cooler: null, field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-7-9700x.html', checked: '2026-10-26' },
  { models: ['Ryzen 7 9800X3D'], cooler: null, field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-7-9800x3d.html', checked: '2026-10-26' },
  { models: ['Ryzen 7 9850X3D'], cooler: null, field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-7-9850x3d.html', checked: '2026-10-26' },
  { models: ['Ryzen 9 5900XT'], cooler: null, field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/5000-series/amd-ryzen-9-5900xt.html', checked: '2026-10-26' },
  { models: ['Ryzen 9 5950X'], cooler: null, field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/5000-series/amd-ryzen-9-5950x.html', checked: '2026-10-26' },
  { models: ['Ryzen 9 7900X'], cooler: null, field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-9-7900x.html', checked: '2026-10-26' },
  { models: ['Ryzen 9 7900X3D'], cooler: null, field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-9-7900x3d.html', checked: '2026-10-26' },
  { models: ['Ryzen 9 7950X'], cooler: null, field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-9-7950x.html', checked: '2026-10-26' },
  { models: ['Ryzen 9 7950X3D'], cooler: null, field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-9-7950x3d.html', checked: '2026-10-26' },
  { models: ['Ryzen 9 9900X'], cooler: null, field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-9-9900x.html', checked: '2026-10-26' },
  { models: ['Ryzen 9 9900X3D'], cooler: null, field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-9-9900x3d.html', checked: '2026-10-26' },
  { models: ['Ryzen 9 9950X'], cooler: null, field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-9-9950x.html', checked: '2026-10-26' },
  { models: ['Ryzen 9 9950X3D'], cooler: null, field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-9-9950x3d.html', checked: '2026-10-26' },

  { models: ['Ryzen 9 9950X3D2'], cooler: null, field: 'Thermal Solution (PIB)', source: 'https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-9-9950x3d2-dual-edition.html', checked: '2026-10-26' },
];

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

export function boxCooler(chip: string): { included: boolean; cooler: string | null; source: string } | undefined {
  const n = norm(chip);
  const r = CPU_BOX.find((row) => row.models.some((m) => norm(m) === n));
  return r ? { included: r.cooler !== null, cooler: r.cooler, source: r.source } : undefined;
}
