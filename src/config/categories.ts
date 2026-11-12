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
//   2. Add `"instantGames": "..."` under `lobby` in the i18n files (en, zh, bm, vi, th, de, es).
//   3. Games: tagged lists use `tagged` + POST /game_tags (lib/gameTags.ts). Otherwise add a
//      static list in config/lobby.ts and register it in `categoryGames` under the slug
//      (with an API address set, getCategoryGames(slug) calls the API instead; without data
//      the home row is hidden and the category page shows "Nothing here yet").
//   4. Nothing to change in pages, sitemap, proxy or components.
//   5. Check: `npm run build` lists /[lang]/casino/instant-games, then `npm run check:lobby`.
// `titleKey` is the heading in the message files (lobby.*), `title` the English name used
// for page metadata. Static for now; swap for the categories API later.
// `tagged` is a POST /game_tags label: the category page shows that list (no provider
// browser). Old URLs under /casino/trending-games redirect to /casino/hot-games (proxy.ts).
export type GameTagLabel = "hot" | "new" | "popular" | "recommended" | "featured";

export type CasinoCategory = {
  slug: string;
  titleKey: keyof Dictionary["lobby"];
  title: string;
  showOnHome?: boolean; // default true; false = own page only, no home row
  luckyPick?: boolean; // show the "Lucky Pick" random-game reel on its page (components/lobby/LuckyPick.tsx)
  tagged?: GameTagLabel; // POST /game_tags label; category page shows this list, no provider row
  pinLast?: boolean; // always rendered last among home rows
};

// Keeps pinLast items in source order, but after every item that is not pinned.
// Used so "All Games" stays the last home row even when new categories are inserted later.
export function pinLastItems<T>(items: readonly T[], isPinned: (item: T) => boolean): T[] {
  const leading: T[] = [];
  const trailing: T[] = [];
  for (const item of items) {
    (isPinned(item) ? trailing : leading).push(item);
  }
  return [...leading, ...trailing];
}

export const casinoCategories: CasinoCategory[] = [
  { slug: "hot-games", titleKey: "hotGames", title: "Hot Games", tagged: "hot" },
  { slug: "new-release", titleKey: "newRelease", title: "New Release", tagged: "new" },
  { slug: "slots", titleKey: "slots", title: "Slots", luckyPick: true },
  // Not on the home page for now (top bar link + its own page only).
  { slug: "live-dealer", titleKey: "liveDealer", title: "Live dealer games", showOnHome: false },
  // pinLast: always the last home row. Not listed in the top bar or the sidebar.
  { slug: "all-games", titleKey: "allGames", title: "All Games", pinLast: true },
];

// The rows of the home page (All Games is pinned last). Not shown in the top bar or sidebar.
export const homeCategories = pinLastItems(
  casinoCategories.filter((category) => category.showOnHome !== false),
  (category) => category.pinLast === true,
);

export const defaultCasinoCategory = casinoCategories[0];

export function findCasinoCategory(slug: string): CasinoCategory | undefined {
  return casinoCategories.find((category) => category.slug === slug);
}

export function tagLabelFor(slug: string): GameTagLabel | undefined {
  return findCasinoCategory(slug)?.tagged;
}
