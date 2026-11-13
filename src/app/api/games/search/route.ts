import { SEARCH_PAGE_SIZE } from "@/lib/games";
import { queryLobbyGames } from "@/lib/lobbyGamesQuery";
import { defaultSlug, isSlug } from "@/i18n/routing";

// GET /api/games/search?q=&publicCodes=&page=&pageSize=&lang=
// The browser's door to the games search (Next route handler: plain GET, so
// requests can be aborted and run in parallel, unlike Server Actions). Inputs are
// validated here; anything malformed gets a 400 with a short message.
// Response: { games, total, nextPage? } or { error } (400 bad input, 502 upstream).
const MAX_QUERY_LENGTH = 64;
const MAX_PAGE = 200;
const MAX_PAGE_SIZE = 48;

const headers = { "Cache-Control": "no-store" };

function fail(status: number, error: string) {
  return Response.json({ error }, { status, headers });
}

function integer(value: string | null, fallback: number, min: number, max: number): number | null {
  if (value === null || value === "") return fallback;
  if (!/^\d{1,6}$/.test(value)) return null;
  const number = Number(value);
  return number >= min && number <= max ? number : null;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const q = (params.get("q") ?? "").trim().replace(/\s+/g, " ");
  if (q.length > MAX_QUERY_LENGTH) return fail(400, "q is too long");
  if (/[\u0000-\u001f\u007f]/.test(q)) return fail(400, "q has invalid characters");

  const page = integer(params.get("page"), 1, 1, MAX_PAGE);
  if (page === null) return fail(400, "invalid page");
  const pageSize = integer(params.get("pageSize"), SEARCH_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  if (pageSize === null) return fail(400, "invalid pageSize");

  const lang = params.get("lang");
  const slug = lang && isSlug(lang) ? lang : defaultSlug; // unknown language: fall back to English
  const publicCodes = (params.get("publicCodes") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const publicCode = (params.get("publicCode") ?? "").trim();
  if (publicCode) publicCodes.push(publicCode);

  try {
    const result = await queryLobbyGames({ locale: slug, q, publicCodes, page, limit: pageSize });
    if (result.error) return fail(502, "search is unavailable");
    const nextPage = result.last_page != null && result.page < result.last_page ? result.page + 1 : undefined;
    return Response.json({ games: result.games, total: result.total, nextPage }, { headers });
  } catch {
    return fail(502, "search is unavailable");
  }
}
