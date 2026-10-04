// Page titles and subtitles the shell shows for the pages that aren't categories (the categories' own
// titles live in src/lib/categories.tsx). Greek in the "εσύ" register (docs/phase1/glossary.md).
import type { Text } from '../lib/i18n';
import type { InfoPage } from '../lib/routes';

export const PAGE: Record<'home' | 'builder' | 'parts' | 'notFound' | InfoPage, { title: Text; subtitle?: Text }> = {
  home: {
    title: { el: 'Τιμές εξαρτημάτων PC στην Ελλάδα', en: 'PC part prices in Greece' },
    subtitle: {
      el: 'Σύγκρινε τιμές από Skroutz, BestPrice, Shopflix, Snif και e-shop.gr, ή φτιάξε PC με συμβατά εξαρτήματα.',
      en: 'Compare prices from Skroutz, BestPrice, Shopflix, Snif and e-shop.gr, or build a PC from compatible parts.',
    },
  },
  builder: {
    title: 'PC Builder',
    subtitle: {
      el: 'Διάλεξε συμβατά εξαρτήματα με τις τρέχουσες τιμές της ελληνικής αγοράς.',
      en: 'Pick compatible parts at current Greek market prices.',
    },
  },
  parts: { title: { el: 'Εξαρτήματα', en: 'Parts' } },
  notFound: { title: { el: 'Η σελίδα δεν βρέθηκε', en: 'Page not found' } },
  about: {
    title: { el: 'Σχετικά', en: 'About' },
    subtitle: { el: 'Τι είναι το BuildDraft.gr και από πού έρχονται οι τιμές.', en: 'What BuildDraft.gr is and where the prices come from.' },
  },
  contact: {
    title: { el: 'Επικοινωνία', en: 'Contact' },
    subtitle: { el: 'Ερωτήσεις, διορθώσεις και προτάσεις.', en: 'Questions, corrections and suggestions.' },
  },
  privacy: {
    title: { el: 'Πολιτική απορρήτου', en: 'Privacy policy' },
    subtitle: { el: 'Ποια δεδομένα επεξεργάζονται και ποια είναι τα δικαιώματά σου.', en: 'What data is processed and what your rights are.' },
  },
};

export const HOME = {
  buildCta: { el: 'Φτιάξε PC', en: 'Build a PC' },
  categories: { el: 'Κατηγορίες', en: 'Categories' },
};
