"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/components/I18nProvider";
import { CashbackIcon, GiftIcon, GoogleIcon, InfinityIcon, TelegramIcon } from "@/components/auth/icons";

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

export function SocialLogin() {
  const { t } = useI18n();
  // TODO(API): social sign-in is not available yet; the buttons are placeholders.
  const providers = [
    { id: "google", label: t.auth.loginWithGoogle, icon: <GoogleIcon className="size-5" /> },
    { id: "telegram", label: t.auth.loginWithTelegram, icon: <TelegramIcon className="size-6" /> },
  ];

  return (
    <div>
      <div className="flex items-center gap-4 text-[0.8125rem] text-muted">
        <span className="h-px flex-1 bg-white/20" aria-hidden="true" />
        <span>{t.auth.orLoginWith}</span>
        <span className="h-px flex-1 bg-white/20" aria-hidden="true" />
      </div>
      <div className="mt-4 flex justify-center gap-4">
        {providers.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => {}}
            aria-label={provider.label}
            title={provider.label}
            className="grid size-11 place-items-center rounded-full border border-field bg-lobby text-ink hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {provider.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
