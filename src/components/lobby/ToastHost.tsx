"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "@/components/I18nProvider";

// Kickwin-style status toasts: dark rounded card, status icon, message, close,
// and a bottom progress bar that shrinks until auto-dismiss (~3s). Hover pauses
// the timer and the bar. Non-blocking (not a modal). Hosted in the top layer
// (popover) so the toast sits above dialogs.

export type ToastVariant = "success" | "error";

type Toast = { id: number; message: string; variant: ToastVariant };

let nextId = 1;
let toasts: Toast[] = [];
const listeners = new Set<() => void>();
export const TOAST_MS = 3000;

function emit() {
  for (const listener of listeners) listener();
}

export function showToast(message: string, variant: ToastVariant = "error") {
  const text = message.trim();
  if (!text) return;
  // One toast at a time, like the Kickwin card in the reference.
  toasts = [{ id: nextId++, message: text, variant }];
  emit();
}

function dismissToast(id: number) {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>(toasts);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const listener = () => setItems(toasts);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  // Native <dialog> is in the top layer; a manual popover is too, so the toast
  // stays visible above sign-in / search / deposit. Unsupported browsers fall
  // back to position:fixed + a high z-index (the CSS on .lobby-toast-host).
  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el || typeof el.showPopover !== "function") return;
    try {
      const open = el.matches(":popover-open");
      if (items.length > 0 && !open) el.showPopover();
      if (items.length === 0 && open) el.hidePopover();
    } catch {
      // Some browsers throw if the element is not connected yet.
    }
  }, [items.length]);

  return (
    <div ref={hostRef} popover="manual" className="lobby-toast-host">
      <div className="pointer-events-none flex flex-col items-center gap-2" aria-live="polite" aria-relevant="additions">
        {items.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={dismissToast} />
        ))}
      </div>
    </div>
  );
}

function ToastCard({ item, onDismiss }: { item: Toast; onDismiss: (id: number) => void }) {
  const { t } = useI18n();
  const cardRef = useRef<HTMLDivElement>(null);
  const success = item.variant === "success";

  useEffect(() => {
    const card = cardRef.current;
    let remaining = TOAST_MS;
    let started = performance.now();
    let paused = false;
    let timeoutId = window.setTimeout(done, remaining);

    function done() {
      onDismiss(item.id);
    }

    function onEnter() {
      if (paused) return;
      paused = true;
      window.clearTimeout(timeoutId);
      remaining -= performance.now() - started;
    }

    function onLeave() {
      if (!paused) return;
      paused = false;
      started = performance.now();
      timeoutId = window.setTimeout(done, Math.max(0, remaining));
    }

    card?.addEventListener("pointerenter", onEnter);
    card?.addEventListener("pointerleave", onLeave);
    return () => {
      window.clearTimeout(timeoutId);
      card?.removeEventListener("pointerenter", onEnter);
      card?.removeEventListener("pointerleave", onLeave);
    };
  }, [item.id, onDismiss]);

  return (
    <div
      ref={cardRef}
      role={success ? "status" : "alert"}
      className="lobby-toast pointer-events-auto relative flex w-max max-w-full items-center gap-2.5 overflow-hidden rounded-lg bg-[#1c2528]/95 py-2.5 pr-2 pl-3 text-sm text-white shadow-[0_8px_28px_rgb(0_0_0_/_0.45)] ring-1 ring-white/10"
    >
      {success ? <SuccessIcon /> : <ErrorIcon />}
      <p className="min-w-0 flex-1 leading-snug">{item.message}</p>
      <button
        type="button"
        aria-label={t.auth.close}
        onClick={() => onDismiss(item.id)}
        className="grid size-7 shrink-0 place-items-center rounded-md text-white/55 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6 L18 18 M18 6 L6 18" />
        </svg>
      </button>
      <span
        className={`lobby-toast-progress pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left ${success ? "bg-emerald-400" : "bg-red-400"}`}
        aria-hidden="true"
      />
    </div>
  );
}

function SuccessIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#22c55e" />
      <path d="M7 12.4 10.3 15.6 17.2 8.6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#ef4444" />
      <path d="M12 7 v6.5 M12 16.8 v.2" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
