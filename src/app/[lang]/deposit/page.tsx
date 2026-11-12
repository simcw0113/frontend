import type { Metadata } from "next";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { dictionaryFor } from "@/i18n";
import { languageAlternates, localizedPath } from "@/i18n/routing";
import { getSiteLanguages } from "@/lib/siteLanguages";

const PATH = "/deposit";

export async function generateMetadata({ params }: PageProps<"/[lang]/deposit">): Promise<Metadata> {
  const { lang } = await params;
  const t = dictionaryFor(lang);
  return {
    title: t.deposit.deposit,
    description: t.deposit.meta,
    alternates: {
      canonical: localizedPath(lang, PATH),
      languages: languageAlternates(PATH, await getSiteLanguages()),
    },
  };
}

// Deposit page inside the lobby shell (header, sidebar, footer). The wallet popup is
// kept: header and game-bar buttons still open DepositSheet. This route is a full page
// with the same form (components/lobby/DepositForm.tsx).
export default function DepositRoute() {
  return <LobbyScreen focus="deposit" games={{}} />;
}
