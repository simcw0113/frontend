"use client";

import { Suspense, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import type { AuthView } from "@/components/auth/AuthFormPanel";
import { SignInDialog } from "@/components/SignInDialog";
import { useI18n } from "@/components/I18nProvider";
import { bannerSlides } from "@/config/banners";
import { siteConfig } from "@/config/site";
import { defaultCasinoCategory, findCasinoCategory } from "@/config/categories";
import { HOME_SCROLL_KEY, HomeGameContent } from "@/components/lobby/HomeGameContent";
import { HowToRegister } from "@/components/lobby/HowToRegister";
import { LobbyFooter } from "@/components/lobby/LobbyFooter";
import { LobbyLink } from "@/components/lobby/LobbyLink";
import { GiftIcon, PromotionsGrid, PromotionsHeader, PromotionsSkeleton } from "@/components/lobby/Promotions";
import { ProviderRow } from "@/components/lobby/ProviderRow";
import { SearchModal } from "@/components/lobby/SearchModal";
import { TopWins, TopWinsSkeleton } from "@/components/lobby/TopWins";
import { fill, localeChoices } from "@/i18n";
import { toSlug } from "@/i18n/routing";
import type { CategoryGamesResult } from "@/lib/games";
import type { PartnersResult } from "@/lib/partners";
import type { PromotionsResult } from "@/lib/promotions";
import type { TopWinsResult } from "@/lib/topWins";
import { animate, reduceMotion } from "@/lib/motion";
import { setSidebarOpen, useSidebarOpen } from "@/lib/sidebarState";

const NAV_ITEM =
  "flex h-11 w-full items-center rounded-lg px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";


export type LobbyFocus = "home" | "casino" | "promotions";

// `games` holds one promise per category slug, started on the server (lib/games.ts)
// and read here with use() inside <Suspense>, so the page shell shows at once.
export function LobbyScreen({
  focus = "home",
  category,
  games,
  topWins,
  partners,
  promotions,
}: {
  focus?: LobbyFocus;
  category?: string;
  games: Record<string, Promise<CategoryGamesResult>>;
  topWins?: Promise<TopWinsResult>; // home only
  partners?: Promise<PartnersResult>; // home only
  promotions?: Promise<PromotionsResult>; // promotions page only
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const { locale, setLocale, t } = useI18n();
  const sidebarOpen = useSidebarOpen();
  const [signInOpen, setSignInOpen] = useState(false);
  const [authView, setAuthView] = useState<AuthView>("login");
  const [cookiesOn, setCookiesOn] = useState(true);
  const [provider, setProvider] = useState<string | null>(null);

  // The router may keep the lobby mounted while a "View all" page is open and
  // show it again on the way back. Put the scroll position where it was before
  // leaving, in the same commit as the swap, so the cross-fade lands on it.
  const returning = useRef(false);
  useLayoutEffect(() => {
    if (focus !== "home") return;
    if (!returning.current) {
      returning.current = true;
      window.sessionStorage.removeItem(HOME_SCROLL_KEY);
      return;
    }
    const saved = Number(window.sessionStorage.getItem(HOME_SCROLL_KEY));
    if (saved > 0) window.scrollTo({ top: saved, behavior: "instant" });
  }, [focus]);

  // Ctrl/Cmd+K opens the Explore search from anywhere on the lobby pages. While it
  // is open the pop-up handles the shortcut itself (it toggles closed). Not taken
  // while another dialog is open or while typing in a field other than the search bar.
  useEffect(() => {
    if (searchOpen || signInOpen) return;
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== "k") return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.id !== "lobby-search" &&
        (target.isContentEditable || target.matches("input, textarea, select"))
      ) {
        return;
      }
      event.preventDefault();
      setSearchOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen, signInOpen]);

  function toggleSidebar() {
    setSidebarOpen((open) => !open);
  }

  // The sidebar floats over the page below md: close it after choosing a page.
  function closeSidebarOnSmallScreens() {
    if (window.matchMedia("(max-width: 767px)").matches) setSidebarOpen(false);
  }

  function dismissCookies() {
    setCookiesOn(false);
  }

  const casino = (category && findCasinoCategory(category)) || defaultCasinoCategory;
  const route = focus === "home" ? "/" : focus === "promotions" ? "/promotions" : `/casino/${casino.slug}`;
  const openRegister = () => {
    setAuthView("register");
    setSignInOpen(true);
  };

  return (
    <div className="min-h-full bg-lobby text-ink">
      <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} initialView={authView} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <header style={{ viewTransitionName: "lobby-header" }} className="sticky top-0 z-40 flex h-16 items-center gap-1 border-b border-white/10 bg-lobby px-3">
        <button
          type="button"
          aria-label={sidebarOpen ? t.menu.hide : t.menu.show}
          aria-expanded={sidebarOpen}
          aria-controls="lobby-sidebar"
          onClick={toggleSidebar}
          className="grid size-11 shrink-0 place-items-center rounded-lg text-brand hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <MenuIcon />
        </button>
        <h1 className="ml-1.5 min-w-0 md:ml-[13px]">
          <LobbyLink
            href="/"
            className="flex items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {/* Plain img with explicit width/height (no layout shift): the file may be swapped for any host/format. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={siteConfig.logo.src}
              width={siteConfig.logo.width}
              height={siteConfig.logo.height}
              alt={t.siteName}
              className="h-9 w-auto max-w-[40vw] object-contain"
              draggable={false}
            />
          </LobbyLink>
        </h1>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAuthView("login");
              setSignInOpen(true);
            }}
            className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-white/10"
          >
            {t.auth.signIn}
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthView("register");
              setSignInOpen(true);
            }}
            className="join-glow rounded-lg bg-brand px-3.5 py-2 text-sm font-extrabold tracking-wide whitespace-nowrap text-lobby uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {t.auth.joinUs}
          </button>
        </div>
      </header>

      <div className={`lobby-shell flex${sidebarOpen ? " is-open" : ""}`}>
        <div className="lobby-slot sticky top-16 h-[calc(100vh-4rem)] self-start">
          <aside
            id="lobby-sidebar"
            aria-hidden={!sidebarOpen}
            inert={!sidebarOpen}
            className="lobby-aside flex h-full w-64 flex-col border-r border-white/10 bg-lobby p-3"
          >
            <LobbyLink
              href="/"
              onGo={closeSidebarOnSmallScreens}
              aria-current={focus === "home" ? "page" : undefined}
              className={`${NAV_ITEM} mb-1 gap-3 ${focus === "home" ? "bg-brand/15 text-brand" : "hover:bg-white/10"}`}
            >
              <HomeIcon />
              {t.menu.home}
            </LobbyLink>
            <LobbyLink
              href="/promotions"
              onGo={closeSidebarOnSmallScreens}
              aria-current={focus === "promotions" ? "page" : undefined}
              className={`${NAV_ITEM} mb-1 gap-3 ${focus === "promotions" ? "bg-brand/15 text-brand" : "hover:bg-white/10"}`}
            >
              <GiftIcon />
              {t.menu.promotions}
            </LobbyLink>
            <div className="relative" data-nav-item>
              <button
                type="button"
                aria-expanded={languageOpen}
                aria-label={`${t.language.label}: ${t.language[locale]}`}
                onClick={() => setLanguageOpen((open) => !open)}
                className={`${NAV_ITEM} justify-between hover:bg-white/10`}
              >
                <span className="flex items-center gap-3">
                  <GlobeIcon />
                  {t.language[locale]}
                </span>
                <span aria-hidden="true" className={`inline-block transition-transform duration-300 ${languageOpen ? "rotate-180" : ""}`}>
                  ▾
                </span>
              </button>
              <Collapse open={languageOpen}>
                <div className="mt-1 rounded-lg border border-white/10 bg-white/5 p-1">
                  {localeChoices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      aria-pressed={locale === choice.id}
                      onClick={() => {
                        setLocale(choice.id);
                        setLanguageOpen(false);
                      }}
                      className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                        locale === choice.id ? "bg-brand text-lobby" : "hover:bg-white/10"
                      }`}
                    >
                      {t.language[choice.label]}
                    </button>
                  ))}
                </div>
              </Collapse>
            </div>
          </aside>
        </div>

        <main id="content" data-route={route} data-lang={toSlug(locale)} className="min-w-0 flex-1 px-3 py-4 sm:px-5">
          <div className="lobby-vt-top">
            {focus === "home" ? <Hero /> : focus === "promotions" ? <PromotionsHeader /> : (
              <LobbyLink
                href="/"
                scroll={false}
                className="inline-flex items-center text-sm font-semibold text-muted hover:text-white"
              >
                <span aria-hidden="true" className="mr-1">‹</span>
                {t.lobby.back}
              </LobbyLink>
            )}
            {/* Home only: banner -> Top wins -> How to Register -> search bar. Both sections are part
                of the "top" transition group, so they fade with the banner. Each wrapper adds its
                own 24px above; the Top wins wrapper collapses (empty:hidden) when that section hides
                itself (no data / error), so How to Register then follows the banner with no gap
                left behind. The extra pb-2 plus the search bar's mt-4 make the last gap 24px too. */}
            {focus === "home" && topWins ? (
              <div className="pt-6 empty:hidden">
                <Suspense fallback={<TopWinsSkeleton />}>
                  <TopWins promise={topWins} />
                </Suspense>
              </div>
            ) : null}
            {focus === "home" ? (
              <div className="pt-6 pb-2">
                <HowToRegister
                  onRegister={() => {
                    setAuthView("register");
                    setSignInOpen(true);
                  }}
                />
              </div>
            ) : null}
          </div>
          {focus !== "promotions" ? (
          <label className="lobby-vt-search relative mt-4 block">
            <span className="sr-only">{t.lobby.search}</span>
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
              <SearchIcon />
            </span>
            {/* Looks like a search field but only opens the Explore pop-up. It does not open
                on plain keyboard focus (WCAG 3.2.1): click, Enter, Space or Ctrl/Cmd+K do. */}
            <input
              id="lobby-search"
              readOnly
              value=""
              aria-haspopup="dialog"
              aria-keyshortcuts="Control+K Meta+K"
              onClick={() => setSearchOpen(true)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
                  event.preventDefault();
                  setSearchOpen(true);
                }
              }}
              placeholder={fill(t.lobby.searchPlaceholder, { name: t.siteName })}
              className="h-12 w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 pr-24 pl-10 text-sm outline-none placeholder:text-muted hover:border-white/25 focus-visible:border-brand"
            />
            <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border border-white/10 px-2 py-1 text-xs text-muted sm:inline">
              Ctrl K
            </kbd>
          </label>
          ) : null}

          <div className="lobby-vt-content">
          {focus === "promotions" ? (
            promotions ? (
              <Suspense fallback={<PromotionsSkeleton />}>
                <PromotionsGrid promise={promotions} onJoin={openRegister} />
              </Suspense>
            ) : null
          ) : (
            <>
              {focus === "casino" ? <ProviderRow selected={provider} onSelect={setProvider} /> : null}
              <HomeGameContent focus={focus} category={casino} games={games} partners={partners} />
            </>
          )}
          <LobbyFooter />
          </div>
        </main>
      </div>

      {cookiesOn ? (
        <div
          className="fixed bottom-4 left-4 z-50 w-[min(100%-2rem,20rem)] rounded-xl border border-white/10 bg-lobby p-4 shadow-2xl"
        >
          <p className="font-semibold">{t.cookies.title}</p>
          <p className="mt-1 text-sm leading-5 text-muted">{t.cookies.body}</p>
          <button
            type="button"
            onClick={dismissCookies}
            className="mt-3 h-10 w-full rounded-lg bg-brand text-sm font-semibold text-lobby"
          >
            {t.cookies.accept}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Hero() {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const placed = useRef(false);
  const count = bannerSlides.length;

  useEffect(() => {
    const track = trackRef.current;
    const frame = track?.parentElement;
    if (!track || !frame) return;

    const xFor = () => -index * frame.clientWidth;
    if (!placed.current || reduceMotion()) {
      placed.current = true;
      track.style.transform = `translateX(${xFor()}px)`;
    } else {
      animate(track, { x: xFor(), duration: 780, ease: "outQuint" });
    }

    let width = frame.clientWidth;
    const observer = new ResizeObserver(() => {
      const next = frame.clientWidth;
      if (next === width) return;
      width = next;
      track.style.transform = `translateX(${-index * next}px)`;
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [index]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches || paused) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, 6000);
    return () => window.clearInterval(id);
  }, [count, paused]);

  function go(next: number) {
    setIndex(((next % count) + count) % count);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index + 1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1);
    }
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t.lobby.promotions}
      className="relative overflow-hidden rounded-2xl"
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div ref={trackRef} className="flex">
        {bannerSlides.map((slide, slideIndex) => {
          const active = slideIndex === index;
          return (
            <article key={slide.id} aria-hidden={!active} className="aspect-[4/1] w-full shrink-0">
              <img
                src={slide.imageUrl}
                alt={fill(t.lobby.bannerAlt, { n: slideIndex + 1 })}
                className="h-full w-full object-cover"
                draggable={false}
              />
            </article>
          );
        })}
      </div>
      <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
        {bannerSlides.map((slide, slideIndex) => (
          <button
            key={slide.id}
            type="button"
            aria-label={fill(t.lobby.showBanner, { n: slideIndex + 1 })}
            aria-current={slideIndex === index ? "true" : undefined}
            onClick={() => go(slideIndex)}
            className={`h-2.5 rounded-full ${slideIndex === index ? "w-7 bg-white" : "w-2.5 bg-white/50"}`}
          />
        ))}
      </div>
      <button
        type="button"
        aria-label={t.lobby.previous}
        onClick={() => go(index - 1)}
        className="absolute top-1/2 left-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-lg text-white"
      >
        <span aria-hidden="true">‹</span>
      </button>
      <button
        type="button"
        aria-label={t.lobby.next}
        onClick={() => go(index + 1)}
        className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-lg text-white"
      >
        <span aria-hidden="true">→</span>
      </button>
    </section>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 11 L12 4 L20 11" />
      <path d="M6 10 V20 H10 V14 H14 V20 H18 V10" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12 H20.5 M12 3.5 C9 7 9 17 12 20.5 M12 3.5 C15 7 15 17 12 20.5" />
    </svg>
  );
}

function MenuIcon() {
  return (
    // Three thin, wide, equal lines in the brand cyan (the button sets the colour).
    <svg viewBox="0 0 30 20" aria-hidden="true" className="h-5 w-[30px]" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M1 2 H29 M1 10 H29 M1 18 H29" />
    </svg>
  );
}

function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const [resting, setResting] = useState<{ height: number | "auto"; opacity: number }>(
    open ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 },
  );

  useLayoutEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduceMotion()) {
      setResting(open ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 });
      return;
    }
    if (open) {
      panel.style.height = "auto";
      const height = panel.scrollHeight;
      panel.style.height = "0px";
      animate(panel, {
        height,
        opacity: [0, 1],
        duration: 380,
        ease: "outCubic",
        onComplete: () => setResting({ height: "auto", opacity: 1 }),
      });
      return;
    }
    animate(panel, {
      height: 0,
      opacity: [1, 0],
      duration: 240,
      ease: "inQuad",
      onComplete: () => setResting({ height: 0, opacity: 0 }),
    });
  }, [open]);

  return (
    <div
      ref={ref}
      className="overflow-hidden"
      style={{ height: resting.height, opacity: resting.opacity }}
      inert={!open}
      aria-hidden={!open}
    >
      {children}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20 L16.5 16.5" />
    </svg>
  );
}
