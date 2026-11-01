// The builder's part list (step 5 task 11, the Quick list base): one line per part in the order of SLOTS, the second
// drive after the first, the fans with their quantity last; each line with photo, name, specs, price, shop and label,
// and a picker of compatible choices (task 12 replaces the picker). A saved part whose step file failed shows a retry.

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, RotateCw, Search, X } from 'lucide-react';
import type { BaseListing, Category } from '../../types';
import { CATEGORIES } from '../../lib/categories';
import { formatPrice, saleOf } from '../../lib/data';
import { SLOTS, candidates, type Slot } from '../../lib/builderData';
import { ENGINE_TEXT, optionalSlot } from '../../lib/builderEngine';
import { useStepVerdicts, type AnyModel, type BuilderState } from '../../lib/builderState';
import { LABEL_TEXT, ratingOf, type Label } from '../../lib/fitLabel';
import { T, tr, useLang, type Text } from '../../lib/i18n';
import ProductPhoto from '../ProductPhoto';
import SourceBadge from '../SourceBadge';
import { FitBadge, ShipNote, partImage, specLine } from './parts';
import { FanQty } from './GuidedWalk';
import { UI } from '../../ui/strings';
import { BUILDER as B } from '../../ui/builderStrings';

/** A line of the list: a slot, or the second drive (chosen from the storage step's parts). */
type Line = Slot | 'storage2';
const LINES: Line[] = SLOTS.flatMap((s): Line[] => (s === 'storage' ? ['storage', 'storage2'] : [s]));
const slotOf = (l: Line): Slot => (l === 'storage2' ? 'storage' : l);

const PICKER_LIMIT = 60;

const S = {
  choose: { el: 'Επιλογή', en: 'Choose' },
  change: { el: 'Αλλαγή', en: 'Change' },
  remove: { el: 'Αφαίρεση', en: 'Remove' },
  optional: { el: 'προαιρετικό', en: 'optional' },
  options: { el: 'επιλογές', en: 'options' },
  verifiedOnly: { el: 'Μόνο επιβεβαιωμένα', en: 'Verified only' },
  verifiedOnlyHint: {
    el: 'Κρύβει όσα δεν έχουν στοιχεία για έλεγχο («Χωρίς επιβεβαίωση»).',
    en: 'Hides parts without the data to check them ("Fit not verified").',
  },
  noneCompatible: {
    el: 'Κανένα συμβατό προϊόν με την τρέχουσα επιλογή. Αφαίρεσε κάποιο εξάρτημα για περισσότερες επιλογές.',
    en: 'Nothing compatible with the current build. Remove a part to see more options.',
  },
} satisfies Record<string, Text>;

export default function PartList({ state }: { state: BuilderState }) {
  const lang = useLang();
  const t = (x: Text) => tr(lang, x);
  const { models, build, update, extraVersion } = state;
  const findings = state.findings ?? [];
  const [openLine, setOpen] = useState<Line | null>(null);
  const open = openLine && slotOf(openLine);
  // Each step's parts come in their own file (/data/builder/<slot>.json), requested when its picker opens, then the
  // pick worker checks them against the build.
  const { verdicts } = useStepVerdicts(state, open);
  const loading = state.loading || (open != null && (!state.slotReady(open) || verdicts === null));
  useEffect(() => {
    if (open && !state.loading) state.wantSlot(open);
  }, [open, state.loading]);
  const pick = (line: Line, m: AnyModel | undefined) => (line === 'storage2' ? state.setStorage2(m ?? null) : update({ ...build, [line]: m }));
  const [query, setQuery] = useState('');
  // Picker toggle: hide parts whose fit can't be checked. Not remembered (the privacy page lists the stored keys).
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Picker: every part the engine doesn't hide (a real "no", pickHide), cheapest first, each with its fit label.
  const rated = useMemo(() => {
    if (!models || !open || !verdicts) return [];
    const q = query.trim().toLowerCase();
    const cfg = CATEGORIES[open as Category] as unknown as { searchText: (l: BaseListing) => string };
    // A part without a verdict (the check failed) is shown unlabelled, never hidden.
    return (candidates(open, models[open] as never) as AnyModel[])
      .filter((m) => !verdicts.get(m.key)?.hide)
      .filter((m) => !q || m.listings.some((l) => cfg.searchText(l).toLowerCase().includes(q)))
      .sort((a, b) => a.cheapest.price - b.cheapest.price)
      .map((m) => ({ m, rating: ratingOf(verdicts.get(m.key)?.findings ?? [], m.key, state.parts) }));
    // extraVersion: the search titles arrive later (/data/builder/<slot>-extra.json).
  }, [models, open, query, verdicts, state.parts, extraVersion]);
  const options = verifiedOnly ? rated.filter((o) => o.rating.fit !== 'unverified') : rated;
  const fitCounts = rated.reduce<Partial<Record<Label, number>>>((n, o) => {
    if (o.rating.fit) n[o.rating.fit] = (n[o.rating.fit] ?? 0) + 1;
    return n;
  }, {});

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="card divide-y divide-line">
        {LINES.map((line) => {
          const slot = slotOf(line);
          const cfg = CATEGORIES[slot as Category];
          const Icon = cfg.icon;
          const m = (line === 'storage2' ? state.storage2 : build[slot]) as AnyModel | undefined;
          const isOpen = openLine === line;
          const waiting = line === 'storage2' ? state.pendingStorage2 : state.pending.includes(slot);
          const qty = slot === 'fan' ? state.fanQty : 1;
          return (
            <div key={line} className="p-3 sm:p-4" data-line={line}>
              <div className="flex flex-wrap items-center gap-3">
                {m ? (
                  // The chosen part's photo (the shop's own), the category icon if none.
                  <ProductPhoto image={partImage(m)} size="md" icon={Icon} alt={m.chip} />
                ) : (
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                    <Icon className="h-4 w-4" />
                  </span>
                )}
                {/* At least 9rem, so on phones the price and buttons wrap to their own line instead
                    of squeezing the name. */}
                <div className="min-w-[9rem] flex-1">
                  <div className="text-xs text-muted">
                    {line === 'storage2' ? t(B.storage2) : t(cfg.tab)}
                    {(line === 'storage2' || slot === 'fan' || optionalSlot(slot, state.optFindings).optional) && <span className="text-faint"> · {t(S.optional)}</span>}
                  </div>
                  {m ? (
                    <>
                      <div className="font-semibold [overflow-wrap:anywhere]">{m.chip}</div>
                      <div className="text-xs text-muted">{specLine(slot, m, lang)}</div>
                      <div className="mt-1 empty:hidden">
                        <FitBadge rating={ratingOf(findings, m.key, state.parts)} lang={lang} />
                      </div>
                    </>
                  ) : waiting && state.slotFailed(slot) ? (
                    // Its step file failed (Review Focus 3): not counted in the total; a retry here.
                    <button type="button" onClick={() => state.wantSlot(slot)} className="tap inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
                      <RotateCw className="h-4 w-4" aria-hidden="true" /> {t(UI.retry)}
                    </button>
                  ) : waiting ? (
                    <div className="ui-skeleton mt-1 h-4 w-40" role="status" aria-label={t(T.loading)} />
                  ) : (
                    <div className="text-sm text-faint">—</div>
                  )}
                </div>
                {m && (
                  <a
                    href={m.cheapest.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tap flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"
                  >
                    <span className="font-semibold tabular-nums text-accent">
                      {qty > 1 && <span className="font-normal text-muted">{qty} × </span>}
                      {formatPrice(m.cheapest.price, lang)}
                    </span>
                    <SourceBadge source={m.cheapest.source} />
                    <ShipNote m={m} lang={lang} />
                    <ExternalLink className="h-3.5 w-3.5 text-faint" />
                  </a>
                )}
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(isOpen ? null : line);
                      setQuery('');
                    }}
                    className="tap rounded-lg px-3 py-1.5 text-sm font-medium text-accent ring-1 ring-inset ring-accent/30 hover:bg-accent/10"
                  >
                    {t(m ? S.change : S.choose)}
                  </button>
                  {m && (
                    <button
                      type="button"
                      onClick={() => pick(line, undefined)}
                      title={t(S.remove)}
                      className="tap-square grid place-items-center rounded-lg p-1.5 text-muted edge hover:bg-hover hover:text-fg dark:ring-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {slot === 'fan' && m && (
                <div className="mt-2">
                  <FanQty state={state} lang={lang} />
                </div>
              )}
              {isOpen && (
                <div className="mt-3 rounded-xl bg-sunken p-3 ring-1 ring-edge">
                  <label className="relative mb-2 block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t(cfg.searchPlaceholder)}
                      aria-label={t(T.search)}
                      className="field w-full text-ellipsis py-2 pl-9 pr-3"
                    />
                  </label>
                  <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
                    {state.checkerFailed && <span className="w-full">{t(ENGINE_TEXT.checkerFailed)}</span>}
                    <span className={loading ? 'invisible' : undefined}>
                      {options.length} {t(S.options)}
                      {(['fits', 'likely', 'unverified'] as const)
                        .filter((f) => fitCounts[f])
                        .map((f) => ` · ${fitCounts[f]} ${t(LABEL_TEXT[f]).toLowerCase()}`)
                        .join('')}
                    </span>
                    {fitCounts.unverified ? (
                      <button
                        type="button"
                        aria-pressed={verifiedOnly}
                        title={t(S.verifiedOnlyHint)}
                        onClick={() => setVerifiedOnly((v) => !v)}
                        className={`tap ml-auto inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ring-1 ring-inset transition ${
                          verifiedOnly
                            ? 'bg-accent/10 text-accent ring-accent dark:ring-accent/30'
                            : 'text-muted ring-line-strong hover:bg-hover hover:text-fg hover:ring-muted dark:hover:ring-line-strong'
                        }`}
                      >
                        {t(S.verifiedOnly)}
                      </button>
                    ) : null}
                  </div>
                  {state.slotFailed(slot) ? (
                    <button type="button" onClick={() => state.wantSlot(slot)} className="tap inline-flex items-center gap-1.5 p-3 text-sm font-medium text-accent hover:underline">
                      <RotateCw className="h-4 w-4" aria-hidden="true" /> {t(B.stepFailed)} {t(UI.retry)}
                    </button>
                  ) : loading ? (
                    <div className="flex items-center gap-2 p-3 text-sm text-faint">
                      <Loader2 className="h-4 w-4 animate-spin" /> {t(T.loading)}
                    </div>
                  ) : options.length === 0 ? (
                    <div className="p-3 text-sm text-muted">{t(S.noneCompatible)}</div>
                  ) : (
                    <ul className="max-h-80 divide-y divide-line overflow-y-auto rounded-lg bg-panel ring-1 ring-edge">
                      {options.slice(0, PICKER_LIMIT).map(({ m: o, rating }) => {
                        const sale = saleOf(o.listings, o.cheapest);
                        const price = (
                          <>
                            {sale && <span className="badge badge-sale">−{sale.pct}%</span>}
                            <span className="font-semibold tabular-nums">{formatPrice(o.cheapest.price, lang)}</span>
                            <SourceBadge source={o.cheapest.source} />
                            <ShipNote m={o} lang={lang} />
                          </>
                        );
                        return (
                          <li key={o.key}>
                            <button
                              type="button"
                              onClick={() => {
                                pick(line, o);
                                setOpen(null);
                              }}
                              className="tap flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-hover"
                            >
                              <ProductPhoto image={partImage(o)} size="sm" icon={Icon} alt="" hideOnPhone />
                              {/* Phones: the name and specs wrap, and the price and shop move to the bottom
                                  line beside the fit label; from 640px they sit on the right. */}
                              <span className="min-w-0 flex-1">
                                <span className="line-clamp-2 font-medium [overflow-wrap:anywhere] sm:hidden">{o.chip}</span>
                                <span className="hidden truncate font-medium sm:block">{o.chip}</span>
                                <span className="block text-xs text-muted sm:truncate">{specLine(slot, o, lang)}</span>
                                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 empty:hidden sm:mt-0.5">
                                  <FitBadge rating={rating} lang={lang} />
                                  <span className="flex items-center gap-2 sm:hidden">{price}</span>
                                </span>
                              </span>
                              <span className="hidden items-center gap-3 sm:flex">{price}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
