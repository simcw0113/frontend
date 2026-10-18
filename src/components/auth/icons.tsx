import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

// Stroke icons share one wrapper. They inherit colour from `currentColor`
// and are decorative unless a parent supplies a text alternative.
function Stroke({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Stroke>
  );
}

export function ChevronIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="m6 9 6 6 6-6" />
    </Stroke>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </Stroke>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2" />
      <path d="M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.4 4.5-1.1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </Stroke>
  );
}

export function RocketIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M5 15c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-4A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22 22 0 0 1-4 2z" />
      <path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0" />
      <path d="M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5" />
    </Stroke>
  );
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3z" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </Stroke>
  );
}

export function Clock247Icon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" {...props}>
      <path
        d="M20.5 9A9 9 0 1 0 21 12.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M21.5 4.5V9h-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <text
        x="12"
        y="14.6"
        textAnchor="middle"
        fontSize="7.4"
        fontWeight="800"
        fill="currentColor"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        24/7
      </text>
    </svg>
  );
}

export function GiftIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M20 12v10H4V12" />
      <path d="M2 7h20v5H2z" />
      <path d="M12 22V7" />
      <path d="M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </Stroke>
  );
}

export function InfinityIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M12 12c-2-2.7-4-4-6-4a4 4 0 0 0 0 8c2 0 4-1.3 6-4zm0 0c2 2.7 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.3-6 4z" />
    </Stroke>
  );
}

export function CashbackIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M21 12a9 9 0 0 1-15.5 6.2" />
      <path d="M3 12A9 9 0 0 1 18.5 5.8" />
      <path d="M18.5 2v4h-4" />
      <path d="M5.5 22v-4h4" />
      <path d="M12 8v8" />
      <path d="M14.5 9.8c-.4-.6-1.3-1-2.5-1-1.5 0-2.5.7-2.5 1.8 0 2.4 5 1.2 5 3.6 0 1.1-1 1.8-2.5 1.8-1.2 0-2.1-.4-2.5-1" />
    </Stroke>
  );
}

// Third-party marks keep their own brand colours.
export function GoogleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" {...props}>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export function TelegramIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <circle cx="12" cy="12" r="12" fill="#26A5E4" />
      <path
        fill="#ffffff"
        d="M5.4 11.9c3.5-1.5 5.8-2.5 7-3 3.3-1.4 4-1.6 4.4-1.6.1 0 .3 0 .5.2.1.1.2.3.2.5v.7c-.2 1.9-1 6.4-1.4 8.5-.2.9-.5 1.2-.9 1.2-.7.1-1.2-.5-1.9-.9-1-.7-1.6-1.1-2.6-1.8-1.1-.7-.4-1.1.2-1.8.2-.2 2.9-2.7 3-2.9 0 0 0-.2-.1-.3s-.2 0-.4 0c-.2 0-1.5 1-4.1 2.7-.4.3-.7.4-1 .4-.3 0-1-.2-1.5-.4-.6-.2-1.1-.3-1-.7 0-.2.3-.4.8-.6z"
      />
    </svg>
  );
}
