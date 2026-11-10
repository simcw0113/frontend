import { NextResponse } from "next/server";
import { authCookieOptions } from "@/lib/authCookie";
import { AUTH_TOKEN_KEY } from "@/lib/token";

// POST /api/auth/logout
// Clears the HttpOnly auth cookie. The token itself is never exposed to the client.
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_TOKEN_KEY, "", {
    ...authCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}
