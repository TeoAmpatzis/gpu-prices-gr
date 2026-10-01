import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { HistoryPoint } from '../types';
import { formatPrice } from '../lib/data';
import { SOURCES } from '../lib/sources';
import { T, tr, useLang } from '../lib/i18n';

// Price history as a small hand-drawn SVG step chart (replaced recharts, ~100 KB gzipped). Colours
// are Tailwind classes on the design tokens (stroke-accent, fill-muted…), so they follow light/dark
// mode without re-rendering. Tooltip: hover (mouse), tap (touch: stays until a tap elsewhere),
// arrow keys when the chart has focus (Esc hides it).

const HEIGHT = 176; // drawing area inside the h-48 card
const PAD = { top: 10, right: 12, bottom: 22, left: 52 };
const DAY = 864e5;

const time = (d: string) => Date.parse(`${d}T00:00:00Z`);
const fullDate = (d: string) => d.split('-').reverse().join('/');

/**
 * About `count` round tick values covering [lo, hi] (steps of 1, 2 or 5 × 10^n, at least 1 € since
 * the labels are whole euros). An unchanged price gets room above and below, so its line sits mid-chart.
 */
function niceTicks(lo: number, hi: number, count = 4): number[] {
  if (hi - lo < 0.01) {
    const pad = Math.max(1, Math.abs(hi) * 0.05);
    lo -= pad;
    hi += pad;
  }
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag);
  const out: number[] = [];
  for (let v = Math.floor(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(Math.round(v * 100) / 100);
  if (out[0] > lo) out.unshift(out[0] - step);
  if (out[out.length - 1] < hi) out.push(out[out.length - 1] + step);
  return out;
}

/** Date labels spread over the range; dd/mm, or mm/yy when the history spans more than ~6 months. */
function dateTicks(t0: number, t1: number, width: number): { t: number; label: string }[] {
  const n = Math.max(2, Math.min(6, Math.floor(width / 80)));
  const long = t1 - t0 > 180 * DAY;
  return Array.from({ length: n }, (_, i) => {
    const t = t0 + ((t1 - t0) * i) / (n - 1);
    const [y, m, d] = new Date(t).toISOString().slice(0, 10).split('-');
    return { t, label: long ? `${m}/${y.slice(2)}` : `${d}/${m}` };
  });
}

export default function PriceChart({ points }: { points: HistoryPoint[] | undefined }) {
  const lang = useLang();
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    setWidth(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, [(points?.length ?? 0) < 2]); // the box only exists once there is something to draw

  const data = useMemo(() => [...(points ?? [])].sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0)), [points]);

  // A tap elsewhere closes a tooltip opened by touch.
  useEffect(() => {
    if (active == null) return;
    const close = (e: globalThis.PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setActive(null);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [active]);

  if (data.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-panel px-4 text-center text-sm text-faint ring-1 ring-edge">
        {tr(lang, T.noHistory)}
      </div>
    );
  }

  const t0 = time(data[0].d);
  const t1 = Math.max(time(data[data.length - 1].d), t0 + DAY);
  const prices = data.map((p) => p.min);
  const yTicks = niceTicks(Math.min(...prices), Math.max(...prices));
  const yLo = yTicks[0];
  const yHi = yTicks[yTicks.length - 1];
  const plotW = Math.max(1, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0)) * plotW;
  const y = (v: number) => PAD.top + (1 - (v - yLo) / (yHi - yLo || 1)) * plotH;

  // Step after: the price holds until the next day with a different low.
  let path = `M${x(time(data[0].d))},${y(data[0].min)}`;
  for (let i = 1; i < data.length; i++) path += `H${x(time(data[i].d))}V${y(data[i].min)}`;

  const nearest = (clientX: number) => {
    const rect = box.current!.getBoundingClientRect();
    const t = t0 + ((clientX - rect.left - PAD.left) / plotW) * (t1 - t0);
    let best = 0;
    for (let i = 1; i < data.length; i++) if (Math.abs(time(data[i].d) - t) < Math.abs(time(data[best].d) - t)) best = i;
    return best;
  };
  const onPointer = (e: PointerEvent) => setActive(nearest(e.clientX));
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const from = active ?? data.length - 1;
      setActive(Math.max(0, Math.min(data.length - 1, from + (e.key === 'ArrowLeft' ? -1 : 1))));
    } else if (e.key === 'Escape') setActive(null);
  };

  const p = active != null ? data[active] : null;
  const px = p ? x(time(p.d)) : 0;
  const lowest = Math.min(...prices);
  const summary = `${tr(lang, T.dailyLow)}: ${fullDate(data[0].d)}–${fullDate(data[data.length - 1].d)}, ${tr(lang, T.lowest)} ${formatPrice(lowest, lang)}`;

  return (
    <div className="h-48 rounded-xl bg-panel p-2 ring-1 ring-edge">
      <div
        ref={box}
        className="relative h-full touch-pan-y select-none rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        role="img"
        aria-label={summary}
        tabIndex={0}
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        {width > 0 && (
          <svg width={width} height={HEIGHT} className="block overflow-visible" aria-hidden="true">
            {yTicks.map((v) => (
              <g key={v}>
                <line x1={PAD.left} x2={PAD.left + plotW} y1={y(v)} y2={y(v)} className="stroke-line" />
                <text x={PAD.left - 6} y={y(v)} dy="0.32em" textAnchor="end" fontSize={11} className="fill-muted">
                  {Math.round(v)}€
                </text>
              </g>
            ))}
            <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + plotH} className="stroke-line-strong" />
            <line x1={PAD.left} x2={PAD.left + plotW} y1={PAD.top + plotH} y2={PAD.top + plotH} className="stroke-line-strong" />
            {dateTicks(t0, t1, plotW).map(({ t, label }, i, all) => (
              <text
                key={t}
                x={x(t)}
                y={HEIGHT - 6}
                fontSize={11}
                textAnchor={i === 0 ? 'start' : i === all.length - 1 ? 'end' : 'middle'}
                className="fill-muted"
              >
                {label}
              </text>
            ))}
            <path d={path} fill="none" strokeWidth={2} strokeLinejoin="round" className="stroke-accent" />
            {p && (
              <g>
                <line x1={px} x2={px} y1={PAD.top} y2={PAD.top + plotH} strokeDasharray="3 3" className="stroke-faint" />
                <circle cx={px} cy={y(p.min)} r={4} strokeWidth={2} className="fill-accent stroke-panel" />
              </g>
            )}
          </svg>
        )}
        {p && (
          <div
            className="pointer-events-none absolute top-0 z-10 whitespace-nowrap rounded-lg bg-panel px-2.5 py-1.5 text-xs shadow-md ring-1 ring-edge"
            // Beside the point, flipped to the left in the right half so it stays inside the card.
            style={px > width / 2 ? { right: width - px + 10 } : { left: px + 10 }}
          >
            <div className="text-muted">{fullDate(p.d)}</div>
            <div className="font-semibold tabular-nums text-fg">
              {formatPrice(p.min, lang)}
              {SOURCES[p.source] && <span className="font-normal text-muted"> · {SOURCES[p.source].label}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
