import { useSyncExternalStore } from 'react';

export type Lang = 'el' | 'en';
/** UI text in both languages; a plain string is the same in both (model names, units…). */
export type Text = string | { el: string; en: string };

const KEY = 'lang'; // also read by the inline script in index.html
const listeners = new Set<() => void>();

export const tr = (lang: Lang, t: Text) => (typeof t === 'string' ? t : t[lang]);

/** The inline script in index.html sets <html lang> before first paint (stored choice, else browser). */
export const getLang = (): Lang => (document.documentElement.lang === 'en' ? 'en' : 'el');

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* private mode: the choice just won't persist */
  }
  document.documentElement.lang = lang;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export const useLang = () => useSyncExternalStore(subscribe, getLang);

/** Shared strings used by more than one component. */
export const T = {
  siteName: 'BuildDraft.gr',
  homeLabel: { el: 'BuildDraft.gr — αρχική σελίδα', en: 'BuildDraft.gr — home page' },
  siteTagline: { el: 'Skroutz · BestPrice · Shopflix · Snif · e-shop.gr', en: 'Skroutz · BestPrice · Shopflix · Snif · e-shop.gr' },
  notAffiliated: {
    el: 'Δεν συνδέεται με τα Skroutz, BestPrice, Shopflix, Snif και e-shop.gr. Τα εμπορικά σήματα ανήκουν στους κατόχους τους.',
    en: 'Not affiliated with Skroutz, BestPrice, Shopflix, Snif or e-shop.gr. Trademarks belong to their owners.',
  },
  footer: {
    el: 'Οι τιμές ενημερώνονται αυτόματα κάθε 6 ώρες και ενδέχεται να διαφέρουν από τις τρέχουσες στα καταστήματα.',
    en: 'Prices update automatically every 6 hours and may differ from current prices in the shops.',
  },
  all: { el: 'Όλα', en: 'All' },
  models: { el: 'μοντέλα', en: 'models' },
  loading: { el: 'Φόρτωση…', en: 'Loading…' },
  loadError: { el: 'Αποτυχία φόρτωσης δεδομένων', en: 'Failed to load data' },
  staleSource: {
    el: 'Η τελευταία ενημέρωση απέτυχε — εμφανίζονται παλαιότερα δεδομένα',
    en: 'The last update failed — showing older data',
  },
  colModel: { el: 'Μοντέλο', en: 'Model' },
  colCheapest: { el: 'Φθηνότερη', en: 'Cheapest' },
  colRange: { el: 'Εύρος', en: 'Range' },
  colOffers: { el: 'Προϊόντα', en: 'Listings' },
  upTo: { el: 'έως', en: 'up to' },
  weekChange: { el: 'Μεταβολή 7 ημερών', en: '7-day change' },
  shops: { el: 'καταστ.', en: 'shops' },
  withShipping: { el: 'με μεταφορικά', en: 'incl. shipping' },
  shipping: { el: 'μεταφορικά', en: 'shipping' },
  freeShipping: { el: 'δωρεάν μεταφορικά', en: 'free shipping' },
  dailyLow: { el: 'Χαμηλότερη τιμή ανά ημέρα', en: 'Lowest price per day' },
  lowest: { el: 'Χαμηλότερη', en: 'Lowest' },
  noHistory: {
    el: 'Το ιστορικό τιμών θα εμφανιστεί μετά από λίγες μέρες συλλογής δεδομένων.',
    en: 'Price history will appear after a few days of data collection.',
  },
  reset: { el: 'Επαναφορά', en: 'Reset' },
  resetTitle: { el: 'Επαναφορά φίλτρων', en: 'Reset filters' },
  segment: { el: 'Κατηγορία', en: 'Category' },
  source: { el: 'Πηγή', en: 'Source' },
  specsPrice: { el: 'Προδιαγραφές & τιμή', en: 'Specs & price' },
  filters: { el: 'Φίλτρα', en: 'Filters' },
  any: { el: 'Όλα', en: 'Any' },
  yes: { el: 'Ναι', en: 'Yes' },
  no: { el: 'Όχι', en: 'No' },
  maxPrice: { el: 'Έως', en: 'Max' },
  maxPriceLabel: { el: 'Μέγιστη τιμή', en: 'Maximum price' },
  sortModel: { el: 'Προτεινόμενα', en: 'Recommended' },
  sortPriceAsc: { el: 'Τιμή: χαμηλή → υψηλή', en: 'Price: low → high' },
  sortPriceDesc: { el: 'Τιμή: υψηλή → χαμηλή', en: 'Price: high → low' },
  sortOffers: { el: 'Περισσότερα προϊόντα', en: 'Most listings' },
  sortDiscount: { el: 'Μεγαλύτερη έκπτωση', en: 'Biggest discount' },
  sales: { el: 'Προσφορές', en: 'Sales' },
  saleOnly: { el: 'Μόνο προσφορές', en: 'On sale only' },
  saleBy: { el: 'Προσφορά σύμφωνα με', en: 'On sale according to' },
  lowOnly: { el: 'Ιστορικά χαμηλά', en: 'All-time lows' },
  allTimeLow: { el: 'Ιστορικό χαμηλό', en: 'All-time low' },
  allTimeLowHint: { el: 'Η χαμηλότερη τιμή του από', en: 'Its lowest price since' },
  darkTheme: { el: 'Σκούρο θέμα', en: 'Dark theme' },
  lightTheme: { el: 'Φωτεινό θέμα', en: 'Light theme' },
  switchLang: { el: 'Switch to English', en: 'Αλλαγή σε Ελληνικά' },
} satisfies Record<string, Text>;
