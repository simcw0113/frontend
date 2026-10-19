"use client";

import type { JSAnimation } from "animejs";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useI18n } from "@/components/I18nProvider";
import { gameHref, SymbolMark } from "@/components/lobby/GameCover";
import { LobbyLink } from "@/components/lobby/LobbyLink";
import { defaultCasinoCategory } from "@/config/categories";
import { defaultSearchCategory, searchCategories, type SearchCategoryId } from "@/config/searchCategories";
import type { Game } from "@/config/lobby";
import { fill, htmlLang } from "@/i18n";
import { toSlug } from "@/i18n/routing";
import type { SearchGamesResult } from "@/lib/games";
import { animate, reduceMotion } from "@/lib/motion";

const PAGE_SIZE = 24;
const DEBOUNCE_MS = 250;
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * "Explore" search pop-up on a native <dialog> (showModal: inert page, Esc, aria-modal,
 * focus returns to the opener), same close pattern as AuthModal: every close path
 * (X, Esc, backdrop, Ctrl/Cmd+K) runs a short exit animation, then onClose.
 * The content mounts only while open, so each opening starts fresh.
 */
export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressedBackdrop = useRef(false);
  const exit = useRef<JSAnimation | null>(null);
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  function requestClose() {
    const dialog = ref.current;
    if (exit.current) return;
    const card = dialog?.querySelector<HTMLElement>(".explore-card");
    if (!dialog || !dialog.open || !card || reduceMotion()) {
      onCloseRef.current();
      return;
    }
    dialog.classList.add("is-closing");
    const animation = animate(card, {
      opacity: 0,
      scale: 0.97,
      duration: 160,
      ease: "inCubic",
      onComplete: () => {
        if (exit.current !== animation) return;
        exit.current = null;
        onCloseRef.current();
      },
    });
    exit.current = animation;
  }

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    exit.current?.cancel();
    exit.current = null;
    dialog.classList.remove("is-closing");
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && dialog.open) dialog.close();
    return () => {
      exit.current?.cancel();
      exit.current = null;
    };
  }, [open]);

  // Body scroll lock (keeps the scrollbar's width so the page does not shift).
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const { overflow, paddingRight } = html.style;
    const scrollbar = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    if (scrollbar > 0) html.style.paddingRight = `${scrollbar}px`;
    return () => {
      html.style.overflow = overflow;
      html.style.paddingRight = paddingRight;
    };
  }, [open]);

  function onKeyDown(event: ReactKeyboardEvent<HTMLDialogElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      requestClose();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
      event.preventDefault(); // also swallows the browser's own shortcut
      requestClose();
      return;
    }
    if (event.key !== "Tab") return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (item) => item.getClientRects().length > 0,
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const current = document.activeElement;
    if (event.shiftKey && (current === first || current === event.currentTarget)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <dialog
      ref={ref}
      className="explore-dialog"
      aria-labelledby="explore-title"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClose={() => onCloseRef.current()}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressedBackdrop.current && event.target === event.currentTarget) requestClose();
        pressedBackdrop.current = false;
      }}
    >
      {open ? <ExploreContent onClose={requestClose} /> : null}
    </dialog>
  );
}

// --- Content ----------------------------------------------------------------

type Results = SearchGamesResult & { key: string; error?: boolean };

// Talks to the route handler (app/api/games/search/route.ts), never to the API.
async function fetchPage(
  params: { q: string; category: SearchCategoryId; page: number; lang: string },
  signal: AbortSignal,
): Promise<SearchGamesResult> {
  const query = new URLSearchParams({
    category: params.category,
    page: String(params.page),
    pageSize: String(PAGE_SIZE),
    lang: params.lang,
  });
  if (params.q) query.set("q", params.q);
  const response = await fetch(`/api/games/search?${query}`, { signal });
  if (!response.ok) throw new Error(`Search failed (${response.status})`);
  const body = (await response.json()) as SearchGamesResult;
  if (!Array.isArray(body.games)) throw new Error("Unexpected search response");
  return body;
}

function ExploreContent({ onClose }: { onClose: () => void }) {
  const { locale, t } = useI18n();
  const lang = toSlug(locale);
  const [input, setInput] = useState("");
  const [q, setQ] = useState(""); // the debounced text the requests use
  const [category, setCategory] = useState<SearchCategoryId>(defaultSearchCategory);
  const [results, setResults] = useState<Results | null>(null);
  const [more, setMore] = useState<{ key: string; status: "loading" | "error" } | null>(null);
  const [attempt, setAttempt] = useState(0); // bumped by "Try again"
  const controller = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const key = `${category}\n${q}`;
  const loading = results?.key !== key;
  const moreStatus = more?.key === key ? more.status : null;

  // Debounce what the user types into the requests.
  useEffect(() => {
    const id = window.setTimeout(() => setQ(input.trim().replace(/\s+/g, " ")), DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [input]);

  // First page for the current (category, text). Starting a new one aborts the
  // previous request, and the key check keeps an old response from ever landing.
  useEffect(() => {
    const current = new AbortController();
    controller.current?.abort();
    controller.current = current;
    const forKey = `${category}\n${q}`;
    fetchPage({ q, category, page: 1, lang }, current.signal).then(
      (page) => {
        if (current.signal.aborted) return;
        setResults({ ...page, key: forKey });
        scroller.current?.scrollTo({ top: 0 });
      },
      () => {
        if (current.signal.aborted) return;
        setResults({ games: [], total: 0, key: forKey, error: true });
      },
    );
    return () => current.abort();
  }, [q, category, lang, attempt]);

  useEffect(() => () => controller.current?.abort(), []);

  function loadMore() {
    if (!results || results.key !== key || !results.nextPage || moreStatus === "loading") return;
    const forKey = key;
    const current = new AbortController();
    controller.current?.abort();
    controller.current = current;
    setMore({ key: forKey, status: "loading" });
    fetchPage({ q, category, page: results.nextPage, lang }, current.signal).then(
      (page) => {
        if (current.signal.aborted) return;
        setResults((previous) => {
          if (!previous || previous.key !== forKey) return previous;
          const seen = new Set(previous.games.map((game) => game.id));
          return {
            ...previous,
            games: [...previous.games, ...page.games.filter((game) => !seen.has(game.id))],
            total: page.total,
            nextPage: page.nextPage,
          };
        });
        setMore(null);
        // The button disappears with the last page: keep keyboard focus inside the list.
        if (!page.nextPage) list.current?.focus({ preventScroll: true });
      },
      () => {
        if (current.signal.aborted) return;
        setMore({ key: forKey, status: "error" });
      },
    );
  }

  function selectCategory(index: number, focus = false) {
    const next = searchCategories[(index + searchCategories.length) % searchCategories.length];
    setCategory(next.id);
    if (focus) {
      const tab = tabs.current[searchCategories.indexOf(next)];
      tab?.focus();
      tab?.scrollIntoView({ inline: "nearest", block: "nearest" });
    }
  }

  function onTabKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const index = searchCategories.findIndex((item) => item.id === category);
    const move: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: searchCategories.length - 1,
    };
    if (!(event.key in move)) return;
    event.preventDefault();
    selectCategory(move[event.key], true);
  }

  const games = results && !loading ? results.games : [];
  const status = loading
    ? t.search.loading
    : results?.error
      ? t.lobby.loadError
      : games.length === 0
        ? t.search.empty
        : fill(t.search.shown, {
            count: games.length.toLocaleString(htmlLang(locale)),
            total: (results?.total ?? games.length).toLocaleString(htmlLang(locale)),
          });

  return (
    <div className="explore-card">
      <div className="relative flex h-14 shrink-0 items-center justify-center">
        <h2 id="explore-title" className="text-base font-bold">
          {t.search.title}
        </h2>
        <button
          type="button"
          aria-label={t.search.close}
          onClick={onClose}
          className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6 L18 18 M18 6 L6 18" />
          </svg>
        </button>
      </div>

      <div className="relative mx-4 shrink-0 sm:mx-6">
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20 L16.5 16.5" />
          </svg>
        </span>
        <input
          data-autofocus=""
          type="text"
          role="searchbox"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          maxLength={64}
          aria-label={t.search.placeholder}
          placeholder={t.search.placeholder}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") setQ(input.trim().replace(/\s+/g, " ")); // skip the debounce
          }}
          className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pr-10 pl-10 text-sm outline-none placeholder:text-muted focus:border-brand"
        />
        {input ? (
          <button
            type="button"
            aria-label={t.search.clear}
            onClick={() => {
              setInput("");
              setQ("");
            }}
            className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-brand"
          >
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6 L18 18 M18 6 L6 18" />
            </svg>
          </button>
        ) : null}
      </div>

      <div
        role="tablist"
        aria-label={t.search.categoriesLabel}
        onKeyDown={onTabKeyDown}
        className="explore-tabs mx-4 mt-3 flex shrink-0 gap-1 overflow-x-auto sm:mx-6"
      >
        {searchCategories.map((item, index) => {
          const selected = item.id === category;
          return (
            <button
              key={item.id}
              ref={(element) => {
                tabs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`explore-tab-${item.id}`}
              aria-selected={selected}
              aria-controls="explore-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => selectCategory(index)}
              className={`flex h-10 shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${
                selected ? "bg-brand/15 text-brand" : "text-muted hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.id === "all" ? <GridIcon /> : null}
              {t.search.categories[item.titleKey]}
            </button>
          );
        })}
      </div>

      <div ref={scroller} className="explore-scroll @container">
        <div
          id="explore-panel"
          role="tabpanel"
          aria-labelledby={`explore-tab-${category}`}
          aria-busy={loading}
          className="px-4 pt-4 pb-6 sm:px-6"
        >
          <p role="status" aria-live="polite" className="sr-only">
            {status}
          </p>

          {loading ? (
            <div className={GRID} aria-hidden="true">
              {Array.from({ length: PAGE_SIZE }, (_, i) => (
                <div key={i} className="aspect-[3/4] rounded-xl bg-white/5 motion-safe:animate-pulse" />
              ))}
            </div>
          ) : results?.error ? (
            <div className="px-4 py-16 text-center">
              <p className="text-sm text-muted">{t.lobby.loadError}</p>
              <button
                type="button"
                onClick={() => {
                  setResults(null);
                  setAttempt((value) => value + 1);
                }}
                className="mt-4 h-10 rounded-lg border border-white/10 bg-white/5 px-5 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {t.search.retry}
              </button>
            </div>
          ) : games.length === 0 ? (
            <p className="px-4 py-16 text-center text-sm text-muted">{t.search.empty}</p>
          ) : (
            <>
              <ul ref={list} tabIndex={-1} className={`${GRID} outline-none`}>
                {games.map((game) => (
                  <li key={game.id} className="min-w-0">
                    <SearchCard game={game} onGo={onClose} />
                  </li>
                ))}
              </ul>
              {results?.nextPage ? (
                <div className="mt-8 flex flex-col items-center gap-3">
                  <button
                    type="button"
                    disabled={moreStatus === "loading"}
                    aria-busy={moreStatus === "loading"}
                    onClick={loadMore}
                    className="flex h-11 min-w-36 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-6 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-70"
                  >
                    {moreStatus === "loading" ? (
                      <>
                        <span className="explore-spinner" aria-hidden="true" />
                        <span className="sr-only">{t.search.loading}</span>
                      </>
                    ) : (
                      <>
                        {t.search.showMore}
                        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M6 9 L12 15 L18 9" />
                        </svg>
                      </>
                    )}
                  </button>
                  {moreStatus === "error" ? <p className="text-sm text-muted">{t.lobby.loadError}</p> : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// 3 columns on phones, 4 / 6 / 8 as the pop-up gets wider (container queries on
// the scroll area, so it follows the real width).
const GRID = "grid grid-cols-3 gap-2.5 @xl:grid-cols-4 @xl:gap-3 @3xl:grid-cols-6 @5xl:grid-cols-8";

// Opens the game page (and closes Explore). API results without a category open under
// Trending games.
function SearchCard({ game, onGo }: { game: Game; onGo: () => void }) {
  const { locale, t } = useI18n();
  const players = game.playing.toLocaleString(htmlLang(locale));
  return (
    <LobbyLink
      href={gameHref(game, defaultCasinoCategory.slug)}
      onGo={onGo}
      ariaLabel={`${game.title}, ${game.provider}, ${fill(t.lobby.playing, { count: players })}`}
      className="game-card block w-full rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
    >
      <span
        className="game-cover relative block aspect-[3/4] overflow-hidden rounded-xl"
        style={{ background: `linear-gradient(180deg, ${game.from}, ${game.to})` }}
      >
        <span className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] font-semibold text-white/90">
          <svg viewBox="0 0 24 24" className="size-2.5" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21 C4 16 8 14 12 14 C16 14 20 16 20 21 Z" />
          </svg>
          {players}
        </span>
        <span className="game-art absolute inset-0 flex items-center justify-center pb-6">
          <SymbolMark symbol={game.symbol} className="size-[44%] drop-shadow-lg" />
        </span>
        <span className="absolute inset-x-1.5 bottom-6 block text-[12px] leading-[0.95] font-black tracking-tight text-white uppercase drop-shadow-md @3xl:text-[11px]">
          {game.title}
        </span>
        <span className="absolute inset-x-1.5 bottom-1.5 block truncate text-[8px] font-semibold tracking-[0.12em] text-white/75 uppercase">
          {game.provider}
        </span>
      </span>
    </LobbyLink>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </svg>
  );
}
