"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useI18n } from "@/components/I18nProvider";
import { GameCover, gameHref } from "@/components/lobby/GameCover";
import type { Game } from "@/config/lobby";

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8";

export function ProviderGames({ code, category }: { code: string; category: string }) {
  const { locale, t } = useI18n();
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    setGames([]);

    fetch("/api/lobby/games", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ code, locale }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("failed");
        return (await response.json()) as { games?: Game[] };
      })
      .then((payload) => {
        setGames(Array.isArray(payload.games) ? payload.games : []);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState("error");
      });

    return () => controller.abort();
  }, [code, locale]);

  if (state === "loading") return <ProviderGamesSkeleton />;
  if (state === "error") return <Notice>{t.lobby.loadError}</Notice>;
  if (games.length === 0) return <Notice>{t.lobby.empty}</Notice>;

  return (
    <section className="mt-6" aria-label={t.lobby.providers}>
      <div className={GRID}>
        {games.map((game) => (
          <GameCover key={game.id} game={game} href={gameHref(game, category)} fluid />
        ))}
      </div>
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
