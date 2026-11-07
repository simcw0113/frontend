import { apiConfig } from "@/config/site";

type ApiOptions = RequestInit & {
  auth?: boolean;
};

export type ApiErrorCode = "api_unconfigured" | "api_unexpected" | "api_failed" | "token_missing";

export class ApiError extends Error {
  status: number;
  code?: ApiErrorCode;

  constructor(message: string, status: number, code?: ApiErrorCode) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const TOKEN_KEYS = ["token", "access_token", "accessToken", "jwt"] as const;

export function extractAuthToken(payload: unknown): string | null {
  if (typeof payload === "string") {
    const value = payload.trim();
    return value ? value : null;
  }

  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  for (const key of TOKEN_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  for (const key of ["data", "result"] as const) {
    const nested = extractAuthToken(record[key]);
    if (nested) return nested;
  }

  return null;
}

export function readApiMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const message = (payload as { message?: unknown }).message;
  if (typeof message !== "string") return null;
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 180 || trimmed.split(".").length > 2) {
    return null;
  }
  return trimmed;
}

export async function apiFetch(path: string, init: ApiOptions = {}) {
  const { headers: initHeaders, ...rest } = init;
  delete (rest as { auth?: boolean }).auth;

  if (!apiConfig.baseUrl) {
    throw new ApiError("The API address is not configured yet.", 0, "api_unconfigured");
  }

  const headers = new Headers(initHeaders);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  // The auth token lives in an HttpOnly cookie (set by /api/auth/login). Client
  // JavaScript cannot read it; server callers that need auth pass
  // `Authorization: Bearer <token>` themselves after reading the cookie.

  const url = path.startsWith("http")
    ? path
    : `${apiConfig.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  return fetch(url, { ...rest, headers });
}

export async function apiJson<T = unknown>(path: string, init?: ApiOptions): Promise<T> {
  const response = await apiFetch(path, init);
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
    throw new ApiError(
      readApiMessage(payload) ?? "The request could not be completed.",
      response.status,
      readApiMessage(payload) ? undefined : "api_failed",
    );
  }

  return payload as T;
}
