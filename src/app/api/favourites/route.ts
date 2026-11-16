import { NextResponse } from "next/server";
import { apiConfig } from "@/config/site";
import { ApiError, apiJson, isApiStatusFailure, readApiMessage } from "@/lib/api";
import { getAuthTokenFromCookie } from "@/lib/authCookie";

// Cookie auth_token -> Bearer for the player's favourites.
// GET  /api/favourites -> { items: [{ public_code, game_code }] }  (backend simple=1)
// POST /api/favourites { publicCode, gameCode } -> add (idempotent)
// DELETE /api/favourites { publicCode, gameCode } -> remove

type FavItem = { public_code: string; game_code: string };

const noStore = { "Cache-Control": "no-store" };

function lobbyCountryId() {
  return apiConfig.lobbyCountryId || "1";
}

function readItem(body: unknown): FavItem | null {
  if (!body || typeof body !== "object") return null;
  const rec = body as Record<string, unknown>;
  const publicCode =
    (typeof rec.publicCode === "string" ? rec.publicCode : typeof rec.public_code === "string" ? rec.public_code : "").trim();
  const gameCode =
    (typeof rec.gameCode === "string" ? rec.gameCode : typeof rec.game_code === "string" ? rec.game_code : "").trim();
  if (!publicCode || !gameCode) return null;
  return { public_code: publicCode, game_code: gameCode };
}

async function backendPost(path: string, token: string, body: Record<string, unknown>) {
  return apiJson(path, {
    method: "POST",
    auth: false,
    headers: {
      "Content-Type": "application/json",
      "country-id": lobbyCountryId(),
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

function parseSimpleItems(payload: unknown): FavItem[] {
  const data = payload && typeof payload === "object" ? (payload as { data?: unknown }).data : undefined;
  if (!Array.isArray(data)) return [];
  const items: FavItem[] = [];
  for (const entry of data) {
    if (!entry || typeof entry !== "object") continue;
    const rec = entry as Record<string, unknown>;
    const public_code = typeof rec.public_code === "string" ? rec.public_code.trim() : "";
    const game_code = typeof rec.game_code === "string" ? rec.game_code.trim() : "";
    if (public_code && game_code) items.push({ public_code, game_code });
  }
  return items;
}

export async function GET() {
  const token = await getAuthTokenFromCookie();
  if (!token) return NextResponse.json({ items: [] }, { status: 401, headers: noStore });
  const path = apiConfig.favouriteGamesPath || "/favourite_games";
  try {
    const payload = await backendPost(path, token, { simple: 1 });
    if (isApiStatusFailure(payload)) {
      return NextResponse.json({ items: [], message: readApiMessage(payload) }, { status: 401, headers: noStore });
    }
    return NextResponse.json({ items: parseSimpleItems(payload) }, { headers: noStore });
  } catch {
    return NextResponse.json({ items: [], error: true }, { status: 502, headers: noStore });
  }
}

export async function POST(request: Request) {
  return mutate(request, apiConfig.favouriteGamesAddPath || "/favourite_games_add");
}

export async function DELETE(request: Request) {
  return mutate(request, apiConfig.favouriteGamesRemovePath || "/favourite_games_remove");
}

async function mutate(request: Request, path: string) {
  const token = await getAuthTokenFromCookie();
  if (!token) return NextResponse.json({ ok: false, error: "signin" }, { status: 401, headers: noStore });
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400, headers: noStore });
  }
  const item = readItem(raw);
  if (!item) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400, headers: noStore });
  try {
    const payload = await backendPost(path, token, item);
    const message = readApiMessage(payload);
    if (isApiStatusFailure(payload)) {
      return NextResponse.json({ ok: false, message: message ?? "failed" }, { status: 400, headers: noStore });
    }
    return NextResponse.json(
      { ok: true, message, publicCode: item.public_code, gameCode: item.game_code },
      { headers: noStore },
    );
  } catch (error) {
    const message = error instanceof ApiError ? error.message : null;
    return NextResponse.json({ ok: false, message: message || undefined }, { status: 502, headers: noStore });
  }
}
