import { NextResponse } from "next/server";
import { queryLobbyGames } from "@/lib/lobbyGamesQuery";

export async function POST(request: Request) {
  let body: { publicCode?: unknown; publicCodes?: unknown; q?: unknown; locale?: unknown; page?: unknown; limit?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "The request could not be completed." }, { status: 400 });
  }

  const publicCodes = [
    ...(Array.isArray(body.publicCodes)
      ? body.publicCodes.filter((item): item is string => typeof item === "string" && item.trim() !== "").map((item) => item.trim())
      : []),
    ...(typeof body.publicCode === "string" && body.publicCode.trim() ? [body.publicCode.trim()] : []),
  ];
  const page = typeof body.page === "number" && Number.isFinite(body.page) ? Math.max(1, Math.trunc(body.page)) : undefined;
  const limit = typeof body.limit === "number" && Number.isFinite(body.limit) ? Math.min(100, Math.max(1, Math.trunc(body.limit))) : undefined;
  const q = typeof body.q === "string" ? body.q : undefined;

  try {
    const result = await queryLobbyGames({
      locale: typeof body.locale === "string" ? body.locale : "en",
      publicCodes,
      q,
      page,
      limit,
    });
    if (result.error) return NextResponse.json({ message: "Could not load games.", games: [] }, { status: 502 });
    return NextResponse.json({
      games: result.games,
      total: result.total,
      page: result.page,
      limit: result.limit,
      last_page: result.last_page,
    });
  } catch {
    return NextResponse.json({ message: "Could not load games.", games: [] }, { status: 502 });
  }
}
