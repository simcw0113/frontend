import { localeCookie } from "@/i18n/routing";
import { lobbyLocale } from "@/lib/lobbyApi";

// API `locale` (cn | bm | en | ...) for a BFF route handler: an explicit ?locale= or
// ?lang= on the request, else the NEXT_LOCALE cookie the proxy keeps in sync with the
// URL prefix, else English.
export function requestLocale(request: Request): string {
  const params = new URL(request.url).searchParams;
  const explicit = params.get("locale") || params.get("lang");
  if (explicit) return lobbyLocale(explicit);
  const cookie = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${localeCookie}=`));
  const saved = cookie ? decodeURIComponent(cookie.slice(localeCookie.length + 1)) : "";
  return lobbyLocale(saved || "en");
}

// "/signin" + "cn" -> "/signin?locale=cn"
export function withLocale(path: string, locale: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}locale=${encodeURIComponent(locale)}`;
}
