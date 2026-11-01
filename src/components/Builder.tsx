// The PC builder page (step 5 task 11): the start screen (use and budget, src/components/builder/Start.tsx), or the
// workbench (guided steps or the part list, with the summary). The start screen is the page's first paint and carries
// no parts' code; the workbench is its own chunk, loaded on the first interaction, 5 s later, or at once when the
// address or a saved build opens it (rule 11: /builder first-paint JS).

import { Suspense, lazy, useCallback, useState } from 'react';
import { builderParams, firstView, viewParams, writeBuilderParams, type View } from '../lib/builderView';
import { readBuild } from '../lib/buildStore';
import { SkeletonCards } from '../ui/states';
import Start from './builder/Start';

const loadWorkbench = () => import('./builder/Workbench');
const Workbench = lazy(loadWorkbench);

export default function Builder() {
  const [view, setView] = useState<View>(() => firstView(builderParams(), Object.keys(readBuild().parts).length > 0));
  const go = (v: View) => {
    setView(v);
    writeBuilderParams((p) => viewParams(p, v, v === 'guided' ? 'cpu' : undefined));
    window.scrollTo({ top: 0 });
  };
  const intent = useCallback(() => void loadWorkbench().catch(() => {}), []);
  if (view === 'start') return <Start onGo={go} onIntent={intent} />;
  return (
    <Suspense fallback={<SkeletonCards cards={4} />}>
      <Workbench view={view} onView={go} />
    </Suspense>
  );
}
