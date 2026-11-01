// The PC builder's data files (step 5 task 6; written by src/lib/derive.ts builderFiles at build time):
// - /data/builder/index.json          the first screen: build date, rows per step, chip lengths, coverage;
// - /data/builder/<slot>.json         one step's parts, fetched when the step or its picker opens (the next one in
//                                     idle time, after the first paint);
// - /data/builder/<slot>-extra.json   that step's shop links and search titles, fetched when needed.
// A step's files carry `?v=<builtAt>` of the index, so a deploy in between can't mix two builds.

import type { BuilderExtraFile, BuilderSlotFile } from '../types';
import { fromColumns } from './columns';
import { slotModels, type Slot, type SlotListing } from './builderData';
import type { Model } from './data';
import { getJsonRetry, memo } from './builderIndex';

export { INDEX_URL, loadIndex } from './builderIndex';
export const slotUrl = (slot: Slot, builtAt: string) => `/data/builder/${slot}.json?v=${builtAt}`;
export const extraUrl = (slot: Slot, builtAt: string) => `/data/builder/${slot}-extra.json?v=${builtAt}`;

type SlotModels = { [S in Slot]: Model<SlotListing[S]>[] };
const slots = memo((k: string) => {
  const [slot, builtAt] = k.split('\n') as [Slot, string];
  return getJsonRetry<BuilderSlotFile>(slotUrl(slot, builtAt)).then((f) => slotModels(slot, fromColumns<SlotListing[typeof slot]>(f)));
});
/** One step's parts, grouped as the builder offers them; memoised per build, one retry, a failure is not kept. */
export const loadSlot = <S extends Slot>(slot: S, builtAt: string): Promise<SlotModels[S]> =>
  slots(`${slot}\n${builtAt}`) as Promise<SlotModels[S]>;

const extras = memo((k: string) => {
  const [slot, builtAt] = k.split('\n') as [Slot, string];
  return getJsonRetry<BuilderExtraFile>(extraUrl(slot, builtAt));
});
/** One step's shop links and search titles (by row id). */
export const loadExtra = (slot: Slot, builtAt: string): Promise<BuilderExtraFile> => extras(`${slot}\n${builtAt}`);

/** Starts loading a step's parts in idle time (call it after the first paint); a failure is left for loadSlot. */
export function prefetchSlot(slot: Slot, builtAt: string): void {
  const run = () => void loadSlot(slot, builtAt).catch(() => {});
  const idle = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (idle) idle(run, { timeout: 2000 });
  else setTimeout(run, 200);
}
