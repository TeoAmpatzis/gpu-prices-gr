import { useEffect, useMemo, useRef, useState } from 'react';
import { tr, useLang } from '../../lib/i18n';
import { formatPrice } from '../../lib/format';
import { navigate, useQuery } from '../../lib/router';
import { parseSearch, searchResults, searchUrl } from '../../lib/searchResults';
import type { PreparedIndex } from '../../lib/search';
import { loadSearchIndex } from '../../shell/site';
import { CATS, href } from '../../shell/nav';
import { CATEGORY_LIST } from '../../lib/routes';
import './search.css';

export default function SearchPage() {
  const lang = useLang();
  const heading = useRef<HTMLHeadingElement>(null);
  const query = useQuery();
  const state = useMemo(() => parseSearch(query), [query]);
  const [index, setIndex] = useState<PreparedIndex | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const text = (el: string, en: string) => tr(lang, { el, en });
  useEffect(() => {
    let alive = true;
    loadSearchIndex().then((value) => { if (alive) { setIndex(value); setError(false); } }, () => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [attempt]);
  const result = index ? searchResults(index, state) : null;
  useEffect(() => { document.title = `${state.q ? `${state.q} — ` : ''}${tr(lang, { el: 'Αναζήτηση', en: 'Search' })} — BuildDraft.gr`; }, [state.q, lang]);
  const update = (patch: Partial<typeof state>) => navigate(searchUrl({ ...state, ...patch, page: 1 }));
  return <section className="search-page">
    <nav aria-label={text('Διαδρομή', 'Breadcrumb')} className="text-sm text-muted"><a href="/" className="text-accent">{text('Αρχική', 'Home')}</a> / {text('Αναζήτηση', 'Search')}</nav>
    <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">{state.q ? text(`Αποτελέσματα για «${state.q}»`, `Results for “${state.q}”`) : text('Αναζήτηση εξαρτημάτων', 'Search PC parts')}</h1>
    <p className="text-sm text-muted">{text('Αναζήτηση οικογενειών μοντέλων. Για μεμονωμένα προϊόντα, άνοιξε μια κατηγορία. Οι τιμές δεν περιλαμβάνουν μεταφορικά.', 'Search model families. Browse a category for individual products. Prices exclude shipping.')}</p>
    <form key={query} className="search-query" onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); update({ q: String(data.get('q') ?? '').trim() }); heading.current?.focus(); }}>
      <input className="ui-field" aria-label={text('Αναζήτηση', 'Search')} name="q" defaultValue={state.q} maxLength={500} type="search" placeholder="RTX 5070, 990 Pro 1TB…" />
      <button className="ui-btn ui-btn--primary" type="submit">{text('Αναζήτηση', 'Search')}</button>
    </form>
    <div className="search-layout">
      <aside className="search-filters ui-card">
        <div className="flex justify-between gap-3"><h2 className="font-semibold">{text('Φίλτρα', 'Filters')}</h2><a className="text-accent text-sm" href={searchUrl({ q: state.q, sort: 'relevance', page: 1 })}>{text('Καθαρισμός', 'Clear')}</a></div>
        <label className="flex flex-col gap-2 text-sm">{text('Κατηγορία', 'Category')}<select className="ui-field" value={state.cat ?? ''} onChange={(e) => update({ cat: e.target.value as typeof state.cat || undefined })}><option value="">{text('Όλες οι κατηγορίες', 'All categories')}</option>{CATEGORY_LIST.map((cat) => <option key={cat} value={cat}>{tr(lang, CATS[cat].name)} ({result?.counts[cat] ?? 0})</option>)}</select></label>
        <form key={`prices-${query}`} className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); const p = new URLSearchParams({ min: String(d.get('min')), max: String(d.get('max')) }); const bounds = parseSearch(`?${p}`); update({ min: bounds.min, max: bounds.max }); heading.current?.focus(); }}>
          <h3 className="text-sm font-semibold">{text('Τιμή προϊόντος (€)', 'Item price (€)')}</h3>
          <div className="search-bounds">{(['min', 'max'] as const).map((key) => <label key={key} className="text-xs text-muted">{key === 'min' ? text('Από', 'Minimum') : text('Έως', 'Maximum')}<input className="ui-field mt-1" name={key} type="number" min="0" step="0.01" defaultValue={state[key] ?? ''} /></label>)}</div>
          <button className="ui-btn ui-btn--secondary" type="submit">{text('Εφαρμογή', 'Apply')}</button>
        </form>
      </aside>
      <div className="min-w-0">
        <div className="search-toolbar"><p role="status" className="text-sm font-semibold">{result ? text(`${result.total} οικογένειες μοντέλων`, `${result.total} model families`) : text('Φόρτωση…', 'Loading…')}</p><label className="text-sm">{text('Ταξινόμηση', 'Sort')}<select className="ui-field ml-2" value={state.sort} onChange={(e) => update({ sort: e.target.value as typeof state.sort })}><option value="relevance">{text('Συνάφεια', 'Relevance')}</option><option value="price-asc">{text('Τιμή αύξουσα', 'Price: low to high')}</option><option value="price-desc">{text('Τιμή φθίνουσα', 'Price: high to low')}</option></select></label></div>
        {error ? <div role="alert" className="ui-card p-6"><p>{text('Δεν φορτώθηκε η αναζήτηση.', 'Search could not load.')}</p><button className="ui-btn ui-btn--secondary mt-3" onClick={() => { setError(false); setAttempt(attempt + 1); }}>{text('Δοκίμασε ξανά', 'Retry')}</button></div> : !result ? <div aria-busy="true" className="ui-card p-8">{text('Φόρτωση οικογενειών μοντέλων…', 'Loading model families…')}</div> : !result.total ? <div className="ui-card p-8"><h2 className="font-semibold">{state.q ? text('Δεν βρέθηκαν αποτελέσματα', 'No results found') : text('Γράψε ένα μοντέλο για αναζήτηση', 'Enter a model to search')}</h2><p className="mt-2 text-muted">{text('Δοκίμασε λιγότερες λέξεις ή καθάρισε τα φίλτρα.', 'Try fewer words or clear the filters.')}</p><a href="/parts" className="mt-4 inline-block text-accent">{text('Περιήγηση κατηγοριών', 'Browse categories')}</a></div> : <>
          <ul className="search-results ui-card">{result.hits.map((hit) => { const Icon = CATS[hit.cat].icon; return <li key={`${hit.cat}-${hit.slug}`}><Icon aria-hidden="true" className="search-result-icon" /><div className="min-w-0"><a className="font-semibold hover:text-accent" href={href.model(hit.cat, hit.slug)}>{hit.name}</a><p className="text-xs text-muted mt-1">{tr(lang, CATS[hit.cat].name)} · {text('Οικογένεια μοντέλων', 'Model family')}</p><a className="text-xs text-accent" href={href.category(hit.cat)}>{text('Μεμονωμένα προϊόντα στην κατηγορία', 'Individual products in category')}</a></div><p className="search-result-price"><span className="block text-xs text-muted">{text('Από', 'From')}</span>{formatPrice(hit.price, lang)}</p></li>; })}</ul>
          <nav aria-label={text('Σελίδες αποτελεσμάτων', 'Result pages')} className="search-pagination"><span className="text-sm text-muted">{text(`Σελίδα ${result.page} από ${result.pages}`, `Page ${result.page} of ${result.pages}`)}</span><div className="flex gap-2">{result.page > 1 && <a className="ui-btn ui-btn--secondary" href={searchUrl({ ...state, page: result.page - 1 })}>{text('Προηγούμενη', 'Previous')}</a>}{result.page < result.pages && <a className="ui-btn ui-btn--secondary" href={searchUrl({ ...state, page: result.page + 1 })}>{text('Επόμενη', 'Next')}</a>}</div></nav>
        </>}
      </div>
    </div>
  </section>;
}
