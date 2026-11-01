// Text of the PC builder screens, Greek and English. Kept apart from strings.ts (which is in every page's first
// download) so these load only with the builder code.
import type { Text } from '../lib/text';
import type { BuilderUseKey } from '../types';

export const BUILDER = {
  hddSystem: { el: 'Ένας σκληρός δίσκος ως δίσκος συστήματος είναι αργός· για το σύστημα διάλεξε SSD.', en: 'An HDD as the system drive is slow; choose an SSD for the system.' },
  noEfficiency: { el: 'χωρίς δηλωμένη απόδοση', en: 'no stated efficiency' },
  fullModular: { el: 'Πλήρως αρθρωτό', en: 'Fully modular' },
  semiModular: { el: 'Ημι-αρθρωτό', en: 'Semi-modular' },
  nonModular: { el: 'Μη αρθρωτό', en: 'Non-modular' },
  otherShop: { el: 'Άλλο κατάστημα', en: 'Other shop' },
  offersRetry: { el: 'Οι προσφορές δεν φόρτωσαν. Δοκίμασε ξανά.', en: 'Offers did not load. Try again.' },
  noOffers: { el: 'Δεν βρέθηκαν προσφορές για αυτή την έκδοση.', en: 'No offers found for this version.' },
  shopLink: { el: 'Κατάστημα', en: 'Shop' },
  fewerFans: { el: 'Οι επιλεγμένοι ανεμιστήρες είναι λιγότεροι από την πρόταση.', en: 'The chosen fans are fewer than the plan.' },

  /** Credit for the performance tiers (src/engine/data/tiers.ts), shown where the builder shows a tier. */
  tierCredit: {
    el: "Επίπεδα απόδοσης: δική μας ομαδοποίηση, με βάση τις κατατάξεις των Tom's Hardware, PC Games Hardware και ComputerBase και τις δοκιμές επεξεργαστών των PC Games Hardware και ComputerBase.",
    en: "Performance tiers: our own grouping, based on the rankings of Tom's Hardware, PC Games Hardware and ComputerBase and the processor reviews of PC Games Hardware and ComputerBase.",
  },
  /** Credit for the Wikipedia spec data used only to give an F/KF processor its twin's tier (tiers.ts, `twin`). */
  tierTwinCredit: {
    el: 'Τα χαρακτηριστικά επεξεργαστών F/KF που συγκρίνουμε με το ίδιο μοντέλο χωρίς F προέρχονται από την αγγλική Wikipedia, με άδεια CC BY-SA 4.0.',
    en: 'The F/KF processor specifications we compare with the same model without the F come from English Wikipedia, under the CC BY-SA 4.0 license.',
  },
  // The automatic build and the budget (task 10; rendered by tasks 11–13). Placeholders as in strings.ts: the caller
  // replaces {pc} with PC_FOR[use], {x} / {n} / {max} with formatted prices.
  minimum: { el: '{pc} κοστίζει σήμερα τουλάχιστον {x}.', en: '{pc} costs at least {x} today.' },
  seeMinimum: { el: 'Δες αυτό το build', en: 'See that build' },
  overPlan: { el: '+{n} πάνω από το σχέδιο για αυτό το εξάρτημα', en: '+{n} over the plan for this part' },
  aboveRange: {
    el: 'Για προϋπολογισμό πάνω από {max} δεν φτιάχνουμε αυτόματο build· διάλεξε τα εξαρτήματα ένα ένα.',
    en: "Above {max} we don't make an automatic build; choose the parts one by one.",
  },
  // The start screen (task 11).
  useQ: { el: 'Για τι θα χρησιμοποιηθεί ο υπολογιστής;', en: 'What is the PC for?' },
  resQ: { el: 'Ανάλυση οθόνης', en: 'Screen resolution' },
  budgetQ: { el: 'Προϋπολογισμός', en: 'Budget' },
  budgetHint: {
    el: 'Δεν κρύβει εξαρτήματα· δείχνει πόσα μένουν και ταξινομεί τις προτάσεις.',
    en: "It never hides parts; it shows what's left and orders the suggestions.",
  },
  buildForMe: { el: "Φτιάξ' το για μένα", en: 'Build it for me' },
  stepByStep: { el: 'Βήμα-βήμα', en: 'Step by step' },
  partList: { el: 'Λίστα εξαρτημάτων', en: 'Part list' },
  needUseBudget: {
    el: 'Για αυτόματο build διάλεξε χρήση και προϋπολογισμό.',
    en: 'For an automatic build choose a use and a budget.',
  },
  autoFailed: { el: 'Το αυτόματο build δεν φορτώθηκε.', en: "The automatic build didn't load." },
  // The measurement notice: full on the start screen, one line in the steps and the part list (C9).
  notice: {
    el: 'Οι διαστάσεις για τον έλεγχο συμβατότητας συλλέγονται σταδιακά. Όσα δεν έχουν ακόμα στοιχεία εμφανίζονται ως «Χωρίς επιβεβαίωση»· προστίθενται καθημερινά.',
    en: 'Measurements for the compatibility check are being collected gradually. Parts without them are shown as "Fit not verified"; more are added every day.',
  },
  noticeShort: { el: 'Οι διαστάσεις συλλέγονται σταδιακά.', en: 'Measurements are being collected gradually.' },
  known: { el: 'Γνωστές σήμερα:', en: 'Known today:' },
  knownGpu: { el: 'κάρτες γραφικών', en: 'graphics cards' },
  knownCase: { el: 'κουτιά', en: 'cases' },
  knownCooler: { el: 'ψύκτρες', en: 'coolers' },
  // The steps and the part list (task 11).
  mode: { el: 'Τρόπος συναρμολόγησης', en: 'Builder mode' },
  useBudget: { el: 'Χρήση και προϋπολογισμός', en: 'Use and budget' },
  stepOf: { el: 'Βήμα {n}/{total}', en: 'Step {n}/{total}' },
  steps: { el: 'Βήματα', en: 'Steps' },
  prevStep: { el: 'Προηγούμενο βήμα', en: 'Previous step' },
  nextStep: { el: 'Επόμενο βήμα', en: 'Next step' },
  more: { el: 'Περισσότερα', en: 'More' },
  less: { el: 'Λιγότερα', en: 'Less' },
  fansSection: { el: 'Ανεμιστήρες κουτιού (προαιρετικό)', en: 'Case fans (optional)' },
  quantity: { el: 'Ποσότητα', en: 'Quantity' },
  fewer: { el: 'Ένα πακέτο λιγότερο', en: 'One pack fewer' },
  morePacks: { el: 'Ένα πακέτο περισσότερο', en: 'One pack more' },
  storage2: { el: 'Δεύτερος δίσκος', en: 'Second drive' },
  stepFailed: { el: 'Τα εξαρτήματα αυτού του βήματος δεν φορτώθηκαν.', en: "This step's parts didn't load." },
  notLoaded: { el: 'Η τιμή δεν φορτώθηκε ακόμη: {parts}', en: 'Price not loaded yet: {parts}' },
} satisfies Record<string, Text>;

/** The uses on the start screen: name and one line. */
export const USE_TEXT = {
  gaming: { label: { el: 'Gaming', en: 'Gaming' }, desc: { el: 'Η κάρτα γραφικών παίρνει το μεγαλύτερο μέρος.', en: 'The graphics card takes the biggest share.' } },
  everyday: {
    label: { el: 'Καθημερινή χρήση', en: 'Everyday' },
    desc: { el: 'Γραφείο, σπουδές, internet· αρκούν ενσωματωμένα γραφικά.', en: 'Office, study, web; integrated graphics are enough.' },
  },
  creating: {
    label: { el: 'Δημιουργία', en: 'Creating' },
    desc: { el: 'Μοντάζ, 3D, φωτογραφία· επεξεργαστής και μνήμη μετράνε.', en: 'Video, 3D, photos; CPU and memory matter.' },
  },
  unsure: { label: { el: 'Δεν ξέρω ακόμα', en: 'Not sure' }, desc: { el: 'Μια ισορροπημένη σύνθεση.', en: 'A balanced build.' } },
} satisfies Record<string, { label: Text; desc: Text }>;

/** Fills a string's placeholders: fill('Step {n}/{total}', { n: 2, total: 9 }). */
export const fill = (s: string, v: Record<string, string | number>): string => s.replace(/\{(\w+)\}/g, (m, k: string) => String(v[k] ?? m));

/** "A 1440p gaming PC with 32 GB" per use (the RAM of useMinimums.USE_MINIMUMS), for BUILDER.minimum's {pc}. */
export const PC_FOR = {
  'gaming-1080p': { el: 'Ένα gaming PC 1080p με 16 GB', en: 'A 1080p gaming PC with 16 GB' },
  'gaming-1440p': { el: 'Ένα gaming PC 1440p με 32 GB', en: 'A 1440p gaming PC with 32 GB' },
  'gaming-4k': { el: 'Ένα gaming PC 4K με 32 GB', en: 'A 4K gaming PC with 32 GB' },
  everyday: { el: 'Ένα PC για καθημερινή χρήση με 16 GB', en: 'An everyday PC with 16 GB' },
  creating: { el: 'Ένα PC για δημιουργία με 32 GB', en: 'A PC for creative work with 32 GB' },
  // "Not sure" has the 1080p gaming minimums.
  unsure: { el: 'Ένα gaming PC 1080p με 16 GB', en: 'A 1080p gaming PC with 16 GB' },
} satisfies Record<BuilderUseKey, Text>;
