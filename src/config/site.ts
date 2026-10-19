const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const siteConfig = {
  name: "Game Lobby",
  description: "Casino games and sports markets together in one lobby.",
  url: siteUrl.replace(/\/$/, ""),
  // Top bar logo (an image in public/). To change it, replace the file or point `src` at a new
  // one and update width/height (the file's pixel size); the alt text is the translated site name.
  // NOTE: the current file is a neon mark used as a placeholder; swap in the real brand logo.
  logo: { src: "/brand/logo.png", width: 288, height: 168 },
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
  loginPath: "/auth/login",
  registerPath: "/auth/register",
  // TODO(API): placeholder. {category} is replaced by the slug ("slots", "trending-games");
  // lang, provider, page and q are sent as query parameters.
  categoryGamesPath: "/games/category/{category}",
  // TODO(API): placeholder for the Explore search. Query: q, category, page, pageSize, lang.
  searchGamesPath: "/games/search",
  // TODO(API): placeholder for the monthly top wins list; lang is sent as a query parameter.
  topWinsPath: "/wins/top-month",
  // TODO(API): placeholder for the partner list (id, name, logo URL); lang is sent as a query parameter.
  partnersPath: "/partners",
  // TODO(API): placeholder for the promotions list (already localized); lang is sent as a query parameter.
  promotionsPath: "/promotions",
};
