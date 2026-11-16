import { NextResponse } from "next/server";
import { apiConfig } from "@/config/site";
import { apiJson, isApiStatusFailure } from "@/lib/api";
import { getAuthTokenFromCookie } from "@/lib/authCookie";

// GET /api/wallet/balance -> { balance: "12.34", currency: "MYR" } for the header wallet pill.
// Backend POST /get_balance (Bearer token from the HttpOnly cookie). Slowish: it asks the
// bound game provider for its balance, so the header loads it apart from /api/auth/me.
export async function GET() {
  const token = await getAuthTokenFromCookie();
  if (!token) return NextResponse.json({ balance: null }, { status: 401 });
  try {
    const payload = await apiJson<{ data?: { balance?: unknown; currency?: unknown } }>(apiConfig.balancePath, {
      method: "POST",
      auth: false,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: "{}",
      cache: "no-store",
    });
    const balance = payload?.data?.balance;
    if (isApiStatusFailure(payload) || typeof balance !== "string") return NextResponse.json({ balance: null }, { status: 502 });
    const currency = typeof payload.data?.currency === "string" ? payload.data.currency : "";
    return NextResponse.json({ balance, currency }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ balance: null }, { status: 502 });
  }
}
