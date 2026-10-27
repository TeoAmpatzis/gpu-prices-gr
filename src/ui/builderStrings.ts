// Text of the PC builder screens, Greek and English. Kept apart from strings.ts (which is in every page's first
// download) so these load only with the builder code.
import type { Text } from '../lib/text';

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
} satisfies Record<string, Text>;
