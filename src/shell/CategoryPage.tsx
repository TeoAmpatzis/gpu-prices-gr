// A category page and the temporary model address (loaded on demand, so the home page, the builder and
// the text pages don't download the list code). Exports prefetch for the shell's link-intent preloading.
import { useEffect, useState, type ReactNode } from 'react';
import CategoryView from '../components/CategoryView';
import { CATEGORIES, type CategoryConfig } from '../lib/categories';
import { groupModels, loadData, prefetch } from '../lib/data';
import { navigate } from '../lib/router';
import { modelSlug } from '../lib/slug';
import type { BaseListing, Category } from '../types';
import { SkeletonRows } from '../ui/states';

export { prefetch };

/** The list part of a category page; its title is the shell's (App), so it paints before this code arrives. */
export default function CategoryPage({ cat }: { cat: Category }) {
  return <CategoryView cfg={CATEGORIES[cat] as unknown as CategoryConfig<BaseListing>} />;
}

/**
 * "/gpu/rtx-5070-12gb": model pages arrive in Phase 3. Until then the address opens the category searched
 * for that model (plan A2.3, temporary); an unknown slug shows the 404 page.
 */
export function ModelRedirect({ cat, slug, notFound }: { cat: Category; slug: string; notFound: ReactNode }) {
  const [missing, setMissing] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    loadData(cat).then((d) => {
      if (!live) return;
      const m = groupModels(d.latest.listings, CATEGORIES[cat] as unknown as CategoryConfig<BaseListing>).find((x) => modelSlug(cat, x) === slug);
      if (m) navigate(`/${cat}?q=${encodeURIComponent(m.chip)}`, { replace: true });
      else setMissing(slug);
    });
    return () => {
      live = false;
    };
  }, [cat, slug]);
  return missing === slug ? <>{notFound}</> : <SkeletonRows />;
}
