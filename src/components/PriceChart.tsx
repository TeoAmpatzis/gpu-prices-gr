import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { HistoryPoint } from '../types';
import { formatPrice } from '../lib/data';
import { SOURCES } from '../lib/sources';

const shortDate = (d: string) => {
  const [, m, day] = d.split('-');
  return `${day}/${m}`;
};

export default function PriceChart({ points }: { points: HistoryPoint[] | undefined }) {
  if (!points || points.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg bg-zinc-950/60 px-4 text-center text-sm text-zinc-500 ring-1 ring-zinc-800">
        Το ιστορικό τιμών θα εμφανιστεί μετά από λίγες μέρες συλλογής δεδομένων.
      </div>
    );
  }
  return (
    <div className="h-48 rounded-lg bg-zinc-950/60 p-2 ring-1 ring-zinc-800">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="d"
            tickFormatter={shortDate}
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            stroke="#3f3f46"
            minTickGap={24}
          />
          <YAxis
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => `${Math.round(v)}€`}
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            stroke="#3f3f46"
            width={56}
          />
          <Tooltip
            contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
            labelFormatter={(d: string) => d.split('-').reverse().join('/')}
            formatter={(v: number, _name, item) => [
              `${formatPrice(v)} (${SOURCES[(item.payload as HistoryPoint).source]?.label ?? ''})`,
              'Χαμηλότερη',
            ]}
          />
          <Line type="stepAfter" dataKey="min" stroke="#34d399" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
