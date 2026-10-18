export const AUTH_TOKEN_KEY = "auth_token";
export const AUTH_TOKEN_EVENT = "auth-token-change";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function saveAuthToken(token: string) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.dispatchEvent(new Event(AUTH_TOKEN_EVENT));
}

export function clearAuthToken() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.dispatchEvent(new Event(AUTH_TOKEN_EVENT));
}
