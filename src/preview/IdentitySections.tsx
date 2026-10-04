import { CircleCheck, CircleX, Info, Play, TriangleAlert } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { tr, useLang, type Text } from '../lib/i18n';
import { CompatBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { PAIRS, contrast } from '../ui/contrast';
import { BrandMark, Wordmark } from '../ui/logos';
import { num } from '../ui/strings';
import { CATS } from '../shell/nav';
import { P } from './strings';
import { Section, Spec, hex, hue, useTokens } from './kit';

/**
 * A browser tab with the favicon at its real 16 px. The tab bar is a picture of the browser, so it uses the
 * browser's own colours, not the site's; the icon is the light- or dark-tab version of /favicon.svg (which
 * switches by itself with the browser's theme).
 */
function Tab({ dark }: { dark: boolean }) {
  const lang = useLang();
  const c = dark ? { bar: '#202124', tab: '#35363A', text: '#E8EAED', url: '#9AA0A6' } : { bar: '#DEE1E6', tab: '#FFFFFF', text: '#1F1F1F', url: '#5F6368' };
  return (
    <div className="overflow-hidden rounded-lg border border-edge" style={{ background: c.bar }}>
      <div className="flex items-end gap-1 px-2 pt-2">
        <div className="flex min-w-0 max-w-64 flex-1 items-center gap-2 rounded-t-md px-3 py-2 text-xs" style={{ background: c.tab, color: c.text }}>
          <img src={dark ? '/brand/symbol-on-dark.svg' : '/brand/symbol-on-light.svg'} width={16} height={16} alt="" />
          <span className="truncate">{tr(lang, CATS.gpu.name)} — BuildDraft.gr</span>
        </div>
      </div>
      <div className="px-3 py-1.5 text-xs" style={{ background: c.tab, color: c.url }}>
        builddraft.gr/gpu
      </div>
    </div>
  );
}

/** A fixed-colour tile for the outside-the-site images (white, or the dark page). */
function Swatch({ light, children }: { light: boolean; children: ReactNode }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-edge p-4" style={{ background: light ? '#FFFFFF' : '#030712' }}>
      {children}
    </div>
  );
}

export function LogosSection() {
  const lang = useLang();
  return (
    <Section id="logos" title={P.sLogos} intro={P.logosIntro}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Spec label={P.inHeader} className="ui-card p-4">
          <div className="flex flex-col gap-4">
            <Wordmark className="text-[1.375rem] text-fg" />
            <Wordmark className="text-[2rem] text-fg" />
            <Wordmark className="text-[3rem] text-fg" />
          </div>
        </Spec>
        <Spec label={P.sizes} className="ui-card p-4">
          <div className="flex items-end gap-6">
            {[16, 32, 48].map((s) => (
              <span key={s} className="flex flex-col items-center gap-1">
                <BrandMark size={s} className="text-accent" />
                <span className="ui-num text-xs text-faint">{s}&nbsp;px</span>
              </span>
            ))}
          </div>
          <p className="text-sm text-muted">{tr(lang, P.symbolNote)}</p>
        </Spec>
        <Spec label={P.tab} className="ui-card p-4">
          <div className="flex flex-col gap-2">
            <Tab dark={false} />
            <Tab dark />
          </div>
        </Spec>
        <Spec label={P.social} className="ui-card p-4">
          <img src="/og.png" width={1200} height={630} alt="" className="h-auto w-full rounded-lg border border-edge" />
        </Spec>
      </div>
      <Spec label={P.outside} className="ui-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Swatch light>
            <img src="/brand/wordmark-on-light.png" width={300} height={75} alt="BuildDraft.gr" className="h-auto w-full max-w-72" />
          </Swatch>
          <Swatch light={false}>
            <img src="/brand/wordmark-on-dark.png" width={300} height={75} alt="BuildDraft.gr" className="h-auto w-full max-w-72" />
          </Swatch>
          <Swatch light>
            <img src="/brand/symbol-on-light.svg" width={72} height={72} alt="" />
          </Swatch>
          <Swatch light={false}>
            <img src="/brand/symbol-on-dark.svg" width={72} height={72} alt="" />
          </Swatch>
        </div>
        <p className="text-sm text-muted">{tr(lang, P.outsideNote)}</p>
      </Spec>
    </Section>
  );
}

const SCALE = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const NEUTRAL = [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const ROLE_NAMES = [...new Set(PAIRS.flatMap((p) => [p.fg, p.bg]))];

function Swatches({ prefix, steps }: { prefix: string; steps: number[] }) {
  const t = useTokens(steps.map((s) => `${prefix}-${s}`));
  return (
    <div className="grid grid-cols-4 gap-x-1.5 gap-y-3 sm:grid-cols-6">
      {steps.map((s) => {
        const c = t[`${prefix}-${s}`];
        return (
          <div key={s} className="flex flex-col gap-1">
            <span className="h-12 rounded-md border border-line" style={{ background: `rgb(${c.join(' ')})` }} />
            <span className="ui-num text-[10px] leading-tight text-muted">
              {s}
              <br />
              <span className="text-faint">{hex(c)}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

const MEANING = [
  { m: 'success', label: P.mSuccess, Icon: CircleCheck, icon: 'text-success-solid', text: 'text-success-fg', level: 'pass' },
  { m: 'warning', label: P.mWarning, Icon: TriangleAlert, icon: 'text-warning-solid', text: 'text-warning-fg', level: 'warning' },
  { m: 'danger', label: P.mDanger, Icon: CircleX, icon: 'text-danger-solid', text: 'text-danger-fg', level: 'error' },
  { m: 'info', label: P.mInfo, Icon: Info, icon: 'text-info-solid', text: 'text-info-fg', level: 'note' },
] as const;

export function ColoursSection() {
  const lang = useLang();
  const t = useTokens(ROLE_NAMES);
  const hues = useTokens(['brand-400', 'info-400']);
  const ratio = (fg: string, bg: string) => contrast(t[fg], t[bg]);
  const passes = PAIRS.filter((p) => ratio(p.fg, p.bg) >= p.min).length;
  return (
    <Section id="colours" title={P.sColours} intro={P.coloursIntro}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Spec label={P.brandScale} className="ui-card p-4">
          <Swatches prefix="brand" steps={SCALE} />
        </Spec>
        <Spec label={P.neutralScale} className="ui-card p-4">
          <Swatches prefix="n" steps={NEUTRAL} />
        </Spec>
      </div>
      <Spec label={P.meaning}>
        <div className="ui-card px-4 py-1.5">
          {MEANING.map((x) => (
            <div key={x.m} className="flex flex-wrap items-center gap-3 border-t border-line py-2.5 first:border-t-0">
              <x.Icon className={`h-5 w-5 ${x.icon}`} aria-hidden="true" />
              <span className={`text-sm font-medium ${x.text}`}>{tr(lang, x.label)}</span>
              <span className="ml-auto">
                <CompatBadge level={x.level} />
              </span>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted">
          {tr(lang, P.hueGap)}: <span className="ui-num font-semibold text-fg">{Math.abs(hue(hues['brand-400']) - hue(hues['info-400']))}°</span> ({hex(hues['brand-400'])}{' '}
          {hue(hues['brand-400'])}° · {hex(hues['info-400'])} {hue(hues['info-400'])}°)
        </p>
      </Spec>
      <Spec label={P.contrast}>
        <div className="ui-card relative overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="bg-sunken text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">{tr(lang, P.pair)}</th>
                <th className="px-3 py-2">{tr(lang, P.use)}</th>
                <th className="px-3 py-2 text-right">
                  {tr(lang, P.ratio)} ({passes}/{PAIRS.length})
                </th>
                <th className="px-3 py-2 text-right">{tr(lang, P.need)}</th>
              </tr>
            </thead>
            <tbody>
              {PAIRS.map((p, i) => {
                const r = ratio(p.fg, p.bg);
                const ok = r >= p.min;
                return (
                  <tr key={i} className="border-t border-line">
                    <td className="px-3 py-1.5">
                      <code className="ui-mono text-xs">
                        {p.fg} / {p.bg}
                      </code>
                    </td>
                    <td className="px-3 py-1.5 text-muted">{tr(lang, p.use)}</td>
                    <td className="px-3 py-1.5 text-right">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-grid h-6 w-10 place-items-center rounded border border-line text-[11px] font-semibold"
                          style={{ color: `rgb(${t[p.fg].join(' ')})`, background: `rgb(${t[p.bg].join(' ')})` }}
                          aria-hidden="true"
                        >
                          Aa
                        </span>
                        <span className={`ui-num w-12 font-medium ${ok ? 'text-fg' : 'text-danger-fg'}`}>{num(lang, r, 2)}</span>
                        <span className={`text-xs ${ok ? 'text-success-fg' : 'font-semibold text-danger-fg'}`}>{tr(lang, ok ? P.pass : P.fail)}</span>
                      </span>
                    </td>
                    <td className="ui-num px-3 py-1.5 text-right text-muted">{num(lang, p.min, 1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted">{tr(lang, P.printNote)}</p>
      </Spec>
    </Section>
  );
}

const SIZES = [
  { cls: 'text-display font-semibold', label: 'display · 32 / 40' },
  { cls: 'text-2xl font-semibold', label: '2xl · 24 / 32' },
  { cls: 'text-lg font-semibold', label: 'lg · 18 / 28' },
  { cls: 'text-base', label: 'base · 16 / 24' },
  { cls: 'text-sm', label: 'sm · 14 / 20' },
  { cls: 'text-xs', label: 'xs · 12 / 16 (14 < 1024 px)' },
];
const WEIGHTS: { cls: string; label: Text }[] = [
  { cls: 'font-normal', label: { el: '400 Κανονικό', en: '400 Regular' } },
  { cls: 'font-medium', label: { el: '500 Μεσαίο', en: '500 Medium' } },
  { cls: 'font-semibold', label: { el: '600 Ημιέντονο', en: '600 Semibold' } },
  { cls: 'font-bold', label: { el: '700 Έντονο', en: '700 Bold' } },
];
const MOTION: { token: string; value: string; use: Text; cls: string }[] = [
  { token: '--motion-fast', value: '120 ms', use: { el: 'πάτημα, chip, tooltip', en: 'press, chip, tooltip' }, cls: 'ui-enter-fade' },
  { token: '--motion-base', value: '180 ms', use: { el: 'μενού, αναζήτηση, toast', en: 'menu, search, toast' }, cls: 'ui-enter-pop' },
  { token: '--motion-slow', value: '260 ms', use: { el: 'sheet, διάλογος', en: 'sheet, dialog' }, cls: 'ui-enter-sheet' },
];

export function TypeSection() {
  const lang = useLang();
  const [run, setRun] = useState(0);
  return (
    <Section id="type" title={P.sType} intro={P.typeIntro}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="ui-card flex min-w-0 flex-col gap-3 p-4">
          {SIZES.map((s) => (
            <div key={s.label} className="flex flex-col">
              <span className="ui-num text-[11px] text-faint">{s.label}</span>
              <span className={`${s.cls} truncate`}>{tr(lang, P.sample)}</span>
            </div>
          ))}
          <div className="flex flex-wrap gap-4 border-t border-line pt-3 text-sm">
            {WEIGHTS.map((w) => (
              <span key={w.cls} className={w.cls}>
                {tr(lang, w.label)}
              </span>
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="ui-card flex flex-col gap-2 p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-faint">{tr(lang, P.codes)} · JetBrains Mono</span>
            <code className="ui-mono">GV-N5070WF3OC-12GD</code>
            <code className="ui-mono">CMK32GX5M2B6000C30 · BX8071514600KF</code>
            <code className="ui-mono">{tr(lang, { el: 'Κωδικός build', en: 'Build code' })}: 7K2Q-9XWD</code>
            <div className="ui-num mt-2 grid grid-cols-2 gap-x-6 border-t border-line pt-3 text-sm">
              <span className="text-muted">tabular-nums</span>
              <span />
              <span>1.189,90&nbsp;€</span>
              <span>2&nbsp;×&nbsp;16&nbsp;GB</span>
              <span>612,00&nbsp;€</span>
              <span>7.450&nbsp;MB/s</span>
            </div>
          </div>
          <div className="ui-card flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-faint">{tr(lang, P.motion)}</span>
              <Button size="sm" icon={Play} onClick={() => setRun((r) => r + 1)}>
                {tr(lang, P.play)}
              </Button>
            </div>
            {MOTION.map((m) => (
              <div key={m.token} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <code className="ui-mono text-xs">{m.token}</code>
                <span className="ui-num text-muted">{m.value}</span>
                <span className="text-muted">{tr(lang, m.use)}</span>
                <span className="relative ml-auto h-8 w-12 overflow-hidden rounded-md bg-sunken">
                  <span key={run} className={`${m.cls} absolute inset-1 rounded bg-brand-solid`} />
                </span>
              </div>
            ))}
            <p className="text-xs text-faint">ease-out cubic-bezier(0.2, 0, 0, 1) · ease-in cubic-bezier(0.4, 0, 1, 1) · exit × 0.75 · prefers-reduced-motion → 0 ms</p>
          </div>
        </div>
      </div>
    </Section>
  );
}
