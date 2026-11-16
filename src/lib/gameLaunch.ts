import { apiConfig, TEST_GAME_URL } from "@/config/site";
import { apiJson, isApiStatusFailure } from "@/lib/api";
import { useStaticData as isStaticData } from "@/lib/apiMode";
import { lobbyLocale } from "@/lib/lobbyApi";

// The game page's launch state. Same static/API switch as the other lobby data
// (apiConfig.useStaticGameLaunch): static = TEST_GAME_URL (config/site.ts) for every game,
// used as it is (only the local demo public/demo-game.html gets ?name=). Server only.
// With the API the game is not opened here: POST /opengame moves wallet money into the game,
// so the page first asks how much ({ ask: true }, GameView's AmountPanel) and then opens it
// through /api/lobby/launch (getProviderLaunch with `amount`). Guests are asked to sign in.

export type GameLaunch = { url: string } | { ask: true } | { error: "signin" | "failed" };

export type GameLaunchOptions = {
  provider?: string; // product public_code
  game?: string; // inner game code (game_list game_code)
  name: string; // shown by the local demo
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

export function getGameLaunch(opts: GameLaunchOptions): GameLaunch {
  const config: Partial<typeof apiConfig> = apiConfig;
  if (isStaticData(config.useStaticGameLaunch)) return { url: testGameUrl(opts.name) };
  if (!opts.token) return { error: "signin" };
  return opts.provider?.trim() && opts.game?.trim() ? { ask: true } : { error: "failed" };
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
  amount?: string | null; // wallet money to move into the game; null = none, omitted = all of it
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
      body: JSON.stringify({ provider, ...(game ? { game } : {}), ...(opts.amount !== undefined ? { amount: opts.amount } : {}) }),
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
