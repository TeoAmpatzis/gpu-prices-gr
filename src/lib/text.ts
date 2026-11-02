// The language types, `tr` and the few shared words the category rules need (categoryRules.ts), without React:
// the facet worker bundles the rules. i18n.ts re-exports these; components keep importing from there.

export type Lang = 'el' | 'en';
/** UI text in both languages; a plain string is the same in both (model names, units…). */
export type Text = string | { el: string; en: string };

export const tr = (lang: Lang, t: Text) => (typeof t === 'string' ? t : t[lang]);

/** A noun's singular and plural in each language, for `plural`. */
export type Forms = { el: [string, string]; en: [string, string] };

/** "1 θέση" / "3 θέσεις", "1 slot" / "3 slots": the number (grouped the language's way) and the form for it (#31). */
export function plural(lang: Lang, n: number, forms: Forms): string {
  const [one, other] = forms[lang];
  const word = RULES[lang].select(n) === 'one' ? one : other;
  return `${NUM[lang].format(n)}\u00a0${word}`;
}
// Made once: the engine's messages call `plural` for every check, and building these per call is slow.
const RULES: Record<Lang, Intl.PluralRules> = { el: new Intl.PluralRules('el'), en: new Intl.PluralRules('en') };
const NUM: Record<Lang, Intl.NumberFormat> = { el: new Intl.NumberFormat('el-GR'), en: new Intl.NumberFormat('en-IE') };

export const YES = { el: 'Ναι', en: 'Yes' };
export const NO = { el: 'Όχι', en: 'No' };
