"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { TextField } from "@/components/auth/AuthFields";
import { CloseIcon } from "@/components/auth/icons";
import { USERNAME_PATTERN } from "@/components/auth/RegisterForm";
import { useI18n } from "@/components/I18nProvider";

// Second pop-up after a first Google/Telegram sign-in: the player picks a username for the new
// account. It opens on top of the login <dialog> (nested in its React tree), so key and close
// events are stopped here or the login pop-up would handle them too (Esc would close both).
export function UsernameDialog({
  open,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean;
  pending: boolean;
  /** Backend message, e.g. the username is already taken. */
  error: string | null;
  onSubmit: (username: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const [username, setUsername] = useState("");
  const [invalid, setInvalid] = useState(false);

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (pending) return;
    const value = username.trim();
    const bad = !USERNAME_PATTERN.test(value);
    setInvalid(bad);
    if (!bad) onSubmit(value);
  }

  return (
    <dialog
      ref={ref}
      className="auth-dialog"
      aria-labelledby="username-dialog-title"
      onKeyDown={(event) => event.stopPropagation()}
      onCancel={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onClose();
      }}
      onClose={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open ? (
        <div className="auth-card relative px-7 pt-8 pb-7 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            aria-label={t.auth.close}
            className="absolute top-5 right-5 grid size-9 place-items-center rounded-xl bg-white/10 text-ink hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <CloseIcon className="size-4" />
          </button>
          <h2 id="username-dialog-title" className="pr-10 text-xl font-bold tracking-tight">
            {t.auth.setUsernameTitle}
          </h2>
          <p className="mt-2 text-sm text-muted">{t.auth.setUsernameSubtitle.replace("{site}", t.siteName)}</p>

          <RocketArt className="mx-auto my-6 h-32 w-auto" />

          <form onSubmit={submit} noValidate aria-busy={pending} className="space-y-5">
            <TextField
              id="username-dialog-input"
              name="username"
              autoComplete="username"
              maxLength={20}
              label={t.auth.username}
              value={username}
              onChange={(value) => {
                setUsername(value);
                setInvalid(false);
              }}
              error={invalid ? t.auth.errorUsername : error}
              busy={pending}
              autofocus
            />
            <button
              type="submit"
              aria-disabled={pending}
              className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-brand text-[0.9375rem] font-bold text-lobby hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white aria-disabled:cursor-wait aria-disabled:opacity-80"
            >
              {pending ? <span className="auth-spinner" aria-hidden="true" /> : null}
              {t.auth.save}
            </button>
          </form>
        </div>
      ) : null}
    </dialog>
  );
}

// Decorative: a rocket lifting off a planet edge, with two clouds.
function RocketArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 130" className={className} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="ud-planet" cx="50%" cy="0%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M20 130 Q110 70 200 130 Z" fill="url(#ud-planet)" />
      <g fill="#c9ced3">
        <path d="M48 52a9 9 0 0 1 17-3 7 7 0 0 1 9 7H44a6 6 0 0 1 4-4Z" />
        <path d="M148 98a8 8 0 0 1 15-3 6 6 0 0 1 8 6h-27a5 5 0 0 1 4-3Z" />
      </g>
      <g transform="rotate(40 112 62)">
        <path d="M112 8c14 12 20 32 18 58h-36c-2-26 4-46 18-58Z" fill="#b8bec4" />
        <path d="M112 8c14 12 20 32 18 58h-18Z" fill="#9aa1a8" />
        <circle cx="112" cy="38" r="8" fill="#4b545c" />
        <path d="M94 50 80 72l16-4Zm36 0 14 22-16-4Z" fill="#8a9198" />
        <path d="M100 68h24l-5 30-7-10-7 10Z" fill="#d7dbde" opacity="0.8" />
      </g>
    </svg>
  );
}
