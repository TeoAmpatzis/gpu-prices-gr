import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// v2 component catalogue (/_preview): development builds only. `import.meta.env.DEV` is false in
// production, so the bundler drops this branch and the catalogue's chunk is never built.
const Preview = import.meta.env.DEV && location.pathname === '/_preview' ? lazy(() => import('./preview/Preview')) : null;

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
