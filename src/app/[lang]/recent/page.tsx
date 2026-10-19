import type { Metadata } from "next";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { dictionaries } from "@/i18n";
import { fromSlug, isSlug, languageAlternates, localizedPath } from "@/i18n/routing";
import { getRecentGames } from "@/lib/playerGames";

const PATH = "/recent";

// The player's own list: not indexed (robots noindex) and not in the sitemap.
export async function generateMetadata({ params }: PageProps<"/[lang]/recent">): Promise<Metadata> {
  const { lang } = await params;
  const t = dictionaries[isSlug(lang) ? fromSlug(lang) : "en"];
  return {
    title: t.menu.recent,
    description: t.playerGames.recentMeta,
    robots: { index: false, follow: false },
    alternates: {
      canonical: isSlug(lang) ? localizedPath(lang, PATH) : undefined,
      languages: languageAlternates(PATH),
    },
  };
}

// The lobby shell (header, sidebar, title bar, footer) with the game grid. `params` is not
// awaited here (Instant navigation: URL data stays out of the shared App Shell); the list is a
// promise chained on it, streamed through <Suspense> (skeleton until it resolves).
// TODO(API): pass the signed-in player's token once it is readable on the server (lib/playerGames.ts).
export default function RecentGamesPage({ params }: PageProps<"/[lang]/recent">) {
  const games = params.then(({ lang }) => getRecentGames({ lang }));
  return <LobbyScreen focus="recent" games={{}} playerGames={games} />;
}
