// Small pieces shared by the builder's Guided and Quick list modes.

import { formatPrice, type Model } from '../../lib/data';
import { groupName, storageTypeLine } from '../../lib/categories';
import {
  caseBoard,
  caseCoolerMax,
  caseFanSlots,
  caseGpuMax,
  coolerHeight,
  coolerSockets,
  cpuCooler,
  cpuHasIgpu,
  cpuSocket,
  gpuLength,
  gpuPsu,
  moboForm,
  moboMemory,
  moboSlots,
  moboSocket,
  type Slot,
  type SlotListing,
} from '../../lib/builderData';
import { LABEL_TEXT, type Label, type Rating } from '../../lib/fitLabel';
import type { AnyModel } from '../../lib/builderState';
import { storedImage } from '../../lib/images';
import { psuText } from '../../lib/copyList';
import { STEP_SHORT } from '../../lib/wizard';
import { T, plural, tr, type Forms, type Lang, type Text } from '../../lib/i18n';

/** Counts on the cards, singular for 1 (#31). */
const N = {
  cores: { el: ['πυρήνας', 'πυρήνες'], en: ['core', 'cores'] },
  slots: { el: ['υποδοχή', 'υποδοχές'], en: ['slot', 'slots'] },
  fanPositions: { el: ['θέση ανεμ.', 'θέσεις ανεμ.'], en: ['fan position', 'fan positions'] },
} satisfies Record<string, Forms>;

export const S = {
  psu: { el: 'τροφ.', en: 'PSU' },
  upTo: { el: 'έως', en: 'up to' },
  withCooler: { el: 'με ψύκτρα', en: 'cooler included' },
  noCooler: { el: 'χωρίς ψύκτρα', en: 'no cooler' },
  coolerUnknown: { el: 'ψύκτρα: δεν αναφέρεται', en: 'cooler: not stated' },
  coolerShort: { el: 'ψύκτρα', en: 'cooler' },
  airflow: { el: 'για ροή αέρα', en: 'airflow type' },
  pressure: { el: 'για στατική πίεση', en: 'static pressure type' },
  dramLess: { el: 'χωρίς DRAM', en: 'DRAM-less' },
} satisfies Record<string, Text>;

// Written out in full so Tailwind keeps the classes (index.css).
const FIT_CLASS: Record<Label, string> = {
  fits: 'badge badge-fits',
  likely: 'badge badge-likely',
  unverified: 'badge badge-unverified',
  check: 'badge badge-check',
  no: 'badge badge-no',
};

/** A part's fit label against the parts already chosen, naming the other part when not "fits" (#19); nothing when there was nothing to check. */
export function FitBadge({ rating, lang }: { rating: Rating; lang: Lang }) {
  if (!rating.fit) return null;
  const why = rating.reasons.map((r) => tr(lang, r)).join(' ');
  // The other part's name sits beside the badge (the badge never wraps), so a long Greek label wraps instead of
  // sticking out at 360 px (task 14 layout audit).
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5" title={why || undefined}>
      <span className={FIT_CLASS[rating.fit]}>{tr(lang, LABEL_TEXT[rating.fit])}</span>
      {rating.fit !== 'fits' && rating.other && <span className="text-xs text-muted">· {tr(lang, STEP_SHORT[rating.other])}</span>}
    </span>
  );
}

/** One-line specs under a part's name, from the same fields the rules use. */
export function specLine(slot: Slot, m: AnyModel, lang: Lang): string {
  const t = (x: Text) => tr(lang, x);
  const mm = (v: number | null | undefined) => (v != null ? `${v} mm` : null);
  switch (slot) {
    case 'cpu': {
      const c = m as Model<SlotListing['cpu']>;
      const cooler = cpuCooler(c);
      return [
        cpuSocket(c),
        c.cheapest.cores && plural(lang, c.cheapest.cores, N.cores),
        cpuHasIgpu(c) && 'iGPU',
        c.cheapest.tdp && `TDP ${c.cheapest.tdp} W`,
        t(cooler ? S.withCooler : cooler === false ? S.noCooler : S.coolerUnknown),
      ]
        .filter(Boolean)
        .join(' · ');
    }
    case 'mobo': {
      const b = m as Model<SlotListing['mobo']>;
      // groupName: the data's Greek "Άλλο" reads "Other" in English (H5).
      const form = moboForm(b);
      return [b.cheapest.chipset, moboSocket(b), form && groupName(form, lang), moboMemory(b), plural(lang, moboSlots(b), N.slots)]
        .filter(Boolean)
        .join(' · ');
    }
    case 'ram': {
      const r = m as Model<SlotListing['ram']>;
      return r.cheapest.cas ? `CL${r.cheapest.cas} · ${r.cheapest.brand}` : r.cheapest.brand;
    }
    case 'gpu': {
      const g = m as Model<SlotListing['gpu']>;
      return [`${g.cheapest.vram}GB`, mm(gpuLength(g)), `${t(S.psu)} ≥ ${gpuPsu(g.cheapest)}W`]
        .filter(Boolean)
        .join(' · ');
    }
    case 'cooler': {
      const c = m as Model<SlotListing['cooler']>;
      const kind = c.cheapest.type === 'Air' ? groupName('Αέρα', lang) : `AIO ${c.cheapest.radiator ?? ''}mm`;
      return [
        kind,
        c.cheapest.type === 'Air' && mm(coolerHeight(c)),
        coolerSockets(c)
          .filter((x) => /^(AM[45]|LGA1[78]\d\d)$/.test(x))
          .join('/'),
      ]
        .filter(Boolean)
        .join(' · ');
    }
    case 'storage': {
      const d = (m as Model<SlotListing['storage']>).cheapest;
      return [
        storageTypeLine(d),
        d.media === 'SSD' && d.readMBs != null && `${d.readMBs} MB/s`,
        d.dram === true ? 'DRAM' : d.dram === false && t(S.dramLess),
        d.tbw != null && `${d.tbw} TBW`,
        d.capacity && `${formatPrice(d.price / (d.capacity / 1000), lang)}/TB`,
      ]
        .filter(Boolean)
        .join(' · ');
    }
    case 'case': {
      const c = m as Model<SlotListing['case']>;
      const gpu = caseGpuMax(c);
      const cooler = caseCoolerMax(c);
      const fans = caseFanSlots(c);
      return [
        groupName(c.cheapest.size, lang),
        caseBoard(c) && `${t(S.upTo)} ${caseBoard(c)}`,
        gpu != null && `GPU ≤ ${gpu} mm`,
        cooler != null && `${t(S.coolerShort)} ≤ ${cooler} mm`,
        fans != null && plural(lang, fans, N.fanPositions),
      ]
        .filter(Boolean)
        .join(' · ');
    }
    case 'fan': {
      const f = m as Model<SlotListing['fan']>;
      const { size, pack, connector, pwm, rgb, airflowCfm, pressureMm, fanType } = f.cheapest;
      return [
        `${size} mm × ${pack}`,
        connector ?? (pwm && 'PWM'),
        fanType && t(fanType === 'airflow' ? S.airflow : S.pressure),
        airflowCfm != null && `${airflowCfm} CFM`,
        pressureMm != null && `${pressureMm} mmH₂O`,
        rgb && 'RGB',
      ]
        .filter(Boolean)
        .join(' · ');
    }
    case 'psu':
      // The picker card's text (task 12 review #4): the name above it is the maker + model.
      return psuText((m as Model<SlotListing['psu']>).cheapest, lang);
  }
}

/** A builder part's photo: the builder step files' rows carry the stored photo (`img`). */
export const partImage = (m: AnyModel) => storedImage(m.cheapest.img);

/** "212,00 € incl. shipping" next to a builder price: the stored total of the row's own offer, only when known (task 7). */
export function ShipNote({ m, lang }: { m: AnyModel; lang: Lang }) {
  const { ship, total, price } = m.cheapest;
  if (ship == null) return null;
  return (
    <span className="text-xs tabular-nums text-muted">
      {formatPrice(total ?? price + ship, lang)} {tr(lang, T.withShipping)}
    </span>
  );
}
