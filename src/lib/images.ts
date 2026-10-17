// Product photos: the shop's own photo of each model (scraper/images.py stores them in the images repo;
// Vercel serves them under /img/, vercel.json). The build tells list.json which models have one (`photos`, a
// bitset over the file's model keys, src/lib/columns.ts decodePhotos); the photo's id is derived from the
// category and model key, so the file doesn't carry it. A model without a photo shows its category icon.

import { sha1Hex } from './sha1';

export interface ProductImage {
  /** Path without the size suffix: "/img/gpu/3f2a9c1b7e4d" → "-96.webp" / "-320.webp". */
  src: string;
}

/** Same id as scraper/images.py model_id(): first 12 hex digits of sha1("<cat>\0<model key>"). */
export const photoId = (cat: string, key: string): string => sha1Hex(`${cat}\0${key}`).slice(0, 12);

/** A model's photo when the list says it has one (`has`), or null for the category icon. */
export const productImage = (cat: string, key: string, has: boolean): ProductImage | null =>
  has ? { src: `/img/${cat}/${photoId(cat, key)}` } : null;

/** A photo from its stored path ("<cat>/<id>"), as builder.json rows carry it; null for the category icon. */
export const storedImage = (stored: string | null | undefined): ProductImage | null => (stored ? { src: `/img/${stored}` } : null);
