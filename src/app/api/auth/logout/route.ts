import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/authCookie";

// POST /api/auth/logout
// Clears the HttpOnly auth cookie. The token itself is never exposed to the client.
export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearAuthCookie(response);
  return response;
}
