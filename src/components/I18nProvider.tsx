"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { dictionaries, uiLocale, type Dictionary, type Locale } from "@/i18n";
import type { SiteLanguage } from "@/i18n/languages";
import { localizedPath, setLocaleCookie, stripLocale } from "@/i18n/routing";

type I18nValue = {
  /** URL language slug = backend language code (en, cn, bm, ...). Send this as the API `locale`. */
  lang: string;
  /** UI translation file for `lang` (en, zh, bm, vi, th); English for a code without one. */
  locale: Locale;
  /** Site languages from GET /config data.languages (the language switcher list). */
  languages: SiteLanguage[];
  /** Switches language: saves the choice and opens the same page under the new URL prefix. */
  setLang: (code: string) => void;
  /** Adds the current language prefix to an app path: href("/games") -> "/cn/games". */
  href: (path: string) => string;
  t: Dictionary;
};

const I18nContext = createContext<I18nValue | null>(null);

// The language comes from the [lang] URL segment (passed in by the root layout),
// so the first render is already in the right language.
export function I18nProvider({
  lang,
  languages,
  children,
}: {
  lang: string;
  languages: SiteLanguage[];
  children: ReactNode;
}) {
  const router = useRouter();
  const locale = uiLocale(lang);

  const setLang = useCallback(
    (next: string) => {
      if (next === lang) return;
      setLocaleCookie(next);
      const { pathname, search, hash } = window.location;
      router.push(`${localizedPath(next, stripLocale(pathname))}${search}${hash}`, { scroll: false });
    },
    [lang, router],
  );

  const href = useCallback((path: string) => localizedPath(lang, path), [lang]);

  const value = useMemo<I18nValue>(
    () => ({ lang, locale, languages, setLang, href, t: dictionaries[locale] }),
    [lang, locale, languages, setLang, href],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used within I18nProvider");
  return value;
}
