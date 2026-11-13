import { NextResponse } from "next/server";
import { fetchLobbyCatalog, lobbyLocale } from "@/lib/lobbyApi";

// Pill id is `public_code`. POST /game_list uses that same value, not the internal `code`.
// `categories` comes from the same GET /config `product` list (Home / -1 omitted).
export async function GET(request: Request) {
  const locale = lobbyLocale(new URL(request.url).searchParams.get("locale") ?? "en");
  try {
    const { providers, categories } = await fetchLobbyCatalog(locale);
    return NextResponse.json({ providers, categories });
  } catch {
    return NextResponse.json({ message: "Could not load providers.", providers: [], categories: [] }, { status: 502 });
  }
}
