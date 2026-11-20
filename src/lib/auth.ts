import { ApiError, type ApiErrorCode } from "@/lib/api";
import { markSignedIn } from "@/lib/token";

export type LoginInput = {
  /** Username or phone number, exactly as typed (trimmed by the caller). */
  identifier: string;
  password: string;
  remember: boolean;
};

const ERROR_CODES: ReadonlySet<string> = new Set([
  "api_unconfigured",
  "api_unexpected",
  "api_failed",
  "token_missing",
]);

function asErrorCode(value: unknown): ApiErrorCode | undefined {
  return typeof value === "string" && ERROR_CODES.has(value) ? (value as ApiErrorCode) : undefined;
}

async function postAuth(url: string, body: unknown) {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Could not reach the API.", 0);
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      throw new ApiError("The API returned an unexpected response.", response.status, "api_unexpected");
    }
  }

  if (!response.ok) {
    const record = payload && typeof payload === "object" ? (payload as { message?: unknown; code?: unknown }) : {};
    throw new ApiError(
      typeof record.message === "string" && record.message.trim()
        ? record.message.trim()
        : "The request could not be completed.",
      response.status,
      asErrorCode(record.code) ?? (record.message ? undefined : "api_failed"),
    );
  }

  return payload;
}

export async function loginWithPassword({ identifier, password, remember }: LoginInput) {
  await postAuth("/api/auth/login", { username: identifier, password, remember });
  markSignedIn();
}

export type RegisterInput = {
  username: string;
  password: string;
  /** Dial code without "+", e.g. "60". */
  countryDial: string;
  /** National number, digits only. */
  phone: string;
  realName: string;
  referral: string;
};

export async function registerAccount(input: RegisterInput) {
  // The form already requires confirm to equal password. Signup still needs
  // `password_confirmation` because the backend rule is `password|confirmed`.
  // `real_name` is stored by the backend as full_name.
  await postAuth("/api/auth/register", {
    username: input.username,
    password: input.password,
    password_confirmation: input.password,
    phone: `+${input.countryDial}${input.phone}`,
    real_name: input.realName,
    referral: input.referral || undefined,
  });
  markSignedIn();
}

// Google: { id_token }. Telegram: the raw Telegram.Login.auth user object.
// Returns false when this is a new account and the backend needs `member_username` first.
export async function loginWithSocial(provider: "google" | "telegram", data: Record<string, unknown>) {
  const payload = await postAuth("/api/auth/social", { ...data, provider });
  if ((payload as { needUsername?: unknown } | null)?.needUsername === true) return false;
  markSignedIn();
  return true;
}
