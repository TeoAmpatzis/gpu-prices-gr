import { Minus, Plus } from 'lucide-react';
import type { FanListing } from '../../types';
import type { BuilderState } from '../../lib/builderState';
import { MAX_FAN_QTY } from '../../lib/buildStore';
import { fanPlan, fanShortfall } from '../../lib/fanPlan';
import { tr, type Lang, type Text } from '../../lib/i18n';
import { BUILDER as B } from '../../ui/builderStrings';
import { FanAdviceBox } from './FanAdvice';

export default function FanPlanPanel({ state, lang }: { state: BuilderState; lang: Lang }) {
  const plan = fanPlan(state.build, state.psuWatts);
  const fan = state.build.fan?.cheapest as FanListing | undefined;
  const short = fan && fanShortfall(plan, fan.pack, state.fanQty);
  return <div data-fan-plan><FanAdviceBox build={state.build} watts={state.psuWatts} step="fan" lang={lang} />
    {fan && <FanQty state={state} lang={lang} />}
    {short ? <p className="notice-warn p-2 text-sm" data-fan-shortfall>{tr(lang, B.fewerFans)}</p> : null}
  </div>;
}

/** The chosen fan product's quantity in packs (1–12). */
export function FanQty({ state, lang }: { state: BuilderState; lang: Lang }) {
  const t = (x: Text) => tr(lang, x);
  const { fanQty, setFanQty } = state;
  const btn = 'tap-square grid place-items-center rounded-lg p-1.5 text-muted edge hover:bg-hover hover:text-fg disabled:opacity-40 dark:ring-0';
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted">{t(B.quantity)}</span>
      <button type="button" aria-label={t(B.fewer)} disabled={fanQty <= 1} onClick={() => setFanQty(fanQty - 1)} className={btn}>
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">
        {fanQty}
      </span>
      <button type="button" aria-label={t(B.morePacks)} disabled={fanQty >= MAX_FAN_QTY} onClick={() => setFanQty(fanQty + 1)} className={btn}>
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

