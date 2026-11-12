import { NextResponse, type NextRequest } from "next/server";
import { findCasinoCategory } from "@/config/categories";
import { isStaticGame } from "@/config/gameCatalog";
import { hasApiBaseUrl } from "@/lib/apiMode";
import { apiConfig } from "@/config/site";
import {
  FALLBACK_LANGUAGES,
  STATIC_LANGUAGES,
  defaultLanguage,
  languageCodes,
  parseLanguages,
} from "@/i18n/languages";
import { isSlug, localeCookie, localizedPath, negotiate, stripLocale } from "@/i18n/routing";

// Configured language codes from GET /config `data.languages`, kept in memory for a
// minute (10 s after a failure, which falls back to English only). The pages read the
// same list through lib/siteLanguages.ts ("use cache").
const LANGUAGES_TTL_MS = 60_000;
const LANGUAGES_RETRY_MS = 10_000;
const LANGUAGES_TIMEOUT_MS = 3000;
let languagesCache: { codes: string[]; until: number } | null = null;
let languagesInFlight: Promise<string[]> | null = null;

async function loadLanguageCodes(): Promise<{ codes: string[]; ok: boolean }> {
  try {
    const response = await fetch(`${apiConfig.baseUrl}${apiConfig.configPath}?locale=en`, {
      headers: { Accept: "application/json", "country-id": apiConfig.lobbyCountryId || "1" },
      signal: AbortSignal.timeout(LANGUAGES_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(String(response.status));
    const codes = languageCodes(parseLanguages(await response.json()));
    return codes.length > 0 ? { codes, ok: true } : { codes: languageCodes(FALLBACK_LANGUAGES), ok: false };
  } catch {
    return { codes: languageCodes(FALLBACK_LANGUAGES), ok: false };
  }
}

async function configuredCodes(): Promise<string[]> {
  if (!apiConfig.baseUrl) return languageCodes(STATIC_LANGUAGES);
  if (languagesCache && languagesCache.until > Date.now()) return languagesCache.codes;
  languagesInFlight ??= loadLanguageCodes()
    .then(({ codes, ok }) => {
      languagesCache = { codes, until: Date.now() + (ok ? LANGUAGES_TTL_MS : LANGUAGES_RETRY_MS) };
      return codes;
    })
    .finally(() => {
      languagesInFlight = null;
    });
  return languagesInFlight;
}

// The visitor's language among the configured ones: saved NEXT_LOCALE cookie, then
// Accept-Language, then English (or the first configured language without English).
function preferredCode(request: NextRequest, codes: string[]): string {
  const saved = request.cookies.get(localeCookie)?.value;
  if (saved && codes.includes(saved)) return saved;
  return negotiate(request.headers.get("accept-language"), codes) ?? defaultLanguage(codes);
}

// Sends unprefixed URLs (/, /games, ...) to the visitor's language, and URLs under a
// language that /config does not list (/de/games, or /cn before cn is added in the
// backoffice) to the same page under a configured one.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];
  const codes = await configuredCodes();

  if (isSlug(first) && !codes.includes(first)) {
    const url = request.nextUrl.clone();
    url.pathname = localizedPath(preferredCode(request, codes), stripLocale(pathname));
    return NextResponse.redirect(url, 307);
  }

  if (isSlug(first)) {
    // Unknown casino category: answer 404 right away. (The page also calls
    // notFound(), but with partial prerendering the first hit would stream a 200.)
    // Static game page /{lang}/casino/{category}/game/{id}: an unknown id is a 404
    // (static data only; with the API the page's notFound() is the check).
    // Lobby games use /{lang}/casino/{category}/provider/{public_code}/game/{game_code}.
    const [, , section, category, sub, id, ...rest] = pathname.split("/");
    const unknownGame = sub === "game" && id && rest.length === 0 && !hasApiBaseUrl() && !isStaticGame(category, id);
    if (section === "casino" && category && (!findCasinoCategory(category) || unknownGame)) {
      return NextResponse.rewrite(new URL(`/${first}/not-found`, request.url));
    }
    const response = NextResponse.next();
    if (request.cookies.get(localeCookie)?.value !== first) {
      response.cookies.set(localeCookie, first, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
    return response;
  }

  const url = request.nextUrl.clone();
  url.pathname = localizedPath(preferredCode(request, codes), pathname);
  return NextResponse.redirect(url, 307);
}

export const config = {
  // Skip _next, api and anything with a file extension (robots.txt, sitemap.xml,
  // favicon.ico, icon.svg, images, ...).
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
