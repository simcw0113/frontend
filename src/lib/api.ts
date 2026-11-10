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

// Member `token` only. Ignore `session_token`; this lobby does not use it.
const TOKEN_KEYS = ["token", "access_token", "accessToken", "jwt"] as const;

function readNamedField(payload: unknown, keys: readonly string[]): string | null {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  for (const key of ["data", "result"] as const) {
    const nested = readNamedField(record[key], keys);
    if (nested) return nested;
  }

  return null;
}

export function extractAuthToken(payload: unknown): string | null {
  if (typeof payload === "string") {
    const value = payload.trim();
    return value ? value : null;
  }

  return readNamedField(payload, TOKEN_KEYS);
}

export function isApiStatusFailure(payload: unknown): boolean {
  return Boolean(payload && typeof payload === "object" && (payload as { status?: unknown }).status === false);
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

  // The member token lives in an HttpOnly; Secure; SameSite=Lax cookie (set by
  // /api/auth/login). Client JavaScript cannot read it. Server callers that need
  // the member pass `Authorization: Bearer <token>` themselves. Do not read or
  // send `session_token`.

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
