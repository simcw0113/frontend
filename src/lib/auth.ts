import { apiConfig } from "@/config/site";
import { ApiError, apiJson, extractAuthToken } from "@/lib/api";
import { saveAuthToken } from "@/lib/token";

export async function loginWithPassword(email: string, password: string) {
  const payload = await apiJson(apiConfig.loginPath, {
    method: "POST",
    auth: false,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const token = extractAuthToken(payload);
  if (!token) {
    throw new ApiError("The sign-in response did not include a token.", 200, "token_missing");
  }

  saveAuthToken(token);
}
