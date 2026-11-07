import { apiConfig, TEST_GAME_URL } from "@/config/site";
import { apiJson } from "@/lib/api";
import { useStaticData as isStaticData } from "@/lib/apiMode";

// The game page's iframe URL. Same static/API switch as the other lobby data
// (apiConfig.useStaticGameLaunch): static = TEST_GAME_URL (config/site.ts) for every game,
// used as it is (only the local demo public/demo-game.html gets ?name=). Server only.
//
// Per player and per session, so NOT cached (no "use cache", fetch with cache: "no-store").
// The token is an HttpOnly cookie (set by /api/auth/login). The page reads it with
// getAuthTokenFromCookie() and passes it as `token` (sent as `Authorization: Bearer <token>`).
// Without a token the API is not called and the page asks the guest to sign in (Register);
// a provider "demo" launch for guests could replace that.

export type GameLaunch = { url: string } | { error: "signin" | "failed" };

export type GameLaunchOptions = {
  id: string; // the game id (from the API list; static: config/lobby.ts#staticGameId)
  name: string; // shown by the local demo
  lang: string; // URL language slug: en | cn | de | es
  token?: string | null;
};

const REQUEST_TIMEOUT_MS = 8000;
const DEFAULT_LAUNCH_PATH = "/games/{id}/launch";

export function testGameUrl(name: string): string {
  // Only the local demo reads ?name=; any other test URL is used as it is.
  return TEST_GAME_URL.startsWith("/demo-game.html") ? `${TEST_GAME_URL}?name=${encodeURIComponent(name)}` : TEST_GAME_URL;
}

// Never throws.
export async function getGameLaunch(opts: GameLaunchOptions): Promise<GameLaunch> {
  const config: Partial<typeof apiConfig> = apiConfig;
  if (isStaticData(config.useStaticGameLaunch)) return { url: testGameUrl(opts.name) };
  if (!opts.token) return { error: "signin" };
  try {
    const path = (config.gameLaunchPath || DEFAULT_LAUNCH_PATH).replace("{id}", encodeURIComponent(opts.id));
    // TODO(API): adjust to the real response (e.g. { url } or { data: { launch_url } }).
    const payload = await apiJson<{ url?: string; data?: { url?: string } }>(`${path}?${new URLSearchParams({ lang: opts.lang })}`, {
      auth: false, // the token is passed in explicitly (the browser token helper is client-only)
      headers: { Authorization: `Bearer ${opts.token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const url = payload?.url ?? payload?.data?.url;
    return url ? { url } : { error: "failed" };
  } catch {
    return { error: "failed" };
  }
}
