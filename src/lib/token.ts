export const AUTH_TOKEN_KEY = "auth_token";
export const AUTH_TOKEN_EVENT = "auth-token-change";

// UI-only flag. The real token lives in an HttpOnly cookie set by /api/auth/login
// and cannot be read from JavaScript.
const AUTH_SIGNED_IN_KEY = "auth_signed_in";

export function isSignedIn(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTH_SIGNED_IN_KEY) === "1";
}

export function markSignedIn() {
  window.localStorage.setItem(AUTH_SIGNED_IN_KEY, "1");
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.dispatchEvent(new Event(AUTH_TOKEN_EVENT));
}

export function clearAuthToken() {
  window.localStorage.removeItem(AUTH_SIGNED_IN_KEY);
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.dispatchEvent(new Event(AUTH_TOKEN_EVENT));
  void fetch("/api/auth/logout", { method: "POST" });
}
