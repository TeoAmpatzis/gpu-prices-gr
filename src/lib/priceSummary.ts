import type { DailyLow } from '../types';
import { UI } from '../ui/strings';
import type { HistoryLow } from './data';
import { implausibleDips } from './dips';
import { formatPrice } from './format';
import { tr, type Lang } from './i18n';
import { SOURCE_NAMES } from './sources';

// The product page's price history: the chart ranges and the one-sentence summary against the 90-day median.

export type HistoryRange = '30' | '90' | '365' | 'all';
export const RANGES: HistoryRange[] = ['30', '90', '365', 'all'];
export const DEFAULT_RANGE: HistoryRange = '90';

/** The median covers this many days up to the last point... */
export const MEDIAN_DAYS = 90;
/** ...and is only said when at least this many daily points fall in them (a sparse history says nothing). */
export const MEDIAN_MIN_POINTS = 30;

const DAY = 864e5;
const time = (d: string) => Date.parse(`${d}T00:00:00Z`);
const back = (d: string, days: number) => new Date(time(d) - days * DAY).toISOString().slice(0, 10);
/** First day of a window of `days` days ending on `last` (both ends counted: 90 days = 90 daily points at most). */
const windowStart = (last: string, days: number) => back(last, days - 1);

/** First day a range shows. Ranges count back from the history's last point (the series' "today"), All from its first. */
export function rangeStart(points: readonly DailyLow[], range: HistoryRange): string {
  const first = points.reduce((m, p) => (p.d < m ? p.d : m), points[0]?.d ?? '');
  const last = points.reduce((m, p) => (p.d > m ? p.d : m), first);
  if (range === 'all' || !first) return first;
  const start = windowStart(last, Number(range));
  return start > first ? start : first;
}

export type MedianSummary =
  | { kind: 'few' }
  | { kind: 'ok'; dir: 'below' | 'above' | 'equal'; pct: number; median: number; price: number };

/**
 * Today's daily low against the median of the daily lows of the last 90 days, dips (src/lib/dips.ts) left out.
 * "Today" is the history's last non-dip point, the same series the chart draws, so the sentence and the chart agree
 * (not the header's lowest total, which includes shipping and may differ). Percent rounded to an integer; a
 * rounded 0 is "equal".
 */
export function medianSummary(points: readonly DailyLow[]): MedianSummary {
  const dips = implausibleDips(points);
  const line = points.filter((p) => !dips.has(p)).sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  if (!line.length) return { kind: 'few' };
  const price = line[line.length - 1];
  const from = windowStart(price.d, MEDIAN_DAYS); // the same window as the 90 d range
  const window = line.filter((p) => p.d >= from).map((p) => p.min);
  if (window.length < MEDIAN_MIN_POINTS) return { kind: 'few' };
  window.sort((a, b) => a - b);
  const mid = window.length >> 1;
  const median = window.length % 2 ? window[mid] : (window[mid - 1] + window[mid]) / 2;
  const pct = Math.round((Math.abs(price.min - median) / median) * 100);
  const dir = pct === 0 ? 'equal' : price.min < median ? 'below' : 'above';
  return { kind: 'ok', dir, pct, median, price: price.min };
}

const fullDate = (d: string) => d.split('-').reverse().join('/');

/** The all-time low's sentence (exported for the unit tests). */
export function lowSentence(lang: Lang, low: HistoryLow, outside: boolean): string {
  const price = formatPrice(low.price, lang);
  if (low.source === 'skroutz') return tr(lang, UI.historyLowSkroutz).replace('{p}', price);
  return (
    tr(lang, UI.historyLowOwn)
      .replace('{p}', price)
      .replace('{d}', fullDate(low.date!))
      .replace('{n}', String(SOURCE_NAMES.length))
      .replace('{s}', fullDate(low.since)) + (outside ? tr(lang, UI.historyLowOutside) : '')
  );
}
