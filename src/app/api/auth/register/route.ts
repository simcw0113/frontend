import { NextResponse } from "next/server";
import { apiConfig } from "@/config/site";
import { ApiError, apiJson, extractAuthToken, isApiStatusFailure, readApiMessage } from "@/lib/api";
import { writeAuthCookie } from "@/lib/authCookie";
import { requestLocale, withLocale } from "@/lib/requestLocale";

type RegisterBody = {
  username?: unknown;
  password?: unknown;
  password_confirmation?: unknown;
  phone?: unknown;
  real_name?: unknown;
  referral?: unknown;
};

function errorJson(message: string, status: number, code?: ApiError["code"]) {
  return NextResponse.json({ message, code }, { status });
}

// POST /api/auth/register
// Forwards username, password, password_confirmation, phone and real_name
// (plus optional referral) to the backend sign-up endpoint
// (apiConfig.registerPath, POST /api/signup), then
// stores the returned `token` in the same HttpOnly; Secure; SameSite=Lax cookie as login.
// `session_token` is ignored.
export async function POST(request: Request) {
  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return errorJson("The request could not be completed.", 400, "api_failed");
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirm = typeof body.password_confirmation === "string" ? body.password_confirmation : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const realName = typeof body.real_name === "string" ? body.real_name.trim() : "";
  const referral = typeof body.referral === "string" ? body.referral.trim() : "";

  if (!username || !password || confirm !== password || !phone || !realName) {
    return errorJson("The request could not be completed.", 400, "api_failed");
  }

  const payloadBody: Record<string, string> = {
    username,
    password,
    password_confirmation: confirm,
    phone,
    real_name: realName,
  };
  if (referral) payloadBody.referral = referral;

  try {
    const payload = await apiJson(withLocale(apiConfig.registerPath, requestLocale(request)), {
      method: "POST",
      auth: false,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadBody),
      cache: "no-store",
    });

    if (isApiStatusFailure(payload)) {
      return errorJson(readApiMessage(payload) ?? "The request could not be completed.", 400);
    }

    const token = extractAuthToken(payload);
    if (!token) {
      return errorJson("The registration response did not include a token.", 502, "token_missing");
    }

    const response = NextResponse.json({ ok: true });
    writeAuthCookie(response, token, false);
    return response;
  } catch (cause) {
    if (cause instanceof ApiError) {
      const status =
        cause.status >= 400 && cause.status < 600
          ? cause.status
          : cause.code === "api_unconfigured"
            ? 503
            : 502;
      return errorJson(cause.message, status, cause.code);
    }
    return errorJson("The request could not be completed.", 502, "api_failed");
  }
}
