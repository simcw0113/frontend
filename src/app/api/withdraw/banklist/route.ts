import { getAuthTokenFromCookie } from "@/lib/authCookie";
import { getWithdrawBanklist } from "@/lib/withdraw";
import { withdrawJson, withdrawLang } from "../shared";

// POST -> saved member banks and the list of withdrawal banks.
export async function POST(request: Request) {
  return withdrawJson(await getWithdrawBanklist({ token: await getAuthTokenFromCookie(), lang: withdrawLang(request) }));
}
