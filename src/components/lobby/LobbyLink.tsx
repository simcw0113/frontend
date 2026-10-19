"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { useI18n } from "@/components/I18nProvider";
import { isLobbyRoute, withLobbyTransition } from "@/lib/lobbyTransition";

// A link between lobby routes ("View all", "Back") that plays the lobby
// cross-fade. `href` is the app path without the language prefix ("/games");
// the current locale prefix is added here. Modified clicks and non-lobby targets behave like a normal Link.
export function LobbyLink({
  href,
  scroll = true,
  onGo,
  className,
  children,
}: {
  href: string;
  scroll?: boolean;
  onGo?: () => void;
  className?: string;
  children: ReactNode;
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
    withLobbyTransition(href, () => router.push(target, { scroll }));
  }

  return (
    <Link href={target} scroll={scroll} onClick={onClick} className={className}>
      {children}
    </Link>
  );
}
