// Locale-prefixed URLs (/en, /cn, /bm). The prefix is the backend language code from
// GET /config `data.languages` (see ./languages.ts); which codes are live is decided at
// request time, so the helpers here only check the shape of a segment. Kept free of the
// message JSON so the proxy can import it.
import { DEFAULT_CODE, isLanguageCode } from "@/i18n/languages";
import type { SiteLanguage } from "@/i18n/languages";

// A backend language code used as the URL prefix ("en", "cn", "bm", ...).
export type LocaleSlug = string;

export const defaultSlug: LocaleSlug = DEFAULT_CODE;
export const localeCookie = "NEXT_LOCALE";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// Shape check only (two letters, optional region). Whether the language is configured
// is checked by the proxy and the [lang] layout against /config.
export function isSlug(value: string | null | undefined): value is LocaleSlug {
  return isLanguageCode(value);
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

// Picks the best configured language from an Accept-Language header.
// Browser tags are mapped to backend codes: zh-* -> cn, ms-* -> bm.
export function negotiate(header: string | null, codes: readonly string[]): LocaleSlug | null {
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
    const code = primary === "zh" ? "cn" : primary === "ms" ? "bm" : primary;
    if (codes.includes(tag)) return tag;
    if (codes.includes(code)) return code;
  }
  return null;
}

export function setLocaleCookie(slug: LocaleSlug) {
  document.cookie = `${localeCookie}=${slug}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

// hreflang tag for a backend language code.
export function hreflang(code: string): string {
  if (code === "cn") return "zh-Hans";
  if (code === "bm") return "ms";
  if (code === "en") return "en-US";
  return code;
}

// <link rel="alternate" hreflang> map for a page, given its path without prefix and the
// configured languages (getSiteLanguages()).
export function languageAlternates(path: string, languages: SiteLanguage[]): Record<string, string> {
  const codes = languages.map((language) => language.code);
  const alternates: Record<string, string> = Object.fromEntries(
    codes.map((code) => [hreflang(code), localizedPath(code, path)]),
  );
  alternates["x-default"] = localizedPath(codes.includes(defaultSlug) ? defaultSlug : (codes[0] ?? defaultSlug), path);
  return alternates;
}
