import { CircleCheck, CircleX, Info, Play, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { tr, useLang, type Text } from '../lib/i18n';
import { CompatBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { PAIRS, contrast } from '../ui/contrast';
import { Lockup, Mark, faviconSvg, type LogoKind } from '../ui/logos';
import { num } from '../ui/strings';
import { CATS } from '../shell/nav';
import { P } from './strings';
import { Scaled, Scope, Section, Spec, hex, hue, useTokens, type Palette } from './kit';

const LOGOS: { kind: LogoKind; title: Text; text: Text }[] = [
  { kind: 'a', title: P.logoA, text: P.logoAText },
  { kind: 'b', title: P.logoB, text: P.logoBText },
  { kind: 'c', title: P.logoC, text: P.logoCText },
];

/** A browser tab with the favicon at its real 16 px. */
function Tab({ theme, palette, kind, icon }: { theme: 'light' | 'dark'; palette: Palette; kind: LogoKind; icon: string }) {
  const lang = useLang();
  return (
    <Scope theme={theme} palette={palette} className="rounded-lg border border-edge">
      <div className="flex items-end gap-1 rounded-t-lg bg-sunken px-2 pt-2">
        <div className="flex min-w-0 max-w-56 flex-1 items-center gap-2 rounded-t-md bg-panel px-3 py-2 text-xs text-fg">
          <img src={icon} width={16} height={16} alt="" />
          <span className="truncate">{tr(lang, CATS.gpu.name)} — BuildDraft.gr</span>
        </div>
        <div className="hidden w-28 items-center gap-2 px-3 py-2 text-xs text-faint sm:flex">
          <span className="h-4 w-4 rounded-sm bg-line" /> …
        </div>
      </div>
      <div className="rounded-b-lg bg-panel px-3 py-1.5 text-xs text-faint">builddraft.gr/gpu</div>
      <span className="sr-only">{kind}</span>
    </Scope>
  );
}

function LogoCard({ kind, title, text, palette }: { kind: LogoKind; title: Text; text: Text; palette: Palette }) {
  const lang = useLang();
  const t = useTokens(palette, 'light', ['brand-600', 'brand-400']);
  const icon = t ? `data:image/svg+xml,${encodeURIComponent(faviconSvg(kind, hex(t['brand-600']), hex(t['brand-400'])))}` : '';
  const lockupSize = kind === 'c' ? 'text-[1.375rem]' : 'text-lg';
  return (
    <article className="ui-card flex min-w-0 flex-col gap-4 p-4">
      <div>
        <h3 className="text-lg font-semibold">{tr(lang, title)}</h3>
        <p className="text-sm text-muted">{tr(lang, text)}</p>
      </div>
      <Spec label={P.onLight}>
        <Scope theme="light" palette={palette} className="flex flex-col gap-3 rounded-lg border border-edge p-4">
          <Lockup kind={kind} height={28} className={`text-fg ${lockupSize}`} />
          <Lockup kind={kind} height={28} className={`text-accent ${lockupSize}`} />
        </Scope>
      </Spec>
      <Spec label={P.onDark}>
        <Scope theme="dark" palette={palette} className="flex flex-col gap-3 rounded-lg border border-edge p-4">
          <Lockup kind={kind} height={28} className={`text-fg ${lockupSize}`} />
          <Lockup kind={kind} height={28} className={`text-accent ${lockupSize}`} />
        </Scope>
      </Spec>
      <Spec label={P.onBrand}>
        <Scope theme="light" palette={palette} className="rounded-lg">
          <div className="rounded-lg bg-brand-solid p-4 text-on-brand">
            <Lockup kind={kind} height={28} className={lockupSize} />
          </div>
        </Scope>
      </Spec>
      <Spec label={P.sizes}>
        <div className="grid grid-cols-2 gap-2">
          {(['light', 'dark'] as const).map((th) => (
            <Scope key={th} theme={th} palette={palette} className="flex items-end gap-4 rounded-lg border border-edge p-3">
              {[16, 32, 48].map((s) => (
                <span key={s} className="flex flex-col items-center gap-1">
                  <Mark kind={kind} size={s} className="text-accent" />
                  <span className="ui-num text-[11px] text-faint">{s}</span>
                </span>
              ))}
            </Scope>
          ))}
        </div>
      </Spec>
      <Spec label={P.tab}>
        <div className="flex flex-col gap-2">
          <Tab theme="light" palette={palette} kind={kind} icon={icon} />
          <Tab theme="dark" palette={palette} kind={kind} icon={icon} />
        </div>
      </Spec>
      <Spec label={P.social}>
        <Scope theme="light" palette={palette} className="rounded-lg">
          <Scaled width={1200} height={630}>
          <div className="relative h-full w-full overflow-hidden bg-brand-solid text-on-brand">
            <div
              className="absolute inset-0 opacity-[0.12]"
              style={{ backgroundImage: 'linear-gradient(to right, currentColor 2px, transparent 2px), linear-gradient(to bottom, currentColor 2px, transparent 2px)', backgroundSize: '48px 48px' }}
              aria-hidden="true"
            />
            <div className="relative flex h-full flex-col justify-center gap-8 px-24">
              <Lockup kind={kind} height={112} className={kind === 'c' ? 'text-[104px]' : 'text-[80px]'} />
              <p className="text-[40px] font-medium leading-tight">{tr(lang, P.socialTagline)}</p>
              <p className="text-[30px]">{tr(lang, P.socialFacts)}</p>
            </div>
          </div>
          </Scaled>
        </Scope>
      </Spec>
    </article>
  );
}

export function LogosSection({ palette }: { palette: Palette }) {
  return (
    <Section id="logos" title={P.sLogos} intro={P.logosIntro}>
      <div className="grid gap-4 lg:grid-cols-3">
        {LOGOS.map((l) => (
          <LogoCard key={l.kind} {...l} palette={palette} />
        ))}
      </div>
    </Section>
  );
}

const SCALE = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const NEUTRAL = [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const ROLE_NAMES = [...new Set(PAIRS.flatMap((p) => [p.fg, p.bg]))];

function Swatches({ palette, prefix, steps }: { palette: Palette; prefix: string; steps: number[] }) {
  const t = useTokens(palette, 'light', steps.map((s) => `${prefix}-${s}`));
  return (
    <div className="grid grid-cols-4 gap-x-1.5 gap-y-3 sm:grid-cols-6">
      {steps.map((s) => {
        const c = t?.[`${prefix}-${s}`];
        return (
          <div key={s} className="flex flex-col gap-1">
            <span className="h-12 rounded-md border border-line" style={{ background: c ? `rgb(${c.join(' ')})` : undefined }} />
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

function MeaningRow({ m, label }: { m: 'success' | 'warning' | 'danger' | 'info'; label: Text }) {
  const lang = useLang();
  const Icon = { success: CircleCheck, warning: TriangleAlert, danger: CircleX, info: Info }[m];
  // Full class names, so Tailwind finds them.
  const icon = { success: 'text-success-solid', warning: 'text-warning-solid', danger: 'text-danger-solid', info: 'text-info-solid' }[m];
  const text = { success: 'text-success-fg', warning: 'text-warning-fg', danger: 'text-danger-fg', info: 'text-info-fg' }[m];
  const level = ({ success: 'pass', warning: 'warning', danger: 'error', info: 'note' } as const)[m];
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-line py-2.5 first:border-t-0">
      <Icon className={`h-5 w-5 ${icon}`} aria-hidden="true" />
      <span className={`text-sm font-medium ${text}`}>{tr(lang, label)}</span>
      <span className="ml-auto">
        <CompatBadge level={level} />
      </span>
    </div>
  );
}

export function ColoursSection({ palette }: { palette: Palette }) {
  const lang = useLang();
  const light = useTokens(palette, 'light', ROLE_NAMES);
  const dark = useTokens(palette, 'dark', ROLE_NAMES);
  const hues = useTokens(palette, 'light', ['brand-700', 'info-700']);
  const ratio = (t: typeof light, fg: string, bg: string) => (t?.[fg] && t?.[bg] ? contrast(t[fg], t[bg]) : null);
  const passes = (t: typeof light) => PAIRS.filter((p) => (ratio(t, p.fg, p.bg) ?? 0) >= p.min).length;
  return (
    <Section id="colours" title={P.sColours} intro={P.coloursIntro}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Spec label={P.brandScale} className="ui-card p-4">
          <Swatches palette={palette} prefix="brand" steps={SCALE} />
        </Spec>
        <Spec label={P.neutralScale} className="ui-card p-4">
          <Swatches palette={palette} prefix="n" steps={NEUTRAL} />
        </Spec>
      </div>
      <Spec label={P.meaning}>
        <div className="grid gap-3 lg:grid-cols-2">
          {(['light', 'dark'] as const).map((th) => (
            <Scope key={th} theme={th} palette={palette} className="rounded-xl border border-edge">
              <div className="rounded-xl bg-panel px-4 py-1.5">
                <MeaningRow m="success" label={P.mSuccess} />
                <MeaningRow m="warning" label={P.mWarning} />
                <MeaningRow m="danger" label={P.mDanger} />
                <MeaningRow m="info" label={P.mInfo} />
              </div>
            </Scope>
          ))}
        </div>
        {hues && (
          <p className="text-sm text-muted">
            {tr(lang, P.hueGap)}:{' '}
            <span className="ui-num font-semibold text-fg">
              {Math.abs(hue(hues['brand-700']) - hue(hues['info-700']))}°
            </span>{' '}
            ({hex(hues['brand-700'])} {hue(hues['brand-700'])}° · {hex(hues['info-700'])} {hue(hues['info-700'])}°)
          </p>
        )}
      </Spec>
      <Spec label={P.contrast}>
        <div className="ui-card relative overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-sunken text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">{tr(lang, P.pair)}</th>
                <th className="px-3 py-2">{tr(lang, P.use)}</th>
                <th className="px-3 py-2 text-right">
                  {tr(lang, P.light)} ({light ? passes(light) : '…'}/{PAIRS.length})
                </th>
                <th className="px-3 py-2 text-right">
                  {tr(lang, P.dark)} ({dark ? passes(dark) : '…'}/{PAIRS.length})
                </th>
                <th className="px-3 py-2 text-right">{tr(lang, P.need)}</th>
              </tr>
            </thead>
            <tbody>
              {PAIRS.map((p, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="px-3 py-1.5">
                    <code className="ui-mono text-xs">
                      {p.fg} / {p.bg}
                    </code>
                  </td>
                  <td className="px-3 py-1.5 text-muted">{tr(lang, p.use)}</td>
                  {[light, dark].map((t, j) => {
                    const r = ratio(t, p.fg, p.bg);
                    const ok = r != null && r >= p.min;
                    return (
                      <td key={j} className="px-3 py-1.5 text-right">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-grid h-6 w-10 place-items-center rounded border border-line text-[11px] font-semibold"
                            style={t ? { color: `rgb(${t[p.fg]?.join(' ')})`, background: `rgb(${t[p.bg]?.join(' ')})` } : undefined}
                            aria-hidden="true"
                          >
                            Aa
                          </span>
                          <span className={`ui-num w-12 font-medium ${ok ? 'text-fg' : 'text-danger-fg'}`}>{r ? num(lang, r, 2) : '…'}</span>
                          <span className={`text-xs ${ok ? 'text-success-fg' : 'font-semibold text-danger-fg'}`}>{tr(lang, ok ? P.pass : P.fail)}</span>
                        </span>
                      </td>
                    );
                  })}
                  <td className="ui-num px-3 py-1.5 text-right text-muted">{num(lang, p.min, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
const WEIGHTS = [
  { cls: 'font-normal', label: { el: '400 Κανονικό', en: '400 Regular' } },
  { cls: 'font-medium', label: { el: '500 Μεσαίο', en: '500 Medium' } },
  { cls: 'font-semibold', label: { el: '600 Ημιέντονο', en: '600 Semibold' } },
  { cls: 'font-bold', label: { el: '700 Έντονο', en: '700 Bold' } },
];
const MOTION = [
  { token: '--motion-fast', value: '120 ms', use: { el: 'πάτημα, chip, tooltip', en: 'press, chip, tooltip' }, cls: 'ui-enter-fade' },
  { token: '--motion-base', value: '180 ms', use: { el: 'μενού, αναζήτηση, toast', en: 'menu, search, toast' }, cls: 'ui-enter-pop' },
  { token: '--motion-slow', value: '260 ms', use: { el: 'sheet, διάλογος, πλακίδια', en: 'sheet, dialog, tiles' }, cls: 'ui-enter-sheet' },
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
              <span>1.189,90 €</span>
              <span>2 × 16 GB</span>
              <span>612,00 €</span>
              <span>7.450 MB/s</span>
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
