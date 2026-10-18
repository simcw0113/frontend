"use client";

import type { JSAnimation } from "animejs";
import { useEffect, useLayoutEffect, useRef } from "react";
import type { AuthView } from "@/components/auth/AuthFormPanel";
import { AuthLayout, SHOW_BRAND_PANEL } from "@/components/auth/AuthLayout";
import { animate, reduceMotion } from "@/lib/motion";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Login pop-up on a native <dialog>: showModal() makes the page inert, gives
 * Esc-to-close, aria-modal semantics and returns focus to the trigger on close.
 * On top of that: Tab wrapping, backdrop click, body scroll lock, and an exit
 * animation shared by every close path (X, Esc, backdrop, successful submit):
 * the card fades/scales out and the backdrop fades, then onClose runs, which is
 * when the dialog really closes, focus returns and scroll lock is released.
 * Content mounts only while open, so form state (including the password) is
 * discarded every time the pop-up closes.
 */
export function AuthModal({
  open,
  onClose,
  initialView = "login",
}: {
  open: boolean;
  onClose: () => void;
  /** View shown each time the pop-up opens (content mounts on open). */
  initialView?: AuthView;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressedBackdrop = useRef(false);
  const exit = useRef<JSAnimation | null>(null);
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  // Single entry point for every close path. Ignored while already closing.
  function requestClose() {
    const dialog = ref.current;
    if (exit.current) return;
    const card = dialog?.querySelector<HTMLElement>(".auth-card");
    if (!dialog || !dialog.open || !card || reduceMotion()) {
      onCloseRef.current();
      return;
    }
    dialog.classList.add("is-closing");
    const animation = animate(card, {
      opacity: 0,
      scale: 0.96,
      duration: 180,
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
    // Any open/close edge ends a running exit and clears its leftovers.
    exit.current?.cancel();
    exit.current = null;
    dialog.classList.remove("is-closing");
    if (open && !dialog.open) {
      dialog.showModal();
      if (window.matchMedia("(pointer: fine)").matches) {
        dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
      }
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

  function onKeyDown(event: React.KeyboardEvent<HTMLDialogElement>) {
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

  return (
    <dialog
      ref={ref}
      className={`auth-dialog${SHOW_BRAND_PANEL ? " auth-dialog--wide" : ""}`}
      aria-labelledby="auth-modal-title"
      onCancel={(event) => {
        // Esc: animate first, close for real when the exit finishes.
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
      {open ? (
        <AuthLayout
          titleId="auth-modal-title"
          heading="h2"
          active={open}
          initialView={initialView}
          onClose={requestClose}
          onSuccess={requestClose}
        />
      ) : null}
    </dialog>
  );
}
