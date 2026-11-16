// Shared tab ids for /{lang}/profile?tab=… — kept free of "use client" so
// server components (the route page) and the profile UI can both import them.

export const PROFILE_TABS = [
  { id: "profile", labelKey: "myProfile" },
  { id: "verification", labelKey: "verification" },
  { id: "security", labelKey: "security" },
  { id: "banking", labelKey: "banking" },
  { id: "swap", labelKey: "swap" },
  { id: "transactions", labelKey: "transactions" },
  { id: "rollover", labelKey: "rollover" },
  { id: "history", labelKey: "betHistory" },
  { id: "poster", labelKey: "poster" },
] as const;

export type ProfileTabId = (typeof PROFILE_TABS)[number]["id"];

const TAB_IDS: readonly ProfileTabId[] = PROFILE_TABS.map((tab) => tab.id);

export function parseProfileTab(value: unknown): ProfileTabId {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && (TAB_IDS as readonly string[]).includes(raw) ? (raw as ProfileTabId) : "profile";
}
