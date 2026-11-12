import type { Metadata } from "next";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { getHomeBanners } from "@/lib/banners";
import { homeCategories } from "@/config/categories";
import { siteConfig } from "@/config/site";
import { getAllLobbyGames, getCategoryGames, type CategoryGamesResult } from "@/lib/games";
import { HOME_ALL_GAMES_LIMIT } from "@/lib/gameListPaging";
import { getPartners } from "@/lib/partners";
import { getTopWins } from "@/lib/topWins";
import { languageAlternates, localizedPath } from "@/i18n/routing";
import { getSiteLanguages } from "@/lib/siteLanguages";

function homeRowGames(slug: string, lang: string): Promise<CategoryGamesResult> {
  // All Games: POST /game_list page=1, limit=24 (flat paginated list).
  if (slug === "all-games") return getAllLobbyGames(lang, { mix: true, category: "all-games", page: 1, limit: HOME_ALL_GAMES_LIMIT });
  // Slots home row still uses the unpaginated list (no limit) and mixes providers.
  if (slug === "slots") return getAllLobbyGames(lang, { mix: true, category: "slots" });
  return getCategoryGames(slug, { lang });
}

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  return {
    description: siteConfig.description,
    alternates: {
      canonical: localizedPath(lang, "/"),
      languages: languageAlternates("/", await getSiteLanguages()),
    },
  };
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  // Slots on the home page is POST /game_list with no public_code: every provider.
  // Other rows still use the category list.
  const games = Object.fromEntries(
    homeCategories.map(({ slug }) => [slug, homeRowGames(slug, lang)]),
  );
  return (
    <LobbyScreen
      games={games}
      banners={getHomeBanners({ lang })}
      topWins={getTopWins({ lang })}
      partners={getPartners({ lang })}
    />
  );
}
