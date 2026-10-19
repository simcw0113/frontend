import de from "./de.json";
import en from "./en.json";
import es from "./es.json";
import zh from "./zh.json";

export const locales = ["en", "es", "de", "zh"] as const;

export type Locale = (typeof locales)[number];
export type Dictionary = typeof en;
export type MessageValues = Record<string, string | number>;

function asDictionary(messages: Dictionary) {
  return messages;
}

export const dictionaries: Record<Locale, Dictionary> = {
  en,
  es: asDictionary(es),
  de: asDictionary(de),
  zh: asDictionary(zh),
};

export const localeChoices: { id: Locale; label: keyof Dictionary["language"] }[] = [
  { id: "en", label: "en" },
  { id: "es", label: "es" },
  { id: "de", label: "de" },
  { id: "zh", label: "zh" },
];

export function isLocale(value: string | null): value is Locale {
  return locales.some((locale) => locale === value);
}

export function htmlLang(locale: Locale) {
  if (locale === "zh") return "zh-CN";
  if (locale === "es") return "es-ES";
  if (locale === "de") return "de-DE";
  return "en-US";
}

export function fill(template: string, values: MessageValues) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}
