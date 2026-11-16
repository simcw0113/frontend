import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { GameView, GameViewSkeleton } from "@/components/lobby/GameView";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { findCasinoCategory } from "@/config/categories";
import { gameCatalog } from "@/config/gameCatalog";
import { categoryGames } from "@/config/lobby";
import { getGameDetails } from "@/lib/games";
import { getAuthTokenFromCookie } from "@/lib/authCookie";
import { getGameLaunch } from "@/lib/gameLaunch";
import { languageAlternates, localizedPath } from "@/i18n/routing";
import { getSiteLanguages } from "@/lib/siteLanguages";

type Props = PageProps<"/[lang]/casino/[category]/game/[id]">;

// /casino/{category}/game/{id}. Static catalog games use their own id
// (config/lobby.ts#staticGameId). Lobby games use
// /casino/{category}/provider/{public_code}/game/{game_code} instead.
// The static games of the category are prerendered (the API's render on demand). Cache
// Components needs at least one result per category, so a category without samples
// prerenders one catalog game (a 404 there unless it belongs to it).
export function generateStaticParams({ params }: { params: { category: string } }) {
  const games = categoryGames[params.category] ?? [];
  return (games.length > 0 ? games : gameCatalog.slice(0, 1)).map((game) => ({ id: game.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, category, id } = await params;
  const details = findCasinoCategory(category) ? await getGameDetails(category, id, { lang }) : null;
  if (!details) return {};
  const path = `/casino/${category}/game/${id}`;
  return {
    title: details.game.title, // the game name, not the id
    description: details.game.description ?? `${details.game.title} · ${details.game.provider}`,
    alternates: {
      canonical: localizedPath(lang, path),
      languages: languageAlternates(path, await getSiteLanguages()),
    },
  };
}

// Game page: the iframe, its control bar, the info card and "Recommended Games".
// Instant navigation: `params` (URL data) is read only inside <Suspense> (StaticGame). The lobby
// shell renders without it (the client reads category/id with useParams()); the game, its
// launch URL and the recommended row stream in (skeleton frame until then). Unknown ids, and
// ids of another category, get a real 404 from proxy.ts in static mode; StaticGame keeps
// notFound() as a backstop (and for the API mode).
export default function GamePage({ params }: Props) {
  return (
    <LobbyScreen
      focus="game"
      games={{}}
      gamePage={
        <Suspense fallback={<GameViewSkeleton />}>
          <StaticGame params={params} />
        </Suspense>
      }
    />
  );
}

async function StaticGame({ params }: Pick<Props, "params">) {
  // fetch and AbortSignal.timeout call Date.now(). With cacheComponents that
  // clock is only allowed after the render reaches the dynamic stage.
  await connection();
  const { lang, category, id } = await params;
  const details = findCasinoCategory(category) ? await getGameDetails(category, id, { lang }) : null;
  if (!details) notFound();
  const token = await getAuthTokenFromCookie();
  const launch = getGameLaunch({
    provider: details.game.publicCode,
    game: details.game.gameCode,
    name: details.game.title,
    token,
  });
  return <GameView data={{ ...details, launch }} />;
}
