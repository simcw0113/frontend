const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const siteConfig = {
  name: "Zenwick",
  description: "Casino games and sports markets together in one lobby.",
  url: siteUrl.replace(/\/$/, ""),
  // Top bar logo (public/brand/). Width/height = file pixel size; CSS scales with h-9 / object-contain.
  // Branch mark: lion + Z shield + ZENWICK wordmark (transparent PNG from WhatsApp source).
  logo: { src: "/brand/logo-zenwick.png", width: 848, height: 837 },
};

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

export const apiConfig = {
  baseUrl: apiBaseUrl,
  // Single switch for the game lists (src/lib/games.ts): true = static data from
  // config/lobby.ts (automatic while there is no API address), false = the API.
  // Replace the expression with a literal to force one or the other.
  useStaticGames: !apiBaseUrl,
  // Same switch for "Top wins of the month" (src/lib/topWins.ts).
  useStaticTopWins: !apiBaseUrl,
  // Same switch for "Our Partners" (src/lib/partners.ts).
  useStaticPartners: !apiBaseUrl,
  // Same switch for the promotions page (src/lib/promotions.ts).
  useStaticPromotions: !apiBaseUrl,
  // Same switch for the player's Recent games / Favourites pages (src/lib/playerGames.ts).
  useStaticPlayerGames: !apiBaseUrl,
  // Same switch for the game page's launch URL (src/lib/gameLaunch.ts): true = TEST_GAME_URL.
  useStaticGameLaunch: !apiBaseUrl,
  loginPath: "/signin",
  registerPath: "/signup",
  infoPath: "/info",
  balancePath: "/get_balance",
  configPath: "/config",
  gameListPath: "/game_list",
  // POST /game_tags. Optional body/query: label (default hot), limit (default 30, max 60), locale.
  // Path lives only here so a backend rename is a one-line change.
  gameTagsPath: "/game_tags",
  // POST /game_list body is `{ public_code }` or `{}` for every provider.
  // Sent as the `country-id` header on POST /game_list.
  lobbyCountryId: process.env.NEXT_PUBLIC_LOBBY_COUNTRY_ID ?? "1",
  // TODO(API): placeholder. {category} is replaced by the slug ("slots", "hot-games");
  // lang, provider, page and q are sent as query parameters.
  categoryGamesPath: "/games/category/{category}",
  // TODO(API): placeholder for the Explore search. Query: q, category, page, pageSize, lang.
  searchGamesPath: "/games/search",
  // POST /top_wins. Body: { locale }. Public, cached. Days and count are backend admin settings.
  topWinsPath: "/top_wins",
  // TODO(API): placeholder for the partner list (id, name, logo URL); lang is sent as a query parameter.
  partnersPath: "/partners",
  // POST /promotion. Body: { locale }. Header: country-id. Text is already localized.
  // `data[0]` is every promo (category 0 = all); later indexes are category buckets.
  promotionsPath: "/promotion",
  // POST /recent_games and /favourite_games (Bearer token, never cached).
  // Body: { locale } (and `simple: 1` for the compact favourite list of public_code + game_code).
  recentGamesPath: "/recent_games",
  favouriteGamesPath: "/favourite_games",
  favouriteGamesAddPath: "/favourite_games_add",
  favouriteGamesRemovePath: "/favourite_games_remove",
  // POST /opengame. Body is { provider: public_code, game: game_code }.
  // Sent with Authorization: Bearer <token> and a country-id header. Never cached.
  gameLaunchPath: "/opengame",
  // POST /task_list (token optional: adds progress) and /claim_task_reward { task_id }. Body has { locale }.
  taskListPath: "/task_list",
  claimTaskPath: "/claim_task_reward",
};

// Sportsbook. The product is the one picked in BO (GET /config data.sports_product);
// none picked -> the sports page shows "unavailable".
// /opengame is called as { provider: public_code, isMobile } — not { code }.
// `publicCode` is an optional override (SPORTS_PUBLIC_CODE or NEXT_PUBLIC_SPORTS_PUBLIC_CODE)
// so a specific public_code can be forced without waiting on the product list.
export const sportsConfig = {
  publicCode: (process.env.SPORTS_PUBLIC_CODE ?? process.env.NEXT_PUBLIC_SPORTS_PUBLIC_CODE ?? "").trim(),
};

// TEMPORARY test URL for the game page iframe while there is no launch API (static mode), the
// same for every game: a YouTube video (https://www.youtube.com/watch?v=P4sGaqucJcs) in its
// embed form, since watch pages refuse framing. Used as it is (no query added); only the local demo
// "/demo-game.html" (public/, kept for offline testing) gets ?name=<game name>.
// External sites can refuse to be framed (X-Frame-Options / CSP frame-ancestors): the frame
// then stays blank or shows the browser's error page.
export const TEST_GAME_URL = "https://www.youtube.com/embed/P4sGaqucJcs";
