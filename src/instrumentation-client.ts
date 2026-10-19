import { installLobbyHistoryTransitions } from "@/lib/lobbyTransition";

// Runs before hydration, so the lobby's popstate listener is registered ahead of
// the router's own (listeners run in registration order). That lets browser
// Back/Forward between lobby pages start a view transition before the router
// swaps the page. See src/lib/lobbyTransition.ts.
installLobbyHistoryTransitions();
