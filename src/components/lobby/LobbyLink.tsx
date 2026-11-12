"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { useI18n } from "@/components/I18nProvider";
import { isLobbyRoute, rememberGameOpener, withLobbyTransition } from "@/lib/lobbyTransition";

// Counts lobby navigations made in this tab, so the game page's close button can go back
// (to the list the game was opened from) instead of leaving the site.
let inAppNavigations = 0;
export function hasInAppHistory() {
  return inAppNavigations > 0;
}

// A link between lobby routes ("View all", "Back") that plays the lobby
// cross-fade. `href` is the app path without the language prefix ("/games");
// the current locale prefix is added here. Modified clicks and non-lobby targets behave like a normal Link.
export function LobbyLink({
  href,
  scroll = true,
  onGo,
  className,
  title,
  autoFocusTarget,
  ariaLabel,
  children,
  "aria-current": ariaCurrent,
  role,
  "aria-selected": ariaSelected,
}: {
  href: string;
  scroll?: boolean;
  onGo?: () => void;
  className?: string;
  title?: string;
  autoFocusTarget?: boolean; // data-autofocus (first focus in a dialog)
  ariaLabel?: string;
  children: ReactNode;
  "aria-current"?: "page";
  role?: string;
  "aria-selected"?: boolean;
}) {
  const router = useRouter();
  const { href: localized } = useI18n();
  const target = localized(href);

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !isLobbyRoute(href)
    ) {
      return;
    }
    event.preventDefault();
    onGo?.();
    inAppNavigations += 1;
    if (href.includes("/game/")) rememberGameOpener(target);
    withLobbyTransition(href, () => router.push(target, { scroll }));
  }

  // Warm the route up before the click (hover, keyboard focus, touch) so the
  // transition does not have to hold the old page while it loads.
  function warm() {
    router.prefetch(target);
  }

  return (
    <Link
      href={target}
      scroll={scroll}
      onClick={onClick}
      onMouseEnter={warm}
      onFocus={warm}
      onTouchStart={warm}
      aria-current={ariaCurrent}
      role={role}
      aria-selected={ariaSelected}
      title={title}
      data-autofocus={autoFocusTarget || undefined}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </Link>
  );
}
