import { apiConfig } from "@/config/site";
import { ApiError, apiJson, type ApiErrorCode } from "@/lib/api";
import { markSignedIn } from "@/lib/token";

export type LoginInput = {
  /** Username, email or phone number, exactly as typed (trimmed by the caller). */
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

export async function loginWithPassword({ identifier, password, remember }: LoginInput) {
  let response: Response;
  try {
    response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ username: identifier, password, remember }),
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

  markSignedIn();
}

export type RegisterInput = {
  method: "email" | "phone";
  email: string;
  /** Dial code without "+", e.g. "60". */
  countryDial: string;
  /** National number, digits only. */
  phone: string;
  password: string;
  referral: string;
};

// TODO(API): the registration endpoint does not exist yet. While this is true,
// registering is a local stub: no network request, no account, no token saved.
const MOCK_REGISTER = true;

const MOCK_LATENCY_MS = 700;

export async function registerAccount(input: RegisterInput) {
  if (MOCK_REGISTER) {
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
    return;
  }

  // TODO(API): confirm the request fields with the backend contract.
  // After register, the token should be stored by a route handler in the same
  // HttpOnly cookie as login — never written to localStorage.
  const identity =
    input.method === "email" ? { email: input.email } : { phone: `+${input.countryDial}${input.phone}` };
  await apiJson(apiConfig.registerPath, {
    method: "POST",
    auth: false,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...identity, password: input.password, referral: input.referral || undefined }),
  });
}
