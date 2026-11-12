import { getAuthTokenFromCookie } from "@/lib/authCookie";
import { submitTopup } from "@/lib/topup";
import { topupJson, topupLang } from "../shared";

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

// POST multipart/form-data { amount, payment_id, bonus_id?, attachment (image) } -> forwarded
// to the backend /topup. Only these fields are passed on.
export async function POST(request: Request) {
  const token = await getAuthTokenFromCookie();
  if (!token) return topupJson({ ok: false, error: "signin" });
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return topupJson({ ok: false, error: "failed" });
  }
  const amount = String(form.get("amount") ?? "").trim();
  const paymentId = String(form.get("payment_id") ?? "").trim();
  const bonusId = String(form.get("bonus_id") ?? "").trim();
  const attachment = form.get("attachment");
  if (!/^\d+(\.\d{1,2})?$/.test(amount) || !/^\d+$/.test(paymentId)) return topupJson({ ok: false, error: "failed" });
  if (!(attachment instanceof File) || attachment.size === 0 || attachment.size > MAX_RECEIPT_BYTES || !attachment.type.startsWith("image/")) {
    return topupJson({ ok: false, error: "failed" });
  }
  return topupJson(
    await submitTopup(
      { token, lang: topupLang(request) },
      { amount, paymentId, bonusId: /^\d+$/.test(bonusId) ? bonusId : undefined, attachment },
    ),
  );
}
