import { NextResponse } from "next/server";
import { fetchLobbyGames, lobbyLocale } from "@/lib/lobbyApi";

export async function POST(request: Request) {
  let body: { code?: unknown; locale?: unknown };
  try {
    body = (await request.json()) as { code?: unknown; locale?: unknown };
  } catch {
    return NextResponse.json({ message: "The request could not be completed." }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code) {
    return NextResponse.json({ message: "The request could not be completed." }, { status: 400 });
  }

  try {
    const games = await fetchLobbyGames(code, lobbyLocale(typeof body.locale === "string" ? body.locale : "en"));
    return NextResponse.json({ games });
  } catch {
    return NextResponse.json({ message: "Could not load games.", games: [] }, { status: 502 });
  }
}
