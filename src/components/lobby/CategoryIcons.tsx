import type { ReactNode, SVGProps } from "react";

// Section and nav icons for Hot Games, New Release and All Games. Shapes follow
// Kickwin's lobby SVGs (/img/icons/hot.svg, newgames.svg, all.svg): filled 22×22
// glyphs. Colour is currentColor so the parent can set muted, brand, or inherit.

type IconProps = SVGProps<SVGSVGElement>;

const DEFAULT = "size-5 shrink-0";

function Glyph({ className, path, children, ...rest }: IconProps & { path?: string }) {
  return (
    <svg viewBox="0 0 22 22" className={className ?? DEFAULT} fill="currentColor" aria-hidden="true" {...rest}>
      {path ? <path d={path} /> : children}
    </svg>
  );
}

// Kickwin /img/icons/hot.svg — flame.
export function HotGamesIcon({ className = DEFAULT, ...rest }: IconProps = {}) {
  return (
    <Glyph
      className={className}
      path="M16.33,7.53c-.13-.12-.31-.18-.49-.15-.18.03-.33.14-.41.3-.28.55-.64,1.05-1.06,1.5.04-.32.06-.65.06-.97,0-.62-.08-1.26-.25-1.9-.54-2.11-1.96-3.89-3.89-4.89-.17-.09-.37-.08-.53,0-.17.09-.27.26-.29.45-.15,1.91-1.14,3.66-2.71,4.78-.02.01-.04.03-.06.05-.04.03-.08.06-.12.09,0,0-.01,0-.02.01-.99.71-1.8,1.65-2.36,2.73-.56,1.09-.85,2.27-.85,3.49,0,.62.08,1.26.25,1.9.87,3.38,3.91,5.74,7.4,5.74,4.22,0,7.65-3.43,7.65-7.65,0-2.08-.82-4.02-2.32-5.48h0Z"
      {...rest}
    />
  );
}

// Kickwin /img/icons/newgames.svg — five-point star.
export function NewReleaseIcon({ className = DEFAULT, ...rest }: IconProps = {}) {
  return (
    <Glyph
      className={className}
      path="M19.88,8.71c-.25-.83-.92-1.33-1.75-1.5l-3.57-.5-1.58-3.24c-.34-.75-1.09-1.17-1.92-1.17s-1.58.5-1.99,1.17l-1.58,3.24-3.66.5c-.83.17-1.5.67-1.75,1.5-.25.75,0,1.66.58,2.24l2.58,2.58-.58,3.58c-.17.83.17,1.66.83,2.16.67.5,1.58.5,2.33.17l3.16-1.67,3.16,1.67c.33.16.67.25,1,.25.41,0,.91-.17,1.25-.42.66-.5.99-1.33.83-2.16l-.58-3.58,2.57-2.58c.75-.58,1-1.41.67-2.24Z"
      {...rest}
    />
  );
}

// Kickwin /img/icons/all.svg — four rounded squares.
export function AllGamesIcon({ className = DEFAULT, ...rest }: IconProps = {}) {
  return (
    <Glyph className={className} {...rest}>
      <path d="M10.18,14.29v2.47c0,1.36-1.11,2.47-2.47,2.47h-2.47c-1.36,0-2.47-1.11-2.47-2.47v-2.47c0-1.36,1.11-2.47,2.47-2.47h2.47c1.36,0,2.47,1.11,2.47,2.47Z" />
      <path d="M10.18,5.25v2.47c0,1.36-1.11,2.47-2.47,2.47h-2.47c-1.36,0-2.47-1.11-2.47-2.47v-2.47c0-1.36,1.11-2.47,2.47-2.47h2.47c1.36,0,2.47,1.11,2.47,2.47Z" />
      <path d="M19.22,14.29v2.47c0,1.36-1.11,2.47-2.47,2.47h-2.47c-1.36,0-2.47-1.11-2.47-2.47v-2.47c0-1.36,1.11-2.47,2.47-2.47h2.47c1.36,0,2.47,1.11,2.47,2.47Z" />
      <path d="M19.22,5.25v2.47c0,1.36-1.11,2.47-2.47,2.47h-2.47c-1.36,0-2.47-1.11-2.47-2.47v-2.47c0-1.36,1.11-2.47,2.47-2.47h2.47c1.36,0,2.47,1.11,2.47,2.47Z" />
    </Glyph>
  );
}

const ICONS: Record<string, (props: IconProps) => ReactNode> = {
  "hot-games": HotGamesIcon,
  "new-release": NewReleaseIcon,
  "all-games": AllGamesIcon,
};

export function categoryIcon(slug: string): ((props: IconProps) => ReactNode) | undefined {
  return ICONS[slug];
}

export function CategoryIcon({ slug, className = DEFAULT }: { slug: string; className?: string }) {
  const Icon = ICONS[slug];
  if (!Icon) return null;
  return <Icon className={className} />;
}
