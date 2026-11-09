// /compare: the active group of the saved comparison, or a group from a share link (?v=1&cat=…&items=…). Rows are
// aligned by label (lib/compare/table). Nothing is ranked: differences carry a text marker, and only the two money
// rows may say "lower". Phones show two columns at a time.
import { Check, Copy, ExternalLink, RotateCw, Scale, X } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { CATEGORIES } from '../../lib/categories';
import { T, tr, useLang, type Lang, type Text } from '../../lib/i18n';
import { parseShare, shareSearch, type CompareRef } from '../../lib/compare/refs';
import { compareActivate, compareRemove, useCompare } from '../../lib/compare/session';
import { CMP } from '../../lib/compare/strings';
import { buildTable, visibleRows, type CompareRow } from '../../lib/compare/table';
import { useCompareItems, type ItemState } from '../../lib/compare/useCompareItems';
import { useQuery } from '../../lib/router';
import { useMedia } from '../../lib/useMedia';
import { CATS } from '../../shell/nav';
import type { Category } from '../../types';
import { Button, LinkButton } from '../../ui/Button';
import { Photo } from '../../ui/Photo';
import type { SpecGroupId } from '../../ui/specs';
import { EmptyState, ErrorState, SkeletonRows } from '../../ui/states';
import { UI } from '../../ui/strings';

const GROUP_TITLE: Record<SpecGroupId | 'price', Text> = {
  general: UI.specGeneral,
  dimensions: UI.specDimensions,
  power: UI.specPower,
  connections: UI.specConnections,
  price: CMP.priceGroup,
};

type OkState = Extract<ItemState, { status: 'ok' }>;

export default function ComparePage() {
  const lang = useLang();
  const search = useQuery();
  const saved = useCompare();
  const isShare = /[?&](v|cat|items)=/.test(search);
  const shared = useMemo(() => (isShare ? parseShare(search) : null), [isShare, search]);
  const cat: Category | null = isShare ? (shared?.cat ?? null) : saved.active;
  const refs: CompareRef[] = useMemo(() => (isShare ? (shared?.refs ?? []) : cat ? (saved.groups[cat] ?? []) : []), [isShare, shared, saved, cat]);
  const browse = (
    <LinkButton variant="primary" href="/parts">
      {tr(lang, CMP.browse)}
    </LinkButton>
  );

  if (isShare && !shared) return <EmptyState title={tr(lang, CMP.invalid)} text={tr(lang, CMP.emptyText)} action={browse} />;
  if (!cat || refs.length === 0) return <EmptyState icon={Scale} title={tr(lang, CMP.empty)} text={tr(lang, CMP.emptyText)} action={browse} />;
  return <Table cat={cat} refs={refs} shared={isShare} />;
}

function Table({ cat, refs, shared }: { cat: Category; refs: CompareRef[]; shared: boolean }) {
  const lang = useLang();
  const saved = useCompare();
  const wide = useMedia('(min-width: 640px)');
  const { states, changed, retry } = useCompareItems(refs);
  const [hideSame, setHideSame] = useState(false);
  const [hideUnknown, setHideUnknown] = useState(false);
  const [slots, setSlots] = useState<[number, number]>([0, 1]);
  const [copied, setCopied] = useState(false);

  const ok = states.filter((s): s is OkState => s.status === 'ok');
  const rows = buildTable(cat, ok.map((s) => s.item), lang).rows;
  const shown = visibleRows(rows, { hideIdentical: hideSame, hideUnknown });
  const columns = wide || states.length <= 2 ? states.map((_, i) => i) : slots.map((i) => Math.min(i, states.length - 1));
  const groups = Object.keys(saved.groups) as Category[];
  const icon = CATEGORIES[cat].icon;

  if (changed) return <ErrorState detail={tr(lang, CMP.changed)} onRetry={() => location.reload()} />;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/compare${shareSearch(cat, refs)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      /* clipboard blocked: nothing to fall back to here */
    }
  };

  return (
    <section data-compare-page className="flex flex-col gap-4">
      {shared ? (
        <p role="note" className="rounded-lg bg-sunken px-3 py-2 text-sm text-muted">
          <strong className="text-fg">{tr(lang, CMP.shared)}.</strong> {tr(lang, CMP.sharedNote)}
        </p>
      ) : (
        groups.length > 1 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label={tr(lang, CMP.trayLabel)}>
            {groups.map((c) => (
              <button key={c} type="button" className="ui-chip" aria-pressed={c === cat} onClick={() => compareActivate(c)}>
                {tr(lang, CATS[c].name)}
              </button>
            ))}
          </div>
        )
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="ui-chip" aria-pressed={hideSame} onClick={() => setHideSame(!hideSame)}>
          {hideSame && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
          {tr(lang, CMP.hideSame)}
        </button>
        <button type="button" className="ui-chip" aria-pressed={hideUnknown} onClick={() => setHideUnknown(!hideUnknown)}>
          {hideUnknown && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
          {tr(lang, CMP.hideUnknown)}
        </button>
        <Button size="sm" icon={copied ? Check : Copy} onClick={copyLink} className="sm:ml-auto">
          {tr(lang, copied ? CMP.copied : CMP.share)}
        </Button>
      </div>

      {!wide && states.length > 2 && (
        <div className="grid grid-cols-2 gap-2">
          {[0, 1].map((slot) => (
            <label key={slot} className="flex min-w-0 flex-col gap-1 text-xs text-muted">
              {tr(lang, CMP.column)} {slot + 1}
              <select
                className="field tap min-w-0"
                value={columns[slot]}
                onChange={(e) => setSlots((p) => (slot === 0 ? [Number(e.target.value), p[1]] : [p[0], Number(e.target.value)]))}
              >
                {states.map((s, i) => (
                  <option key={i} value={i}>
                    {s.status === 'ok' ? s.title : `${i + 1}`}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}

      {states.some((s) => s.status === 'error') && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger-fg">
          {tr(lang, CMP.loadFailed)}
          <Button size="sm" icon={RotateCw} onClick={retry}>
            {tr(lang, CMP.retry)}
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl ring-1 ring-edge">
        <table className="w-full table-fixed border-collapse text-sm" data-compare-table>
          <caption className="sr-only">{tr(lang, CMP.title)}</caption>
          <thead>
            <tr className="align-top">
              <th scope="col" className="sticky left-0 z-10 w-[34%] bg-panel p-2 text-left text-xs font-semibold text-muted sm:w-48">
                {tr(lang, CMP.product)}
              </th>
              {columns.map((i) => {
                const s = states[i];
                return (
                  <th key={`${i}-${s.ref.slug}-${s.ref.selection?.id ?? ''}`} scope="col" className="bg-panel p-2 text-left align-top font-normal">
                    <div className="flex min-w-0 flex-col gap-2">
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                        {s.status === 'ok' && <Photo image={s.image} size="sm" icon={icon} alt="" />}
                        <div className="min-w-0">
                          {s.status === 'ok' ? (
                            <a href={s.href} className="font-semibold text-fg [overflow-wrap:anywhere] hover:text-accent hover:underline" title={tr(lang, CMP.openProduct)}>
                              {s.title}
                            </a>
                          ) : (
                            <span className="text-muted">{tr(lang, s.status === 'gone' ? CMP.gone : s.status === 'error' ? CMP.loadFailed : T.loading)}</span>
                          )}
                          {s.status === 'ok' && <p className="text-xs text-muted">{tr(lang, s.family ? CMP.family : CMP.exact)}</p>}
                        </div>
                      </div>
                      {!shared && (
                        <Button size="sm" variant="ghost" icon={X} onClick={() => compareRemove(s.ref)} className="self-start">
                          {tr(lang, CMP.remove)}
                        </Button>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {ok.length === 0 && states.some((s) => s.status === 'loading') && (
              <tr>
                <td colSpan={columns.length + 1}>
                  <SkeletonRows rows={3} />
                </td>
              </tr>
            )}
            {shown.map((row, n) => (
              <Fragment key={row.id}>
                {(n === 0 || shown[n - 1].group !== row.group) && (
                  <tr>
                    <th scope="colgroup" colSpan={columns.length + 1} className="bg-sunken px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      {tr(lang, GROUP_TITLE[row.group])}
                    </th>
                  </tr>
                )}
                <RowView row={row} columns={columns.map((i) => ok.indexOf(states[i] as OkState))} lang={lang} />
              </Fragment>
            ))}
            {ok.length > 0 && shown.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="p-4 text-center text-muted">
                  {tr(lang, CMP.noRows)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {refs.length < 2 && <p className="text-sm text-muted">{tr(lang, CMP.needTwo)}</p>}
      <LinkButton size="sm" variant="ghost" icon={ExternalLink} href={`/${cat}`} className="self-start">
        {tr(lang, CATS[cat].name)}
      </LinkButton>
    </section>
  );
}

/** `columns`: for each shown column, the index into the table's values (the loaded items), or -1 when it has no data. */
function RowView({ row, columns, lang }: { row: CompareRow; columns: number[]; lang: Lang }) {
  return (
    <tr className="border-t border-line align-top" data-compare-row={row.id} data-status={row.status}>
      <th scope="row" className="sticky left-0 z-10 bg-panel p-2 text-left text-xs font-medium text-muted [overflow-wrap:anywhere]">
        {row.label}
        {row.status === 'differs' && (
          <span className="ml-1 rounded bg-hover px-1 py-0.5 text-[10px] font-semibold text-fg" title={tr(lang, CMP.differs)}>
            ≠<span className="sr-only"> {tr(lang, CMP.differs)}</span>
          </span>
        )}
      </th>
      {columns.map((c, k) => {
        const v = c >= 0 ? row.values[c] : null;
        return (
          <td key={k} className="ui-num p-2 text-fg [overflow-wrap:anywhere]">
            {v ?? (
              <span className="text-faint">
                —<span className="sr-only"> {tr(lang, CMP.unknown)}</span>
              </span>
            )}
            {v != null && row.tags[c] && <span className="ml-1 rounded bg-hover px-1 py-0.5 text-[10px] font-normal text-muted">{row.tags[c]}</span>}
            {c >= 0 && row.lower === c && (
              <span className="ml-1 rounded bg-low-bg px-1 py-0.5 text-[10px] font-semibold text-low-fg">↓ {tr(lang, CMP.lower)}</span>
            )}
          </td>
        );
      })}
    </tr>
  );
}
