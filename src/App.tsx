import { useEffect, useState } from 'react';
import type { Category } from './types';
import { CATEGORIES, CATEGORY_IDS, CPU, GPU } from './lib/categories';
import CategoryView from './components/CategoryView';
import ThemeToggle from './components/ThemeToggle';

const fromHash = (): Category => (location.hash === '#cpu' ? 'cpu' : 'gpu');

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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <header className="mb-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Icon className="h-6 w-6 text-accent" /> {cfg.title}
            </h1>
            <p className="mt-1 text-sm text-muted">{cfg.subtitle}</p>
          </div>
          <ThemeToggle />
        </div>
        <nav className="flex gap-1 border-b border-line">
          {CATEGORY_IDS.map((id) => {
            const c = CATEGORIES[id];
            const TabIcon = c.icon;
            return (
              <a
                key={id}
                href={`#${id}`}
                className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition ${
                  id === active ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg'
                }`}
              >
                <TabIcon className="h-4 w-4" /> {c.tab}
              </a>
            );
          })}
        </nav>
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

      <footer className="pt-8 text-center text-xs text-faint">
        Οι τιμές ενημερώνονται αυτόματα κάθε 6 ώρες και ενδέχεται να διαφέρουν από τις τρέχουσες στα καταστήματα.
      </footer>
    </div>
  );
}
