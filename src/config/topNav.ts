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
};

export const topNavItems: TopNavItem[] = [
  { id: "slots", labelKey: "slots", path: "/casino/slots" },
  { id: "live-dealer", labelKey: "liveDealer", path: "/casino/live-dealer" },
  { id: "sports", labelKey: "sports", path: "/sports" },
  { id: "promotions", labelKey: "promotions", path: "/promotions" },
  { id: "vip", labelKey: "vip", path: "/vip" },
];
