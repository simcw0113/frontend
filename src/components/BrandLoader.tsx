"use client";

import { useI18n } from "@/components/I18nProvider";
import { siteConfig } from "@/config/site";

// Page-level loading state: the site logo (siteConfig.logo, so it follows logo swaps) breathing
// over a soft cyan glow, with a thin shimmer bar under it. Used by the first-load splash
// (BootLoader) and the route fallback (app/[lang]/loading.tsx). Section skeletons stay as they are.
// `delayed` (default) fades it in after ~180ms, so quick loads never flash it.
// Reduced motion: static logo and a visible "Loading…" line instead of the bar.
export function BrandLoader({ delayed = true }: { delayed?: boolean }) {
  const { t } = useI18n();
  const { src, width, height } = siteConfig.logo;
  return (
    <div className={`brand-loader${delayed ? " brand-loader--delayed" : ""}`} role="status">
      <span className="brand-loader-mark" aria-hidden="true">
        <span className="brand-loader-glow" />
        {/* Plain img (the logo file may be any host/format); decorative, the status text names it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={width} height={height} alt="" draggable={false} className="brand-loader-logo" />
      </span>
      <span className="brand-loader-bar" aria-hidden="true">
        <span />
      </span>
      <span className="brand-loader-label">{t.loading}…</span>
    </div>
  );
}
