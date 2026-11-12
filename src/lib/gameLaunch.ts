import { apiConfig, TEST_GAME_URL } from "@/config/site";
import { apiJson, isApiStatusFailure } from "@/lib/api";
import { useStaticData as isStaticData } from "@/lib/apiMode";
import { lobbyLocale } from "@/lib/lobbyApi";

// The game page's iframe URL. Same static/API switch as the other lobby data
// (apiConfig.useStaticGameLaunch): static = TEST_GAME_URL (config/site.ts) for every game,
// used as it is (only the local demo public/demo-game.html gets ?name=). Server only.
//
// Per player and per session, so NOT cached (no "use cache", fetch with cache: "no-store").
// The token is an HttpOnly; Secure; SameSite=Lax cookie (set by /api/auth/login).
// The page reads it with getAuthTokenFromCookie() and sends `Authorization: Bearer <token>`.
// This lobby does not send `session_token`. Without a token the API is not called and
// the page asks the guest to sign in (Register).

export type GameLaunch = { url: string } | { error: "signin" | "failed" };

export type GameLaunchOptions = {
  provider?: string; // product public_code
  game?: string; // inner game code (game_list game_code)
  name: string; // shown by the local demo
  lang: string; // URL language slug: en | cn | de | es
  token?: string | null;
};

const REQUEST_TIMEOUT_MS = 8000;
const DEFAULT_LAUNCH_PATH = "/opengame";

export function testGameUrl(name: string): string {
  // Only the local demo reads ?name=; any other test URL is used as it is.
  return TEST_GAME_URL.startsWith("/demo-game.html") ? `${TEST_GAME_URL}?name=${encodeURIComponent(name)}` : TEST_GAME_URL;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// Current /launch puts the iframe URL on `launcher`. Also accept `url`.
function readLaunchUrl(payload: unknown): string {
  const root = asRecord(payload);
  if (!root) return "";
  const data = asRecord(root.data);
  // `launcher` is `{ url }` on /opengame; a plain string is also accepted.
  const launcher = root.launcher ?? data?.launcher ?? data?.url ?? root.url;
  if (typeof launcher === "string") return launcher.trim();
  return text(asRecord(launcher)?.url);
}

// Never throws.
export async function getGameLaunch(opts: GameLaunchOptions): Promise<GameLaunch> {
  const config: Partial<typeof apiConfig> = apiConfig;
  if (isStaticData(config.useStaticGameLaunch)) return { url: testGameUrl(opts.name) };
  if (!opts.token) return { error: "signin" };
  const provider = opts.provider?.trim() ?? "";
  const game = opts.game?.trim() ?? "";
  if (!provider || !game) return { error: "failed" };
  try {
    const path = config.gameLaunchPath || DEFAULT_LAUNCH_PATH;
    // POST /opengame { provider: public_code, game: game_code }.
    const payload = await apiJson(`${path}?${new URLSearchParams({ lang: opts.lang, locale: lobbyLocale(opts.lang) })}`, {
      method: "POST",
      auth: false, // the token is passed in explicitly (the browser token helper is client-only)
      headers: {
        Authorization: `Bearer ${opts.token}`,
        "Content-Type": "application/json",
        "country-id": config.lobbyCountryId || "1",
        locale: lobbyLocale(opts.lang),
      },
      body: JSON.stringify({ provider, game }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (isApiStatusFailure(payload)) return { error: "failed" };
    const url = readLaunchUrl(payload);
    return url ? { url } : { error: "failed" };
  } catch {
    return { error: "failed" };
  }
}

// Web (type 1), App (type 2) and Deep Link (type 4) products. POST /opengame
// with only `{ provider }`. Responses:
//   redirect: launcher.url
//   app:      launcher { member_account { username, password }, ios_url, android_url, balance }
//   deeplink: the app fields plus launcher.url
export type ProviderLaunch =
  | {
      kind: "redirect" | "app" | "deeplink";
      url?: string;
      username?: string;
      password?: string;
      iosUrl?: string;
      androidUrl?: string;
      balance?: string;
    }
  | { error: "signin" | "failed"; message?: string };

function readMessage(payload: unknown): string | undefined {
  const message = text(asRecord(payload)?.message);
  return message || undefined;
}

// Never throws.
export async function getProviderLaunch(opts: {
  provider: string;
  game?: string;
  lang: string;
  token?: string | null;
}): Promise<ProviderLaunch> {
  if (!opts.token) return { error: "signin" };
  const provider = opts.provider.trim();
  if (!provider) return { error: "failed" };
  const game = opts.game?.trim() ?? "";
  const config: Partial<typeof apiConfig> = apiConfig;
  try {
    const path = config.gameLaunchPath || DEFAULT_LAUNCH_PATH;
    const payload = await apiJson(`${path}?${new URLSearchParams({ lang: opts.lang, locale: lobbyLocale(opts.lang) })}`, {
      method: "POST",
      auth: false,
      headers: {
        Authorization: `Bearer ${opts.token}`,
        "Content-Type": "application/json",
        "country-id": config.lobbyCountryId || "1",
        locale: lobbyLocale(opts.lang),
      },
      body: JSON.stringify(game ? { provider, game } : { provider }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const root = asRecord(payload);
    if (!root || isApiStatusFailure(payload)) return { error: "failed", message: readMessage(payload) };
    const kind = text(root.type);
    const launcher = asRecord(root.launcher);
    if (kind === "app" || kind === "deeplink") {
      const account = asRecord(launcher?.member_account);
      const balance = launcher?.balance;
      return {
        kind,
        url: text(launcher?.url) || undefined,
        username: text(account?.username) || undefined,
        password: text(account?.password) || undefined,
        iosUrl: text(launcher?.ios_url) || undefined,
        androidUrl: text(launcher?.android_url) || undefined,
        balance: typeof balance === "number" || typeof balance === "string" ? String(balance) : undefined,
      };
    }
    const url = readLaunchUrl(payload);
    return url ? { kind: "redirect", url } : { error: "failed", message: readMessage(payload) };
  } catch {
    return { error: "failed" };
  }
}
