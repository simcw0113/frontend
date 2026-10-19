import type { Dictionary } from "@/i18n";

// Casino categories that have their own "View all" page: /{lang}/casino/{slug}.
// Each one is also a row on the home page, in this order; its games are in
// categoryGames (config/lobby.ts), keyed by slug. Static for now; swap for the
// categories API later. `titleKey` is the heading in the message files
// (lobby.*), `title` the English name used for page metadata.
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
