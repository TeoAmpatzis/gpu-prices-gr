// Per-page <title>, description and canonical address (SEO phase 1), and a model page's Product JSON-LD (phase 2).
import { CAT_PAGE, PAGE } from '../shell/texts';
import { matchRoute } from './routes';
import { tr, type Lang } from './text';

export const SITE = 'https://gpu-prices-gr.vercel.app';
const SITE_DESC: Record<Lang, string> = {
  el: 'Σύγκριση τιμών για κάρτες γραφικών, επεξεργαστές, μητρικές, μνήμες RAM, SSD, τροφοδοτικά, κουτιά και ψύξη από Skroutz, BestPrice, Shopflix, Snif και e-shop.gr, με ιστορικό τιμών και συναρμολόγηση PC.',
  en: 'Price comparison for graphics cards, processors, motherboards, RAM, SSDs, power supplies, cases and cooling from Skroutz, BestPrice, Shopflix, Snif and e-shop.gr, with price history and a PC builder.',
};

export type ModelMeta = { name: string; low: number; high?: number; shops: number };
export type Meta = { title: string; description: string; canonical: string };

const eur = (n: number, lang: Lang) => n.toLocaleString(lang === 'el' ? 'el-GR' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Title, description and canonical of the page at `path` (query and hash ignored); `data` names a model page's model. */
export function pageMeta(path: string, lang: Lang, data?: ModelMeta): Meta {
  const pathname = path.split(/[?#]/)[0];
  const route = matchRoute(pathname);
  const canonical = SITE + (pathname.replace(/\/+$/, '') || '/');
  if (route.kind === 'model' && data) {
    const shops = lang === 'el' ? `${data.shops} ${data.shops === 1 ? 'κατάστημα' : 'καταστήματα'}` : `${data.shops} ${data.shops === 1 ? 'shop' : 'shops'}`;
    return {
      title: `${data.name} — BuildDraft.gr`,
      description:
        lang === 'el'
          ? `${data.name}: χαμηλότερη τιμή ${eur(data.low, lang)} € σε ${shops}. Ιστορικό τιμών και σύγκριση στο BuildDraft.gr.`
          : `${data.name}: lowest price €${eur(data.low, lang)} across ${shops}. Price history and comparison on BuildDraft.gr.`,
      canonical,
    };
  }
  const page = route.kind === 'category' || route.kind === 'model' ? CAT_PAGE[route.cat] : route.kind === 'info' ? PAGE[route.page] : PAGE[route.kind];
  const title = tr(lang, page.title);
  return {
    title: route.kind === 'home' ? `BuildDraft.gr — ${title}` : `${title} — BuildDraft.gr`,
    description: page.subtitle && route.kind !== 'home' ? tr(lang, page.subtitle) : SITE_DESC[lang],
    canonical,
  };
}

/** schema.org Product with an AggregateOffer for a model page. */
export function productJsonLd(meta: Meta, data: ModelMeta, image?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: data.name,
    url: meta.canonical,
    ...(image ? { image } : {}),
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      lowPrice: data.low,
      highPrice: data.high ?? data.low,
      offerCount: data.shops,
    },
  };
}

function setHead(selector: string, make: () => HTMLElement, attr: string, value: string) {
  const el = document.head.querySelector<HTMLElement>(selector) ?? document.head.appendChild(make());
  el.setAttribute(attr, value);
}

/** Writes the meta into the document head; `ld` (a model page) adds the JSON-LD script, anything else removes it; `noindex` marks a gone product. */
export function applyMeta(meta: Meta, ld?: object, noindex = false) {
  document.title = meta.title;
  // A product that is no longer sold answers HTTP 200 on static hosting: tell crawlers not to keep the address.
  document.head.querySelector('meta[name="robots"]')?.remove();
  if (noindex) document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex' }));
  setHead('meta[name="description"]', () => Object.assign(document.createElement('meta'), { name: 'description' }), 'content', meta.description);
  setHead('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), 'href', meta.canonical);
  document.head.querySelector('script[data-jsonld]')?.remove();
  if (ld) {
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.dataset.jsonld = '';
    s.textContent = JSON.stringify(ld).replace(/</g, '\u003c');
    document.head.appendChild(s);
  }
}
