"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { dictionaries, type Dictionary, type Locale } from "@/i18n";
import { localizedPath, setLocaleCookie, stripLocale, toSlug } from "@/i18n/routing";

type I18nValue = {
  locale: Locale;
  /** Switches language: saves the choice and opens the same page under the new URL prefix. */
  setLocale: (locale: Locale) => void;
  /** Adds the current locale prefix to an app path: href("/games") -> "/de/games". */
  href: (path: string) => string;
  t: Dictionary;
};

const I18nContext = createContext<I18nValue | null>(null);

// The locale comes from the [lang] URL segment (passed in by the root layout),
// so the first render is already in the right language.
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const router = useRouter();

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      const slug = toSlug(next);
      setLocaleCookie(slug);
      const { pathname, search, hash } = window.location;
      router.push(`${localizedPath(slug, stripLocale(pathname))}${search}${hash}`, { scroll: false });
    },
    [locale, router],
  );

  const href = useCallback((path: string) => localizedPath(toSlug(locale), path), [locale]);

  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, href, t: dictionaries[locale] }),
    [locale, setLocale, href],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used within I18nProvider");
  return value;
}
