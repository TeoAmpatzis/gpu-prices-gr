// One selected product, one resolved offer: compatibility always reads the product, prices read this line.
import type { BaseListing, CpuListing, GpuListing, ModelEntry, PsuListing } from '../types';
import type { AnyModel } from './builderState';
import type { Line } from './buildStore';
import { psuGroupKey, slotModels, type Slot } from './builderData';
import { modelSlug, nameSlug } from './slug';
import { ownTotal } from './data';
import { resolveOfferChoice } from './productSelection';

export interface ResolvedLine {
  line: Line;
  model: AnyModel;
  quantity: number;
  offer: BaseListing;
  total: number;
  requestedOffer?: string;
  status: 'default' | 'pending' | 'failed' | 'chosen' | 'missing';
}

/** Builder keys differ from category keys for CPU versions, GPU cards and PSU products. */
export function offerSlug(slot: Slot, m: AnyModel): string {
  if (slot === 'cpu') return nameSlug(m.cheapest.chip);
  if (slot === 'gpu') return nameSlug(`${m.cheapest.chip} ${(m.cheapest as GpuListing).vram}GB`);
  if (slot === 'psu') return nameSlug(psuGroupKey(m.cheapest as PsuListing));
  return modelSlug(slot, m);
}

/** ModelEntry.parts proves this product belongs to the category chunk; never select another variant's offer. */
export function offersFor(slot: Slot, m: AnyModel, entry: ModelEntry | null): BaseListing[] {
  if (!entry?.parts || !Object.prototype.hasOwnProperty.call(entry.parts, m.key)) return [];
  if (slot === 'gpu') {
    const ids = new Set([m.cheapest.id, ...((m.cheapest as GpuListing).twins?.split(',') ?? [])]);
    return entry.listings.filter((l) => ids.has(l.id));
  }
  if (slot === 'cpu') return entry.listings.filter((l) => `${l.chip}|${(l as CpuListing).coolerIncluded ?? '?'}` === m.key);
  if (slot === 'psu') return slotModels('psu', entry.listings as PsuListing[]).find((p) => p.key === m.key)?.listings ?? [];
  return entry.listings;
}

/** Undefined offers means not loaded (or `failed` to load); [] means loaded and absent. Missing selections keep their evidence. */
export function resolveLine(line: Line, model: AnyModel, quantity: number, requestedOffer?: string, offers?: BaseListing[], failed = false): ResolvedLine {
  const selected = requestedOffer && offers ? resolveOfferChoice(offers, requestedOffer) : undefined;
  const raw = selected ?? model.cheapest;
  const own = selected ? ownTotal(selected) : null;
  const offer = selected ? { ...raw, merchant: own?.merchant, ship: own?.shipping ?? null, total: own?.total ?? undefined } : requestedOffer ? { ...raw, url: '' } : raw;
  return { line, model, quantity, offer, total: Math.round(offer.price * quantity * 100) / 100,
    requestedOffer, status: !requestedOffer ? 'default' : selected ? 'chosen' : offers === undefined ? (failed ? 'failed' : 'pending') : 'missing' };
}
