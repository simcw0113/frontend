import { NextResponse } from "next/server";
import { apiConfig } from "@/config/site";
import { ApiError, apiJson, extractAuthToken, isApiStatusFailure, readApiMessage } from "@/lib/api";
import { writeAuthCookie } from "@/lib/authCookie";
import { requestLocale, withLocale } from "@/lib/requestLocale";

type LoginBody = {
  username?: unknown;
  password?: unknown;
  remember?: unknown;
};

function errorJson(message: string, status: number, code?: ApiError["code"]) {
  return NextResponse.json({ message, code }, { status });
}

// POST /api/auth/login
// Forwards { username, password } to the backend sign-in endpoint
// (apiConfig.loginPath, POST /api/signin). Username and phone both go in
// `username`; the backend matches either. Email is not accepted.
// The returned `token` is stored in an HttpOnly; Secure; SameSite=Lax cookie
// and is never sent back in the JSON body. `session_token` is ignored.
// `remember` is only used for the cookie maxAge and is not sent to the backend.
export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return errorJson("The request could not be completed.", 400, "api_failed");
  }

  const identifier = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const remember = body.remember === true;

  if (!identifier || identifier.includes("@") || !password) {
    return errorJson("The request could not be completed.", 400, "api_failed");
  }

  try {
    const payload = await apiJson(withLocale(apiConfig.loginPath, requestLocale(request)), {
      method: "POST",
      auth: false,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: identifier, password }),
      cache: "no-store",
    });

    if (isApiStatusFailure(payload)) {
      return errorJson(readApiMessage(payload) ?? "The request could not be completed.", 401);
    }

    const token = extractAuthToken(payload);
    if (!token) {
      return errorJson("The sign-in response did not include a token.", 502, "token_missing");
    }

    const response = NextResponse.json({ ok: true });
    writeAuthCookie(response, token, remember);
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
