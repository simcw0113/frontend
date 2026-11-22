"use client";

import { use, useState } from "react";
import type { CSSProperties } from "react";
import { useI18n } from "@/components/I18nProvider";
import { gameHref, SymbolMark } from "@/components/lobby/GameCover";
import { LobbyLink } from "@/components/lobby/LobbyLink";
import { missionsPoppins } from "@/components/lobby/missionsFont";
import type { Game } from "@/config/lobby";
import { fill } from "@/i18n";
import type { TopWin, TopWinsResult } from "@/lib/topWins";

// Compact "Top wins of the last N days" row, matched to Kickwin's Recent Big Wins
// (64×74 / 50×67 covers, auto-scrolling marquee, no arrow controls). Layout and
// sizes are Tailwind + inline styles so they do not depend on a CSS module (the
// local next dev server does not pick up new CSS without a restart). Each card
// still links to our game page and uses our player / amount / currency data.
// Hidden when there is nothing to show or the API failed.

const MIN_MARQUEE_ITEMS = 20;

// CSS variables (with px fallbacks) so mobile overrides can live in the
// component <style> tag without fighting inline widths.
const CARD_STYLE: CSSProperties = {
  width: "var(--topwins-card-w, 63px)",
  marginLeft: "0.375rem",
  marginRight: "0.375rem",
  flexShrink: 0,
};
const COVER_BOX: CSSProperties = {
  width: "var(--topwins-cover-w, 64px)",
  height: "var(--topwins-cover-h, 74px)",
  position: "relative",
  display: "block",
  overflow: "hidden",
  borderRadius: "0.5rem",
};
const TRACK_LAYOUT: CSSProperties = {
  display: "flex",
  flexWrap: "nowrap",
  alignItems: "flex-start",
  width: "max-content",
  animation: "topwins-marquee 70s linear infinite",
};
const SCROLLER_LAYOUT: CSSProperties = {
  overflow: "hidden",
  width: "100%",
};

const CARD =
  "flex w-full shrink-0 flex-col items-center overflow-hidden text-center";
const COVER =
  "relative block h-[74px] w-16 overflow-hidden rounded-lg max-md:h-[67px] max-md:w-[50px]";

// "MYR 12.0K"; always Latin K/M so every language reads the same.
const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const TOPWINS_CSS = `
.topwins {
  --topwins-card-w: 63px;
  --topwins-cover-w: 64px;
  --topwins-cover-h: 74px;
}
@media (max-width: 767px) {
  .topwins {
    --topwins-card-w: 50px;
    --topwins-cover-w: 50px;
    --topwins-cover-h: 67px;
  }
}
@keyframes topwins-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.topwins-track.paused {
  animation-play-state: paused;
}
@media (hover: hover) {
  .topwins-track:hover {
    animation-play-state: paused;
  }
}
@media (prefers-reduced-motion: reduce) {
  .topwins-scroller {
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .topwins-scroller::-webkit-scrollbar {
    display: none;
  }
  .topwins-track {
    animation: none;
  }
}
`;

function TopWinsStyles() {
  return <style>{TOPWINS_CSS}</style>;
}

function Cover({ game }: { game: Game }) {
  // A cover that fails to load falls back to the drawn gradient + symbol (same as GameCover).
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={COVER}
      style={{ ...COVER_BOX, background: `linear-gradient(180deg, ${game.from}, ${game.to})` }}
    >
      {game.image && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote provider covers, same as GameCover
        <img
          src={game.image}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <SymbolMark symbol={game.symbol} className="absolute inset-0 size-full p-1 drop-shadow-md" />
      )}
    </span>
  );
}

function WinnersIcon() {
  // Kickwin /img/icons/recent.svg (podium + star), drawn in currentColor so we use
  // our brand token instead of Kickwin's #2ee881.
  return (
    <svg viewBox="0 0 22 22" className="size-6 shrink-0 text-brand" fill="currentColor" aria-hidden="true">
      <path d="M6.42 13.02H3.55C2.7 13.02 2 13.71 2 14.57V19.43C2 20.28 2.69 20.98 3.55 20.98H6.42V13.03V13.02Z" />
      <path d="M11.9402 10.8101H9.29023C8.44023 10.8101 7.74023 11.5001 7.74023 12.3601V20.9801H13.4802V12.3601C13.4802 11.5101 12.7902 10.8101 11.9302 10.8101" />
      <path d="M17.6796 15.22H14.8096V20.96H17.6796C18.5296 20.96 19.2296 20.27 19.2296 19.41V16.76C19.2296 15.91 18.5396 15.21 17.6796 15.21" />
      <path d="M14.4402 4.74994C14.3602 4.50994 14.1502 4.32994 13.9102 4.29994L12.0402 4.02994L11.2102 2.33994C10.9902 1.88994 10.2402 1.88994 10.0202 2.33994L9.19019 4.02994L7.32019 4.29994C7.07019 4.33994 6.86019 4.50994 6.79019 4.74994C6.72019 4.98994 6.78019 5.24994 6.96019 5.42994L8.31019 6.74994L7.99019 8.60994C7.95019 8.85994 8.05019 9.10994 8.25019 9.25994C8.45019 9.40994 8.72019 9.42994 8.95019 9.30994L10.6202 8.42994L12.2902 9.30994C12.3902 9.35994 12.4902 9.38994 12.6002 9.38994C12.7402 9.38994 12.8702 9.34994 12.9902 9.25994C13.1902 9.10994 13.3002 8.85994 13.2502 8.60994L12.9302 6.74994L14.2802 5.42994C14.4602 5.24994 14.5302 4.98994 14.4502 4.74994" />
    </svg>
  );
}

function WinCard({ win }: { win: TopWin }) {
  const amount = `${win.currency} ${compact.format(win.amount)}`;
  return (
    <div className="shrink-0" style={CARD_STYLE}>
      <LobbyLink
        href={gameHref(win.game, "all-games")}
        ariaLabel={`${win.game.title}, ${win.playerId}, ${amount}`}
        className={`${CARD} rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`}
      >
        <Cover game={win.game} />
        <span className="mt-0.5 flex flex-col items-center">
          <span aria-hidden="true" className="max-w-[60px] truncate text-[9px] leading-normal font-bold">
            {win.playerId}
          </span>
          <span
            aria-hidden="true"
            className="mt-0.5 flex w-[100px] items-center justify-center text-[8px] leading-normal font-extrabold text-brand"
          >
            {amount}
          </span>
        </span>
      </LobbyLink>
    </div>
  );
}

function padWins(wins: TopWin[]) {
  if (wins.length === 0) return wins;
  const copies = wins.length < MIN_MARQUEE_ITEMS ? Math.ceil(MIN_MARQUEE_ITEMS / wins.length) : 1;
  const padded = Array.from({ length: copies }, () => wins).flat();
  return [...padded, ...padded];
}

export function TopWins({ promise }: { promise: Promise<TopWinsResult> }) {
  const { t } = useI18n();
  const result = use(promise);
  const [paused, setPaused] = useState(false);
  if (result.error || result.wins.length === 0) return null;

  const wins = [...result.wins].sort((a, b) => a.rank - b.rank);
  const items = padWins(wins);

  return (
    <section aria-labelledby="top-wins-heading" className={`topwins ${missionsPoppins.className}`}>
      <TopWinsStyles />
      <h2
        id="top-wins-heading"
        className="mb-2 flex items-center gap-2 text-[20px] leading-tight font-bold max-md:text-base"
      >
        <WinnersIcon />
        {result.days <= 1 ? t.lobby.topWinsToday : fill(t.lobby.topWins, { n: result.days })}
      </h2>
      <div
        className="topwins-scroller w-full overflow-hidden pt-3 max-md:pt-0"
        style={SCROLLER_LAYOUT}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        onTouchCancel={() => setPaused(false)}
      >
        <div
          className={`topwins-track flex w-max flex-nowrap items-start${paused ? " paused" : ""}`}
          style={TRACK_LAYOUT}
        >
          {items.map((win, index) => (
            <WinCard key={`${win.rank}-${index}`} win={win} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function TopWinsSkeleton() {
  return (
    <div aria-hidden="true" data-skeleton="" className={`topwins ${missionsPoppins.className}`}>
      <TopWinsStyles />
      <div className="mb-2 flex items-center gap-2">
        <div className="size-6 rounded bg-white/5 motion-safe:animate-pulse" />
        <div className="h-5 w-52 rounded bg-white/5 motion-safe:animate-pulse max-md:h-4" />
      </div>
      <div className="flex w-full flex-nowrap items-start overflow-hidden pt-3 max-md:pt-0" style={SCROLLER_LAYOUT}>
        {Array.from({ length: 24 }, (_, index) => (
          <div key={index} className={CARD} style={CARD_STYLE}>
            <div className={`${COVER} bg-white/5 motion-safe:animate-pulse`} style={COVER_BOX} />
            <div className="mt-2 flex w-full flex-col items-center gap-1">
              <div className="h-2.5 w-[60px] rounded bg-white/5 motion-safe:animate-pulse" />
              <div className="h-2.5 w-[50px] rounded bg-white/5 motion-safe:animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
