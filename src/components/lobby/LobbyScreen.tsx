"use client";

import { useParams } from "next/navigation";
import { Suspense, use, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import type { AuthView } from "@/components/auth/AuthFormPanel";
import { SignInDialog } from "@/components/SignInDialog";
import { useI18n } from "@/components/I18nProvider";
import { bannerSlides, type BannerSlide } from "@/config/banners";
import { siteConfig } from "@/config/site";
import { defaultCasinoCategory, findCasinoCategory } from "@/config/categories";
import { AllGamesFromPromise } from "@/components/lobby/AllGamesList";
import { AllGamesIcon, CategoryIcon, HotGamesIcon, NewReleaseIcon } from "@/components/lobby/CategoryIcons";
import { HOME_SCROLL_KEY, HomeGameContent } from "@/components/lobby/HomeGameContent";
import { HowToRegister } from "@/components/lobby/HowToRegister";
import { LobbyFooter } from "@/components/lobby/LobbyFooter";
import { LobbyLink } from "@/components/lobby/LobbyLink";
import { GiftIcon, PromotionsGrid, PromotionsHeader, PromotionsSkeleton } from "@/components/lobby/Promotions";
import { LuckyPick } from "@/components/lobby/LuckyPick";
import { GameView, GameViewSkeleton, type GamePageData } from "@/components/lobby/GameView";
import { ProviderGames, ProviderGamesSkeleton } from "@/components/lobby/ProviderGames";
import { ProviderLaunch } from "@/components/lobby/ProviderLaunch";
import { ProviderRow } from "@/components/lobby/ProviderRow";
import { SearchModal } from "@/components/lobby/SearchModal";
import { MobileTabBar } from "@/components/lobby/MobileTabBar";
import { ComingSoonHeader, TopNav } from "@/components/lobby/TopNav";
import { VipClub, VipHeader } from "@/components/lobby/VipClub";
import { sidebarMissionsItem, sidebarNavItems, sidebarPlayerItems, sidebarPromoItems } from "@/config/topNav";
import { PlayerGameList } from "@/components/lobby/HomeGameContent";
import { TopWins, TopWinsSkeleton } from "@/components/lobby/TopWins";
import { fill } from "@/i18n";
import { hreflang } from "@/i18n/routing";
import type { Provider } from "@/config/providers";
import type { CategoryGamesResult } from "@/lib/games";
import { providersForCategory } from "@/lib/lobbyApi";
import type { PartnersResult } from "@/lib/partners";
import type { PromotionsResult } from "@/lib/promotions";
import type { TopWinsResult } from "@/lib/topWins";
import { animate, reduceMotion } from "@/lib/motion";
import { useSession } from "@/lib/useSession";
import { setDrawerOpen, setSidebarOpen, useDrawerOpen, useSidebarOpen, useSidebarRail } from "@/lib/sidebarState";

// px-[14px] keeps the 20px icon centred in the 72px rail (12px aside padding + 14px), so the
// icons do not move while the sidebar collapses or expands.
// Survives refresh. Accept only hides this notice; it does not create an account cookie.
const COOKIE_NOTICE_KEY = "cookie_notice_accepted";

const NAV_ITEM =
  "flex h-11 w-full items-center rounded-lg px-[14px] text-sm font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand";
const TOGGLE =
  "grid size-11 shrink-0 place-items-center rounded-lg text-brand hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";


export type LobbyFocus = "home" | "casino" | "promotions" | "sports" | "vip" | "z-ai" | "recent" | "favourites" | "missions" | "game";

// `games` holds one promise per category slug, started on the server (lib/games.ts)
// and read here with use() inside <Suspense>, so the page shell shows at once.
// A category page passes its one list as `categoryGames` instead: the page does not await
// its params (Instant navigation: URL data stays out of the shared App Shell), so it cannot
// key the list by slug. The slug itself is read here with useParams(), which resolves on the
// server for the generateStaticParams categories and synchronously on client navigations.
export function LobbyScreen({
  focus = "home",
  category,
  games,
  categoryGames,
  playerGames,
  topWins,
  partners,
  promotions,
  gamePage,
  banners,
}: {
  focus?: LobbyFocus;
  category?: string;
  games: Record<string, Promise<CategoryGamesResult>>;
  categoryGames?: Promise<CategoryGamesResult>; // category page only (see above)
  playerGames?: Promise<CategoryGamesResult>; // Recent games / Favourites pages only
  topWins?: Promise<TopWinsResult>; // home only
  partners?: Promise<PartnersResult>; // home only
  promotions?: Promise<PromotionsResult>; // promotions page only
  gamePage?: Promise<GamePageData>; // game page only (/casino/{category}/game/{id})
  banners?: Promise<BannerSlide[]>; // home only; GET /config data.banners
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  // Category pages filter the open provider list in place. Home still opens Explore.
  const [gameQuery, setGameQuery] = useState("");
  const [languageOpen, setLanguageOpen] = useState(false);
  const { lang, languages, setLang, t } = useI18n();
  const languageName = languages.find((language) => language.code === lang)?.name ?? lang.toUpperCase();
  const sidebarOpen = useSidebarOpen(); // lg+: expanded (icon + label) or the icon rail
  const drawerOpen = useDrawerOpen(); // below lg: the drawer over the page
  const rail = useSidebarRail();
  const collapsed = rail && !sidebarOpen; // icon rail: labels visually hidden, tooltips on
  const drawerToggleRef = useRef<HTMLButtonElement>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [authView, setAuthView] = useState<AuthView>("login");
  const { user, ready, signOut } = useSession();
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountSheetRef = useRef<HTMLDivElement>(null);
  const notifyRef = useRef<HTMLDivElement>(null);
  const [cookiesOn, setCookiesOn] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providersStatus, setProvidersStatus] = useState<"loading" | "ready" | "error">("loading");
  // Casino category where the player clicked "All". Cleared on leaving that page so the
  // next visit starts on the first provider again.
  const [allSlug, setAllSlug] = useState<string | null>(null);
  const [trackedSlug, setTrackedSlug] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setProvidersStatus("loading");
    fetch(`/api/lobby/products?locale=${encodeURIComponent(lang)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("failed");
        return (await response.json()) as { providers?: Provider[] };
      })
      .then((payload) => {
        setProviders(Array.isArray(payload.providers) ? payload.providers : []);
        setProvidersStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setProvidersStatus("error");
      });
    return () => controller.abort();
  }, [lang]);

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

  // Ctrl/Cmd+K: on a category page, focus the inline search. Elsewhere it opens
  // Explore. While that pop-up is open it handles the shortcut itself. Not taken
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
      if (focus === "casino") {
        document.getElementById("lobby-search")?.focus();
        return;
      }
      setSearchOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen, signInOpen, focus]);

  function toggleSidebar() {
    if (sidebarOpen) setLanguageOpen(false);
    setSidebarOpen((open) => !open);
  }

  // Below lg the sidebar is a drawer over the page: close it after choosing a page.
  function closeSidebarOnSmallScreens() {
    setDrawerOpen(false);
  }

  // Drawer: Esc closes it and gives focus back to the header toggle (not while a pop-up is open,
  // the pop-up handles its own Esc).
  useEffect(() => {
    if (!drawerOpen || rail || searchOpen || signInOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setDrawerOpen(false);
      drawerToggleRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, rail, searchOpen, signInOpen]);

  useEffect(() => {
    if (!accountOpen && !notifyOpen) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (accountOpen && !accountRef.current?.contains(target) && !accountSheetRef.current?.contains(target) && !(event.target instanceof Element && event.target.closest("[data-account-tab]"))) {
        setAccountOpen(false);
      }
      if (notifyOpen && !notifyRef.current?.contains(target)) setNotifyOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAccountOpen(false);
        setNotifyOpen(false);
      }
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [accountOpen, notifyOpen]);

  useEffect(() => {
    if (window.localStorage.getItem(COOKIE_NOTICE_KEY) !== "1") setCookiesOn(true);
  }, []);

  function dismissCookies() {
    window.localStorage.setItem(COOKIE_NOTICE_KEY, "1");
    setCookiesOn(false);
  }

  const params = useParams<{ category?: string; id?: string; provider?: string; game?: string }>();
  const slug = category ?? (focus === "casino" || focus === "game" ? params?.category : undefined);
  const casino = (slug && findCasinoCategory(slug)) || defaultCasinoCategory;
  const listGames = categoryGames ? { ...games, [casino.slug]: categoryGames } : games;
  const luckyGames = listGames[casino.slug] as Promise<CategoryGamesResult> | undefined;
  // `route`: the page shown (main[data-route], lobby transitions); `navRoute`: what the top bar
  // and sidebar highlight (a game page highlights its category).
  const navRoute = focus === "home" ? "/" : focus === "casino" || focus === "game" ? `/casino/${casino.slug}` : `/${focus}`;
  const route =
    focus === "game"
      ? params?.provider && params?.game
        ? `${navRoute}/provider/${params.provider}/game/${params.game}`
        : `${navRoute}/game/${params?.id ?? ""}`
      : navRoute;
  const gamesPage = focus === "home" || focus === "casino";
  const playerPage = focus === "recent" || focus === "favourites";
  const casinoSlug = focus === "casino" ? casino.slug : null;
  // A new casino category starts with no pick, so the first provider is selected below.
  // Leaving the casino page forgets an "All" click, so the next visit does the same.
  if (casinoSlug && trackedSlug !== casinoSlug) {
    setTrackedSlug(casinoSlug);
    setProvider(null);
    setAllSlug(null);
    setGameQuery("");
  } else if (!casinoSlug && allSlug) {
    setAllSlug(null);
  }
  const visibleProviders = providersForCategory(providers, casinoSlug ?? undefined);
  const providerInList = provider != null && visibleProviders.some((item) => item.id === provider);
  const explicitAll = casinoSlug != null && allSlug === casinoSlug && provider === null;
  // Tagged lists (Hot Games, New Release) and All Games open on the full list, not
  // the first provider. Slots / Live Dealer still open on the first provider.
  const startOnAll = Boolean(casino.tagged) || casino.slug === "all-games";
  const activeProvider = casinoSlug
    ? providerInList
      ? provider
      : explicitAll || startOnAll
        ? null
        : (visibleProviders[0]?.id ?? null)
    : gamesPage && providerInList
      ? provider
      : null;
  // `activeProvider` is public_code, which POST /game_list accepts as `public_code`.
  const activeProduct = activeProvider
    ? visibleProviders.find((item) => item.id === activeProvider)
    : undefined;
  function selectProvider(id: string | null) {
    setProvider(id);
    setAllSlug(id === null && casinoSlug ? casinoSlug : null);
  }
  const sideGroups: { path: string; label: string; Icon: () => ReactNode }[][] = [
    [
      { path: "/", label: t.menu.home, Icon: HomeIcon },
      ...sidebarPlayerItems.map((item) => ({ path: item.path, label: t.menu[item.labelKey], Icon: SIDEBAR_ICONS[item.id] })),
    ],
    sidebarPromoItems.flatMap((item) => {
      const entry = { path: item.path, label: t.topNav[item.labelKey], Icon: SIDEBAR_ICONS[item.id] };
      // Missions sits right below Promotions (sidebar only, not in the top bar).
      if (item.id !== "promotions") return [entry];
      const missions = sidebarMissionsItem;
      return [entry, { path: missions.path, label: t.menu[missions.labelKey], Icon: SIDEBAR_ICONS[missions.id] }];
    }),
    sidebarNavItems.map((item) => ({ path: item.path, label: t.topNav[item.labelKey], Icon: SIDEBAR_ICONS[item.id] })),
  ];
  const openRegister = () => {
    setAuthView("register");
    setSignInOpen(true);
  };

  return (
    <div className={`lobby-root min-h-full bg-lobby text-ink${collapsed ? " is-collapsed" : ""}${drawerOpen ? " drawer-open" : ""}`}>
      <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} initialView={authView} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* From lg: a full-height column on the left (expanded, or an icon rail when collapsed)
          with its toggle in the top row; the header and the page sit to its right. Below lg:
          a drawer under the header, opened by the header toggle. See .lobby-aside in globals.css. */}
      <aside
        id="lobby-sidebar"
        style={{ viewTransitionName: "lobby-sidebar" }}
        aria-hidden={!rail && !drawerOpen}
        inert={!rail && !drawerOpen}
        className="lobby-aside flex flex-col border-r border-white/10 bg-lobby"
      >
        <div className="lobby-aside-top hidden h-16 shrink-0 items-center px-3.5 lg:flex">
          <button
            type="button"
            aria-label={sidebarOpen ? t.menu.collapse : t.menu.expand}
            aria-expanded={sidebarOpen}
            aria-controls="lobby-sidebar"
            onClick={toggleSidebar}
            className={TOGGLE}
          >
            <MenuIcon />
          </button>
        </div>
        <div className="lobby-aside-body flex flex-col p-3">
          {/* Groups (config/topNav.ts): Home + the player's pages | Promotions, VIP | games, then
              the language selector. The shown page's link is aria-current="page". */}
          {sideGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="contents">
              {groupIndex > 0 ? <hr className="my-3 border-white/10" /> : null}
              {group.map((item, index) => {
                const active = item.path === navRoute;
                return (
                  <LobbyLink
                    key={item.path}
                    href={item.path}
                    onGo={closeSidebarOnSmallScreens}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    className={`${NAV_ITEM} gap-3 ${index < group.length - 1 ? "mb-1" : ""} ${active ? "bg-brand/15 text-brand" : "hover:bg-white/10"}`}
                  >
                    <item.Icon />
                    <span className="lobby-label">{item.label}</span>
                  </LobbyLink>
                );
              })}
            </div>
          ))}
          <hr className="my-3 border-white/10" />
          <div className="relative" data-nav-item>
            {/* In the icon rail this expands the sidebar with the language list open. */}
            <button
              type="button"
              aria-expanded={languageOpen}
              aria-label={`${t.language.label}: ${languageName}`}
              title={collapsed ? `${t.language.label}: ${languageName}` : undefined}
              onClick={() => {
                if (collapsed) {
                  setSidebarOpen(true);
                  setLanguageOpen(true);
                  return;
                }
                setLanguageOpen((open) => !open);
              }}
              className={`${NAV_ITEM} justify-between hover:bg-white/10`}
            >
              <span className="flex items-center gap-3">
                <GlobeIcon />
                <span className="lobby-label">{languageName}</span>
              </span>
              <span aria-hidden="true" className={`lobby-label inline-block transition-transform duration-300 motion-reduce:transition-none ${languageOpen ? "rotate-180" : ""}`}>
                ▾
              </span>
            </button>
            <Collapse open={languageOpen}>
              <div className="mt-1 rounded-lg border border-white/10 bg-white/5 p-1">
                {/* GET /config data.languages: code is the URL prefix, name the label. */}
                {languages.map((choice) => (
                  <button
                    key={choice.code}
                    type="button"
                    lang={hreflang(choice.code)}
                    aria-pressed={lang === choice.code}
                    onClick={() => {
                      setLang(choice.code);
                      setLanguageOpen(false);
                    }}
                    className={`block w-full rounded-md px-3 py-2 text-left text-sm whitespace-nowrap ${
                      lang === choice.code ? "bg-brand text-lobby" : "hover:bg-white/10"
                    }`}
                  >
                    {choice.name}
                  </button>
                ))}
              </div>
            </Collapse>
          </div>
        </div>
      </aside>
      {/* Drawer backdrop (below lg): a click outside closes it. Not focusable; Esc and the
          toggle do the same for keyboards. */}
      <div aria-hidden="true" className="lobby-backdrop" onClick={() => setDrawerOpen(false)} />

      <div className="lobby-column">
      {/* One row of 64px from lg (logo, top links, buttons). Below lg the drawer toggle comes
          first and the top links wrap to a second, scrollable row (.top-nav); --lobby-header-h
          in globals.css follows suit. */}
      <header
        style={{ viewTransitionName: "lobby-header" }}
        className="lobby-header sticky top-0 z-40 flex flex-wrap items-center gap-x-1 bg-lobby px-3 lg:flex-nowrap"
      >
        <button
          ref={drawerToggleRef}
          type="button"
          aria-label={drawerOpen ? t.menu.hide : t.menu.show}
          aria-expanded={drawerOpen}
          aria-controls="lobby-sidebar"
          onClick={() => setDrawerOpen((open) => !open)}
          className={`${TOGGLE} hidden md:grid lg:hidden`}
        >
          <MenuIcon />
        </button>
        <h1 className="min-w-0 md:ml-[13px] lg:ml-3">
          <LobbyLink
            href="/"
            className="logo-press flex items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
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
        <TopNav route={navRoute} />
        <div className="ml-auto flex h-16 shrink-0 items-center gap-2">
          {user?.username ? (
            <>
            <LobbyLink
              href="/vip"
              aria-label={t.topNav.vip}
              className="md:hidden grid size-10 place-items-center rounded-lg text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <CrownIcon />
            </LobbyLink>
            <div className="relative md:hidden" ref={notifyRef}>
              <button
                type="button"
                aria-expanded={notifyOpen}
                aria-haspopup="dialog"
                aria-label={t.notifications.title}
                onClick={() => setNotifyOpen((open) => !open)}
                className="grid size-10 place-items-center rounded-lg text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <BellIcon />
              </button>
              {notifyOpen ? (
                <div
                  role="dialog"
                  aria-label={t.notifications.title}
                  className="absolute right-0 z-50 mt-1 w-64 rounded-xl border border-white/10 bg-lobby p-4 shadow-lg"
                >
                  <p className="text-sm font-semibold">{t.notifications.title}</p>
                  <p className="mt-1 text-sm text-muted">{t.notifications.empty}</p>
                </div>
              ) : null}
            </div>
            <div className="relative max-md:hidden" ref={accountRef}>
              <button
                type="button"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                onClick={() => setAccountOpen((open) => !open)}
                className="rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap hover:bg-white/10"
              >
                {user.username}
              </button>
              {accountOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-1 min-w-full rounded-lg border border-white/10 bg-lobby p-1 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAccountOpen(false);
                      void signOut();
                    }}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm font-semibold whitespace-nowrap hover:bg-white/10"
                  >
                    {t.auth.signOut}
                  </button>
                </div>
              ) : null}
            </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setAuthView("login");
                  setSignInOpen(true);
                }}
                className="hidden rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap hover:bg-white/10 md:inline-flex"
              >
                {t.auth.signIn}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthView("register");
                  setSignInOpen(true);
                }}
                className="join-glow hidden rounded-lg bg-brand px-3.5 py-2 text-sm font-extrabold tracking-wide whitespace-nowrap text-lobby uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:inline-flex"
              >
                {t.auth.joinUs}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthView("login");
                  setSignInOpen(true);
                }}
                className="inline-flex h-9 items-center rounded-full bg-white/10 px-4 text-sm font-semibold text-white md:hidden"
              >
                {t.auth.login}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthView("register");
                  setSignInOpen(true);
                }}
                className="inline-flex h-9 items-center rounded-full bg-brand px-4 text-sm font-extrabold text-lobby md:hidden"
              >
                {t.auth.register}
              </button>
            </>
          )}
        </div>
      </header>

        <main id="content" data-route={route} data-lang={lang} className="min-w-0 px-3 py-4 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] sm:px-5 md:pb-4">
          <div className="lobby-vt-top">
            {focus === "home" ? (
              <Suspense fallback={<BannerSkeleton />}>
                <Hero banners={banners} />
              </Suspense>
            ) : focus === "promotions" ? <PromotionsHeader /> : playerPage ? (
              <PlayerHeader focus={focus} />
            ) : focus === "vip" ? (
              <VipHeader />
            ) : focus === "sports" || focus === "z-ai" || focus === "missions" ? (
              <ComingSoonHeader title={focus === "z-ai" ? t.topNav.zAi : focus === "missions" ? t.menu.missions : t.topNav[focus]} />
            ) : focus === "game" ? null : (
              <div>
                <LobbyLink
                  href="/"
                  scroll={false}
                  className="inline-flex items-center text-sm font-semibold text-muted hover:text-white"
                >
                  <span aria-hidden="true" className="mr-1">‹</span>
                  {t.lobby.back}
                </LobbyLink>
                {focus === "casino" ? (
                  <h1 className="mt-3 flex items-center gap-2.5 text-xl font-semibold">
                    <CategoryIcon slug={casino.slug} className="size-6 shrink-0 text-muted" />
                    {t.lobby[casino.titleKey]}
                  </h1>
                ) : null}
              </div>
            )}
            {/* Home only: banner -> Top wins -> How to Register -> search bar. Both sections are part
                of the "top" transition group, so they fade with the banner. Each wrapper adds its
                own 24px above; the Top wins wrapper collapses (empty:hidden) when that section hides
                itself (no data / error), so How to Register then follows the banner with no gap
                left behind. The extra pb-2 plus the search bar's mt-4 make the last gap 24px too.
                How to Register is omitted after login, and the search bar's mt-4 keeps the gap. */}
            {focus === "home" && topWins ? (
              <div className="pt-6 empty:hidden">
                <Suspense fallback={<TopWinsSkeleton />}>
                  <TopWins promise={topWins} />
                </Suspense>
              </div>
            ) : null}
            {/* Shown only after /api/auth/me confirms there is no user, so a signed-in player never sees the register steps. */}
            {focus === "home" && ready && !user ? (
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
          {gamesPage ? (
          <label className="lobby-vt-search relative mt-4 block">
            <span className="sr-only">{t.lobby.search}</span>
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
              <SearchIcon />
            </span>
            {/* Category pages type into this field and filter the list below.
                Home only opens Explore, and not on plain keyboard focus (WCAG 3.2.1). */}
            <input
              id="lobby-search"
              readOnly={focus !== "casino"}
              value={focus === "casino" ? gameQuery : ""}
              aria-haspopup={focus === "casino" ? undefined : "dialog"}
              aria-keyshortcuts="Control+K Meta+K"
              onChange={(event) => {
                if (focus === "casino") setGameQuery(event.target.value);
              }}
              onClick={() => {
                if (focus !== "casino") setSearchOpen(true);
              }}
              onKeyDown={(event) => {
                if (focus === "casino") return;
                if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
                  event.preventDefault();
                  setSearchOpen(true);
                }
              }}
              placeholder={fill(t.lobby.searchPlaceholder, { name: t.siteName })}
              className={`h-12 w-full rounded-xl border border-white/10 bg-white/5 pr-24 pl-10 text-sm outline-none placeholder:text-muted hover:border-white/25 focus-visible:border-brand ${
                focus === "casino" ? "cursor-text" : "cursor-pointer"
              }`}
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
          ) : focus === "game" ? (
            gamePage ? (
              <Suspense fallback={<GameViewSkeleton />}>
                <GameView
                  promise={gamePage}
                  onSignIn={() => {
                    setAuthView("login");
                    setSignInOpen(true);
                  }}
                />
              </Suspense>
            ) : null
          ) : playerPage ? (
            playerGames ? (
              <PlayerGameList
                promise={playerGames}
                labelledBy="player-games-title"
                emptyText={focus === "recent" ? t.playerGames.recentEmpty : t.playerGames.favouritesEmpty}
              />
            ) : null
          ) : gamesPage ? (
            <>
              {focus === "home" || (focus === "casino" && !casino.tagged) ? (
                <ProviderRow selected={activeProvider} onSelect={selectProvider} providers={visibleProviders} />
              ) : null}
              {activeProduct && activeProduct.type != null && activeProduct.type !== 3 ? (
                // Web / App / Deep Link products have no game list in our lobby.
                <ProviderLaunch
                  provider={activeProduct}
                  signedIn={Boolean(user)}
                  onSignIn={() => {
                    setAuthView("login");
                    setSignInOpen(true);
                  }}
                />
              ) : activeProduct ? (
                <ProviderGames
                  publicCode={activeProduct.id}
                  category={casino.slug}
                  query={focus === "casino" ? gameQuery : ""}
                />
              ) : focus === "casino" && casino.slug === "all-games" ? (
                <Suspense fallback={<ProviderGamesSkeleton />}>
                  <AllGamesFromPromise
                    promise={listGames[casino.slug] ?? Promise.resolve({ games: [] })}
                    category={casino.slug}
                    query={gameQuery}
                  />
                </Suspense>
              ) : focus === "casino" && providersStatus === "loading" && !casino.tagged ? (
                <ProviderGamesSkeleton />
              ) : (
                <>
                  {focus === "casino" && casino.luckyPick && luckyGames ? (
                    <Suspense fallback={null}>
                      <LuckyPick promise={luckyGames} category={casino.slug} />
                    </Suspense>
                  ) : null}
                  <HomeGameContent focus={focus} category={casino} games={listGames} partners={partners} />
                </>
              )}
            </>
          ) : focus === "vip" ? (
            <VipClub />
          ) : null}
          <LobbyFooter />
          </div>
        </main>
      </div>

      {user?.username && accountOpen ? (
        <div
          ref={accountSheetRef}
          role="menu"
          className="fixed inset-x-3 z-50 rounded-xl border border-white/10 bg-lobby p-1 shadow-2xl md:hidden"
          style={{ bottom: "calc(var(--mobile-tab-h, 3.75rem) + 8px)" }}
        >
          <p className="px-3 py-2 text-sm font-semibold">{user.username}</p>
          <LobbyLink
            href="/vip"
            onGo={() => setAccountOpen(false)}
            className="block rounded-md px-3 py-2 text-sm font-semibold hover:bg-white/10"
          >
            {t.topNav.vip}
          </LobbyLink>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setAccountOpen(false);
              void signOut();
            }}
            className="block w-full rounded-md px-3 py-2 text-left text-sm font-semibold hover:bg-white/10"
          >
            {t.auth.signOut}
          </button>
        </div>
      ) : null}

      <MobileTabBar
        focus={focus}
        drawerOpen={drawerOpen}
        searchOpen={searchOpen}
        profileOpen={accountOpen}
        hidden={searchOpen || signInOpen}
        onMenu={() => setDrawerOpen((open) => !open)}
        onSearch={() => {
          setDrawerOpen(false);
          setSearchOpen(true);
        }}
        onProfile={() => {
          setDrawerOpen(false);
          if (user) setAccountOpen((open) => !open);
          else {
            setAuthView("login");
            setSignInOpen(true);
          }
        }}
      />

      {cookiesOn ? (
        <div
          className="lobby-cookie fixed bottom-4 left-4 z-50 w-[min(100%-2rem,20rem)] rounded-xl border border-white/10 bg-lobby p-4 shadow-2xl"
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

function BannerSkeleton() {
  return <div className="aspect-[4/1] animate-pulse rounded-2xl bg-white/5" />;
}

// Stable fallback so Hero can always call use(). Home passes GET /config banners.
const fallbackBanners = Promise.resolve(bannerSlides);

function Hero({ banners = fallbackBanners }: { banners?: Promise<BannerSlide[]> }) {
  const { t } = useI18n();
  const slides = use(banners);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const placed = useRef(false);
  const count = slides.length;

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
    if (media.matches || paused || count < 2) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, 6000);
    return () => window.clearInterval(id);
  }, [count, paused]);

  function go(next: number) {
    if (count < 1) return;
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

  if (count === 0) return null;

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
        {slides.map((slide, slideIndex) => {
          const active = slideIndex === index;
          const alt = fill(t.lobby.bannerAlt, { n: slideIndex + 1 });
          const image = (
            <picture className="block h-full">
              {slide.mobileUrl ? <source media="(max-width: 767px)" srcSet={slide.mobileUrl} /> : null}
              <img src={slide.imageUrl} alt={alt} className="h-full w-full object-cover" draggable={false} />
            </picture>
          );
          return (
            <article key={slide.id} aria-hidden={!active} className="aspect-[4/1] w-full shrink-0">
              {slide.href ? (
                <a href={slide.href} className="block h-full w-full">
                  {image}
                </a>
              ) : (
                image
              )}
            </article>
          );
        })}
      </div>
      <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
        {slides.map((slide, slideIndex) => (
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
      {count > 1 ? (
        <>
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
        </>
      ) : null}
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

// Sidebar games group (config/topNav.ts sidebarNavItems): same 24px grid, 1.8 stroke as Home.
function SlotsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="5" width="16" height="14" rx="2.5" />
      <path d="M7.83 9 V15 M13.17 9 V15" />
      <path d="M4.6 10.4 H6.6 L5.4 13.6 M9.9 10.4 H11.9 L10.7 13.6 M15.2 10.4 H17.2 L16 13.6" strokeWidth="1.4" />
      <path d="M18.5 9.5 H20.5 V6" />
      <circle cx="20.5" cy="5" r="1.2" />
    </svg>
  );
}

function LiveDealerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8.5" y="3.5" width="10" height="14" rx="2" transform="rotate(12 13.5 10.5)" />
      <rect x="4" y="5.5" width="10" height="14" rx="2" transform="rotate(-8 9 12.5)" />
      <path d="M9 10.3 C10.4 11.8 10.4 11.8 9 13.3 C7.6 11.8 7.6 11.8 9 10.3 Z" />
    </svg>
  );
}

function SportsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.6 L15.2 10.9 L14 14.7 H10 L8.8 10.9 Z" />
      <path d="M12 8.6 V3.5 M15.2 10.9 L20 9.4 M14 14.7 L17 18.8 M10 14.7 L7 18.8 M8.8 10.9 L4 9.4" strokeWidth="1.5" />
    </svg>
  );
}

function RecentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5 V12 L15 14" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20 C6.5 16.2 3.5 12.9 3.5 9.3 C3.5 6.6 5.6 4.5 8.2 4.5 C9.8 4.5 11.2 5.3 12 6.6 C12.8 5.3 14.2 4.5 15.8 4.5 C18.4 4.5 20.5 6.6 20.5 9.3 C20.5 12.9 17.5 16.2 12 20 Z" />
    </svg>
  );
}

function MissionsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="13" r="7.5" />
      <circle cx="11" cy="13" r="3.5" />
      <path d="M11 13 L19 5 M16.5 4.5 L19 5 L19.5 7.5" />
    </svg>
  );
}

function CrownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 17.5 L3 7.5 L8.2 11 L12 5 L15.8 11 L21 7.5 L20 17.5 Z" />
      <path d="M4.5 20 H19.5" />
    </svg>
  );
}

const SIDEBAR_ICONS: Record<
  | (typeof sidebarNavItems)[number]["id"]
  | (typeof sidebarPlayerItems)[number]["id"]
  | (typeof sidebarPromoItems)[number]["id"]
  | typeof sidebarMissionsItem.id,
  () => ReactNode
> = {
  recent: RecentIcon,
  favourites: HeartIcon,
  promotions: GiftIcon,
  missions: MissionsIcon,
  vip: CrownIcon,
  "hot-games": HotGamesIcon,
  "new-release": NewReleaseIcon,
  "all-games": AllGamesIcon,
  slots: SlotsIcon,
  "live-dealer": LiveDealerIcon,
  sports: SportsIcon,
};

// Title bar of the player's Recent games / Favourites page (same bar as Promotions).
function PlayerHeader({ focus }: { focus: "recent" | "favourites" }) {
  const { t } = useI18n();
  const Art = focus === "recent" ? RecentIcon : HeartIcon;
  return (
    <div className="promo-header">
      <h2 id="player-games-title" className="text-xl font-bold">
        {t.menu[focus]}
      </h2>
      <span className="promo-header-art grid place-items-center [&>svg]:size-full">
        <Art />
      </span>
    </div>
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

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9.5 C6 6.5 8.5 4 12 4 C15.5 4 18 6.5 18 9.5 V14 L20 16.5 H4 L6 14 Z" />
      <path d="M10 18.5 C10.4 19.5 11.2 20 12 20 C12.8 20 13.6 19.5 14 18.5" />
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
