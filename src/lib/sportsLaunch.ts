import { apiConfig, sportsConfig } from "@/config/site";
import { apiJson, isApiStatusFailure, readApiMessage } from "@/lib/api";
import { lobbyLocale, lookupLobbyProductByCode } from "@/lib/lobbyApi";

// Sports page launch. Same /opengame endpoint as casino games, but the body is
// { provider: public_code, isMobile } — not { code } and not { provider, game }.
// public_code is resolved from the lobby product list (GET /config) by matching
// sportsConfig.launchCode (IBC_T[ORI]) to Provider.code / name, unless an
// explicit sportsConfig.publicCode override is set. Success: { status: true,
// type: "redirect", launcher: { url } }.
//
// Product `status` is checked before the sign-in gate and before /opengame:
// 1 active, 2 new, 3 hot, 4 maintenance, 5 coming soon, 6 popular.
// Hidden(7)/inactive(8) are normally omitted by the backend. A missing product
// after a successful /config fetch is "unavailable". A failed /config fetch is
// "unknown" — do not claim unavailable; attempt launch if we have a public_code.

export const PRODUCT_STATUS = {
  ACTIVE: 1,
  NEW: 2,
  HOT: 3,
  MAINTENANCE: 4,
  COMING_SOON: 5,
  POPULAR: 6,
  HIDDEN: 7,
  INACTIVE: 8,
} as const;

export type SportsProductState = "playable" | "unavailable" | "maintenance" | "comingSoon" | "unknown";

export type SportsProductStatus = {
  state: SportsProductState;
  publicCode?: string;
};

export type SportsLaunch =
  | { url: string }
  | { error: "signin" | "failed" | "unavailable" | "maintenance" | "comingSoon"; message?: string };

const REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_LAUNCH_PATH = "/opengame";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readLaunchUrl(payload: unknown): string {
  const root = asRecord(payload);
  if (!root) return "";
  const data = asRecord(root.data);
  // Confirmed IBC shape: launcher: { url }. Also accept a plain string, or url on data/root.
  const launcher = root.launcher ?? data?.launcher ?? data?.url ?? root.url;
  if (typeof launcher === "string") return launcher.trim();
  return text(asRecord(launcher)?.url);
}

export function sportsStateFromStatus(status: number): Exclude<SportsProductState, "unknown"> {
  if (status === PRODUCT_STATUS.MAINTENANCE) return "maintenance";
  if (status === PRODUCT_STATUS.COMING_SOON) return "comingSoon";
  if (status === PRODUCT_STATUS.HIDDEN || status === PRODUCT_STATUS.INACTIVE) return "unavailable";
  return "playable";
}

export async function getSportsProductStatus(lang: string): Promise<SportsProductStatus> {
  const override = sportsConfig.publicCode.trim();
  const lookup = await lookupLobbyProductByCode(sportsConfig.launchCode, lobbyLocale(lang));
  if (!lookup.ok) return { state: "unknown", ...(override ? { publicCode: override } : {}) };
  if (!lookup.product) return { state: "unavailable" };
  const state = sportsStateFromStatus(lookup.product.status);
  const publicCode = override || lookup.product.id;
  return { state, ...(publicCode ? { publicCode } : {}) };
}

// Never throws.
export async function getSportsLaunch(opts: {
  lang: string;
  isMobile: boolean;
  token?: string | null;
}): Promise<SportsLaunch> {
  const status = await getSportsProductStatus(opts.lang);
  if (status.state === "unavailable" || status.state === "maintenance" || status.state === "comingSoon") {
    return { error: status.state };
  }
  if (!opts.token) return { error: "signin" };
  const provider = status.publicCode ?? "";
  if (!provider) return { error: "failed" };
  const config: Partial<typeof apiConfig> = apiConfig;
  try {
    const path = config.gameLaunchPath || DEFAULT_LAUNCH_PATH;
    const payload = await apiJson(`${path}?${new URLSearchParams({ lang: opts.lang, locale: lobbyLocale(opts.lang) })}`, {
      method: "POST",
      auth: false,
      headers: {
        Authorization: `Bearer ${opts.token}`,
        "Content-Type": "application/json",
        "country-id": config.lobbyCountryId || "1",
        locale: lobbyLocale(opts.lang),
      },
      body: JSON.stringify({ provider, isMobile: opts.isMobile }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (isApiStatusFailure(payload)) return { error: "failed", message: readApiMessage(payload) ?? undefined };
    const url = readLaunchUrl(payload);
    return url ? { url } : { error: "failed", message: readApiMessage(payload) ?? undefined };
  } catch {
    return { error: "failed" };
  }
}
