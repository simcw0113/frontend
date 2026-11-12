import bm from "./bm.json";
import en from "./en.json";
import th from "./th.json";
import vi from "./vi.json";
import zh from "./zh.json";

// UI translation files. The list of site languages is NOT this list: it comes from
// GET /config `data.languages` (see src/i18n/languages.ts). A configured language with
// no file here shows the English strings. de.json and es.json stay on disk but are
// no longer loaded or offered.
export const locales = ["en", "zh", "bm", "vi", "th"] as const;

export type Locale = (typeof locales)[number];
export type Dictionary = typeof en;
export type MessageValues = Record<string, string | number>;

function asDictionary(messages: Dictionary) {
  return messages;
}

export const dictionaries: Record<Locale, Dictionary> = {
  en,
  zh: asDictionary(zh),
  bm: asDictionary(bm),
  vi: asDictionary(vi),
  th: asDictionary(th),
};

export function isLocale(value: string | null): value is Locale {
  return locales.some((locale) => locale === value);
}

// Backend language code (the URL slug: en, cn, bm, vi, th, ...) -> UI translation file.
export function uiLocale(code: string | null | undefined): Locale {
  const value = (code ?? "").toLowerCase();
  if (value === "cn" || value === "zh" || value.startsWith("zh-")) return "zh";
  if (value === "bm" || value === "ms" || value.startsWith("ms-")) return "bm";
  if (value === "vi" || value.startsWith("vi-")) return "vi";
  if (value === "th" || value.startsWith("th-")) return "th";
  return "en";
}

// The UI strings for a backend language code (English when there is no file for it).
export function dictionaryFor(code: string | null | undefined): Dictionary {
  return dictionaries[uiLocale(code)];
}

// BCP 47 tag for <html lang> and number/date formatting of the UI locale.
export function htmlLang(locale: Locale) {
  if (locale === "zh") return "zh-Hans";
  if (locale === "bm") return "ms";
  if (locale === "vi") return "vi";
  if (locale === "th") return "th";
  return "en-US";
}

export function fill(template: string, values: MessageValues) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}
