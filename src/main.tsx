import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App, { startFirstPage } from './App';
import { redirectLegacyLink } from './lib/routes';
import './index.css';

// v2 component catalogue (/_preview): development builds only. `import.meta.env.DEV` is false in
// production, so the bundler drops this branch and the catalogue's chunk is never built.
const Preview = import.meta.env.DEV && location.pathname === '/_preview' ? lazy(() => import('./preview/Preview')) : null;

// Old v1 links ("/#ram?type=ddr5", shared builds "/#builder?cpu=…") become real addresses before anything renders.
redirectLegacyLink();
if (!import.meta.env.DEV || location.pathname !== '/_preview') startFirstPage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {Preview ? (
      <Suspense fallback={null}>
        <Preview />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
