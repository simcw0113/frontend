import { getAuthTokenFromCookie } from "@/lib/authCookie";
import { getTopupBanklist } from "@/lib/topup";
import { topupJson, topupLang } from "../shared";

// POST -> payment methods (non-empty groups), deposit promotions and the notice.
export async function POST(request: Request) {
  return topupJson(await getTopupBanklist({ token: await getAuthTokenFromCookie(), lang: topupLang(request) }));
}
