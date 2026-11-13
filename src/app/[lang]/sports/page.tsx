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
    description: t.sportsPage.meta,
    alternates: {
      canonical: localizedPath(lang, PATH),
      languages: languageAlternates(PATH, await getSiteLanguages()),
    },
  };
}

// Full-page IBC sportsbook iframe inside the lobby shell (header, sidebar, phone tab bar).
export default function SportsPage() {
  return <LobbyScreen focus="sports" games={{}} />;
}
