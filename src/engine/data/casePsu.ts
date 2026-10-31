// Which power supplies the most-listed small cases take, read from each maker's own product page (owner 25/10,
// option B for rule 16). Cases have no PSU-size field in the shop data: without a row here rule 16 estimates from
// the case's size class. A row turns that into the maker's statement (basis "stated"). Pages downloaded on the row's
// date and kept in .superpowers/sdd/2026-10-25-step5-builder/task-5a-pages/; nothing is taken from memory.
// Applied at build time (src/lib/derive.ts `withCasePsu`) as the case fields `psuFormFactors` and `psuIncluded`.
// A maker page that states no PSU size, or that could not be downloaded, gives no row (see the task 5a report).

export type PsuForm = 'ATX' | 'SFX' | 'SFX-L';

export interface CasePsuRow {
  /** Case model keys exactly as in public/data/case (the chip's letters and digits, lower case). */
  models: string[];
  /** The PSU sizes the page says the case takes; [] = none (the case runs from an external adapter). "PS2" = ATX. */
  forms: PsuForm[];
  /** The case's own power: 'external' (an external adapter, no PSU bay) or the unit the page says is in the box. */
  included?: string;
  /** What the page states, as written there (label: value). */
  field: string;
  /** Exact official URL downloaded. */
  source: string;
  /** 'YYYY-MM-DD' */
  checked: string;
}

const D = '2026-10-27';
const TT = 'https://thermaltake.com/products/';
const FD = 'https://www.fractal-design.com/products/cases/';
const LL = 'https://lian-li.com/product/';

export const CASE_PSU: CasePsuRow[] = [
  { models: ['thermaltaketr100'], forms: ['SFX', 'SFX-L'], field: 'supporting both SFX and SFX-L PSUs', source: `${TT}tr100-mini-tower-chassis`, checked: D },
  { models: ['thermaltaketr100koralie'], forms: ['SFX', 'SFX-L'], field: 'supporting both SFX and SFX-L PSUs', source: `${TT}tr100-koralie-edition-mini-tower-chassis`, checked: D },
  { models: ['thermaltakethetower200', 'thermaltakethetower200mini'], forms: ['ATX'], field: 'PSU: Standard PS2 PSU (optional)', source: `${TT}the-tower-200-mini-chassis`, checked: D },
  { models: ['thermaltakethetower250'], forms: ['ATX', 'SFX'], field: 'PSU: Standard SFX or ATX PSU (optional)', source: `${TT}the-tower-250-mini-tower-chassis`, checked: D },
  { models: ['thermaltakethetower100', 'gamingthermaltakethetower100'], forms: ['ATX'], field: 'PSU: Standard PS2 PSU (optional)', source: `${TT}the-tower-100-mini-chassis`, checked: D },
  { models: ['thermaltakethetower300'], forms: ['ATX'], field: 'PSU: Standard PS2 PSU (optional)', source: `${TT}the-tower-300-micro-tower-chassis`, checked: D },
  { models: ['thermaltakecorev1', 'thermaltakecorev1miniitx'], forms: ['ATX'], field: 'PSU: Standard PS2 PSU (optional)', source: `${TT}core-v1`, checked: D },
  { models: ['fractaldesignterra'], forms: ['SFX', 'SFX-L'], field: 'cases_psuCompatibility: ["SFX","SFX-L"]', source: `${FD}terra-series/terra/terra-silver/`, checked: D },
  { models: ['fractaldesignera2', 'fractaldesignera2midnight'], forms: ['SFX', 'SFX-L'], field: 'cases_psuCompatibility: ["SFX","SFX-L"]', source: `${FD}era-series/era-2/era-2-charcoal-gray/`, checked: D },
  { models: ['fractaldesignmeshify2nano', 'gamingfractaldesignmeshify2nano'], forms: ['ATX'], field: 'cases_psuCompatibility: ["ATX"]', source: `${FD}meshify-series/meshify-2-nano/meshify-2-nano-white-tg-clear-tint/`, checked: D },
  { models: ['fractaldesignmood'], forms: ['SFX', 'SFX-L'], field: 'cases_psuCompatibility: ["SFX","SFX-L"]', source: `${FD}mood-series/mood/mood-light-gray/`, checked: D },
  { models: ['fractaldesigndefine7nano'], forms: ['ATX'], field: 'cases_psuCompatibility: ["ATX"]', source: `${FD}define-series/define-7-nano/define-7-nano-black-tg-light-tint/`, checked: D },
  { models: ['fractaldesigndefine7mini'], forms: ['ATX'], field: 'cases_psuCompatibility: ["ATX"]', source: `${FD}define-series/define-7-mini/define-7-mini-black-solid/`, checked: D },
  { models: ['fractaldesignpopminisilent'], forms: ['ATX'], field: 'cases_psuCompatibility: ["ATX"]', source: `${FD}pop-series/pop-mini-silent/pop-mini-silent-black-solid/`, checked: D },
  { models: ['corsair2000dairflow', 'corsair2000dairflowminiitx'], forms: ['SFX'], field: 'Case Power Supply: SFX', source: 'https://www.corsair.com/us/en/p/pc-cases/cc-9011245-ww/2000d-airflow-mini-itx-pc-case-white-cc-9011245-ww', checked: D },
  { models: ['nzxth2flow'], forms: ['SFX', 'SFX-L'], field: 'Power Supply Type: SFX, SFX-L', source: 'https://nzxt.com/products/H2-Flow', checked: D },
  { models: ['lianlia4h2o'], forms: ['SFX', 'SFX-L'], field: 'PSU SUPPORT: SFX, SFX-L', source: `${LL}a4h2o/`, checked: D },
  { models: ['lianlia3matx', 'lianlidana3', 'lianlidan'], forms: ['ATX', 'SFX', 'SFX-L'], field: 'PSU SUPPORT: ATX/SFX/SFX-L (Max 220mm)', source: `${LL}a3-matx/`, checked: D },
  { models: ['lianlib4'], forms: ['ATX', 'SFX'], field: 'PSU SUPPORT: ATX (Up to 140mm) / SFX', source: `${LL}b4-matx/`, checked: D },
  { models: ['lianlio11visionm', 'lianlilio11visionm'], forms: ['ATX'], field: 'PSU SUPPORT: ATX (Under 182mm)', source: `${LL}o11-vision-m/`, checked: D },
  { models: ['deepcoolch260'], forms: ['ATX'], field: 'Power Supply Type: ATX PS2 (maximum length: 150mm)', source: 'https://www.deepcool.com/products/Cases/CH260-High-Airflow-M-ATX-Compact-Case-Supports-Rear-Connector-Motherboards/2025/20030.shtml', checked: D },
  { models: ['akasaeulermxpluscube'], forms: [], included: 'external', field: 'Included DC-to-DC internal adapter; External AC Power Adapter', source: 'https://www.akasa.co.uk/update.php?tpl=product/product.detail.tpl&model=A-ITX56-M1B', checked: D },
  { models: ['akasaeulertplusnuc'], forms: [], included: 'external', field: 'External AC Power Adapter (Optional)', source: 'https://www.akasa.co.uk/update.php?tpl=product/product.detail.tpl&model=A-ITX57-M1B', checked: D },
  { models: ['chieftecbt02bu3', 'chieftecbt02bu3250w'], forms: ['SFX'], included: 'SFX 250 W', field: 'Power supply: SFX-250VS / 250Watt SFX 230V only', source: 'https://www.chieftec.eu/products-detail/93/BT-02B-U3-250VS', checked: D },
];

/** The row for a case model key, if any. */
export function casePsu(modelKey: string): CasePsuRow | undefined {
  return CASE_PSU.find((r) => r.models.includes(modelKey));
}
