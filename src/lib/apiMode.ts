import { apiConfig } from "@/config/site";

// True when there is an API address to call. With no NEXT_PUBLIC_API_BASE_URL the
// lobby data (game lists, top wins, search) is ALWAYS the static sample data,
// whatever the useStatic* switches say, so a missing/stale switch can never hide a
// section. Reads defensively: a stale dev module graph may hand us an older config.
export function hasApiBaseUrl(): boolean {
  const config: Partial<typeof apiConfig> = apiConfig;
  return Boolean((config.baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim());
}

// Static data when forced by the switch, or when there is no API to call.
export function useStaticData(switchValue: boolean | undefined): boolean {
  return switchValue === true || !hasApiBaseUrl();
}
