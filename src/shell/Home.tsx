import { Wrench } from 'lucide-react';
import { tr, useLang } from '../lib/i18n';
import { CATEGORY_LIST } from '../lib/routes';
import type { Category } from '../types';
import { LinkButton } from '../ui/Button';
import { SearchBox, type SearchSetup } from '../ui/SearchBox';
import { href } from './nav';
import { Tiles } from './pages';
import { HOME, PAGE } from './texts';

/**
 * The temporary home page (Phase 1, C7): search, the PC Builder button and the category tiles with their
 * model counts. The real home page comes in Phase 5.
 */
export function Home({ counts, search }: { counts?: Partial<Record<Category, number>>; search: SearchSetup }) {
  const lang = useLang();
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 py-4 sm:py-10">
      <div className="flex flex-col gap-3 text-center">
        <h1 className="text-display font-semibold tracking-tight">{tr(lang, PAGE.home.title)}</h1>
        <p className="mx-auto max-w-2xl text-muted">{tr(lang, PAGE.home.subtitle!)}</p>
      </div>
      <SearchBox setup={search} variant="large" />
      <div className="flex justify-center">
        <LinkButton variant="primary" icon={Wrench} href={href.builder} className="min-h-12 px-6 text-base">
          {tr(lang, HOME.buildCta)}: PC Builder
        </LinkButton>
      </div>
      <section aria-labelledby="home-cats" className="flex flex-col gap-3">
        <h2 id="home-cats" className="text-xs font-semibold uppercase tracking-wide text-faint">
          {tr(lang, HOME.categories)}
        </h2>
        <Tiles counts={counts} cats={CATEGORY_LIST} />
      </section>
    </div>
  );
}
