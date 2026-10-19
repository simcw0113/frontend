"use client";

import { Suspense, use, type ReactNode } from "react";
import { useI18n } from "@/components/I18nProvider";
import { GameCover, gameHref } from "@/components/lobby/GameCover";
import { LobbyLink } from "@/components/lobby/LobbyLink";
import { Partners, PartnersSkeleton } from "@/components/lobby/Partners";
import { defaultCasinoCategory, homeCategories, type CasinoCategory } from "@/config/categories";
import type { CategoryGamesResult } from "@/lib/games";
import type { PartnersResult } from "@/lib/partners";

export const HOME_SCROLL_KEY = "lobby-home-scroll";
const PREVIEW_COUNT = 8;
// Placeholders on a category page: about as many as a full list, so the page height
// does not jump when the games arrive.
const CATEGORY_SKELETON_COUNT = 16;

// The game content under the search bar. On the home page: one row per entry of
// `casinoCategories` (config/categories.ts, in that order, each with a View all link; entries
// with `showOnHome: false` are skipped),
// then Partners, so a new row always lands above Partners. On a category page: just that
// category's full list. To add a home row see the notes at the top of config/categories.ts;
// nothing here changes.
export function HomeGameContent({
  focus,
  category,
  games,
  partners,
}: {
  focus: "home" | "casino";
  category?: CasinoCategory;
  games: Record<string, Promise<CategoryGamesResult>>;
  partners?: Promise<PartnersResult>; // home only
}) {
  const { t } = useI18n();
  const home = focus === "home";
  const rows = home ? homeCategories : [category ?? defaultCasinoCategory];
  return (
    <>
      <div className="mt-6 space-y-8">
        {rows.map((row) => {
          // `games` is required by the types; the optional chain only keeps a stale dev
          // module graph (page from an older version) from crashing the render.
          const promise = games?.[row.slug] as Promise<CategoryGamesResult> | undefined;
          return (
            <CardRow key={row.slug} title={t.lobby[row.titleKey]} href={home ? `/casino/${row.slug}` : undefined}>
              {promise ? (
                <Suspense fallback={<GridSkeleton count={home ? PREVIEW_COUNT : CATEGORY_SKELETON_COUNT} />}>
                  <GameGrid promise={promise} category={row.slug} limit={home ? PREVIEW_COUNT : undefined} />
                </Suspense>
              ) : (
                <Notice>{t.lobby.empty}</Notice>
              )}
            </CardRow>
          );
        })}
      </div>
      {home && partners ? (
        <div className="mt-10 empty:hidden">
          <Suspense fallback={<PartnersSkeleton />}>
            <Partners promise={partners} />
          </Suspense>
        </div>
      ) : null}
    </>
  );
}

// The player's Recent games / Favourites list (/recent, /favourites): the same grid, covers
// and states as a category page, with the page's own empty text. The title is the page's
// title bar (LobbyScreen), so the section is labelled by it.
export function PlayerGameList({
  promise,
  emptyText,
  labelledBy,
}: {
  promise: Promise<CategoryGamesResult>;
  emptyText: string;
  labelledBy: string;
}) {
  return (
    <section aria-labelledby={labelledBy} className="mt-6">
      <Suspense fallback={<GridSkeleton count={8} />}>
        <GameGrid promise={promise} category={defaultCasinoCategory.slug} emptyText={emptyText} />
      </Suspense>
    </section>
  );
}

function CardRow({ title, href, children }: { title: string; href?: string; children: ReactNode }) {
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
      {children}
    </section>
  );
}

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8";

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-muted">{children}</p>
  );
}

// The games of one category: the list, "nothing here yet" for an empty category,
// or the error state.
// Each tile opens its game page (/casino/{category}/game/{id}); `category` is the fallback for
// games that do not name theirs (player lists from the API).
function GameGrid({
  promise,
  category,
  limit,
  emptyText,
}: {
  promise: Promise<CategoryGamesResult>;
  category: string;
  limit?: number;
  emptyText?: string;
}) {
  const { t } = useI18n();
  const result = use(promise);
  if (result.error) return <Notice>{t.lobby.loadError}</Notice>;
  if (result.games.length === 0) return <Notice>{emptyText ?? t.lobby.empty}</Notice>;
  return (
    <div className={GRID}>
      {(limit ? result.games.slice(0, limit) : result.games).map((game) => (
        <GameCover key={game.id} game={game} href={gameHref(game, category)} fluid />
      ))}
    </div>
  );
}

function GridSkeleton({ count }: { count: number }) {
  return (
    <div className={GRID} aria-hidden="true" data-skeleton="">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="aspect-[3/4] rounded-xl bg-white/5 motion-safe:animate-pulse" />
      ))}
    </div>
  );
}
