// Product photos: the shop's own photo of each model (scraper/images.py stores them in the images repo;
// Vercel serves them under /img/, vercel.json). The build adds each model's stored photo to list.json
// (`img`) and the builder rows; a model without one shows its category icon.

export interface ProductImage {
  /** Path without the size suffix: "/img/gpu/3f2a9c1b7e4d" → "-96.webp" / "-320.webp". */
  src: string;
}

/** A model's photo from its stored path ("<cat>/<id>"), or null for the category icon. */
export const productImage = (stored: string | null | undefined): ProductImage | null =>
  stored ? { src: `/img/${stored}` } : null;
