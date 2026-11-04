// A product page's price history (step 4, task 7; docs/redesign-v2.md "Σελίδα προϊόντος" part 3): the chart with
// 30 days / 90 days / 1 year / All, the all-time low marked, and one sentence against the 90-day median.
// The chart is PriceChart (lazy, shared with the category page's expanded row); the low is data.historyLow (the
// category page's allTimeLow rule); the sentence is lib/priceSummary.
import { lazy, Suspense, useId, useMemo, useState } from 'react';
import { historyLow } from '../../lib/data';
import { tr, useLang, type Text } from '../../lib/i18n';
import { DEFAULT_RANGE, lowSentence, medianSummary, RANGES, rangeStart, type HistoryRange } from '../../lib/priceSummary';
import type { ModelEntry } from '../../types';
import { UI } from '../../ui/strings';
import { PRODUCT } from './productStrings';

const PriceChart = lazy(() => import('../PriceChart'));

const LABEL: Record<HistoryRange, Text> = { '30': UI.range30, '90': UI.range90, '365': UI.range365, all: UI.rangeAll };

export function PriceHistory({ entry }: { entry: ModelEntry }) {
  const lang = useLang();
  const titleId = useId();
  const [range, setRange] = useState<HistoryRange>(DEFAULT_RANGE);
  const low = useMemo(() => historyLow(entry.history, entry.imported ?? undefined), [entry]);
  const summary = useMemo(() => medianSummary(entry.history), [entry]);

  // Where the record comes from; a dated low (ours or a Skroutz day) older than the drawn range says so, so text and
  // chart never contradict.
  const lowText = low && lowSentence(lang, low, low.date != null && low.date < rangeStart(entry.history, range));

  const sentence =
    summary.kind === 'few'
      ? tr(lang, UI.medianFew)
      : tr(lang, summary.dir === 'below' ? UI.medianBelow : summary.dir === 'above' ? UI.medianAbove : UI.medianEqual).replace('{n}', String(summary.pct));

  return (
    <section aria-labelledby={titleId} className="product-history flex min-w-0 flex-col gap-3" data-price-history>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          {tr(lang, PRODUCT.history)}
        </h2>
        <div role="group" aria-label={tr(lang, UI.historyRanges)} className="flex gap-0.5 rounded-lg bg-hover p-0.5 ring-1 ring-inset ring-edge">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              data-range={r}
              onClick={() => setRange(r)}
              className={`tap rounded-md px-3 py-1 text-sm font-medium transition ${
                range === r ? 'bg-panel text-fg shadow-sm ring-1 ring-accent' : 'text-muted hover:text-fg'
              }`}
            >
              {tr(lang, LABEL[r])}
            </button>
          ))}
        </div>
      </div>
      <div className="product-history-card ui-card">
      <p data-median className="text-sm font-medium text-fg">
        {sentence}
      </p>
      <Suspense fallback={<div className="h-48 rounded-xl bg-panel ring-1 ring-edge" />}>
        <PriceChart points={entry.history} range={range} low={low?.price ?? null} />
      </Suspense>
      {low && (
        <p data-all-time-low={low.source} className="text-sm text-muted">
          {lowText}
        </p>
      )}
      <p className="text-sm text-muted">{entry.chip}: {tr(lang, PRODUCT.historyNote)}</p>
      </div>
    </section>
  );
}
