// Text of the PC builder screens, Greek and English. Kept apart from strings.ts (which is in every page's first
// download) so these load only with the builder code.
import type { Text } from '../lib/text';

export const BUILDER = {
  /** Credit for the performance tiers (src/engine/data/tiers.ts), shown where the builder shows a tier. */
  tierCredit: {
    el: "Επίπεδα απόδοσης: δική μας ομαδοποίηση, με βάση τις κατατάξεις των Tom's Hardware, PC Games Hardware και ComputerBase.",
    en: "Performance tiers: our own grouping, based on the rankings of Tom's Hardware, PC Games Hardware and ComputerBase.",
  },
} satisfies Record<string, Text>;
