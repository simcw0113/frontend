import { apiConfig } from "@/config/site";
import { categoryGames, staticGameId, type Game } from "@/config/lobby";
import { apiJson, isApiStatusFailure } from "@/lib/api";
import { useStaticData as isStaticData } from "@/lib/apiMode";
import type { CategoryGamesResult } from "@/lib/games";
import { lobbyLocale, parseGameListPage } from "@/lib/lobbyApi";

// The signed-in player's own game lists: /{lang}/recent and /{lang}/favourites.
// Same static/API switch as the other lobby data (apiConfig.useStaticPlayerGames, static
// while NEXT_PUBLIC_API_BASE_URL is empty). Server only.
//
// User-specific, so NOT cached: no "use cache", fetch with cache: "no-store". The pages pass
// the promise to the lobby, which streams it behind <Suspense> (skeleton, then the grid).
// The token is an HttpOnly cookie (set by /api/auth/login). Pages read it with
// getAuthTokenFromCookie() and pass it as `token`; it is sent as
// `Authorization: Bearer <token>`. Without a token the API is not called and the
// list is empty (the page shows the empty state).
//
// Backend: POST /recent_games and POST /favourite_games with { locale }. The payload is
// the same flat { games, total } shape as a limited game_list, mapped with parseGameListPage
// so GameCover can use the real image / public_code / game_code fields.

export type PlayerGamesOptions = {
  lang: string; // URL language slug: en | cn | de | es
  token?: string | null;
};

const REQUEST_TIMEOUT_MS = 8000;

// Static sample lists (the test cover is already set on categoryGames).
const pick = (ids: string[]): Game[] => {
  const all = Object.values(categoryGames).flat();
  return ids.map((id) => all.find((game) => game.id === id)).filter((game): game is Game => !!game);
};
const STATIC_RECENT = ["lightning-roulette", "hot-reels-777", "speed-baccarat", "neon-sevens", "emperors-fortune", "mega-wheel"].map(staticGameId);
const STATIC_FAVOURITES = ["bonanza-ape", "infinite-blackjack", "hot-reels-777", "vip-baccarat"].map(staticGameId);

function staticEnabled(): boolean {
  const config: Partial<typeof apiConfig> = apiConfig;
  return isStaticData(config.useStaticPlayerGames);
}

function lobbyCountryId() {
  return apiConfig.lobbyCountryId || "1";
}

// Never throws: failures come back as { games: [], error: true }.
async function fromApi(path: string, opts: PlayerGamesOptions): Promise<CategoryGamesResult> {
  if (!opts.token) return { games: [] };
  try {
    const locale = lobbyLocale(opts.lang);
    const query = new URLSearchParams({ locale, lang: opts.lang });
    const payload = await apiJson(`${path}?${query}`, {
      method: "POST",
      auth: false, // the token is passed in explicitly (the browser token helper is client-only)
      headers: {
        "Content-Type": "application/json",
        "country-id": lobbyCountryId(),
        Authorization: `Bearer ${opts.token}`,
      },
      body: JSON.stringify({ locale }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (isApiStatusFailure(payload)) return { games: [], error: true };
    const page = parseGameListPage(payload);
    return { games: page.games, total: page.total };
  } catch {
    return { games: [], error: true };
  }
}

export async function getRecentGames(opts: PlayerGamesOptions): Promise<CategoryGamesResult> {
  if (staticEnabled()) {
    const games = pick(STATIC_RECENT);
    return { games, total: games.length };
  }
  return fromApi(apiConfig.recentGamesPath || "/recent_games", opts);
}

export async function getFavouriteGames(opts: PlayerGamesOptions): Promise<CategoryGamesResult> {
  if (staticEnabled()) {
    const games = pick(STATIC_FAVOURITES);
    return { games, total: games.length };
  }
  return fromApi(apiConfig.favouriteGamesPath || "/favourite_games", opts);
}
