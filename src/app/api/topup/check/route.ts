import { getAuthTokenFromCookie } from "@/lib/authCookie";
import { checkTopup } from "@/lib/topup";
import { topupJson, topupLang } from "../shared";

// POST -> { ok: true, pending } (is a deposit still under review?).
export async function POST(request: Request) {
  return topupJson(await checkTopup({ token: await getAuthTokenFromCookie(), lang: topupLang(request) }));
}
