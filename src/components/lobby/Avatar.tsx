"use client";

import { useState } from "react";

// Round member avatar from POST /info `profile_image`. When the URL is missing
// or the image fails, the fallback matches the profile page: initials from the
// name (full name, or username).

export function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  src,
  name,
  initials,
  className,
  labelled = false,
}: {
  src?: string | null;
  name: string;
  initials?: string;
  className?: string;
  labelled?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const image = src && !failed ? src : null;
  const letters = (initials ?? initialsFrom(name)).trim() || "?";

  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 font-semibold text-white ${className ?? "size-16 text-lg sm:size-20"}`}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- member avatars may come from any API host
        <img src={image} alt="" width={80} height={80} onError={() => setFailed(true)} className="size-full object-cover" />
      ) : (
        <span aria-hidden="true">{letters}</span>
      )}
      {labelled ? <span className="sr-only">{name}</span> : null}
    </span>
  );
}
