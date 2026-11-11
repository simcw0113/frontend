import { NextResponse } from "next/server";
import { fetchLobbyGames, lobbyLocale } from "@/lib/lobbyApi";

export async function POST(request: Request) {
  let body: { publicCode?: unknown; locale?: unknown };
  try {
    body = (await request.json()) as { publicCode?: unknown; locale?: unknown };
  } catch {
    return NextResponse.json({ message: "The request could not be completed." }, { status: 400 });
  }

  // Empty publicCode is the all-providers list. A value is one provider.
  const publicCode = typeof body.publicCode === "string" ? body.publicCode.trim() : "";

  try {
    const games = await fetchLobbyGames(
      lobbyLocale(typeof body.locale === "string" ? body.locale : "en"),
      publicCode || undefined,
    );
    return NextResponse.json({ games });
  } catch {
    return NextResponse.json({ message: "Could not load games.", games: [] }, { status: 502 });
  }
}
