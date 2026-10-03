// Small pieces shared by the builder's Guided and Quick list modes.

import { formatPrice, type Model } from '../../lib/data';
import { groupName, storageTypeLine } from '../../lib/categories';
import {
  FIT_LABEL,
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
  type Fit,
  type Rating,
  type Slot,
  type SlotListing,
} from '../../lib/builder';
import type { AnyModel } from '../../lib/builderState';
import { productImage } from '../../lib/images';
import { tr, type Lang, type Text } from '../../lib/i18n';

export const S = {
  cores: { el: 'πυρήνες', en: 'cores' },
  slots: { el: 'υποδοχές', en: 'slots' },
  psu: { el: 'τροφ.', en: 'PSU' },
  upTo: { el: 'έως', en: 'up to' },
  withCooler: { el: 'με ψύκτρα', en: 'cooler included' },
  noCooler: { el: 'χωρίς ψύκτρα', en: 'no cooler' },
  coolerUnknown: { el: 'ψύκτρα: δεν αναφέρεται', en: 'cooler: not stated' },
  coolerShort: { el: 'ψύκτρα', en: 'cooler' },
  fanPositions: { el: 'θέσεις ανεμ.', en: 'fan positions' },
  airflow: { el: 'για ροή αέρα', en: 'airflow type' },
  pressure: { el: 'για στατική πίεση', en: 'static pressure type' },
  incompatible: { el: 'Ασύμβατο', en: 'Incompatible' },
  dramLess: { el: 'χωρίς DRAM', en: 'DRAM-less' },
} satisfies Record<string, Text>;

// Written out in full so Tailwind keeps the classes (index.css).
const FIT_CLASS: Record<Fit, string> = {
  fits: 'badge badge-fits',
  likely: 'badge badge-likely',
  unverified: 'badge badge-unverified',
  no: 'badge badge-no',
};

/** A part's fit label against the parts already chosen; nothing when there was nothing to check. */
export function FitBadge({ rating, lang }: { rating: Rating; lang: Lang }) {
  if (!rating.fit) return null;
  const why = rating.reasons.map((r) => tr(lang, r)).join(' ');
  const label = rating.fit === 'no' ? S.incompatible : FIT_LABEL[rating.fit];
  return (
    <span className={FIT_CLASS[rating.fit]} title={why || undefined}>
      {tr(lang, label)}
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
        c.cheapest.cores && `${c.cheapest.cores} ${t(S.cores)}`,
        cpuHasIgpu(c) && 'iGPU',
        c.cheapest.tdp && `TDP ${c.cheapest.tdp} W`,
        t(cooler ? S.withCooler : cooler === false ? S.noCooler : S.coolerUnknown),
      ]
        .filter(Boolean)
        .join(' · ');
    }
    case 'mobo': {
      const b = m as Model<SlotListing['mobo']>;
      return [b.cheapest.chipset, moboSocket(b), moboForm(b), moboMemory(b), `${moboSlots(b)} ${t(S.slots)}`]
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
        `${t(S.upTo)} ${caseBoard(c)}`,
        gpu != null && `GPU ≤ ${gpu} mm`,
        cooler != null && `${t(S.coolerShort)} ≤ ${cooler} mm`,
        fans != null && `${fans} ${t(S.fanPositions)}`,
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
    case 'psu': {
      const p = m as Model<SlotListing['psu']>;
      return [
        p.cheapest.formFactor,
        p.cheapest.efficiency && `80+ ${p.cheapest.efficiency}`,
        p.cheapest.modular && `${p.cheapest.modular} modular`,
        p.cheapest.brand,
      ]
        .filter(Boolean)
        .join(' · ');
    }
  }
}

/** A builder part's photo: builder.json rows carry the stored photo (`img`). */
export const partImage = (m: AnyModel) => productImage(m.cheapest.img);
