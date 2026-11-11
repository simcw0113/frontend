import { NextResponse } from "next/server";
import { fetchLobbyProducts, lobbyLocale } from "@/lib/lobbyApi";

// Pill id is `public_code`. POST /game_list uses that same value, not the internal `code`.
export async function GET(request: Request) {
  const locale = lobbyLocale(new URL(request.url).searchParams.get("locale") ?? "en");
  try {
    const providers = await fetchLobbyProducts(locale);
    return NextResponse.json({ providers });
  } catch {
    return NextResponse.json({ message: "Could not load providers.", providers: [] }, { status: 502 });
  }
}
