import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink, Info, Loader2, Search, X, ChevronUp } from 'lucide-react';
import type { BaseListing, BuilderFile, Category } from '../types';
import { CATEGORIES, groupName } from '../lib/categories';
import { formatPrice, loadBuilder, loadBuilderExtra, saleOf, type Model } from '../lib/data';
import { fromColumns } from '../lib/columns';
import {
  FIT_LABEL,
  OPTIONAL,
  SLOTS,
  buildNotes,
  candidates,
  fitContext,
  rate,
  caseBoard,
  caseCoolerMax,
  caseFanSlots,
  caseGpuMax,
  coolerHeight,
  coolerSockets,
  cpuCooler,
  cpuHasIgpu,
  cpuSocket,
  gpuLength,
  gpuPsu,
  moboForm,
  moboMemory,
  moboSlots,
  moboSocket,
  requiredWatts,
  slotModels,
  type Build,
  type Fit,
  type Rating,
  type Slot,
  type SlotListing,
} from '../lib/builder';
import { T, tr, useLang, type Lang, type Text } from '../lib/i18n';
import BuildGuide from './BuildGuide';
import ProductPhoto from './ProductPhoto';
import { productImage } from '../lib/images';
import SourceBadge from './SourceBadge';

type Models = { [S in Slot]: Model<SlotListing[S]>[] };
type AnyModel = Model<BaseListing>;

const STORAGE_KEY = 'pcBuild'; // { slot: model key }, per-browser convenience only
const PICKER_LIMIT = 60;

const S: Record<string, Text> = {
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
    el: 'Κανένα συμβατό προϊόν με την τρέχουσα επιλογή. Αφαιρέστε κάποιο εξάρτημα για περισσότερες επιλογές.',
    en: 'Nothing compatible with the current build. Remove a part to see more options.',
  },
  total: { el: 'Σύνολο', en: 'Total' },
  parts: { el: 'εξαρτήματα', en: 'parts' },
  psuNeeded: { el: 'Προτεινόμενο τροφοδοτικό', en: 'Recommended PSU' },
  clear: { el: 'Καθαρισμός', en: 'Clear build' },
  summary: { el: 'Η σύνθεσή σας', en: 'Your build' },
  details: { el: 'Λεπτομέρειες', en: 'Details' },
  priceNote: {
    el: 'Χαμηλότερη τιμή ανά προϊόν, χωρίς μεταφορικά· κάθε εξάρτημα μπορεί να είναι από διαφορετικό κατάστημα.',
    en: 'Lowest price per product, before shipping; each part may come from a different shop.',
  },
  cores: { el: 'πυρήνες', en: 'cores' },
  slots: { el: 'υποδοχές', en: 'slots' },
  psu: { el: 'τροφ.', en: 'PSU' },
  upTo: { el: 'έως', en: 'up to' },
  withCooler: { el: 'με ψύκτρα', en: 'cooler included' },
  noCooler: { el: 'χωρίς ψύκτρα', en: 'no cooler' },
  coolerUnknown: { el: 'ψύκτρα: δεν αναφέρεται', en: 'cooler: not stated' },
  coolerShort: { el: 'ψύκτρα', en: 'cooler' },
  fanPositions: { el: 'θέσεις ανεμ.', en: 'fan positions' },
  airflow: { el: 'για ροή αέρα', en: 'airflow type' },
  pressure: { el: 'για στατική πίεση', en: 'static pressure type' },
};

// Written out in full so Tailwind keeps the classes (index.css).
const FIT_CLASS: Record<Exclude<Fit, 'no'>, string> = {
  fits: 'badge badge-fits',
  likely: 'badge badge-likely',
  unverified: 'badge badge-unverified',
};

/** A part's fit label against the parts already chosen; nothing when there was nothing to check. */
function FitBadge({ rating, lang }: { rating: Rating; lang: Lang }) {
  const fit = rating.fit as Exclude<Fit, 'no'> | null;
  if (!fit) return null;
  const why = rating.reasons.map((r) => tr(lang, r)).join(' ');
  return (
    <span className={FIT_CLASS[fit]} title={why || undefined}>
      {tr(lang, FIT_LABEL[fit])}
    </span>
  );
}

/** One-line specs under a part's name, from the same fields the rules use. */
function specLine(slot: Slot, m: AnyModel, lang: Lang): string {
  const t = (x: Text) => tr(lang, x);
  const mm = (v: number | null | undefined) => (v != null ? `${v} mm` : null);
  switch (slot) {
    case 'cpu': {
      const c = m as Model<SlotListing['cpu']>;
      const cooler = cpuCooler(c);
      return [
        cpuSocket(c),
        c.cheapest.cores && `${c.cheapest.cores} ${t(S.cores)}`,
        cpuHasIgpu(c) && 'iGPU',
        t(cooler ? S.withCooler : cooler === false ? S.noCooler : S.coolerUnknown),
      ]
        .filter(Boolean)
        .join(' · ');
    }
    case 'mobo': {
      const b = m as Model<SlotListing['mobo']>;
      return [b.cheapest.chipset, moboSocket(b), moboForm(b), moboMemory(b), `${moboSlots(b)} ${t(S.slots)}`]
        .filter(Boolean)
        .join(' · ');
    }
    case 'ram': {
      const r = m as Model<SlotListing['ram']>;
      return r.cheapest.cas ? `CL${r.cheapest.cas} · ${r.cheapest.brand}` : r.cheapest.brand;
    }
    case 'gpu': {
      const g = m as Model<SlotListing['gpu']>;
      return [`${g.cheapest.vram}GB`, mm(gpuLength(g)), `${t(S.psu)} ≥ ${gpuPsu(g.cheapest)}W`]
        .filter(Boolean)
        .join(' · ');
    }
    case 'cooler': {
      const c = m as Model<SlotListing['cooler']>;
      const kind = c.cheapest.type === 'Air' ? groupName('Αέρα', lang) : `AIO ${c.cheapest.radiator ?? ''}mm`;
      return [
        kind,
        c.cheapest.type === 'Air' && mm(coolerHeight(c)),
        coolerSockets(c)
          .filter((x) => /^(AM[45]|LGA1[78]\d\d)$/.test(x))
          .join('/'),
      ]
        .filter(Boolean)
        .join(' · ');
    }
    case 'case': {
      const c = m as Model<SlotListing['case']>;
      const gpu = caseGpuMax(c);
      const cooler = caseCoolerMax(c);
      const fans = caseFanSlots(c);
      return [
        groupName(c.cheapest.size, lang),
        `${t(S.upTo)} ${caseBoard(c)}`,
        gpu != null && `GPU ≤ ${gpu} mm`,
        cooler != null && `${t(S.coolerShort)} ≤ ${cooler} mm`,
        fans != null && `${fans} ${t(S.fanPositions)}`,
      ]
        .filter(Boolean)
        .join(' · ');
    }
    case 'fan': {
      const f = m as Model<SlotListing['fan']>;
      const { size, pack, connector, pwm, rgb, airflowCfm, pressureMm, fanType } = f.cheapest;
      return [
        `${size} mm × ${pack}`,
        connector ?? (pwm && 'PWM'),
        fanType && t(fanType === 'airflow' ? S.airflow : S.pressure),
        airflowCfm != null && `${airflowCfm} CFM`,
        pressureMm != null && `${pressureMm} mmH₂O`,
        rgb && 'RGB',
      ]
        .filter(Boolean)
        .join(' · ');
    }
    case 'psu': {
      const p = m as Model<SlotListing['psu']>;
      return [p.cheapest.formFactor, p.cheapest.modular && `${p.cheapest.modular} modular`, p.cheapest.brand]
        .filter(Boolean)
        .join(' · ');
    }
  }
}

/** A builder part's photo: builder.json rows carry the stored photo (`img`). */
const partImage = (m: AnyModel) => productImage(m.cheapest.img);

function loadSaved(): Partial<Record<Slot, string>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Record<Slot, string>>;
  } catch {
    return {};
  }
}

function save(b: Build) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Object.fromEntries(SLOTS.filter((s) => b[s]).map((s) => [s, b[s]!.key]))),
    );
  } catch {
    /* storage unavailable (private mode): the build just isn't remembered */
  }
}

export default function Builder() {
  const lang = useLang();
  const t = (x: Text) => tr(lang, x);
  const [models, setModels] = useState<Models | null>(null);
  const [coverage, setCoverage] = useState<BuilderFile['coverage'] | null>(null);
  const [extraVersion, setExtraVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [build, setBuild] = useState<Build>({});
  const [open, setOpen] = useState<Slot | null>(null);
  const [query, setQuery] = useState('');
  // Picker toggle: hide parts whose fit can't be checked. Not remembered (the privacy page lists the stored keys).
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  // Phones and tablets: the summary bar at the bottom is collapsed to the total until opened.
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => {
    // builder.json: one row per model the builder can offer, prepared at build time (src/lib/derive.ts).
    loadBuilder('all')
      .then((file) => {
        const m = Object.fromEntries(
          SLOTS.map((s) => [s, slotModels(s, fromColumns<SlotListing[typeof s]>(file.slots[s] ?? { cols: [], rows: [] }))]),
        ) as unknown as Models;
        setCoverage(file.coverage);
        setModels(m);
        // Restore the saved build; parts that disappeared from the market are dropped.
        const saved = loadSaved();
        const restored: Build = {};
        for (const s of SLOTS) {
          const found = (m[s] as AnyModel[]).find((x) => x.key === saved[s]);
          if (found) (restored as Record<Slot, AnyModel>)[s] = found;
        }
        setBuild(restored);
        // Then the shop links and the search titles (builder-extra.json), written onto each model's
        // one row; `extraVersion` makes the picker search and the links pick them up.
        loadBuilderExtra(file.builtAt)
          .then((extra) => {
            for (const s of SLOTS) {
              for (const model of m[s] as AnyModel[]) {
                const row = model.cheapest;
                row.url = extra.urls[row.id] ?? row.url;
                if (!row.title) row.title = extra.titles[row.id] ?? '';
              }
            }
            setExtraVersion((v) => v + 1);
          })
          .catch(() => {}); // the builder still works; links and title search just stay missing
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const update = (b: Build) => {
    setBuild(b);
    save(b);
  };

  // Measured length range per graphics chip, for "Likely fits" (src/lib/builder.ts fitContext).
  const ctx = useMemo(() => fitContext(models?.gpu ?? []), [models]);

  // Picker: every part that doesn't definitely clash, cheapest first, each with its fit label.
  const rated = useMemo(() => {
    if (!models || !open) return [];
    const q = query.trim().toLowerCase();
    const cfg = CATEGORIES[open as Category] as unknown as { searchText: (l: BaseListing) => string };
    const rest: Build = { ...build, [open]: undefined };
    return (candidates(open, models[open] as never, build, ctx) as AnyModel[])
      .filter((m) => !q || m.listings.some((l) => cfg.searchText(l).toLowerCase().includes(q)))
      .sort((a, b) => a.cheapest.price - b.cheapest.price)
      .map((m) => ({ m, rating: rate(open, m as never, rest, ctx) }));
  }, [models, open, query, build, ctx, extraVersion]);
  const options = verifiedOnly ? rated.filter((o) => o.rating.fit !== 'unverified') : rated;
  const fitCounts = rated.reduce<Partial<Record<Fit, number>>>((n, o) => {
    if (o.rating.fit) n[o.rating.fit] = (n[o.rating.fit] ?? 0) + 1;
    return n;
  }, {});

  if (error) {
    return (
      <div className="notice-danger flex items-center gap-2 p-4">
        <AlertTriangle className="h-5 w-5" /> {t(T.loadError)}: {error}
      </div>
    );
  }
  // The page (guide, parts, summary) renders before builder.json arrives: the guide is the largest
  // element, and waiting for ~270 KB of data before showing it cost 1.7 s of LCP on phones.
  const loading = !models;

  const chosen = SLOTS.filter((s) => build[s]).map((s) => build[s] as AnyModel);
  const total = chosen.reduce((sum, m) => sum + m.cheapest.price, 0);
  const watts = requiredWatts(build);
  const notes = buildNotes(build, ctx);
  const errors = notes.filter((n) => n.level === 'error').length;
  // Share of parts whose measurements are known yet (collected gradually, see scraper/specs.py),
  // counted at build time over every product, not just the ones the builder can offer.
  // While loading the notice shows without the percentages, so it doesn't push the parts down later.
  const collecting = !coverage || Object.values(coverage).some((v) => v < 90);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <BuildGuide />
        {collecting && (
          <div className="notice-warn flex gap-2 p-3 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {t({
                el: `Οι διαστάσεις για τον έλεγχο συμβατότητας συλλέγονται σταδιακά${coverage ? ` (κάρτες γραφικών ${coverage.gpu}%, κουτιά ${coverage.case}%, ψύκτρες ${coverage.cooler}%)` : ''}. Όσα δεν έχουν ακόμα στοιχεία εμφανίζονται ως «Χωρίς επιβεβαίωση»· προστίθενται καθημερινά.`,
                en: `Measurements for the compatibility check are being collected gradually${coverage ? ` (graphics cards ${coverage.gpu}%, cases ${coverage.case}%, coolers ${coverage.cooler}%)` : ''}. Parts without them are shown as "Fit not verified"; more are added every day.`,
              })}
            </span>
          </div>
        )}
        <div className="card divide-y divide-line">
          {SLOTS.map((slot) => {
            const cfg = CATEGORIES[slot as Category];
            const Icon = cfg.icon;
            const m = build[slot] as AnyModel | undefined;
            const isOpen = open === slot;
            return (
              <div key={slot} className="p-4">
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
                      {t(cfg.tab)}
                      {OPTIONAL.includes(slot) && <span className="text-faint"> · {t(S.optional)}</span>}
                    </div>
                    {m ? (
                      <>
                        <div className="font-semibold [overflow-wrap:anywhere]">{m.chip}</div>
                        <div className="text-xs text-muted">{specLine(slot, m, lang)}</div>
                        <div className="mt-1 empty:hidden">
                          <FitBadge rating={rate(slot, m as never, build, ctx)} lang={lang} />
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-faint">—</div>
                    )}
                  </div>
                  {m && (
                    <a
                      href={m.cheapest.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 whitespace-nowrap"
                    >
                      <span className="font-semibold tabular-nums text-accent">
                        {formatPrice(m.cheapest.price, lang)}
                      </span>
                      <SourceBadge source={m.cheapest.source} />
                      <ExternalLink className="h-3.5 w-3.5 text-faint" />
                    </a>
                  )}
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(isOpen ? null : slot);
                        setQuery('');
                      }}
                      className="tap rounded-lg px-3 py-1.5 text-sm font-medium text-accent ring-1 ring-inset ring-accent/30 hover:bg-accent/10"
                    >
                      {t(m ? S.change : S.choose)}
                    </button>
                    {m && (
                      <button
                        type="button"
                        onClick={() => update({ ...build, [slot]: undefined })}
                        title={t(S.remove)}
                        className="tap-square grid place-items-center rounded-lg p-1.5 text-muted edge hover:bg-hover hover:text-fg dark:ring-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

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
                      <span className={loading ? 'invisible' : undefined}>
                        {options.length} {t(S.options)}
                        {(['fits', 'likely', 'unverified'] as const)
                          .filter((f) => fitCounts[f])
                          .map((f) => ` · ${fitCounts[f]} ${t(FIT_LABEL[f]).toLowerCase()}`)
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
                    {loading ? (
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
                            </>
                          );
                          return (
                            <li key={o.key}>
                              <button
                                type="button"
                                onClick={() => {
                                  update({ ...build, [slot]: o });
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

      {/* Phones and tablets (< lg): a bar fixed to the bottom of the screen with the total; the details
          (PSU, notes, clear) open from it. Wide screens: a sticky card beside the parts. */}
      <aside className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-3 rounded-t-2xl bg-panel px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_20px_rgb(0_0_0/0.12)] ring-1 ring-edge lg:card lg:sticky lg:top-4 lg:inset-auto lg:z-auto lg:p-4">
        <button
          type="button"
          aria-expanded={summaryOpen}
          onClick={() => setSummaryOpen((o) => !o)}
          className="tap flex w-full items-center gap-3 text-left lg:hidden"
        >
          <span className="flex flex-col">
            <span className="text-xs text-muted">
              {t(S.total)} · {chosen.length} {t(S.parts)}
            </span>
            <span className="text-2xl font-semibold tabular-nums text-accent">{formatPrice(total, lang)}</span>
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-sm text-muted">
            {errors > 0 && (
              <span className="flex items-center gap-1 text-fg">
                <AlertTriangle className="h-4 w-4 text-warn" /> {errors}
              </span>
            )}
            {t(S.details)}
            <ChevronUp className={`h-4 w-4 transition-transform duration-150 ${summaryOpen ? '' : 'rotate-180'}`} />
          </span>
        </button>
        <div
          className={`${summaryOpen ? 'flex' : 'hidden'} max-h-[60vh] flex-col gap-3 overflow-y-auto border-t border-line pt-3 lg:flex lg:max-h-none lg:overflow-visible lg:border-0 lg:pt-0`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{t(S.summary)}</span>
            {chosen.length > 0 && (
              <button type="button" onClick={() => update({})} className="tap text-sm text-muted hover:text-fg">
                {t(S.clear)}
              </button>
            )}
          </div>
          <div>
            <div className="hidden text-xs text-muted lg:block">
              {t(S.total)} · {chosen.length} {t(S.parts)}
            </div>
            <div className="hidden text-3xl font-semibold tabular-nums text-accent lg:block">
              {formatPrice(total, lang)}
            </div>
            <div className="mt-1 text-xs text-faint">{t(S.priceNote)}</div>
          </div>
          {watts != null && (
            <div className="text-sm">
              <span className="text-muted">{t(S.psuNeeded)}: </span>
              <span className="font-semibold">≥ {watts}W</span>
            </div>
          )}
          <ul className="flex flex-col gap-2 border-t border-line pt-3 text-sm">
            {notes.map((n, i) => (
              <li key={i} className={`flex gap-2 ${n.level === 'error' ? 'text-fg' : 'text-muted'}`}>
                {n.level === 'error' ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                ) : (
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-faint" />
                )}
                <span>{t(n.text)}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
