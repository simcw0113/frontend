import { NextResponse } from "next/server";
import { loadLobbyGames, lobbyLocale } from "@/lib/lobbyApi";

export async function POST(request: Request) {
  let body: { publicCode?: unknown; locale?: unknown; page?: unknown; limit?: unknown };
  try {
    body = (await request.json()) as { publicCode?: unknown; locale?: unknown; page?: unknown; limit?: unknown };
  } catch {
    return NextResponse.json({ message: "The request could not be completed." }, { status: 400 });
  }

  // Empty publicCode is the all-providers list. A value is one provider.
  const publicCode = typeof body.publicCode === "string" ? body.publicCode.trim() : "";
  const page = typeof body.page === "number" && Number.isFinite(body.page) ? Math.max(1, Math.trunc(body.page)) : undefined;
  const limit = typeof body.limit === "number" && Number.isFinite(body.limit) ? Math.min(100, Math.max(1, Math.trunc(body.limit))) : undefined;

  try {
    const result = await loadLobbyGames(
      lobbyLocale(typeof body.locale === "string" ? body.locale : "en"),
      publicCode || undefined,
      limit != null ? { page: page ?? 1, limit } : undefined,
    );
    if (result.error) return NextResponse.json({ message: "Could not load games.", games: [] }, { status: 502 });
    // If we asked for a page and the API sent the unpaginated list, slice it here.
    let games = result.games;
    let total = result.total;
    let lastPage = result.lastPage;
    let current = result.page ?? page ?? 1;
    if (limit != null && result.lastPage == null && result.total == null && games.length > limit) {
      total = games.length;
      lastPage = Math.max(1, Math.ceil(total / limit));
      const start = ((page ?? 1) - 1) * limit;
      games = games.slice(start, start + limit);
      current = page ?? 1;
    }
    return NextResponse.json({
      games,
      total: total ?? games.length,
      page: current,
      limit: result.limit ?? limit,
      last_page: lastPage,
    });
  } catch {
    return NextResponse.json({ message: "Could not load games.", games: [] }, { status: 502 });
  }
}
