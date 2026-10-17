// The language types, `tr` and the few shared words the category rules need (categoryRules.ts), without React:
// the facet worker bundles the rules. i18n.ts re-exports these; components keep importing from there.

export type Lang = 'el' | 'en';
/** UI text in both languages; a plain string is the same in both (model names, units…). */
export type Text = string | { el: string; en: string };

export const tr = (lang: Lang, t: Text) => (typeof t === 'string' ? t : t[lang]);

export const YES = { el: 'Ναι', en: 'Yes' };
export const NO = { el: 'Όχι', en: 'No' };
