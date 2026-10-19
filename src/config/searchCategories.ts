import type { Dictionary } from "@/i18n";

// Category chips of the "Explore" search pop-up. `id` is what the search API
// receives as `category` (and the allow-list the route handler validates it
// against); `titleKey` names the label in i18n `search.categories`.
// TODO(API): the chip list (ids and order) may come from the API later; keep the
// ids in sync with whatever the search endpoint accepts.
export type SearchCategory = {
  id: string;
  titleKey: keyof Dictionary["search"]["categories"];
};

export const searchCategories = [
  { id: "all", titleKey: "all" },
  { id: "slots", titleKey: "slots" },
  { id: "live-casino", titleKey: "liveCasino" },
  { id: "baccarat", titleKey: "baccarat" },
  { id: "blackjack", titleKey: "blackjack" },
  { id: "roulette", titleKey: "roulette" },
  { id: "game-shows", titleKey: "gameShows" },
  { id: "sic-bo", titleKey: "sicBo" },
] as const satisfies readonly SearchCategory[];

export type SearchCategoryId = (typeof searchCategories)[number]["id"];

export const defaultSearchCategory: SearchCategoryId = "all";

export function isSearchCategory(value: string): value is SearchCategoryId {
  return searchCategories.some((category) => category.id === value);
}
