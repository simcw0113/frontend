"use client";

import { useEffect, useRef, useState } from "react";
import type { SessionUser } from "@/lib/session";
import { AUTH_TOKEN_EVENT, clearAuthToken } from "@/lib/token";

type MeResult = { user: SessionUser | null };

// Shared across every useSession() hook (and React Strict Mode's double mount in
// dev) so /api/auth/me is in flight at most once. Sign-out / token events start
// a new request; they still share that one.
let inflight: Promise<MeResult> | null = null;

function readUser(payload: unknown, ok: boolean): SessionUser | null {
  const next = payload && typeof payload === "object" ? (payload as { user?: SessionUser | null }).user : null;
  if (ok && next && typeof next.username === "string" && next.username.trim()) return next;
  return null;
}

function loadSession(): Promise<MeResult> {
  if (!inflight) {
    inflight = (async () => {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      return { user: readUser(payload, response.ok) };
    })().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

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
        const { user: next } = await loadSession();
        if (cancelled || requestId !== requestIdRef.current) return;
        setReady(true);
        setUser(next);
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
    inflight = null;
    await clearAuthToken();
  }

  return { user, ready, signOut };
}
