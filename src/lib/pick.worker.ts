// The pick worker (v2 step 3, task 6b): runs the candidate check off the main thread. A module worker that
// Vite bundles on its own (`new Worker(new URL('./pick.worker.ts', import.meta.url), { type: 'module' })` in
// usePick.ts), requested only in pick mode.
import { answer } from './pickCheck';
import type { CheckAnswer, CheckRequest } from './pickProtocol';

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<CheckRequest>) => void) | null;
  postMessage: (a: CheckAnswer) => void;
};

scope.onmessage = (e) => scope.postMessage(answer(e.data));
