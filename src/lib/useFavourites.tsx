"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/components/I18nProvider";
import { showToast } from "@/components/lobby/ToastHost";
import { AUTH_TOKEN_EVENT } from "@/lib/token";
import { useSession } from "@/lib/useSession";

type FavItem = { public_code: string; game_code: string };

type FavouritesContextValue = {
  ready: boolean;
  signedIn: boolean;
  isFavourite: (publicCode?: string, gameCode?: string) => boolean;
  toggle: (publicCode: string, gameCode: string) => Promise<boolean>;
  requestSignIn: () => void;
};

const FavouritesContext = createContext<FavouritesContextValue | null>(null);

const idle: FavouritesContextValue = {
  ready: false,
  signedIn: false,
  isFavourite: () => false,
  toggle: async () => false,
  requestSignIn: () => {},
};

export function favouriteKey(publicCode: string, gameCode: string) {
  return `${publicCode}\0${gameCode}`;
}

// Shared across every hook instance (and React Strict Mode's double mount in
// dev) so GET /api/favourites is in flight at most once, like useSession.
let inflight: Promise<FavItem[]> | null = null;

function loadSimpleList(): Promise<FavItem[]> {
  if (!inflight) {
    inflight = (async () => {
      const response = await fetch("/api/favourites", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { items?: unknown } | null;
      if (!response.ok) return [];
      const items = Array.isArray(payload?.items) ? payload.items : [];
      const list: FavItem[] = [];
      for (const entry of items) {
        if (!entry || typeof entry !== "object") continue;
        const rec = entry as Record<string, unknown>;
        const public_code = typeof rec.public_code === "string" ? rec.public_code.trim() : "";
        const game_code = typeof rec.game_code === "string" ? rec.game_code.trim() : "";
        if (public_code && game_code) list.push({ public_code, game_code });
      }
      return list;
    })().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

export function FavouritesProvider({ children, onSignIn }: { children: ReactNode; onSignIn: () => void }) {
  const { user, ready: sessionReady } = useSession();
  const signedIn = Boolean(user);
  const { t, lang } = useI18n();
  const [keys, setKeys] = useState<Set<string>>(() => new Set());
  const [listReady, setListReady] = useState(false);
  const keysRef = useRef(keys);
  const pendingRef = useRef(new Set<string>());
  const requestIdRef = useRef(0);
  const errorMessage = t.gamePage.favouriteError;
  const addedMessage = t.gamePage.favouriteAdded;
  const removedMessage = t.gamePage.favouriteRemoved;

  useEffect(() => {
    keysRef.current = keys;
  }, [keys]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const requestId = ++requestIdRef.current;
      if (!signedIn) {
        inflight = null;
        if (!cancelled && requestId === requestIdRef.current) {
          setKeys(new Set());
          setListReady(true);
        }
        return;
      }
      try {
        const items = await loadSimpleList();
        if (cancelled || requestId !== requestIdRef.current) return;
        const next = new Set<string>();
        for (const item of items) next.add(favouriteKey(item.public_code, item.game_code));
        setKeys(next);
        setListReady(true);
      } catch {
        if (!cancelled && requestId === requestIdRef.current) {
          setKeys(new Set());
          setListReady(true);
        }
      }
    }

    if (!sessionReady) return;
    void refresh();
    window.addEventListener(AUTH_TOKEN_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_TOKEN_EVENT, refresh);
    };
  }, [signedIn, sessionReady]);

  const isFavourite = useCallback((publicCode?: string, gameCode?: string) => {
    if (!publicCode || !gameCode) return false;
    return keys.has(favouriteKey(publicCode, gameCode));
  }, [keys]);

  const toggle = useCallback(
    async (publicCode: string, gameCode: string) => {
      if (!signedIn) {
        onSignIn();
        return false;
      }
      const key = favouriteKey(publicCode, gameCode);
      if (pendingRef.current.has(key)) return false;
      const adding = !keysRef.current.has(key);
      pendingRef.current.add(key);
      setKeys((prev) => {
        const next = new Set(prev);
        if (adding) next.add(key);
        else next.delete(key);
        return next;
      });
      try {
        const response = await fetch("/api/favourites", {
          method: adding ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ publicCode, gameCode, locale: lang }),
        });
        const payload = (await response.json().catch(() => null)) as { ok?: unknown; message?: unknown } | null;
        const backendMessage = typeof payload?.message === "string" ? payload.message.trim() : "";
        if (!response.ok || payload?.ok === false) {
          setKeys((prev) => {
            const next = new Set(prev);
            if (adding) next.delete(key);
            else next.add(key);
            return next;
          });
          showToast(backendMessage || errorMessage, "error");
          return false;
        }
        // Optimistic heart stays; toast after the request succeeds.
        showToast(backendMessage || (adding ? addedMessage : removedMessage), "success");
        return true;
      } catch {
        setKeys((prev) => {
          const next = new Set(prev);
          if (adding) next.delete(key);
          else next.add(key);
          return next;
        });
        showToast(errorMessage, "error");
        return false;
      } finally {
        pendingRef.current.delete(key);
      }
    },
    [signedIn, onSignIn, lang, errorMessage, addedMessage, removedMessage],
  );

  const value = useMemo<FavouritesContextValue>(
    () => ({
      ready: sessionReady && listReady,
      signedIn,
      isFavourite,
      toggle,
      requestSignIn: onSignIn,
    }),
    [sessionReady, listReady, signedIn, isFavourite, toggle, onSignIn],
  );

  return <FavouritesContext value={value}>{children}</FavouritesContext>;
}

export function useFavourites(): FavouritesContextValue {
  return useContext(FavouritesContext) ?? idle;
}
