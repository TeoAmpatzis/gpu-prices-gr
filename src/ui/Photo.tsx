import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { ProductImage } from '../lib/images';

const PX = { sm: 40, md: 56, lg: 160 } as const;

/**
 * Product photo with fixed size (no layout shift), lazy-loaded. While it loads the tile is the neutral
 * sunken surface (not a blank white square in dark mode: UX-09); once loaded it turns white, because
 * shop photos are on white. No photo, or a failed one: the category icon.
 */
export function Photo({ image, size, icon: Icon, alt }: { image: ProductImage | null; size: keyof typeof PX; icon: LucideIcon; alt: string }) {
  const [state, setState] = useState<{ src: string; s: 'ok' | 'failed' } | null>(null);
  const px = PX[size];
  const tile = 'shrink-0 rounded-lg border border-edge';
  if (!image || (state?.src === image.src && state.s === 'failed')) {
    return (
      <span style={{ width: px, height: px }} className={`${tile} grid place-items-center bg-sunken text-faint`} aria-hidden="true">
        <Icon className={size === 'lg' ? 'h-10 w-10' : 'h-5 w-5'} />
      </span>
    );
  }
  const loaded = state?.src === image.src && state.s === 'ok';
  return (
    <img
      src={`${image.src}-${px <= 48 ? 96 : 320}.webp`}
      width={px}
      height={px}
      loading="lazy"
      decoding="async"
      alt={alt}
      onLoad={() => setState({ src: image.src, s: 'ok' })}
      onError={() => setState({ src: image.src, s: 'failed' })}
      className={`${tile} ${loaded ? 'bg-white' : 'bg-sunken'} object-contain`}
    />
  );
}
