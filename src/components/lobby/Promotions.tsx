"use client";

import type { JSAnimation } from "animejs";
import { use, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useI18n } from "@/components/I18nProvider";
import type { PromotionIcon } from "@/config/promotions";
import { fill, htmlLang } from "@/i18n";
import type { Promotion, PromotionsResult } from "@/lib/promotions";
import { animate, reduceMotion } from "@/lib/motion";
import { AUTH_TOKEN_EVENT, isSignedIn } from "@/lib/token";

// Promotions page (/{lang}/promotions): header bar, a grid of promo cards and a detail pop-up.
// "Learn More" opens the pop-up and puts ?promo=<id> in the URL (replaceState), so a link
// with that parameter opens the same promo directly. Styles: .promo-* in globals.css.

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const PROMO_PARAM = "promo";
const PROMO_EVENT = "promo-param-change";

// --- ?promo=<id> as a tiny external store -------------------------------------
function subscribePromo(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener(PROMO_EVENT, listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener(PROMO_EVENT, listener);
  };
}
function readPromo() {
  return new URLSearchParams(window.location.search).get(PROMO_PARAM);
}
function setPromo(id: string | null) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set(PROMO_PARAM, id);
  else url.searchParams.delete(PROMO_PARAM);
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(PROMO_EVENT));
}

function subscribeAuth(listener: () => void) {
  window.addEventListener(AUTH_TOKEN_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(AUTH_TOKEN_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

// --- Header bar ---------------------------------------------------------------
export function PromotionsHeader() {
  const { t } = useI18n();
  return (
    <div className="promo-header">
      <h2 id="promotions-title" className="text-xl font-bold">
        {t.promotions.title}
      </h2>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="promo-header-art" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <GiftPaths />
      </svg>
    </div>
  );
}

// --- Grid ---------------------------------------------------------------------
export function PromotionsGrid({ promise, onJoin }: { promise: Promise<PromotionsResult>; onJoin: () => void }) {
  const { t } = useI18n();
  const result = use(promise);
  const selectedId = useSyncExternalStore(subscribePromo, readPromo, () => null);
  if (result.error) return <PromoNotice>{t.lobby.loadError}</PromoNotice>;
  if (result.promotions.length === 0) return <PromoNotice>{t.promotions.empty}</PromoNotice>;
  const selected = result.promotions.find((promo) => promo.id === selectedId) ?? null;

  return (
    <>
      <ul className="promo-grid" aria-labelledby="promotions-title">
        {result.promotions.map((promo) => (
          <li key={promo.id} className="promo-card">
            <PromoBanner promo={promo} />
            <div className="promo-strip">
              <h3 className="line-clamp-2 min-w-0 text-sm leading-[1.125rem] font-semibold">{promo.title}</h3>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-label={`${t.promotions.learnMore}: ${promo.title}`}
                onClick={() => setPromo(promo.id)}
                className="promo-more"
              >
                {t.promotions.learnMore}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <PromoModal
        promo={selected}
        onClose={() => setPromo(null)}
        onJoin={() => {
          setPromo(null);
          // open the sign-up after this pop-up has closed, so focus lands in the new one
          window.requestAnimationFrame(onJoin);
        }}
      />
    </>
  );
}

export function PromotionsSkeleton() {
  return (
    <ul className="promo-grid" aria-hidden="true" data-skeleton="">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="promo-card promo-card--skeleton">
          <div className="promo-banner motion-safe:animate-pulse" />
          <div className="promo-strip">
            <div className="h-4 w-2/5 rounded bg-white/10" />
            <div className="h-7 w-24 rounded-md bg-white/10" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function PromoNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-muted">{children}</p>
  );
}

// --- Banner -------------------------------------------------------------------
// The image when the promo has one, otherwise a themed placeholder: two headline lines
// (the first in cyan), the tagline and simple line art for the promo type.
function PromoBanner({ promo, large = false }: { promo: Promotion; large?: boolean }) {
  // An image that fails (or already failed before hydration) falls back to the placeholder.
  const [failed, setFailed] = useState(false);
  if (promo.image && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- banner URLs come from the API, any host
      <img
        ref={(img) => {
          if (img && img.complete && img.naturalWidth === 0) setFailed(true);
        }}
        src={promo.image}
        alt={promo.title}
        width={800}
        height={400}
        loading={large ? "eager" : "lazy"}
        decoding="async"
        onError={() => setFailed(true)}
        className="promo-banner promo-banner--image"
      />
    );
  }
  return (
    <div className="promo-banner promo-banner--art" aria-hidden="true">
      <div className="promo-banner-text">
        <p className="promo-headline">
          <span className="text-brand">{promo.headline[0]}</span>
          {promo.headline[1] ? <span>{promo.headline[1]}</span> : null}
        </p>
        <p className="promo-tagline">{promo.tagline}</p>
      </div>
      <svg viewBox="0 0 64 64" className="promo-art" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <PromoArt icon={promo.icon} />
      </svg>
    </div>
  );
}

// Duotone line art: a soft cyan fill under a cyan/white outline.
function PromoArt({ icon }: { icon: PromotionIcon }) {
  const soft = { fill: "#02eff0", fillOpacity: 0.16, stroke: "#02eff0", strokeWidth: 2.5 };
  const line = { stroke: "#ffffff", strokeWidth: 2.5 };
  switch (icon) {
    case "coins":
      return (
        <>
          <ellipse cx="26" cy="44" rx="16" ry="6" {...soft} />
          <path d="M10 36v8M42 36v8" {...soft} />
          <ellipse cx="26" cy="36" rx="16" ry="6" {...soft} />
          <circle cx="44" cy="22" r="13" {...soft} />
          <path d="M40 17h7a3 3 0 0 1 0 6h-7m0 0h8a3 3 0 0 1 0 6h-8M40 17v12M43 14v3M43 29v3" {...line} />
        </>
      );
    case "crown":
      return (
        <>
          <path d="M10 44 6 18l14 12 12-18 12 18 14-12-4 26Z" {...soft} />
          <path d="M10 52h44" {...line} />
          <circle cx="32" cy="34" r="4" {...line} />
        </>
      );
    case "multiplier":
      return (
        <>
          <rect x="8" y="10" width="48" height="44" rx="8" {...soft} />
          <path d="M20 22l14 20M34 22 20 42" {...line} />
          <path d="M40 30h10M45 25v10" {...soft} />
        </>
      );
    case "shield":
      return (
        <>
          <path d="M32 6 52 14v16c0 13-9 22-20 28C21 52 12 43 12 30V14Z" {...soft} />
          <path d="M23 31l7 7 12-14" {...line} />
        </>
      );
    case "referral":
      return (
        <>
          <circle cx="22" cy="22" r="8" {...soft} />
          <path d="M8 48c0-8 6-14 14-14s14 6 14 14" {...soft} />
          <circle cx="44" cy="26" r="6" {...line} />
          <path d="M36 48c1-6 4-10 8-10s8 4 9 10M50 8v10M45 13h10" {...line} />
        </>
      );
    case "rebate":
      return (
        <>
          <circle cx="32" cy="32" r="24" {...soft} />
          <path d="M22 42 42 22" {...line} />
          <circle cx="23" cy="24" r="4" {...line} />
          <circle cx="41" cy="40" r="4" {...line} />
        </>
      );
    case "calendar":
      return (
        <>
          <rect x="8" y="12" width="48" height="42" rx="7" {...soft} />
          <path d="M8 24h48M20 6v12M44 6v12" {...soft} />
          <path d="M18 34h6M30 34h6M42 34h4M18 44h6M30 44h6" {...line} />
        </>
      );
    case "wallet":
      return (
        <>
          <rect x="6" y="16" width="48" height="36" rx="7" {...soft} />
          <path d="M6 24c0-4 3-8 8-8h30" {...soft} />
          <path d="M54 30H44a5 5 0 0 0 0 10h10" {...line} />
          <circle cx="45" cy="35" r="1.5" {...line} />
        </>
      );
    case "gem":
      return (
        <>
          <path d="M14 10h36l10 14-28 32L4 24Z" {...soft} />
          <path d="M4 24h56M24 10l-4 14 12 32 12-32-4-14" {...line} />
        </>
      );
  }
}

function GiftPaths() {
  return (
    <>
      <rect x="3.5" y="9" width="17" height="11.5" rx="1.5" />
      <rect x="2.5" y="6" width="19" height="3.5" rx="1" />
      <path d="M12 6v14.5" />
      <path d="M12 6c-1.6-3-6-3-6-.6C6 6.7 8.6 6 12 6Zm0 0c1.6-3 6-3 6-.6C18 6.7 15.4 6 12 6Z" />
    </>
  );
}

export function GiftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <GiftPaths />
    </svg>
  );
}

// --- Detail pop-up ------------------------------------------------------------
// Native <dialog> (showModal: inert page, Esc, focus returns to the opener) with the same
// close pattern as SearchModal/AuthModal: X, Close, Esc and the backdrop run a short exit
// animation (none with reduced motion), then onClose. Focus is trapped inside.
function PromoModal({
  promo,
  onClose,
  onJoin,
}: {
  promo: Promotion | null;
  onClose: () => void;
  onJoin: () => void;
}) {
  const { t, locale } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const pressedBackdrop = useRef(false);
  const exit = useRef<JSAnimation | null>(null);
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });
  const loggedIn = useSyncExternalStore(subscribeAuth, () => isSignedIn(), () => false);
  const open = promo !== null;

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

  const date = (iso: string) =>
    iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString(htmlLang(locale), { dateStyle: "medium", timeZone: "UTC" }) : "";

  return (
    <dialog
      ref={ref}
      className="promo-dialog"
      aria-labelledby="promo-dialog-title"
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
      {promo ? (
        <div className="promo-dialog-card">
          <div className="relative">
            <PromoBanner promo={promo} large />
            <button
              type="button"
              aria-label={t.promotions.close}
              onClick={requestClose}
              className="absolute top-2 right-2 grid size-9 place-items-center rounded-full bg-lobby/80 text-lg text-white hover:bg-lobby focus-visible:outline-2 focus-visible:outline-brand"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <div className="space-y-3 p-5">
            <h2 id="promo-dialog-title" className="text-lg font-bold">
              {promo.title}
            </h2>
            {promo.startDate && promo.endDate ? (
              <p className="promo-period text-xs font-semibold text-brand">
                {fill(t.promotions.period, { start: date(promo.startDate), end: date(promo.endDate) })}
              </p>
            ) : null}
            {promo.summary ? <p className="text-sm text-white/85">{promo.summary}</p> : null}
            {promo.terms.length > 0 ? (
              <div>
                <h3 className="mb-1.5 text-xs font-bold tracking-wide text-muted uppercase">{t.promotions.terms}</h3>
                <ul className="space-y-1 text-sm">
                  {promo.terms.map((term) => (
                    <li key={term} className="flex gap-2">
                      <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                      {term}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={requestClose}
                className="h-10 rounded-lg border border-white/15 px-4 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {t.promotions.close}
              </button>
              {loggedIn ? null : (
                <button
                  type="button"
                  data-autofocus
                  onClick={onJoin}
                  className="h-10 rounded-lg bg-brand px-4 text-sm font-extrabold text-lobby focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {t.promotions.joinNow}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
