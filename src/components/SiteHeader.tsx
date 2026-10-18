"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { siteConfig } from "@/config/site";
import { AUTH_TOKEN_EVENT, clearAuthToken, getAuthToken } from "@/lib/token";

export function SiteHeader() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const sync = () => setSignedIn(Boolean(getAuthToken()));
    sync();
    window.addEventListener(AUTH_TOKEN_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUTH_TOKEN_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-serif text-xl tracking-tight text-ink">
          {siteConfig.name}
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-5 text-sm">
          <Link href="/" className="text-ink hover:text-forest">
            Home
          </Link>
          {signedIn ? (
            <button
              type="button"
              onClick={() => clearAuthToken()}
              className="text-ink hover:text-forest"
            >
              Sign out
            </button>
          ) : (
            <Link href="/login" className="text-ink hover:text-forest">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
