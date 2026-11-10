"use client";

import { useEffect, useRef, useState } from "react";
import type { SessionUser } from "@/lib/session";
import { AUTH_TOKEN_EVENT, clearAuthToken } from "@/lib/token";

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  // False until the first /api/auth/me result. Callers that must not flash
  // signed-out UI (the How to Register bar) wait on this.
  const [ready, setReady] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const requestId = ++requestIdRef.current;
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as { user?: SessionUser | null } | null;
        const next = payload && typeof payload === "object" ? payload.user : null;
        if (cancelled || requestId !== requestIdRef.current) return;
        setReady(true);
        if (response.ok && next && typeof next.username === "string" && next.username.trim()) {
          setUser(next);
        } else {
          setUser(null);
        }
      } catch {
        if (!cancelled && requestId === requestIdRef.current) {
          setUser(null);
          setReady(true);
        }
      }
    }

    void refresh();
    window.addEventListener(AUTH_TOKEN_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_TOKEN_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  async function signOut() {
    requestIdRef.current += 1;
    setUser(null);
    await clearAuthToken();
  }

  return { user, ready, signOut };
}
