// Real data for the component catalogue: today's list.json of every category (served by the data plugin
// in development), grouped into models exactly as the site does, plus the examples each state needs.
// Where today's data can't show a state (availability isn't collected yet), the example is marked as a
// sample in the catalogue.
import { useEffect, useState } from 'react';
import { CATEGORIES, CATEGORY_IDS, type CategoryConfig } from '../lib/categories';
import { groupModels, loadData, mostCommon, type CategoryData, type Model } from '../lib/data';
import { productImage, type ProductImage } from '../lib/images';
import { prepare, type PreparedIndex, type SearchIndexFile } from '../lib/search';
import type { BaseListing, Category, DailyLow, SourceName } from '../types';
import type { PriceInfo } from '../ui/PriceCell';
import { isStale } from '../ui/PriceCell';
import type { SourceTimes } from '../ui/nav';
import { CATS } from '../shell/nav';
import type { Text } from '../lib/i18n';

export type AnyModel = Model<BaseListing>;

export interface PreviewData {
  data: Record<Category, CategoryData>;
  /** Models per category, most-listed first. */
  models: Record<Category, AnyModel[]>;
  counts: Record<Category, number>;
  index: PreparedIndex;
  sourceTimes: (cat: Category) => SourceTimes;
  siteTimes: SourceTimes;
  staleIn: { source: SourceName; category: Text; updatedAt: string }[];
}

/** Change vs. the most recent daily low at least 7 days old (as v1's list). */
export function weekChange(points: DailyLow[] | undefined, current: number): number | null {
  if (!points?.length) return null;
  const cutoff = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const past = [...points].reverse().find((p) => p.d <= cutoff);
  return past ? current - past.min : null;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/** Far below the model's other offers: under 60% of the median of at least 4 listings. */
export const isUnusual = (m: AnyModel, l: BaseListing) => m.listings.length >= 4 && l.price < 0.6 * median(m.listings.map((x) => x.price));

export function priceInfo(d: PreviewData, cat: Category, m: AnyModel, l: BaseListing = m.cheapest): PriceInfo {
  return {
    price: l.price,
    source: l.source,
    shop: l.merchant ?? null,
    shipping: l.total != null ? Math.round((l.total - l.price) * 100) / 100 : null,
    checkedAt: d.data[cat].latest.sources[l.source]?.updatedAt ?? null,
    week: l === m.cheapest ? weekChange(d.data[cat].history[m.key], l.price) : null,
    unusual: isUnusual(m, l),
  };
}

export const imageOf = (d: PreviewData, cat: Category, m: AnyModel): ProductImage | null => productImage(d.data[cat].img[m.key]);
export const sourcesOf = (m: AnyModel) => new Set(m.listings.map((l) => l.source)).size;

export function usePreviewData(): PreviewData | null {
  const [d, setD] = useState<PreviewData | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all(CATEGORY_IDS.map((c) => loadData(c))).then((all) => {
      if (!live) return;
      const data = Object.fromEntries(CATEGORY_IDS.map((c, i) => [c, all[i]])) as Record<Category, CategoryData>;
      const models = Object.fromEntries(
        CATEGORY_IDS.map((c) => {
          const cfg = CATEGORIES[c] as unknown as CategoryConfig<BaseListing>;
          const ms = groupModels(data[c].latest.listings, cfg).sort((a, b) => b.listings.length - a.listings.length);
          return [c, ms];
        }),
      ) as Record<Category, AnyModel[]>;
      const file: SearchIndexFile = {
        cats: Object.fromEntries(
          CATEGORY_IDS.map((c) => [
            c,
            {
              m: models[c].map((m) => [m.chip, m.cheapest.price] as [string, number]),
              mk: [...new Set(data[c].latest.listings.map((l) => (c === 'gpu' ? (l as BaseListing & { partner: string }).partner : l.brand)))].filter(Boolean).sort(),
            },
          ]),
        ),
      };
      const sourceTimes = (c: Category): SourceTimes => data[c].latest.sources as SourceTimes;
      const siteTimes: SourceTimes = {};
      const staleIn: PreviewData['staleIn'] = [];
      for (const c of CATEGORY_IDS) {
        for (const [s, meta] of Object.entries(data[c].latest.sources) as [SourceName, { updatedAt: string | null }][]) {
          if (!meta?.updatedAt) continue;
          const prev = siteTimes[s]?.updatedAt;
          if (!prev || meta.updatedAt > prev) siteTimes[s] = { updatedAt: meta.updatedAt };
          if (isStale(meta.updatedAt)) staleIn.push({ source: s, category: CATS[c].name, updatedAt: meta.updatedAt });
        }
      }
      setD({
        data,
        models,
        counts: Object.fromEntries(CATEGORY_IDS.map((c) => [c, models[c].length])) as Record<Category, number>,
        index: prepare(file),
        sourceTimes,
        siteTimes,
        staleIn,
      });
    });
    return () => {
      live = false;
    };
  }, []);
  return d;
}

/** The examples the price cell's states need, chosen from today's data. */
export function priceExamples(d: PreviewData) {
  const all = (['gpu', 'cpu', 'ram', 'storage', 'mobo', 'psu'] as Category[]).flatMap((c) => d.models[c].map((m) => ({ c, m })));
  const known = all.find(({ c, m }) => m.cheapest.merchant && m.cheapest.total != null && Math.abs(weekChange(d.data[c].history[m.key], m.cheapest.price) ?? 0) >= 1);
  const noShipping = all.find(({ m }) => m.cheapest.total == null && m.listings.length >= 5);
  const noAvail = all.find(({ m }) => m.cheapest.merchant && m.cheapest.total != null && m !== known?.m);
  let stale: { c: Category; m: AnyModel; l: BaseListing } | undefined;
  for (const { c, m } of all.concat(d.models.case.map((m) => ({ c: 'case' as Category, m })))) {
    const l = m.listings.find((x) => isStale(d.data[c].latest.sources[x.source]?.updatedAt));
    if (l) {
      stale = { c, m, l };
      break;
    }
  }
  let unusual: { c: Category; m: AnyModel; l: BaseListing; ratio: number } | undefined;
  for (const { c, m } of all) {
    if (m.listings.length < 4 || m.cheapest.price < 20) continue;
    const ratio = m.cheapest.price / median(m.listings.map((x) => x.price));
    if (isUnusual(m, m.cheapest) && (!unusual || ratio < unusual.ratio)) unusual = { c, m, l: m.cheapest, ratio };
  }
  return { known, noShipping, noAvail, stale, unusual };
}

const common = <T,>(m: AnyModel, f: (l: Record<string, unknown>) => T | null | undefined) => mostCommon(m.listings.map((l) => f(l as unknown as Record<string, unknown>)));
/** A value every listing that states it agrees on (so the spec line shows the same), else null. */
function agreed<T>(m: AnyModel, f: (l: Record<string, unknown>) => T | null | undefined): T | null {
  const vals = new Set(m.listings.map((l) => f(l as unknown as Record<string, unknown>)).filter((v) => v != null));
  return vals.size === 1 ? ([...vals][0] as T) : null;
}

export interface CompatExample {
  a: { cat: Category; m: AnyModel };
  b: { cat: Category; m: AnyModel };
}

/**
 * Real product pairs whose data produces each compatibility state (the catalogue's examples; Phase 2
 * brings the full rules). Values are read the same way as the spec line (most common across listings),
 * and a stated value must be the one every listing agrees on.
 */
export function compatExamples(d: PreviewData) {
  const num = (v: unknown) => (typeof v === 'number' ? v : null);
  const len = (m: AnyModel) => common(m, (l) => num(l.lengthMm));
  const gpus = d.models.gpu.filter((m) => len(m) != null);
  const cases = d.models.case;
  const boardOf = (m: AnyModel) => agreed(m, (l) => l.maxBoard as string | null);
  const gpuMax = (m: AnyModel) => common(m, (l) => num(l.gpuMaxMm));
  const coolerMax = (m: AnyModel) => common(m, (l) => num(l.coolerMaxMm));
  const height = (m: AnyModel) => common(m, (l) => num(l.heightMm));
  const airCoolers = d.models.cooler.filter((m) => common(m, (l) => l.type) === 'Air');

  // A Micro ATX case (all listings agree) with a card that fits it by less than 10 mm.
  let tight: { caseM: AnyModel; gpu: AnyModel; L: number; M: number } | null = null;
  for (const c of cases) {
    const M = gpuMax(c);
    if (boardOf(c) !== 'Micro ATX' || M == null || coolerMax(c) == null) continue;
    const g = gpus.find((x) => M - len(x)! >= 0 && M - len(x)! < 10);
    if (g) {
      tight = { caseM: c, gpu: g, L: len(g)!, M };
      break;
    }
  }
  const atxBoard = d.models.mobo.find((m) => common(m, (l) => l.socket) === 'AM5' && agreed(m, (l) => l.formFactor) === 'ATX' && common(m, (l) => l.memory) === 'DDR5') ?? null;
  const am5Cpu = d.models.cpu.find((m) => m.chip === 'Ryzen 7 9800X3D') ?? d.models.cpu.find((m) => common(m, (l) => l.socket) === 'AM5')!;
  const ddr5 = d.models.ram.find((m) => m.key.startsWith('DDR5 32GB (2×16GB) 6000MHz')) ?? d.models.ram[0];
  // A case that states no largest board at all, sized Midi Tower (v1 guesses ATX from the size).
  const guessCase = cases.find((m) => m.listings.every((l) => (l as unknown as { maxBoard?: unknown }).maxBoard == null) && common(m, (l) => l.size) === 'Midi Tower') ?? null;
  const tightCoolerMax = tight ? coolerMax(tight.caseM) : null;
  const unknownCooler = airCoolers.find((m) => height(m) == null) ?? null;
  const fitsCooler = tightCoolerMax != null ? (airCoolers.find((m) => (height(m) ?? Infinity) <= tightCoolerMax) ?? null) : null;
  return {
    tight,
    atxBoard,
    am5Cpu,
    ddr5,
    guessCase,
    unknownCooler,
    fitsCooler,
    coolerMaxOfCase: tightCoolerMax,
    heightOf: height,
  };
}
