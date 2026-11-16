import { getAuthTokenFromCookie } from "@/lib/authCookie";
import { payTopup } from "@/lib/topup";
import { topupJson, topupLang } from "../shared";

// POST multipart/form-data { unique_id } -> backend /topup_pay. Answers { ok, data: { method,
// url, params } }: the client sends the browser there (replaces the backend payments.redirect page).
export async function POST(request: Request) {
  const token = await getAuthTokenFromCookie();
  if (!token) return topupJson({ ok: false, error: "signin" });
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return topupJson({ ok: false, error: "failed" });
  }
  const uniqueId = String(form.get("unique_id") ?? "").trim();
  if (!/^[\w-]{1,100}$/.test(uniqueId)) return topupJson({ ok: false, error: "failed" });
  return topupJson(await payTopup({ token, lang: topupLang(request) }, uniqueId));
}
