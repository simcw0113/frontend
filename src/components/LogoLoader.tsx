"use client";

import { useId } from "react";
import { useI18n } from "@/components/I18nProvider";

export function LogoLoader() {
  const { t } = useI18n();
  const gradientId = `loader-tide-${useId().replace(/:/g, "")}`;

  return (
    <div className="loader-stage" role="status">
      <span className="sr-only">{t.loading}</span>
      <span className="loader-glow" aria-hidden="true" />
      <span className="loader-ripple" aria-hidden="true" />
      <span className="loader-ripple loader-ripple-late" aria-hidden="true" />
      <span className="loader-orbit" aria-hidden="true">
        <span className="loader-orbit-track" />
        <span className="loader-orbit-arc" />
        <span className="loader-orbit-head" />
      </span>
      <svg viewBox="0 0 32 32" className="loader-mark size-[50px]" aria-hidden="true">
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
        <circle
          className="loader-ring"
          cx="16"
          cy="16"
          r="6"
          fill="none"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinecap="round"
          pathLength="1"
        />
      </svg>
    </div>
  );
}
