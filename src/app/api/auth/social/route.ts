import { NextResponse } from "next/server";
import { apiConfig } from "@/config/site";
import { ApiError, apiJson, extractAuthToken, isApiStatusFailure, readApiMessage } from "@/lib/api";
import { writeAuthCookie } from "@/lib/authCookie";
import { requestLocale, withLocale } from "@/lib/requestLocale";

const PATHS = { google: "/signin/google", telegram: "/signin/telegram" } as const;
// Fields of the Telegram Login callback; the backend re-checks them against the bot token hash.
const TELEGRAM_FIELDS = ["id", "first_name", "last_name", "username", "photo_url", "auth_date", "hash"] as const;

function errorJson(message: string, status: number, code?: ApiError["code"]) {
  return NextResponse.json({ message, code }, { status });
}

function readString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  return typeof value === "number" && Number.isFinite(value) ? String(value) : null;
}

// GET /api/auth/social: the public sign-in keys from GET /config (null = provider not configured).
export async function GET() {
  try {
    const payload = await apiJson<{ data?: Record<string, unknown> }>(apiConfig.configPath, {
      auth: false,
      headers: { "country-id": apiConfig.lobbyCountryId || "1" },
      cache: "no-store",
    });
    return NextResponse.json({
      googleClientId: readString(payload?.data?.google_client_id),
      telegramBotId: readString(payload?.data?.telegram_bot_id),
    });
  } catch {
    return NextResponse.json({ googleClientId: null, telegramBotId: null });
  }
}

// POST /api/auth/social  { provider: "google", id_token } | { provider: "telegram", ...telegram fields },
// plus member_username on the retry after { needUsername: true }. Same cookie handling as /api/auth/login.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorJson("The request could not be completed.", 400, "api_failed");
  }

  const provider = body?.provider;
  let forward: Record<string, string>;
  if (provider === "google") {
    const idToken = readString(body.id_token);
    if (!idToken) return errorJson("The request could not be completed.", 400, "api_failed");
    forward = { id_token: idToken };
  } else if (provider === "telegram") {
    forward = {};
    for (const key of TELEGRAM_FIELDS) {
      const value = readString(body[key]);
      if (value) forward[key] = value;
    }
    if (!forward.id || !forward.hash) return errorJson("The request could not be completed.", 400, "api_failed");
  } else {
    return errorJson("The request could not be completed.", 400, "api_failed");
  }
  // Chosen on the first social sign-in (see need_username below); the backend validates it.
  const username = readString(body.member_username);
  if (username) forward.member_username = username;

  try {
    const payload = await apiJson(withLocale(PATHS[provider], requestLocale(request)), {
      method: "POST",
      auth: false,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(forward),
      cache: "no-store",
    });

    // First sign-in for this Google/Telegram account: no member yet, ask the player for a username.
    if ((payload as { data?: { need_username?: unknown } } | null)?.data?.need_username === true) {
      return NextResponse.json({ ok: false, needUsername: true });
    }

    if (isApiStatusFailure(payload)) {
      return errorJson(readApiMessage(payload) ?? "The request could not be completed.", 401);
    }

    const token = extractAuthToken(payload);
    if (!token) return errorJson("The sign-in response did not include a token.", 502, "token_missing");

    const response = NextResponse.json({ ok: true });
    writeAuthCookie(response, token, true);
    return response;
  } catch (cause) {
    if (cause instanceof ApiError) {
      const status = cause.status >= 400 && cause.status < 600 ? cause.status : cause.code === "api_unconfigured" ? 503 : 502;
      return errorJson(cause.message, status, cause.code);
    }
    return errorJson("The request could not be completed.", 502, "api_failed");
  }
}
