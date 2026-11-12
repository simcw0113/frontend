import { cacheLife, cacheTag } from "next/cache";
import type { GameTagLabel } from "@/config/categories";
import type { Game } from "@/config/lobby";
import { apiConfig } from "@/config/site";
import { apiJson } from "@/lib/api";
import { hasApiBaseUrl } from "@/lib/apiMode";
import type { CategoryGamesResult } from "@/lib/games";
import { lobbyLocale, parseGameList } from "@/lib/lobbyApi";

// Tagged-game lists (home "Hot Games" / "New Release" and their /casino/{slug} pages).
// POST apiConfig.gameTagsPath (/game_tags). Locale is a query and body field, not a
// header. Public list: "use cache", no auth token.

const REQUEST_TIMEOUT_MS = 8000;
const DEFAULT_PATH = "/game_tags";
const DEFAULT_LABEL = "hot";
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 60;

export type { GameTagLabel };

export type GameTagsOptions = {
  lang: string;
  label?: GameTagLabel;
  limit?: number;
};

function clampLimit(limit: number | undefined): number {
  if (limit == null || !Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(limit)));
}

async function fromApi(locale: string, label: GameTagLabel, limit: number, category: string): Promise<CategoryGamesResult> {
  "use cache";
  cacheTag(`game-tags:${label}`);

  const path = apiConfig.gameTagsPath || DEFAULT_PATH;
  const query = new URLSearchParams({ locale, label, limit: String(limit) });

  try {
    const payload = await apiJson(`${path}?${query}`, {
      method: "POST",
      auth: false,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, label, limit }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const games = parseGameList(payload).map((game) => ({ ...game, category }));
    cacheLife({ stale: 120, revalidate: 120, expire: 3600 });
    return { games, total: games.length };
  } catch {
    cacheLife({ stale: 0, revalidate: 0, expire: 0 });
    return { games: [], error: true };
  }
}

// Never throws. Failures come back as { games: [], error: true }. With no API
// address the list is empty (the static trendingGames placeholder is not used).
export function categoryForTagLabel(label: GameTagLabel): string {
  return label === "new" ? "new-release" : "hot-games";
}

export async function getGameTags(
  opts: GameTagsOptions,
  category?: string,
): Promise<CategoryGamesResult> {
  if (!hasApiBaseUrl()) return { games: [] };
  const label = opts.label ?? DEFAULT_LABEL;
  return fromApi(lobbyLocale(opts.lang), label, clampLimit(opts.limit), category ?? categoryForTagLabel(label));
}

// Resolve a tagged game for the provider game page. Used as a fallback when
// findLobbyGame cannot locate it in POST /game_list.
export async function findTaggedGame(
  publicCode: string,
  gameCode: string,
  lang: string,
  label: GameTagLabel = DEFAULT_LABEL,
): Promise<{ game: Game; others: Game[] } | null> {
  const { games } = await getGameTags({ lang, label }, categoryForTagLabel(label));
  const game = games.find((item) => item.publicCode === publicCode && item.gameCode === gameCode);
  if (!game) return null;
  return { game, others: games.filter((item) => item.publicCode !== publicCode || item.gameCode !== gameCode) };
}
