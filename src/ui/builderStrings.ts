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
  // The budget line of the summary (task 14, #30): {x} is formatPrice, "€22.02 left" in English.
  left: { el: 'απομένουν {x}', en: '{x} left' },
  over: { el: 'υπέρβαση {x}', en: '{x} over' },
  // Review, Copy list and the share link (task 13).
  myBuild: { el: 'Η σύνθεσή μου', en: 'My build' },
  total: { el: 'Σύνολο', en: 'Total' },
  pricesOf: { el: 'Τιμές της', en: 'Prices of' },
  noShipping: { el: 'χωρίς μεταφορικά', en: 'shipping not included' },
  offerGone: {
    el: 'Η προσφορά που διάλεξες δεν υπάρχει πια. Διάλεξε διαθέσιμη εναλλακτική.',
    en: 'The offer you chose is no longer listed. Choose an available alternative.',
  },
  offerLoading: { el: 'Φόρτωση του καταστήματος που διάλεξες…', en: 'Loading the shop you chose…' },
  offerFailed: {
    el: 'Δεν φορτώθηκε το κατάστημα που διάλεξες. Δοκίμασε ξανά.',
    en: "Couldn't load the shop you chose. Try again.",
  },
  gone: { el: 'Δεν πωλείται πια: {name} ({step})', en: 'No longer sold: {name} ({step})' },
  missing: { el: 'Λείπει', en: 'Missing' },
  choose: { el: 'Επιλογή', en: 'Choose' },
  copyList: { el: 'Αντιγραφή λίστας', en: 'Copy list' },
  linksLoading: { el: 'Φόρτωση συνδέσμων καταστημάτων…', en: 'Loading shop links…' },
  linksMissing: {
    el: 'Οι σύνδεσμοι των καταστημάτων δεν φορτώθηκαν· η λίστα αντιγράφεται χωρίς αυτούς.',
    en: "Shop links didn't load; the list is copied without them.",
  },
  copyLink: { el: 'Αντιγραφή συνδέσμου', en: 'Copy link' },
  copied: { el: 'Αντιγράφηκε', en: 'Copied' },
  link: { el: 'Σύνδεσμος της σύνθεσης', en: 'Link to this build' },
  linkHint: {
    el: 'Όποιος τον ανοίξει βλέπει αυτή τη σύνθεση, με τα καταστήματα που διάλεξες· η δική του αποθηκευμένη σύνθεση δεν αλλάζει.',
    en: 'Anyone who opens it sees this build, with the shops you chose; their own saved build is not changed.',
  },
  errors: { el: 'Ασυμβατότητες', en: 'Incompatible' },
  warnings: { el: 'Προς έλεγχο', en: 'To check' },
  notes: { el: 'Σημειώσεις', en: 'Notes' },
  allFit: { el: 'Κανένα πρόβλημα συμβατότητας.', en: 'No compatibility problems.' },
  bios: { el: 'BIOS', en: 'BIOS' },
  power: { el: 'Κατανάλωση (εκτίμηση)', en: 'Power estimate' },
  powerSum: { el: 'Άθροισμα', en: 'Sum' },
  headroom: { el: '× 1,3 περιθώριο, στρογγυλεμένο προς τα πάνω στα 50 W', en: '× 1.3 headroom, rounded up to 50 W' },
  makerPsu: { el: 'Ο κατασκευαστής της κάρτας ζητά', en: 'The card maker asks for' },
  recommendedPsu: { el: 'Προτεινόμενο τροφοδοτικό', en: 'Recommended PSU' },
  powerMissing: { el: 'Η εκτίμηση για όλο το build λείπει: δεν ξέρουμε {what}.', en: "The whole-build estimate is missing: we don't know {what}." },
  // Named saved builds (task 13, owner answer 12).
  savedBuilds: { el: 'Αποθηκευμένες', en: 'Saved builds' },
  saveAs: { el: 'Αποθήκευση ως νέα', en: 'Save as new' },
  name: { el: 'Όνομα', en: 'Name' },
  defaultName: { el: 'Σύνθεση {n}', en: 'Build {n}' },
  open: { el: 'Άνοιγμα', en: 'Open' },
  rename: { el: 'Μετονομασία', en: 'Rename' },
  duplicate: { el: 'Αντίγραφο', en: 'Duplicate' },
  delete: { el: 'Διαγραφή', en: 'Delete' },
  save: { el: 'Αποθήκευση', en: 'Save' },
  continue: { el: 'Συνέχεια', en: 'Continue' },
  isOpen: { el: 'ανοιχτή', en: 'open' },
  changed: { el: 'αλλαγή', en: 'changed' },
  noSaved: { el: 'Δεν έχεις αποθηκευμένες συνθέσεις ακόμα.', en: 'No saved builds yet.' },
  confirmDelete: { el: 'Διαγραφή της «{name}»; Δεν αναιρείται.', en: 'Delete "{name}"? This can\'t be undone.' },
  confirmReplace: {
    el: 'Η σύνθεση που έχεις ανοιχτή δεν είναι αποθηκευμένη με όνομα και θα αντικατασταθεί. Αποθήκευσέ την πρώτα αν τη θέλεις.',
    en: "Your current build isn't saved under a name and will be replaced. Save it first if you want to keep it.",
  },
  savedToast: { el: 'Αποθηκεύτηκε: {name}', en: 'Saved: {name}' },
  openedToast: { el: 'Άνοιξε: {name}', en: 'Opened: {name}' },
  deletedToast: { el: 'Διαγράφηκε: {name}', en: 'Deleted: {name}' },
  renamedToast: { el: 'Μετονομάστηκε: {name}', en: 'Renamed: {name}' },
  autoTitle: { el: 'Νέο αυτόματο build', en: 'New automatic build' },
  autoKeeps: {
    el: 'Τα κομμάτια της «{name}» μένουν αποθηκευμένα· το αυτόματο build ανοίγει ως νέα σύνθεση χωρίς όνομα.',
    en: 'The parts of "{name}" stay saved; the automatic build opens as a new, unnamed build.',
  },
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
