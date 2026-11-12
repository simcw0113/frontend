import { getAuthTokenFromCookie } from "@/lib/authCookie";
import { submitWithdraw } from "@/lib/withdraw";
import { withdrawJson, withdrawLang } from "../shared";

// POST JSON or form { amount, bank_name, account_number, account_name } -> /withdraw.
// No pin_code. Failure messages are forwarded as-is (already translated).
export async function POST(request: Request) {
  const token = await getAuthTokenFromCookie();
  if (!token) return withdrawJson({ ok: false, error: "signin" });

  let amount = "";
  let bankName = "";
  let accountNumber = "";
  let accountName = "";

  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as Record<string, unknown>;
      amount = String(body.amount ?? "").trim();
      bankName = String(body.bank_name ?? "").trim();
      accountNumber = String(body.account_number ?? "").trim();
      accountName = String(body.account_name ?? "").trim();
    } else {
      const form = await request.formData();
      amount = String(form.get("amount") ?? "").trim();
      bankName = String(form.get("bank_name") ?? "").trim();
      accountNumber = String(form.get("account_number") ?? "").trim();
      accountName = String(form.get("account_name") ?? "").trim();
    }
  } catch {
    return withdrawJson({ ok: false, error: "failed" });
  }

  if (!/^\d+(\.\d{1,2})?$/.test(amount) || !bankName || !accountNumber || !accountName) {
    return withdrawJson({ ok: false, error: "failed" });
  }

  return withdrawJson(
    await submitWithdraw(
      { token, lang: withdrawLang(request) },
      { amount, bank_name: bankName, account_number: accountNumber, account_name: accountName },
    ),
  );
}
