// Official CPU power figure for the PSU formula, read from the maker's own page.
// Intel: "Maximum Turbo Power" (PL2) on the model's intel.com page.
// AMD: "Default TDP" from AMD's specifications table (amd.com publishes no PPT for a model; owner's decision 2026-10-12:
// use the stated TDP, labelled "TDP (AMD gives no PPT)"). Never derived from any other value; a record without a TDP has no row.
export interface CpuPowerRow {
  /** Chip names exactly as in the data; several only if each model's page states the same figure. */
  models: string[];
  /** Intel "Maximum Turbo Power" (PL2) / AMD "Default TDP" (TDP); PPT is kept in the type for a future official source. */
  kind: 'PL2' | 'PPT' | 'TDP';
  watts: number;
  /** Exact official URL fetched. */
  source: string;
  /** 'YYYY-MM-DD' */
  checked: string;
}

// Not covered (page shows no "Maximum Turbo Power"): Pentium G7400, Celeron G6900, Processor 300 (they list only Processor Base Power 46 W).
const AMD_TABLE = 'https://www.amd.com/en/products/specifications/processors.html';
export const CPU_POWER: CpuPowerRow[] = [
  { models: ['Core Ultra 5 225'], kind: 'PL2', watts: 121, source: 'https://www.intel.com/content/www/us/en/products/sku/241070/intel-core-ultra-5-processor-225-20m-cache-up-to-4-90-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core Ultra 5 225F'], kind: 'PL2', watts: 121, source: 'https://www.intel.com/content/www/us/en/products/sku/241069/intel-core-ultra-5-processor-225f-20m-cache-up-to-4-90-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core Ultra 5 225T'], kind: 'PL2', watts: 114, source: 'https://www.intel.com/content/www/us/en/products/sku/241870/intel-core-ultra-5-processor-225t-20m-cache-up-to-4-90-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core Ultra 5 235'], kind: 'PL2', watts: 121, source: 'https://www.intel.com/content/www/us/en/products/sku/241674/intel-core-ultra-5-processor-235-24m-cache-up-to-5-00-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core Ultra 5 235T'], kind: 'PL2', watts: 114, source: 'https://www.intel.com/content/www/us/en/products/sku/241872/intel-core-ultra-5-processor-235t-24m-cache-up-to-5-00-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core Ultra 5 245'], kind: 'PL2', watts: 121, source: 'https://www.intel.com/content/www/us/en/products/sku/241876/intel-core-ultra-5-processor-245-24m-cache-up-to-5-10-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core Ultra 5 245K'], kind: 'PL2', watts: 159, source: 'https://www.intel.com/content/www/us/en/products/sku/241067/intel-core-ultra-5-processor-245k-24m-cache-up-to-5-20-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core Ultra 5 245KF'], kind: 'PL2', watts: 159, source: 'https://www.intel.com/content/www/us/en/products/sku/241066/intel-core-ultra-5-processor-245kf-24m-cache-up-to-5-20-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core Ultra 5 245T'], kind: 'PL2', watts: 114, source: 'https://www.intel.com/content/www/us/en/products/sku/241874/intel-core-ultra-5-processor-245t-24m-cache-up-to-5-10-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core Ultra 5 250K Plus'], kind: 'PL2', watts: 159, source: 'https://www.intel.com/content/www/us/en/products/sku/245694/intel-core-ultra-5-processor-250k-plus-30m-cache-up-to-5-30-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core Ultra 5 250KF Plus'], kind: 'PL2', watts: 159, source: 'https://www.intel.com/content/www/us/en/products/sku/245689/intel-core-ultra-5-processor-250kf-plus-30m-cache-up-to-5-30-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core Ultra 7 265'], kind: 'PL2', watts: 182, source: 'https://www.intel.com/content/www/us/en/products/sku/241068/intel-core-ultra-7-processor-265-30m-cache-up-to-5-30-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core Ultra 7 265F'], kind: 'PL2', watts: 182, source: 'https://www.intel.com/content/www/us/en/products/sku/241064/intel-core-ultra-7-processor-265f-30m-cache-up-to-5-30-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core Ultra 7 265K'], kind: 'PL2', watts: 250, source: 'https://www.intel.com/content/www/us/en/products/sku/241063/intel-core-ultra-7-processor-265k-30m-cache-up-to-5-50-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core Ultra 7 265KF'], kind: 'PL2', watts: 250, source: 'https://www.intel.com/content/www/us/en/products/sku/241062/intel-core-ultra-7-processor-265kf-30m-cache-up-to-5-50-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core Ultra 7 265T'], kind: 'PL2', watts: 112, source: 'https://www.intel.com/content/www/us/en/products/sku/241065/intel-core-ultra-7-processor-265t-30m-cache-up-to-5-30-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core Ultra 7 270K Plus'], kind: 'PL2', watts: 250, source: 'https://www.intel.com/content/www/us/en/products/sku/245692/intel-core-ultra-7-processor-270k-plus-36m-cache-up-to-5-50-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core Ultra 9 285'], kind: 'PL2', watts: 182, source: 'https://www.intel.com/content/www/us/en/products/sku/241061/intel-core-ultra-9-processor-285-36m-cache-up-to-5-60-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core Ultra 9 285K'], kind: 'PL2', watts: 250, source: 'https://www.intel.com/content/www/us/en/products/sku/241060/intel-core-ultra-9-processor-285k-36m-cache-up-to-5-70-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core Ultra 9 285T'], kind: 'PL2', watts: 112, source: 'https://www.intel.com/content/www/us/en/products/sku/241059/intel-core-ultra-9-processor-285t-36m-cache-up-to-5-40-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i3-12100'], kind: 'PL2', watts: 89, source: 'https://www.intel.com/content/www/us/en/products/sku/134584/intel-core-i312100-processor-12m-cache-up-to-4-30-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i3-12100F'], kind: 'PL2', watts: 89, source: 'https://www.intel.com/content/www/us/en/products/sku/132223/intel-core-i312100f-processor-12m-cache-up-to-4-30-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i3-13100'], kind: 'PL2', watts: 110, source: 'https://www.intel.com/content/www/us/en/products/sku/230575/intel-core-i313100-processor-12m-cache-up-to-4-50-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i3-13100F'], kind: 'PL2', watts: 110, source: 'https://www.intel.com/content/www/us/en/products/sku/230576/intel-core-i313100f-processor-12m-cache-up-to-4-50-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i3-14100'], kind: 'PL2', watts: 110, source: 'https://www.intel.com/content/www/us/en/products/sku/236774/intel-core-i3-processor-14100-12m-cache-up-to-4-70-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i3-14100F'], kind: 'PL2', watts: 110, source: 'https://www.intel.com/content/www/us/en/products/sku/236786/intel-core-i3-processor-14100f-12m-cache-up-to-4-70-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i3-14100T'], kind: 'PL2', watts: 69, source: 'https://www.intel.com/content/www/us/en/products/sku/236775/intel-core-i3-processor-14100t-12m-cache-up-to-4-40-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i5-12400'], kind: 'PL2', watts: 117, source: 'https://www.intel.com/content/www/us/en/products/sku/134586/intel-core-i512400-processor-18m-cache-up-to-4-40-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i5-12400F'], kind: 'PL2', watts: 117, source: 'https://www.intel.com/content/www/us/en/products/sku/134587/intel-core-i512400f-processor-18m-cache-up-to-4-40-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i5-12400T'], kind: 'PL2', watts: 74, source: 'https://www.intel.com/content/www/us/en/products/sku/223094/intel-core-i512400t-processor-18m-cache-up-to-4-20-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i5-12500'], kind: 'PL2', watts: 117, source: 'https://www.intel.com/content/www/us/en/products/sku/96144/intel-core-i512500-processor-18m-cache-up-to-4-60-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i5-12600'], kind: 'PL2', watts: 117, source: 'https://www.intel.com/content/www/us/en/products/sku/96149/intel-core-i512600-processor-18m-cache-up-to-4-80-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i5-12600K'], kind: 'PL2', watts: 150, source: 'https://www.intel.com/content/www/us/en/products/sku/134589/intel-core-i512600k-processor-20m-cache-up-to-4-90-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i5-12600KF'], kind: 'PL2', watts: 150, source: 'https://www.intel.com/content/www/us/en/products/sku/134590/intel-core-i512600kf-processor-20m-cache-up-to-4-90-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i5-13400'], kind: 'PL2', watts: 148, source: 'https://www.intel.com/content/www/us/en/products/sku/230495/intel-core-i513400-processor-20m-cache-up-to-4-60-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i5-13400F'], kind: 'PL2', watts: 148, source: 'https://www.intel.com/content/www/us/en/products/sku/230501/intel-core-i513400f-processor-20m-cache-up-to-4-60-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i5-13500'], kind: 'PL2', watts: 154, source: 'https://www.intel.com/content/www/us/en/products/sku/230580/intel-core-i513500-processor-24m-cache-up-to-4-80-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i5-13500T'], kind: 'PL2', watts: 92, source: 'https://www.intel.com/content/www/us/en/products/sku/230578/intel-core-i513500t-processor-24m-cache-up-to-4-60-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i5-13600KF'], kind: 'PL2', watts: 181, source: 'https://www.intel.com/content/www/us/en/products/sku/230494/intel-core-i513600kf-processor-24m-cache-up-to-5-10-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i5-14400'], kind: 'PL2', watts: 148, source: 'https://www.intel.com/content/www/us/en/products/sku/236788/intel-core-i5-processor-14400-20m-cache-up-to-4-70-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i5-14400F'], kind: 'PL2', watts: 148, source: 'https://www.intel.com/content/www/us/en/products/sku/236777/intel-core-i5-processor-14400f-20m-cache-up-to-4-70-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i5-14400T'], kind: 'PL2', watts: 82, source: 'https://www.intel.com/content/www/us/en/products/sku/236790/intel-core-i5-processor-14400t-20m-cache-up-to-4-50-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i5-14500'], kind: 'PL2', watts: 154, source: 'https://www.intel.com/content/www/us/en/products/sku/236784/intel-core-i5-processor-14500-24m-cache-up-to-5-00-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i5-14500T'], kind: 'PL2', watts: 92, source: 'https://www.intel.com/content/www/us/en/products/sku/236780/intel-core-i5-processor-14500t-24m-cache-up-to-4-80-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i5-14600'], kind: 'PL2', watts: 154, source: 'https://www.intel.com/content/www/us/en/products/sku/236845/intel-core-i5-processor-14600-24m-cache-up-to-5-20-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i5-14600K'], kind: 'PL2', watts: 181, source: 'https://www.intel.com/content/www/us/en/products/sku/236799/intel-core-i5-processor-14600k-24m-cache-up-to-5-30-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i5-14600KF'], kind: 'PL2', watts: 181, source: 'https://www.intel.com/content/www/us/en/products/sku/236778/intel-core-i5-processor-14600kf-24m-cache-up-to-5-30-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i5-14600T'], kind: 'PL2', watts: 92, source: 'https://www.intel.com/content/www/us/en/products/sku/236782/intel-core-i5-processor-14600t-24m-cache-up-to-5-10-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i7-12700'], kind: 'PL2', watts: 180, source: 'https://www.intel.com/content/www/us/en/products/sku/134591/intel-core-i712700-processor-25m-cache-up-to-4-90-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i7-12700F'], kind: 'PL2', watts: 180, source: 'https://www.intel.com/content/www/us/en/products/sku/134592/intel-core-i712700f-processor-25m-cache-up-to-4-90-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i7-12700K'], kind: 'PL2', watts: 190, source: 'https://www.intel.com/content/www/us/en/products/sku/134594/intel-core-i712700k-processor-25m-cache-up-to-5-00-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i7-12700KF'], kind: 'PL2', watts: 190, source: 'https://www.intel.com/content/www/us/en/products/sku/134595/intel-core-i712700kf-processor-25m-cache-up-to-5-00-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i7-12700T'], kind: 'PL2', watts: 99, source: 'https://www.intel.com/content/www/us/en/products/sku/134596/intel-core-i712700t-processor-25m-cache-up-to-4-70-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i7-13700'], kind: 'PL2', watts: 219, source: 'https://www.intel.com/content/www/us/en/products/sku/230490/intel-core-i713700-processor-30m-cache-up-to-5-20-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i7-13700F'], kind: 'PL2', watts: 219, source: 'https://www.intel.com/content/www/us/en/products/sku/230491/intel-core-i713700f-processor-30m-cache-up-to-5-20-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i7-13700K'], kind: 'PL2', watts: 253, source: 'https://www.intel.com/content/www/us/en/products/sku/230500/intel-core-i713700k-processor-30m-cache-up-to-5-40-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i7-13700KF'], kind: 'PL2', watts: 253, source: 'https://www.intel.com/content/www/us/en/products/sku/230489/intel-core-i713700kf-processor-30m-cache-up-to-5-40-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i7-14700'], kind: 'PL2', watts: 219, source: 'https://www.intel.com/content/www/us/en/products/sku/236781/intel-core-i7-processor-14700-33m-cache-up-to-5-40-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i7-14700F'], kind: 'PL2', watts: 219, source: 'https://www.intel.com/content/www/us/en/products/sku/236854/intel-core-i7-processor-14700f-33m-cache-up-to-5-40-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i7-14700K'], kind: 'PL2', watts: 253, source: 'https://www.intel.com/content/www/us/en/products/sku/236783/intel-core-i7-processor-14700k-33m-cache-up-to-5-60-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i7-14700KF'], kind: 'PL2', watts: 253, source: 'https://www.intel.com/content/www/us/en/products/sku/236789/intel-core-i7-processor-14700kf-33m-cache-up-to-5-60-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i9-12900'], kind: 'PL2', watts: 202, source: 'https://www.intel.com/content/www/us/en/products/sku/134597/intel-core-i912900-processor-30m-cache-up-to-5-10-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i9-12900F'], kind: 'PL2', watts: 202, source: 'https://www.intel.com/content/www/us/en/products/sku/134598/intel-core-i912900f-processor-30m-cache-up-to-5-10-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i9-12900K'], kind: 'PL2', watts: 241, source: 'https://www.intel.com/content/www/us/en/products/sku/134599/intel-core-i912900k-processor-30m-cache-up-to-5-20-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i9-12900KF'], kind: 'PL2', watts: 241, source: 'https://www.intel.com/content/www/us/en/products/sku/134600/intel-core-i912900kf-processor-30m-cache-up-to-5-20-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i9-13900'], kind: 'PL2', watts: 219, source: 'https://www.intel.com/content/www/us/en/products/sku/230499/intel-core-i913900-processor-36m-cache-up-to-5-60-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i9-13900F'], kind: 'PL2', watts: 219, source: 'https://www.intel.com/content/www/us/en/products/sku/230502/intel-core-i913900f-processor-36m-cache-up-to-5-60-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i9-13900K'], kind: 'PL2', watts: 253, source: 'https://www.intel.com/content/www/us/en/products/sku/230496/intel-core-i913900k-processor-36m-cache-up-to-5-80-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i9-13900KF'], kind: 'PL2', watts: 253, source: 'https://www.intel.com/content/www/us/en/products/sku/230497/intel-core-i913900kf-processor-36m-cache-up-to-5-80-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i9-13900KS'], kind: 'PL2', watts: 253, source: 'https://www.intel.com/content/www/us/en/products/sku/232167/intel-core-i913900ks-processor-36m-cache-up-to-6-00-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i9-14900'], kind: 'PL2', watts: 219, source: 'https://www.intel.com/content/www/us/en/products/sku/236793/intel-core-i9-processor-14900-36m-cache-up-to-5-80-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i9-14900F'], kind: 'PL2', watts: 219, source: 'https://www.intel.com/content/www/us/en/products/sku/236853/intel-core-i9-processor-14900f-36m-cache-up-to-5-80-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i9-14900K'], kind: 'PL2', watts: 253, source: 'https://www.intel.com/content/www/us/en/products/sku/236773/intel-core-i9-processor-14900k-36m-cache-up-to-6-00-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i9-14900KF'], kind: 'PL2', watts: 253, source: 'https://www.intel.com/content/www/us/en/products/sku/236787/intel-core-i9-processor-14900kf-36m-cache-up-to-6-00-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i9-14900KS'], kind: 'PL2', watts: 253, source: 'https://www.intel.com/content/www/us/en/products/sku/237504/intel-core-i9-processor-14900ks-36m-cache-up-to-6-20-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Core i9-14900T'], kind: 'PL2', watts: 106, source: 'https://www.intel.com/content/www/us/en/products/sku/236791/intel-core-i9-processor-14900t-36m-cache-up-to-5-50-ghz/specifications.html', checked: '2026-10-11' },
  { models: ['Athlon 200GE'], kind: 'TDP', watts: 35, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Athlon™ 200GE": Default TDP 35 W
  { models: ['Athlon 300GE'], kind: 'TDP', watts: 35, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Athlon™ 300GE": Default TDP 35 W
  { models: ['Athlon 3000G'], kind: 'TDP', watts: 35, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Athlon™ 3000G": Default TDP 35 W
  { models: ['Ryzen 3 1200'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 3 1200": Default TDP 65 W
  { models: ['Ryzen 3 3200G'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 3 3200G with Radeon™ Vega 8 Graphics": Default TDP 65 W
  { models: ['Ryzen 3 4100'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 3 4100": Default TDP 65 W
  { models: ['Ryzen 3 4300G'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 3 4300G (OEM Only)": Default TDP 65 W
  { models: ['Ryzen 3 4300GE'], kind: 'TDP', watts: 35, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 3 4300GE (OEM Only)": Default TDP 35 W
  { models: ['Ryzen 3 5300G'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 3 5300G (OEM Only)": Default TDP 65 W
  { models: ['Ryzen 3 PRO 8300G'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 3 PRO 8300G": Default TDP 65 W
  { models: ['Ryzen 5 3400G'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 3400G with Radeon™ RX Vega 11 Graphics": Default TDP 65 W
  { models: ['Ryzen 5 3600'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 3600": Default TDP 65 W
  { models: ['Ryzen 5 3600X'], kind: 'TDP', watts: 95, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 3600X": Default TDP 95 W
  { models: ['Ryzen 5 4500'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 4500": Default TDP 65 W
  { models: ['Ryzen 5 4600G'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 4600G": Default TDP 65 W
  { models: ['Ryzen 5 5500'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 5500": Default TDP 65 W
  { models: ['Ryzen 5 5500F'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 5500F": Default TDP 65 W
  { models: ['Ryzen 5 5500GT'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 5500GT": Default TDP 65 W
  { models: ['Ryzen 5 5600'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 5600": Default TDP 65 W
  { models: ['Ryzen 5 5600G'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 5600G": Default TDP 65 W
  { models: ['Ryzen 5 5600GT'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 5600GT": Default TDP 65 W
  { models: ['Ryzen 5 5600T'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 5600T": Default TDP 65 W
  { models: ['Ryzen 5 5600X'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 5600X": Default TDP 65 W
  { models: ['Ryzen 5 5600XT'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 5600XT": Default TDP 65 W
  { models: ['Ryzen 5 7400'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 7400": Default TDP 65 W
  { models: ['Ryzen 5 7500'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 7500": Default TDP 65 W
  { models: ['Ryzen 5 7500F'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 7500F": Default TDP 65 W
  { models: ['Ryzen 5 7500X3D'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 7500X3D": Default TDP 65 W
  { models: ['Ryzen 5 7600'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 7600": Default TDP 65 W
  { models: ['Ryzen 5 7600X'], kind: 'TDP', watts: 105, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 7600X": Default TDP 105 W
  { models: ['Ryzen 5 8400F'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 8400F": Default TDP 65 W
  { models: ['Ryzen 5 8500G'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 8500G": Default TDP 65 W
  { models: ['Ryzen 5 8600G'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 8600G": Default TDP 65 W
  { models: ['Ryzen 5 9500F'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 9500F": Default TDP 65 W
  { models: ['Ryzen 5 9600'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 9600": Default TDP 65 W
  { models: ['Ryzen 5 9600X'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 9600X": Default TDP 65 W
  { models: ['Ryzen 5 PRO 4655G'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 PRO 4655G": Default TDP 65 W
  { models: ['Ryzen 5 PRO 5650G'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 PRO 5650G": Default TDP 65 W
  { models: ['Ryzen 5 PRO 7645'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 PRO 7645": Default TDP 65 W
  { models: ['Ryzen 5 PRO 8500G'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 PRO 8500G": Default TDP 65 W
  { models: ['Ryzen 5 PRO 8500GE'], kind: 'TDP', watts: 35, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 PRO 8500GE": Default TDP 35 W
  { models: ['Ryzen 5 PRO 8600G'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 PRO 8600G": Default TDP 65 W
  { models: ['Ryzen 5 PRO 9645'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 5 PRO 9645": Default TDP 65 W
  { models: ['Ryzen 7 5700'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 7 5700": Default TDP 65 W
  { models: ['Ryzen 7 5700G'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 7 5700G": Default TDP 65 W
  { models: ['Ryzen 7 5700X'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 7 5700X": Default TDP 65 W
  { models: ['Ryzen 7 5800X'], kind: 'TDP', watts: 105, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 7 5800X": Default TDP 105 W
  { models: ['Ryzen 7 5800X3D'], kind: 'TDP', watts: 105, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 7 5800X3D": Default TDP 105 W
  { models: ['Ryzen 7 5800XT'], kind: 'TDP', watts: 105, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 7 5800XT": Default TDP 105 W
  { models: ['Ryzen 7 7700'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 7 7700": Default TDP 65 W
  { models: ['Ryzen 7 7700X'], kind: 'TDP', watts: 105, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 7 7700X": Default TDP 105 W
  { models: ['Ryzen 7 7700X3D'], kind: 'TDP', watts: 120, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 7 7700X3D": Default TDP 120 W
  { models: ['Ryzen 7 7800X3D'], kind: 'TDP', watts: 120, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 7 7800X3D": Default TDP 120 W
  { models: ['Ryzen 7 8700F'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 7 8700F": Default TDP 65 W
  { models: ['Ryzen 7 8700G'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 7 8700G": Default TDP 65 W
  { models: ['Ryzen 7 9700X'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 7 9700X": Default TDP 65 W
  { models: ['Ryzen 7 9800X3D'], kind: 'TDP', watts: 120, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 7 9800X3D": Default TDP 120 W
  { models: ['Ryzen 7 9850X3D'], kind: 'TDP', watts: 120, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 7 9850X3D": Default TDP 120 W
  { models: ['Ryzen 7 PRO 3700'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 7 PRO 3700": Default TDP 65 W
  { models: ['Ryzen 7 PRO 7745'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 7 PRO 7745": Default TDP 65 W
  { models: ['Ryzen 7 PRO 8700G'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 7 PRO 8700G": Default TDP 65 W
  { models: ['Ryzen 7 PRO 9745'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 7 PRO 9745": Default TDP 65 W
  { models: ['Ryzen 9 5900XT'], kind: 'TDP', watts: 105, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 9 5900XT": Default TDP 105 W
  { models: ['Ryzen 9 5950X'], kind: 'TDP', watts: 105, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 9 5950X": Default TDP 105 W
  { models: ['Ryzen 9 7900'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 9 7900": Default TDP 65 W
  { models: ['Ryzen 9 7900X'], kind: 'TDP', watts: 170, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 9 7900X": Default TDP 170 W
  { models: ['Ryzen 9 7900X3D'], kind: 'TDP', watts: 120, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 9 7900X3D": Default TDP 120 W
  { models: ['Ryzen 9 7950X'], kind: 'TDP', watts: 170, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 9 7950X": Default TDP 170 W
  { models: ['Ryzen 9 7950X3D'], kind: 'TDP', watts: 120, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 9 7950X3D": Default TDP 120 W
  { models: ['Ryzen 9 9900X'], kind: 'TDP', watts: 120, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 9 9900X": Default TDP 120 W
  { models: ['Ryzen 9 9900X3D'], kind: 'TDP', watts: 120, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 9 9900X3D": Default TDP 120 W
  { models: ['Ryzen 9 9950X'], kind: 'TDP', watts: 170, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 9 9950X": Default TDP 170 W
  { models: ['Ryzen 9 9950X3D'], kind: 'TDP', watts: 170, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 9 9950X3D": Default TDP 170 W
  { models: ['Ryzen 9 9950X3D2'], kind: 'TDP', watts: 200, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 9 9950X3D2 Dual Edition": Default TDP 200 W
  { models: ['Ryzen 9 PRO 7945'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 9 PRO 7945": Default TDP 65 W
  { models: ['Ryzen 9 PRO 9945'], kind: 'TDP', watts: 65, source: AMD_TABLE, checked: '2026-10-12' }, // "AMD Ryzen™ 9 PRO 9945": Default TDP 65 W
// AMD rows: one per chip, each quoting its record in the table (record field "Default TDP").
// Uncovered (no record of that name in the table; not mapped to a similarly named one): Ryzen 7 5755G (the table has only PRO 5755G / PRO 5755GE), Ryzen 7 9850X3 (the table has Ryzen 7 9850X3D).
];

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

export function cpuPowerRow(name: string): CpuPowerRow | undefined {
  const n = norm(name);
  return CPU_POWER.find((r) => r.models.some((m) => norm(m) === n));
}
