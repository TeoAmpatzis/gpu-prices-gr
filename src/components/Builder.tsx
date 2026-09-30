import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink, Info, Loader2, Search, X } from 'lucide-react';
import type { BaseListing, Category } from '../types';
import { CATEGORIES, groupName } from '../lib/categories';
import { formatPrice, loadData, type Model } from '../lib/data';
import {
  OPTIONAL,
  SLOTS,
  buildNotes,
  candidates,
  caseBoard,
  cpuHasIgpu,
  cpuSocket,
  gpuPsu,
  moboForm,
  moboMemory,
  moboSlots,
  moboSocket,
  requiredWatts,
  slotModels,
  type Build,
  type Slot,
  type SlotListing,
} from '../lib/builder';
import { T, tr, useLang, type Lang, type Text } from '../lib/i18n';
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
  compatible: { el: 'συμβατά', en: 'compatible' },
  noneCompatible: {
    el: 'Κανένα συμβατό προϊόν με την τρέχουσα επιλογή. Αφαιρέστε κάποιο εξάρτημα για περισσότερες επιλογές.',
    en: 'Nothing compatible with the current build. Remove a part to see more options.',
  },
  total: { el: 'Σύνολο', en: 'Total' },
  parts: { el: 'εξαρτήματα', en: 'parts' },
  psuNeeded: { el: 'Προτεινόμενο τροφοδοτικό', en: 'Recommended PSU' },
  clear: { el: 'Καθαρισμός', en: 'Clear build' },
  summary: { el: 'Η σύνθεσή σας', en: 'Your build' },
  priceNote: {
    el: 'Χαμηλότερη τιμή ανά προϊόν, χωρίς μεταφορικά· κάθε εξάρτημα μπορεί να είναι από διαφορετικό κατάστημα.',
    en: 'Lowest price per product, before shipping; each part may come from a different shop.',
  },
  cores: { el: 'πυρήνες', en: 'cores' },
  slots: { el: 'υποδοχές', en: 'slots' },
  psu: { el: 'τροφ.', en: 'PSU' },
  upTo: { el: 'έως', en: 'up to' },
};

/** One-line specs under a part's name, from the same fields the rules use. */
function specLine(slot: Slot, m: AnyModel, lang: Lang): string {
  const t = (x: Text) => tr(lang, x);
  switch (slot) {
    case 'cpu': {
      const c = m as Model<SlotListing['cpu']>;
      return [cpuSocket(c), c.cheapest.cores && `${c.cheapest.cores} ${t(S.cores)}`, cpuHasIgpu(c) && 'iGPU'].filter(Boolean).join(' · ');
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
      return `${g.cheapest.vram}GB · ${t(S.psu)} ≥ ${gpuPsu(g.chip)}W`;
    }
    case 'psu': {
      const p = m as Model<SlotListing['psu']>;
      return [p.cheapest.formFactor, p.cheapest.modular && `${p.cheapest.modular} modular`, p.cheapest.brand].filter(Boolean).join(' · ');
    }
    case 'case': {
      const c = m as Model<SlotListing['case']>;
      return `${groupName(c.cheapest.size, lang)} · ${t(S.upTo)} ${caseBoard(c)}`;
    }
    case 'cooler': {
      const c = m as Model<SlotListing['cooler']>;
      return c.cheapest.type === 'Air' ? groupName('Αέρα', lang) : `AIO ${c.cheapest.radiator ?? ''}mm`;
    }
  }
}

function loadSaved(): Partial<Record<Slot, string>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Record<Slot, string>>;
  } catch {
    return {};
  }
}

function save(b: Build) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(SLOTS.filter((s) => b[s]).map((s) => [s, b[s]!.key]))));
  } catch {
    /* storage unavailable (private mode): the build just isn't remembered */
  }
}

export default function Builder() {
  const lang = useLang();
  const t = (x: Text) => tr(lang, x);
  const [models, setModels] = useState<Models | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [build, setBuild] = useState<Build>({});
  const [open, setOpen] = useState<Slot | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    Promise.all(SLOTS.map((s) => loadData(s as Category)))
      .then((all) => {
        const m = Object.fromEntries(
          SLOTS.map((s, i) => [s, slotModels(s, all[i].latest.listings as SlotListing[typeof s][])]),
        ) as unknown as Models;
        setModels(m);
        // Restore the saved build; parts that disappeared from the market are dropped.
        const saved = loadSaved();
        const restored: Build = {};
        for (const s of SLOTS) {
          const found = (m[s] as AnyModel[]).find((x) => x.key === saved[s]);
          if (found) (restored as Record<Slot, AnyModel>)[s] = found;
        }
        setBuild(restored);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const update = (b: Build) => {
    setBuild(b);
    save(b);
  };

  const options = useMemo(() => {
    if (!models || !open) return [];
    const q = query.trim().toLowerCase();
    const cfg = CATEGORIES[open as Category] as unknown as { searchText: (l: BaseListing) => string };
    return (candidates(open, models[open] as never, build) as AnyModel[])
      .filter((m) => !q || m.listings.some((l) => cfg.searchText(l).toLowerCase().includes(q)))
      .sort((a, b) => a.cheapest.price - b.cheapest.price);
  }, [models, open, query, build]);

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-4 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900">
        <AlertTriangle className="h-5 w-5" /> {t(T.loadError)}: {error}
      </div>
    );
  }
  if (!models) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-faint">
        <Loader2 className="h-5 w-5 animate-spin" /> {t(T.loading)}
      </div>
    );
  }

  const chosen = SLOTS.filter((s) => build[s]).map((s) => build[s] as AnyModel);
  const total = chosen.reduce((sum, m) => sum + m.cheapest.price, 0);
  const watts = requiredWatts(build);
  const notes = buildNotes(build);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="card divide-y divide-line">
        {SLOTS.map((slot) => {
          const cfg = CATEGORIES[slot as Category];
          const Icon = cfg.icon;
          const m = build[slot] as AnyModel | undefined;
          const isOpen = open === slot;
          return (
            <div key={slot} className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted">
                    {t(cfg.tab)}
                    {OPTIONAL.includes(slot) && <span className="text-faint"> · {t(S.optional)}</span>}
                  </div>
                  {m ? (
                    <div className="truncate font-semibold">
                      {m.chip}
                      <span className="ml-2 text-xs font-normal text-muted">{specLine(slot, m, lang)}</span>
                    </div>
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
                    <span className="font-semibold tabular-nums text-accent">{formatPrice(m.cheapest.price, lang)}</span>
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
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-accent ring-1 ring-inset ring-accent/30 hover:bg-accent/10"
                  >
                    {t(m ? S.change : S.choose)}
                  </button>
                  {m && (
                    <button
                      type="button"
                      onClick={() => update({ ...build, [slot]: undefined })}
                      title={t(S.remove)}
                      className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-fg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {isOpen && (
                <div className="mt-3 rounded-xl bg-sunken p-3 ring-1 ring-line">
                  <label className="relative mb-2 block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t(cfg.searchPlaceholder)}
                      className="field w-full py-2 pl-9 pr-3"
                    />
                  </label>
                  <div className="mb-1.5 text-xs text-muted">
                    {options.length} {t(S.compatible)}
                  </div>
                  {options.length === 0 ? (
                    <div className="p-3 text-sm text-muted">{t(S.noneCompatible)}</div>
                  ) : (
                    <ul className="max-h-80 divide-y divide-line overflow-y-auto rounded-lg bg-panel ring-1 ring-line">
                      {options.slice(0, PICKER_LIMIT).map((o) => (
                        <li key={o.key}>
                          <button
                            type="button"
                            onClick={() => {
                              update({ ...build, [slot]: o });
                              setOpen(null);
                            }}
                            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-hover"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{o.chip}</span>
                              <span className="block truncate text-xs text-muted">{specLine(slot, o, lang)}</span>
                            </span>
                            <span className="font-semibold tabular-nums">{formatPrice(o.cheapest.price, lang)}</span>
                            <SourceBadge source={o.cheapest.source} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <aside className="card flex flex-col gap-3 p-4 lg:sticky lg:top-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{t(S.summary)}</span>
          {chosen.length > 0 && (
            <button type="button" onClick={() => update({})} className="text-sm text-muted hover:text-fg">
              {t(S.clear)}
            </button>
          )}
        </div>
        <div>
          <div className="text-xs text-muted">
            {t(S.total)} · {chosen.length} {t(S.parts)}
          </div>
          <div className="text-3xl font-semibold tabular-nums text-accent">{formatPrice(total, lang)}</div>
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
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              ) : (
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-faint" />
              )}
              <span>{t(n.text)}</span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
