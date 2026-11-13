import type { Game } from "@/config/lobby";
import { loadLobbyGames, lobbyLocale } from "@/lib/lobbyApi";

// Shared list query used by POST /api/lobby/games and the Explore search popup.
// The backend game_list accepts only one `public_code` (no category and no `q`),
// so multi-provider and text filters are applied here, then the page is sliced.

export type LobbyGamesQuery = {
  locale: string;
  publicCodes?: string[];
  q?: string;
  page?: number;
  limit?: number;
};

export type LobbyGamesQueryResult = {
  games: Game[];
  total: number;
  page: number;
  limit?: number;
  last_page: number | null;
  error?: boolean;
};

function readPublicCodes(codes: string[] | undefined): string[] {
  if (!codes) return [];
  return [...new Set(codes.map((item) => item.trim()).filter(Boolean))];
}

export function matchesGameQuery(game: Game, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return game.title.toLowerCase().includes(needle) || game.provider.toLowerCase().includes(needle);
}

export async function queryLobbyGames(opts: LobbyGamesQuery): Promise<LobbyGamesQueryResult> {
  const publicCodes = readPublicCodes(opts.publicCodes);
  const publicCode = publicCodes.length === 1 ? publicCodes[0] : "";
  const filterCodes = publicCodes.length > 1 ? new Set(publicCodes) : null;
  const q = opts.q?.trim() ?? "";
  const page = opts.page != null && Number.isFinite(opts.page) ? Math.max(1, Math.trunc(opts.page)) : undefined;
  const limit = opts.limit != null && Number.isFinite(opts.limit) ? Math.min(100, Math.max(1, Math.trunc(opts.limit))) : undefined;
  // Text search and multi-provider filters need the full list before paging.
  const needsFullList = Boolean(filterCodes) || Boolean(q);

  const result = await loadLobbyGames(
    lobbyLocale(opts.locale),
    publicCode || undefined,
    needsFullList ? undefined : limit != null ? { page: page ?? 1, limit } : undefined,
  );
  if (result.error) return { games: [], total: 0, page: page ?? 1, limit, last_page: null, error: true };

  let games = filterCodes ? result.games.filter((game) => game.publicCode && filterCodes.has(game.publicCode)) : result.games;
  if (q) games = games.filter((game) => matchesGameQuery(game, q));

  let total = filterCodes || q ? games.length : result.total;
  let lastPage = filterCodes || q ? (limit != null ? Math.max(1, Math.ceil(games.length / Math.max(limit, 1))) : 1) : (result.lastPage ?? null);
  let current = result.page ?? page ?? 1;
  if (limit != null && (needsFullList || (result.lastPage == null && result.total == null && games.length > limit))) {
    total = games.length;
    lastPage = Math.max(1, Math.ceil(total / limit));
    const start = ((page ?? 1) - 1) * limit;
    games = games.slice(start, start + limit);
    current = page ?? 1;
  }
  return {
    games,
    total: total ?? games.length,
    page: current,
    limit: result.limit ?? limit,
    last_page: lastPage,
  };
}
