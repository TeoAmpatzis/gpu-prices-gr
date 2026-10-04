// Text of the component catalogue itself (headings, captions); the components' own text is in
// src/ui/strings.ts. Greek in the "εσύ" register (docs/phase1/glossary.md).
import type { Text } from '../lib/i18n';

/** No-break space: a number never wraps away from its unit. */
const NBSP = String.fromCharCode(0xa0);
const mm = (n: number) => `${n}${NBSP}mm`;

export const P = {
  pageTitle: { el: 'Κατάλογος components', en: 'Component catalogue' },
  intro: {
    el: 'Ο εσωτερικός κατάλογος του design system: το λογότυπο, τα χρώματα και κάθε component σε κάθε κατάσταση, με πραγματικά προϊόντα και τιμές από τα σημερινά δεδομένα. Μόνο σε development.',
    en: "The design system's internal catalogue: the logo, the colours and every component in every state, with real products and prices from today's data. Development builds only.",
  },
  language: { el: 'Γλώσσα', en: 'Language' },
  loadingData: { el: 'Φόρτωση σημερινών δεδομένων…', en: "Loading today's data…" },
  sections: { el: 'Ενότητες', en: 'Sections' },

  // Identity
  sLogos: { el: 'Λογότυπο', en: 'Logo' },
  logosIntro: {
    el: 'Το wordmark (Build έντονο, Draft λεπτό, chip στη θέση της τελείας) στο χρώμα του κειμένου, και το σύμβολό του (το B με την τελεία-chip) στο χρώμα του brand για favicon και εικονίδια εφαρμογής.',
    en: 'The wordmark (Build bold, Draft light, a chip as the dot) in the text colour, and its symbol (the B with the chip dot) in the brand colour for the favicon and app icons.',
  },
  inHeader: { el: 'Wordmark: κεφαλίδα (22 px), 32 px, 48 px', en: 'Wordmark: header (22 px), 32 px, 48 px' },
  sizes: { el: 'Σύμβολο: 16, 32, 48 px', en: 'Symbol: 16, 32, 48 px' },
  symbolNote: {
    el: 'Κάτω από 20 px το σύμβολο σχεδιάζεται απλούστερο (παχύτερο B, η τελεία χωρίς ακίδες), ώστε να διαβάζεται στα 16 px.',
    en: 'Below 20 px the symbol is drawn simpler (a thicker B, the dot without pins) so it reads at 16 px.',
  },
  tab: { el: 'Favicon σε φωτεινή και σκούρα καρτέλα browser', en: 'Favicon in a light and a dark browser tab' },
  social: { el: 'Εικόνα κοινοποίησης 1200 × 630 (public/og.png)', en: 'Social image 1200 × 630 (public/og.png)' },
  outside: { el: 'Για χρήση εκτός site (README, κοινωνικά δίκτυα): public/brand/', en: 'For use outside the site (README, social profiles): public/brand/' },
  outsideNote: {
    el: 'Το wordmark σε φωτεινό και σκούρο φόντο (PNG) και το σύμβολο σε φωτεινό και σκούρο (SVG και PNG 512 px). Όλα παράγονται από τα ίδια σχήματα με το site: npx tsx scripts/brand/render.mts.',
    en: 'The wordmark on light and dark backgrounds (PNG) and the symbol on light and dark (SVG and 512 px PNG). All rendered from the same shapes as the site: npx tsx scripts/brand/render.mts.',
  },

  sColours: { el: 'Χρώματα', en: 'Colours' },
  coloursIntro: {
    el: 'Indigo, μόνο σκούρο θέμα. Το brand δεν είναι πράσινο: πράσινο, πορτοκαλί, κόκκινο και γαλάζιο σημαίνουν μόνο συμβατότητα και τιμή. Ο πίνακας αντίθεσης υπολογίζεται ζωντανά από τα tokens.',
    en: 'Indigo, dark only. The brand is not green: green, orange, red and light blue only mean compatibility and price. The contrast table is computed live from the tokens.',
  },
  brandScale: { el: 'Κλίμακα brand', en: 'Brand scale' },
  neutralScale: { el: 'Ουδέτερα', en: 'Neutrals' },
  meaning: { el: 'Χρώματα με σημασία', en: 'Meaning colours' },
  mSuccess: { el: 'Πράσινο: συμβατό, πτώση τιμής, «Χωράει»', en: 'Green: compatible, price drop, "Fits"' },
  mWarning: { el: 'Πορτοκαλί: προειδοποίηση, θέλει ενέργεια από εσένα', en: 'Orange: warning, needs action from you' },
  mDanger: { el: 'Κόκκινο: σφάλμα, άνοδος τιμής, «Δεν χωράει»', en: 'Red: error, price rise, "Doesn\'t fit"' },
  mInfo: { el: 'Γαλάζιο: σημείωση, «Πιθανότατα χωράει», «Δεν επιβεβαιώθηκε»', en: 'Light blue: note, "Likely fits", "Not verified"' },
  hueGap: { el: 'Απόσταση απόχρωσης brand ↔ γαλάζιο σημείωσης', en: 'Hue distance brand ↔ note light blue' },
  contrast: { el: 'Αντίθεση WCAG (AA: 4,5 για κείμενο, 3 για εικονίδια και πλαίσια πεδίων)', en: 'WCAG contrast (AA: 4.5 text, 3 icons and field borders)' },
  pair: { el: 'Ζεύγος', en: 'Pair' },
  use: { el: 'Χρήση', en: 'Use' },
  ratio: { el: 'Λόγος', en: 'Ratio' },
  need: { el: 'Ελάχιστο', en: 'Needs' },
  pass: { el: 'περνά', en: 'pass' },
  fail: { el: 'αποτυγχάνει', en: 'fails' },
  printNote: {
    el: 'Η εκτύπωση (λίστα ή build) βγαίνει με σκούρο κείμενο σε λευκό· οι τιμές της ελέγχονται από το tests/unit/tokens.test.ts.',
    en: 'Printing (a list or a build) comes out as dark text on white; its colours are checked by tests/unit/tokens.test.ts.',
  },

  sType: { el: 'Τυπογραφία και κίνηση', en: 'Type and motion' },
  typeIntro: {
    el: 'Inter για όλο το UI με αριθμούς ίδιου πλάτους σε τιμές και specs· JetBrains Mono μόνο για κωδικούς. Έξι μεγέθη. Κίνηση μόνο σε transform και opacity· με «λιγότερη κίνηση» όλα γίνονται αμέσως.',
    en: 'Inter for the whole UI with tabular figures in prices and specs; JetBrains Mono for codes only. Six sizes. Motion only on transform and opacity; with "reduce motion" everything is instant.',
  },
  sample: { el: 'Κάρτες γραφικών από 189,90 € — RTX 5070 12GB', en: 'Graphics cards from €189.90 — RTX 5070 12GB' },
  codes: { el: 'Κωδικοί', en: 'Codes' },
  motion: { el: 'Κίνηση', en: 'Motion' },
  play: { el: 'Αναπαραγωγή', en: 'Play' },

  // Components
  sButtons: { el: 'Κουμπιά', en: 'Buttons' },
  stDefault: { el: 'Κανονικό', en: 'Default' },
  stHover: 'Hover',
  stFocus: { el: 'Εστίαση', en: 'Focus' },
  stActive: { el: 'Πατημένο', en: 'Active' },
  stDisabled: { el: 'Ανενεργό', en: 'Disabled' },
  stLoading: { el: 'Φόρτωση', en: 'Loading' },
  vPrimary: { el: 'Κύριο', en: 'Primary' },
  vSecondary: { el: 'Δευτερεύον', en: 'Secondary' },
  vGhost: 'Ghost',
  vDanger: { el: 'Κίνδυνος', en: 'Danger' },
  btnPrimary: { el: 'Προσθήκη', en: 'Add' },
  btnSecondary: { el: 'Λεπτομέρειες', en: 'Details' },
  btnGhost: { el: 'Αντιγραφή', en: 'Copy' },
  btnDanger: { el: 'Καθαρισμός', en: 'Clear' },
  smallAndIcon: { el: 'Μικρό και μόνο εικονίδιο', en: 'Small and icon-only' },

  sChips: { el: 'Chips φίλτρων', en: 'Filter chips' },
  chipsIntro: {
    el: 'Επιλογή = πατημένο (με ✓). Με 0 αποτελέσματα: ανενεργό, εκτός αν είναι ήδη επιλεγμένο. Τα ενεργά φίλτρα πάνω από τη λίστα κυλούν οριζόντια στο κινητό· το «×» τα αφαιρεί.',
    en: 'Selected = pressed (with ✓). With 0 results: disabled, unless already selected. Applied filters above the list scroll sideways on phones; "×" removes them.',
  },
  applied: { el: 'Ενεργά φίλτρα', en: 'Applied filters' },
  upTo900: { el: `Έως 900${NBSP}€`, en: 'Up to €900' },
  saleOnly: { el: 'Μόνο προσφορές', en: 'On sale only' },

  sCompat: { el: 'Συμβατότητα', en: 'Compatibility' },
  compatIntro: {
    el: 'Χρώμα, εικονίδιο και λέξη μαζί, ώστε να διαβάζεται και χωρίς χρώμα. Ο λόγος φαίνεται πάντα ως κείμενο. Τα ζεύγη είναι πραγματικά προϊόντα και ο λόγος βγαίνει από τα στοιχεία τους· οι πλήρεις κανόνες έρχονται στη Φάση 2.',
    en: 'Colour, icon and word together, so it reads without colour too. The reason is always visible text. The pairs are real products and the reason comes from their data; the full rules come in Phase 2.',
  },
  rBoardTooBig: (board: string, max: string): Text => ({ el: `Η μητρική είναι ${board}· το κουτί δέχεται έως ${max}.`, en: `The board is ${board}; the case takes up to ${max}.` }),
  rCardTight: (card: number, max: number): Text => ({
    el: `Η κάρτα (${mm(card)}) χωράει, αλλά απέχει λιγότερο από 10${NBSP}mm από το όριο του κουτιού (${mm(max)}).`,
    en: `The card (${mm(card)}) fits, but is less than 10${NBSP}mm from the case limit (${mm(max)}).`,
  }),
  rBoardGuess: (board: string, size: string): Text => ({
    el: `Εκτίμηση: το κουτί δεν αναφέρει μέγιστη μητρική· ένα ${size} συνήθως δέχεται ${board}.`,
    en: `Estimate: the case states no largest board; a ${size} usually takes ${board}.`,
  }),
  rHeightUnknown: (max: number): Text => ({
    el: `Το ύψος της ψύκτρας δεν αναφέρεται από καμία πηγή· το κουτί δέχεται έως ${mm(max)}.`,
    en: `No source states the cooler's height; the case takes up to ${mm(max)}.`,
  }),
  rSocket: (socket: string): Text => ({ el: `Socket ${socket} και στα δύο.`, en: `${socket} socket on both.` }),
  rHeightFits: (h: number, max: number): Text => ({ el: `Ύψος ψύκτρας ${mm(h)}· το κουτί δέχεται έως ${mm(max)}.`, en: `Cooler height ${mm(h)}; the case takes up to ${mm(max)}.` }),
  rMemory: (type: string): Text => ({ el: `${type} και στα δύο.`, en: `${type} on both.` }),
  pairWith: { el: 'Με', en: 'With' },

  sPrice: { el: 'Κελί τιμής', en: 'Price cell' },
  priceIntro: {
    el: 'Τιμή, πραγματικό κατάστημα και πηγή, μεταφορικά, διαθεσιμότητα όταν είναι γνωστή, πότε ελέγχθηκε και αλλαγή 7 ημερών με ετικέτα. Όλα ορατά, τίποτα μόνο σε hover.',
    en: 'Price, the real shop and the source, shipping, availability when known, when it was checked and a labelled 7-day change. All visible, nothing hover-only.',
  },
  pKnown: { el: 'Όλα γνωστά', en: 'Everything known' },
  pKnownNote: { el: 'Η διαθεσιμότητα είναι δείγμα: συλλέγεται από τη Φάση 2.', en: 'Availability is a sample: collected from Phase 2.' },
  pNoShipping: { el: 'Μεταφορικά άγνωστα', en: 'Shipping unknown' },
  pNoAvail: { el: 'Διαθεσιμότητα άγνωστη', en: 'Availability unknown' },
  pStale: { el: 'Παλαιότερη από 24 ώρες', en: 'Older than 24 hours' },
  pUnusual: { el: 'Ασυνήθιστα χαμηλή', en: 'Unusually low' },
  pNone: { el: 'Δεν υπάρχει σήμερα στα δεδομένα.', en: "Not in today's data." },

  sSpecs: { el: 'Γραμμή specs', en: 'Spec line' },
  specsIntro: {
    el: 'Τα 3–5 πιο σημαντικά χαρακτηριστικά κάθε κατηγορίας, πάντα με την ίδια σειρά· ό,τι δεν είναι γνωστό κρατά τη θέση του ως «—». Ένα πραγματικό μοντέλο ανά κατηγορία.',
    en: 'The 3–5 specs that matter in each category, always in the same order; anything unknown keeps its place as "—". One real model per category.',
  },

  sFilters: { el: 'Ομάδες φίλτρων', en: 'Filter groups' },
  filtersIntro: {
    el: 'Λίστα επιλογών με μετρητές («Περισσότερα» μετά τις 8, αναζήτηση από τις 15), εύρος με slider και πεδία, διακόπτης, και η γραμμή κάλυψης. Πραγματικοί αριθμοί από τις κάρτες γραφικών και τους δίσκους.',
    en: 'Checkbox list with counts ("Show more" after 8, search from 15), range with slider and inputs, switch, and the coverage line. Real numbers from graphics cards and storage.',
  },
  gpuMakers: { el: 'Κατασκευαστής κάρτας', en: 'Card maker' },
  storageMakers: { el: 'Κατασκευαστής δίσκου', en: 'Drive maker' },
  priceRange: { el: 'Τιμή', en: 'Price' },
  lengthField: { el: 'Μήκος', en: 'Length' },
  switchOff: { el: 'Ανενεργός', en: 'Off' },
  switchDisabled: { el: 'Μόνο ιστορικά χαμηλά (κανένα σήμερα)', en: 'All-time lows only (none today)' },
  tooltipText: { el: 'Από τα καταστήματα και τους κατασκευαστές.', en: 'From the shops and the makers.' },

  sLists: { el: 'Πίνακας, κάρτες, part list', en: 'Table, cards, part list' },
  listsIntro: {
    el: 'Επικεφαλίδες που ταξινομούν· γραμμή σε κανονική, hover, εστίαση και επιλεγμένη κατάσταση· η ίδια πληροφορία ως κάρτα για κινητό· οι γραμμές του PC Builder.',
    en: "Sorting headers; a row as default, hover, focus and selected; the same information as a phone card; the PC Builder's rows.",
  },
  cards: { el: 'Κάρτες (κινητό)', en: 'Cards (phones)' },
  partList: { el: 'Part list (PC Builder)', en: 'Part list (PC Builder)' },
  partStates: { el: 'Κενή θέση και προϊόν που δεν πωλείται πλέον', en: 'Empty slot and a product no longer sold' },

  sPaging: { el: 'Σελιδοποίηση', en: 'Pagination' },
  sOverlays: { el: 'Sheet, διάλογος, toast, tooltip', en: 'Sheet, dialog, toast, tooltip' },
  overlaysIntro: {
    el: 'Στατικά για να φαίνονται, και κουμπιά που τα ανοίγουν ζωντανά. Το tooltip είναι μόνο για επιπλέον λεπτομέρειες.',
    en: 'Static so they can be seen, and buttons that open them live. The tooltip is for extra details only.',
  },
  openSheet: { el: 'Άνοιγμα sheet', en: 'Open sheet' },
  openDialog: { el: 'Άνοιγμα διαλόγου', en: 'Open dialog' },
  showToast: { el: 'Εμφάνιση toast', en: 'Show toast' },
  filtersTitle: { el: 'Φίλτρα', en: 'Filters' },
  showModels: (n: number): Text => ({ el: `Εμφάνιση ${n} μοντέλων`, en: `Show ${n} models` }),
  dialogTitle: { el: 'Καθαρισμός build;', en: 'Clear the build?' },
  dialogText: { el: 'Θα αφαιρεθούν και τα 8 εξαρτήματα. Μπορείς να το αναιρέσεις αμέσως μετά.', en: 'All 8 parts will be removed. You can undo it right after.' },
  clear: { el: 'Καθαρισμός', en: 'Clear' },
  toastCopied: { el: 'Η λίστα αντιγράφηκε.', en: 'List copied.' },
  toastCleared: { el: 'Το build καθαρίστηκε.', en: 'Build cleared.' },
  toastGo: { el: 'Θα άνοιγε', en: 'Would open' },

  sStates: { el: 'Κενό, φόρτωση, σφάλμα, 404', en: 'Empty, loading, error, 404' },
  skeletonTable: { el: 'Φόρτωση (πίνακας)', en: 'Loading (table)' },
  skeletonCards: { el: 'Φόρτωση (κινητό)', en: 'Loading (phone)' },

  sNav: { el: 'Διαδρομή, κατάσταση πηγών, αναζήτηση', en: 'Breadcrumbs, source status, search' },
  navIntro: {
    el: 'Η γραμμή κατάστασης λέει «πηγές» (όχι «καταστήματα») και δείχνει πότε ενημερώθηκε η καθεμία· όσες είναι παλαιότερες από 24 ώρες σημειώνονται. Η αναζήτηση είναι ζωντανή, με τα σημερινά μοντέλα.',
    en: 'The status line says "sources" (not "shops") and shows when each one updated; any older than 24 hours is marked. Search is live, with today\'s models.',
  },
  statusCategory: { el: 'Σε σελίδα κατηγορίας (Δίσκοι)', en: 'On a category page (Storage)' },
  statusSite: { el: 'Σε όλο το site (footer)', en: 'Site-wide (footer)' },
  searchLive: { el: 'Ζωντανά: γράψε π.χ. «rtx 50», «990 pro», «corsair», «μητρικές»', en: 'Live: type e.g. "rtx 50", "990 pro", "corsair", "motherboards"' },
  searchOpen: { el: 'Ανοιχτή, με «rtx 50»', en: 'Open, with "rtx 50"' },

  sShell: { el: 'Κέλυφος: κεφαλίδα, μενού, πλακίδια, footer', en: 'Shell: header, menu, tiles, footer' },
  shellIntro: {
    el: 'Η κεφαλίδα, το μενού «Εξαρτήματα» ανοιχτό, το footer, και σε πλαίσια 360 px: κινητό, η σελίδα πλακιδίων /parts, η αναζήτηση, το sheet φίλτρων και το part list.',
    en: 'The header, the "Parts" menu open, the footer, and in 360 px frames: phone, the /parts tiles page, search, the filter sheet and the part list.',
  },
  menuOpen: { el: 'Με ανοιχτό μενού', en: 'With the menu open' },
  phone: { el: 'Κινητό 360 px', en: 'Phone 360 px' },
  fShell: { el: 'Σελίδα κατηγορίας', en: 'Category page' },
  fParts: { el: 'Εξαρτήματα (/parts)', en: 'Parts (/parts)' },
  fSearch: { el: 'Αναζήτηση', en: 'Search' },
  fSheet: { el: 'Sheet φίλτρων', en: 'Filter sheet' },
  fBuilder: { el: 'Part list', en: 'Part list' },
} as const;
