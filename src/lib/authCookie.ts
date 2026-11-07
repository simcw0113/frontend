import { cookies } from "next/headers";
import { AUTH_TOKEN_KEY } from "@/lib/token";

const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;

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
