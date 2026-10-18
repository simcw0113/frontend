"use client";

import { installLobbyHistoryTransitions } from "@/lib/lobbyTransition";

// Must register its popstate listener before the app router does (the router
// adds its own after hydration), so it runs when this module loads, not in an
// effect. Rendered once from the root layout.
if (typeof window !== "undefined") installLobbyHistoryTransitions();

export function LobbyTransitionBoot() {
  return null;
}
