"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import type { AuthView } from "@/components/auth/AuthFormPanel";
import { SignInDialog } from "@/components/SignInDialog";
import { useI18n } from "@/components/I18nProvider";
import { bannerSlides } from "@/config/banners";
import { casinoCategories, defaultCasinoCategory, findCasinoCategory } from "@/config/categories";
import { categoryGames } from "@/config/lobby";
import { GameCover } from "@/components/lobby/GameCover";
import { LobbyFooter } from "@/components/lobby/LobbyFooter";
import { LobbyLink } from "@/components/lobby/LobbyLink";
import { ProviderRow } from "@/components/lobby/ProviderRow";
import { fill, localeChoices } from "@/i18n";
import { toSlug } from "@/i18n/routing";
import { animate, reduceMotion } from "@/lib/motion";

const PREVIEW_COUNT = 8;
const HOME_SCROLL_KEY = "lobby-home-scroll";


export type LobbyFocus = "home" | "casino";

export function LobbyScreen({ focus = "home", category }: { focus?: LobbyFocus; category?: string }) {
  const [query, setQuery] = useState("");
  const [languageOpen, setLanguageOpen] = useState(false);
  const { locale, setLocale, t } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("lobby-search")?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggleSidebar() {
    setSidebarOpen((open) => !open);
  }

  function dismissCookies() {
    setCookiesOn(false);
  }

  const needle = query.trim().toLowerCase();
  const casino = (category && findCasinoCategory(category)) || defaultCasinoCategory;
  const sections = (focus === "home" ? casinoCategories : [casino]).map((item) => ({
    id: item.slug,
    title: t.lobby[item.titleKey],
    href: `/casino/${item.slug}`,
    games: (categoryGames[item.slug] ?? []).filter((game) => !needle || game.title.toLowerCase().includes(needle)),
  }));
  const route = focus === "home" ? "/" : `/casino/${casino.slug}`;
  const preview = focus === "home" && !needle;

  return (
    <div className="min-h-full bg-lobby text-ink">
      <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} initialView={authView} />
      <header style={{ viewTransitionName: "lobby-header" }} className="sticky top-0 z-40 grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-white/10 bg-lobby px-3">
        <div>
          <button
            type="button"
            aria-label={sidebarOpen ? t.menu.hide : t.menu.show}
            aria-expanded={sidebarOpen}
            onClick={toggleSidebar}
            className="grid size-10 place-items-center rounded-lg hover:bg-white/10"
          >
            <MenuIcon />
          </button>
        </div>
        <h1 className="font-serif text-3xl tracking-tight italic">
          {t.brand}
        </h1>
        <div className="flex items-center justify-end gap-2">
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
            aria-hidden={!sidebarOpen}
            inert={!sidebarOpen}
            className="lobby-aside flex h-full w-64 flex-col border-r border-white/10 bg-lobby p-3"
          >
            <div className="relative" data-nav-item>
              <button
                type="button"
                aria-expanded={languageOpen}
                onClick={() => setLanguageOpen((open) => !open)}
                className="flex h-11 w-full items-center justify-between rounded-lg px-3 text-sm font-medium hover:bg-white/10"
              >
                {t.language.label}: {t.language[locale]}
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
            {focus === "home" ? <Hero /> : (
              <LobbyLink
                href="/"
                scroll={false}
                className="inline-flex items-center text-sm font-semibold text-muted hover:text-white"
              >
                <span aria-hidden="true" className="mr-1">‹</span>
                {t.lobby.back}
              </LobbyLink>
            )}
          </div>
          <label className="lobby-vt-search relative mt-4 block">
            <span className="sr-only">{t.lobby.search}</span>
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
              <SearchIcon />
            </span>
            <input
              id="lobby-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={fill(t.lobby.searchPlaceholder, { name: t.siteName })}
              className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pr-24 pl-10 text-sm outline-none placeholder:text-muted focus:border-brand"
            />
            <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border border-white/10 px-2 py-1 text-xs text-muted sm:inline">
              Ctrl K
            </kbd>
          </label>

          <div className="lobby-vt-content">
          {focus === "casino" ? <ProviderRow selected={provider} onSelect={setProvider} /> : null}
          <div className="mt-6 space-y-8">
            {sections.map((section) => (
              <CardRow
                key={section.id}
                title={section.title}
                count={section.games.length}
                href={focus === "home" ? section.href : undefined}
              >
                {(preview ? section.games.slice(0, PREVIEW_COUNT) : section.games).map((game) => (
                  <GameCover key={game.id} game={game} fluid />
                ))}
              </CardRow>
            ))}
          </div>
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

function CardRow({
  title,
  count,
  href,
  children,
}: {
  title: string;
  count: number;
  href?: string;
  children: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {href ? (
          <LobbyLink
            href={href}
            onGo={() => window.sessionStorage.setItem(HOME_SCROLL_KEY, String(Math.round(window.scrollY)))}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand hover:underline"
          >
            {t.lobby.viewAll}
            <span aria-hidden="true">›</span>
          </LobbyLink>
        ) : null}
      </div>
      {count === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-muted">
          {t.lobby.noMatches}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          {children}
        </div>
      )}
    </section>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7 H20 M4 12 H20 M4 17 H20" />
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
