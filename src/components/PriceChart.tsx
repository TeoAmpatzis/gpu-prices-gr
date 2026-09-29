import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { HistoryPoint } from '../types';
import { formatPrice } from '../lib/data';
import { SOURCES } from '../lib/sources';
import { useTheme } from '../lib/theme';

// SVG attributes can't use the CSS theme tokens, so the chart keeps its own palette.
const PALETTE = {
  dark: { grid: '#27272a', axis: '#3f3f46', tick: '#a1a1aa', tipBg: '#18181b', tipBorder: '#3f3f46', line: '#34d399' },
  light: { grid: '#e4e4e7', axis: '#d4d4d8', tick: '#52525b', tipBg: '#ffffff', tipBorder: '#d4d4d8', line: '#059669' },
};

const shortDate = (d: string) => {
  const [, m, day] = d.split('-');
  return `${day}/${m}`;
};

export default function PriceChart({ points }: { points: HistoryPoint[] | undefined }) {
  const c = PALETTE[useTheme()];
  if (!points || points.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg bg-panel px-4 text-center text-sm text-faint ring-1 ring-line">
        Το ιστορικό τιμών θα εμφανιστεί μετά από λίγες μέρες συλλογής δεδομένων.
      </div>
    );
  }
  return (
    <div className="h-48 rounded-lg bg-panel p-2 ring-1 ring-line">
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
              `${formatPrice(v)} (${SOURCES[(item.payload as HistoryPoint).source]?.label ?? ''})`,
              'Χαμηλότερη',
            ]}
          />
          <Line type="stepAfter" dataKey="min" stroke={c.line} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
