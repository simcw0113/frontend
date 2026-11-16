"use client";

export type WalletBalance = { balance: string; currency: string };

// GET /api/wallet/balance, shared by every caller (header pill, game amount panel) and React
// Strict Mode's double mount: one request in flight at a time, and an answer younger than
// FRESH_MS is reused (home -> game, or a page with two readers, asks the backend once; it is
// slow, /get_balance also asks the bound game provider).
const FRESH_MS = 5000;
let inflight: Promise<WalletBalance | null> | null = null;
let last: { at: number; value: WalletBalance } | null = null;

export function loadBalance(): Promise<WalletBalance | null> {
  if (last && Date.now() - last.at < FRESH_MS) return Promise.resolve(last.value);
  if (!inflight) {
    inflight = fetch("/api/wallet/balance", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((next: { balance?: unknown; currency?: unknown } | null) => {
        if (typeof next?.balance !== "string") return null;
        const value = { balance: next.balance, currency: typeof next.currency === "string" ? next.currency : "" };
        last = { at: Date.now(), value };
        return value;
      })
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
