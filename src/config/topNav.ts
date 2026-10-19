import type { Dictionary } from "@/i18n";

// Links of the top bar (after the logo), in this order. `path` is the app path without the
// language prefix: LobbyLink adds /{lang} (so /casino/slots becomes /en/casino/slots).
// `labelKey` names the label under `topNav` in the four i18n files. The link of the page
// that is shown is highlighted (aria-current="page").
// To add one: add an entry here plus its label in en/zh/de/es; if it is a new page, also
// add it to isLobbyRoute (lib/lobbyTransition.ts) and the sitemap.
export type TopNavItem = {
  id: string;
  labelKey: Exclude<keyof Dictionary["topNav"], "label">;
  path: string;
  featured?: boolean; // drawn as the highlighted pill (.top-nav-featured in globals.css)
};

export const topNavItems: TopNavItem[] = [
  { id: "slots", labelKey: "slots", path: "/casino/slots" },
  { id: "live-dealer", labelKey: "liveDealer", path: "/casino/live-dealer" },
  { id: "sports", labelKey: "sports", path: "/sports" },
  { id: "promotions", labelKey: "promotions", path: "/promotions" },
  { id: "vip", labelKey: "vip", path: "/vip" },
  // Brand name, the same in every language.
  { id: "z-ai", labelKey: "zAi", path: "/z-ai", featured: true },
];

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

// Top links that also appear in the sidebar (the games group, between the dividers), in this
// order. Same labels (topNav.*) and paths as the top bar, so the two never drift apart.
export const sidebarNavIds = ["slots", "live-dealer", "sports"] as const;
export type SidebarNavId = (typeof sidebarNavIds)[number];
export const sidebarNavItems = sidebarNavIds.map((id) => {
  const item = topNavItems.find((entry) => entry.id === id);
  if (!item) throw new Error(`topNav: missing sidebar item "${id}"`);
  return { ...item, id };
});
