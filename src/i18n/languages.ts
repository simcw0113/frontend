// Site languages from GET /config `data.languages` ([{ code, name }], set in the
// backoffice "Add Language" page). The code is the URL slug and the `locale` sent to
// the API; the name is the switcher label. Kept free of next/cache and the message
// JSON so the proxy can import it.

export type SiteLanguage = { code: string; name: string };

export const DEFAULT_CODE = "en";

// When /config fails or lists nothing: English only.
export const FALLBACK_LANGUAGES: SiteLanguage[] = [{ code: DEFAULT_CODE, name: "English" }];

// No API address at all (static demo mode): every language with a UI file.
export const STATIC_LANGUAGES: SiteLanguage[] = [
  { code: "en", name: "English" },
  { code: "cn", name: "中文" },
  { code: "bm", name: "Bahasa Melayu" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "th", name: "ไทย" },
];

// A language URL segment: "en", "cn", "bm", or a region form like "zh-tw". No app route
// is two letters, so this never matches /vip, /games, /casino, ...
const CODE_PATTERN = /^[a-z]{2}(?:-[a-z0-9]{2,4})?$/;

export function isLanguageCode(value: string | null | undefined): value is string {
  return typeof value === "string" && CODE_PATTERN.test(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

// Reads `data.languages` from a /config payload. Invalid or duplicate rows are skipped;
// an empty result means "fall back".
export function parseLanguages(payload: unknown): SiteLanguage[] {
  const root = asRecord(payload);
  const list = asRecord(root?.data)?.languages ?? root?.languages;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const languages: SiteLanguage[] = [];
  for (const item of list) {
    const row = asRecord(item);
    const code = typeof row?.code === "string" ? row.code.trim().toLowerCase() : "";
    if (!isLanguageCode(code) || seen.has(code)) continue;
    seen.add(code);
    const name = typeof row?.name === "string" && row.name.trim() ? row.name.trim() : code.toUpperCase();
    languages.push({ code, name });
  }
  return languages;
}

export function languageCodes(languages: SiteLanguage[]): string[] {
  return languages.map((language) => language.code);
}

// English when it is configured, otherwise the first configured language.
export function defaultLanguage(codes: readonly string[]): string {
  return codes.includes(DEFAULT_CODE) ? DEFAULT_CODE : (codes[0] ?? DEFAULT_CODE);
}
