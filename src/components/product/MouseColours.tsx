// A mouse's colours (mouse plan, Task 7): colours are offers of one model, not models of their own, so the choice
// narrows the shops table on the same page and address. Nothing is stored; the price history stays the model's.
import { mouseColourName } from '../../lib/categoryRules';
import { formatPrice } from '../../lib/data';
import { T, tr, useLang } from '../../lib/i18n';
import type { MouseListing } from '../../types';
import { FilterChip } from '../../ui/Chip';
import { PRODUCT } from './productStrings';

/** The stated colours of a model's offers with each one's lowest price, by colour key. */
export function mouseColours(listings: readonly MouseListing[]): { colour: string; price: number }[] {
  const low = new Map<string, number>();
  for (const l of listings) if (l.colour) low.set(l.colour, Math.min(low.get(l.colour) ?? Infinity, l.price));
  return [...low].map(([colour, price]) => ({ colour, price })).sort((a, b) => a.colour.localeCompare(b.colour));
}

/** The offers of one colour (a copy); null = every offer, the ones with no stated colour included. */
export const mouseOffers = <L extends { colour?: string | null }>(listings: readonly L[], colour: string | null): L[] =>
  colour == null ? [...listings] : listings.filter((l) => l.colour === colour);

export function MouseColours({ listings, value, onChange }: { listings: readonly MouseListing[]; value: string | null; onChange: (colour: string | null) => void }) {
  const lang = useLang();
  const colours = mouseColours(listings);
  if (colours.length < 2) return null;
  return (
    <section aria-label={tr(lang, PRODUCT.colours)} data-mouse-colours className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold tracking-tight">{tr(lang, PRODUCT.colours)}</h2>
      <div className="flex flex-wrap gap-2">
        <FilterChip pressed={value == null} onClick={() => onChange(null)}>
          {tr(lang, T.all)}
        </FilterChip>
        {colours.map((c) => (
          <FilterChip key={c.colour} pressed={value === c.colour} onClick={() => onChange(value === c.colour ? null : c.colour)}>
            {tr(lang, mouseColourName(c.colour))}
            <span className="ui-num text-xs text-muted">{formatPrice(c.price, lang)}</span>
          </FilterChip>
        ))}
      </div>
      {value != null && <p className="text-xs text-muted">{tr(lang, PRODUCT.colourNote)}</p>}
    </section>
  );
}
