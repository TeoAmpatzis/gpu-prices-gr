import { CircleCheck, CircleX, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { tr, useLang, type Text } from '../lib/i18n';
import { UI } from './strings';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

// Full class names, so Tailwind keeps them.
const TONE: Record<Tone, string> = {
  success: 'ui-badge--success',
  warning: 'ui-badge--warning',
  danger: 'ui-badge--danger',
  info: 'ui-badge--info',
  neutral: 'ui-badge--neutral',
};

/** The one small badge shape: soft background, strong text of the same hue, optional icon. */
export function Badge({ tone = 'neutral', icon: Icon, children }: { tone?: Tone; icon?: LucideIcon; children: ReactNode }) {
  return (
    <span className={`ui-badge ${TONE[tone]}`}>
      {Icon && <Icon aria-hidden="true" />}
      {children}
    </span>
  );
}

/**
 * Compatibility level (plan, "Κανόνες συμβατότητας"): error = red ✕, warning = orange ⚠ (the user has to
 * act), note = light blue ⓘ (estimate or missing data), pass = green ✓. Colour, icon and word together,
 * so it reads without colour too.
 */
export type CompatLevel = 'error' | 'warning' | 'note' | 'pass';

const LEVEL: Record<CompatLevel, { tone: Tone; icon: LucideIcon; word: Text }> = {
  error: { tone: 'danger', icon: CircleX, word: UI.compatError },
  warning: { tone: 'warning', icon: TriangleAlert, word: UI.compatWarning },
  note: { tone: 'info', icon: Info, word: UI.compatUnverified },
  pass: { tone: 'success', icon: CircleCheck, word: UI.compatPass },
};

export function CompatBadge({ level, word }: { level: CompatLevel; word?: Text }) {
  const lang = useLang();
  const l = LEVEL[level];
  return (
    <Badge tone={l.tone} icon={l.icon}>
      {tr(lang, word ?? l.word)}
    </Badge>
  );
}

/** A badge with its reason as visible text under it (never only in a tooltip: UX-35). */
export function CompatNote({ level, word, reason }: { level: CompatLevel; word?: Text; reason: Text }) {
  const lang = useLang();
  return (
    <div className="flex flex-col items-start gap-1">
      <CompatBadge level={level} word={word} />
      <p className="text-sm text-muted">{tr(lang, reason)}</p>
    </div>
  );
}
