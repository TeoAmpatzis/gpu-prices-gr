import { Fragment } from 'react';
import { tr, useLang } from '../lib/i18n';
import type { Spec } from './specs';
import { UI } from './strings';

/** "12 GB GDDR7 · μήκος 300 mm · τροφοδοτικό ≥ 650 W" — unknown specs keep their place as "label —". */
export function SpecLine({ specs, className = '' }: { specs: Spec[]; className?: string }) {
  const lang = useLang();
  return (
    <p className={`ui-num text-sm text-muted ${className}`}>
      {specs.map((s, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <span className="mx-1.5 text-faint" aria-hidden="true">
              ·
            </span>
          )}
          {s.value ?? (
            <span className="text-faint">
              {s.label} <span aria-hidden="true">—</span>
              <span className="sr-only">{tr(lang, UI.unknown)}</span>
            </span>
          )}
        </Fragment>
      ))}
    </p>
  );
}
