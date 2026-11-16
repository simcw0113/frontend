import { apiConfig } from "@/config/site";
import { apiFetch } from "@/lib/api";
import { lobbyLocale } from "@/lib/lobbyApi";

// Deposit ("top up") for the wallet sheet (components/lobby/DepositSheet.tsx). Server only:
// the BFF routes under app/api/topup/ call these with the token from the HttpOnly cookie.
// Backend (all POST, `Authorization: Bearer <token>` + `country-id`):
//   /topup_banklist  -> payment methods per group + optional deposit promotions + notice
//   /topup           -> multipart: amount, payment_id, attachment? (receipt image, bank transfer
//                       only), bonus_id?; answers unique_id for gateway / e-wallet deposits
//   /topup_pay       -> unique_id: starts the payment gateway and answers where to send the
//                       member ({ method, url, params }); the browser does the redirect
//   /topup_check     -> status true = a deposit is still pending
//   /topup_cancel    -> cancels the member's pending deposits
// Every function returns a small normalized shape and never throws.

export const TOPUP_GROUPS = ["bank_transfer", "e_wallet", "gateway", "telco_pin"] as const;
export type TopupGroupId = (typeof TOPUP_GROUPS)[number];

export type TopupMethod = {
  id: number;
  name: string;
  code: string; // bank short code (identify), e.g. MBB
  account: string; // receiving account shown to the member
  image: string | null;
  min: number | null;
  max: number | null;
  amounts: number[]; // quick amounts
};

export type TopupBanklist = {
  notice: string | null; // plain text (HTML stripped), keeps line breaks
  groups: { id: TopupGroupId; methods: TopupMethod[] }[]; // non-empty groups only
  promotions: { id: number; title: string }[];
};

export type TopupError = { ok: false; error: "signin" | "pending" | "failed"; message?: string };
export type TopupBanklistResult = { ok: true; data: TopupBanklist } | TopupError;
export type TopupCheckResult = { ok: true; pending: boolean; message?: string } | TopupError;
export type TopupActionResult = { ok: true; message?: string } | TopupError;
// uniqueId: set when the deposit still has to be paid at a payment gateway (/topup_pay).
export type TopupSubmitResult = { ok: true; message?: string; uniqueId: string | null } | TopupError;
// Where to send the browser: GET without params = plain navigation, otherwise an auto-submitted form.
export type TopupPayTarget = { method: "GET" | "POST"; url: string; params: Record<string, string> };
export type TopupPayResult = { ok: true; data: TopupPayTarget } | TopupError;

const TIMEOUT_MS = 10000;
const SUBMIT_TIMEOUT_MS = 30000;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
}

function num(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

// "Please login to continue" (en) / 请登录 (cn): the token is missing or expired.
const SIGNIN_RE = /login|log in|sign in|登录|登入/i;
// "Pending deposit in progress" / "Have ongoing deposit" / 待处理存款进行中 / 有进行中的存款
const PENDING_RE = /pending deposit|ongoing deposit|存款进行中|进行中的存款/i;

function failure(payload: unknown): TopupError {
  const message = text(asRecord(payload)?.message) || undefined;
  if (message && SIGNIN_RE.test(message)) return { ok: false, error: "signin", message };
  if (message && PENDING_RE.test(message)) return { ok: false, error: "pending", message };
  return { ok: false, error: "failed", message };
}

// Deposit guidelines may be HTML: reduce them to plain text (rendered as text, never as HTML).
export function noticeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const plain = value
    .replace(/<(script|style|iframe|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n• ")
    .replace(/<\/(p|div|li|h[1-6]|tr|ul|ol)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/gi, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return plain || null;
}

function parseMethod(raw: unknown): TopupMethod | null {
  const item = asRecord(raw);
  const id = num(item?.id);
  if (!item || id === null) return null;
  const amounts = asRecord(item.config)?.amount_list;
  return {
    id,
    name: text(item.name) || text(item.identify) || `#${id}`,
    code: text(item.identify),
    account: text(item.account),
    image: text(item.image) || null,
    min: num(item.min_deposit),
    max: num(item.max_deposit),
    amounts: Array.isArray(amounts) ? amounts.map(num).filter((n): n is number => n !== null && n > 0) : [],
  };
}

export function parseBanklist(payload: unknown): TopupBanklist {
  const data = asRecord(asRecord(payload)?.data);
  const lists = asRecord(data?.lists ?? data?.list);
  const groups = TOPUP_GROUPS.map((id) => {
    const raw = lists?.[id];
    const methods = Array.isArray(raw) ? raw.map(parseMethod).filter((m): m is TopupMethod => m !== null) : [];
    return { id, methods };
  }).filter((group) => group.methods.length > 0);
  const promos = Array.isArray(data?.promotion_list) ? data.promotion_list : [];
  const promotions = promos
    .map((raw) => {
      const promo = asRecord(raw);
      const id = num(promo?.id);
      return id === null ? null : { id, title: text(promo?.title) || text(promo?.code) || `#${id}` };
    })
    .filter((p): p is { id: number; title: string } => p !== null);
  return { notice: noticeText(data?.notice), groups, promotions };
}

async function call(path: string, opts: { token: string; lang: string; body?: FormData; timeout?: number }) {
  const config: Partial<typeof apiConfig> = apiConfig;
  const response = await apiFetch(`${path}?${new URLSearchParams({ lang: opts.lang, locale: lobbyLocale(opts.lang) })}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.token}`,
      "country-id": config.lobbyCountryId || "1",
      locale: lobbyLocale(opts.lang),
    },
    body: opts.body, // FormData: fetch sets the multipart boundary itself
    cache: "no-store",
    signal: AbortSignal.timeout(opts.timeout ?? TIMEOUT_MS),
  });
  const raw = await response.text();
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

type Auth = { token: string | null; lang: string };

export async function getTopupBanklist({ token, lang }: Auth): Promise<TopupBanklistResult> {
  if (!token) return { ok: false, error: "signin" };
  try {
    const payload = await call("/topup_banklist", { token, lang });
    if (asRecord(payload)?.status !== true) return failure(payload);
    return { ok: true, data: parseBanklist(payload) };
  } catch {
    return { ok: false, error: "failed" };
  }
}

// status true = a deposit is pending. status false is either "no ongoing deposit" or a
// sign-in failure (told apart by the message).
export async function checkTopup({ token, lang }: Auth): Promise<TopupCheckResult> {
  if (!token) return { ok: false, error: "signin" };
  try {
    const payload = await call("/topup_check", { token, lang });
    const root = asRecord(payload);
    if (!root) return { ok: false, error: "failed" };
    const message = text(root.message) || undefined;
    if (root.status === true) return { ok: true, pending: true, message };
    if (message && SIGNIN_RE.test(message)) return { ok: false, error: "signin", message };
    return { ok: true, pending: false, message };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export async function submitTopup(
  { token, lang }: Auth,
  fields: { amount: string; paymentId: string; bonusId?: string; attachment?: File },
): Promise<TopupSubmitResult> {
  if (!token) return { ok: false, error: "signin" };
  const body = new FormData();
  body.set("amount", fields.amount);
  body.set("payment_id", fields.paymentId);
  if (fields.bonusId) body.set("bonus_id", fields.bonusId);
  if (fields.attachment) body.set("attachment", fields.attachment, fields.attachment.name || "receipt.png");
  try {
    const payload = await call("/topup", { token, lang, body, timeout: SUBMIT_TIMEOUT_MS });
    const root = asRecord(payload);
    if (root?.status !== true) return failure(payload);
    // `data` is the legacy backend pay page URL: not used, /topup_pay replaces it.
    return { ok: true, message: text(root.message) || undefined, uniqueId: text(root.unique_id) || null };
  } catch {
    return { ok: false, error: "failed" };
  }
}

// Only http(s) targets: the URL ends up in location.href or a form action.
function payUrl(value: unknown): string | null {
  const raw = text(value);
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function parsePayTarget(payload: unknown): TopupPayTarget | null {
  const data = asRecord(asRecord(payload)?.data);
  const url = payUrl(data?.url);
  if (!data || !url) return null;
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(asRecord(data.params) ?? {})) {
    if (value === null || value === undefined) continue;
    params[key] = typeof value === "object" ? JSON.stringify(value) : String(value);
  }
  return { method: text(data.method).toUpperCase() === "POST" ? "POST" : "GET", url, params };
}

export async function payTopup({ token, lang }: Auth, uniqueId: string): Promise<TopupPayResult> {
  if (!token) return { ok: false, error: "signin" };
  const body = new FormData();
  body.set("unique_id", uniqueId);
  try {
    const payload = await call("/topup_pay", { token, lang, body, timeout: SUBMIT_TIMEOUT_MS });
    if (asRecord(payload)?.status !== true) return failure(payload);
    const data = parsePayTarget(payload);
    return data ? { ok: true, data } : { ok: false, error: "failed" };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export async function cancelTopup({ token, lang }: Auth): Promise<TopupActionResult> {
  if (!token) return { ok: false, error: "signin" };
  try {
    const payload = await call("/topup_cancel", { token, lang });
    if (asRecord(payload)?.status !== true) return failure(payload);
    return { ok: true, message: text(asRecord(payload)?.message) || undefined };
  } catch {
    return { ok: false, error: "failed" };
  }
}

// HTTP status for a BFF route.
export function topupStatus(result: { ok: boolean; error?: TopupError["error"]; message?: string }): number {
  if (result.ok) return 200;
  if (result.error === "signin") return 401;
  if (result.error === "pending") return 409;
  return result.message ? 400 : 502; // a backend reason, or no usable answer
}
