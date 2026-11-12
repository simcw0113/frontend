import type { Metadata } from "next";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { getHomeBanners } from "@/lib/banners";
import { homeCategories } from "@/config/categories";
import { siteConfig } from "@/config/site";
import type { Game } from "@/config/lobby";
import { getCategoryGames, type CategoryGamesResult } from "@/lib/games";
import { loadLobbyGames, lobbyLocale } from "@/lib/lobbyApi";
import { getPartners } from "@/lib/partners";
import { getTopWins } from "@/lib/topWins";
import { languageAlternates, localizedPath } from "@/i18n/routing";
import { getSiteLanguages } from "@/lib/siteLanguages";

// The home row only shows the first 8. Round-robin so those 8 are not all one provider.
function mixProviders(games: Game[]): Game[] {
  const groups = new Map<string, Game[]>();
  for (const game of games) {
    const key = game.publicCode || game.provider;
    const bucket = groups.get(key);
    if (bucket) bucket.push(game);
    else groups.set(key, [game]);
  }
  const mixed: Game[] = [];
  const buckets = [...groups.values()];
  for (let index = 0; mixed.length < games.length; index += 1) {
    let added = false;
    for (const bucket of buckets) {
      const game = bucket[index];
      if (!game) continue;
      mixed.push(game);
      added = true;
    }
    if (!added) break;
  }
  return mixed;
}

// Home slots row: every provider, because POST /game_list is called with no public_code.
function homeSlotGames(lang: string): Promise<CategoryGamesResult> {
  return loadLobbyGames(lobbyLocale(lang)).then(({ games, error }) => ({
    games: mixProviders(games),
    total: games.length,
    ...(error ? { error: true as const } : {}),
  }));
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
    homeCategories.map(({ slug }) => [slug, slug === "slots" ? homeSlotGames(lang) : getCategoryGames(slug, { lang })]),
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
