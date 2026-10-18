"use client";

import { useId } from "react";
import { useI18n } from "@/components/I18nProvider";

// Brand mark + wordmark. Same mark as LogoLoader (gradient tile with ring).
export function BrandLogo({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const gradientId = `auth-logo-${useId().replace(/:/g, "")}`;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="32" x2="32" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0F282F" />
            <stop offset="1" stopColor="#02EFF0" />
          </linearGradient>
        </defs>
        <rect
          x="0.75"
          y="0.75"
          width="30.5"
          height="30.5"
          rx="7.5"
          fill={`url(#${gradientId})`}
          stroke="#ffffff"
          strokeWidth="1.5"
        />
        <circle cx="16" cy="16" r="6" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <span className="text-xl font-extrabold tracking-wide text-ink uppercase">{t.brand}</span>
    </div>
  );
}
