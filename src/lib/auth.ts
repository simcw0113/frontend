import { apiConfig } from "@/config/site";
import { ApiError, apiJson, extractAuthToken } from "@/lib/api";
import { saveAuthToken } from "@/lib/token";

export type LoginInput = {
  /** Username, email or phone number, exactly as typed (trimmed by the caller). */
  identifier: string;
  password: string;
  remember: boolean;
};

// TODO(API): the login endpoint does not exist yet. While this is true, sign-in
// is a local stub: no network request, no token saved. Set it to false (or
// delete the stub branch below) once the API address is configured.
const MOCK_LOGIN = true;

const MOCK_LATENCY_MS = 700;

export async function loginWithPassword({ identifier, password, remember }: LoginInput) {
  if (MOCK_LOGIN) {
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
    return;
  }

  // TODO(API): confirm the request field names and how `remember` should
  // affect token storage (persistent vs session) with the backend contract.
  const payload = await apiJson(apiConfig.loginPath, {
    method: "POST",
    auth: false,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: identifier, password, remember }),
  });

  const token = extractAuthToken(payload);
  if (!token) {
    throw new ApiError("The sign-in response did not include a token.", 200, "token_missing");
  }

  saveAuthToken(token);
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

export async function registerAccount(input: RegisterInput) {
  if (MOCK_REGISTER) {
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
    return;
  }

  // TODO(API): confirm the request fields with the backend contract.
  const identity =
    input.method === "email" ? { email: input.email } : { phone: `+${input.countryDial}${input.phone}` };
  const payload = await apiJson(apiConfig.registerPath, {
    method: "POST",
    auth: false,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...identity, password: input.password, referral: input.referral || undefined }),
  });

  const token = extractAuthToken(payload);
  if (token) saveAuthToken(token);
}
