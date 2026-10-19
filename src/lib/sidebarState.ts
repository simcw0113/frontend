import { useSyncExternalStore } from "react";

// Lobby sidebar state, shared by every lobby page (home, casino categories, promotions, ...
// are separate screens) so it carries over to the page that opens next.
//   - expanded: from lg (1024px) the sidebar is a full-height column, either expanded (icon +
//     label) or collapsed to an icon rail. The server snapshot is "expanded" so hydration
//     matches the markup.
//   - drawer: below lg it is a drawer over the page, closed until the header toggle opens it.
// The breakpoint matches the `lg` rules of .lobby-aside in globals.css.
export const SIDEBAR_RAIL_QUERY = "(min-width: 1024px)";

function store(initial: boolean) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    set(next: boolean | ((current: boolean) => boolean)) {
      const resolved = typeof next === "function" ? next(value) : next;
      if (resolved === value) return;
      value = resolved;
      listeners.forEach((listener) => listener());
    },
    use() {
      return useSyncExternalStore(
        (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        () => value,
        () => initial,
      );
    },
  };
}

const expanded = store(true);
const drawer = store(false);

export const setSidebarOpen = expanded.set;
export const useSidebarOpen = expanded.use;
export const setDrawerOpen = drawer.set;
export const useDrawerOpen = drawer.use;

// True from lg (sidebar is the column/rail); the server assumes desktop.
export function useSidebarRail() {
  return useSyncExternalStore(
    (listener) => {
      const media = window.matchMedia(SIDEBAR_RAIL_QUERY);
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    },
    () => window.matchMedia(SIDEBAR_RAIL_QUERY).matches,
    () => true,
  );
}
