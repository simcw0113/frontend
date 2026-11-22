import type { Dictionary } from "@/i18n";
import { casinoCategories, findCasinoCategory, pinLastItems } from "@/config/categories";
import { VIP_ENABLED } from "@/config/vip";

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

// Casino categories + Sports for the top bar. All Games is omitted from the top bar only;
// the sidebar still lists it (sidebarNavItems below).
const gameNavItems: TopNavItem[] = [
  ...casinoCategories.filter((category) => category.slug !== "all-games").map(categoryNavItem),
  sportsNavItem,
];

const afterGamesNavItems: TopNavItem[] = [
  { id: "promotions", labelKey: "promotions", path: "/promotions" },
  ...(VIP_ENABLED ? [{ id: "vip", labelKey: "vip", path: "/vip" } as const] : []),
  // Brand name, the same in every language.
  { id: "z-ai", labelKey: "zAi", path: "/z-ai", featured: true },
];

export const topNavItems: TopNavItem[] = [...gameNavItems, ...afterGamesNavItems];

// PC top bar: false hides Hot Games … Promotions/VIP, leaving only the featured link (Z-AI).
// The sidebar and footer still list them. Set true to show them again.
export const TOP_NAV_LINKS_SHOWN = false;

// Sidebar-only, in the bottom group right above the language selector (not in the top bar). Label under `menu`.
export const sidebarAffiliateItem = { id: "affiliate", labelKey: "affiliate", path: "/affiliate" } as const;

// Sidebar items of the player's own pages, right under Home (labels under `menu`).
export const sidebarPlayerItems = [
  { id: "recent", labelKey: "recent", path: "/recent" },
  { id: "favourites", labelKey: "favourites", path: "/favourites" },
  { id: "missions", labelKey: "missions", path: "/missions" },
] as const;

// Top links that also appear in the sidebar with Promotions (labels under `topNav`).
export const sidebarPromoItems = (["promotions", "vip"] as const).filter((id) => VIP_ENABLED || id !== "vip").map((id) => {
  const item = topNavItems.find((entry) => entry.id === id);
  if (!item) throw new Error(`topNav: missing sidebar item "${id}"`);
  return { ...item, id };
});

// The games group of the sidebar (between the dividers): the top bar's games cluster plus
// All Games, which is pinned last here but not shown in the top bar.
export const sidebarNavItems: TopNavItem[] = pinLastItems(
  [...casinoCategories.map(categoryNavItem), sportsNavItem],
  (item) => findCasinoCategory(item.id)?.pinLast === true,
);
export const sidebarNavIds = sidebarNavItems.map((item) => item.id);
export type SidebarNavId = (typeof sidebarNavItems)[number]["id"];

// Sidebar-only, right under All Games (end of the games group): the provider grid page. Label under `lobby`.
export const sidebarProvidersItem = { id: "providers", labelKey: "providers", path: "/providers" } as const;
