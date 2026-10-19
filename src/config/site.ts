const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const siteConfig = {
  name: "Game Lobby",
  description: "Casino games and sports markets together in one lobby.",
  url: siteUrl.replace(/\/$/, ""),
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
  loginPath: "/auth/login",
  registerPath: "/auth/register",
  // TODO(API): placeholder. {category} is replaced by the slug ("slots", "trending-games");
  // lang, provider, page and q are sent as query parameters.
  categoryGamesPath: "/games/category/{category}",
  // TODO(API): placeholder for the Explore search. Query: q, category, page, pageSize, lang.
  searchGamesPath: "/games/search",
  // TODO(API): placeholder for the monthly top wins list; lang is sent as a query parameter.
  topWinsPath: "/wins/top-month",
};
