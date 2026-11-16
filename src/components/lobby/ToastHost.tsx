"use client";

import { useEffect, useState } from "react";

// Small status toasts for short backend / form messages. There was no existing
// toast in the lobby, so this is the shared host (fixed above the mobile tab bar).

type Toast = { id: number; message: string };

let nextId = 1;
let toasts: Toast[] = [];
const listeners = new Set<() => void>();
const TOAST_MS = 4000;

function emit() {
  for (const listener of listeners) listener();
}

export function showToast(message: string) {
  const text = message.trim();
  if (!text) return;
  const item: Toast = { id: nextId++, message: text };
  toasts = [...toasts, item];
  emit();
  window.setTimeout(() => {
    toasts = toasts.filter((toast) => toast.id !== item.id);
    emit();
  }, TOAST_MS);
}

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>(toasts);

  useEffect(() => {
    const listener = () => setItems(toasts);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4"
      style={{ bottom: "calc(var(--mobile-tab-h, 0px) + 1rem)" }}
      aria-live="polite"
      aria-relevant="additions"
    >
      {items.map((item) => (
        <p
          key={item.id}
          role="status"
          className="pointer-events-auto w-[min(100%,24rem)] rounded-xl border border-white/10 bg-lobby px-4 py-3 text-center text-sm text-ink shadow-2xl"
        >
          {item.message}
        </p>
      ))}
    </div>
  );
}
