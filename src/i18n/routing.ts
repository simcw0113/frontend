// Locale-prefixed URLs (/en, /cn, /de, /es). Kept free of the message JSON so the
// proxy can import it. The URL segment for Chinese is "cn"; internally it maps to
// the existing "zh" locale and zh.json.
import type { Locale } from "@/i18n";

export const localeSlugs = ["en", "cn", "de", "es"] as const;
export type LocaleSlug = (typeof localeSlugs)[number];

export const defaultSlug: LocaleSlug = "en";
export const localeCookie = "NEXT_LOCALE";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const slugByLocale: Record<Locale, LocaleSlug> = { en: "en", zh: "cn", de: "de", es: "es" };
const localeBySlug: Record<LocaleSlug, Locale> = { en: "en", cn: "zh", de: "de", es: "es" };

export function isSlug(value: string | null | undefined): value is LocaleSlug {
  return localeSlugs.some((slug) => slug === value);
}

export function toSlug(locale: Locale): LocaleSlug {
  return slugByLocale[locale];
}

export function fromSlug(slug: LocaleSlug): Locale {
  return localeBySlug[slug];
}

// "/cn/games" -> "/games", "/en" -> "/", "/games" (no prefix) -> "/games".
export function stripLocale(pathname: string): string {
  const [, first = "", ...rest] = pathname.split("/");
  const path = isSlug(first) ? `/${rest.join("/")}` : pathname;
  return path === "" ? "/" : path;
}

// ("cn", "/games") -> "/cn/games"; ("cn", "/") -> "/cn".
export function localizedPath(slug: LocaleSlug, path: string): string {
  return path === "/" || path === "" ? `/${slug}` : `/${slug}${path.startsWith("/") ? path : `/${path}`}`;
}

// Picks the best supported language from an Accept-Language header.
export function negotiate(header: string | null): LocaleSlug | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number(q.slice(2)) : 1 };
    })
    .filter((item) => item.tag && item.tag !== "*" && item.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    const primary = tag.split("-")[0];
    if (primary === "zh") return "cn";
    if (isSlug(primary)) return primary;
  }
  return null;
}

export function setLocaleCookie(slug: LocaleSlug) {
  document.cookie = `${localeCookie}=${slug}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

// <link rel="alternate" hreflang> map for a page, given its path without prefix.
export function languageAlternates(path: string): Record<string, string> {
  return {
    "en-US": localizedPath("en", path),
    "zh-CN": localizedPath("cn", path),
    "de-DE": localizedPath("de", path),
    "es-ES": localizedPath("es", path),
    "x-default": localizedPath(defaultSlug, path),
  };
}
