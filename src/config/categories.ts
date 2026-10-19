import type { Dictionary } from "@/i18n";

// THE list of home game rows and "View all" pages. Everything below derives from
// `casinoCategories` (in this order), so there is nothing else to register:
//   - a row on the home page (components/lobby/HomeGameContent.tsx), always above Partners
//   - its "View all" link and the page /{lang}/casino/{slug}
//   - generateStaticParams, the 404 for unknown slugs (src/proxy.ts), the sitemap and the
//     View all / Back transitions (lib/lobbyTransition.ts)
// (The Explore pop-up chips are separate: config/searchCategories.ts.)
//
// To add a row, e.g. "Instant games" (slug `instant-games`):
//   1. Add `{ slug: "instant-games", titleKey: "instantGames", title: "Instant games" }` below.
//   2. Add `"instantGames": "..."` under `lobby` in all four i18n files (en, zh, de, es).
//   3. Games: add a static list to config/lobby.ts and register it in `categoryGames`
//      under the slug (with an API address set, getCategoryGames(slug) calls the API
//      instead, see lib/games.ts; without data the row shows "Nothing here yet").
//   4. Nothing to change in pages, sitemap, proxy or components.
//   5. Check: `npm run build` lists /[lang]/casino/instant-games, then `npm run check:lobby`.
// `titleKey` is the heading in the message files (lobby.*), `title` the English name used
// for page metadata. Static for now; swap for the categories API later.
export type CasinoCategory = {
  slug: string;
  titleKey: keyof Dictionary["lobby"];
  title: string;
};

export const casinoCategories: CasinoCategory[] = [
  { slug: "trending-games", titleKey: "trendingGames", title: "Trending games" },
  { slug: "slots", titleKey: "slots", title: "Slots" },
];

export const defaultCasinoCategory = casinoCategories[0];

export function findCasinoCategory(slug: string): CasinoCategory | undefined {
  return casinoCategories.find((category) => category.slug === slug);
}
