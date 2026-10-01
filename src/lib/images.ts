// Product photos (scraper/images.py stores them in the images repo; Vercel serves them under /img/,
// vercel.json). Which photo a model shows:
//   1. CPUs: the family photo (Wikimedia Commons, scraper/image_families.json) for its family and
//      packaging, box or tray, with a "representative photo" caption;
//   2. the model's own photo (list.json `img`, from the images repo's index at build time);
//   3. none: the category icon.

import families from '../../scraper/image_families.json';
import type { BaseListing, CpuListing } from '../types';

export interface ProductImage {
  /** Path without the size suffix: "/img/gpu/3f2a9c1b7e4d" → "-96.webp" / "-320.webp". */
  src: string;
  /** Set for a CPU family photo: the family it represents (shown as a caption). */
  family?: string;
}

interface Family {
  slug: string;
  label: string;
  packaging: 'box' | 'tray';
  match: { chip: string; socket: string | null };
  approved: boolean;
}

const FAMILIES = (families.families as Family[])
  .filter((f) => f.approved)
  .map((f) => ({
    ...f,
    chip: new RegExp(f.match.chip),
    socket: f.match.socket ? new RegExp(`^(?:${f.match.socket})$`) : null,
  }));

const TRAY = /\b(tray|mpk|oem)\b/i;
const BOX = /\b(box|boxed)\b/i;

/** Box or tray: the scraper's packaging, else the title ("Box", "Tray", "MPK", "OEM"); unknown = tray (the chip). */
export function cpuPackaging(l: CpuListing): 'box' | 'tray' {
  if (l.packaging === 'Box') return 'box';
  if (l.packaging === 'Tray') return 'tray';
  if (TRAY.test(l.title)) return 'tray';
  return BOX.test(l.title) ? 'box' : 'tray';
}

export function cpuFamilyImage(l: CpuListing): ProductImage | null {
  const pack = cpuPackaging(l);
  const f = FAMILIES.find(
    (x) => x.packaging === pack && x.chip.test(l.chip) && (!x.socket || x.socket.test(l.socket ?? '')),
  );
  return f ? { src: `/img/family/${f.slug}`, family: f.label } : null;
}

/** The photo of a model, given its cheapest listing and its stored photo path (list.json `img`). */
export function productImage(category: string, cheapest: BaseListing, stored: string | undefined): ProductImage | null {
  if (category === 'cpu') {
    const fam = cpuFamilyImage(cheapest as CpuListing);
    if (fam) return fam;
  }
  return stored ? { src: `/img/${stored}` } : null;
}

/** Approved family photos with their credits (the Image credits page). */
export const FAMILY_CREDITS = (families.families as (Family & { file: string; author: string; license: string })[])
  .filter((f) => f.approved)
  .map((f) => ({
    label: f.label,
    packaging: f.packaging,
    file: f.file,
    author: f.author,
    license: f.license,
    url: `https://commons.wikimedia.org/wiki/${encodeURI(f.file.replace(/ /g, '_'))}`,
  }));
