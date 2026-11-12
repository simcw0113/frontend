import type { Metadata } from "next";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { dictionaryFor } from "@/i18n";
import { languageAlternates, localizedPath } from "@/i18n/routing";
import { getSiteLanguages } from "@/lib/siteLanguages";

const PATH = "/withdraw";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = dictionaryFor(lang);
  return {
    title: t.deposit.withdraw,
    description: t.withdraw.meta,
    alternates: {
      canonical: localizedPath(lang, PATH),
      languages: languageAlternates(PATH, await getSiteLanguages()),
    },
  };
}

// Withdrawal page inside the lobby shell (header, sidebar, footer). The wallet
// popup's Withdraw tab navigates here. Form: components/lobby/WithdrawForm.tsx.
export default function WithdrawRoute() {
  return <LobbyScreen focus="withdraw" games={{}} />;
}
