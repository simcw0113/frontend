import { cacheLife, cacheTag } from "next/cache";
import { apiConfig } from "@/config/site";
import { apiJson } from "@/lib/api";
import {
  FALLBACK_LANGUAGES,
  STATIC_LANGUAGES,
  defaultLanguage,
  languageCodes,
  parseLanguages,
  type SiteLanguage,
} from "@/i18n/languages";

// Site languages for server components: GET /config `data.languages`, cached like the
// home banners (same endpoint, see lib/banners.ts). revalidateTag("site-languages")
// refreshes it after a backoffice change. Never throws: a failure or an empty list is
// English only (cached for 30 s only); no API address at all is the static en/cn/bm/vi/th set.

const REQUEST_TIMEOUT_MS = 8000;

async function fromApi(): Promise<SiteLanguage[]> {
  "use cache";
  cacheTag("site-languages");

  try {
    const payload = await apiJson(`${apiConfig.configPath}?locale=en`, {
      auth: false,
      headers: { "country-id": apiConfig.lobbyCountryId || "1" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const languages = parseLanguages(payload);
    if (languages.length > 0) {
      cacheLife({ stale: 60, revalidate: 60, expire: 3600 });
      return languages;
    }
  } catch {
    // fall through to English only
  }
  // The [lang] layout reads this outside any Suspense boundary, so a failure is cached
  // briefly (not zero, which would make the whole shell dynamic) and retried after 30 s.
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  return FALLBACK_LANGUAGES;
}

export async function getSiteLanguages(): Promise<SiteLanguage[]> {
  if (!apiConfig.baseUrl) return STATIC_LANGUAGES;
  return fromApi();
}

// Whether `code` is a configured site language.
export async function isSiteLanguage(code: string): Promise<boolean> {
  return languageCodes(await getSiteLanguages()).includes(code);
}

export async function defaultSiteLanguage(): Promise<string> {
  return defaultLanguage(languageCodes(await getSiteLanguages()));
}
