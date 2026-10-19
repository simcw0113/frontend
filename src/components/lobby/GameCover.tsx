"use client";

import { useI18n } from "@/components/I18nProvider";
import type { Game, GameSymbol } from "@/config/lobby";
import { fill, htmlLang } from "@/i18n";

function SymbolMark({ symbol }: { symbol: GameSymbol }) {
  const common = "h-24 w-24 drop-shadow-lg";
  switch (symbol) {
    case "crown":
      return (
        <svg viewBox="0 0 80 80" className={common} aria-hidden="true">
          <path d="M10 54 L18 28 L32 44 L40 18 L48 44 L62 28 L70 54 Z" fill="#f8e7a2" />
          <rect x="14" y="54" width="52" height="8" rx="2" fill="#f4d36a" />
        </svg>
      );
    case "ape":
      return (
        <svg viewBox="0 0 80 80" className={common} aria-hidden="true">
          <circle cx="40" cy="42" r="22" fill="#6b3a22" />
          <circle cx="18" cy="46" r="10" fill="#8a4b2c" />
          <circle cx="62" cy="46" r="10" fill="#8a4b2c" />
          <circle cx="32" cy="40" r="4" fill="#1c1915" />
          <circle cx="48" cy="40" r="4" fill="#1c1915" />
          <ellipse cx="40" cy="52" rx="8" ry="5" fill="#c4896a" />
        </svg>
      );
    case "cat":
      return (
        <svg viewBox="0 0 80 80" className={common} aria-hidden="true">
          <path d="M18 34 L24 14 L36 30 L40 18 L44 30 L56 14 L62 34 C70 40 70 58 40 62 C10 58 10 40 18 34Z" fill="#fff7ea" />
          <circle cx="32" cy="40" r="3" fill="#1c1915" />
          <circle cx="48" cy="40" r="3" fill="#1c1915" />
          <path d="M40 44 L36 50 H44 Z" fill="#e07a9a" />
        </svg>
      );
    case "helm":
      return (
        <svg viewBox="0 0 80 80" className={common} aria-hidden="true">
          <path d="M16 36 C16 20 64 20 64 36 V52 H16 Z" fill="#f3d7a1" />
          <path d="M28 36 V58 M40 28 V58 M52 36 V58" stroke="#8a5a2b" strokeWidth="3" />
          <rect x="22" y="52" width="36" height="8" rx="2" fill="#d7a15a" />
        </svg>
      );
    case "seven":
      return (
        <svg viewBox="0 0 80 80" className={common} aria-hidden="true">
          <text x="40" y="58" textAnchor="middle" fontSize="54" fontWeight="800" fill="#fff4c2">7</text>
        </svg>
      );
    case "pig":
      return (
        <svg viewBox="0 0 80 80" className={common} aria-hidden="true">
          <ellipse cx="40" cy="42" rx="24" ry="18" fill="#f6c14b" />
          <ellipse cx="40" cy="46" rx="8" ry="6" fill="#e39a3c" />
          <circle cx="37" cy="46" r="1.5" fill="#5c3310" />
          <circle cx="43" cy="46" r="1.5" fill="#5c3310" />
          <circle cx="30" cy="36" r="2" fill="#5c3310" />
          <circle cx="50" cy="36" r="2" fill="#5c3310" />
        </svg>
      );
    case "lantern":
      return (
        <svg viewBox="0 0 80 80" className={common} aria-hidden="true">
          <rect x="30" y="16" width="20" height="6" rx="2" fill="#f8e7a2" />
          <rect x="24" y="24" width="32" height="36" rx="8" fill="#ffb020" />
          <rect x="34" y="60" width="12" height="8" rx="2" fill="#f8e7a2" />
        </svg>
      );
    case "tiger":
      return (
        <svg viewBox="0 0 80 80" className={common} aria-hidden="true">
          <circle cx="40" cy="42" r="20" fill="#f59e0b" />
          <path d="M24 30 L20 18 L32 28 M56 30 L60 18 L48 28" fill="#f59e0b" stroke="#f59e0b" strokeWidth="4" />
          <path d="M30 34 H36 M44 34 H50 M34 48 H46" stroke="#1c1915" strokeWidth="2" />
        </svg>
      );
    case "jet":
      return (
        <svg viewBox="0 0 80 80" className={common} aria-hidden="true">
          <path d="M40 12 L52 46 H28 Z" fill="#dbe4ff" />
          <path d="M40 40 L62 52 L40 48 L18 52 Z" fill="#9db4ff" />
          <circle cx="40" cy="58" r="6" fill="#f8fafc" />
        </svg>
      );
    case "orbit":
      return (
        <svg viewBox="0 0 80 80" className={common} aria-hidden="true">
          <circle cx="40" cy="40" r="14" fill="#7dd3fc" />
          <ellipse cx="40" cy="40" rx="30" ry="12" fill="none" stroke="#e0f2fe" strokeWidth="3" transform="rotate(-20 40 40)" />
        </svg>
      );
    case "star":
      return (
        <svg viewBox="0 0 80 80" className={common} aria-hidden="true">
          <path d="M40 12 L48 32 H70 L52 44 L58 66 L40 54 L22 66 L28 44 L10 32 H32 Z" fill="#ffe08a" />
        </svg>
      );
    case "pilot":
      return (
        <svg viewBox="0 0 80 80" className={common} aria-hidden="true">
          <circle cx="40" cy="34" r="14" fill="#fde68a" />
          <path d="M22 62 C26 48 54 48 58 62 Z" fill="#f9a8d4" />
          <path d="M24 30 H56" stroke="#fbcfe8" strokeWidth="4" />
        </svg>
      );
    case "ball":
      return (
        <svg viewBox="0 0 80 80" className={common} aria-hidden="true">
          <circle cx="40" cy="40" r="22" fill="#f8fafc" />
          <path d="M40 18 V62 M18 40 H62 M24 26 C32 34 32 46 24 54 M56 26 C48 34 48 46 56 54" stroke="#111827" strokeWidth="2" fill="none" />
        </svg>
      );
    case "block":
      return (
        <svg viewBox="0 0 80 80" className={common} aria-hidden="true">
          <rect x="18" y="22" width="44" height="36" rx="6" fill="#ffedd5" />
          <text x="40" y="46" textAnchor="middle" fontSize="14" fontWeight="800" fill="#c2410c">1000x</text>
        </svg>
      );
    case "cards":
      return (
        <svg viewBox="0 0 80 80" className={common} aria-hidden="true">
          <rect x="18" y="18" width="28" height="40" rx="4" fill="#fff" transform="rotate(-12 32 38)" />
          <rect x="34" y="18" width="28" height="40" rx="4" fill="#111827" transform="rotate(8 48 38)" />
          <text x="30" y="36" fontSize="14" fill="#dc2626">A</text>
        </svg>
      );
    case "coin":
      return (
        <svg viewBox="0 0 80 80" className={common} aria-hidden="true">
          <circle cx="40" cy="40" r="22" fill="#f5d76e" />
          <circle cx="40" cy="40" r="14" fill="none" stroke="#a16207" strokeWidth="3" />
          <text x="40" y="46" textAnchor="middle" fontSize="16" fontWeight="800" fill="#a16207">₿</text>
        </svg>
      );
    case "fish":
      return (
        <svg viewBox="0 0 80 80" className={common} aria-hidden="true">
          <ellipse cx="38" cy="40" rx="20" ry="12" fill="#e0f2fe" />
          <path d="M58 40 L72 28 V52 Z" fill="#bae6fd" />
          <circle cx="28" cy="38" r="2" fill="#0c4a6e" />
        </svg>
      );
    case "ghost":
      return (
        <svg viewBox="0 0 80 80" className={common} aria-hidden="true">
          <path d="M24 36 C24 22 56 22 56 36 V62 L48 54 L40 62 L32 54 L24 62 Z" fill="#f5f3ff" />
          <circle cx="34" cy="40" r="3" fill="#4c1d95" />
          <circle cx="48" cy="40" r="3" fill="#4c1d95" />
        </svg>
      );
    case "table":
      return (
        <svg viewBox="0 0 80 80" className={common} aria-hidden="true">
          <ellipse cx="40" cy="40" rx="28" ry="16" fill="#14532d" stroke="#f5d0a8" strokeWidth="3" />
          <circle cx="40" cy="40" r="4" fill="#f5d0a8" />
        </svg>
      );
    case "reel":
      return (
        <svg viewBox="0 0 80 80" className={common} aria-hidden="true">
          <rect x="16" y="18" width="48" height="44" rx="6" fill="#082f49" stroke="#7dd3fc" strokeWidth="3" />
          <path d="M32 18 V62 M48 18 V62" stroke="#7dd3fc" strokeWidth="3" />
        </svg>
      );
  }
}

export function GameCover({ game, fluid = false }: { game: Game; fluid?: boolean }) {
  const { locale, t } = useI18n();

  return (
    <article className={`game-card ${fluid ? "min-w-0" : "w-[132px] shrink-0 sm:w-[148px]"}`}>
      <div
        className="game-cover relative aspect-[3/4] overflow-hidden rounded-xl"
        style={{ background: `linear-gradient(180deg, ${game.from}, ${game.to})` }}
      >
        <p className="absolute top-2 right-2 left-2 truncate text-[9px] font-semibold tracking-[0.14em] text-white/75 uppercase">
          {game.provider}
        </p>
        <div className="game-art absolute inset-0 flex items-center justify-center pt-2">
          <SymbolMark symbol={game.symbol} />
        </div>
        <h3 className="absolute inset-x-2 bottom-3 text-[15px] leading-[0.95] font-black tracking-tight text-white uppercase drop-shadow-md">
          {game.title}
        </h3>
        <span
          aria-hidden="true"
          className="game-play absolute right-2 bottom-2 grid size-7 place-items-center rounded-full bg-brand text-lobby"
        >
          <svg viewBox="0 0 24 24" className="size-3.5 translate-x-px" fill="currentColor">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
        </span>
      </div>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
        <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
        {fill(t.lobby.playing, { count: game.playing.toLocaleString(htmlLang(locale)) })}
      </p>
    </article>
  );
}
