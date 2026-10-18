"use client";

import Link from "next/link";
import type { JSAnimation } from "animejs";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BrandPanel } from "@/components/auth/BrandPanel";
import { CloseIcon } from "@/components/auth/icons";
import { AuthFormPanel, type AuthView } from "@/components/auth/AuthFormPanel";
import { useI18n } from "@/components/I18nProvider";
import { animate, reduceMotion } from "@/lib/motion";

const closeClass =
  "absolute top-6 right-5 z-10 grid size-10 place-items-center rounded-xl bg-white/10 text-ink hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:top-7 sm:right-6";

/**
 * Experiment flag: `false` renders a single centred form card. Set it to `true`
 * to restore the left brand/artwork panel (BrandPanel.tsx / HeroArtwork.tsx are
 * kept in place). AuthModal and LoginScreen read it for the card width too.
 */
export const SHOW_BRAND_PANEL = false;

type Switching = { anims: JSAnimation[]; fromHeight: number; phase: "out" | "swap" | "in" };

/**
 * The auth card, shared by the pop-up (AuthModal) and the /login page. Pass
 * `onClose` for a button, or `closeHref` for a link. `active` starts the
 * entrance animation (the modal mounts it hidden, so it must wait).
 * It also owns the Login/Register view state and the transition between them.
 */
export function AuthLayout({
  titleId,
  heading,
  active,
  onClose,
  closeHref,
  onSuccess,
  initialView = "login",
}: {
  titleId: string;
  heading: "h1" | "h2";
  active: boolean;
  onClose?: () => void;
  closeHref?: string;
  onSuccess?: () => void;
  initialView?: AuthView;
}) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const switching = useRef<Switching | null>(null);
  const [view, setView] = useState<AuthView>(initialView);

  // Entrance: only the card container fades + scales. Nothing inside it does.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!active || !root || reduceMotion()) return;

    const entrance = animate(root, {
      opacity: [0, 1],
      scale: [0.96, 1],
      duration: 260,
      ease: "outCubic",
      onComplete: () => {
        root.style.removeProperty("transform");
        root.style.removeProperty("opacity");
      },
    });
    return () => {
      entrance.revert();
    };
  }, [active]);

  // View switch: the whole view content fades/slides out (120 ms), the view
  // swaps, then it fades/slides in (200 ms) while the card height eases to the
  // new height. Fields never animate individually. Reduced motion: instant.
  // A request that arrives mid-transition cancels it and jumps to the target,
  // so the form can never stay half-faded or unclickable.
  function resetSwitch() {
    const state = switching.current;
    if (!state) return;
    state.anims.forEach((item) => item.cancel());
    switching.current = null;
    contentRef.current?.style.removeProperty("opacity");
    contentRef.current?.style.removeProperty("transform");
    rootRef.current?.style.removeProperty("height");
  }

  function changeView(next: AuthView) {
    if (switching.current) {
      resetSwitch();
      setView(next);
      return;
    }
    if (next === view) return;
    const content = contentRef.current;
    const card = rootRef.current;
    if (!content || !card || reduceMotion()) {
      setView(next);
      return;
    }
    const state: Switching = { anims: [], fromHeight: card.offsetHeight, phase: "out" };
    switching.current = state;
    state.anims.push(
      animate(content, {
        opacity: [1, 0],
        x: [0, -12],
        duration: 120,
        ease: "inQuad",
        onComplete: () => {
          state.phase = "swap";
          setView(next);
        },
      }),
    );
  }

  useLayoutEffect(() => {
    const state = switching.current;
    const content = contentRef.current;
    const card = rootRef.current;
    if (!state || state.phase !== "swap" || !content || !card) return;
    state.phase = "in";

    card.style.height = "auto";
    const toHeight = card.offsetHeight;
    card.style.height = `${state.fromHeight}px`;
    const finish = () => {
      if (switching.current !== state) return;
      switching.current = null;
      content.style.removeProperty("opacity");
      content.style.removeProperty("transform");
      card.style.removeProperty("height");
    };
    // Clean up only after every animation of this switch has finished.
    let remaining = toHeight !== state.fromHeight ? 2 : 1;
    const done = () => {
      remaining -= 1;
      if (remaining <= 0) finish();
    };
    state.anims.push(
      animate(content, { opacity: [0, 1], x: [12, 0], duration: 200, ease: "outCubic", onComplete: done }),
    );
    if (toHeight !== state.fromHeight) {
      state.anims.push(
        animate(card, {
          height: [state.fromHeight, toHeight],
          duration: 200,
          ease: "outCubic",
          onComplete: done,
        }),
      );
    }
  }, [view]);

  // After a view switch the clicked button is gone: move focus into the new view.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    rootRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, [view]);

  return (
    <div
      ref={rootRef}
      className={`auth-card relative grid ${SHOW_BRAND_PANEL ? "md:min-h-[36rem] md:grid-cols-2" : ""}`}
    >
      {onClose ? (
        <button type="button" onClick={onClose} aria-label={t.auth.close} className={closeClass}>
          <CloseIcon className="size-5" />
        </button>
      ) : closeHref ? (
        <Link href={closeHref} aria-label={t.auth.close} className={closeClass}>
          <CloseIcon className="size-5" />
        </Link>
      ) : null}
      {SHOW_BRAND_PANEL ? <BrandPanel /> : null}
      <AuthFormPanel
        titleId={titleId}
        heading={heading}
        view={view}
        onViewChange={changeView}
        onSuccess={onSuccess}
        contentRef={contentRef}
        compactLogoOnly={SHOW_BRAND_PANEL}
      />
    </div>
  );
}
