// Pick mode of a category page (`/<category>?pick=1`, v2 step 3, step2-plan sections 2 and 4): the normal page
// plus a bar ("Επιλέγεις: Κουτί · Πίσω στο build"), the "Μόνο συμβατά" switch, the engine's findings on each row
// and an "Add to build" button (per card for graphics cards). A lazy chunk: CategoryView imports it only when
// the address has `pick=1`, so the normal page's code and downloads stay as they were.
import { useMemo, type MouseEvent, type ReactNode } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { shownLevel, type Finding, type Part } from '../engine';
import { applyFilters, type CategoryData } from '../lib/data';
import { tr, useLang, type Lang } from '../lib/i18n';
import { SLOT_OF, hides } from '../lib/pick';
import { shownOffer } from '../lib/pickBuild';
import { usePick, type PickState } from '../lib/usePick';
import type { BaseListing } from '../types';
import { CATS } from '../shell/nav';
import { Badge, CompatBadge } from '../ui/Badge';
import { Button, LinkButton } from '../ui/Button';
import { Toggle } from '../ui/filters';
import { PICK } from '../ui/pickStrings';
import { plural, UI } from '../ui/strings';
import { CategoryLayout, type LayoutProps, type PickSlots } from './CategoryView';
import type { RowExtra } from './ModelRow';

/** Findings shown on a row: at most this many, then "+N more". */
const SHOWN = 2;

/** Clicks inside a row's pick area don't open or close the row. */
const stop = (e: MouseEvent) => e.stopPropagation();

/** The engine's messages, once each, with the level's badge (colour, icon and word). */
function Findings({ list, lang }: { list: Finding[]; lang: Lang }) {
  const seen = new Set<string>();
  const unique = list.filter((f) => !seen.has(f.message.en) && seen.add(f.message.en));
  if (!unique.length) return null;
  const rest = unique.length - SHOWN;
  return (
    <ul className="flex flex-col gap-1">
      {unique.slice(0, SHOWN).map((f) => (
        <li key={`${f.rule}-${f.message.en}`} className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-fg-soft">
          <CompatBadge level={shownLevel(f.status)} />
          <span className="min-w-0 [overflow-wrap:anywhere]">{tr(lang, f.message)}</span>
        </li>
      ))}
      {rest > 0 && (
        <li className="text-xs text-muted">
          +{rest} {tr(lang, PICK.more)}
        </li>
      )}
    </ul>
  );
}

/**
 * What a candidate shows: greyed → the reasons it would be hidden, no button; otherwise the errors that don't
 * hide and the warnings (notes and unknowns stay off the list, step2-plan section 4), and the button.
 */
function Candidate({
  pick,
  candidate,
  dim,
  label,
  lang,
}: {
  pick: PickState;
  candidate: string | undefined;
  dim: boolean;
  label: string;
  lang: Lang;
}) {
  const part: Part | undefined = candidate ? pick.part(candidate) : undefined;
  const v = candidate ? pick.verdicts?.get(candidate) : undefined;
  const findings = (v?.findings ?? []).filter((f) =>
    dim ? hides(f, pick.build) : !hides(f, pick.build) && (f.status === 'error' || f.status === 'warning'),
  );
  return (
    <div onClick={stop} className="mt-2 flex flex-col items-start gap-2 whitespace-normal">
      <Findings list={findings} lang={lang} />
      {!pick.candidatesReady ? (
        // Until the candidates exist nobody knows what is offered: a busy button of the same size, so nothing
        // says "not offered" by mistake and nothing moves when the real button arrives (fix round 1).
        <Button variant="primary" size="sm" icon={Plus} className="tap" disabled loading>
          {label}
        </Button>
      ) : !part ? (
        <p className="text-sm text-muted">{tr(lang, PICK.notOffered)}</p>
      ) : (
        !dim && (
          <Button variant="primary" size="sm" icon={Plus} className="tap" onClick={() => pick.add(part.key)}>
            {label}
          </Button>
        )
      )}
    </div>
  );
}

export default function PickView<L extends BaseListing>({ cfg, data, filters, setFilters }: LayoutProps<L>) {
  const lang = useLang();
  const t = (x: Parameters<typeof tr>[1]) => tr(lang, x);
  const slot = SLOT_OF[cfg.id];
  const pick = usePick(slot, data as unknown as CategoryData);
  const ready = pick.status === 'ready';
  const all = data.latest.listings;

  // "Only compatible" removes the hidden listings before every other filter, so the counts are right.
  const on = filters.compat && ready && pick.hidden.size > 0;
  const listings = useMemo(() => (on ? all.filter((l) => !pick.hidden.has(l.id)) : all), [on, all, pick.hidden]);
  // How many of the models the other filters show the switch hides (all their offers clash).
  const hiddenCount = useMemo(() => {
    if (!ready || !pick.hidden.size) return 0;
    return applyFilters(all, filters, cfg, data.history, data.imported, { sort: false }).filter((m) =>
      m.listings.every((l) => pick.hidden.has(l.id)),
    ).length;
  }, [ready, pick.hidden, all, filters, cfg, data]);

  const one = CATS[cfg.id].one ?? CATS[cfg.id].name;
  const status = !ready
    ? t(PICK.checking)
    : pick.build.length === 0
      ? t(PICK.emptyBuild)
      : `${t(PICK.checkedWith)} ${plural(lang, pick.build.length, UI.partForms)}.`;

  const bar: ReactNode = (
    <section data-pick="bar" className="card flex flex-col gap-2 p-4 text-sm" aria-label={`${t(PICK.choosing)} ${t(one)}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="text-base font-semibold">
          {t(PICK.choosing)} <span className="text-accent">{t(one)}</span>
        </span>
        <LinkButton href="/builder" variant="ghost" size="sm" icon={ArrowLeft} className="tap">
          {t(PICK.backToBuild)}
        </LinkButton>
      </div>
      <p role="status" className="text-muted">
        {status}
      </p>
      {pick.missing.length > 0 && (
        <ul className="flex flex-col gap-1">
          {pick.missing.map((m) => (
            <li key={m.slot} className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-fg-soft">
              <Badge tone="warning">{t(PICK.noLongerAvailable)}</Badge>
              <span className="min-w-0 [overflow-wrap:anywhere]">
                {t(CATS[m.slot].one ?? CATS[m.slot].name)}: {m.name} ({t(PICK.notChecked)})
              </span>
            </li>
          ))}
        </ul>
      )}
      {pick.unchecked.length > 0 && (
        <ul className="flex flex-col gap-1">
          {pick.unchecked.map((m) => (
            <li key={m.slot} className="text-fg-soft [overflow-wrap:anywhere]">
              {t(PICK.couldNotCheck)} {t(CATS[m.slot].one ?? CATS[m.slot].name)}: {m.name}
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  // Nothing left because of "Only compatible": say so, and offer to turn it off (besides "Clear filters").
  const empty: ReactNode =
    on && hiddenCount > 0 ? (
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-muted">
          {plural(lang, hiddenCount, PICK.hiddenForms)} {t(PICK.hiddenByCompat)}
        </p>
        <Button variant="secondary" size="sm" className="tap" onClick={() => setFilters({ ...filters, compat: false })}>
          {t(PICK.turnOffCompat)}
        </Button>
      </div>
    ) : null;

  const toggle: ReactNode = (
    <div className="border-b border-line pb-3">
      <Toggle
        label={ready ? `${t(PICK.onlyCompatible)} (${plural(lang, hiddenCount, PICK.hiddenForms)})` : t(PICK.onlyCompatible)}
        hint={ready ? undefined : t(PICK.checking)}
        checked={filters.compat}
        onChange={(compat) => setFilters({ ...filters, compat })}
      />
    </div>
  );

  const hiddenId = (id: string) => ready && pick.hidden.has(id);
  const row = (m: Parameters<PickSlots<L>['row']>[0]): RowExtra<L> => {
    const dim = m.listings.every((l) => hiddenId(l.id));
    if (slot === 'gpu') {
      // Each card is its own part: the button is on every card of the open row.
      return {
        dim,
        extra: dim ? (
          <Candidate pick={pick} candidate={pick.keyOf(m.cheapest)} dim lang={lang} label="" />
        ) : (
          <p className="mt-1 whitespace-normal text-sm text-muted">{t(PICK.pickCard)}</p>
        ),
        listing: (l) => {
          const off = hiddenId(l.id);
          return {
            dim: off,
            extra: (
              <div className="px-3 pb-3">
                <Candidate pick={pick} candidate={pick.keyOf(l)} dim={off} lang={lang} label={t(PICK.addCard)} />
              </div>
            ),
          };
        },
      };
    }
    // A CPU: the version (Box or Tray) of the cheapest offer that passes the filters and isn't hidden.
    const offer = shownOffer(m.listings, hiddenId);
    return { dim, extra: <Candidate pick={pick} candidate={pick.keyOf(offer)} dim={dim} lang={lang} label={t(PICK.add)} /> };
  };

  return (
    <CategoryLayout
      cfg={cfg}
      data={data}
      filters={filters}
      setFilters={setFilters}
      listings={listings}
      pick={{ bar, toggle, row, empty }}
    />
  );
}
