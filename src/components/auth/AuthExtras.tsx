"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useEffectEvent, useRef, useState } from "react";
import { UsernameDialog } from "@/components/auth/UsernameDialog";
import { useI18n } from "@/components/I18nProvider";
import { CashbackIcon, GiftIcon, GoogleIcon, InfinityIcon, TelegramIcon } from "@/components/auth/icons";
import { ApiError } from "@/lib/api";
import { loginWithSocial } from "@/lib/auth";

const linkClass =
  "rounded font-medium text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand";

export function RegisterPrompt({ onSwitch }: { onSwitch: () => void }) {
  const { t } = useI18n();

  return (
    <p className="text-sm">
      {t.auth.noAccount}{" "}
      <button type="button" onClick={onSwitch} className={linkClass}>
        {t.auth.registerNow}
      </button>
    </p>
  );
}

export function LoginPrompt({ onSwitch }: { onSwitch: () => void }) {
  const { t } = useI18n();

  return (
    <p className="text-center text-sm">
      {t.auth.haveAccount}{" "}
      <button type="button" onClick={onSwitch} className={linkClass}>
        {t.auth.loginNow}
      </button>
    </p>
  );
}

export function BenefitChips() {
  const { t } = useI18n();
  const items: { label: string; icon: ReactNode }[] = [
    { label: t.auth.benefit.vip, icon: <GiftIcon className="size-5" /> },
    { label: t.auth.benefit.rakeback, icon: <InfinityIcon className="size-5" /> },
    { label: t.auth.benefit.cashback, icon: <CashbackIcon className="size-5" /> },
  ];

  return (
    <ul className="grid grid-cols-3 gap-3">
      {items.map((item) => (
        <li key={item.label} className="flex flex-col items-center gap-2 text-center">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-lobby">
            {item.icon}
          </span>
          <span className="text-xs leading-snug font-medium text-ink">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

type SocialKeys = { googleClientId: string | null; telegramBotId: string | null };
type GoogleId = {
  initialize(options: { client_id: string; callback: (response: { credential?: string }) => void }): void;
  renderButton(parent: HTMLElement, options: Record<string, string>): void;
};
type TelegramLogin = {
  auth(options: { bot_id: string; request_access?: string }, callback: (user: Record<string, unknown> | false) => void): void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
    Telegram?: { Login: TelegramLogin };
  }
}

const scripts = new Map<string, Promise<void>>();
function loadScript(src: string): Promise<void> {
  let promise = scripts.get(src);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src;
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => {
        scripts.delete(src);
        reject(new Error(`Failed to load ${src}`));
      };
      document.head.appendChild(el);
    });
    scripts.set(src, promise);
  }
  return promise;
}

const buttonClass =
  "grid size-11 place-items-center rounded-full border border-field bg-lobby text-ink hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60";

// Keys come from GET /config via /api/auth/social; a provider without a key is hidden.
export function SocialLogin({ onSuccess }: { onSuccess?: () => void }) {
  const { t, href } = useI18n();
  const router = useRouter();
  const [keys, setKeys] = useState<SocialKeys | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const googleRef = useRef<HTMLDivElement>(null);
  // Set when the backend has no member for this Google/Telegram account yet: the player picks a
  // username and the same provider data is sent again with member_username.
  const [needUsername, setNeedUsername] = useState<{ provider: "google" | "telegram"; data: Record<string, unknown> } | null>(null);

  async function signIn(provider: "google" | "telegram", data: Record<string, unknown>) {
    setError(null);
    setPending(true);
    try {
      if (!(await loginWithSocial(provider, data))) {
        setNeedUsername({ provider, data });
        return;
      }
      if (onSuccess) onSuccess();
      else router.push(href("/"));
    } catch (cause) {
      if (cause instanceof ApiError && cause.code) setError(t.errors[cause.code]);
      else if (cause instanceof ApiError) setError(cause.message);
      else setError(t.errors.unreachable);
    } finally {
      setPending(false);
    }
  }
  const onGoogleCredential = useEffectEvent((credential: string) => void signIn("google", { id_token: credential }));

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/social", { cache: "no-store" })
      .then((response) => response.json() as Promise<SocialKeys>)
      .catch(() => ({ googleClientId: null, telegramBotId: null }))
      .then((value) => alive && setKeys(value));
    return () => {
      alive = false;
    };
  }, []);

  // Google only issues an ID token through its own rendered button (GIS), so it replaces ours.
  const googleClientId = keys?.googleClientId;
  useEffect(() => {
    if (!googleClientId) return;
    let alive = true;
    loadScript("https://accounts.google.com/gsi/client")
      .then(() => {
        const parent = googleRef.current;
        if (!alive || !parent || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: ({ credential }) => {
            if (credential) onGoogleCredential(credential);
          },
        });
        parent.replaceChildren();
        window.google.accounts.id.renderButton(parent, {
          type: "icon",
          shape: "circle",
          theme: "filled_black",
          size: "large",
        });
      })
      .catch(() => alive && setError(t.errors.unreachable));
    return () => {
      alive = false;
    };
  }, [googleClientId, t.errors.unreachable]);

  async function onTelegram() {
    if (!keys || pending) return;
    if (!keys.telegramBotId) {
      setError(t.auth.socialUnavailable);
      return;
    }
    try {
      await loadScript("https://telegram.org/js/telegram-widget.js?22");
    } catch {
      setError(t.errors.unreachable);
      return;
    }
    window.Telegram?.Login.auth({ bot_id: keys.telegramBotId, request_access: "write" }, (user) => {
      if (user) void signIn("telegram", user);
    });
  }

  // Telegram stays visible even without a bot token, so it can be tested once the backend is set up.
  if (!keys) return null;

  return (
    <div aria-busy={pending}>
      <div className="flex items-center gap-4 text-[0.8125rem] text-muted">
        <span className="h-px flex-1 bg-white/20" aria-hidden="true" />
        <span>{t.auth.orLoginWith}</span>
        <span className="h-px flex-1 bg-white/20" aria-hidden="true" />
      </div>
      <div className="mt-4 flex items-center justify-center gap-4">
        {keys.googleClientId ? (
          <div ref={googleRef} title={t.auth.loginWithGoogle} className="grid min-h-11 place-items-center">
            <span className={buttonClass} aria-hidden="true">
              <GoogleIcon className="size-5" />
            </span>
          </div>
        ) : null}
        <button
          type="button"
          onClick={onTelegram}
          disabled={pending}
          aria-label={t.auth.loginWithTelegram}
          title={t.auth.loginWithTelegram}
          className={buttonClass}
        >
          <TelegramIcon className="size-6" />
        </button>
      </div>
      {error && !needUsername ? (
        <p role="alert" className="mt-3 text-center text-[0.8125rem] text-danger">
          {error}
        </p>
      ) : null}
      <UsernameDialog
        open={needUsername !== null}
        pending={pending}
        error={error}
        onSubmit={(username) => {
          if (needUsername) void signIn(needUsername.provider, { ...needUsername.data, member_username: username });
        }}
        onClose={() => {
          setNeedUsername(null);
          setError(null);
        }}
      />
    </div>
  );
}
