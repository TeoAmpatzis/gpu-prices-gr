import type { MouseEvent } from 'react';
import { tr, useLang } from '../lib/i18n';
import { formatPrice, formatWhole } from '../lib/format';
import { dealIsFresh, type HomeFile } from '../lib/homeData';
import { Badge } from '../ui/Badge';
import { LinkButton } from '../ui/Button';
import { SOURCES } from '../lib/sources';
import { HOME_TEXT as H } from './homeTexts';

export default function HomeSections({ data, now }: { data: HomeFile; now: number }) {
  const lang = useLang();
  const t = (key: keyof typeof H) => tr(lang, H[key]);
  const deals = data.deals.filter((d) => dealIsFresh(d, now));
  // Read-only shared previews retain the saved list. Full navigation refreshes an already visited builder snapshot.
  const preview = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    window.location.assign(event.currentTarget.href);
  };
  return <>
    <section className="home-deals" aria-labelledby="home-drops">
      <div className="home-section-heading"><h2 id="home-drops">{t('drops')}</h2><span>{t('median')}</span></div>
      <div className="home-deals-panel">{deals.length ? <ul>{deals.map((d) => <li key={d.href} data-home-deal><a href={d.href}>{d.name}</a><Badge>{SOURCES[d.source].label}</Badge><span className="home-old-price ui-num">{formatPrice(d.median, lang)}</span><strong className="ui-num">{formatPrice(d.price, lang)}</strong><Badge tone="success">−{d.percent}%</Badge></li>)}</ul> : <p className="home-empty-drops">{t('noDrops')}</p>}</div>
    </section>
    <section id="home-builds" className="home-builds" aria-labelledby="home-build-title">
      <div className="home-section-heading"><h2 id="home-build-title">{t('builds')}</h2><span>{t('estimates')}</span></div>
      <div className="home-build-grid">{data.builds.map((b) => <article key={b.budget} className="home-build" data-home-build={b.budget}>
        <div className="home-build-heading"><h3 className="ui-num">{formatWhole(b.budget, lang)}</h3><span>Gaming {b.resolution === '4k' ? '4K' : b.resolution}</span></div>
        {b.available ? <><ul>{(['cpu', 'gpu', 'ram', 'storage'] as const).map((slot) => <li key={slot}>{b.labels[slot] ?? '—'}</li>)}</ul><div className="home-build-total"><span>{t('itemTotal')}</span><strong className="ui-num">{formatPrice(b.total!, lang)}</strong></div><p className="home-build-notice">{b.shipping == null ? t('shippingUnknown') : `${t('shipping')}: ${formatPrice(b.shipping, lang)}`} {t('checks')}</p><LinkButton href={b.href} onClick={preview}>{t('open')}</LinkButton></> : <><p className="text-muted">{t('unavailable')}</p><LinkButton href="/builder">{t('build')}</LinkButton></>}
      </article>)}</div>
      <p className="home-preview-note">{t('preview')}</p>
    </section>
  </>;
}
