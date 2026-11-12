import type { Metadata } from "next";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { dictionaryFor } from "@/i18n";
import { languageAlternates, localizedPath } from "@/i18n/routing";
import { getSiteLanguages } from "@/lib/siteLanguages";

const PATH = "/sports";

export async function generateMetadata({ params }: PageProps<"/[lang]/sports">): Promise<Metadata> {
  const { lang } = await params;
  const t = dictionaryFor(lang);
  return {
    title: t.topNav.sports,
    description: t.comingSoon.sportsMeta,
    alternates: {
      canonical: localizedPath(lang, PATH),
      languages: languageAlternates(PATH, await getSiteLanguages()),
    },
  };
}

// Placeholder inside the lobby shell (header, sidebar, footer): title + "Coming soon".
export default function SportsPage() {
  return <LobbyScreen focus="sports" games={{}} />;
}
