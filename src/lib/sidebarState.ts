import { useSyncExternalStore } from "react";

// Open/closed state of the lobby sidebar, shared by every lobby page (home and
// the casino category pages are separate screens) so choosing a page, or
// collapsing the menu, carries over to the page that opens next. The server
// snapshot is "open", so hydration matches the markup.
let open = true;
const listeners = new Set<() => void>();

export function setSidebarOpen(next: boolean | ((current: boolean) => boolean)) {
  const value = typeof next === "function" ? next(open) : next;
  if (value === open) return;
  open = value;
  listeners.forEach((listener) => listener());
}

export function useSidebarOpen() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => open,
    () => true,
  );
}
