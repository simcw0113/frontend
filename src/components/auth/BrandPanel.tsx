"use client";

import { useI18n } from "@/components/I18nProvider";
import { BrandLogo } from "@/components/auth/BrandLogo";
import { HeroArtwork } from "@/components/auth/HeroArtwork";
import { Clock247Icon, RocketIcon, ShieldCheckIcon } from "@/components/auth/icons";

// Left half of the auth card. Hidden below md; the form panel shows a compact
// brand header instead.
export function BrandPanel() {
  const { t } = useI18n();
  const features = [
    { label: t.auth.features.fast, icon: <RocketIcon className="size-7" /> },
    { label: t.auth.features.secure, icon: <ShieldCheckIcon className="size-7" /> },
    { label: t.auth.features.support, icon: <Clock247Icon className="size-8" /> },
  ];

  return (
    <div className="auth-brand-panel @container hidden flex-col justify-between gap-6 p-8 md:flex">
      <BrandLogo />

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6">
        <div data-auth-hero className="relative w-full max-w-[14.5rem]">
          <HeroArtwork className="h-auto w-full drop-shadow-[0_18px_40px_rgb(2_239_240/0.22)]" />
        </div>

        <p className="w-full text-center font-black uppercase leading-[0.98] tracking-tight text-[clamp(1.75rem,12.5cqw,3.4rem)]">
          <span className="block text-brand">{t.auth.headlineAccent}</span>
          <span className="block text-ink">{t.auth.headlineWhite}</span>
        </p>
      </div>

      <ul className="flex items-center justify-center gap-6 text-ink">
        {features.map((item) => (
          <li key={item.label} className="grid place-items-center">
            {item.icon}
            <span className="sr-only">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
