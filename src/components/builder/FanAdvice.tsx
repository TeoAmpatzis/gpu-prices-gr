// Fan advice in the guided builder: the included fans on each case card, and the recommendation box
// on the case and fans steps (src/lib/fans.ts).

import { Fan, Lightbulb } from 'lucide-react';
import type { CaseListing } from '../../types';
import type { Model } from '../../lib/data';
import type { Build } from '../../lib/builder';
import { fanPlan, includedText, planText } from '../../lib/fans';
import { tr, type Lang, type Text } from '../../lib/i18n';

const F = {
  title: { el: 'Ανεμιστήρες για αυτή τη σύνθεση', en: 'Fans for this build' },
  base: {
    el: 'Βάση: τουλάχιστον 2 εισαγωγής μπροστά και 1 εξαγωγής πίσω· σε σύνθεση υψηλής ισχύος 3 μπροστά, 1 πίσω και 2 πάνω.',
    en: 'Base: at least 2 front intake and 1 rear exhaust; for a high-power build 3 front, 1 rear and 2 top.',
  },
  sizes: {
    el: 'Τα μεγέθη εξαρτώνται από το κουτί· 120 mm χωράνε σε κάθε θέση.',
    en: 'Sizes depend on the case; 120 mm fits every position.',
  },
  sizesUnknown: {
    el: 'Ο κατασκευαστής του κουτιού δεν αναφέρει θέσεις ανά μέγεθος· 120 mm χωράνε σε κάθε θέση.',
    en: "The case's maker doesn't list positions per size; 120 mm fits every position.",
  },
  aio: {
    el: 'Το ψυγείο της υδρόψυξης έχει δικούς του ανεμιστήρες: τοποθέτησέ το πάνω ως εξαγωγή, αν χωράει.',
    en: "The AIO's radiator has its own fans: mount it on top as exhaust where it fits.",
  },
  typeOpen: {
    el: 'Εισαγωγή και εξαγωγή: ανεμιστήρες ροής αέρα. Το μπροστινό πάνελ με πλέγμα (mesh) αφήνει τον αέρα να περνάει.',
    en: 'Intake and exhaust: airflow fans. The mesh front panel lets air through.',
  },
  typeFront: {
    el: 'Εισαγωγή και εξαγωγή: ανεμιστήρες ροής αέρα. Πίσω από γυάλινο ή κλειστό μπροστινό πάνελ και σε ψυγεία βοηθούν οι ανεμιστήρες στατικής πίεσης.',
    en: 'Intake and exhaust: airflow fans. Behind a glass or solid front panel, and on radiators, static pressure fans help.',
  },
  typeNote: {
    el: 'Ο τύπος σημειώνεται μόνο όταν τον λέει το όνομα του προϊόντος (π.χ. Arctic P = πίεση, F = ροή).',
    en: 'The type is shown only when the product name says it (e.g. Arctic P = pressure, F = airflow).',
  },
  connector: {
    el: 'Σύνδεση: οι 4-pin PWM ρυθμίζουν στροφές από τη μητρική· οι 3-pin με την τάση. Οι μητρικές έχουν συνήθως 3–6 υποδοχές ανεμιστήρα· για περισσότερους, hub ή splitter. (Ο αριθμός υποδοχών της μητρικής δεν υπάρχει ακόμα στα στοιχεία μας.)',
    en: 'Connector: 4-pin PWM fans have their speed set by the board; 3-pin fans by voltage. Boards usually have 3–6 fan headers; for more fans use a hub or splitter. (The board\'s header count is not in our data yet.)',
  },
} satisfies Record<string, Text>;

/** One line on a case card: what's in the box, and what this build would add. */
export function CaseFansLine({ c, build, lang }: { c: Model<CaseListing>; build: Build; lang: Lang }) {
  const inc = includedText(c);
  const plan = fanPlan({ ...build, case: c });
  return (
    <div className="flex flex-col gap-0.5 text-xs">
      <span className={`flex items-start gap-1.5 ${inc.known ? 'font-medium text-fg' : 'text-muted'}`}>
        <Fan className="mt-px h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
        {tr(lang, inc.text)}
      </span>
      <span className="pl-5 text-muted">{tr(lang, planText(plan))}</span>
    </div>
  );
}

const MESH = /\b(mesh|air(flow)?|flow)\b/i;

/** The recommendation box on the case step (no case yet: the general rule) and the fans step. */
export function FanAdviceBox({ build, step, lang }: { build: Build; step: 'case' | 'fan'; lang: Lang }) {
  const t = (x: Text) => tr(lang, x);
  const plan = fanPlan(build);
  const lines: Text[] = [];
  if (step === 'case' || !build.case) lines.push(F.base, F.sizes);
  if (step === 'fan' && build.case) {
    lines.push(planText(plan));
    if (!plan.sizesKnown) lines.push(F.sizesUnknown);
  }
  if (plan.aio) lines.push(F.aio);
  if (step === 'fan') {
    lines.push(build.case && MESH.test(build.case.chip) ? F.typeOpen : F.typeFront, F.typeNote, F.connector);
  }
  return (
    <div className="rounded-xl bg-sunken p-3 text-sm ring-1 ring-inset ring-edge">
      <div className="mb-1 flex items-center gap-2 font-semibold">
        <Lightbulb className="h-4 w-4 text-accent" /> {t(F.title)}
      </div>
      <ul className="flex flex-col gap-1 text-muted">
        {lines.map((l, i) => (
          <li key={i} className={i === 0 && step === 'fan' && build.case ? 'font-medium text-fg' : undefined}>
            {t(l)}
          </li>
        ))}
      </ul>
    </div>
  );
}
