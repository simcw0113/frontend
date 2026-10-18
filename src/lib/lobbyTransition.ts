// Cross-fade between the lobby and its "View all" pages, driven directly by the
// browser's View Transitions API instead of React's <ViewTransition>. React only
// animates a revealed (kept-alive) page when it happens to re-render it, so the
// animation silently went missing on later round trips and never ran for the
// browser Back button. Here every navigation between lobby routes is wrapped
// the same way: the old page is captured first, the router is told to navigate
// inside the transition callback, and the callback resolves once the new page
// is visible. The named parts (header, search, content) are in globals.css.
export type LobbyRoute = "/" | "/games" | "/sports";

const ROUTES: readonly string[] = ["/", "/games", "/sports"];
const SETTLE_MS = 40;
const GIVE_UP_MS = 1500;

let token = 0;
let replaying = false;
let installed = false;

export function isLobbyRoute(path: string): path is LobbyRoute {
  return ROUTES.includes(path);
}

function reduceMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Route of the lobby page that is currently shown (kept-alive pages are hidden).
function shownRoute(): string | null {
  const shown = Array.from(document.querySelectorAll<HTMLElement>("main[data-route]")).find((el) =>
    el.checkVisibility(),
  );
  return shown?.dataset.route ?? null;
}

function whenShown(path: string): Promise<void> {
  return new Promise((resolve) => {
    const started = performance.now();
    // Rendering is paused inside a transition callback, so poll with timers.
    const poll = () => {
      if (shownRoute() === path || performance.now() - started > GIVE_UP_MS) {
        window.setTimeout(resolve, SETTLE_MS); // let layout effects and scroll settle
      } else {
        window.setTimeout(poll, 10);
      }
    };
    poll();
  });
}

// Runs `go` (which must start the navigation to `path`) inside a view transition.
export function withLobbyTransition(path: LobbyRoute, go: () => void) {
  if (typeof document.startViewTransition !== "function" || reduceMotion()) {
    go();
    return;
  }
  const mine = ++token;
  const root = document.documentElement;
  root.dataset.lobbyDir = path === "/" ? "back" : "forward";
  const transition = document.startViewTransition(async () => {
    go();
    await whenShown(path);
  });
  const done = () => {
    if (mine === token) delete root.dataset.lobbyDir;
  };
  transition.finished.then(done, done);
  transition.ready.catch(() => {}); // skipped by a newer transition: nothing to do
}

// Browser Back/Forward between lobby routes. The router would update the page
// before the old one is captured, so the popstate is held back, the transition
// is started, and the event is replayed to the router inside its callback.
export function installLobbyHistoryTransitions() {
  if (installed) return;
  installed = true;
  window.addEventListener(
    "popstate",
    (event) => {
      if (replaying) return;
      const from = shownRoute();
      const to = window.location.pathname;
      if (!from || from === to || !isLobbyRoute(to) || !isLobbyRoute(from)) return;
      if (typeof document.startViewTransition !== "function" || reduceMotion()) return;
      event.stopImmediatePropagation();
      const state = window.history.state;
      withLobbyTransition(to, () => {
        replaying = true;
        try {
          window.dispatchEvent(new PopStateEvent("popstate", { state }));
        } finally {
          replaying = false;
        }
      });
    },
    true,
  );
}
