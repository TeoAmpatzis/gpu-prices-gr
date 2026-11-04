import type { Text } from '../../lib/i18n';

export const PRODUCT = {
  photo: { el: 'Ενδεικτική φωτογραφία οικογένειας', en: 'Family example photo' },
  noPhoto: { el: 'Δεν υπάρχει φωτογραφία οικογένειας', en: 'Family photo unavailable' },
  photoNote: { el: 'Η φωτογραφία αφορά την οικογένεια, όχι επαληθευμένα τη συγκεκριμένη καταχώριση.', en: 'Family image; not a verified photo of this listing.' },
  history: { el: 'Ιστορικό τιμών οικογένειας', en: 'Family price history' },
  historyNote: { el: 'Χαμηλότερη τιμή ανά ημέρα στην οικογένεια, χωρίς μεταφορικά. Η διάμεσος 90 ημερών και τα χαμηλά αφορούν την οικογένεια, όχι τη συγκεκριμένη καταχώριση.', en: 'Lowest family price per day, without shipping. The 90-day median and lows describe the family, not the selected listing.' },
  selected: { el: 'Επιλεγμένη καταχώριση πηγής', en: 'Selected source listing' },
  siblings: { el: 'Άλλες καταχωρίσεις της οικογένειας', en: 'Other family listings' },
  siblingsNote: { el: 'Εναλλακτικά προϊόντα της ίδιας οικογένειας. Δεν έχουν επαληθευτεί ως το ίδιο ακριβώς προϊόν.', en: 'Alternative products in this family. These are not verified offers for the same exact product.' },
  view: { el: 'Προβολή προϊόντος', en: 'View product' },
  price: { el: 'Τιμή επιλεγμένης καταχώρισης', en: 'Selected listing price' },
  variants: { el: 'Σχετικές οικογένειες', en: 'Related families' },
  correction: { el: 'Βρήκες λάθος σε τιμή ή χαρακτηριστικό;', en: 'Found a mistake in a price or a spec?' },
} satisfies Record<string, Text>;
