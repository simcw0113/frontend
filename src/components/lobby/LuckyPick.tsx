"use client";

import type { JSAnimation } from "animejs";
import { use, useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useI18n } from "@/components/I18nProvider";
import { gameHref, SymbolMark } from "@/components/lobby/GameCover";
import { LobbyLink } from "@/components/lobby/LobbyLink";
import type { Game } from "@/config/lobby";
import { fill } from "@/i18n";
import type { CategoryGamesResult } from "@/lib/games";
import { animate, reduceMotion } from "@/lib/motion";

// "Lucky Pick": a horizontal reel of the category's games (the same list as the page grid,
// so it follows the API later) with a cyan selector frame in the middle. Spin scrolls the
// strip fast, then eases out over ~3.6s onto a random game (crypto.getRandomValues), exactly
// centred in the frame, and opens the result pop-up (Play / Try Again). Shown on categories
// with `luckyPick: true` (config/categories.ts); hidden when the list is empty or failed.
// Reduced motion: no scrolling, a short fade onto the pick. Styles: .lucky-* in globals.css.

const SPIN_MS = 3600;
const REDUCED_MS = 220;
const EDGE = 12; // tiles kept on each side of any resting/target position (wider than any screen)
const MIN_TRAVEL = 30; // tiles passed at least during a spin

function randomIndex(n: number) {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] % n;
}

export function LuckyPick({ promise, category }: { promise: Promise<CategoryGamesResult>; category: string }) {
  const result = use(promise);
  if (result.error || result.games.length === 0) return null;
  return <LuckyPickReel games={result.games} category={category} />;
}

function LuckyPickReel({ games, category }: { games: Game[]; category: string }) {
  const { t } = useI18n();
  const n = games.length;
  const loops = Math.max(3, Math.ceil(MIN_TRAVEL / n));
  // Resting copy starts after enough tiles for the left edge; the strip is long enough for the
  // furthest target plus the right edge.
  const base = n * Math.ceil(EDGE / n);
  const length = base + n * (loops + 1) + EDGE;
  const strip = Array.from({ length }, (_, i) => games[i % n]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const index = useRef(base); // tile under the frame
  const spinningRef = useRef(false);
  const spinButton = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | null>(null);
  const [picked, setPicked] = useState<Game | null>(null); // landed game (null: "?" in the frame)
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Game | null>(null); // the pop-up's game
  const [announce, setAnnounce] = useState("");

  // translateX that centres tile `i` in the viewport.
  const xFor = useCallback((i: number) => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const tile = track?.children[0] as HTMLElement | undefined;
    const next = track?.children[1] as HTMLElement | undefined;
    if (!viewport || !tile || !next) return 0;
    const step = next.offsetLeft - tile.offsetLeft;
    return viewport.clientWidth / 2 - (tile.offsetLeft + i * step + tile.offsetWidth / 2);
  }, []);

  const place = useCallback(
    (i: number) => {
      const track = trackRef.current;
      if (!track) return;
      track.style.transition = "none";
      track.style.transform = `translateX(${xFor(i)}px)`;
    },
    [xFor],
  );

  // Keep the current tile centred (first paint, resizes, tile size changes at breakpoints).
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    place(index.current);
    const observer = new ResizeObserver(() => {
      if (!spinningRef.current) place(index.current);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [place]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  function spin() {
    const track = trackRef.current;
    if (!track || spinningRef.current) return;
    spinningRef.current = true;
    setSpinning(true);
    setAnnounce("");
    const pick = randomIndex(n);
    // Back to the resting copy (same picture), then travel `loops` rounds forward to the pick.
    const from = base + (index.current % n);
    place(from);
    const target = base + n * loops + pick;
    const finish = () => {
      index.current = base + pick;
      place(index.current);
      track.classList.remove("is-fading");
      spinningRef.current = false;
      setSpinning(false);
      setPicked(games[pick]);
      setResult(games[pick]);
      setAnnounce(fill(t.luckyPick.picked, { name: games[pick].title }));
    };
    setPicked(null);
    if (reduceMotion()) {
      place(target);
      track.classList.add("is-fading");
      timer.current = window.setTimeout(finish, REDUCED_MS);
      return;
    }
    void track.offsetWidth; // commit the reset before the transition starts
    track.style.transition = `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.72, 0.16, 1)`;
    track.style.transform = `translateX(${xFor(target)}px)`;
    timer.current = window.setTimeout(finish, SPIN_MS + 60);
  }

  return (
    <section aria-labelledby="lucky-pick-title" className="lucky-pick mt-6">
      <h2 id="lucky-pick-title" className="text-center text-lg font-bold">
        {t.luckyPick.title}
      </h2>
      <p className="mt-1 text-center text-sm text-muted">{t.luckyPick.subtitle}</p>
      <div ref={viewportRef} className="lucky-viewport" aria-hidden="true">
        <div ref={trackRef} className="lucky-track">
          {strip.map((game, i) => (
            <LuckyTile key={i} game={game} />
          ))}
        </div>
        <div className={`lucky-frame${picked || spinning ? "" : " is-empty"}`}>
          <span className="lucky-notch" />
          {picked || spinning ? null : <span className="lucky-question">?</span>}
        </div>
      </div>
      <div className="mt-4 flex justify-center">
        <button
          ref={spinButton}
          type="button"
          onClick={spin}
          disabled={spinning}
          aria-busy={spinning}
          aria-describedby="lucky-pick-title"
          className="lucky-spin"
        >
          {t.luckyPick.spin}
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <LuckyPickModal
        game={result}
        onClose={() => {
          // Keyboard users land back on Spin (the opener may have been disabled mid-spin).
          setResult(null);
          spinButton.current?.focus();
        }}
        playHref={result ? gameHref(result, category) : ""}
        onPlay={() => setResult(null)}
        onTryAgain={() => {
          setResult(null);
          spin();
        }}
      />
    </section>
  );
}

function LuckyTile({ game }: { game: Game }) {
  const [failed, setFailed] = useState(false);
  const image = game.image && !failed ? game.image : null;
  return (
    <div className="lucky-tile" style={{ background: `linear-gradient(180deg, ${game.from}, ${game.to})` }}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- covers may come from any API host
        <img src={image} alt="" width={240} height={240} loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center pb-4">
          <SymbolMark symbol={game.symbol} className="size-14 drop-shadow-lg" />
        </div>
      )}
      <span className="lucky-name">{game.title}</span>
    </div>
  );
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Result pop-up: same native <dialog> pattern as the promotions' detail (showModal: inert page,
// Esc, backdrop click, focus trap, short exit animation unless reduced motion).
function LuckyPickModal({
  game,
  onClose,
  playHref,
  onPlay,
  onTryAgain,
}: {
  game: Game | null;
  onClose: () => void;
  playHref: string; // the game page, like the game cards
  onPlay: () => void;
  onTryAgain: () => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const pressedBackdrop = useRef(false);
  const exit = useRef<JSAnimation | null>(null);
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });
  const [failed, setFailed] = useState<string | null>(null);
  const open = game !== null;

  function requestClose() {
    const dialog = ref.current;
    if (exit.current) return;
    const card = dialog?.querySelector<HTMLElement>(".promo-dialog-card");
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

  const image = game?.image && failed !== game.id ? game.image : null;

  return (
    <dialog
      ref={ref}
      className="promo-dialog lucky-dialog"
      aria-labelledby="lucky-dialog-title"
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
      {game ? (
        <div className="promo-dialog-card relative px-5 pt-8 pb-5 text-center">
          <button
            type="button"
            aria-label={t.luckyPick.close}
            onClick={requestClose}
            className="absolute top-2 right-2 grid size-9 place-items-center rounded-full text-lg text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-brand"
          >
            <span aria-hidden="true">×</span>
          </button>
          <div className="lucky-result-cover" style={{ background: `linear-gradient(180deg, ${game.from}, ${game.to})` }}>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element -- covers may come from any API host
              <img src={image} alt="" width={240} height={240} onError={() => setFailed(game.id)} className="absolute inset-0 size-full object-cover" />
            ) : (
              <div className="absolute inset-0 grid place-items-center">
                <SymbolMark symbol={game.symbol} />
              </div>
            )}
          </div>
          <h2 id="lucky-dialog-title" className="mt-5 text-2xl font-bold">
            {game.title}
          </h2>
          {game.provider ? <p className="mt-1 text-sm text-muted">{fill(t.luckyPick.by, { provider: game.provider })}</p> : null}
          <div className="mt-6 grid gap-3">
            <LobbyLink
              href={playHref}
              autoFocusTarget
              onGo={onPlay}
              className="grid h-12 place-items-center rounded-xl bg-brand text-base font-extrabold text-lobby hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {t.luckyPick.play}
            </LobbyLink>
            <button
              type="button"
              onClick={onTryAgain}
              className="h-12 rounded-xl border border-white/15 bg-white/10 text-base font-semibold text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {t.luckyPick.tryAgain}
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
