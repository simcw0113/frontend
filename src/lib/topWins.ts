import { cacheLife, cacheTag } from "next/cache";
import { apiConfig } from "@/config/site";
import { houseGames, slotGames, slotsGames, trendingGames, type Game } from "@/config/lobby";
import { topWinEntries } from "@/config/topWins";
import { apiJson } from "@/lib/api";
import { useStaticData as isStaticData } from "@/lib/apiMode";
import { lobbyLocale, parseGameList } from "@/lib/lobbyApi";

// "Top wins of the last N days" (backend setting top_wins_days) for the lobby home page. Server
// only. Same pattern as lib/games.ts: static sample data while there is no API address
// (apiConfig.useStaticTopWins), otherwise a cached public API call that never
// throws and never sends an auth token (see the notes in lib/games.ts).

export type TopWin = {
  rank: number;
  game: Game;
  playerId: string; // already masked, e.g. "50••••••7"
  amount: number;
  currency: string; // from the data, e.g. "USDT"
};

// `days` is the backend window (admin setting top_wins_days); 1 = today. It picks the title.
export type TopWinsResult = { wins: TopWin[]; days: number; error?: boolean };

// One row of POST /top_wins (backend API.md). `username` is already masked by the backend.
export type TopWinDto = {
  rank?: number;
  username: string;
  amount: number;
  currency?: string; // defaults to USDT
  game: unknown; // same row shape as /game_tags, mapped by parseGameList
};

// Keeps the first two and the last digit. Raw ids must never reach the page.
export function maskPlayerId(raw: string | number): string {
  const id = String(raw);
  return id.length <= 3 ? "••••••" : `${id.slice(0, 2)}••••••${id.slice(-1)}`;
}

export type TopWinsPayload = { data?: { days?: number; items?: TopWinDto[] } };

// Rows whose game cannot be read are dropped.
export function mapTopWins(payload: TopWinsPayload): Omit<TopWinsResult, "error"> {
  const items = payload.data?.items;
  if (!Array.isArray(items)) throw new Error("Unexpected top wins response");
  const wins = items.flatMap((item, index) => {
    const [game] = parseGameList([item.game]);
    return game
      ? [{
          rank: item.rank ?? index + 1,
          game,
          playerId: String(item.username ?? ""),
          amount: Number(item.amount) || 0,
          currency: item.currency || DEFAULT_CURRENCY,
        }]
      : [];
  });
  return { wins, days: Number(payload.data?.days) || DEFAULT_DAYS };
}

const DEFAULT_CURRENCY = "USDT";
const REQUEST_TIMEOUT_MS = 8000;
const DEFAULT_TOP_WINS_PATH = "/top_wins";
const DEFAULT_DAYS = 7; // backend default of top_wins_days

function fromStatic(): TopWinsResult {
  const games = [...slotsGames, ...slotGames, ...houseGames, ...trendingGames];
  const wins = topWinEntries.flatMap((entry) => {
    const game = games.find((candidate) => candidate.id === entry.gameId);
    return game
      ? [{ rank: entry.rank, game, playerId: maskPlayerId(entry.playerId), amount: entry.amount, currency: entry.currency }]
      : [];
  });
  return { wins, days: DEFAULT_DAYS };
}

async function fromApi(lang: string): Promise<TopWinsResult> {
  "use cache";
  cacheTag("top-wins");

  try {
    const payload = await apiJson<TopWinsPayload>(apiConfig.topWinsPath || DEFAULT_TOP_WINS_PATH, {
      method: "POST",
      auth: false,
      headers: { "Content-Type": "application/json" },
      // Days and count are admin settings on the backend, not request fields.
      body: JSON.stringify({ locale: lobbyLocale(lang) }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const { wins, days } = mapTopWins(payload);
    cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
    return { wins: wins.sort((a, b) => a.rank - b.rank), days };
  } catch {
    cacheLife({ stale: 0, revalidate: 0, expire: 0 }); // never cache a failure
    return { wins: [], days: DEFAULT_DAYS, error: true };
  }
}

// Never throws. The section hides itself on `error` or an empty list.
export async function getTopWins({ lang }: { lang: string }): Promise<TopWinsResult> {
  // Static data when forced by the switch or whenever there is no API address
  // (see lib/apiMode.ts), so a missing switch can never hide the section.
  const config: Partial<typeof apiConfig> = apiConfig;
  return isStaticData(config.useStaticTopWins) ? fromStatic() : fromApi(lang);
}
