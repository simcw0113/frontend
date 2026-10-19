import type { Dictionary } from "@/i18n";

// THE list of casino categories: home game rows and "View all" pages. Everything below
// derives from `casinoCategories` (in this order), so there is nothing else to register:
//   - a row on the home page (components/lobby/HomeGameContent.tsx), always above Partners,
//     unless the entry has `showOnHome: false` (then it only gets its own page)
//   - its "View all" link and the page /{lang}/casino/{slug}
//   - generateStaticParams, the 404 for unknown slugs (src/proxy.ts), the sitemap and the
//     View all / Back transitions (lib/lobbyTransition.ts)
// (The Explore pop-up chips are separate: config/searchCategories.ts. The top bar links
// are config/topNav.ts.)
//
// To add a row, e.g. "Instant games" (slug `instant-games`):
//   1. Add `{ slug: "instant-games", titleKey: "instantGames", title: "Instant games" }` below
//      (add `showOnHome: false` to keep it off the home page, like live-dealer).
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
  showOnHome?: boolean; // default true; false = own page only, no home row
};

export const casinoCategories: CasinoCategory[] = [
  { slug: "trending-games", titleKey: "trendingGames", title: "Trending games" },
  { slug: "slots", titleKey: "slots", title: "Slots" },
  // Not on the home page for now (top bar link + its own page only).
  { slug: "live-dealer", titleKey: "liveDealer", title: "Live dealer games", showOnHome: false },
];

// The rows of the home page.
export const homeCategories = casinoCategories.filter((category) => category.showOnHome !== false);

export const defaultCasinoCategory = casinoCategories[0];

export function findCasinoCategory(slug: string): CasinoCategory | undefined {
  return casinoCategories.find((category) => category.slug === slug);
}
