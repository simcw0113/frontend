import { NextResponse } from "next/server";
import { apiConfig } from "@/config/site";
import { ApiError, apiJson, isApiStatusFailure, readApiMessage } from "@/lib/api";
import { getAuthTokenFromCookie } from "@/lib/authCookie";
import { readSessionUser } from "@/lib/session";

function errorJson(message: string, status: number, code?: ApiError["code"]) {
  return NextResponse.json({ user: null, message, code }, { status });
}

// GET /api/auth/me
// Reads the HttpOnly auth cookie and asks the backend POST /api/info for the
// signed-in member. The token is sent as Authorization: Bearer and never
// exposed to the client.
export async function GET() {
  const token = await getAuthTokenFromCookie();
  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const payload = await apiJson(apiConfig.infoPath, {
      method: "POST",
      auth: false,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: "{}",
      cache: "no-store",
    });

    if (isApiStatusFailure(payload)) {
      return errorJson(readApiMessage(payload) ?? "Please login to continue.", 401);
    }

    const user = readSessionUser(payload);
    if (!user) {
      return errorJson("The profile response did not include a username.", 502, "api_unexpected");
    }

    return NextResponse.json({ user });
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
