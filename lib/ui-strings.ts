// The words the site's own code writes, in every language the site serves.
//
// Page copy lives in content/*.json. Everything else a visitor reads comes
// from here: a tool's labels, buttons, placeholders, progress and result
// states, error messages and their fixes, aria-labels, the header's and the
// footer's own words. A component never writes a sentence inline.
//
// How a page uses it: the page (a server component) knows its language
// (the resolved locale's code, or siteConfig.language) and passes
// `uiStringsFor(language)` to its "use client" tool as a prop; the tool
// renders `t.someKey`. This module imports nothing, so a client component
// that does import it ships only these strings, never lib/site-config.json.
// A new language is then a data change: add its entry below and its pages
// under /{code}/, and no component changes.
//
// The site's to write and extend: the starter ships it empty.

/** Every string the site's code uses, in the primary language. */
const primary = {
  // toolStart: "Start",
  // toolErrorTooLarge: "This file is over {limit}. Trim it or pick a smaller one.",
} satisfies Record<string, string>;

export type UiStringKey = keyof typeof primary;
export type UiStrings = Record<UiStringKey, string>;

/** Each secondary language, keyed by its locale code ("es", "pt"). Written
 * for that market, not translated word for word: its examples, units and
 * genres are the ones its visitors know. A key left out shows the primary
 * text, which QA reports on that locale's pages. */
const translations: Record<string, Partial<UiStrings>> = {
};

/** The strings of one language, the primary text filling any key it lacks. */
export function uiStringsFor(language: string): UiStrings {
  const code = (language || "").trim().toLowerCase();
  const own = translations[code] ?? translations[code.split("-")[0]] ?? {};
  return { ...primary, ...own } as UiStrings;
}

/** Fill "{name}" slots: formatMessage(t.toolErrorTooLarge, { limit: "50 MB" }). */
export function formatMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (slot, name: string) => (name in values ? String(values[name]) : slot));
}

/** A number as this language writes it (1,234.5 or 1.234,5). */
export function formatNumber(value: number, language: string, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(language || "en", options).format(value);
}

/** A price in its own currency, as this language writes it (R$ 29,90, 9,99 €). */
export function formatPrice(amount: number, currency: string, language: string): string {
  return new Intl.NumberFormat(language || "en", { style: "currency", currency }).format(amount);
}
