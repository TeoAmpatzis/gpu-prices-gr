import { Copy, Info, Plus, RotateCcw, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { tr, useLang, type Text } from '../lib/i18n';
import type { BaseListing, Category, GpuListing, StorageListing } from '../types';
import { CATS, href } from '../shell/nav';
import { CompatBadge, CompatNote } from '../ui/Badge';
import { Button } from '../ui/Button';
import { AppliedChip, FilterChip } from '../ui/Chip';
import { CheckList, CoverageLine, RangeFilter, Toggle, type Option } from '../ui/filters';
import { ListRow, PartRow, ProductCard, SortHeader, type ListItem, type Part } from '../ui/lists';
import { BottomSheet, Dialog, Toast, ToastRegion, Tooltip } from '../ui/overlays';
import { Pagination } from '../ui/Pagination';
import { Photo } from '../ui/Photo';
import { PriceCell } from '../ui/PriceCell';
import { SpecLine } from '../ui/SpecLine';
import { specsOf } from '../ui/specs';
import { EmptyState, ErrorState, SkeletonCards, SkeletonRows } from '../ui/states';
import { UI, plural } from '../ui/strings';
import { imageOf, priceExamples, priceInfo, sourcesOf, type AnyModel, type PreviewData } from './data';
import { Section, Spec } from './kit';
import { P } from './strings';

const STATES = [
  { label: P.stDefault, force: undefined },
  { label: P.stHover, force: 'hover' },
  { label: P.stFocus, force: 'focus' },
  { label: P.stActive, force: 'active' },
];

export function ButtonsSection() {
  const lang = useLang();
  const rows = [
    { v: 'primary' as const, name: P.vPrimary, text: P.btnPrimary, icon: Plus },
    { v: 'secondary' as const, name: P.vSecondary, text: P.btnSecondary, icon: undefined },
    { v: 'ghost' as const, name: P.vGhost, text: P.btnGhost, icon: Copy },
    { v: 'danger' as const, name: P.vDanger, text: P.btnDanger, icon: Trash2 },
  ];
  return (
    <Section id="buttons" title={P.sButtons}>
      <div className="ui-card relative overflow-x-auto p-4">
        <table className="w-full min-w-[56rem] border-separate border-spacing-y-3 text-left">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wide text-faint">
              <th className="w-28" />
              {[...STATES, { label: P.stDisabled }, { label: P.stLoading }].map((s) => (
                <th key={tr('en', s.label)} className="pr-3 font-semibold">
                  {tr(lang, s.label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.v}>
                <th scope="row" className="pr-3 text-sm font-medium text-muted">
                  {tr(lang, r.name)}
                </th>
                {STATES.map((s) => (
                  <td key={tr('en', s.label)} className="pr-3">
                    <Button variant={r.v} icon={r.icon} force={s.force}>
                      {tr(lang, r.text)}
                    </Button>
                  </td>
                ))}
                <td className="pr-3">
                  <Button variant={r.v} icon={r.icon} disabled>
                    {tr(lang, r.text)}
                  </Button>
                </td>
                <td>
                  <Button variant={r.v} icon={r.icon} loading>
                    {tr(lang, r.text)}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-faint">{tr(lang, P.smallAndIcon)}</span>
          <Button variant="primary" size="sm" icon={Plus}>
            {tr(lang, UI.choose)}
          </Button>
          <Button size="sm">{tr(lang, UI.change)}</Button>
          <Button variant="ghost" size="sm" icon={Trash2} iconOnly>
            {tr(lang, UI.remove)}
          </Button>
          <Button variant="ghost" icon={SlidersHorizontal} iconOnly>
            {tr(lang, P.filtersTitle)}
          </Button>
          <Button variant="secondary" icon={RotateCcw} iconOnly force="focus">
            {tr(lang, UI.clearFilters)}
          </Button>
        </div>
      </div>
    </Section>
  );
}

const countBy = <T,>(xs: T[], key: (x: T) => string | null | undefined) => {
  const m = new Map<string, number>();
  for (const x of xs) {
    const k = key(x);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
};

export function ChipsSection({ d }: { d: PreviewData }) {
  const lang = useLang();
  const vram = countBy(d.models.gpu, (m) => `${(m.cheapest as GpuListing).vram} GB`);
  const [on, setOn] = useState(new Set(['16 GB']));
  const opts = [...vram.entries()].sort((a, b) => parseInt(a[0]) - parseInt(b[0])).slice(0, 6);
  return (
    <Section id="chips" title={P.sChips} intro={P.chipsIntro}>
      <div className="ui-card flex flex-col gap-4 p-4">
        <Spec label={{ el: 'VRAM (πραγματικοί μετρητές μοντέλων)', en: 'VRAM (real model counts)' }}>
          <div className="flex flex-wrap gap-2">
            {opts.map(([k, n]) => (
              <FilterChip key={k} pressed={on.has(k)} count={n} onClick={() => setOn((s) => (s.has(k) ? new Set([...s].filter((x) => x !== k)) : new Set(s).add(k)))}>
                {k}
              </FilterChip>
            ))}
            <FilterChip pressed={false} count={0} disabled>
              48 GB
            </FilterChip>
          </div>
        </Spec>
        <Spec label={{ el: 'Καταστάσεις', en: 'States' }}>
          <div className="flex flex-wrap gap-2">
            <FilterChip pressed={false}>{tr(lang, P.stDefault)}</FilterChip>
            <FilterChip pressed={false} force="hover">
              Hover
            </FilterChip>
            <FilterChip pressed={false} force="focus">
              {tr(lang, P.stFocus)}
            </FilterChip>
            <FilterChip pressed>{tr(lang, { el: 'Επιλεγμένο', en: 'Selected' })}</FilterChip>
            <FilterChip pressed={false} count={0} disabled>
              {tr(lang, P.stDisabled)}
            </FilterChip>
          </div>
        </Spec>
        <Spec label={P.applied}>
          <div className="ui-chip-row">
            {['NVIDIA', '16 GB', tr(lang, P.upTo900), tr(lang, P.saleOnly)].map((l) => (
              <AppliedChip key={l} label={l} />
            ))}
            <button type="button" className="tap shrink-0 px-2 text-sm font-medium text-accent hover:underline">
              {tr(lang, UI.clearFilters)}
            </button>
          </div>
        </Spec>
      </div>
    </Section>
  );
}

export function CompatSection() {
  const lang = useLang();
  return (
    <Section id="compat" title={P.sCompat} intro={P.compatIntro}>
      <div className="ui-card flex flex-col gap-5 p-4">
        <div className="flex flex-wrap gap-2">
          <CompatBadge level="error" />
          <CompatBadge level="warning" />
          <CompatBadge level="note" word={UI.compatLikely} />
          <CompatBadge level="note" />
          <CompatBadge level="pass" />
          <CompatBadge level="pass" word={UI.compatFits} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CompatNote level="error" reason={P.rError} />
          <CompatNote level="warning" reason={P.rWarning} />
          <CompatNote level="note" word={UI.compatLikely} reason={P.rLikely} />
          <CompatNote level="note" reason={P.rUnverified} />
          <CompatNote level="pass" reason={P.rPass} />
          <CompatNote level="pass" word={UI.compatFits} reason={P.rFits} />
        </div>
        <p className="text-xs text-faint">{tr(lang, { el: 'Χωρίς χρώμα: εικονίδιο + λέξη (✕ ⚠ ⓘ ✓).', en: 'Without colour: icon + word (✕ ⚠ ⓘ ✓).' })}</p>
      </div>
    </Section>
  );
}

function Example({ title, note, d, ex }: { title: Text; note?: Text; d: PreviewData; ex?: { c: Category; m: AnyModel; l?: BaseListing } | null }) {
  const lang = useLang();
  return (
    <div className="ui-card flex flex-col gap-3 p-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-faint">{tr(lang, title)}</span>
      {ex ? (
        <>
          <p className="text-sm font-medium">
            {ex.m.chip} <span className="text-faint">· {tr(lang, CATS[ex.c].name)}</span>
          </p>
          <PriceCell
            info={{ ...priceInfo(d, ex.c, ex.m, ex.l), ...(note ? { availability: UI.inStock } : {}) }}
          />
          {note && <p className="text-xs text-faint">* {tr(lang, note)}</p>}
        </>
      ) : (
        <p className="text-sm text-faint">{tr(lang, P.pNone)}</p>
      )}
    </div>
  );
}

export function PriceSection({ d }: { d: PreviewData }) {
  const ex = priceExamples(d);
  return (
    <Section id="price" title={P.sPrice} intro={P.priceIntro}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Example title={P.pKnown} note={P.pKnownNote} d={d} ex={ex.known} />
        <Example title={P.pNoShipping} d={d} ex={ex.noShipping} />
        <Example title={P.pNoAvail} d={d} ex={ex.noAvail} />
        <Example title={P.pStale} d={d} ex={ex.stale} />
        <Example title={P.pUnusual} d={d} ex={ex.unusual} />
      </div>
    </Section>
  );
}

const ORDER: Category[] = ['cpu', 'mobo', 'ram', 'gpu', 'storage', 'case', 'psu', 'cooler', 'fan'];

export function SpecsSection({ d }: { d: PreviewData }) {
  const lang = useLang();
  return (
    <Section id="specs" title={P.sSpecs} intro={P.specsIntro}>
      <ul className="ui-card divide-y divide-line">
        {ORDER.map((c) => {
          const m = d.models[c][0];
          return (
            <li key={c} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
              <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-faint">{tr(lang, CATS[c].name)}</span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{m.chip}</span>
                <SpecLine specs={specsOf(c, m.listings, lang)} />
              </span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

export function FiltersSection({ d }: { d: PreviewData }) {
  const lang = useLang();
  const partners = countBy(d.models.gpu.flatMap((m) => [...new Set(m.listings.map((l) => (l as GpuListing).partner))].map((p) => ({ p }))), (x) => x.p);
  const gpuOpts: Option[] = [...partners.entries()].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, label: value, count }));
  const makers = countBy(d.models.storage, (m) => (m.cheapest as StorageListing).brand);
  const storageOpts: Option[] = [...makers.entries()].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, label: value, count }));
  storageOpts.push({ value: '__none', label: 'Maxtor', count: 0 });
  const [sel, setSel] = useState(new Set(gpuOpts.slice(0, 2).map((o) => o.value)));
  const [sel2, setSel2] = useState(new Set<string>());
  const toggle = (s: Set<string>, v: string) => (s.has(v) ? new Set([...s].filter((x) => x !== v)) : new Set(s).add(v));
  const prices = d.models.gpu.map((m) => m.cheapest.price);
  const lo = Math.floor(Math.min(...prices) / 10) * 10;
  const hi = Math.ceil(Math.min(Math.max(...prices), 4000) / 10) * 10;
  const [range, setRange] = useState<[number, number]>([300, 900]);
  const [sale, setSale] = useState(true);
  const [off, setOff] = useState(false);
  const [missing, setMissing] = useState(false);
  const withLength = d.models.gpu.filter((m) => m.listings.some((l) => (l as GpuListing).lengthMm != null)).length;
  const pct = Math.round((withLength / d.models.gpu.length) * 100);
  return (
    <Section id="filters" title={P.sFilters} intro={P.filtersIntro}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="ui-card p-4">
          <CheckList title={tr(lang, P.gpuMakers)} options={gpuOpts} selected={sel} onToggle={(v) => setSel((s) => toggle(s, v))} />
        </div>
        <div className="ui-card p-4">
          <CheckList title={tr(lang, P.storageMakers)} options={storageOpts} selected={sel2} onToggle={(v) => setSel2((s) => toggle(s, v))} initialQuery="wes" />
        </div>
        <div className="ui-card flex flex-col gap-5 p-4">
          <RangeFilter title={tr(lang, P.priceRange)} min={lo} max={hi} step={10} unit="€" value={range} onChange={setRange} />
          <RangeFilter title={`${tr(lang, P.priceRange)} (${tr(lang, { el: 'μη έγκυρο εύρος', en: 'invalid range' })})`} min={lo} max={hi} step={10} unit="€" value={[900, 600]} onChange={() => {}} />
        </div>
        <div className="ui-card flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1">
            <Toggle label={tr(lang, P.saleOnly)} checked={sale} onChange={setSale} />
            <Toggle label={tr(lang, P.switchOff)} checked={off} onChange={setOff} />
            <Toggle label={tr(lang, P.switchDisabled)} checked={false} disabled onChange={() => {}} />
            <Toggle label={tr(lang, P.stFocus)} checked force="focus" onChange={() => {}} />
          </div>
          <div className="border-t border-line pt-4">
            <div className="mb-1 flex items-center gap-1 text-sm font-semibold">
              {tr(lang, P.lengthField)}
              <Tooltip content={tr(lang, P.tooltipText)}>
                <button type="button" className="tap-square grid h-6 w-6 place-items-center rounded text-faint hover:text-fg">
                  <Info className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{tr(lang, P.tooltipText)}</span>
                </button>
              </Tooltip>
            </div>
            <CoverageLine field={tr(lang, P.lengthField)} pct={pct} showMissing={missing} onToggle={setMissing} />
          </div>
        </div>
      </div>
    </Section>
  );
}

export function listItem(d: PreviewData, c: Category, m: AnyModel, lang: 'el' | 'en', size: 'sm' | 'md' = 'sm'): ListItem {
  return {
    name: m.chip,
    href: href.model(c, m.chip),
    photo: <Photo image={imageOf(d, c, m)} size={size} icon={CATS[c].icon} alt={m.chip} />,
    specs: specsOf(c, m.listings, lang),
    price: priceInfo(d, c, m),
    offers: m.listings.length,
    sources: sourcesOf(m),
  };
}

const find = (ms: AnyModel[], f: (m: AnyModel) => boolean) => ms.find(f) ?? ms[0];

export function buildParts(d: PreviewData, lang: 'el' | 'en') {
  const part = (c: Category, m: AnyModel, extra: Partial<Part> = {}): Part => ({ ...listItem(d, c, m, lang, 'md'), ...extra });
  const L = <T,>(m: AnyModel) => m.cheapest as unknown as T;
  return {
    cpu: part('cpu', find(d.models.cpu, (m) => m.chip === 'Ryzen 7 9800X3D'), { compat: { level: 'pass', reason: P.rPass } }),
    mobo: part('mobo', find(d.models.mobo, (m) => /B850/.test(m.chip) && L<{ formFactor: string }>(m).formFactor === 'ATX'), { compat: { level: 'pass', reason: P.rPass } }),
    ram: part('ram', find(d.models.ram, (m) => m.key.startsWith('DDR5 32GB (2×16GB) 6000MHz')), { compat: { level: 'pass' } }),
    gpu: part('gpu', find(d.models.gpu, (m) => m.key === 'RTX 5070 12GB'), { compat: { level: 'warning', reason: P.rWarning } }),
    cooler: part('cooler', find(d.models.cooler, (m) => L<{ type: string; heightMm?: number }>(m).type === 'Air' && m.listings.length > 3), { compat: { level: 'note', reason: P.rUnverified } }),
    storage: part('storage', find(d.models.storage, (m) => /990 Pro 2TB/i.test(m.chip)), { compat: { level: 'pass' } }),
    case: part('case', d.models.case[0], { compat: { level: 'error', reason: P.rError } }),
    fan: part('fan', find(d.models.fan, (m) => L<{ pack: number; size: number }>(m).pack === 1 && L<{ size: number }>(m).size === 120), { compat: { level: 'note', word: UI.compatLikely, reason: P.rFan }, qty: 3 }),
    removed: part('storage', d.models.storage[5], { removed: true }),
  };
}

export function ListsSection({ d }: { d: PreviewData }) {
  const lang = useLang();
  const rows = d.models.gpu.slice(0, 5).map((m) => listItem(d, 'gpu', m, lang));
  const parts = buildParts(d, lang);
  const [fans, setFans] = useState(3);
  return (
    <Section id="lists" title={P.sLists} intro={P.listsIntro}>
      <div className="ui-card relative overflow-x-auto">
        <table className="w-full min-w-[46rem]">
          <thead className="bg-sunken">
            <tr>
              <SortHeader label={tr(lang, UI.model)} dir={null} />
              <SortHeader label={tr(lang, UI.price)} dir="asc" align="end" />
              <SortHeader label={tr(lang, UI.offers)} dir={null} align="end" force="hover" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <ListRow key={r.name} item={r} force={i === 1 ? 'hover' : i === 2 ? 'focus' : undefined} selected={i === 3} />
            ))}
          </tbody>
        </table>
        <p className="border-t border-line px-3 py-2 text-xs text-faint">
          {tr(lang, { el: 'Γραμμές: κανονική · hover · εστίαση (όνομα) · επιλεγμένη · κανονική', en: 'Rows: default · hover · focus (name) · selected · default' })}
        </p>
      </div>
      <Spec label={P.cards}>
        <div className="grid gap-3 sm:grid-cols-2 lg:max-w-3xl">
          {d.models.ram.slice(0, 2).map((m) => (
            <ProductCard key={m.key} item={listItem(d, 'ram', m, lang, 'md')} />
          ))}
        </div>
      </Spec>
      <Spec label={P.partList}>
        <ul className="ui-card">
          <PartRow slot={CATS.cpu.one!} icon={CATS.cpu.icon} part={parts.cpu} />
          <PartRow slot={CATS.mobo.one!} icon={CATS.mobo.icon} part={parts.mobo} />
          <PartRow slot={CATS.ram.one!} icon={CATS.ram.icon} part={parts.ram} />
          <PartRow slot={CATS.gpu.one!} icon={CATS.gpu.icon} part={parts.gpu} />
          <PartRow slot={CATS.cooler.one!} icon={CATS.cooler.icon} part={parts.cooler} />
          <PartRow slot={CATS.storage.one!} icon={CATS.storage.icon} part={parts.storage} />
          <PartRow slot={CATS.case.one!} icon={CATS.case.icon} part={parts.case} />
          <PartRow slot={CATS.psu.one!} icon={CATS.psu.icon} part={null} />
          <PartRow slot={CATS.fan.one!} icon={CATS.fan.icon} part={{ ...parts.fan, qty: fans }} onQty={setFans} />
        </ul>
      </Spec>
      <Spec label={P.partStates}>
        <ul className="ui-card">
          <PartRow slot={CATS.psu.one!} icon={CATS.psu.icon} part={null} />
          <PartRow slot={CATS.storage.one!} icon={CATS.storage.icon} part={parts.removed} />
        </ul>
      </Spec>
    </Section>
  );
}

export function PagingSection() {
  const [page, setPage] = useState(3);
  const [per, setPer] = useState(50);
  return (
    <Section id="paging" title={P.sPaging}>
      <div className="ui-card p-4">
        <Pagination page={page} pages={20} per={per} onPage={setPage} onPer={setPer} />
      </div>
    </Section>
  );
}

export function OverlaysSection({ d, notify }: { d: PreviewData; notify: (text: string, undo?: boolean) => void }) {
  const lang = useLang();
  const [sheet, setSheet] = useState(false);
  const [dialog, setDialog] = useState(false);
  const opts: Option[] = [...countBy(d.models.gpu, (m) => m.group).entries()].map(([value, count]) => ({ value, label: value, count }));
  const sheetBody = <CheckList title={tr(lang, P.gpuMakers)} options={opts} selected={new Set(['NVIDIA'])} onToggle={() => {}} />;
  const sheetFooter = (
    <>
      <Button onClick={() => setSheet(false)}>
        {tr(lang, UI.clearFilters)}
      </Button>
      <Button variant="primary" className="flex-1" onClick={() => setSheet(false)}>
        {tr(lang, P.showModels(d.models.gpu.length))}
      </Button>
    </>
  );
  const dialogActions = (onDone: () => void) => (
    <>
      <Button onClick={onDone}>{tr(lang, UI.cancel)}</Button>
      <Button
        variant="danger"
        icon={Trash2}
        onClick={() => {
          onDone();
          notify(tr(lang, P.toastCleared), true);
        }}
      >
        {tr(lang, P.clear)}
      </Button>
    </>
  );
  return (
    <Section id="overlays" title={P.sOverlays} intro={P.overlaysIntro}>
      <div className="flex flex-wrap gap-2">
        <Button icon={SlidersHorizontal} onClick={() => setSheet(true)}>
          {tr(lang, P.openSheet)}
        </Button>
        <Button onClick={() => setDialog(true)}>{tr(lang, P.openDialog)}</Button>
        <Button onClick={() => notify(tr(lang, P.toastCopied))}>{tr(lang, P.showToast)}</Button>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Spec label={{ el: 'Bottom sheet (κινητό)', en: 'Bottom sheet (phones)' }}>
          <div className="max-w-sm">
            <BottomSheet inline open title={tr(lang, P.filtersTitle)} onClose={() => {}} footer={sheetFooter}>
              {sheetBody}
            </BottomSheet>
          </div>
        </Spec>
        <Spec label={{ el: 'Διάλογος', en: 'Dialog' }}>
          <Dialog inline open title={tr(lang, P.dialogTitle)} onClose={() => {}} actions={dialogActions(() => {})}>
            {tr(lang, P.dialogText)}
          </Dialog>
        </Spec>
        <Spec label={{ el: 'Toast και tooltip', en: 'Toast and tooltip' }}>
          <Toast tone="success" text={tr(lang, P.toastCopied)} />
          <Toast
            text={tr(lang, P.toastCleared)}
            action={
              <Button variant="ghost" size="sm">
                {tr(lang, UI.undo)}
              </Button>
            }
          />
          <div className="mt-12 flex justify-center">
            <Tooltip content={tr(lang, P.tooltipText)} open>
              <span className="text-sm text-muted underline decoration-dotted underline-offset-4">{tr(lang, P.lengthField)}: 305 mm</span>
            </Tooltip>
          </div>
        </Spec>
      </div>
      <BottomSheet open={sheet} title={tr(lang, P.filtersTitle)} onClose={() => setSheet(false)} footer={sheetFooter}>
        {sheetBody}
      </BottomSheet>
      <Dialog open={dialog} title={tr(lang, P.dialogTitle)} onClose={() => setDialog(false)} actions={dialogActions(() => setDialog(false))}>
        {tr(lang, P.dialogText)}
      </Dialog>
    </Section>
  );
}

export function StatesSection({ notFound }: { notFound: ReactNode }) {
  const lang = useLang();
  const [retrying, setRetrying] = useState(false);
  return (
    <Section id="states" title={P.sStates}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="ui-card">
          <EmptyState title={tr(lang, UI.emptyTitle)} text={tr(lang, UI.emptyText)} action={<Button icon={RotateCcw}>{tr(lang, UI.clearFilters)}</Button>} />
        </div>
        <div className="ui-card">
          <ErrorState
            detail="/data/gpu/list.json: HTTP 500"
            retrying={retrying}
            onRetry={() => {
              setRetrying(true);
              setTimeout(() => setRetrying(false), 1500);
            }}
          />
        </div>
        <Spec label={P.skeletonTable} className="ui-card p-2">
          <SkeletonRows />
        </Spec>
        <Spec label={P.skeletonCards}>
          <div className="max-w-sm">
            <SkeletonCards />
          </div>
        </Spec>
      </div>
      <div className="ui-card px-4">{notFound}</div>
      <p className="text-xs text-faint">{plural(lang, 3, UI.partForms)} · {plural(lang, 1, UI.partForms)} · {plural(lang, 1, UI.offerForms)}</p>
    </Section>
  );
}

export { ToastRegion };
