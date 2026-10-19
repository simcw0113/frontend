"use client";

import { use } from "react";
import { useI18n } from "@/components/I18nProvider";
import { SymbolMark } from "@/components/lobby/GameCover";
import type { Game } from "@/config/lobby";
import { fill, htmlLang } from "@/i18n";
import type { TopWin, TopWinsResult } from "@/lib/topWins";

// "Top wins of the month": a podium for ranks 1-3 (shown 2, 1, 3) next to a list
// of the following ranks. Hidden when there is nothing to show or the API failed.
// Side by side from 48rem of its own width, stacked below that (container queries).
const LIST_ROWS = 3;

const PODIUM = [
  // rank 1 is the centre, larger, gold; 2 left, silver; 3 right, bronze
  {
    rank: 1,
    order: "order-2",
    pad: "pt-5 @md:pt-6",
    thumb: "size-16 @md:size-24",
    bg: "linear-gradient(180deg, rgb(234 179 8 / 0.34), rgb(15 40 47 / 0.92) 78%)",
    medal: ["#fbd34d", "#c98a0a"],
  },
  {
    rank: 2,
    order: "order-1",
    pad: "pt-4 @md:pt-5",
    thumb: "size-14 @md:size-20",
    bg: "linear-gradient(180deg, rgb(203 213 225 / 0.26), rgb(15 40 47 / 0.92) 78%)",
    medal: ["#e2e8f0", "#94a3b8"],
  },
  {
    rank: 3,
    order: "order-3",
    pad: "pt-4 @md:pt-5",
    thumb: "size-14 @md:size-20",
    bg: "linear-gradient(180deg, rgb(194 120 70 / 0.32), rgb(15 40 47 / 0.92) 78%)",
    medal: ["#e0a070", "#a5622f"],
  },
] as const;

// A 12-point scalloped star for the rank medal.
const MEDAL_PATH = (() => {
  const points = Array.from({ length: 24 }, (_, i) => {
    const radius = i % 2 === 0 ? 50 : 41;
    const angle = (Math.PI * i) / 12;
    return `${(50 + radius * Math.sin(angle)).toFixed(1)},${(50 - radius * Math.cos(angle)).toFixed(1)}`;
  });
  return `M${points.join("L")}Z`;
})();

function Medal({ rank, colors, className }: { rank: number; colors: readonly [string, string]; className: string }) {
  const { t } = useI18n();
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={fill(t.lobby.rank, { n: rank })} className={className}>
      <path d={MEDAL_PATH} fill={colors[0]} stroke={colors[1]} strokeWidth="4" strokeLinejoin="round" />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fontSize="50" fontWeight="800" fill="#0f282f">
        {rank}
      </text>
    </svg>
  );
}

function Thumb({ game, className }: { game: Game; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`relative block shrink-0 overflow-hidden rounded-xl ${className}`}
      style={{ background: `linear-gradient(180deg, ${game.from}, ${game.to})` }}
    >
      <SymbolMark symbol={game.symbol} className="size-full p-1.5 drop-shadow-md" />
    </span>
  );
}

function useAmount() {
  const { locale } = useI18n();
  return (win: TopWin) => `${win.amount.toLocaleString(htmlLang(locale))} ${win.currency}`;
}

export function TopWins({ promise }: { promise: Promise<TopWinsResult> }) {
  const { t } = useI18n();
  const result = use(promise);
  const amount = useAmount();
  if (result.error || result.wins.length === 0) return null;

  const wins = [...result.wins].sort((a, b) => a.rank - b.rank);
  const podium = PODIUM.flatMap((slot, index) => (wins[index] ? [{ slot, win: wins[index] }] : []));
  const rest = wins.slice(3, 3 + LIST_ROWS);

  return (
    <section aria-labelledby="top-wins-heading" className="@container">
      <h2 id="top-wins-heading" className="mb-3 text-sm font-bold tracking-wide uppercase">
        {t.lobby.topWins}
      </h2>
      <div className="grid gap-3 @3xl:grid-cols-2">
        <ol className="grid grid-cols-3 items-end gap-2 @md:gap-3">
          {podium.map(({ slot, win }) => (
            <li
              key={win.rank}
              className={`win-card flex min-w-0 flex-col rounded-2xl border border-white/10 p-2.5 @md:p-3.5 ${slot.order} ${slot.pad}`}
              style={{ background: slot.bg }}
            >
              <span className="relative mx-auto mb-3 block">
                <Thumb game={win.game} className={slot.thumb} />
                <Medal
                  rank={win.rank}
                  colors={slot.medal}
                  className="absolute -right-2 -bottom-2 size-6 drop-shadow @md:-right-3 @md:-bottom-3 @md:size-8"
                />
              </span>
              <span className="sr-only">{win.game.title}</span>
              <span className="truncate text-[11px] text-muted italic">ID {win.playerId}</span>
              <span className="text-[13px] leading-tight font-extrabold break-words italic @md:text-base">
                {amount(win)}
              </span>
            </li>
          ))}
        </ol>
        {rest.length > 0 ? (
          <ol start={4} className="grid content-start gap-2">
            {rest.map((win) => (
              <li
                key={win.rank}
                className="win-card flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5"
              >
                <span className="sr-only">{fill(t.lobby.rank, { n: win.rank })}</span>
                <Thumb game={win.game} className="size-11" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{win.game.title}</span>
                  <span className="block truncate text-[11px] text-muted italic">ID {win.playerId}</span>
                </span>
                <span className="shrink-0 text-right text-sm font-extrabold italic @md:text-base">{amount(win)}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  );
}

export function TopWinsSkeleton() {
  return (
    <div className="@container" aria-hidden="true" data-skeleton="">
      <div className="mb-3 h-5 w-48 rounded bg-white/5 motion-safe:animate-pulse" />
      <div className="grid gap-3 @3xl:grid-cols-2">
        <div className="h-44 rounded-2xl bg-white/5 motion-safe:animate-pulse" />
        <div className="hidden h-44 rounded-xl bg-white/5 motion-safe:animate-pulse @3xl:block" />
      </div>
    </div>
  );
}
