import { useId } from "react";

/**
 * HERO_ARTWORK_SLOT
 * Placeholder trophy drawn with plain SVG (no third-party art). To use real
 * artwork later, replace the body of this component (e.g. with next/image) and
 * keep the wrapper: BrandPanel only relies on this component and its size.
 */
export function HeroArtwork({ className = "" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const cup = `hero-cup-${uid}`;
  const base = `hero-base-${uid}`;
  const shine = `hero-shine-${uid}`;

  return (
    <svg
      viewBox="0 0 260 280"
      className={className}
      aria-hidden="true"
      focusable="false"
      data-slot="hero-artwork"
    >
      <defs>
        <linearGradient id={cup} x1="40" y1="250" x2="220" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0F282F" />
          <stop offset="0.55" stopColor="#0f7f86" />
          <stop offset="1" stopColor="#02EFF0" />
        </linearGradient>
        <linearGradient id={base} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#1d4852" />
          <stop offset="1" stopColor="#081a1f" />
        </linearGradient>
        <linearGradient id={shine} x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* floor glow */}
      <ellipse cx="130" cy="252" rx="104" ry="14" fill="#02EFF0" opacity="0.16" />
      {/* plinth */}
      <path d="M52 236h156l14 14H38z" fill={`url(#${base})`} stroke="#02EFF0" strokeOpacity="0.35" />
      <rect x="86" y="222" width="88" height="16" rx="3" fill={`url(#${base})`} stroke="#02EFF0" strokeOpacity="0.45" />
      {/* stem */}
      <path d="M112 182h36l8 40h-52z" fill={`url(#${cup})`} />
      <rect x="104" y="172" width="52" height="14" rx="5" fill="#ffffff" opacity="0.9" />
      {/* handles */}
      <path
        d="M62 58H34c0 38 14 60 44 68M198 58h28c0 38-14 60-44 68"
        fill="none"
        stroke="#02EFF0"
        strokeWidth="9"
        strokeLinecap="round"
      />
      {/* cup */}
      <path
        d="M58 30h144v62c0 46-30 80-72 84-42-4-72-38-72-84z"
        fill={`url(#${cup})`}
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M78 42h30v78c-18-12-30-34-30-60z" fill={`url(#${shine})`} opacity="0.7" />
      {/* emblem: same tile + ring language as the brand mark */}
      <rect x="96" y="62" width="68" height="68" rx="16" fill="#0F282F" stroke="#ffffff" strokeWidth="3" />
      <circle cx="130" cy="96" r="15" fill="none" stroke="#02EFF0" strokeWidth="7" strokeLinecap="round" />
      {/* sparkles */}
      <circle cx="224" cy="30" r="5" fill="#02EFF0" />
      <circle cx="38" cy="118" r="3.5" fill="#ffffff" opacity="0.8" />
      <circle cx="232" cy="150" r="3" fill="#ffffff" opacity="0.6" />
    </svg>
  );
}
