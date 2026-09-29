import { useEffect, useState } from 'react';
import { TrendingDown } from 'lucide-react';
import type { Category } from './types';
import { CASE, CATEGORIES, CATEGORY_IDS, CPU, GPU, PSU, RAM } from './lib/categories';
import CategoryView from './components/CategoryView';
import ThemeToggle from './components/ThemeToggle';

const fromHash = (): Category => {
  const id = location.hash.slice(1);
  return (CATEGORY_IDS as string[]).includes(id) ? (id as Category) : 'gpu';
};

export default function App() {
  const [active, setActive] = useState<Category>(fromHash);
  // Keep visited tabs mounted so their filters survive switching back and forth.
  const [visited, setVisited] = useState<Set<Category>>(() => new Set([fromHash()]));

  useEffect(() => {
    const onHash = () => setActive(fromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    setVisited((v) => (v.has(active) ? v : new Set(v).add(active)));
  }, [active]);

  const cfg = CATEGORIES[active];
  const Icon = cfg.icon;

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:py-8">
      <header className="mb-6 flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <a href="#gpu" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-page shadow-sm">
              <TrendingDown className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold tracking-tight">Τιμές Hardware</span>
              <span className="block text-xs text-faint">Skroutz · BestPrice · Ελλάδα</span>
            </span>
          </a>
          <ThemeToggle />
        </div>

        {/* Bottom rule is an inset shadow so the active tab's underline can sit on it without
            causing vertical overflow; tabs scroll sideways on narrow screens. */}
        <nav className="flex gap-1 overflow-x-auto shadow-[inset_0_-1px_0_rgb(var(--line))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORY_IDS.map((id) => {
            const c = CATEGORIES[id];
            const TabIcon = c.icon;
            return (
              <a
                key={id}
                href={`#${id}`}
                aria-current={id === active ? 'page' : undefined}
                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 pb-3 pt-1 text-sm font-medium transition ${
                  id === active ? 'border-accent text-fg' : 'border-transparent text-muted hover:border-line-strong hover:text-fg'
                }`}
              >
                <TabIcon className={`h-4 w-4 ${id === active ? 'text-accent' : ''}`} /> {c.tab}
              </a>
            );
          })}
        </nav>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent ring-1 ring-inset ring-accent/20">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{cfg.title}</h1>
            <p className="mt-1 text-sm text-muted">{cfg.subtitle}</p>
          </div>
        </div>
      </header>

      {visited.has('gpu') && (
        <div hidden={active !== 'gpu'}>
          <CategoryView cfg={GPU} />
        </div>
      )}
      {visited.has('cpu') && (
        <div hidden={active !== 'cpu'}>
          <CategoryView cfg={CPU} />
        </div>
      )}
      {visited.has('ram') && (
        <div hidden={active !== 'ram'}>
          <CategoryView cfg={RAM} />
        </div>
      )}
      {visited.has('psu') && (
        <div hidden={active !== 'psu'}>
          <CategoryView cfg={PSU} />
        </div>
      )}
      {visited.has('case') && (
        <div hidden={active !== 'case'}>
          <CategoryView cfg={CASE} />
        </div>
      )}

      <footer className="mt-10 border-t border-line pt-6 text-center text-xs text-faint">
        Οι τιμές ενημερώνονται αυτόματα κάθε 6 ώρες και ενδέχεται να διαφέρουν από τις τρέχουσες στα καταστήματα.
      </footer>
    </div>
  );
}
