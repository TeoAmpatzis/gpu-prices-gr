import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadManifest } from '../manifest';
import { loadModel } from '../modelData';
import { resolveProductSelection } from '../productSelection';
import { productImage, type ProductImage } from '../images';
import { encodeRef, type CompareRef } from './refs';
import type { CompareItem } from './table';

/** One column of the compare page while and after it loads. */
export type ItemState =
  | { ref: CompareRef; status: 'loading' }
  | { ref: CompareRef; status: 'gone' }
  | { ref: CompareRef; status: 'error'; message: string }
  | { ref: CompareRef; status: 'ok'; item: CompareItem; title: string; family: boolean; image: ProductImage | null; href: string };

/** Thrown by modelData.requireBuild when a deploy happened between two files of one table. */
const isBuildChange = (message: string) => message.startsWith('Product data changed');

/**
 * Loads every reference against one build (the manifest's `builtAt`), so a table never mixes two deploys: a
 * build change gives `changed` (reload the page), any other failure stays on its own column with a retry.
 */
export function useCompareItems(refs: CompareRef[]) {
  const [done, setDone] = useState<Record<string, ItemState>>({});
  const [tick, setTick] = useState(0);
  const refsKey = refs.map(encodeRef).join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `refs` is rebuilt every render; its content is `refsKey`
  const list = useMemo(() => refs, [refsKey]);

  useEffect(() => {
    let live = true;
    const put = (s: ItemState) => live && setDone((d) => ({ ...d, [encodeRef(s.ref)]: s }));
    (async () => {
      let builtAt: string;
      try {
        builtAt = (await loadManifest()).builtAt;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        for (const ref of list) put({ ref, status: 'error', message });
        return;
      }
      await Promise.all(
        list.map(async (ref) => {
          try {
            const entry = await loadModel(ref.cat, ref.slug, builtAt);
            const exact = entry && ref.selection ? resolveProductSelection(entry.listings, ref.selection) : null;
            if (!entry || (ref.selection && !exact)) return put({ ref, status: 'gone' });
            const listings = exact ? [exact] : entry.listings;
            put({
              ref,
              status: 'ok',
              item: { ref, listings },
              title: exact?.title ?? entry.chip,
              family: !exact,
              image: productImage(ref.cat, entry.key, entry.photo),
              href: `/${ref.cat}/${entry.slug}${exact ? `?${new URLSearchParams({ source: exact.source, offer: exact.id })}` : ''}`,
            });
          } catch (e) {
            put({ ref, status: 'error', message: e instanceof Error ? e.message : String(e) });
          }
        }),
      );
    })();
    return () => {
      live = false;
    };
  }, [list, tick]);

  const states: ItemState[] = list.map((ref) => done[encodeRef(ref)] ?? { ref, status: 'loading' });
  const changed = states.some((s) => s.status === 'error' && isBuildChange(s.message));
  /** Forget the failed columns and load them again. */
  const retry = useCallback(() => {
    setDone((d) => Object.fromEntries(Object.entries(d).filter(([, s]) => s.status !== 'error')));
    setTick((n) => n + 1);
  }, []);
  return { states, changed, retry };
}
