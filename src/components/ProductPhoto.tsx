import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { ProductImage } from '../lib/images';

/** Display size in CSS pixels; 96px files for small ones (2× on sharp screens), 320px for the rest. */
const PX = { sm: 40, md: 56, lg: 160 } as const;

/**
 * A product photo with fixed dimensions (no layout shift), lazy-loaded, on a white rounded tile (shop
 * photos are on white) — neutral while it loads, so the dark page shows no blank white squares (UX-09). No photo, or one that fails to load: the category icon.
 * `hideOnPhone`: not shown below 640px (tight lists such as the builder's picker).
 */
export default function ProductPhoto({
  image,
  size,
  icon: Icon,
  alt,
  hideOnPhone = false,
  hint,
  caption,
  eager = false,
}: {
  image: ProductImage | null;
  size: keyof typeof PX;
  icon: LucideIcon;
  alt: string;
  hideOnPhone?: boolean;
  /** Tooltip, e.g. "example photo" when the model has products from several makers. */
  hint?: string;
  /** Short visible text on the tile's bottom edge (does not change the tile's size). */
  caption?: string;
  /** The page's main photo (product page header, its LCP element): loaded at once with high priority. Lists stay lazy. */
  eager?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  const px = PX[size];
  const tile = 'shrink-0 rounded-lg ring-1 ring-edge';
  if (!image || failed === image.src) {
    return (
      <span
        style={{ width: px, height: px }}
        className={`${tile} ${hideOnPhone ? 'hidden sm:grid' : 'grid'} place-items-center bg-sunken text-faint`}
        aria-hidden="true"
      >
        <Icon className={size === 'lg' ? 'h-10 w-10' : 'h-5 w-5'} />
      </span>
    );
  }
  const photo = (
    <img
      src={`${image.src}-${px <= 48 ? 96 : 320}.webp`}
      width={px}
      height={px}
      loading={eager ? 'eager' : 'lazy'}
      // React 18 passes the lowercase attribute through (its camelCase `fetchPriority` arrives in React 19).
      {...(eager ? { fetchpriority: 'high' } : {})}
      decoding={eager ? 'auto' : 'async'}
      alt={alt}
      title={hint}
      onLoad={() => setLoaded(image.src)}
      onError={() => setFailed(image.src)}
      className={`${tile} ${hideOnPhone ? 'hidden sm:block' : ''} ${loaded === image.src ? 'bg-white' : 'bg-sunken'} object-contain`}
    />
  );
  if (!caption) return photo;
  return (
    <span className={`relative shrink-0 ${hideOnPhone ? 'hidden sm:block' : 'block'}`} style={{ width: px, height: px }} title={hint}>
      {photo}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate rounded-b-lg bg-black/70 px-0.5 text-center text-[9px] font-medium leading-4 text-white">{caption}</span>
    </span>
  );
}
