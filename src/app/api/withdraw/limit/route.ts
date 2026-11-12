import { getAuthTokenFromCookie } from "@/lib/authCookie";
import { getWithdrawLimit } from "@/lib/withdraw";
import { withdrawJson, withdrawLang } from "../shared";

// POST -> wallet limits. Slow: the backend recalls game money to the main wallet.
export async function POST(request: Request) {
  return withdrawJson(await getWithdrawLimit({ token: await getAuthTokenFromCookie(), lang: withdrawLang(request) }));
}
