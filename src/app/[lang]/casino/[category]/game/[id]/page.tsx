import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { findCasinoCategory } from "@/config/categories";
import { gameCatalog } from "@/config/gameCatalog";
import { categoryGames } from "@/config/lobby";
import { getGameDetails } from "@/lib/games";
import { getAuthTokenFromCookie } from "@/lib/authCookie";
import { getGameLaunch } from "@/lib/gameLaunch";
import { isSlug, languageAlternates, localizedPath } from "@/i18n/routing";

type Props = PageProps<"/[lang]/casino/[category]/game/[id]">;

// /casino/{category}/game/{id} ("/game/" = the iframe page): `id` is the game's id from the list (the API's id; static data:
// config/lobby.ts#staticGameId). The static games of the category are prerendered (the API's
// render on demand). Cache Components needs at least one result per category, so a category
// without samples prerenders one catalog game (a 404 there unless it belongs to it).
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
      canonical: isSlug(lang) ? localizedPath(lang, path) : undefined,
      languages: languageAlternates(path),
    },
  };
}

// Game page: the iframe, its control bar, the info card and "Recommended Games".
// Instant navigation: `params` (URL data) is not awaited here. The lobby shell renders without
// it (the client reads category/id with useParams()); the game, its launch URL and the
// recommended row are one promise chained on `params`, streamed behind <Suspense> (skeleton
// frame until it resolves). Unknown ids, and ids of another category, get a real 404 from
// proxy.ts in static mode; GameGuard keeps notFound() as a backstop (and for the API mode).
export default function GamePage({ params }: Props) {
  const game = params.then(async ({ lang, category, id }) => {
    const details = findCasinoCategory(category) ? await getGameDetails(category, id, { lang }) : null;
    if (!details) return null;
    const token = await getAuthTokenFromCookie();
    const launch = await getGameLaunch({ id, name: details.game.title, lang, token });
    return { ...details, launch };
  });
  return (
    <>
      <LobbyScreen focus="game" games={{}} gamePage={game} />
      <Suspense fallback={null}>
        <GameGuard params={params} />
      </Suspense>
    </>
  );
}

async function GameGuard({ params }: Pick<Props, "params">) {
  const { lang, category, id } = await params;
  if (!findCasinoCategory(category) || !(await getGameDetails(category, id, { lang }))) notFound();
  return null;
}
