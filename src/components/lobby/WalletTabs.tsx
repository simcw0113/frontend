"use client";

import { useI18n } from "@/components/I18nProvider";
import { LobbyLink } from "@/components/lobby/LobbyLink";

// Deposit | Withdraw tabs shared by the wallet sheet and the /deposit and
// /withdraw pages. Each tab is a lobby link so the full page loads; the sheet
// passes onNavigate to close itself when the user leaves for the other page.
export function WalletTabs({
  active,
  onNavigate,
}: {
  active: "deposit" | "withdraw";
  onNavigate?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div role="tablist" aria-label={t.deposit.title} className="dep-tabs">
      <LobbyLink
        href="/deposit"
        role="tab"
        aria-selected={active === "deposit"}
        aria-current={active === "deposit" ? "page" : undefined}
        onGo={active === "deposit" ? undefined : onNavigate}
        className="dep-tab no-underline"
      >
        {t.deposit.deposit}
      </LobbyLink>
      <LobbyLink
        href="/withdraw"
        role="tab"
        aria-selected={active === "withdraw"}
        aria-current={active === "withdraw" ? "page" : undefined}
        onGo={active === "withdraw" ? undefined : onNavigate}
        className="dep-tab no-underline"
      >
        {t.deposit.withdraw}
      </LobbyLink>
    </div>
  );
}
