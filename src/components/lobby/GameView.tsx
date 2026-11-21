"use client";

import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import type { JSAnimation } from "animejs";
import {
  createContext,
  use,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { BrandLoader } from "@/components/BrandLoader";
import { useI18n } from "@/components/I18nProvider";
import { gameHref, SymbolMark } from "@/components/lobby/GameCover";
import { hasInAppHistory, LobbyLink } from "@/components/lobby/LobbyLink";
import { WalletPill } from "@/components/lobby/WalletPill";
import { findCasinoCategory } from "@/config/categories";
import { siteConfig } from "@/config/site";
import type { Game } from "@/config/lobby";
import { fill, htmlLang } from "@/i18n";
import type { GameLaunch } from "@/lib/gameLaunch";
import type { GameDetails } from "@/lib/games";
import { revealGameOpener } from "@/lib/lobbyTransition";
import { animate, reduceMotion } from "@/lib/motion";
import { useFavourites } from "@/lib/useFavourites";
import { loadBalance, type WalletBalance } from "@/lib/walletBalance";

// Game page body (/casino/{category}/game/{id}, LobbyScreen focus "game").
// Layout (styles: .gp-* in globals.css):
//   - stage: a soft cyan glow behind the 16:9 game frame (gradient border) and
//     a floating glass dock overlapping its bottom edge (title | favourite, theatre, fullscreen,
//     close);
//   - side panel (>= 1280px: sticky right column; below: under the stage): info card with stat
//     tiles (RTP, house edge, category) and "Recommended" (a vertical list on the side, a
//     horizontal snap carousel below 1280px).
// Theatre mode hides the side panel and gives the stage the full width.
// Phones (portrait < 768px wide, or landscape <= 500px tall) get the KickWin layout instead:
// the page covers the whole screen and scrolls on its own, the dock becomes a compact top bar,
// the game fills the screen down to the info card (now a bar: title, chips, favourite), and
// Recommended follows below. Site header, nav, footer and cookie bar stay underneath (CSS only,
// see .gp-* in globals.css).
// Stops the game. An about:blank page has a light canvas, which would flash white inside the
// dark page, so the frame is hidden first.
function blankFrame(frame: HTMLIFrameElement | null) {
  if (!frame) return;
  frame.style.visibility = "hidden";
  frame.setAttribute("src", "about:blank");
}

export type GamePageData = (GameDetails & { launch: GameLaunch }) | null;

// Sandbox for provider iframes: scripts + their own origin (cookies/storage), presentation
// (casting), pop-ups (cashier, rules, "Watch on YouTube") that open unsandboxed, and forms.
// No top navigation, so a game cannot replace the lobby.
const LOADER_MIN_MS = 500;
const LOADER_FADE_MS = 300;
const LOADER_TIMEOUT_MS = 15000;

const SANDBOX = "allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox allow-forms";
// Permissions for the frame (what video/game embeds such as YouTube ask for).
const ALLOW = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";

function subscribeFullscreen(listener: () => void) {
  document.addEventListener("fullscreenchange", listener);
  return () => document.removeEventListener("fullscreenchange", listener);
}

// What the lobby hands the game page: the header wallet and its sign-in dialog. A context, not
// props: the page renders <GameView> itself (a server slot inside <Suspense>, so `params`, URL
// data, stays out of the App Shell) and LobbyScreen only places that slot.
export const GameHost = createContext<{ wallet: WalletBalance | null; onSignIn: () => void }>({ wallet: null, onSignIn: () => {} });

export function GameView({ data }: { data: NonNullable<GamePageData> }) {
  const { wallet, onSignIn } = use(GameHost);
  return <GameBody key={data.game.id} data={data} wallet={wallet} onSignIn={onSignIn} />;
}

function Cover({ game, size }: { game: Game; size: number }) {
  const [failed, setFailed] = useState(false);
  return game.image && !failed ? (
    // eslint-disable-next-line @next/next/no-img-element -- covers may come from any API host
    <img src={game.image} alt="" width={size} height={Math.round((size * 4) / 3)} loading="lazy" decoding="async" onError={() => setFailed(true)} className="absolute inset-0 size-full object-contain" />
  ) : (
    <span className="absolute inset-0 grid place-items-center">
      <SymbolMark symbol={game.symbol} className="size-3/5 drop-shadow-lg" />
    </span>
  );
}

function DockButton({
  label,
  pressed,
  onClick,
  children,
  className = "",
  buttonRef,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <button ref={buttonRef} type="button" aria-pressed={pressed} aria-label={label} title={label} onClick={onClick} className={`gp-btn ${className}`.trim()}>
      {children}
    </button>
  );
}

const ICON = "gp-icon";

function GameBody({ data, wallet, onSignIn }: { data: NonNullable<GamePageData>; wallet: WalletBalance | null; onSignIn: () => void }) {
  const { t, locale, href: localized } = useI18n();
  const router = useRouter();
  const { game, recommended } = data;
  // { ask: true } until the player picks how much to bring in (AmountPanel), then { url }.
  const [launch, setLaunch] = useState(data.launch);
  const category = findCasinoCategory(game.category ?? "");
  const frameRef = useRef<HTMLDivElement>(null);
  const { isFavourite, toggle, signedIn } = useFavourites();
  const favourite = Boolean(game.publicCode && game.gameCode && isFavourite(game.publicCode, game.gameCode));
  const [theatre, setTheatre] = useState(false);
  const canFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    () => Boolean(document.fullscreenEnabled && HTMLElement.prototype.requestFullscreen),
    () => false,
  );
  const isFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    () => document.fullscreenElement !== null && document.fullscreenElement === frameRef.current,
    () => false,
  );

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void frameRef.current?.requestFullscreen?.().catch(() => {});
  }

  // Close asks first ("Leave game?"). The dock is outside the fullscreen element, so a
  // fullscreen game is left first and the dialog shows on the page.
  const closeButton = useRef<HTMLButtonElement>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  function askClose() {
    if (document.fullscreenElement) void document.exitFullscreen();
    setConfirmLeave(true);
  }

  // The iframe is blanked whenever this page is hidden (kept alive by the router after a
  // navigation away, browser Back included), so a game or video does not keep running out of
  // sight, and loaded again when the page is shown again.
  // The iframe gets its src here, after hydration (the server renders it without one), so its
  // load event is always seen.
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const launchUrl = "url" in launch ? launch.url : null;
  const loadStarted = useRef(0);
  useLayoutEffect(() => {
    const frame = iframeRef.current;
    if (!frame || !launchUrl) return;
    if (frame.getAttribute("src") !== launchUrl) {
      loadStarted.current = performance.now();
      frame.style.visibility = "";
      frame.setAttribute("src", launchUrl);
    }
    return () => blankFrame(frame);
  }, [launchUrl]);

  // Brand loader over the frame (solid surface) from mount until the iframe's load event,
  // shown for at least LOADER_MIN_MS (no flash), then faded out (instant under reduced motion).
  // No load event within LOADER_TIMEOUT_MS: the error state. Note: the load event means the
  // embedded page loaded, not that the game inside is ready (providers may post a message
  // later; TODO(API) listen for it when the provider documents one).
  // A new game is a new GameBody (keyed by id), so the overlay starts again.
  // Warm the category page up: leaving to it (opened directly) should not wait for a load.
  useEffect(() => {
    if (game.category) router.prefetch(localized(`/casino/${game.category}`));
  }, [router, localized, game.category]);

  const [phase, setPhase] = useState<"loading" | "fading" | "done" | "failed">("loading");
  const loadedOnce = useRef(false);
  useEffect(() => {
    if (!launchUrl) return;
    const id = window.setTimeout(() => {
      if (!loadedOnce.current) setPhase("failed");
    }, LOADER_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [launchUrl]);
  function onFrameLoad(frame: HTMLIFrameElement) {
    if (loadedOnce.current || frame.getAttribute("src") !== launchUrl) return; // about:blank etc.
    loadedOnce.current = true;
    const wait = Math.max(0, LOADER_MIN_MS - (performance.now() - loadStarted.current));
    window.setTimeout(() => {
      setPhase("fading");
      window.setTimeout(() => setPhase("done"), reduceMotion() ? 0 : LOADER_FADE_MS);
    }, wait);
  }

  // Leave (confirmed): fullscreen off, the dialog gone and the scroll lock released in one
  // synchronous commit, the iframe blanked (no heavy embed in the snapshot), then the lobby
  // transition: back in history when the game was opened inside the lobby (the popstate hook
  // in lib/lobbyTransition.ts runs it), else to the game's category. The tile the game was
  // opened from is brought back into view and focused.
  async function leave() {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    flushSync(() => setConfirmLeave(false));
    blankFrame(iframeRef.current);
    if (hasInAppHistory()) {
      router.back();
      return;
    }
    router.push(localized(`/casino/${game.category ?? ""}`));
    revealGameOpener();
  }

  const percent = (value: number) =>
    fill(t.gamePage.percent, { value: value.toLocaleString(htmlLang(locale), { minimumFractionDigits: 2 }) });
  // Category is a link to that category's list, same as KickWin's Slots tag
  // (/casino/category/slots). LobbyLink adds the language prefix.
  const stats = [
    game.rtp !== undefined ? { label: t.gamePage.statRtp, value: percent(game.rtp) } : null,
    game.edge !== undefined ? { label: t.gamePage.statEdge, value: percent(game.edge) } : null,
    category
      ? { label: t.gamePage.statCategory, value: t.lobby[category.titleKey], href: `/casino/${category.slug}` }
      : null,
  ].filter((stat): stat is { label: string; value: string; href?: string } => stat !== null);

  // In the dock (tablet/desktop) and in the info bar under the game (phones, KickWin style).
  const favouriteButton = (className: string) => (
    <DockButton
      label={favourite ? t.gamePage.removeFavourite : t.gamePage.addFavourite}
      pressed={favourite}
      onClick={() => {
        if (!signedIn) {
          onSignIn();
          return;
        }
        if (game.publicCode && game.gameCode) void toggle(game.publicCode, game.gameCode);
      }}
      className={className}
    >
      {/* same heart as the game tiles (GameCover FavouriteToggle) */}
      <svg viewBox="0 0 24 24" className={`${ICON}${favourite ? " text-rose-400" : ""}`} fill={favourite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21s-6.5-4.2-9.3-8.1C.5 10.3.8 6.8 3.4 5.1 5.4 3.8 8 4.3 12 8c4-3.7 6.6-4.2 8.6-2.9 2.6 1.7 2.9 5.2.7 7.8C18.5 16.8 12 21 12 21z" />
      </svg>
    </DockButton>
  );

  return (
    <div className={`gp${theatre ? " is-theatre" : ""}`}>
      <section aria-label={game.title} className="gp-stage" data-playing={"url" in launch && phase !== "failed" ? "" : undefined}>
        <div className="gp-ambient" aria-hidden="true" />
        <div className="gp-shell">
          <div ref={frameRef} className="gp-frame">
            {"url" in launch && phase !== "failed" ? (
              <>
                <iframe
                  ref={iframeRef}
                  data-src={launch.url}
                  title={game.title}
                  allow={ALLOW}
                  sandbox={SANDBOX}
                  referrerPolicy="strict-origin-when-cross-origin"
                  loading="eager"
                  onLoad={(event) => onFrameLoad(event.currentTarget)}
                  className={`gp-iframe${phase === "loading" ? "" : " is-loaded"}`}
                />
                {phase === "done" ? null : (
                  <div className={`gp-loader${phase === "fading" ? " is-fading" : ""}`} aria-hidden={phase === "fading" || undefined}>
                    <BrandLoader delayed={false} />
                  </div>
                )}
              </>
            ) : "ask" in launch ? (
              <AmountPanel game={game} onLaunch={(url) => setLaunch({ url })} onSignIn={onSignIn} />
            ) : (
              <div className="gp-error">
                <p>{"error" in launch && launch.error === "signin" ? t.gamePage.signIn : t.gamePage.loadError}</p>
                {"error" in launch && launch.error === "signin" ? (
                  <button type="button" onClick={onSignIn} className="gp-cta">
                    {t.auth.signIn}
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="gp-dock">
          {/* Phones only (KickWin-style top bar): logo home link instead of the game title. */}
          <LobbyLink href="/" className="gp-dock-logo" ariaLabel={t.siteName}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={siteConfig.logo.src} width={siteConfig.logo.width} height={siteConfig.logo.height} alt="" draggable={false} />
          </LobbyLink>
          <div className="gp-dock-title">
            <span className="gp-live" aria-hidden="true" />
            <span className="sr-only">{t.gamePage.nowPlaying}: </span>
            <span className="min-w-0">
              <span className="gp-dock-name">{game.title}</span>
              <span className="gp-dock-provider">{game.provider}</span>
            </span>
          </div>
          <div className="gp-dock-buttons">
            {/* Phones only (the lobby header is hidden while a game fills the screen). */}
            <WalletPill wallet={wallet} className="gp-deposit" />
            {favouriteButton("gp-btn-fav")}
            <DockButton label={t.gamePage.theatre} pressed={theatre} onClick={() => setTheatre((on) => !on)} className="gp-btn-theatre">
              <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="6" width="18" height="12" rx="2.5" />
                {theatre ? <path d="M10 10 8 12 10 14 M14 10 16 12 14 14" /> : <path d="M8 10 6 12 8 14 M16 10 18 12 16 14" />}
              </svg>
            </DockButton>
            {canFullscreen ? (
              <DockButton label={t.gamePage.fullscreen} pressed={isFullscreen} onClick={toggleFullscreen} className="gp-btn-full">
                <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 9 V4 H9 M15 4 H20 V9 M20 15 V20 H15 M9 20 H4 V15" />
                </svg>
              </DockButton>
            ) : null}
            <span className="gp-dock-sep" aria-hidden="true" />
            <DockButton label={t.gamePage.close} onClick={askClose} className="gp-btn-close" buttonRef={closeButton}>
              <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6.5 6.5 17.5 17.5 M17.5 6.5 6.5 17.5" />
              </svg>
            </DockButton>
          </div>
        </div>
      </section>

      <aside className="gp-side" inert={theatre}>
        <section aria-labelledby="gp-title" className="gp-info">
          <div className="gp-info-head">
            <div className="gp-thumb" style={{ background: `linear-gradient(180deg, ${game.from}, ${game.to})` }}>
              <Cover game={game} size={160} />
            </div>
            <div className="min-w-0">
              <p className="gp-now">
                <span className="gp-live" aria-hidden="true" />
                {t.gamePage.nowPlaying}
              </p>
              <h2 id="gp-title" className="mt-1 text-xl leading-tight font-bold text-white">
                {game.title}
              </h2>
              <p className="gp-info-provider mt-0.5 truncate text-sm text-white/60">{game.provider}</p>
            </div>
          </div>
          {favouriteButton("gp-info-fav")}
          {stats.length > 0 ? (
            <dl className="gp-stats">
              {stats.map((stat) => (
                <div key={stat.label} className="gp-stat">
                  <dt>{stat.label}</dt>
                  <dd>
                    {stat.href ? (
                      <LobbyLink href={stat.href} className="gp-stat-link">
                        {stat.value}
                      </LobbyLink>
                    ) : (
                      stat.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
          <p className="gp-desc">{game.description ?? fill(t.gamePage.description, { name: game.title })}</p>
        </section>
        {recommended.length > 0 ? <Recommended games={recommended} /> : null}
      </aside>

      <LeaveDialog
        open={confirmLeave}
        onStay={() => {
          setConfirmLeave(false);
          // after the dialog has closed (the page is inert while it is open)
          requestAnimationFrame(() => closeButton.current?.focus());
        }}
        onLeave={() => void leave()}
      />
    </div>
  );
}

const AMOUNT = /^\d+(\.\d{1,2})?$/;

// Before a real game opens: how much of the wallet to bring into it (POST /opengame moves the
// money). Starts at the whole balance, like before. Sits inside the frame, so it is the same
// on desktop (16:9 frame) and phones (full-screen frame).
function AmountPanel({ game, onLaunch, onSignIn }: { game: Game; onLaunch: (url: string) => void; onSignIn: () => void }) {
  const { t, lang } = useI18n();
  const copy = t.gamePage;
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void loadBalance().then((next) => {
      if (cancelled || !next) return;
      setWallet(next);
      setAmount((typed) => typed || (Number(next.balance) > 0 ? next.balance : ""));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const balance = wallet ? Number(wallet.balance) : null;
  // Empty = null = bring nothing in (play with what is already in the game).
  const valid = amount === "" || (AMOUNT.test(amount) && (balance === null || Number(amount) <= balance));

  async function play(event: FormEvent) {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/lobby/launch", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ publicCode: game.publicCode, gameCode: game.gameCode, lang, amount: amount === "" ? null : amount }),
      });
      const payload = (await response.json().catch(() => ({ error: "failed" }))) as { url?: string; error?: string; message?: string };
      if (payload.error === "signin") {
        onSignIn();
      } else if (!payload.error && payload.url) {
        onLaunch(payload.url);
        return;
      } else {
        setError(payload.message || copy.loadError);
      }
    } catch {
      setError(copy.loadError);
    }
    setBusy(false);
  }

  return (
    <form className="gp-amount" onSubmit={(event) => void play(event)}>
      <label htmlFor="gp-amount-input" className="gp-amount-label">
        {copy.amountLabel}
      </label>
      <div className="gp-amount-field">
        {wallet?.currency ? <span className="gp-amount-currency">{wallet.currency}</span> : null}
        <input
          id="gp-amount-input"
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
          placeholder="0.00"
          aria-invalid={!valid || undefined}
          aria-describedby="gp-amount-hint"
          disabled={busy}
        />
        <button type="button" className="gp-amount-max" disabled={busy || !balance} onClick={() => setAmount(wallet?.balance ?? "")}>
          {copy.amountMax}
        </button>
      </div>
      <p id="gp-amount-hint" className="gp-amount-hint">
        {wallet ? fill(copy.amountBalance, { amount: `${wallet.currency} ${wallet.balance}`.trim() }) : copy.amountHint}
      </p>
      {error ? (
        <p role="alert" className="gp-amount-error">
          {error}
        </p>
      ) : null}
      <button type="submit" className="gp-cta gp-amount-play" disabled={!valid || busy}>
        {busy ? copy.loading : copy.play}
      </button>
    </form>
  );
}

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

// "Leave game?" — the same native <dialog> pattern as the promotions / Lucky Pick pop-ups
// (showModal: inert page + focus inside, Tab trap, Esc and backdrop click = Stay, short exit
// animation unless reduced motion, page scroll locked). Stay has the initial focus.
function LeaveDialog({ open, onStay, onLeave }: { open: boolean; onStay: () => void; onLeave: () => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const pressedBackdrop = useRef(false);
  const exit = useRef<JSAnimation | null>(null);
  const onStayRef = useRef(onStay);
  useLayoutEffect(() => {
    onStayRef.current = onStay;
  });

  function stay() {
    const dialog = ref.current;
    if (exit.current) return;
    const card = dialog?.querySelector<HTMLElement>(".promo-dialog-card");
    if (!dialog || !dialog.open || !card || reduceMotion()) {
      onStayRef.current();
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
        onStayRef.current();
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

  // Layout effect: released in the same commit as the dialog closes (before a transition
  // snapshot is taken on Leave).
  useLayoutEffect(() => {
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
      stay();
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
      className="promo-dialog gp-leave-dialog"
      aria-labelledby="gp-leave-title"
      onCancel={(event) => {
        event.preventDefault();
        stay();
      }}
      onClose={() => {
        if (open) onStayRef.current();
      }}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressedBackdrop.current && event.target === event.currentTarget) stay();
        pressedBackdrop.current = false;
      }}
    >
      {open ? (
        <div className="promo-dialog-card px-5 pt-6 pb-5 text-center">
          <h2 id="gp-leave-title" className="text-lg font-bold text-white">
            {t.gamePage.leaveTitle}
          </h2>
          <div className="gp-leave-actions">
            <button type="button" data-autofocus onClick={stay} className="gp-leave-stay">
              {t.gamePage.stay}
            </button>
            <button type="button" onClick={onLeave} className="gp-leave-go">
              {t.gamePage.leave}
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

function Recommended({ games }: { games: NonNullable<GamePageData>["recommended"] }) {
  const { t, locale } = useI18n();
  const list = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const update = () =>
      setEdges({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 });
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  function page(direction: 1 | -1) {
    const el = list.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <section aria-labelledby="gp-recommended" className="gp-rec">
      <div className="gp-rec-head">
        <h2 id="gp-recommended" className="text-base font-semibold text-white">
          {t.gamePage.recommended}
        </h2>
        <div className="gp-arrows">
          <button type="button" aria-label={t.gamePage.previous} disabled={edges.start} onClick={() => page(-1)} className="gp-arrow">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14.5 6 8.5 12 14.5 18" />
            </svg>
          </button>
          <button type="button" aria-label={t.gamePage.next} disabled={edges.end} onClick={() => page(1)} className="gp-arrow">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9.5 6 15.5 12 9.5 18" />
            </svg>
          </button>
        </div>
      </div>
      <ul ref={list} className="gp-row">
        {games.map((game) => (
          <li key={game.id}>
            <LobbyLink
              href={gameHref(game, "")}
              ariaLabel={`${game.title}, ${game.provider}, ${fill(t.lobby.playing, { count: game.playing.toLocaleString(htmlLang(locale)) })}`}
              className="gp-rec-item"
            >
              <span className="gp-rec-cover" style={{ background: `linear-gradient(180deg, ${game.from}, ${game.to})` }}>
                <Cover game={game} size={120} />
              </span>
              <span className="gp-rec-text">
                <span className="block truncate text-sm font-semibold text-white">{game.title}</span>
                <span className="block truncate text-xs text-white/55">{game.provider}</span>
              </span>
            </LobbyLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Until the game resolves: the stage with the shimmering frame and the side panel blocks
// (data-skeleton: the lobby transition waits for it to clear).
export function GameViewSkeleton() {
  return (
    <div className="gp" aria-hidden="true" data-skeleton="">
      <div className="gp-stage">
        <div className="gp-shell">
          <div className="gp-frame">
            <div className="gp-loader">
              <BrandLoader delayed={false} />
            </div>
          </div>
        </div>
        <div className="gp-dock gp-dock-skeleton" />
      </div>
      <div className="gp-side">
        <div className="gp-info">
          <div className="gp-info-head">
            <div className="gp-thumb bg-white/5" />
            <div className="grid flex-1 gap-2">
              <div className="h-5 w-32 rounded-md bg-white/5" />
              <div className="h-4 w-20 rounded-md bg-white/5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
