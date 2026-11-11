import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { findCasinoCategory } from "@/config/categories";
import { getAuthTokenFromCookie } from "@/lib/authCookie";
import { getGameLaunch } from "@/lib/gameLaunch";
import { findLobbyGame, lobbyLocale } from "@/lib/lobbyApi";
import type { GameDetails } from "@/lib/games";
import { isSlug, languageAlternates, localizedPath } from "@/i18n/routing";

// /casino/{category}/provider/{public_code}/game/{game_code}
// Example: /en/casino/slots/provider/XYV9QF/game/ES073
type Props = {
  params: Promise<{ lang: string; category: string; provider: string; game: string }>;
};

async function lobbyDetails(
  category: string,
  provider: string,
  gameCode: string,
  lang: string,
): Promise<GameDetails | null> {
  if (!findCasinoCategory(category) || !provider || !gameCode) return null;
  const found = await findLobbyGame(provider, gameCode, lobbyLocale(lang));
  if (!found) return null;
  return {
    game: { ...found.game, category },
    recommended: found.others.map((game) => ({ ...game, category })),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, category, provider, game } = await params;
  const details = await lobbyDetails(category, provider, game, lang);
  if (!details) return {};
  const path = `/casino/${category}/provider/${provider}/game/${game}`;
  return {
    title: details.game.title,
    description: details.game.description ?? `${details.game.title} · ${details.game.provider}`,
    alternates: {
      canonical: isSlug(lang) ? localizedPath(lang, path) : undefined,
      languages: languageAlternates(path),
    },
  };
}

// Provider public_code, then the inner game code. The shell renders at once; the
// game and its launch URL stream behind Suspense.
export default function ProviderGamePage({ params }: Props) {
  const game = params.then(async ({ lang, category, provider, game: gameCode }) => {
    // fetch and AbortSignal.timeout call Date.now(). With cacheComponents that
    // clock is only allowed after the render reaches the dynamic stage.
    await connection();
    const details = await lobbyDetails(category, provider, gameCode, lang);
    if (!details) return null;
    const token = await getAuthTokenFromCookie();
    const launch = await getGameLaunch({
      provider,
      game: gameCode,
      name: details.game.title,
      lang,
      token,
    });
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
  await connection();
  const { lang, category, provider, game } = await params;
  if (!(await lobbyDetails(category, provider, game, lang))) notFound();
  return null;
}
