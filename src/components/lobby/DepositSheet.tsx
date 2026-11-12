"use client";

import type { JSAnimation } from "animejs";
import { useLayoutEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { DepositForm } from "@/components/lobby/DepositForm";
import { animate, reduceMotion } from "@/lib/motion";

// Wallet sheet (KickWin's wallet modal): Deposit | Withdraw (coming soon) tabs, payment
// method groups, bank tiles, the receiving account with Copy, amount + quick amounts,
// optional bonus, receipt upload, deposit guidelines, then "under review" with Cancel.
// The form body lives in DepositForm.tsx (also used by /[lang]/deposit).
// Phones (< 640px): a bottom sheet sliding up; larger: a centred modal. Opened through
// DepositContext (LobbyScreen). Same native <dialog> pattern as the Leave game dialog
// (GameView): showModal, Tab trap, Esc / backdrop close, exit animation unless reduced
// motion, page scroll locked. Styles: .dep-* in globals.css.
// Data: the BFF routes /api/topup/{banklist,check,submit,cancel} (lib/topup.ts).

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const PHONE = "(max-width: 639.98px)";

export function DepositSheet({ open, onClose, onSignIn }: { open: boolean; onClose: () => void; onSignIn: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressedBackdrop = useRef(false);
  const exit = useRef<JSAnimation | null>(null);
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  function requestClose() {
    const dialog = ref.current;
    if (exit.current) return;
    const card = dialog?.querySelector<HTMLElement>(".promo-dialog-card");
    if (!dialog || !dialog.open || !card || reduceMotion()) {
      onCloseRef.current();
      return;
    }
    dialog.classList.add("is-closing");
    const phone = window.matchMedia(PHONE).matches;
    const animation = animate(card, {
      ...(phone ? { y: card.offsetHeight } : { opacity: 0, scale: 0.97 }),
      duration: phone ? 220 : 160,
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
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    return () => {
      exit.current?.cancel();
      exit.current = null;
    };
  }, [open]);

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
      className="promo-dialog dep-dialog"
      aria-labelledby="dep-title"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClose={() => {
        if (open) onCloseRef.current();
      }}
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
        <div className="promo-dialog-card dep-card">
          <div className="dep-grip" aria-hidden="true" />
          <DepositForm onClose={requestClose} onSignIn={onSignIn} showClose />
        </div>
      ) : null}
    </dialog>
  );
}
