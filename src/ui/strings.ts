// Text of the v2 design system and site shell, Greek and English (docs/phase1/glossary.md decides the
// words). Category names live in src/shell/nav.ts.
import type { Lang } from '../lib/i18n';

/** No-break space: a number never wraps away from its unit or word. */
export const NBSP = String.fromCharCode(0xa0);

export const UI = {
  // Compatibility (glossary): colour + icon + word
  compatError: { el: 'Ασύμβατο', en: 'Incompatible' },
  compatWarning: { el: 'Θέλει προσοχή', en: 'Needs attention' },
  compatLikely: { el: 'Πιθανότατα χωράει', en: 'Likely fits' },
  compatUnverified: { el: 'Δεν επιβεβαιώθηκε', en: 'Not verified' },
  compatPass: { el: 'Συμβατό', en: 'Compatible' },
  compatFits: { el: 'Χωράει', en: 'Fits' },

  // Price cell
  via: { el: 'μέσω', en: 'via' },
  shippingPlus: { el: 'μεταφορικά', en: 'shipping' },
  freeShipping: { el: 'Δωρεάν μεταφορικά', en: 'Free shipping' },
  noShipping: { el: 'Μεταφορικά: άγνωστα', en: 'Shipping: unknown' },
  total: { el: 'σύνολο', en: 'total' },
  checked: { el: 'Ελέγχθηκε', en: 'Checked' },
  stale: { el: 'μπορεί να έχει αλλάξει', en: 'may have changed' },
  in7days: { el: `σε${NBSP}7${NBSP}ημέρες`, en: `in${NBSP}7${NBSP}days` },
  steady7days: { el: 'Ίδια τιμή εδώ και 7 ημέρες', en: 'Same price for 7 days' },
  unusualLow: { el: 'Ασυνήθιστα χαμηλή, έλεγξε το κατάστημα', en: 'Unusually low, check the shop' },
  inStock: { el: 'Άμεσα διαθέσιμο', en: 'In stock' },

  unknown: { el: "άγνωστο", en: "unknown" },
  photoOf: { el: "Φωτογραφία:", en: "Photo:" },

  // Filters
  showMore: { el: 'Περισσότερα', en: 'Show more' },
  showLess: { el: 'Λιγότερα', en: 'Show less' },
  searchIn: { el: 'Αναζήτηση σε', en: 'Search in' },
  searchShort: { el: 'Αναζήτηση…', en: 'Search…' },
  noOptions: { el: 'Καμία επιλογή', en: 'No options' },
  min: { el: 'Από', en: 'Min' },
  max: { el: 'Έως', en: 'Max' },
  rangeInvalid: { el: 'Το «Από» είναι μεγαλύτερο από το «Έως».', en: '"Min" is higher than "Max".' },
  showMissing: { el: 'Εμφάνιση χωρίς στοιχεία', en: 'Show items without data' },
  knownFor: { el: 'γνωστό για', en: 'known for' },
  removeFilter: { el: 'Αφαίρεση φίλτρου', en: 'Remove filter' },
  clearFilters: { el: 'Καθαρισμός φίλτρων', en: 'Clear filters' },

  // Tables, lists
  sortAsc: { el: 'αύξουσα', en: 'ascending' },
  sortDesc: { el: 'φθίνουσα', en: 'descending' },
  sortBy: { el: 'Ταξινόμηση κατά', en: 'Sort by' },
  offers: { el: 'Προσφορές τιμής', en: 'Offers' },
  model: { el: 'Μοντέλο', en: 'Model' },
  price: { el: 'Τιμή', en: 'Price' },
  change: { el: 'Αλλαγή', en: 'Change' },
  remove: { el: 'Αφαίρεση', en: 'Remove' },
  choose: { el: 'Επιλογή', en: 'Choose' },
  offerForms: { el: ['προσφορά τιμής', 'προσφορές τιμής'], en: ['offer', 'offers'] } as { el: [string, string]; en: [string, string] },
  sourceForms: { el: ['πηγή', 'πηγές'], en: ['source', 'sources'] } as { el: [string, string]; en: [string, string] },
  partForms: { el: ['εξάρτημα', 'εξαρτήματα'], en: ['part', 'parts'] } as { el: [string, string]; en: [string, string] },
  less: { el: 'Μείωση ποσότητας', en: 'Decrease quantity' },
  more: { el: 'Αύξηση ποσότητας', en: 'Increase quantity' },
  quantity: { el: 'Ποσότητα', en: 'Quantity' },
  noLongerSold: { el: 'Δεν πωλείται πλέον', en: 'No longer sold' },

  // Pagination
  pages: { el: 'Σελίδες αποτελεσμάτων', en: 'Result pages' },
  page: { el: 'Σελίδα', en: 'Page' },
  of: { el: 'από', en: 'of' },
  prev: { el: 'Προηγούμενη σελίδα', en: 'Previous page' },
  next: { el: 'Επόμενη σελίδα', en: 'Next page' },
  perPage: { el: 'Ανά σελίδα', en: 'Per page' },

  // Overlays, states
  close: { el: 'Κλείσιμο', en: 'Close' },
  cancel: { el: 'Άκυρο', en: 'Cancel' },
  undo: { el: 'Αναίρεση', en: 'Undo' },
  retry: { el: 'Δοκιμή ξανά', en: 'Try again' },
  details: { el: 'Τεχνικές λεπτομέρειες', en: 'Technical details' },
  loadErrorTitle: { el: 'Δεν φόρτωσαν οι τιμές', en: "The prices didn't load" },
  loadErrorText: {
    el: 'Έλεγξε τη σύνδεσή σου και δοκίμασε ξανά. Αν συνεχίζει, ενημέρωσέ μας.',
    en: 'Check your connection and try again. If it keeps happening, let us know.',
  },
  emptyTitle: { el: 'Κανένα αποτέλεσμα', en: 'No results' },
  emptyText: { el: 'Κανένα προϊόν δεν ταιριάζει με όλα τα φίλτρα.', en: 'No product matches all the filters.' },
  notFoundTitle: { el: 'Η σελίδα δεν βρέθηκε', en: 'Page not found' },
  notFoundText: {
    el: 'Ο σύνδεσμος μπορεί να είναι παλιός ή λάθος. Ψάξε ένα προϊόν ή διάλεξε κατηγορία.',
    en: 'The link may be old or wrong. Search for a product or pick a category.',
  },
  home: { el: 'Αρχική', en: 'Home' },
  breadcrumb: { el: 'Διαδρομή', en: 'Breadcrumb' },
  loading: { el: 'Φόρτωση…', en: 'Loading…' },

  // Status line (sources, not shops: UX-04)
  sources: { el: 'Πηγές', en: 'Sources' },
  updatedAgo: { el: 'ενημέρωση', en: 'updated' },
  olderThan24: { el: 'παλαιότερη από 24 ώρες', en: 'older than 24 hours' },

  // Search
  search: { el: 'Αναζήτηση', en: 'Search' },
  searchPlaceholder: { el: 'π.χ. RTX 5070, 990 Pro', en: 'e.g. RTX 5070, 990 Pro' },
  searchLabel: { el: 'Αναζήτηση σε όλα τα εξαρτήματα', en: 'Search all parts' },
  searchLoading: { el: 'Φόρτωση αναζήτησης…', en: 'Loading search…' },
  clearSearch: { el: 'Καθαρισμός αναζήτησης', en: 'Clear search' },
  searchNone: { el: 'Κανένα αποτέλεσμα για', en: 'No results for' },
  seeAllIn: { el: 'Όλα τα αποτελέσματα σε', en: 'All results in' },
  categories: { el: 'Κατηγορίες', en: 'Categories' },
  maker: { el: 'Κατασκευαστής', en: 'Maker' },
  from: { el: 'από', en: 'from' },

  // Shell
  skip: { el: 'Μετάβαση στο περιεχόμενο', en: 'Skip to content' },
  parts: { el: 'Εξαρτήματα', en: 'Parts' },
  builder: 'PC Builder',
  language: { el: 'Γλώσσα', en: 'Language' },
  mainMenu: { el: 'Κύριο μενού', en: 'Main menu' },
  back: { el: 'Πίσω', en: 'Back' },
  toEnglish: { el: 'Switch to English', en: 'Αλλαγή σε Ελληνικά' },
  modelForms: { el: ['μοντέλο', 'μοντέλα'], en: ['model', 'models'] } as { el: [string, string]; en: [string, string] },
  homeLink: { el: 'BuildDraft.gr, αρχική σελίδα', en: 'BuildDraft.gr, home page' },
  about: { el: 'Σχετικά', en: 'About' },
  contact: { el: 'Επικοινωνία', en: 'Contact' },
  privacy: { el: 'Απόρρητο', en: 'Privacy' },
  notAffiliated: {
    el: 'Δεν συνδέεται με τα καταστήματα ή τις πηγές τιμών.',
    en: 'Not affiliated with the shops or price sources.',
  },
} as const;

/** 1.234 in Greek, 1,234 in English. */
export const num = (lang: Lang, n: number, digits = 0) =>
  n.toLocaleString(lang === 'el' ? 'el-GR' : 'en-IE', { maximumFractionDigits: digits });

/** "1 εξάρτημα" / "3 εξαρτήματα" — the right form for n in each language (UX-47). */
export function plural(lang: Lang, n: number, forms: { el: [string, string]; en: [string, string] }): string {
  const rule = new Intl.PluralRules(lang === 'el' ? 'el' : 'en').select(n);
  const [one, other] = forms[lang];
  return `${num(lang, n)}${NBSP}${rule === 'one' ? one : other}`;
}
