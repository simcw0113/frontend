"use client";

import { useI18n } from "@/components/I18nProvider";
import { LobbyLink } from "@/components/lobby/LobbyLink";
import type { WalletBalance } from "@/lib/walletBalance";

// Header wallet: amount on the left (grows when the pill is widened) and a brand
// icon-only deposit button flush to the right. Used by the lobby header only.
// Goes to /{lang}/deposit; to open the popup instead, swap the LobbyLink for
// <button type="button" onClick={useOpenDeposit()} className="dep-header-btn">.
export function WalletPill({ wallet, className = "" }: { wallet: WalletBalance | null; className?: string }) {
  const { t } = useI18n();
  return (
    // display:flex overrides .dep-wallet { inline-flex } so min-width on the pill
    // actually gives leftover space to the amount, not an empty gap after the button.
    // overflow-hidden keeps both ends on the same 0.625rem radius.
    <div className={`dep-wallet overflow-hidden ${className}`.trim()} style={{ display: "flex" }}>
      {wallet ? (
        <span className="dep-wallet-balance min-w-0 flex-1" title={t.providerLaunch.balance}>
          <span className="dep-wallet-amount">
            {wallet.currency} {wallet.balance}
          </span>
          {/* Shown instead of the amount while a game runs (globals.css), like KickWin. */}
          <span className="dep-wallet-playing">{t.gamePage.playing}</span>
        </span>
      ) : null}
      <LobbyLink
        href="/deposit"
        ariaLabel={t.deposit.deposit}
        className={`dep-header-btn no-underline ml-auto shrink-0 bg-brand text-lobby${wallet ? " rounded-l-none" : ""}`}
      >
        <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 7.5 C4 6.1 5.1 5 6.5 5 H17 V8" />
          <path d="M4 7.5 V17.5 C4 18.9 5.1 20 6.5 20 H19.5 V8 H6.5 C5.1 8 4 6.9 4 7.5" />
          <path d="M15.5 14 H16.5" strokeWidth="2.4" />
        </svg>
      </LobbyLink>
    </div>
  );
}
