"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useI18n } from "@/components/I18nProvider";
import { GameCover, gameHref } from "@/components/lobby/GameCover";
import type { Game } from "@/config/lobby";

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8";
// The API already returns the provider's full list. The page shows one batch,
// then "Show More" reveals the next batch from that same list. Search filters
// this list in memory and does not request again.
const PAGE_SIZE = 40;

export function ProviderGames({
  publicCode,
  category,
  query = "",
}: {
  publicCode: string;
  category: string;
  query?: string; // category page: filter the loaded list in place, no search dialog
}) {
  const { locale, t } = useI18n();
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [games, setGames] = useState<Game[]>([]);
  const [shown, setShown] = useState(PAGE_SIZE);

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    setGames([]);

    fetch("/api/lobby/games", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ publicCode, locale }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("failed");
        return (await response.json()) as { games?: Game[] };
      })
      .then((payload) => {
        const games = Array.isArray(payload.games) ? payload.games : [];
        setGames(games.map((game) => ({ ...game, publicCode: game.publicCode || publicCode })));
        setState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState("error");
      });

    return () => controller.abort();
  }, [publicCode, locale]);

  // A new provider or a new search starts again at the first batch.
  useEffect(() => {
    setShown(PAGE_SIZE);
  }, [publicCode, query]);

  if (state === "loading") return <ProviderGamesSkeleton />;
  if (state === "error") return <Notice>{t.lobby.loadError}</Notice>;

  const needle = query.trim().toLowerCase();
  const visible = needle ? games.filter((game) => game.title.toLowerCase().includes(needle)) : games;
  if (games.length === 0) return <Notice>{t.lobby.empty}</Notice>;
  if (visible.length === 0) return <Notice>{t.search.empty}</Notice>;

  const page = visible.slice(0, shown);

  return (
    <section className="mt-6" aria-label={t.lobby.providers}>
      <div className={GRID}>
        {page.map((game) => (
          <GameCover key={game.id} game={game} href={gameHref(game, category)} fluid />
        ))}
      </div>
      {shown < visible.length ? (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setShown((count) => count + PAGE_SIZE)}
            className="flex h-11 min-w-36 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-6 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
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

export function ProviderGamesSkeleton() {
  return (
    <div className={`mt-6 ${GRID}`} aria-hidden="true" data-skeleton="">
      {Array.from({ length: 16 }, (_, index) => (
        <div key={index} className="aspect-[3/4] rounded-xl bg-white/5 motion-safe:animate-pulse" />
      ))}
    </div>
  );
}
