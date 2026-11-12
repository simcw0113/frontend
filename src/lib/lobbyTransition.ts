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

// Routes are written without the language prefix ("/casino/hot-games");
// the page that is shown carries its own prefix in data-lang.
export type LobbyRoute = string;

const SETTLE_MS = 20;
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

// The lobby ("/"), the casino category pages, the promotions, sports, VIP and Z-AI pages and
// the player's Recent games and Favourites, and Missions.
const LOBBY_PAGES = new Set(["/", "/promotions", "/sports", "/vip", "/z-ai", "/recent", "/favourites", "/missions", "/deposit"]);

export function isLobbyRoute(path: string): path is LobbyRoute {
  if (LOBBY_PAGES.has(path)) return true;
  if (!path.startsWith("/casino/")) return false;
  // /casino/{category}
  // /casino/{category}/game/{id}
  // /casino/{category}/provider/{public_code}/game/{game_code}
  const [category, ...rest] = path.split("?")[0].slice("/casino/".length).split("/");
  if (findCasinoCategory(category) === undefined) return false;
  const staticGame = rest.length === 2 && rest[0] === "game" && rest[1].length > 0;
  const lobbyGame =
    rest.length === 4 && rest[0] === "provider" && rest[1].length > 0 && rest[2] === "game" && rest[3].length > 0;
  return rest.length === 0 || staticGame || lobbyGame;
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

function isGameRoute(path: string | null | undefined): boolean {
  return !!path?.includes("/game/");
}

// Runs `go` (which must start the navigation to `path`) inside a view transition.
// Opening or leaving a game page is a plain navigation: no transition, nothing to wait for.
export function withLobbyTransition(path: LobbyRoute, go: () => void) {
  const from = shownRoute();
  const game = isGameRoute(path) || isGameRoute(from);
  // Already on that page (e.g. the sidebar's Home while on the lobby): nothing to swap.
  if (game || typeof document.startViewTransition !== "function" || reduceMotion() || from === path) {
    go();
    if (isGameRoute(from) && !isGameRoute(path)) revealGameOpener();
    return;
  }
  const mine = ++token;
  const root = document.documentElement;
  root.dataset.lobbyDir = path === "/" ? "back" : "forward";
  let navigated = false;
  const navigate = () => {
    if (navigated) return;
    navigated = true;
    go();
  };
  const done = () => {
    if (mine === token) delete root.dataset.lobbyDir;
  };
  try {
    const transition = document.startViewTransition(async () => {
      navigate();
      await whenShown(path);
    });
    transition.finished.then(done, done);
    transition.ready.catch(() => {}); // skipped by a newer transition: nothing to do
    transition.updateCallbackDone.catch(navigate);
  } catch {
    done();
    navigate(); // whatever happens to the transition, the navigation still happens
  }
}

// The game tile a game page was opened from (LobbyLink records it), so leaving the game can
// bring it back into view and focus it on the page it came from.
let opener: { href: string; from: string } | null = null;

export function rememberGameOpener(href: string) {
  const from = shownRoute();
  opener = from ? { href, from } : null;
}

export function revealGameOpener() {
  const target = opener;
  opener = null;
  if (!target) return;
  const started = performance.now();
  const poll = () => {
    if (shownRoute() === target.from && !isLoading()) {
      const shown = Array.from(document.querySelectorAll<HTMLElement>("main[data-route]")).find((el) => el.checkVisibility());
      const link = Array.from(shown?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? []).find(
        (el) => el.getAttribute("href") === target.href,
      );
      if (!link) return;
      const box = link.getBoundingClientRect();
      if (box.bottom < 80 || box.top > window.innerHeight) link.scrollIntoView({ block: "center" });
      link.focus({ preventScroll: true });
      return;
    }
    if (performance.now() - started < GIVE_UP_MS + 1000) window.setTimeout(poll, 30);
  };
  poll();
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
      // Game pages and no-animation setups: the router handles the event as usual.
      if (isGameRoute(from.route) || isGameRoute(to) || typeof document.startViewTransition !== "function" || reduceMotion()) {
        if (isGameRoute(from.route) && !isGameRoute(to)) revealGameOpener();
        return;
      }
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
