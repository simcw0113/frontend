import type { Dictionary } from "@/i18n";

// The "How to Register" steps on the lobby home page (static, no API). `key` names the
// texts in i18n `howTo.steps`; `icon` picks the inline SVG in HowToRegister.tsx.
// Step 1 (`action: "register"`) is the only interactive one: it opens the Register
// view of the auth pop-up, like the header's JOIN US button.
export type RegisterStep = {
  key: keyof Dictionary["howTo"]["steps"];
  icon: "user-plus" | "wallet" | "trophy" | "gift";
  action?: "register";
};

export const registerSteps = [
  { key: "create", icon: "user-plus", action: "register" },
  { key: "deposit", icon: "wallet" },
  { key: "win", icon: "trophy" },
  { key: "reward", icon: "gift" },
] as const satisfies readonly RegisterStep[];
