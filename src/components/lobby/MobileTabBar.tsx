"use client";

import { useI18n } from "@/components/I18nProvider";
import { Avatar } from "@/components/lobby/Avatar";
import { LobbyLink } from "@/components/lobby/LobbyLink";

// Phone-only tab bar (<768px), matching Kickwin's 60px bar + safe-area:
// Menu (drawer), Search, Casino (home), Sports, Profile.
// Hidden from md and up (desktop/tablet chrome is unchanged). Also hidden
// on the full-screen game page and while sign-in / search / deposit dialogs
// cover the screen.
export function MobileTabBar({
  focus,
  drawerOpen,
  searchOpen,
  profileOpen,
  profileHref,
  profileAvatar,
  hidden,
  onMenu,
  onSearch,
  onProfile,
}: {
  focus: string;
  drawerOpen: boolean;
  searchOpen: boolean;
  profileOpen: boolean;
  profileHref?: string;
  profileAvatar?: { src: string | null; name: string; initials?: string };
  hidden: boolean;
  onMenu: () => void;
  onSearch: () => void;
  onProfile: () => void;
}) {
  const { t } = useI18n();
  const casinoOn = !drawerOpen && !searchOpen && !profileOpen && (focus === "home" || focus === "casino" || focus === "game");
  const sportsOn = !drawerOpen && !searchOpen && !profileOpen && focus === "sports";

  return (
    <>
      <style>{`
        @media (max-width: 767.98px) {
          .lobby-root {
            --lobby-header-h: 4rem;
            --mobile-tab-h: calc(3.75rem + env(safe-area-inset-bottom, 0px));
          }
          .lobby-aside {
            height: calc(100dvh - var(--lobby-header-h) - var(--mobile-tab-h));
          }
          .lobby-backdrop {
            bottom: var(--mobile-tab-h);
          }
          .lobby-root:has(.gp-stage) .mobile-tab-bar {
            display: none;
          }
        }
      `}</style>
      <nav
        aria-label={t.bottomNav.label}
        className={`mobile-tab-bar fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-lobby pb-[env(safe-area-inset-bottom,0px)] md:hidden ${hidden ? "hidden" : ""}`}
      >
        <ul className="grid h-[3.75rem] grid-cols-5">
          <li>
            <button
              type="button"
              aria-current={drawerOpen ? "true" : undefined}
              aria-expanded={drawerOpen}
              aria-controls="lobby-sidebar"
              onClick={onMenu}
              className={tabClass(drawerOpen)}
            >
              <MenuTabIcon />
              {t.bottomNav.menu}
            </button>
          </li>
          <li>
            <button type="button" aria-current={searchOpen ? "true" : undefined} onClick={onSearch} className={tabClass(searchOpen)}>
              <SearchTabIcon />
              {t.bottomNav.search}
            </button>
          </li>
          <li>
            <LobbyLink href="/" aria-current={casinoOn ? "page" : undefined} className={tabClass(casinoOn)}>
              <CasinoTabIcon />
              {t.bottomNav.casino}
            </LobbyLink>
          </li>
          <li>
            <LobbyLink href="/sports" aria-current={sportsOn ? "page" : undefined} className={tabClass(sportsOn)}>
              <SportsTabIcon />
              {t.bottomNav.sports}
            </LobbyLink>
          </li>
          <li>
            {profileHref ? (
              <LobbyLink href={profileHref} aria-current={profileOpen ? "page" : undefined} className={tabClass(profileOpen)}>
                {profileAvatar ? (
                  <Avatar
                    src={profileAvatar.src}
                    name={profileAvatar.name}
                    initials={profileAvatar.initials}
                    className="size-[22px] text-[8px]"
                  />
                ) : (
                  <ProfileTabIcon />
                )}
                {t.bottomNav.profile}
              </LobbyLink>
            ) : (
              <button
                type="button"
                data-account-tab=""
                aria-current={profileOpen ? "true" : undefined}
                aria-haspopup="dialog"
                onClick={onProfile}
                className={tabClass(profileOpen)}
              >
                {profileAvatar ? (
                  <Avatar
                    src={profileAvatar.src}
                    name={profileAvatar.name}
                    initials={profileAvatar.initials}
                    className="size-[22px] text-[8px]"
                  />
                ) : (
                  <ProfileTabIcon />
                )}
                {t.bottomNav.profile}
              </button>
            )}
          </li>
        </ul>
      </nav>
    </>
  );
}

function tabClass(active: boolean) {
  return `flex h-full w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
    active ? "text-white" : "text-muted"
  }`;
}

function MenuTabIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7 H20 M4 12 H20 M4 17 H20" />
    </svg>
  );
}

function SearchTabIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20 L16.2 16.2" />
    </svg>
  );
}

function CasinoTabIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="6" width="11" height="14" rx="1.5" transform="rotate(-12 9 13)" />
      <rect x="9.5" y="5" width="11" height="14" rx="1.5" transform="rotate(10 15 12)" />
    </svg>
  );
}

function SportsTabIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 3.75 C10 7 10 17 12 20.25 M12 3.75 C14 7 14 17 12 20.25 M3.9 9.5 H20.1 M3.9 14.5 H20.1" />
    </svg>
  );
}

function ProfileTabIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19 C6.2 15.8 8.6 14 12 14 C15.4 14 17.8 15.8 18.5 19" />
    </svg>
  );
}
