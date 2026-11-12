import { cacheLife, cacheTag } from "next/cache";
import { apiConfig } from "@/config/site";
import { houseGames, slotGames, slotsGames, trendingGames, type Game } from "@/config/lobby";
import { topWinEntries } from "@/config/topWins";
import { mapGame, type GameDto } from "@/lib/games";
import { apiJson } from "@/lib/api";
import { useStaticData as isStaticData } from "@/lib/apiMode";
import { lobbyLocale } from "@/lib/lobbyApi";

// "Top wins of the month" for the lobby home page. Server only. Same pattern as
// lib/games.ts: static sample data while there is no API address
// (apiConfig.useStaticTopWins), otherwise a cached public API call that never
// throws and never sends an auth token (see the notes in lib/games.ts).

export type TopWin = {
  rank: number;
  game: Game;
  playerId: string; // already masked, e.g. "50••••••7"
  amount: number;
  currency: string; // from the data, e.g. "USDT"
};

export type TopWinsResult = { wins: TopWin[]; error?: boolean };

// TODO(API): shape of one entry in the API response. Adjust to the real fields.
export type TopWinDto = {
  rank?: number;
  game: GameDto;
  player_id: string | number;
  amount: number;
  currency?: string; // defaults to USDT
};

// Keeps the first two and the last digit. Raw ids must never reach the page.
export function maskPlayerId(raw: string | number): string {
  const id = String(raw);
  return id.length <= 3 ? "••••••" : `${id.slice(0, 2)}••••••${id.slice(-1)}`;
}

// TODO(API): map the real response onto TopWin (and unwrap its envelope).
export function mapTopWins(payload: { data?: TopWinDto[] } | TopWinDto[]): TopWin[] {
  const items = Array.isArray(payload) ? payload : payload.data;
  if (!Array.isArray(items)) throw new Error("Unexpected top wins response");
  return items.map((item, index) => ({
    rank: item.rank ?? index + 1,
    game: mapGame(item.game),
    playerId: maskPlayerId(item.player_id),
    amount: item.amount,
    currency: item.currency || DEFAULT_CURRENCY,
  }));
}

const DEFAULT_CURRENCY = "USDT";
const REQUEST_TIMEOUT_MS = 8000;
const DEFAULT_TOP_WINS_PATH = "/wins/top-month";

function fromStatic(): TopWinsResult {
  const games = [...slotsGames, ...slotGames, ...houseGames, ...trendingGames];
  const wins = topWinEntries.flatMap((entry) => {
    const game = games.find((candidate) => candidate.id === entry.gameId);
    return game
      ? [{ rank: entry.rank, game, playerId: maskPlayerId(entry.playerId), amount: entry.amount, currency: entry.currency }]
      : [];
  });
  return { wins };
}

async function fromApi(lang: string): Promise<TopWinsResult> {
  "use cache";
  cacheTag("top-wins");

  try {
    // TODO(API): endpoint path lives in apiConfig.topWinsPath (config/site.ts).
    const payload = await apiJson<{ data?: TopWinDto[] } | TopWinDto[]>(
      `${apiConfig.topWinsPath || DEFAULT_TOP_WINS_PATH}?${new URLSearchParams({ lang, locale: lobbyLocale(lang) })}`,
      { auth: false, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
    );
    const wins = mapTopWins(payload).sort((a, b) => a.rank - b.rank);
    cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
    return { wins };
  } catch {
    cacheLife({ stale: 0, revalidate: 0, expire: 0 }); // never cache a failure
    return { wins: [], error: true };
  }
}

// Never throws. The section hides itself on `error` or an empty list.
export async function getTopWins({ lang }: { lang: string }): Promise<TopWinsResult> {
  // Static data when forced by the switch or whenever there is no API address
  // (see lib/apiMode.ts), so a missing switch can never hide the section.
  const config: Partial<typeof apiConfig> = apiConfig;
  return isStaticData(config.useStaticTopWins) ? fromStatic() : fromApi(lang);
}
