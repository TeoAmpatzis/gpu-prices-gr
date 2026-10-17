// A category page (loaded on demand, so the home page, the builder and the text pages don't download the
// list code). Exports prefetch for the shell's link-intent preloading. Model pages: components/product/ModelPage.
import CategoryView from '../components/CategoryView';
import { CATEGORIES, type CategoryConfig } from '../lib/categories';
import { prefetch } from '../lib/data';
import type { BaseListing, Category } from '../types';

export { prefetch };

/** The list part of a category page; its title is the shell's (App), so it paints before this code arrives. */
export default function CategoryPage({ cat }: { cat: Category }) {
  return <CategoryView cfg={CATEGORIES[cat] as unknown as CategoryConfig<BaseListing>} />;
}
