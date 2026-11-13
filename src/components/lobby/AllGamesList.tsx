"use client";

import { use, useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/components/I18nProvider";
import { GameCover, gameHref } from "@/components/lobby/GameCover";
import { ALL_GAMES_PAGE_SIZE } from "@/lib/gameListPaging";
import type { Game } from "@/config/lobby";
import type { CategoryGamesResult } from "@/lib/games";

const GRID = "grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 xl:grid-cols-8";
const DEBOUNCE_MS = 250;

type PagePayload = {
  games?: Game[];
  total?: number;
  page?: number;
  last_page?: number | null;
};

export function AllGamesList({
  category,
  query = "",
  publicCodes = [],
  initialGames,
  initialPage,
  initialLastPage,
}: {
  category: string;
  query?: string;
  publicCodes?: string[];
  initialGames?: Game[];
  initialPage?: number;
  initialLastPage?: number;
}) {
  const { lang, t } = useI18n();
  const isAll = publicCodes.length === 0;
  const [state, setState] = useState<"loading" | "error" | "ready">(
    initialGames && initialGames.length > 0 && isAll ? "ready" : "loading",
  );
  const [games, setGames] = useState<Game[]>(initialGames && isAll ? initialGames : []);
  const [page, setPage] = useState(initialGames && isAll ? (initialPage ?? 1) : 1);
  const [lastPage, setLastPage] = useState<number | null>(initialGames && isAll ? (initialLastPage ?? null) : null);
  const [fullList, setFullList] = useState<Game[] | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [q, setQ] = useState("");
  const firstLoad = useRef(true);
  const initialGamesRef = useRef(initialGames);

  // Debounce the page search box so we query the full catalog, not just the
  // already-loaded page (Show More used to be disabled while typing).
  useEffect(() => {
    const id = window.setTimeout(() => setQ(query.trim().replace(/\s+/g, " ")), DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    const unfiltered = publicCodes.length === 0 && !q;
    const seeded = initialGamesRef.current;
    const stayOnInitial = firstLoad.current && unfiltered && Boolean(seeded && seeded.length > 0);
    firstLoad.current = false;

    void (async () => {
      await Promise.resolve();
      if (controller.signal.aborted) return;
      if (!stayOnInitial) {
        setState("loading");
        setGames([]);
        setLastPage(null);
      }
      setLoadingMore(false);
      setFullList(null);

      try {
        const response = await fetch("/api/lobby/games", {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({
            locale: lang,
            page: 1,
            limit: ALL_GAMES_PAGE_SIZE,
            ...(publicCodes.length > 0 ? { publicCodes } : {}),
            ...(q ? { q } : {}),
          }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("failed");
        const payload = (await response.json()) as PagePayload;
        if (controller.signal.aborted) return;
        const list = Array.isArray(payload.games) ? payload.games : [];
        const tagged = list.map((game) => ({ ...game, category: game.category || category }));
        // API ignored limit and returned the full unpaginated list.
        if ((payload.last_page == null || payload.last_page === undefined) && list.length > ALL_GAMES_PAGE_SIZE) {
          setFullList(tagged);
          setGames(tagged.slice(0, ALL_GAMES_PAGE_SIZE));
          setLastPage(Math.max(1, Math.ceil(tagged.length / ALL_GAMES_PAGE_SIZE)));
          setPage(1);
        } else {
          setGames(tagged);
          setPage(typeof payload.page === "number" ? payload.page : 1);
          setLastPage(typeof payload.last_page === "number" ? payload.last_page : list.length < ALL_GAMES_PAGE_SIZE ? 1 : null);
        }
        setState("ready");
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (!controller.signal.aborted) setState("error");
      }
    })();

    return () => controller.abort();
  }, [lang, category, publicCodes, q]);

  async function loadMore() {
    if (loadingMore) return;
    if (fullList) {
      const next = page + 1;
      setGames(fullList.slice(0, next * ALL_GAMES_PAGE_SIZE));
      setPage(next);
      return;
    }
    const next = page + 1;
    setLoadingMore(true);
    try {
      const response = await fetch("/api/lobby/games", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          locale: lang,
          page: next,
          limit: ALL_GAMES_PAGE_SIZE,
          ...(publicCodes.length > 0 ? { publicCodes } : {}),
          ...(q ? { q } : {}),
        }),
      });
      if (!response.ok) throw new Error("failed");
      const payload = (await response.json()) as PagePayload;
      const list = Array.isArray(payload.games) ? payload.games : [];
      const tagged = list.map((game) => ({ ...game, category: game.category || category }));
      setGames((current) => [...current, ...tagged]);
      setPage(typeof payload.page === "number" ? payload.page : next);
      if (typeof payload.last_page === "number") setLastPage(payload.last_page);
      else if (list.length < ALL_GAMES_PAGE_SIZE) setLastPage(next);
    } catch {
      // Keep what is already on the page; the button can be pressed again.
    } finally {
      setLoadingMore(false);
    }
  }

  if (state === "loading") return <AllGamesSkeleton />;
  if (state === "error") return <Notice>{t.lobby.loadError}</Notice>;

  if (games.length === 0) return <Notice>{q ? t.search.empty : t.lobby.empty}</Notice>;

  const canLoadMore =
    fullList ? games.length < fullList.length : lastPage != null ? page < lastPage : games.length >= ALL_GAMES_PAGE_SIZE && games.length % ALL_GAMES_PAGE_SIZE === 0;

  return (
    <section className="mt-6" aria-label={t.lobby.allGames} id="all-games-panel">
      <div className={GRID}>
        {games.map((game) => (
          <GameCover key={game.id} game={game} href={gameHref(game, category)} fluid />
        ))}
      </div>
      {canLoadMore ? (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="flex h-11 min-w-36 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-6 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
          >
            {t.search.showMore}
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9 L12 15 L18 9" />
            </svg>
          </button>
        </div>
      ) : null}
    </section>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-muted">
      {children}
    </p>
  );
}

export function AllGamesSkeleton({ className }: { className?: string } = {}) {
  return (
    <div className={`${className ?? "mt-6"} ${GRID}`} aria-hidden="true" data-skeleton="">
      {Array.from({ length: 16 }, (_, index) => (
        <div key={index} className="aspect-[3/4] rounded-xl bg-white/5 motion-safe:animate-pulse" />
      ))}
    </div>
  );
}

// SSR the first page from the category loader so the list is visible without waiting
// for the client fetch (Show More still loads further pages).
export function AllGamesFromPromise({
  promise,
  category,
  query,
  publicCodes,
}: {
  promise: Promise<CategoryGamesResult>;
  category: string;
  query?: string;
  publicCodes?: string[];
}) {
  const result = use(promise);
  return (
    <AllGamesList
      category={category}
      query={query}
      publicCodes={publicCodes}
      initialGames={result.error ? undefined : result.games}
      initialPage={result.page}
      initialLastPage={result.lastPage}
    />
  );
}
