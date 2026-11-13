import type { Dictionary } from "@/i18n";
import { casinoCategories } from "@/config/categories";

// Links of the top bar (after the logo), in this order. `path` is the app path without the
// language prefix: LobbyLink adds /{lang} (so /casino/slots becomes /en/casino/slots).
// `labelKey` names the label under `topNav` in the i18n files. The link of the page
// that is shown is highlighted (aria-current="page").
// To add one: add an entry here plus its label in en/zh/bm/vi/th (src/i18n); if it is a new page, also
// add it to isLobbyRoute (lib/lobbyTransition.ts) and the sitemap.
export type TopNavItem = {
  id: string;
  labelKey: Exclude<keyof Dictionary["topNav"], "label">;
  path: string;
  featured?: boolean; // drawn as the highlighted pill (.top-nav-featured in globals.css)
};

function categoryNavItem(category: (typeof casinoCategories)[number]): TopNavItem {
  // lobby title keys for these categories are also keys of topNav.
  return {
    id: category.slug,
    labelKey: category.titleKey as TopNavItem["labelKey"],
    path: `/casino/${category.slug}`,
  };
}

const sportsNavItem: TopNavItem = { id: "sports", labelKey: "sports", path: "/sports" };

// Casino categories + Sports. All Games stays on the home row and /casino/all-games,
// but is omitted from the top bar and the sidebar.
const gameNavItems: TopNavItem[] = [
  ...casinoCategories.filter((category) => category.slug !== "all-games").map(categoryNavItem),
  sportsNavItem,
];

const afterGamesNavItems: TopNavItem[] = [
  { id: "promotions", labelKey: "promotions", path: "/promotions" },
  { id: "vip", labelKey: "vip", path: "/vip" },
  // Brand name, the same in every language.
  { id: "z-ai", labelKey: "zAi", path: "/z-ai", featured: true },
];

export const topNavItems: TopNavItem[] = [...gameNavItems, ...afterGamesNavItems];

// Sidebar-only page of the promotions group, right below Promotions (label under `menu`).
export const sidebarMissionsItem = { id: "missions", labelKey: "missions", path: "/missions" } as const;

// Sidebar-only, after VIP (not in the top bar). Label under `menu`.
export const sidebarAffiliateItem = { id: "affiliate", labelKey: "affiliate", path: "/affiliate" } as const;

// Sidebar items of the player's own pages, right under Home (labels under `menu`).
export const sidebarPlayerItems = [
  { id: "recent", labelKey: "recent", path: "/recent" },
  { id: "favourites", labelKey: "favourites", path: "/favourites" },
] as const;

// Top links that also appear in the sidebar with Promotions (labels under `topNav`).
export const sidebarPromoItems = (["promotions", "vip"] as const).map((id) => {
  const item = topNavItems.find((entry) => entry.id === id);
  if (!item) throw new Error(`topNav: missing sidebar item "${id}"`);
  return { ...item, id };
});

// Top links that also appear in the sidebar (the games group, between the dividers).
// Same order as the games cluster in the top bar.
export const sidebarNavItems = gameNavItems;
export const sidebarNavIds = sidebarNavItems.map((item) => item.id);
export type SidebarNavId = (typeof sidebarNavItems)[number]["id"];
