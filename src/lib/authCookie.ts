import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { AUTH_TOKEN_KEY } from "@/lib/token";

const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;
// Dropped if a browser still has it. This lobby does not use session_token.
const LEGACY_SESSION_COOKIE = "session_token";

export function authCookieOptions(remember = false) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    ...(remember ? { maxAge: REMEMBER_MAX_AGE } : {}),
  };
}

export async function getAuthTokenFromCookie(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(AUTH_TOKEN_KEY)?.value?.trim();
  return value || null;
}

export function writeAuthCookie(response: NextResponse, token: string, remember = false) {
  response.cookies.set(AUTH_TOKEN_KEY, token, authCookieOptions(remember));
  expireLegacySessionCookie(response);
}

export function clearAuthCookie(response: NextResponse) {
  const cleared = { ...authCookieOptions(), maxAge: 0, expires: new Date(0) };
  response.cookies.set(AUTH_TOKEN_KEY, "", cleared);
  expireLegacySessionCookie(response);
}

function expireLegacySessionCookie(response: NextResponse) {
  response.cookies.set(LEGACY_SESSION_COOKIE, "", {
    ...authCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  });
}
