// Build side of the compat chunks (src/lib/compatChunks.ts): for every builder slot, 64 files with the
// engine fields of each usable model, grouped by the builder's own `slotModels` so the keys are its keys.
import type { Category, Latest } from '../types';
import { SLOTS, slotModels, type SlotListing } from './builder';
import { CHUNKS, chunkOf, chunkPath, type CompatChunk } from './compatChunks';
import { toPart, usable } from './pick';

export function compatFiles(all: Partial<Record<Category, Latest>>, builtAt: string): Record<string, CompatChunk> {
  const files: Record<string, CompatChunk> = {};
  for (const slot of SLOTS) {
    const chunks: CompatChunk[] = Array.from({ length: CHUNKS }, () => ({ v: 1, builtAt, rows: {} }));
    const listings = (all[slot as Category]?.listings ?? []) as SlotListing[typeof slot][];
    for (const m of slotModels(slot, listings)) {
      if (!usable(slot, m as never)) continue;
      chunks[chunkOf(m.key)].rows[m.key] = toPart(slot, m as never).fields;
    }
    chunks.forEach((c, n) => (files[chunkPath(slot, n)] = c));
  }
  return files;
}