import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { HistoryPoint } from '../types';
import { formatPrice } from '../lib/data';
import { SOURCES } from '../lib/sources';
import { useTheme } from '../lib/theme';
import { T, tr, useLang } from '../lib/i18n';

/** A design token ("r g b" in src/index.css) as a colour string that SVG attributes accept. */
const token = (name: string) =>
  `rgb(${getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim().split(/\s+/).join(',')})`;

// Recharts draws SVG, whose attributes can't reference CSS variables directly, so the current
// theme's tokens are read on every render (useTheme re-renders the chart when the theme changes).
const palette = () => ({
  grid: token('line'),
  axis: token('line-strong'),
  tick: token('muted'),
  tipBg: token('panel'),
  tipBorder: token('line'),
  line: token('accent'),
});

const shortDate = (d: string) => {
  const [, m, day] = d.split('-');
  return `${day}/${m}`;
};

export default function PriceChart({ points }: { points: HistoryPoint[] | undefined }) {
  useTheme(); // re-render on theme change
  const c = palette();
  const lang = useLang();
  if (!points || points.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-panel px-4 text-center text-sm text-faint ring-1 ring-line">
        {tr(lang, T.noHistory)}
      </div>
    );
  }
  return (
    <div className="h-48 rounded-xl bg-panel p-2 ring-1 ring-line">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis
            dataKey="d"
            tickFormatter={shortDate}
            tick={{ fill: c.tick, fontSize: 11 }}
            stroke={c.axis}
            minTickGap={24}
          />
          <YAxis
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => `${Math.round(v)}€`}
            tick={{ fill: c.tick, fontSize: 11 }}
            stroke={c.axis}
            width={56}
          />
          <Tooltip
            contentStyle={{ background: c.tipBg, border: `1px solid ${c.tipBorder}`, borderRadius: 8, fontSize: 12 }}
            labelFormatter={(d: string) => d.split('-').reverse().join('/')}
            formatter={(v: number, _name, item) => [
              `${formatPrice(v, lang)} (${SOURCES[(item.payload as HistoryPoint).source]?.label ?? ''})`,
              tr(lang, T.lowest),
            ]}
          />
          <Line type="stepAfter" dataKey="min" stroke={c.line} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
