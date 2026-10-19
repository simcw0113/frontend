"use client";

import { useEffect, useRef } from "react";
import { useI18n } from "@/components/I18nProvider";
import { LobbyLink } from "@/components/lobby/LobbyLink";
import { topNavItems } from "@/config/topNav";

// The top bar links (config/topNav.ts). From lg they sit inline after the logo; below lg the
// same list wraps to a second, horizontally scrollable row under the header (.top-nav in
// globals.css). `route` is the shown page without the language prefix.
export function TopNav({ route }: { route: string }) {
  const { t } = useI18n();
  const listRef = useRef<HTMLUListElement>(null);

  // In the scrolling row, bring the current page's link into view (e.g. VIP on a phone).
  useEffect(() => {
    const list = listRef.current;
    const current = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !current || list.scrollWidth <= list.clientWidth) return;
    const item = current.parentElement ?? current;
    if (item.offsetLeft < list.scrollLeft || item.offsetLeft + item.offsetWidth > list.scrollLeft + list.clientWidth) {
      list.scrollLeft = item.offsetLeft - 12;
    }
  }, [route]);

  return (
    <nav aria-label={t.topNav.label} className="top-nav">
      <ul ref={listRef} className="top-nav-list">
        {topNavItems.map((item) => {
          const active = item.path === route;
          return (
            <li key={item.id} className="shrink-0 snap-start">
              <LobbyLink
                href={item.path}
                aria-current={active ? "page" : undefined}
                className={`top-nav-link ${active ? "text-brand" : "text-white hover:text-brand"}`}
              >
                {t.topNav[item.labelKey]}
              </LobbyLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Title bar of a page that is not ready yet (Sports, VIP): the title and "Coming soon".
export function ComingSoonHeader({ title }: { title: string }) {
  const { t } = useI18n();
  return (
    <div className="promo-header">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{t.comingSoon.text}</p>
    </div>
  );
}
