import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { ProductImage } from '../lib/images';

/** Display size in CSS pixels; 96px files for small ones (2× on sharp screens), 320px for the rest. */
const PX = { sm: 40, md: 56, lg: 160 } as const;

/**
 * A product photo with fixed dimensions (no layout shift), lazy-loaded, on a white rounded tile (shop
 * photos are on white, in both themes). No photo, or one that fails to load: the category icon.
 */
export default function ProductPhoto({
  image,
  size,
  icon: Icon,
  alt,
}: {
  image: ProductImage | null;
  size: keyof typeof PX;
  icon: LucideIcon;
  alt: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const px = PX[size];
  const tile = 'shrink-0 rounded-lg ring-1 ring-edge';
  if (!image || failed === image.src) {
    return (
      <span style={{ width: px, height: px }} className={`${tile} grid place-items-center bg-sunken text-faint`} aria-hidden="true">
        <Icon className={size === 'lg' ? 'h-10 w-10' : 'h-5 w-5'} />
      </span>
    );
  }
  return (
    <img
      src={`${image.src}-${px <= 48 ? 96 : 320}.webp`}
      width={px}
      height={px}
      loading="lazy"
      decoding="async"
      alt={alt}
      onError={() => setFailed(image.src)}
      className={`${tile} bg-white object-contain`}
    />
  );
}
