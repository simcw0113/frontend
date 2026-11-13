"use client";

import type { JSAnimation } from "animejs";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useI18n } from "@/components/I18nProvider";
import { GameCover, gameHref } from "@/components/lobby/GameCover";
import { CategoryChips, toCategoryChips } from "@/components/lobby/CategoryChips";
import { ProviderRow } from "@/components/lobby/ProviderRow";
import { defaultCasinoCategory } from "@/config/categories";
import type { Game } from "@/config/lobby";
import type { Provider } from "@/config/providers";
import { fill, htmlLang } from "@/i18n";
import type { SearchGamesResult } from "@/lib/games";
import { LOBBY_ALL_CATEGORY, providersInCodes, type LobbyProductCategory } from "@/lib/lobbyApi";
import { animate, reduceMotion } from "@/lib/motion";

const PAGE_SIZE = 24;
const emptyCodes: string[] = [];
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

type GamesPayload = {
  games?: Game[];
  total?: number;
  page?: number;
  last_page?: number | null;
};

// Same list source as All Games (POST /api/lobby/games), with optional text `q`.
async function fetchPage(
  params: { q: string; publicCodes: string[]; page: number; lang: string },
  signal: AbortSignal,
): Promise<SearchGamesResult> {
  const response = await fetch("/api/lobby/games", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      locale: params.lang,
      page: params.page,
      limit: PAGE_SIZE,
      ...(params.q ? { q: params.q } : {}),
      ...(params.publicCodes.length > 0 ? { publicCodes: params.publicCodes } : {}),
    }),
    signal,
  });
  if (!response.ok) throw new Error(`Search failed (${response.status})`);
  const body = (await response.json()) as GamesPayload;
  const games = Array.isArray(body.games) ? body.games : [];
  const page = typeof body.page === "number" ? body.page : params.page;
  const lastPage = typeof body.last_page === "number" ? body.last_page : games.length < PAGE_SIZE ? page : null;
  const total = typeof body.total === "number" ? body.total : games.length;
  return { games, total, nextPage: lastPage != null && page < lastPage ? page + 1 : undefined };
}

function ExploreContent({ onClose }: { onClose: () => void }) {
  const { lang, locale, t } = useI18n();
  const [input, setInput] = useState("");
  const [q, setQ] = useState(""); // the debounced text the requests use
  const [productCategories, setProductCategories] = useState<LobbyProductCategory[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [categoryId, setCategoryId] = useState(LOBBY_ALL_CATEGORY);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [more, setMore] = useState<{ key: string; status: "loading" | "error" } | null>(null);
  const [attempt, setAttempt] = useState(0); // bumped by "Try again"
  const controller = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const categoryCodes = productCategories.find((item) => item.id === categoryId)?.publicCodes ?? emptyCodes;
  const publicCodes = useMemo(
    () => (providerId ? [providerId] : categoryCodes),
    [providerId, categoryCodes],
  );
  const visibleProviders = providersInCodes(providers, categoryId === LOBBY_ALL_CATEGORY ? undefined : categoryCodes);
  const key = `${categoryId}\n${providerId ?? ""}\n${q}`;
  const loading = results?.key !== key;
  const moreStatus = more?.key === key ? more.status : null;

  // Debounce what the user types into the requests.
  useEffect(() => {
    const id = window.setTimeout(() => setQ(input.trim().replace(/\s+/g, " ")), DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [input]);

  useEffect(() => {
    const ac = new AbortController();
    fetch(`/api/lobby/products?locale=${encodeURIComponent(lang)}`, { signal: ac.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("failed");
        return (await response.json()) as { providers?: Provider[]; categories?: LobbyProductCategory[] };
      })
      .then((payload) => {
        setProviders(Array.isArray(payload.providers) ? payload.providers : []);
        setProductCategories(Array.isArray(payload.categories) ? payload.categories : []);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
      });
    return () => ac.abort();
  }, [lang]);

  // First page for the current (category, provider, text). Starting a new one
  // aborts the previous request, and the key check keeps an old response from landing.
  // First page for the current (category, text). Starting a new one aborts the
  // previous request, and the key check keeps an old response from ever landing.
  useEffect(() => {
    const current = new AbortController();
    controller.current?.abort();
    controller.current = current;
    const forKey = `${categoryId}\n${providerId ?? ""}\n${q}`;
    fetchPage({ q, publicCodes, page: 1, lang }, current.signal).then(
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
  }, [q, categoryId, providerId, publicCodes, lang, attempt]); // publicCodes is memoized

  useEffect(() => () => controller.current?.abort(), []);

  function loadMore() {
    if (!results || results.key !== key || !results.nextPage || moreStatus === "loading") return;
    const forKey = key;
    const current = new AbortController();
    controller.current?.abort();
    controller.current = current;
    setMore({ key: forKey, status: "loading" });
    fetchPage({ q, publicCodes, page: results.nextPage, lang }, current.signal).then(
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

      {productCategories.length > 1 ? (
        <CategoryChips
          items={toCategoryChips(productCategories, t.lobby.all)}
          value={String(categoryId)}
          onChange={(id) => {
            setCategoryId(Number(id));
            setProviderId(null);
          }}
          label={t.search.categoriesLabel}
          idPrefix="explore"
          panelId="explore-panel"
          className="explore-tabs mx-4 mt-3 sm:mx-6"
        />
      ) : null}

      <ProviderRow
        selected={providerId}
        onSelect={setProviderId}
        providers={visibleProviders}
        className="mx-4 mt-3 sm:mx-6"
        headingId="explore-provider-heading"
      />

      <div ref={scroller} className="explore-scroll @container">
        <div
          id="explore-panel"
          role="tabpanel"
          aria-labelledby={`explore-tab-${categoryId}`}
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
                    <GameCover
                      game={game}
                      href={gameHref(game, defaultCasinoCategory.slug)}
                      onGo={onClose}
                      fluid
                    />
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
