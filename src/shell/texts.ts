// Page titles and subtitles the shell shows, the categories' included. Greek in the "εσύ" register
// (docs/phase1/glossary.md).
import type { Text } from '../lib/i18n';
import type { InfoPage } from '../lib/routes';
import type { Category } from '../types';

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

/**
 * Category page titles and subtitles. They live here, in the shell, so a category page's heading paints
 * with the first script instead of waiting for the category's own (lazy) code; src/lib/categories.tsx
 * reads them from here.
 */
const sources = 'Skroutz, BestPrice, Shopflix, Snif και e-shop.gr';
const sourcesEn = 'Skroutz, BestPrice, Shopflix, Snif and e-shop.gr';
const subtitle = (el: string, en: string): Text => ({
  el: `Οι χαμηλότερες τιμές ${el} στην Ελλάδα, από ${sources}.`,
  en: `The lowest ${en} prices in Greece, from ${sourcesEn}.`,
});

export const CAT_PAGE: Record<Category, { title: Text; subtitle: Text }> = {
  gpu: {
    title: { el: 'Τιμές Καρτών Γραφικών', en: 'Graphics Card Prices' },
    subtitle: subtitle('GPU', 'GPU'),
  },
  cpu: {
    title: { el: 'Τιμές Επεξεργαστών', en: 'Processor Prices' },
    subtitle: subtitle('CPU', 'CPU'),
  },
  mobo: {
    title: { el: 'Τιμές Μητρικών', en: 'Motherboard Prices' },
    subtitle: {
      el: 'Οι χαμηλότερες τιμές για κάθε μητρική στην Ελλάδα, από Skroutz, BestPrice, Shopflix, Snif και e-shop.gr.',
      en: 'The lowest price for every motherboard in Greece, from Skroutz, BestPrice, Shopflix, Snif and e-shop.gr.',
    },
  },
  ram: {
    title: { el: 'Τιμές Μνημών RAM', en: 'Memory (RAM) Prices' },
    subtitle: {
      el: 'Οι χαμηλότερες τιμές RAM στην Ελλάδα ανά χωρητικότητα και ταχύτητα, από Skroutz, BestPrice, Shopflix, Snif και e-shop.gr.',
      en: 'The lowest RAM prices in Greece by capacity and speed, from Skroutz, BestPrice, Shopflix, Snif and e-shop.gr.',
    },
  },
  storage: {
    title: { el: 'Τιμές SSD & Σκληρών Δίσκων', en: 'SSD & Hard Drive Prices' },
    subtitle: {
      el: 'Οι χαμηλότερες τιμές για κάθε SSD και σκληρό δίσκο στην Ελλάδα, από Skroutz, BestPrice, Shopflix, Snif και e-shop.gr.',
      en: 'The lowest price for every SSD and hard drive in Greece, from Skroutz, BestPrice, Shopflix, Snif and e-shop.gr.',
    },
  },
  psu: {
    title: { el: 'Τιμές Τροφοδοτικών', en: 'Power Supply Prices' },
    subtitle: {
      el: 'Οι χαμηλότερες τιμές τροφοδοτικών PC στην Ελλάδα ανά ισχύ και πιστοποίηση, από Skroutz, BestPrice, Shopflix, Snif και e-shop.gr.',
      en: 'The lowest PC power supply prices in Greece by wattage and efficiency rating, from Skroutz, BestPrice, Shopflix, Snif and e-shop.gr.',
    },
  },
  case: {
    title: { el: 'Τιμές Κουτιών PC', en: 'PC Case Prices' },
    subtitle: {
      el: 'Οι χαμηλότερες τιμές για κάθε κουτί υπολογιστή στην Ελλάδα, από Skroutz, BestPrice, Shopflix, Snif και e-shop.gr.',
      en: 'The lowest price for every PC case in Greece, from Skroutz, BestPrice, Shopflix, Snif and e-shop.gr.',
    },
  },
  fan: {
    title: { el: 'Τιμές Ανεμιστήρων', en: 'Case Fan Prices' },
    subtitle: {
      el: 'Οι χαμηλότερες τιμές ανεμιστήρων κουτιού στην Ελλάδα, ανά μοντέλο και συσκευασία, από Skroutz, BestPrice, Shopflix, Snif και e-shop.gr.',
      en: 'The lowest case fan prices in Greece, by model and pack size, from Skroutz, BestPrice, Shopflix, Snif and e-shop.gr.',
    },
  },
  cooler: {
    title: { el: 'Τιμές Ψυκτρών CPU', en: 'CPU Cooler Prices' },
    subtitle: {
      el: 'Οι χαμηλότερες τιμές για ψύκτρες αέρα και υδροψύξεις AIO στην Ελλάδα, από Skroutz, BestPrice, Shopflix, Snif και e-shop.gr.',
      en: 'The lowest prices for air coolers and AIO liquid coolers in Greece, from Skroutz, BestPrice, Shopflix, Snif and e-shop.gr.',
    },
  },
};
