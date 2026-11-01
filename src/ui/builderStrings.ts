// Text of the PC builder screens, Greek and English. Kept apart from strings.ts (which is in every page's first
// download) so these load only with the builder code.
import type { Text } from '../lib/text';
import type { BuilderUseKey } from '../types';

export const BUILDER = {
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
} satisfies Record<string, Text>;

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
