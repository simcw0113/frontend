import { apiFetch } from "@/lib/api";

// Withdrawal helpers for the /[lang]/withdraw page. Server only: the BFF routes
// under app/api/withdraw/ call these with the token from the HttpOnly cookie.
// Backend (all POST, `Authorization: Bearer <token>`, no country-id header, no
// required query/body on the first two):
//   /withdraw_banklist -> data.member_bank[], data.withdraw_bank[]
//   /withdraw_limit    -> wallet limits (slow: recalls game money to the main wallet)
//   /withdraw          -> amount, bank_name (a withdraw_bank name), account_number,
//                         account_name. No pin_code. { status, message }.
// Every function returns a small normalized shape and never throws.

export type MemberBank = {
  bank: string;
  name: string;
  account: string;
  extra_data: unknown;
};

export type WithdrawBank = {
  id: number;
  name: string;
  image: string | null;
};

export type WithdrawBanklist = {
  member_bank: MemberBank[];
  withdraw_bank: WithdrawBank[];
};

export type WithdrawLimit = {
  amount: string; // available balance, as returned (e.g. "0.00")
  amountValue: number;
  force_withdraw_all: boolean;
  min_amount: number | null;
  max_amount: number | null;
  daily_count_limit: number | null;
  daily_count_remaining: number | null;
  daily_amount_limit: number | null;
  daily_amount_remaining: number | null;
  fee: number;
};

export type WithdrawError = { ok: false; error: "signin" | "failed"; message?: string };
export type WithdrawBanklistResult = { ok: true; data: WithdrawBanklist } | WithdrawError;
export type WithdrawLimitResult = { ok: true; data: WithdrawLimit } | WithdrawError;
export type WithdrawActionResult = { ok: true; message?: string } | WithdrawError;

const TIMEOUT_MS = 10000;
const LIMIT_TIMEOUT_MS = 60000;
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

function bool(value: unknown): boolean {
  if (value === true || value === 1 || value === "1" || value === "true") return true;
  return false;
}

// "Please login to continue" (en) / 请登录 (cn): the token is missing or expired.
const SIGNIN_RE = /login|log in|sign in|登录|登入/i;

function failure(payload: unknown): WithdrawError {
  const message = text(asRecord(payload)?.message) || undefined;
  if (message && SIGNIN_RE.test(message)) return { ok: false, error: "signin", message };
  return { ok: false, error: "failed", message };
}

function parseMemberBank(raw: unknown): MemberBank | null {
  const item = asRecord(raw);
  if (!item) return null;
  const bank = text(item.bank);
  const name = text(item.name);
  const account = text(item.account);
  if (!bank && !name && !account) return null;
  return { bank, name, account, extra_data: item.extra_data ?? null };
}

function parseWithdrawBank(raw: unknown): WithdrawBank | null {
  const item = asRecord(raw);
  if (!item) return null;
  const id = num(item.id);
  const name = text(item.name);
  if (id === null || !name) return null;
  const image = text(item.image) || null;
  return { id, name, image };
}

function parseBanklist(payload: unknown): WithdrawBanklist {
  const data = asRecord(asRecord(payload)?.data) ?? asRecord(payload);
  const member = data?.member_bank;
  const banks = data?.withdraw_bank;
  return {
    member_bank: Array.isArray(member) ? member.map(parseMemberBank).filter((b): b is MemberBank => b !== null) : [],
    withdraw_bank: Array.isArray(banks) ? banks.map(parseWithdrawBank).filter((b): b is WithdrawBank => b !== null) : [],
  };
}

function parseLimit(payload: unknown): WithdrawLimit {
  const data = asRecord(asRecord(payload)?.data) ?? asRecord(payload) ?? {};
  const amountText = text(data.amount) || "0";
  const amountValue = num(data.amount) ?? 0;
  return {
    amount: amountText,
    amountValue,
    force_withdraw_all: bool(data.force_withdraw_all),
    min_amount: num(data.min_amount),
    max_amount: num(data.max_amount),
    daily_count_limit: num(data.daily_count_limit),
    daily_count_remaining: num(data.daily_count_remaining),
    daily_amount_limit: num(data.daily_amount_limit),
    daily_amount_remaining: num(data.daily_amount_remaining),
    fee: num(data.fee) ?? 0,
  };
}

// POST with Bearer only. No country-id. Optional lang/locale query is ignored by
// endpoints that take no params; kept so translated messages stay in the UI language.
async function call(
  path: string,
  opts: { token: string; lang?: string; body?: URLSearchParams; timeout?: number },
) {
  const query = opts.lang ? `?${new URLSearchParams({ lang: opts.lang })}` : "";
  const headers: Record<string, string> = { Authorization: `Bearer ${opts.token}` };
  if (opts.body) headers["Content-Type"] = "application/x-www-form-urlencoded";
  const response = await apiFetch(`${path}${query}`, {
    method: "POST",
    headers,
    body: opts.body,
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

export async function getWithdrawBanklist({ token, lang }: Auth): Promise<WithdrawBanklistResult> {
  if (!token) return { ok: false, error: "signin" };
  try {
    const payload = await call("/withdraw_banklist", { token, lang });
    if (asRecord(payload)?.status !== true) return failure(payload);
    return { ok: true, data: parseBanklist(payload) };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export async function getWithdrawLimit({ token, lang }: Auth): Promise<WithdrawLimitResult> {
  if (!token) return { ok: false, error: "signin" };
  try {
    const payload = await call("/withdraw_limit", { token, lang, timeout: LIMIT_TIMEOUT_MS });
    if (asRecord(payload)?.status !== true) return failure(payload);
    return { ok: true, data: parseLimit(payload) };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export async function submitWithdraw(
  { token, lang }: Auth,
  fields: { amount: string; bank_name: string; account_number: string; account_name: string },
): Promise<WithdrawActionResult> {
  if (!token) return { ok: false, error: "signin" };
  const body = new URLSearchParams();
  body.set("amount", fields.amount);
  body.set("bank_name", fields.bank_name);
  body.set("account_number", fields.account_number);
  body.set("account_name", fields.account_name);
  try {
    const payload = await call("/withdraw", { token, lang, body, timeout: SUBMIT_TIMEOUT_MS });
    if (asRecord(payload)?.status !== true) return failure(payload);
    return { ok: true, message: text(asRecord(payload)?.message) || undefined };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export function withdrawStatus(result: { ok: boolean; error?: WithdrawError["error"]; message?: string }): number {
  if (result.ok) return 200;
  if (result.error === "signin") return 401;
  return result.message ? 400 : 502;
}
