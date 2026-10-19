// Cross-fade between the lobby and its "View all" pages, driven directly by the
// browser's View Transitions API instead of React's <ViewTransition>. React only
// animates a revealed (kept-alive) page when it happens to re-render it, so the
// animation silently went missing on later round trips and never ran for the
// browser Back button. Here every navigation between lobby routes is wrapped
// the same way: the old page is captured first, the router is told to navigate
// inside the transition callback, and the callback resolves once the new page
// is visible. The named parts (header, search, content) are in globals.css.
import { isSlug, stripLocale } from "@/i18n/routing";

import { findCasinoCategory } from "@/config/categories";

// Routes are written without the language prefix ("/casino/trending-games");
// the page that is shown carries its own prefix in data-lang.
export type LobbyRoute = string;

const SETTLE_MS = 40;
// How long the old page is held while the new route loads. Instant in production;
// the first visit of a route in `next dev` has to compile it first, and giving up
// early would end the transition on the old page and swap it in later without any
// animation.
const GIVE_UP_MS = 4000;
// Extra time to wait for the new page's game lists (Suspense skeletons) to resolve,
// so the transition lands on content instead of placeholders.
const CONTENT_WAIT_MS = 800;

let token = 0;
let replaying = false;
let installed = false;

// The lobby ("/"), the casino category pages and the promotions page.
export function isLobbyRoute(path: string): path is LobbyRoute {
  if (path === "/" || path === "/promotions") return true;
  return path.startsWith("/casino/") && findCasinoCategory(path.slice("/casino/".length)) !== undefined;
}

function reduceMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// The lobby page that is currently shown (kept-alive pages are hidden).
function shownPage(): { route: string; lang: string } | null {
  const shown = Array.from(document.querySelectorAll<HTMLElement>("main[data-route]")).find((el) =>
    el.checkVisibility(),
  );
  return shown?.dataset.route ? { route: shown.dataset.route, lang: shown.dataset.lang ?? "" } : null;
}

function shownRoute(): string | null {
  return shownPage()?.route ?? null;
}

// True while the shown page still has loading skeletons (see GridSkeleton).
function isLoading(): boolean {
  const shown = Array.from(document.querySelectorAll<HTMLElement>("main[data-route]")).find((el) =>
    el.checkVisibility(),
  );
  return !!shown?.querySelector("[data-skeleton]");
}

function whenShown(path: string): Promise<void> {
  return new Promise((resolve) => {
    const started = performance.now();
    let shownAt = 0;
    // Rendering is paused inside a transition callback, so poll with timers.
    const poll = () => {
      const now = performance.now();
      if (!shownAt && shownRoute() === path) shownAt = now;
      const ready = shownAt && (!isLoading() || now - shownAt > CONTENT_WAIT_MS);
      if (ready || now - started > GIVE_UP_MS) {
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
  // Already on that page (e.g. the sidebar's Home while on the lobby): nothing to swap.
  if (typeof document.startViewTransition !== "function" || reduceMotion() || shownRoute() === path) {
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
      const from = shownPage();
      const [, lang] = window.location.pathname.split("/");
      const to = stripLocale(window.location.pathname);
      // Same language only: another prefix is a different document, not a swap.
      if (!from || from.lang !== lang || !isSlug(lang)) return;
      if (from.route === to || !isLobbyRoute(to) || !isLobbyRoute(from.route)) return;
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
