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

  // Mark the list when its links do not fit (CSS then fades the edges of the scrolling list).
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const update = () => list.toggleAttribute("data-scroll", list.scrollWidth > list.clientWidth + 1);
    const observer = new ResizeObserver(update);
    observer.observe(list);
    list.querySelectorAll("li").forEach((item) => observer.observe(item)); // labels change with the language
    update();
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label={t.topNav.label} className="top-nav">
      <ul ref={listRef} className="top-nav-list">
        {topNavItems.map((item) => {
          const active = item.path === route;
          return (
            <li key={item.id} className="shrink-0 snap-start">
              {item.featured ? (
                <LobbyLink href={item.path} aria-current={active ? "page" : undefined} className="top-nav-link top-nav-featured">
                  {/* Gradient border, glowing pill, shimmering gradient text and a twinkling
                      sparkle; all static under reduced motion. The name is the text. */}
                  <span className="zai-pill">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="zai-spark">
                      <path d="M12 1.5 13.9 10.1 22.5 12 13.9 13.9 12 22.5 10.1 13.9 1.5 12 10.1 10.1Z" />
                    </svg>
                    <span className="zai-text">{t.topNav[item.labelKey]}</span>
                  </span>
                </LobbyLink>
              ) : (
                <LobbyLink
                  href={item.path}
                  aria-current={active ? "page" : undefined}
                  className={`top-nav-link ${active ? "text-brand" : "text-white hover:text-brand"}`}
                >
                  {t.topNav[item.labelKey]}
                </LobbyLink>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Title bar of a page that is not ready yet (Sports, VIP, Z-AI): the title and "Coming soon".
export function ComingSoonHeader({ title }: { title: string }) {
  const { t } = useI18n();
  return (
    <div className="promo-header">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{t.comingSoon.text}</p>
    </div>
  );
}
