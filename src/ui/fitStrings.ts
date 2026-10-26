// Text of the product page's "fits your build" (v2 step 4, task 8), Greek and English. Kept apart from strings.ts
// (in every page's first download) so it loads only with the product page; pick mode's shared wording is PICK.
import type { Slot } from '../lib/builder';
import type { Text } from '../lib/i18n';

export const FIT = {
  title: { el: 'Ταιριάζει στο build σου;', en: 'Does it fit your build?' },
  fits: { el: 'Ταιριάζει', en: 'Fits' },
  partly: { el: 'Ταιριάζει σε ό,τι ελέγξαμε', en: 'Fits as far as we could check' },
  blocked: { el: 'Δεν ταιριάζει', en: "Doesn't fit" },
  issues: { el: 'Θέλει προσοχή', en: 'Needs attention' },
  checking: { el: 'Έλεγχος…', en: 'Checking…' },
  notChecked: { el: 'Δεν ελέγχθηκε', en: 'Not checked' },
  nothingToCheck: { el: 'Τίποτα για έλεγχο', en: 'Nothing to check' },
  alone: { el: 'Τίποτα στο build σου δεν ελέγχεται μαζί του.', en: 'Nothing in your build is checked against it.' },
  notFinished: { el: 'Ο έλεγχος συμβατότητας δεν ολοκληρώθηκε.', en: "The compatibility check didn't finish." },
  why: { el: 'Γιατί;', en: 'Why?' },
  addShort: { el: 'Πρόσθεσε', en: 'Add' },
  replaceShort: { el: 'Αντικατάστησε', en: 'Replace' },
  inBuildShort: { el: 'Στο build', en: 'In build' },
  inBuild: { el: 'Είναι στο build σου', en: "It's in your build" },
  nowInBuild: { el: 'Στο build σου τώρα:', en: 'In your build now:' },
  added: { el: 'Προστέθηκε στο build σου.', en: 'Added to your build.' },
  // Screen readers: the part's name makes each add a new message, so a second add in a row is announced too.
  addedNamed: { el: 'Προστέθηκε στο build σου: {name}.', en: 'Added to your build: {name}.' },
  replacedNamed: { el: 'Μπήκε στο build σου στη θέση του προηγούμενου: {name}.', en: 'It took the previous one’s place in your build: {name}.' },
  switchBox: { el: 'Άλλαξε στην έκδοση Box', en: 'Switch to the Box version' },
  switchTray: { el: 'Άλλαξε στην έκδοση χωρίς ψύκτρα', en: 'Switch to the version without a cooler' },
  switchThis: { el: 'Άλλαξε σε αυτή την έκδοση', en: 'Switch to this version' },
  noneChecked: {
    el: 'Κανένα εξάρτημα του build σου δεν μπόρεσε να ελεγχθεί μαζί του.',
    en: "None of your build's parts could be checked against it.",
  },
  replaced: { el: 'Μπήκε στο build σου στη θέση του προηγούμενου.', en: 'It took the previous one’s place in your build.' },
  openBuild: { el: 'Άνοιξε το build', en: 'Open the build' },
  pickCard: { el: 'Διάλεξε κάρτα από τα καταστήματα', en: 'Pick a card from the shops' },
  perCard: {
    el: 'Κάθε κάρτα ελέγχεται χωριστά: η ετυμηγορία και το κουμπί είναι σε κάθε προσφορά, στον πίνακα τιμών.',
    en: 'Each card is checked on its own: the verdict and the button are on every offer, in the prices table.',
  },
  addCardLabel: { el: 'Πρόσθεσε αυτή την κάρτα στο build', en: 'Add this card to your build' },
  replaceCard: { el: 'Αντικατάστησε την κάρτα σου', en: 'Replace your card' },
  // The table's buttons show one word; their names start with it (the visible label is part of the accessible name).
  replaceCardLabel: { el: 'Αντικατάστησε την κάρτα του build σου με αυτή', en: "Replace your build's card with this one" },
  inBuildLabel: { el: 'Στο build: άνοιξε το build σου', en: 'In build: open your build' },
  versionBox: { el: 'Έκδοση Box (με ψύκτρα στο κουτί)', en: 'Box version (cooler in the box)' },
  versionTray: { el: 'Χωρίς ψύκτρα στη συσκευασία', en: 'No cooler in the box' },
} as const;

/** "Replace your <part>" per slot (Greek needs the article and case of each word, so one phrase per slot). */
export const REPLACE: Record<Slot, Text> = {
  cpu: { el: 'Αντικατάστησε τον επεξεργαστή σου', en: 'Replace your processor' },
  mobo: { el: 'Αντικατάστησε τη μητρική σου', en: 'Replace your motherboard' },
  ram: { el: 'Αντικατάστησε τη μνήμη RAM σου', en: 'Replace your memory' },
  gpu: FIT.replaceCard,
  storage: { el: 'Αντικατάστησε τον δίσκο σου', en: 'Replace your drive' },
  case: { el: 'Αντικατάστησε το κουτί σου', en: 'Replace your case' },
  psu: { el: 'Αντικατάστησε το τροφοδοτικό σου', en: 'Replace your power supply' },
  cooler: { el: 'Αντικατάστησε την ψύκτρα σου', en: 'Replace your CPU cooler' },
  fan: { el: 'Αντικατάστησε τους ανεμιστήρες σου', en: 'Replace your case fans' },
};
