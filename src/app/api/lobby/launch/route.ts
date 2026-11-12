import { NextResponse } from "next/server";
import { getAuthTokenFromCookie } from "@/lib/authCookie";
import { getProviderLaunch } from "@/lib/gameLaunch";

// POST { publicCode, gameCode?, lang } -> the opengame result for Web / App / Deep Link
// products. The token stays in the HttpOnly cookie; the browser never sees it.
export async function POST(request: Request) {
  let body: { publicCode?: unknown; gameCode?: unknown; lang?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 400 });
  }
  const publicCode = typeof body.publicCode === "string" ? body.publicCode.trim() : "";
  if (!publicCode) return NextResponse.json({ error: "failed" }, { status: 400 });

  const result = await getProviderLaunch({
    provider: publicCode,
    game: typeof body.gameCode === "string" ? body.gameCode : undefined,
    lang: typeof body.lang === "string" ? body.lang : "en",
    token: await getAuthTokenFromCookie(),
  });
  const status = "error" in result ? (result.error === "signin" ? 401 : 502) : 200;
  return NextResponse.json(result, { status, headers: { "Cache-Control": "no-store" } });
}
