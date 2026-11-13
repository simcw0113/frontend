import { NextResponse } from "next/server";
import { getAuthTokenFromCookie } from "@/lib/authCookie";
import { getSportsLaunch } from "@/lib/sportsLaunch";

// POST { lang?, isMobile? } -> { url } or { error, message? }.
// The IBC public_code is resolved from sportsConfig + the lobby product list; the token stays in the HttpOnly cookie.
export async function POST(request: Request) {
  let body: { lang?: unknown; isMobile?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // Empty / invalid body: still try with defaults (desktop, en).
  }

  const result = await getSportsLaunch({
    lang: typeof body.lang === "string" && body.lang.trim() ? body.lang : "en",
    isMobile: body.isMobile === true,
    token: await getAuthTokenFromCookie(),
  });
  const status =
    "error" in result
      ? result.error === "signin"
        ? 401
        : result.error === "unavailable" || result.error === "comingSoon"
          ? 404
          : result.error === "maintenance"
            ? 503
            : 502
      : 200;
  return NextResponse.json(result, { status, headers: { "Cache-Control": "no-store" } });
}
