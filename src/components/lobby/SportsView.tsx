"use client";

import { useEffect, useRef, useState } from "react";
import { BrandLoader } from "@/components/BrandLoader";
import { useI18n } from "@/components/I18nProvider";
import { LobbyLink } from "@/components/lobby/LobbyLink";
import { defaultCasinoCategory } from "@/config/categories";
import type { SportsProductState } from "@/lib/sportsLaunch";

// Full-height sportsbook iframe for /{lang}/sports (KickWin-style: below the
// top bar, beside the desktop sidebar, above the phone tab bar). Product status
// is checked first (signed-out users see the same unavailable / maintenance /
// coming-soon cards). Launch goes through /api/sports/launch (backend /opengame)
// so the member token never reaches the browser. Signed out: demo link (demo: true) if
// the provider has one, otherwise the sign-in card. Signing in re-launches with the token.

const SANDBOX =
  "allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox allow-forms";
const ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";
const LOADER_TIMEOUT_MS = 15000;

type Phase = "status" | "session" | "signin" | "loading" | "ready" | "unavailable" | "maintenance" | "comingSoon" | "failed";

const BLOCKED: SportsProductState[] = ["unavailable", "maintenance", "comingSoon"];

const PRIMARY_BTN = "rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-lobby";
const SECONDARY_BTN = "rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10";

export function SportsView({
  signedIn,
  ready,
  onSignIn,
}: {
  signedIn: boolean;
  ready: boolean;
  onSignIn: () => void;
}) {
  const { t, lang } = useI18n();
  const [phase, setPhase] = useState<Phase>("status");
  const [url, setUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const loadedOnce = useRef(false);
  const casinoHref = `/casino/${defaultCasinoCategory.slug}`;

  useEffect(() => {
    const ac = new AbortController();
    loadedOnce.current = false;

    void (async () => {
      await Promise.resolve();
      if (ac.signal.aborted) return;
      setUrl(null);
      setMessage(null);
      setPhase("status");

      let state: SportsProductState = "unknown";
      try {
        const response = await fetch(`/api/sports/status?lang=${encodeURIComponent(lang)}`, {
          cache: "no-store",
          signal: ac.signal,
        });
        const payload = (await response.json().catch(() => null)) as { state?: string } | null;
        if (payload && typeof payload.state === "string" && BLOCKED.includes(payload.state as SportsProductState)) {
          state = payload.state as SportsProductState;
        }
      } catch {
        // Config/network failure: do not claim unavailable; fall through to the existing launch flow.
      }
      if (ac.signal.aborted) return;
      if (state === "unavailable" || state === "maintenance" || state === "comingSoon") {
        setPhase(state);
        return;
      }
      if (!ready) {
        setPhase("session");
        return;
      }

      setPhase("loading");
      const isMobile = window.matchMedia("(max-width: 767.98px)").matches;
      try {
        const response = await fetch("/api/sports/launch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lang, isMobile }),
          cache: "no-store",
          signal: ac.signal,
        });
        const payload = (await response.json().catch(() => null)) as
          | { url?: string; error?: string; message?: string }
          | null;
        if (ac.signal.aborted) return;
        if (payload && typeof payload.url === "string" && payload.url.trim()) {
          setUrl(payload.url.trim());
          return;
        }
        if (payload?.error === "signin") {
          setPhase("signin");
          return;
        }
        if (payload?.error === "unavailable" || payload?.error === "maintenance" || payload?.error === "comingSoon") {
          setPhase(payload.error);
          return;
        }
        const apiMessage = typeof payload?.message === "string" ? payload.message.trim() : "";
        setMessage(apiMessage || null);
        setPhase("failed");
      } catch {
        if (!ac.signal.aborted) setPhase("failed");
      }
    })();

    return () => ac.abort();
  }, [ready, signedIn, lang, retryTick]);

  useEffect(() => {
    if (!url) return;
    const id = window.setTimeout(() => {
      if (!loadedOnce.current) setPhase("failed");
    }, LOADER_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [url]);

  function onFrameLoad(frame: HTMLIFrameElement) {
    if (loadedOnce.current || frame.getAttribute("src") !== url) return;
    loadedOnce.current = true;
    setPhase("ready");
  }

  function retry() {
    setRetryTick((count) => count + 1);
  }

  const showLoader = phase === "status" || phase === "session" || phase === "loading";
  const cardPhase: "unavailable" | "maintenance" | "comingSoon" | "failed" | null =
    phase === "unavailable" || phase === "maintenance" || phase === "comingSoon" || phase === "failed" ? phase : null;

  const copy =
    cardPhase === "unavailable"
      ? { title: t.sportsPage.unavailableTitle, body: t.sportsPage.unavailableBody, wrench: false }
      : cardPhase === "comingSoon"
        ? { title: t.sportsPage.comingSoonTitle, body: t.sportsPage.comingSoonBody, wrench: false }
        : cardPhase === "maintenance" || cardPhase === "failed"
          ? {
              title: t.sportsPage.maintenanceTitle,
              body: cardPhase === "failed" ? message || t.sportsPage.loadError : t.sportsPage.maintenanceBody,
              wrench: true,
            }
          : null;

  return (
    <section aria-label={t.topNav.sports} className="relative h-full min-h-0 w-full overflow-hidden bg-lobby">
      {url && phase !== "failed" && phase !== "signin" && !cardPhase ? (
        <iframe
          src={url}
          title={t.sportsPage.frameTitle}
          allow={ALLOW}
          sandbox={SANDBOX}
          referrerPolicy="strict-origin-when-cross-origin"
          loading="eager"
          onLoad={(event) => onFrameLoad(event.currentTarget)}
          className="h-full w-full border-0 bg-lobby"
        />
      ) : null}

      {showLoader ? (
        <div className="absolute inset-0 grid place-items-center bg-lobby" role="status" aria-label={t.sportsPage.loading}>
          <BrandLoader delayed={false} />
        </div>
      ) : null}

      {phase === "signin" ? (
        <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm text-muted">{t.sportsPage.signIn}</p>
          <button type="button" onClick={onSignIn} className={PRIMARY_BTN}>
            {t.auth.signIn}
          </button>
        </div>
      ) : null}

      {copy ? (
        <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-hidden px-5">
          <div
            role="status"
            className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-8 text-center sm:px-8 sm:py-10"
          >
            <SportsStatusIcon wrench={copy.wrench} />
            <div className="grid gap-2">
              <h1 className="text-lg font-semibold text-white">{copy.title}</h1>
              <p className="text-sm text-muted">{copy.body}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {cardPhase === "comingSoon" ? (
                <LobbyLink href="/" className={PRIMARY_BTN}>
                  {t.sportsPage.backHome}
                </LobbyLink>
              ) : (
                <>
                  <LobbyLink href={casinoHref} className={PRIMARY_BTN}>
                    {t.sportsPage.browseCasino}
                  </LobbyLink>
                  {cardPhase === "maintenance" || cardPhase === "failed" ? (
                    <button type="button" onClick={retry} className={SECONDARY_BTN}>
                      {t.sportsPage.retry}
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SportsStatusIcon({ wrench }: { wrench?: boolean }) {
  return (
    <span className="relative grid h-16 w-16 place-items-center text-brand" aria-hidden>
      <svg
        viewBox="0 0 48 48"
        className="h-16 w-16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 22c2.5-8 9-14 16-14s13.5 6 16 14" />
        <path d="M10 18h28" />
        <path d="M6 28c3.5-5 10-8 18-8s14.5 3 18 8" />
        <ellipse cx="24" cy="33" rx="16" ry="8" />
        <path d="M24 25v16M10 33h28" />
        <circle cx="24" cy="33" r="2.4" />
      </svg>
      {wrench ? (
        <svg
          viewBox="0 0 24 24"
          className="absolute -bottom-0.5 -right-1 h-7 w-7 rounded-full bg-lobby p-0.5 text-brand"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.8 6.2a4.2 4.2 0 0 0-6 5.7L4 16.7 7.3 20l5.8-4.8a4.2 4.2 0 0 0 5.7-6l-2.6 2.6-2.2-2.2 2.6-2.6Z" />
        </svg>
      ) : null}
    </span>
  );
}
