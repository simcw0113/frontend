import { getAuthTokenFromCookie } from "@/lib/authCookie";
import { cancelTopup } from "@/lib/topup";
import { topupJson, topupLang } from "../shared";

// POST -> cancels the member's pending deposits.
export async function POST(request: Request) {
  return topupJson(await cancelTopup({ token: await getAuthTokenFromCookie(), lang: topupLang(request) }));
}
