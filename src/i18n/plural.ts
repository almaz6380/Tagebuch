// Plural forms by CLDR category, for languages with more than "one/other"
// (Polish, Russian, Arabic). Falls back to a simple rule where the engine lacks Intl.PluralRules.
type Forms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

const rules = new Map<string, Intl.PluralRules | null>();

function rule(locale: string): Intl.PluralRules | null {
  if (!rules.has(locale)) {
    try {
      rules.set(locale, new Intl.PluralRules(locale));
    } catch {
      rules.set(locale, null);
    }
  }
  return rules.get(locale)!;
}

/** The word for `n` in the given locale, e.g. pick('ru', 3, { one: 'день', few: 'дня', many: 'дней', other: 'дня' }). */
export function pick(locale: string, n: number, forms: Forms): string {
  const category = rule(locale)?.select(n) ?? (n === 1 ? 'one' : 'other');
  return forms[category] ?? forms.other;
}
