// Text of pick mode on the category pages (`?pick=1`, v2 step 3), Greek and English. Kept apart from
// strings.ts (which is in every page's first download) so these load only with the pick code.

export const PICK = {
  choosing: { el: 'Επιλέγεις:', en: 'Picking:' },
  backToBuild: { el: 'Πίσω στο build', en: 'Back to the build' },
  checking: { el: 'Έλεγχος συμβατότητας…', en: 'Checking compatibility…' },
  emptyBuild: { el: 'Το build σου είναι άδειο: δεν κρύβεται τίποτα.', en: 'Your build is empty: nothing is hidden.' },
  checkedWith: { el: 'Έλεγχος με το build σου:', en: 'Checked against your build:' },
  noLongerAvailable: { el: 'δεν διατίθεται πια', en: 'no longer available' },
  notChecked: { el: 'δεν ελέγχεται', en: 'not checked' },
  couldNotCheck: { el: 'Δεν ήταν δυνατός ο έλεγχος —', en: "Couldn't check" },
  hiddenByCompat: { el: 'από το «Μόνο συμβατά»', en: 'by "Only compatible"' },
  turnOffCompat: { el: 'Κλείσε το «Μόνο συμβατά»', en: 'Turn off "Only compatible"' },
  onlyCompatible: { el: 'Μόνο συμβατά', en: 'Only compatible' },
  hiddenForms: { el: ['κρυμμένο', 'κρυμμένα'], en: ['hidden', 'hidden'] } as { el: [string, string]; en: [string, string] },
  add: { el: 'Πρόσθεσε στο build', en: 'Add to build' },
  addCard: { el: 'Πρόσθεσε αυτή την κάρτα', en: 'Add this card' },
  pickCard: { el: 'Άνοιξε τη γραμμή και διάλεξε κάρτα.', en: 'Open the row and pick a card.' },
  notOffered: { el: 'Δεν μπαίνει στο PC Builder (μόνο εξαρτήματα για desktop).', en: 'Not offered in the PC Builder (desktop parts only).' },
  more: { el: 'ακόμα', en: 'more' },
} as const;
